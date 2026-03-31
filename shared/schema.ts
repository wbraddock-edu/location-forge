import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ── Auth Tables ──

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  createdAt: text("created_at").notNull(),
});

export const authSessions = sqliteTable("auth_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  token: text("token").notNull(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
});

export const passwordResets = sqliteTable("password_resets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  token: text("token").notNull(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
});

// ── Session Table ──

export const sessions = sqliteTable("sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionKey: text("session_key").notNull(),
  userId: integer("user_id"),
  stateJson: text("state_json").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const locations = sqliteTable("locations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  visitorId: text("visitor_id").notNull(),
  name: text("name").notNull(),
  sourceType: text("source_type").notNull(), // 'description' | 'story'
  profileJson: text("profile_json").notNull(), // full location profile as JSON
  createdAt: text("created_at").notNull(),
});

export const insertLocationSchema = createInsertSchema(locations).omit({
  id: true,
});

export type InsertLocation = z.infer<typeof insertLocationSchema>;
export type Location = typeof locations.$inferSelect;

// Detected location from a manuscript scan
export const detectedLocationSchema = z.object({
  name: z.string(),
  role: z.string(), // e.g. "Primary Setting", "Secondary Setting", "Mentioned"
  briefDescription: z.string(), // 1-2 sentence summary
  estimatedImportance: z.enum(["major", "minor", "background"]),
});

export type DetectedLocation = z.infer<typeof detectedLocationSchema>;

// The structured location profile that the AI fills in
export const locationProfileSchema = z.object({
  // Section 1: Location Identity
  logline: z.string(),
  type: z.string(), // interior/exterior/hybrid
  scale: z.string(),
  timePeriod: z.string(),
  alternateNames: z.string(),

  // Section 2: Geography & Physical Layout
  region: z.string(),
  terrain: z.string(),
  climate: z.string(),
  elevation: z.string(),
  layoutDescription: z.string(),
  entryExitPoints: z.string(),
  surroundingEnvironment: z.string(),
  nearestLandmarks: z.string(),
  travelRoutes: z.string(),

  // Section 3: History & Timeline
  originFounding: z.string(),
  keyHistoricalEvents: z.string(),
  previousUses: z.string(),
  whoBuiltItAndWhy: z.string(),
  currentStateVsOriginal: z.string(),
  echoingEvents: z.string(),

  // Section 4: Sensory Profile
  defaultSounds: z.string(),
  smells: z.string(),
  lightQuality: z.string(),
  temperatureAirQuality: z.string(),
  tactileSurfaces: z.string(),
  timeOfDayVariations: z.string(),

  // Section 5: Mood & Emotional Atmosphere
  defaultEmotionalTone: z.string(),
  psychologicalEffect: z.string(),
  protagonistFeeling: z.string(),
  appearsVsReality: z.string(),
  locationLie: z.string(),

  // Section 6: Inhabitants & Social Structure
  whoLivesWorksHere: z.string(),
  powerHierarchy: z.string(),
  writtenUnwrittenRules: z.string(),
  territorialBoundaries: z.string(),
  newcomerTreatment: z.string(),
  accessControl: z.string(),

  // Section 7: Narrative Function & Conflict
  storyEventsHere: z.string(),
  secrets: z.string(),
  builtInDangers: z.string(),
  escapeRoutesTraps: z.string(),
  characterConstraints: z.string(),

  // Section 8: Location Arc
  stateAtOpening: z.string(),
  stateAtClimax: z.string(),
  stateAtResolution: z.string(),
  transformationCause: z.string(),
  transformationStatement: z.string(),

  // Section 9: Theme & Symbolism
  thematicRepresentation: z.string(),
  recurringMotifs: z.string(),
  symbolicObjects: z.string(),
  colorWeatherAssociations: z.string(),
  characterMirror: z.string(),

  // Section 10: Technical & Production Notes
  keyProps: z.string(),
  practicalConsiderations: z.string(),
  realWorldReferences: z.string(),
  cameraAngleSuggestions: z.string(),
  vfxNotes: z.string(),

  // Visual Study — 6 Layer Prompts
  visualEstablishing: z.string(), // Layer 1: Scope — wide/aerial establishing shot
  visualArchitectural: z.string(), // Layer 2: Structure — materials, textures, construction
  visualInterior: z.string(), // Layer 3: Heart — the most important space within
  visualLighting: z.string(), // Layer 4: Mood — day, night, storm, emergency
  visualStorytelling: z.string(), // Layer 5: History — objects, wear, signs of life/decay
  visualCustom: z.string(), // Layer 6: Director's Shot — user-defined
});

export type LocationProfile = z.infer<typeof locationProfileSchema>;

