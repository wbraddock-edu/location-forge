import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { db } from "./db";
import { sqlite } from "./db";
import { eq } from "drizzle-orm";
import {
  users,
  authSessions,
  passwordResets,
  sessions,
  scanRequestSchema,
  analyzeRequestSchema,
  generateImageRequestSchema,
  type LocationProfile,
  type DetectedLocation,
} from "@shared/schema";
import { registerStripeRoutes, canAccessFeatures, isAdmin, isTrialActive, hasActiveSubscription } from "./stripe";

declare module "express" {
  interface Request {
    userId?: number;
  }
}
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  ImageRun,
  BorderStyle,
  AlignmentType,
} from "docx";

// ── AI Provider Abstraction ──

async function callTextAI(
  provider: string,
  apiKey: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  if (provider === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8192,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Anthropic API error: ${res.status} - ${err}`);
    }
    const data = await res.json();
    return data.content[0].text;
  } else if (provider === "openai") {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 8192,
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI API error: ${res.status} - ${err}`);
    }
    const data = await res.json();
    return data.choices[0].message.content;
  } else if (provider === "google") {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
            },
          ],
          generationConfig: {
            maxOutputTokens: 16384,
            responseMimeType: "application/json",
          },
        }),
      }
    );
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Google AI API error: ${res.status} - ${err}`);
    }
    const data = await res.json();
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
      console.error("Google AI returned empty response:", JSON.stringify(data).substring(0, 500));
      throw new Error("Google AI returned an empty or blocked response. Try again or use shorter text.");
    }
    return data.candidates[0].content.parts[0].text;
  }
  throw new Error(`Unknown provider: ${provider}`);
}

async function callImageAI(
  provider: string,
  apiKey: string,
  prompt: string,
  referenceImages?: string[]
): Promise<string> {
  if (provider === "openai") {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
        response_format: "b64_json",
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI Image API error: ${res.status} - ${err}`);
    }
    const data = await res.json();
    return data.data[0].b64_json;
  } else if (provider === "google") {
    // Build parts array — text prompt + optional reference images
    const parts: any[] = [];
    const hasRefs = referenceImages && referenceImages.length > 0;
    
    if (hasRefs) {
      const refCount = referenceImages.length;
      parts.push({
        text: `Using these ${refCount} location reference image${refCount > 1 ? "s" : ""} as the visual anchor for consistency (maintain the EXACT same architecture, materials, color palette, lighting style, and environmental details across all outputs), generate: ${prompt}`,
      });
      for (const refImg of referenceImages) {
        parts.push({
          inlineData: {
            mimeType: "image/png",
            data: refImg,
          },
        });
      }
    } else {
      parts.push({ text: `Generate an image: ${prompt}` });
    }

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            responseModalities: ["IMAGE", "TEXT"],
          },
        }),
      }
    );
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Google Image API error: ${res.status} - ${err}`);
    }
    const data = await res.json();
    const responseParts = data.candidates?.[0]?.content?.parts || [];
    const imagePart = responseParts.find((p: any) => p.inlineData);
    if (!imagePart) throw new Error("No image returned from Google AI");
    return imagePart.inlineData.data;
  }
  throw new Error(
    `Image generation not supported for provider: ${provider}. Use OpenAI or Google.`
  );
}

// ── Prompt Templates ──

const SCAN_SYSTEM_PROMPT = `You are a literary analysis expert specializing in setting and location analysis. Analyze the provided text and identify all named or significant locations/settings. For each location, provide:
- name: its name as it appears (or a descriptive name if unnamed, e.g. "The Abandoned Factory")
- role: its narrative role (Primary Setting, Secondary Setting, Transitional, Mentioned, Symbolic)
- briefDescription: 1-2 sentences about what this place is in this text
- estimatedImportance: "major" (central to the plot, scenes happen here frequently), "minor" (appears in several scenes, has some influence), or "background" (mentioned briefly or appears in passing)

Return ONLY a JSON object with this exact structure:
{
  "locations": [
    { "name": "...", "role": "...", "briefDescription": "...", "estimatedImportance": "major|minor|background" }
  ]
}

Sort by importance (major first, then minor, then background). If this is a location description document about a single place, return just that one location as major.`;

function buildAnalyzePrompt(locationName: string, sourceType: string): string {
  return `You are an expert fiction writing analyst and world-building consultant. You will analyze the provided text and create a comprehensive location development profile for the location "${locationName}".

This text is a ${sourceType === "description" ? "location description or world-building document" : "story manuscript or excerpt"}.

Fill in EVERY field with rich, specific detail drawn from the text. Where the text doesn't explicitly state something, make intelligent inferences consistent with what IS stated. For fields where the text provides no basis for inference, write "[Not enough information — consider developing this area]".

For the 5 visual study fields (visualEstablishing, visualArchitectural, visualInterior, visualLighting, visualStorytelling), create detailed AI image generation prompts. Each prompt must describe this specific location with its exact physical features, architecture, materials, and distinguishing characteristics. Make every prompt vivid, specific, and production-ready — these are meant to generate a complete location layout sheet like a film or game studio would use.

