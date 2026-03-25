import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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
  { id: "cinematic", name: "Cinematic Concept Art", prompt: "cinematic concept art style, dramatic lighting, film-quality production design, photorealistic rendering with artistic composition, movie poster quality" },
  { id: "photorealistic", name: "Photorealistic", prompt: "photorealistic style, hyperrealistic detail, studio photography quality, natural lighting, sharp focus, 8K resolution" },
  { id: "pixar", name: "Pixar / 3D Animation", prompt: "Pixar animation style, 3D rendered, soft subsurface scattering, expressive cartoon environments, warm cinematic lighting, Disney-quality environment design" },
  { id: "anime", name: "Anime / Manga", prompt: "anime art style, detailed manga illustration, clean linework, cel-shaded coloring, Japanese animation quality background art" },
  { id: "3d-render", name: "3D Render / Game Art", prompt: "3D game environment render, Unreal Engine 5 quality, PBR materials, volumetric lighting, AAA game art style" },
  { id: "2d-illustration", name: "2D Illustration", prompt: "2D digital illustration style, clean vector-like linework, flat color with subtle shading, modern environment design sheet aesthetic, graphic novel quality" },
  { id: "comic-book", name: "Comic Book", prompt: "comic book art style, bold ink outlines, dynamic hatching, Ben-Day dots, vivid saturated colors, Marvel/DC production quality" },
  { id: "watercolor", name: "Watercolor", prompt: "watercolor painting style, loose expressive brushwork, soft color bleeds, paper texture visible, luminous washes, fine art landscape quality" },
  { id: "oil-painting", name: "Oil Painting", prompt: "classical oil painting style, rich impasto brushwork, chiaroscuro lighting, Renaissance landscape quality, museum-grade fine art" },
  { id: "concept-art", name: "Concept Art / Matte", prompt: "entertainment industry concept art, matte painting quality, painterly digital style, atmospheric perspective, production design reference sheet" },
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