// API request schemas
export const scanRequestSchema = z.object({
  text: z.string().min(50, "Please provide at least 50 characters of text"),
  sourceType: z.enum(["description", "story"]),
  provider: z.enum(["openai", "anthropic", "google"]),
  apiKey: z.string().min(1, "API key is required"),
});

export type ScanRequest = z.infer<typeof scanRequestSchema>;

export const analyzeRequestSchema = z.object({
  text: z.string().min(50),
  sourceType: z.enum(["description", "story"]),
  provider: z.enum(["openai", "anthropic", "google"]),
  apiKey: z.string().min(1),
  locationName: z.string().min(1, "Location name is required"),
});

export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;

export const ART_STYLES = [
  { id: "cinematic", name: "Cinematic Concept Art", prompt: "STRICT STYLE LOCK: cinematic concept art. Every panel MUST use the same semi-realistic digital painting style with dramatic cinematic lighting, visible brushwork, rich color grading, and film-production quality. Do NOT switch to photorealistic rendering or flat illustration for any panel. Maintain this exact rendering approach regardless of subject matter — close-ups, full body, and environments all use the same painterly cinematic look" },
  { id: "photorealistic", name: "Photorealistic", prompt: "STRICT STYLE LOCK: photorealistic. Every panel MUST look like a real photograph — hyperrealistic skin textures, real-world lighting, studio photography quality, shallow depth of field, 8K detail. Do NOT switch to illustrated, painted, or stylized rendering for any panel. Turnarounds, expressions, poses, and close-ups must ALL look like real photographs of the same person" },
  { id: "pixar", name: "Pixar / 3D Animation", prompt: "STRICT STYLE LOCK: Pixar 3D animation style. Every panel MUST look like a Pixar/Disney 3D rendered frame — smooth subsurface scattering skin, soft rounded features, slightly exaggerated proportions, warm global illumination. Do NOT mix in photorealistic or 2D styles. All panels must look like they came from the same animated film" },
  { id: "anime", name: "Anime / Manga", prompt: "STRICT STYLE LOCK: anime art style. Every panel MUST use consistent anime/manga rendering — clean sharp linework, cel-shaded flat coloring with subtle gradients, large expressive eyes, Japanese animation production quality. Do NOT switch to realistic or Western illustration style for any panel. Turnarounds, close-ups, and scenes all use the same anime look" },
  { id: "3d-render", name: "3D Render / Game Art", prompt: "STRICT STYLE LOCK: 3D game character render. Every panel MUST look like Unreal Engine 5 real-time rendering — PBR materials, subsurface scattering, volumetric lighting, AAA game quality. Do NOT switch to 2D illustration or painterly styles. All panels look like in-engine screenshots from the same game" },
  { id: "2d-illustration", name: "2D Illustration", prompt: "STRICT STYLE LOCK: 2D digital illustration. Every panel MUST use clean vector-like linework with flat color and subtle cel-shading — modern character design sheet aesthetic, graphic novel quality. Do NOT switch to photorealistic or 3D rendering for any panel. Close-ups, full body, and environments all use the same flat illustrated look" },
  { id: "comic-book", name: "Comic Book", prompt: "STRICT STYLE LOCK: comic book art. Every panel MUST use bold ink outlines, dynamic hatching and crosshatching, vivid saturated colors, comic book panel composition. Do NOT switch to photorealistic or soft painted styles. All panels look like pages from the same comic book" },
  { id: "watercolor", name: "Watercolor", prompt: "STRICT STYLE LOCK: watercolor painting. Every panel MUST show loose expressive brushwork, visible paper texture, soft color bleeds and washes, luminous transparent layers. Do NOT switch to digital, photorealistic, or hard-edged styles. All panels look like paintings from the same watercolor artist" },
  { id: "oil-painting", name: "Oil Painting", prompt: "STRICT STYLE LOCK: classical oil painting. Every panel MUST show rich impasto brushwork, chiaroscuro lighting, warm glazing layers, canvas texture visible, Renaissance-quality portraiture. Do NOT switch to digital, photorealistic photography, or flat illustration. All panels look like paintings in the same classical tradition" },
  { id: "concept-art", name: "Concept Art / Matte", prompt: "STRICT STYLE LOCK: entertainment concept art. Every panel MUST use painterly digital style with visible brushstrokes, atmospheric perspective, matte painting quality, loose but intentional rendering. Do NOT switch to tight photorealistic or flat 2D styles. All panels look like production paintings from the same concept artist" },
] as const;

export type ArtStyleId = typeof ART_STYLES[number]["id"];

export const generateImageRequestSchema = z.object({
  prompt: z.string(),
  style: z.string().optional(),
  referenceImages: z.array(z.string()).optional(), // base64 reference images for consistency
  provider: z.enum(["openai", "google"]),
  apiKey: z.string().min(1),
});

export type GenerateImageRequest = z.infer<typeof generateImageRequestSchema>;