Return ONLY a JSON object matching this exact structure (all values are strings):
{
  "logline": "A one-sentence description of this location and its narrative significance",
  "type": "interior / exterior / hybrid",
  "scale": "e.g. single room, building complex, city district, wilderness region",
  "timePeriod": "...",
  "alternateNames": "...",

  "region": "...",
  "terrain": "...",
  "climate": "...",
  "elevation": "...",
  "layoutDescription": "...",
  "entryExitPoints": "...",
  "surroundingEnvironment": "...",
  "nearestLandmarks": "...",
  "travelRoutes": "...",

  "originFounding": "...",
  "keyHistoricalEvents": "...",
  "previousUses": "...",
  "whoBuiltItAndWhy": "...",
  "currentStateVsOriginal": "...",
  "echoingEvents": "...",

  "defaultSounds": "...",
  "smells": "...",
  "lightQuality": "...",
  "temperatureAirQuality": "...",
  "tactileSurfaces": "...",
  "timeOfDayVariations": "...",

  "defaultEmotionalTone": "...",
  "psychologicalEffect": "...",
  "protagonistFeeling": "...",
  "appearsVsReality": "...",
  "locationLie": "What this place pretends to be vs what it actually is",

  "whoLivesWorksHere": "...",
  "powerHierarchy": "...",
  "writtenUnwrittenRules": "...",
  "territorialBoundaries": "...",
  "newcomerTreatment": "...",
  "accessControl": "...",

  "storyEventsHere": "...",
  "secrets": "...",
  "builtInDangers": "...",
  "escapeRoutesTraps": "...",
  "characterConstraints": "...",

  "stateAtOpening": "...",
  "stateAtClimax": "...",
  "stateAtResolution": "...",
  "transformationCause": "...",
  "transformationStatement": "At the start, this place is ___. Through the story, it becomes ___. By the end, it represents ___.",

  "thematicRepresentation": "...",
  "recurringMotifs": "...",
  "symbolicObjects": "...",
  "colorWeatherAssociations": "...",
  "characterMirror": "How this location mirrors or contrasts the protagonist's inner state",

  "keyProps": "...",
  "practicalConsiderations": "...",
  "realWorldReferences": "...",
  "cameraAngleSuggestions": "...",
  "vfxNotes": "...",

  "visualEstablishing": "A detailed prompt for a wide establishing shot of ${locationName}. Show the full scope of the environment from an aerial or distant vantage point. Include terrain, structures, weather, time of day, scale reference. Art style: cinematic wide shot, production-ready environment concept art.",
  "visualArchitectural": "A detailed prompt for architectural detail studies of ${locationName}. Show materials, textures, construction methods, wear patterns, structural details. Focus on what makes this place physically unique. Art style: detailed architectural reference sheet.",
  "visualInterior": "A detailed prompt for the interior focal point or heart of ${locationName}. Show the most important or emotionally significant space within. Include furnishings, objects, light sources, spatial relationships. Art style: interior concept art, atmospheric rendering.",
  "visualLighting": "A detailed prompt for a lighting and atmosphere study of ${locationName}. Show the same view under four different conditions: dawn/morning light, harsh midday, dusk/golden hour, and night/emergency. Art style: mood and lighting reference sheet.",
  "visualStorytelling": "A detailed prompt for environmental storytelling details in ${locationName}. Show objects, wear, graffiti, personal items, damage, repairs, signs of life or decay that reveal the history and inhabitants. Art style: close-up detail study, cinematic production design."
}`;
}

// ── DOCX Generation ──

const VISUAL_LAYER_NAMES: Record<string, string> = {
  establishing: "1. Establishing Shot — Scope Layer",
  architectural: "2. Architectural Detail — Structure Layer",
  interior: "3. Interior / Focal Point — Heart Layer",
  lighting: "4. Lighting & Atmosphere — Mood Layer",
  storytelling: "5. Environmental Storytelling — History Layer",
};

function buildDocx(profile: LocationProfile, imageBuffers?: Record<string, Buffer>): Promise<Buffer> {
  const sectionHeader = (text: string, num: number) =>
    new Paragraph({
      children: [
        new TextRun({
          text: `SECTION ${num}  ·  ${text}`,
          bold: true,
          size: 28,
          font: "Calibri",
          color: "1a1a2e",
        }),
      ],
      spacing: { before: 400, after: 200 },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 1, color: "cccccc" },
      },
    });

  const fieldLabel = (label: string) =>
    new TextRun({ text: label, bold: true, size: 22, font: "Calibri" });

  const fieldValue = (value: string) =>
    new TextRun({ text: value, size: 22, font: "Calibri" });

  const fieldParagraph = (label: string, value: string) =>
    new Paragraph({
      children: [fieldLabel(`${label}: `), fieldValue(value || "—")],
      spacing: { after: 120 },
    });

  const emptyLine = () => new Paragraph({ spacing: { after: 100 } });

  const children: any[] = [
    // Title
    new Paragraph({
      children: [
        new TextRun({
          text: "LOCATION DEVELOPMENT PROFILE",
          bold: true,
          size: 36,
          font: "Calibri",
          color: "1a1a2e",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: profile.logline ? profile.logline.split(" — ")[0] : "Unknown Location",
          bold: true,
          size: 32,
          font: "Calibri",
          color: "2d6a4f",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    }),
  ];

  // Visual Study Images
  if (imageBuffers && Object.keys(imageBuffers).length > 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "VISUAL LOCATION STUDY",
            bold: true,
            size: 28,
            font: "Calibri",
            color: "1a1a2e",
          }),
        ],
        spacing: { before: 200, after: 200 },
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 1, color: "cccccc" },
        },
      })
    );

    for (const [key, label] of Object.entries(VISUAL_LAYER_NAMES)) {
      const buf = imageBuffers[key];
      if (buf) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: label,
                bold: true,
                size: 24,
                font: "Calibri",
                color: "2d6a4f",
              }),
            ],
            spacing: { before: 300, after: 150 },
          }),
          new Paragraph({
            children: [
              new ImageRun({
                data: buf,
                transformation: { width: 500, height: 500 },
                type: "png",
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          })
        );
      }
    }
    children.push(emptyLine());
  }

  // Section 1: Location Identity
  children.push(
    sectionHeader("LOCATION IDENTITY", 1),
    fieldParagraph("Logline", profile.logline),
    fieldParagraph("Type", profile.type),
    fieldParagraph("Scale", profile.scale),
    fieldParagraph("Time Period", profile.timePeriod),
    fieldParagraph("Alternate Names", profile.alternateNames),
    emptyLine()
  );

  // Section 2: Geography & Physical Layout
  children.push(
    sectionHeader("GEOGRAPHY & PHYSICAL LAYOUT", 2),
    fieldParagraph("Region", profile.region),
    fieldParagraph("Terrain", profile.terrain),
    fieldParagraph("Climate", profile.climate),
    fieldParagraph("Elevation", profile.elevation),
    fieldParagraph("Layout Description", profile.layoutDescription),
    fieldParagraph("Entry / Exit Points", profile.entryExitPoints),
    fieldParagraph("Surrounding Environment", profile.surroundingEnvironment),
    fieldParagraph("Nearest Landmarks", profile.nearestLandmarks),
    fieldParagraph("Travel Routes", profile.travelRoutes),
    emptyLine()
  );

  // Section 3: History & Timeline
  children.push(
    sectionHeader("HISTORY & TIMELINE", 3),
    fieldParagraph("Origin / Founding", profile.originFounding),
    fieldParagraph("Key Historical Events", profile.keyHistoricalEvents),
    fieldParagraph("Previous Uses", profile.previousUses),
    fieldParagraph("Who Built It & Why", profile.whoBuiltItAndWhy),
    fieldParagraph("Current State vs Original", profile.currentStateVsOriginal),
    fieldParagraph("Echoing Events", profile.echoingEvents),
    emptyLine()
  );

  // Section 4: Sensory Profile
  children.push(
    sectionHeader("SENSORY PROFILE", 4),
    fieldParagraph("Default Sounds", profile.defaultSounds),
    fieldParagraph("Smells", profile.smells),
    fieldParagraph("Light Quality", profile.lightQuality),
    fieldParagraph("Temperature / Air Quality", profile.temperatureAirQuality),
    fieldParagraph("Tactile Surfaces", profile.tactileSurfaces),
    fieldParagraph("Time of Day Variations", profile.timeOfDayVariations),
    emptyLine()
  );

  // Section 5: Mood & Emotional Atmosphere
  children.push(
    sectionHeader("MOOD & EMOTIONAL ATMOSPHERE", 5),
    fieldParagraph("Default Emotional Tone", profile.defaultEmotionalTone),
    fieldParagraph("Psychological Effect", profile.psychologicalEffect),
    fieldParagraph("Protagonist Feeling", profile.protagonistFeeling),
    fieldParagraph("Appears vs Reality", profile.appearsVsReality),
    fieldParagraph("The Location's Lie", profile.locationLie),
    emptyLine()
  );

  // Section 6: Inhabitants & Social Structure
  children.push(
    sectionHeader("INHABITANTS & SOCIAL STRUCTURE", 6),
    fieldParagraph("Who Lives / Works Here", profile.whoLivesWorksHere),
    fieldParagraph("Power Hierarchy", profile.powerHierarchy),
    fieldParagraph("Written / Unwritten Rules", profile.writtenUnwrittenRules),
    fieldParagraph("Territorial Boundaries", profile.territorialBoundaries),
    fieldParagraph("Newcomer Treatment", profile.newcomerTreatment),
    fieldParagraph("Access Control", profile.accessControl),
    emptyLine()
  );

  // Section 7: Narrative Function & Conflict
  children.push(
    sectionHeader("NARRATIVE FUNCTION & CONFLICT", 7),
    fieldParagraph("Story Events Here", profile.storyEventsHere),
    fieldParagraph("Secrets", profile.secrets),
    fieldParagraph("Built-In Dangers", profile.builtInDangers),
    fieldParagraph("Escape Routes / Traps", profile.escapeRoutesTraps),
    fieldParagraph("Character Constraints", profile.characterConstraints),
    emptyLine()
  );

  // Section 8: Location Arc
  children.push(
    sectionHeader("LOCATION ARC", 8),
    fieldParagraph("State at Opening", profile.stateAtOpening),
    fieldParagraph("State at Climax", profile.stateAtClimax),
    fieldParagraph("State at Resolution", profile.stateAtResolution),
    fieldParagraph("Transformation Cause", profile.transformationCause),
    fieldParagraph("Transformation Statement", profile.transformationStatement),
    emptyLine()
  );

  // Section 9: Theme & Symbolism
  children.push(
    sectionHeader("THEME & SYMBOLISM", 9),
    fieldParagraph("Thematic Representation", profile.thematicRepresentation),
    fieldParagraph("Recurring Motifs", profile.recurringMotifs),
    fieldParagraph("Symbolic Objects", profile.symbolicObjects),
    fieldParagraph("Color / Weather Associations", profile.colorWeatherAssociations),
    fieldParagraph("Character Mirror", profile.characterMirror),
    emptyLine()
  );

  // Section 10: Technical & Production Notes
  children.push(
    sectionHeader("TECHNICAL & PRODUCTION NOTES", 10),
    fieldParagraph("Key Props", profile.keyProps),
    fieldParagraph("Practical Considerations", profile.practicalConsiderations),
    fieldParagraph("Real-World References", profile.realWorldReferences),
    fieldParagraph("Camera Angle Suggestions", profile.cameraAngleSuggestions),
    fieldParagraph("VFX Notes", profile.vfxNotes)
  );

  const doc = new Document({
    sections: [{ children }],
  });

  return Packer.toBuffer(doc) as Promise<Buffer>;
}

// ── Route Registration ──

export async function registerRoutes(httpServer: Server, app: Express) {

  // ── Auth Routes (before middleware) ──

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { email, password, displayName } = req.body;
      if (!email || !password || !displayName) {
        return res.status(400).json({ error: "email, password, and displayName are required" });
      }
      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }
      const existing = db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).get();
      if (existing) {
        return res.status(409).json({ error: "An account with this email already exists" });
      }
      const passwordHash = bcrypt.hashSync(password, 10);
      const now = new Date().toISOString();
      const user = db.insert(users).values({
        email: email.toLowerCase().trim(),
        passwordHash,
        displayName: displayName.trim(),
        createdAt: now,
      }).returning().get();

      // Set trial start and admin role for owner
      sqlite.prepare("UPDATE users SET trial_started_at = ? WHERE id = ?").run(now, user.id);
      if (email.toLowerCase().trim() === "designholistically@gmail.com") {
        sqlite.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(user.id);
      }

      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      db.insert(authSessions).values({ userId: user.id, token, expiresAt, createdAt: now }).run();

      return res.json({ token, user: { id: user.id, email: user.email, displayName: user.displayName } });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "email and password are required" });
      }
      const user = db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).get();
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      if (!bcrypt.compareSync(password, user.passwordHash)) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      // Ensure admin role is set for owner on every login
      if (email.toLowerCase().trim() === "designholistically@gmail.com") {
        sqlite.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(user.id);
      }
      // Ensure trial_started_at is set
      if (!user.trialStartedAt) {
        sqlite.prepare("UPDATE users SET trial_started_at = created_at WHERE id = ? AND trial_started_at IS NULL").run(user.id);
      }

      const now = new Date().toISOString();
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      db.insert(authSessions).values({ userId: user.id, token, expiresAt, createdAt: now }).run();

      return res.json({ token, user: { id: user.id, email: user.email, displayName: user.displayName } });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const token = req.headers["x-session-id"] as string;
    if (token) {
      db.delete(authSessions).where(eq(authSessions.token, token)).run();
    }
    return res.json({ ok: true });
  });

  app.get("/api/auth/me", (req: Request, res: Response) => {
    const token = req.headers["x-session-id"] as string;
    if (!token) return res.status(401).json({ error: "Not authenticated" });

    const session = db.select().from(authSessions).where(eq(authSessions.token, token)).get();
    if (!session || new Date(session.expiresAt) < new Date()) {
      return res.status(401).json({ error: "Session expired" });
    }
    const user = db.select().from(users).where(eq(users.id, session.userId)).get();
    if (!user) return res.status(401).json({ error: "User not found" });

    return res.json({ id: user.id, email: user.email, displayName: user.displayName });
  });

  app.post("/api/auth/forgot-password", (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: "email is required" });

      const user = db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).get();
      if (!user) {
        return res.json({ ok: true, message: "If that email exists, a reset token has been generated." });
      }

      const token = crypto.randomUUID();
      const now = new Date().toISOString();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      db.insert(passwordResets).values({ userId: user.id, token, expiresAt, createdAt: now }).run();

      return res.json({ ok: true, resetToken: token, message: "Reset token generated. Share with admin or use directly." });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/auth/reset-password", (req: Request, res: Response) => {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) return res.status(400).json({ error: "token and newPassword are required" });
      if (newPassword.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });

      const reset = db.select().from(passwordResets).where(eq(passwordResets.token, token)).get();
      if (!reset || new Date(reset.expiresAt) < new Date()) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }

      const passwordHash = bcrypt.hashSync(newPassword, 10);
      db.update(users).set({ passwordHash }).where(eq(users.id, reset.userId)).run();
      db.delete(passwordResets).where(eq(passwordResets.token, token)).run();

      return res.json({ ok: true, message: "Password has been reset. You can now sign in." });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ── Auth Middleware — protects all /api/* except /api/auth/* and /api/stripe/webhook ──
  app.use("/api", (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith("/auth/") || req.path.startsWith("/auth") || req.path === "/stripe/webhook") {
      return next();
    }
    const token = req.headers["x-session-id"] as string;
    if (!token) return res.status(401).json({ error: "Authentication required" });

    const session = db.select().from(authSessions).where(eq(authSessions.token, token)).get();
    if (!session || new Date(session.expiresAt) < new Date()) {
      return res.status(401).json({ error: "Session expired" });
    }
    req.userId = session.userId;
    next();
  });

  // Register Stripe subscription routes
  registerStripeRoutes(app);

  // Platform API key for trial users
  const PLATFORM_API_KEY = process.env.GOOGLE_API_KEY || "";

  // Feature gate helper — checks trial/subscription status
  function requireActiveSubscription(req: Request, res: Response): boolean {
    const user = sqlite.prepare("SELECT * FROM users WHERE id = ?").get(req.userId!) as any;
    if (!user) { res.status(401).json({ error: "Not authenticated" }); return false; }
    if (!canAccessFeatures(user)) {
      res.status(403).json({ error: "subscription_required", message: "Your trial has expired. Please upgrade to continue using Location Forge." });
      return false;
    }
    return true;
  }

  // Resolve API key: user's own key, or platform key during trial/admin
  function resolveApiKey(userApiKey: string | undefined, userId: number): { key: string; isUserKey: boolean; error?: string } {
    if (userApiKey && userApiKey.trim()) {
      return { key: userApiKey.trim(), isUserKey: true };
    }
    // Check if user is in trial or admin — use platform key
    const user = sqlite.prepare("SELECT * FROM users WHERE id = ?").get(userId) as any;
    if (!user) return { key: "", isUserKey: false, error: "Not authenticated" };
    if (isAdmin(user) || isTrialActive(user)) {
      if (PLATFORM_API_KEY) {
        return { key: PLATFORM_API_KEY, isUserKey: false };
      }
    }
    // After trial, user must have their own key
    if (hasActiveSubscription(user) && !userApiKey?.trim()) {
      return { key: "", isUserKey: false, error: "api_key_required" };
    }
    return { key: "", isUserKey: false, error: "api_key_required" };
  }

  // ── Session Save/Load (per-user) ──

  app.post("/api/session/save", (req: Request, res: Response) => {
    try {
      const key = `user_${req.userId}`;
      const stateJson = JSON.stringify(req.body.state || {});
      const now = new Date().toISOString();
      const existing = db.select().from(sessions).where(eq(sessions.sessionKey, key)).get();
      if (existing) {
        db.update(sessions).set({ stateJson, updatedAt: now }).where(eq(sessions.sessionKey, key)).run();
      } else {
        db.insert(sessions).values({ sessionKey: key, userId: req.userId!, stateJson, updatedAt: now }).run();
      }
      return res.json({ ok: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/session/load", (req: Request, res: Response) => {
    try {
      const key = `user_${req.userId}`;
      const session = db.select().from(sessions).where(eq(sessions.sessionKey, key)).get();
      if (!session) return res.json({ state: null });
      return res.json({ state: JSON.parse(session.stateJson) });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ── Projects API ──

  app.get("/api/projects", (req: Request, res: Response) => {
    try {
      const rows = sqlite.prepare(
        `SELECT id, name, created_at, updated_at,
         json_extract(state_json, '$.detectedLocations') as locations_json
         FROM projects WHERE user_id = ? ORDER BY updated_at DESC`
      ).all(req.userId!) as any[];

      const projects = rows.map((r: any) => {
        let locationCount = 0;
        let developedCount = 0;
        try {
          const locs = JSON.parse(r.locations_json || '[]');
          locationCount = locs.length;
        } catch {}
        try {
          const full = sqlite.prepare(`SELECT state_json FROM projects WHERE id = ?`).get(r.id) as any;
          if (full) {
            const state = JSON.parse(full.state_json);
            developedCount = Object.keys(state.developedItems || {}).length;
          }
        } catch {}
        return {
          id: r.id,
          name: r.name,
          locationCount,
          developedCount,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        };
      });

      return res.json({ projects });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/projects", (req: Request, res: Response) => {
    try {
      const { name } = req.body;
      if (!name || typeof name !== 'string') return res.status(400).json({ error: "name required" });
      const now = new Date().toISOString();
      const result = sqlite.prepare(
        `INSERT INTO projects (user_id, name, state_json, created_at, updated_at) VALUES (?, ?, '{}', ?, ?)`
      ).run(req.userId!, name.trim(), now, now);
      return res.json({ id: Number(result.lastInsertRowid), name: name.trim() });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/projects/:id", (req: Request, res: Response) => {
    try {
      const row = sqlite.prepare(
        `SELECT id, name, state_json, created_at, updated_at FROM projects WHERE id = ? AND user_id = ?`
      ).get(parseInt(req.params.id as string), req.userId!) as any;
      if (!row) return res.status(404).json({ error: "Project not found" });
      const rawJson = `{"id":${row.id},"name":${JSON.stringify(row.name)},"state":${row.state_json || '{}'},"createdAt":${JSON.stringify(row.created_at)},"updatedAt":${JSON.stringify(row.updated_at)}}`;
      res.setHeader('Content-Type', 'application/json');
      return res.send(rawJson);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/projects/:id", (req: Request, res: Response) => {
    try {
      const { state, name } = req.body;
      const now = new Date().toISOString();
      const updates: string[] = [];
      const params: any[] = [];
      if (state) { updates.push('state_json = ?'); params.push(JSON.stringify(state)); }
      if (name) { updates.push('name = ?'); params.push(name.trim()); }
      updates.push('updated_at = ?'); params.push(now);
      params.push(parseInt(req.params.id as string), req.userId!);

      sqlite.prepare(
        `UPDATE projects SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`
      ).run(...params);

      return res.json({ ok: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/projects/:id", (req: Request, res: Response) => {
    try {
      sqlite.prepare(
        `DELETE FROM projects WHERE id = ? AND user_id = ?`
      ).run(parseInt(req.params.id as string), req.userId!);
      return res.json({ ok: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/projects/:id/rename", (req: Request, res: Response) => {
    try {
      const { name } = req.body;
      if (!name || typeof name !== 'string') return res.status(400).json({ error: "name required" });
      sqlite.prepare(
        `UPDATE projects SET name = ?, updated_at = ? WHERE id = ? AND user_id = ?`
      ).run(name.trim(), new Date().toISOString(), parseInt(req.params.id as string), req.userId!);
      return res.json({ ok: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Step 1: Scan text for locations
  app.post("/api/scan", async (req: Request, res: Response) => {
    if (!requireActiveSubscription(req, res)) return;
    try {
      const parsed = scanRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      const { text, sourceType, provider, apiKey: userApiKey } = parsed.data;
      const resolved = resolveApiKey(userApiKey, req.userId!);
      if (resolved.error) return res.status(403).json({ error: resolved.error, message: "Please add your Google AI API key in Account settings." });

      const result = await callTextAI(
        provider,
        resolved.key,
        SCAN_SYSTEM_PROMPT,
        `Here is the ${sourceType} text to analyze:\n\n${text}`
      );

      // Parse the JSON response
      let locations: DetectedLocation[];
      try {
        let jsonStr = result;
        jsonStr = jsonStr.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
        const firstBrace = jsonStr.indexOf("{");
        const firstBracket = jsonStr.indexOf("[");
        const start = Math.min(
          firstBrace !== -1 ? firstBrace : Infinity,
          firstBracket !== -1 ? firstBracket : Infinity
        );
        if (start !== Infinity) {
          const lastBrace = jsonStr.lastIndexOf("}");
          const lastBracket = jsonStr.lastIndexOf("]");
          const end = Math.max(lastBrace, lastBracket);
          jsonStr = jsonStr.substring(start, end + 1);
        }
        const parsed = JSON.parse(jsonStr);
        locations = parsed.locations || (Array.isArray(parsed) ? parsed : [parsed]);
      } catch (e) {
        console.error("Failed to parse scan response. Raw (first 500 chars):", result.substring(0, 500));
        return res.status(422).json({ error: "Failed to parse AI response. Please try again." });
      }

      return res.json({ locations });
    } catch (err: any) {
      console.error("Scan error:", err);
      return res.status(422).json({ error: err.message });
    }
  });

  // Step 2: Analyze a specific location
  app.post("/api/analyze", async (req: Request, res: Response) => {
    if (!requireActiveSubscription(req, res)) return;
    try {
      const parsed = analyzeRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      const { text, sourceType, provider, apiKey: userApiKey, locationName } = parsed.data;
      const resolved = resolveApiKey(userApiKey, req.userId!);
      if (resolved.error) return res.status(403).json({ error: resolved.error, message: "Please add your Google AI API key in Account settings." });
      const systemPrompt = buildAnalyzePrompt(locationName, sourceType);

      const result = await callTextAI(
        provider,
        resolved.key,
        systemPrompt,
        `Here is the text to analyze for the location "${locationName}":\n\n${text}`
      );

      let profile: LocationProfile;
      try {
        // Try multiple parsing strategies
        let jsonStr = result;
        
        // Strip markdown code fences
        jsonStr = jsonStr.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
        
        // If it starts with text before {, find the first {
        const firstBrace = jsonStr.indexOf("{");
        const lastBrace = jsonStr.lastIndexOf("}");
        if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
          jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
        }
        
        profile = JSON.parse(jsonStr);
      } catch (e) {
        console.error("Failed to parse AI response. Raw result (first 500 chars):", result.substring(0, 500));
        return res.status(422).json({ error: "Failed to parse AI location analysis. The AI returned an unexpected format. Please try again." });
      }

      // Save to database
      const visitorId = req.headers["x-visitor-id"] as string || "anonymous";
      const saved = storage.createLocation({
        visitorId,
        name: locationName,
        sourceType,
        profileJson: JSON.stringify(profile),
        createdAt: new Date().toISOString(),
      });

      return res.json({ profile, locationId: saved.id });
    } catch (err: any) {
      console.error("Analyze error:", err);
      return res.status(422).json({ error: err.message });
    }
  });

  // Step 3: Generate location visual
  app.post("/api/generate-image", async (req: Request, res: Response) => {
    if (!requireActiveSubscription(req, res)) return;
    try {
      const parsed = generateImageRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      const { prompt, style, referenceImages, provider, apiKey: userApiKey } = parsed.data;
      const resolved = resolveApiKey(userApiKey, req.userId!);
      if (resolved.error) return res.status(403).json({ error: resolved.error, message: "Please add your Google AI API key in Account settings." });
      // Prepend style directive to ensure consistency
      const styledPrompt = style ? `${style}. ${prompt}` : prompt;
      const base64 = await callImageAI(provider, resolved.key, styledPrompt, referenceImages);

      return res.json({ image: base64 });
    } catch (err: any) {
      console.error("Image generation error:", err);
      return res.status(422).json({ error: err.message });
    }
  });

  // Step 4: Export to DOCX
  app.post("/api/export-docx", async (req: Request, res: Response) => {
    try {
      const { profile, images } = req.body;
      if (!profile) {
        return res.status(400).json({ error: "Profile data is required" });
      }

      // Convert base64 images to buffers
      const imageBuffers: Record<string, Buffer> = {};
      if (images) {
        for (const [key, b64] of Object.entries(images)) {
          if (b64 && typeof b64 === "string") {
            imageBuffers[key] = Buffer.from(b64 as string, "base64");
          }
        }
      }

      const buffer = await buildDocx(profile, imageBuffers);

      const locationName = profile.logline?.split(" — ")[0] || "Location";
      const filename = `${locationName.replace(/[^a-zA-Z0-9]/g, "_")}_Location_Profile.docx`;

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (err: any) {
      console.error("DOCX export error:", err);
      return res.status(422).json({ error: err.message });
    }
  });

  // Export all developed locations as combined DOCX
  app.post("/api/export-all-docx", async (req: Request, res: Response) => {
    try {
      const { items } = req.body;
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "At least one developed location is required" });
      }

      // Build a combined document with page breaks between locations
      const allChildren: any[] = [
        // Master title
        new Paragraph({
          children: [
            new TextRun({
              text: "LOCATION DEVELOPMENT BIBLE",
              bold: true,
              size: 40,
              font: "Calibri",
              color: "1a1a2e",
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 150 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `${items.length} Location${items.length !== 1 ? "s" : ""} Developed`,
              size: 26,
              font: "Calibri",
              color: "666666",
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
        }),
      ];

      // Table of contents
      allChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "TABLE OF CONTENTS",
              bold: true,
              size: 28,
              font: "Calibri",
              color: "1a1a2e",
            }),
          ],
          spacing: { before: 300, after: 200 },
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "cccccc" },
          },
        })
      );

      items.forEach((item: any, idx: number) => {
        allChildren.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${idx + 1}. ${item.name}`,
                size: 24,
                font: "Calibri",
              }),
              new TextRun({
                text: ` — ${item.profile?.logline?.substring(0, 80) || ""}${(item.profile?.logline?.length || 0) > 80 ? "..." : ""}`,
                size: 22,
                font: "Calibri",
                color: "888888",
                italics: true,
              }),
            ],
            spacing: { after: 80 },
          })
        );
      });

      // Add page break before first location
      allChildren.push(
        new Paragraph({
          children: [],
          pageBreakBefore: true,
        })
      );

      // Generate each location's content
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const profile = item.profile as LocationProfile;

        // Convert images
        const imageBuffers: Record<string, Buffer> = {};
        if (item.images) {
          for (const [key, b64] of Object.entries(item.images)) {
            if (b64 && typeof b64 === "string") {
              imageBuffers[key] = Buffer.from(b64, "base64");
            }
          }
        }

        // Location divider
        if (i > 0) {
          allChildren.push(
            new Paragraph({
              children: [],
              pageBreakBefore: true,
            })
          );
        }

        // Location header
        allChildren.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `LOCATION ${i + 1} OF ${items.length}`,
                size: 20,
                font: "Calibri",
                color: "999999",
              }),
            ],
            spacing: { after: 50 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: item.name || "Unknown Location",
                bold: true,
                size: 36,
                font: "Calibri",
                color: "1a1a2e",
              }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: profile.logline || "",
                size: 24,
                font: "Calibri",
                color: "2d6a4f",
                italics: true,
              }),
            ],
            spacing: { after: 300 },
          })
        );

        // Helper functions (same as single export)
        const sectionHeader = (text: string, num: number) =>
          new Paragraph({
            children: [
              new TextRun({
                text: `SECTION ${num}  ·  ${text}`,
                bold: true,
                size: 28,
                font: "Calibri",
                color: "1a1a2e",
              }),
            ],
            spacing: { before: 400, after: 200 },
            border: {
              bottom: { style: BorderStyle.SINGLE, size: 1, color: "cccccc" },
            },
          });

        const fieldParagraph = (label: string, value: string) =>
          new Paragraph({
            children: [
              new TextRun({ text: `${label}: `, bold: true, size: 22, font: "Calibri" }),
              new TextRun({ text: value || "—", size: 22, font: "Calibri" }),
            ],
            spacing: { after: 120 },
          });

        const emptyLine = () => new Paragraph({ spacing: { after: 100 } });

        // Visual Study Images
        if (Object.keys(imageBuffers).length > 0) {
          allChildren.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: "VISUAL LOCATION STUDY",
                  bold: true,
                  size: 28,
                  font: "Calibri",
                  color: "1a1a2e",
                }),
              ],
              spacing: { before: 200, after: 200 },
              border: {
                bottom: { style: BorderStyle.SINGLE, size: 1, color: "cccccc" },
              },
            })
          );

          for (const [key, label] of Object.entries(VISUAL_LAYER_NAMES)) {
            const buf = imageBuffers[key];
            if (buf) {
              allChildren.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: label,
                      bold: true,
                      size: 24,
                      font: "Calibri",
                      color: "2d6a4f",
                    }),
                  ],
                  spacing: { before: 300, after: 150 },
                }),
                new Paragraph({
                  children: [
                    new ImageRun({
                      data: buf,
                      transformation: { width: 500, height: 500 },
                      type: "png",
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 200 },
                })
              );
            }
          }
          allChildren.push(emptyLine());
        }

        // All 10 sections
        allChildren.push(
          sectionHeader("LOCATION IDENTITY", 1),
          fieldParagraph("Logline", profile.logline),
          fieldParagraph("Type", profile.type),
          fieldParagraph("Scale", profile.scale),
          fieldParagraph("Time Period", profile.timePeriod),
          fieldParagraph("Alternate Names", profile.alternateNames),
          emptyLine(),

          sectionHeader("GEOGRAPHY & PHYSICAL LAYOUT", 2),
          fieldParagraph("Region", profile.region),
          fieldParagraph("Terrain", profile.terrain),
          fieldParagraph("Climate", profile.climate),
          fieldParagraph("Elevation", profile.elevation),
          fieldParagraph("Layout Description", profile.layoutDescription),
          fieldParagraph("Entry / Exit Points", profile.entryExitPoints),
          fieldParagraph("Surrounding Environment", profile.surroundingEnvironment),
          fieldParagraph("Nearest Landmarks", profile.nearestLandmarks),
          fieldParagraph("Travel Routes", profile.travelRoutes),
          emptyLine(),

          sectionHeader("HISTORY & TIMELINE", 3),
          fieldParagraph("Origin / Founding", profile.originFounding),
          fieldParagraph("Key Historical Events", profile.keyHistoricalEvents),
          fieldParagraph("Previous Uses", profile.previousUses),
          fieldParagraph("Who Built It & Why", profile.whoBuiltItAndWhy),
          fieldParagraph("Current State vs Original", profile.currentStateVsOriginal),
          fieldParagraph("Echoing Events", profile.echoingEvents),
          emptyLine(),

          sectionHeader("SENSORY PROFILE", 4),
          fieldParagraph("Default Sounds", profile.defaultSounds),
          fieldParagraph("Smells", profile.smells),
          fieldParagraph("Light Quality", profile.lightQuality),
          fieldParagraph("Temperature / Air Quality", profile.temperatureAirQuality),
          fieldParagraph("Tactile Surfaces", profile.tactileSurfaces),
          fieldParagraph("Time of Day Variations", profile.timeOfDayVariations),
          emptyLine(),

          sectionHeader("MOOD & EMOTIONAL ATMOSPHERE", 5),
          fieldParagraph("Default Emotional Tone", profile.defaultEmotionalTone),
          fieldParagraph("Psychological Effect", profile.psychologicalEffect),
          fieldParagraph("Protagonist Feeling", profile.protagonistFeeling),
          fieldParagraph("Appears vs Reality", profile.appearsVsReality),
          fieldParagraph("The Location's Lie", profile.locationLie),
          emptyLine(),

          sectionHeader("INHABITANTS & SOCIAL STRUCTURE", 6),
          fieldParagraph("Who Lives / Works Here", profile.whoLivesWorksHere),
          fieldParagraph("Power Hierarchy", profile.powerHierarchy),
          fieldParagraph("Written / Unwritten Rules", profile.writtenUnwrittenRules),
          fieldParagraph("Territorial Boundaries", profile.territorialBoundaries),
          fieldParagraph("Newcomer Treatment", profile.newcomerTreatment),
          fieldParagraph("Access Control", profile.accessControl),
          emptyLine(),

          sectionHeader("NARRATIVE FUNCTION & CONFLICT", 7),
          fieldParagraph("Story Events Here", profile.storyEventsHere),
          fieldParagraph("Secrets", profile.secrets),
          fieldParagraph("Built-In Dangers", profile.builtInDangers),
          fieldParagraph("Escape Routes / Traps", profile.escapeRoutesTraps),
          fieldParagraph("Character Constraints", profile.characterConstraints),
          emptyLine(),

          sectionHeader("LOCATION ARC", 8),
          fieldParagraph("State at Opening", profile.stateAtOpening),
          fieldParagraph("State at Climax", profile.stateAtClimax),
          fieldParagraph("State at Resolution", profile.stateAtResolution),
          fieldParagraph("Transformation Cause", profile.transformationCause),
          fieldParagraph("Transformation Statement", profile.transformationStatement),
          emptyLine(),

          sectionHeader("THEME & SYMBOLISM", 9),
          fieldParagraph("Thematic Representation", profile.thematicRepresentation),
          fieldParagraph("Recurring Motifs", profile.recurringMotifs),
          fieldParagraph("Symbolic Objects", profile.symbolicObjects),
          fieldParagraph("Color / Weather Associations", profile.colorWeatherAssociations),
          fieldParagraph("Character Mirror", profile.characterMirror),
          emptyLine(),

          sectionHeader("TECHNICAL & PRODUCTION NOTES", 10),
          fieldParagraph("Key Props", profile.keyProps),
          fieldParagraph("Practical Considerations", profile.practicalConsiderations),
          fieldParagraph("Real-World References", profile.realWorldReferences),
          fieldParagraph("Camera Angle Suggestions", profile.cameraAngleSuggestions),
          fieldParagraph("VFX Notes", profile.vfxNotes)
        );
      }

      const doc = new Document({
        sections: [{ children: allChildren }],
      });

      const buffer = await Packer.toBuffer(doc);

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      res.setHeader("Content-Disposition", `attachment; filename="All_Location_Profiles.docx"`);
      res.send(buffer);
    } catch (err: any) {
      console.error("Export all DOCX error:", err);
      return res.status(422).json({ error: err.message });
    }
  });

  // Get saved locations for this visitor
  app.get("/api/locations", (req: Request, res: Response) => {
    const visitorId = req.headers["x-visitor-id"] as string || "anonymous";
    const locs = storage.getLocationsByVisitor(visitorId);
    return res.json(locs);
  });
}
