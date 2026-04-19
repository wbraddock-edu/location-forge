import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/theme-provider";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";
import { apiRequest, setSessionToken, getSessionToken } from "@/lib/queryClient";
import {
  Upload,
  FileText,
  MapPin,
  Sparkles,
  Download,
  Image,
  Sun,
  Moon,
  Loader2,
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
  BookOpen,
  Wand2,
  AlertCircle,
  Eye,
  EyeOff,
  Copy,
  Check,
  FolderDown,
  Mountain,
  LayoutGrid,
  Play,
  Package,
  LogOut,
  Plus,
  Trash2,
  Pencil,
  CreditCard,
  FolderOpen,
  User,
  LogIn,
  UserPlus,
  KeyRound,
  Crown,
  Zap,
  Clock,
  Camera,
  Cloud,
  Film,
  Ruler,
  Heart,
  Clapperboard,
  MessageCircle,
  Send,
  TicketCheck,
  Users,
  Box,
  Mic,
  Video,
  ChevronDown,
  Lock,
  Unlock,
  Maximize2,
  Palette,
  X as XIcon,
  StopCircle,
  Timer,
} from "lucide-react";
import type { DetectedLocation, LocationProfile } from "@shared/schema";
import { ART_STYLES } from "@shared/schema";
import { DEMO_LOCATIONS, DEMO_PROFILE } from "@/lib/demo-data";

type Step = "upload" | "configure" | "dashboard" | "analyzing" | "results";

interface Provider {
  id: "openai" | "anthropic" | "google";
  name: string;
  supportsImages: boolean;
  keyPlaceholder: string;
}

const PROVIDERS: Provider[] = [
  { id: "openai", name: "OpenAI", supportsImages: true, keyPlaceholder: "sk-..." },
  { id: "anthropic", name: "Anthropic", supportsImages: false, keyPlaceholder: "sk-ant-..." },
  { id: "google", name: "Google AI", supportsImages: true, keyPlaceholder: "AIza..." },
];

// Section field mappings for the profile viewer
const PROFILE_SECTIONS = [
  {
    num: 1,
    title: "Location Identity",
    fields: [
      { key: "logline", label: "Logline" },
      { key: "type", label: "Type" },
      { key: "scale", label: "Scale" },
      { key: "timePeriod", label: "Time Period" },
      { key: "alternateNames", label: "Alternate Names" },
    ],
  },
  {
    num: 2,
    title: "Geography & Physical Layout",
    fields: [
      { key: "region", label: "Region" },
      { key: "terrain", label: "Terrain" },
      { key: "climate", label: "Climate" },
      { key: "elevation", label: "Elevation" },
      { key: "layoutDescription", label: "Layout Description" },
      { key: "entryExitPoints", label: "Entry / Exit Points" },
      { key: "surroundingEnvironment", label: "Surrounding Environment" },
      { key: "nearestLandmarks", label: "Nearest Landmarks" },
      { key: "travelRoutes", label: "Travel Routes" },
    ],
  },
  {
    num: 3,
    title: "History & Timeline",
    fields: [
      { key: "originFounding", label: "Origin / Founding" },
      { key: "keyHistoricalEvents", label: "Key Historical Events" },
      { key: "previousUses", label: "Previous Uses" },
      { key: "whoBuiltItAndWhy", label: "Who Built It & Why" },
      { key: "currentStateVsOriginal", label: "Current State vs Original" },
      { key: "echoingEvents", label: "Echoing Events" },
    ],
  },
  {
    num: 4,
    title: "Sensory Profile",
    fields: [
      { key: "defaultSounds", label: "Default Sounds" },
      { key: "smells", label: "Smells" },
      { key: "lightQuality", label: "Light Quality" },
      { key: "temperatureAirQuality", label: "Temperature / Air Quality" },
      { key: "tactileSurfaces", label: "Tactile Surfaces" },
      { key: "timeOfDayVariations", label: "Time of Day Variations" },
    ],
  },
  {
    num: 5,
    title: "Mood & Emotional Atmosphere",
    fields: [
      { key: "defaultEmotionalTone", label: "Default Emotional Tone" },
      { key: "psychologicalEffect", label: "Psychological Effect" },
      { key: "protagonistFeeling", label: "Protagonist Feeling" },
      { key: "appearsVsReality", label: "Appears vs Reality" },
      { key: "locationLie", label: "The Location's Lie" },
    ],
  },
  {
    num: 6,
    title: "Inhabitants & Social Structure",
    fields: [
      { key: "whoLivesWorksHere", label: "Who Lives / Works Here" },
      { key: "powerHierarchy", label: "Power Hierarchy" },
      { key: "writtenUnwrittenRules", label: "Written / Unwritten Rules" },
      { key: "territorialBoundaries", label: "Territorial Boundaries" },
      { key: "newcomerTreatment", label: "Newcomer Treatment" },
      { key: "accessControl", label: "Access Control" },
    ],
  },
  {
    num: 7,
    title: "Narrative Function & Conflict",
    fields: [
      { key: "storyEventsHere", label: "Story Events Here" },
      { key: "secrets", label: "Secrets" },
      { key: "builtInDangers", label: "Built-In Dangers" },
      { key: "escapeRoutesTraps", label: "Escape Routes / Traps" },
      { key: "characterConstraints", label: "Character Constraints" },
    ],
  },
  {
    num: 8,
    title: "Location Arc",
    fields: [
      { key: "stateAtOpening", label: "State at Opening" },
      { key: "stateAtClimax", label: "State at Climax" },
      { key: "stateAtResolution", label: "State at Resolution" },
      { key: "transformationCause", label: "Transformation Cause" },
      { key: "transformationStatement", label: "Transformation Statement" },
    ],
  },
  {
    num: 9,
    title: "Theme & Symbolism",
    fields: [
      { key: "thematicRepresentation", label: "Thematic Representation" },
      { key: "recurringMotifs", label: "Recurring Motifs" },
      { key: "symbolicObjects", label: "Symbolic Objects" },
      { key: "colorWeatherAssociations", label: "Color / Weather Associations" },
      { key: "characterMirror", label: "Character Mirror" },
    ],
  },
  {
    num: 10,
    title: "Technical & Production Notes",
    fields: [
      { key: "keyProps", label: "Key Props" },
      { key: "practicalConsiderations", label: "Practical Considerations" },
      { key: "realWorldReferences", label: "Real-World References" },
      { key: "cameraAngleSuggestions", label: "Camera Angle Suggestions" },
      { key: "vfxNotes", label: "VFX Notes" },
    ],
  },
];

// Colors for avatar initials based on importance
const IMPORTANCE_COLORS: Record<string, { bg: string; text: string }> = {
  major: { bg: "bg-primary", text: "text-primary-foreground" },
  minor: { bg: "bg-amber-400/20", text: "text-amber-300" },
  background: { bg: "bg-muted", text: "text-muted-foreground" },
};

interface DevelopedItem {
  profile: LocationProfile;
  visualImages: Record<string, string>;
  visualImageHistory?: Record<string, string[]>;
  imageLocks?: Record<string, boolean>;
  editedFields?: Record<string, boolean>;
}

type AuthScreen = "login" | "register" | "forgot" | "reset";
type AppScreen = "auth" | "projects" | "account" | "app";

interface ProjectListItem {
  id: number;
  name: string;
  locationCount: number;
  developedCount: number;
  createdAt: string;
  updatedAt: string;
}

interface SubscriptionStatus {
  status: string;
  plan: string | null;
  trialDaysRemaining: number;
  trialActive: boolean;
  subscriptionActive: boolean;
  isAdmin: boolean;
  canAccess: boolean;
  expiresAt: string | null;
}

export default function HomePage() {
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();

  // ── Auth State ──
  const [appScreen, setAppScreen] = useState<AppScreen>("auth");
  const [authScreen, setAuthScreen] = useState<AuthScreen>("login");
  const [authLoading, setAuthLoading] = useState(true);
  const [authUser, setAuthUser] = useState<{ id: number; email: string; displayName: string } | null>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authDisplayName, setAuthDisplayName] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetMessage, setResetMessage] = useState("");

  // ── Project State ──
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<number | null>(null);
  const [currentProjectName, setCurrentProjectName] = useState("");
  const [showDashboardMenu, setShowDashboardMenu] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [renamingProjectId, setRenamingProjectId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // ── Cross-App Import State ──
  const [sfImportOpen, setSfImportOpen] = useState(false);
  const [sfProjects, setSfProjects] = useState<Array<{ id: number; name: string }>>([]);
  const [sfProjectsLoading, setSfProjectsLoading] = useState(false);
  const [sfSelectedProject, setSfSelectedProject] = useState<string | null>(null);
  const [sfChapters, setSfChapters] = useState<Array<{ title: string; text?: string; content?: string; wordCount?: number }>>([]);
  const [sfChaptersLoading, setSfChaptersLoading] = useState(false);
  const [sfSelectedChapters, setSfSelectedChapters] = useState<Set<number>>(new Set());
  const [sfImporting, setSfImporting] = useState(false);

  const [mfImportOpen, setMfImportOpen] = useState(false);
  const [mfProjects, setMfProjects] = useState<Array<{ id: number; name: string }>>([]);
  const [mfProjectsLoading, setMfProjectsLoading] = useState(false);
  const [mfSelectedProject, setMfSelectedProject] = useState<string | null>(null);
  const [mfChapters, setMfChapters] = useState<Array<{ title: string; text?: string; content?: string; wordCount?: number }>>([]);
  const [mfChaptersLoading, setMfChaptersLoading] = useState(false);
  const [mfSelectedChapters, setMfSelectedChapters] = useState<Set<number>>(new Set());
  const [mfImporting, setMfImporting] = useState(false);

  // ── Subscription State ──
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);

  // ── Location Forge Pipeline State ──
  const [lfPipelineOpen, setLfPipelineOpen] = useState(false);
  const [lfStoryJson, setLfStoryJson] = useState("");
  const [lfBusy, setLfBusy] = useState<string | null>(null);
  const [lfCandidates, setLfCandidates] = useState<any[]>([]);
  const [lfCompareResult, setLfCompareResult] = useState<any>(null);
  const [lfFilterStatus, setLfFilterStatus] = useState<string>("");

  // ── In-Project Story Forge Import State (used on Build Location Profiles screen) ──
  const [inProjSfMode, setInProjSfMode] = useState<"closed" | "chapters" | "json">("closed");
  const [inProjSfProjects, setInProjSfProjects] = useState<Array<{ id: number; name: string }>>([]);
  const [inProjSfProjectsLoading, setInProjSfProjectsLoading] = useState(false);
  const [inProjSfSelectedProject, setInProjSfSelectedProject] = useState<string | null>(null);
  const [inProjSfChapters, setInProjSfChapters] = useState<Array<{ title: string; text?: string; content?: string; wordCount?: number }>>([]);
  const [inProjSfChaptersLoading, setInProjSfChaptersLoading] = useState(false);
  const [inProjSfSelectedChapters, setInProjSfSelectedChapters] = useState<Set<number>>(new Set());
  const [inProjSfImporting, setInProjSfImporting] = useState(false);
  const [inProjSfJson, setInProjSfJson] = useState("");
  const [inProjSfJsonImporting, setInProjSfJsonImporting] = useState(false);

  // Auto-save timer ref
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // State
  const [step, setStep] = useState<Step>("upload");
  const [sourceText, setSourceText] = useState("");
  const [sourceType, setSourceType] = useState<"description" | "story">("story");
  const [provider, setProvider] = useState<"openai" | "anthropic" | "google">("openai");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [detectedLocations, setDetectedLocations] = useState<DetectedLocation[]>([]);

  // Multi-panel state
  const [developedItems, setDevelopedItems] = useState<Record<string, DevelopedItem>>({});
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [developingLocation, setDevelopingLocation] = useState<string | null>(null);
  const [isDevelopingAll, setIsDevelopingAll] = useState(false);

  const [generatingLayer, setGeneratingLayer] = useState<string | null>(null);
  const [artStyle, setArtStyle] = useState("cinematic");
  const [customStylePrompt, setCustomStylePrompt] = useState("");
  const [customStyleInput, setCustomStyleInput] = useState("");
  const [generatingStyle, setGeneratingStyle] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null);
  const [showPromptDialog, setShowPromptDialog] = useState<{ layerKey: string; title: string; prompt: string } | null>(null);
  const [previewImage, setPreviewImage] = useState<{ layerKey: string; title: string; subtitle: string; category: string; image: string; description: string; locked: boolean } | null>(null);
  const [userReferenceImages, setUserReferenceImages] = useState<string[]>([]);
  const [customPrompt, setCustomPrompt] = useState("");
  // ── Art Studio state ──
  const [artStudioTab, setArtStudioTab] = useState<"studio" | "gallery" | "batch" | "scene">("studio");
  const [batchSelectedLocations, setBatchSelectedLocations] = useState<string[]>([]);
  const [batchCategory, setBatchCategory] = useState<string>("camera");
  const [batchProgress, setBatchProgress] = useState(0);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  // Throttle / queue state. Conservative default matches DALL-E Tier 1 (5 img/min → 12s).
  // Gemini image preview is also rate-limited; 12s keeps well under per-minute caps.
  const [batchDelaySec, setBatchDelaySec] = useState(12);
  const [batchCurrentLabel, setBatchCurrentLabel] = useState<string>("");
  const [batchStatusByKey, setBatchStatusByKey] = useState<
    Record<string, "queued" | "generating" | "waiting" | "retrying" | "done" | "skipped" | "failed">
  >({});
  const batchCancelRef = useRef(false);
  const [scenePromptInput, setScenePromptInput] = useState("");
  const [galleryLightbox, setGalleryLightbox] = useState<{ locationName: string; layerKey: string; layerTitle: string; subtitle: string; image: string } | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingAll, setIsExportingAll] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStage, setAnalysisStage] = useState("");
  const [activeSection, setActiveSection] = useState("1");
  const [visualTab, setVisualTab] = useState("camera");

  // Dashboard filters
  const [filterImportance, setFilterImportance] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"importance" | "name">("importance");

  // Support section state
  const [supportTab, setSupportTab] = useState<"ai" | "email" | "tickets">("email");
  const [supportQuestion, setSupportQuestion] = useState("");
  const [askingSupport, setAskingSupport] = useState(false);
  const [supportCategory, setSupportCategory] = useState("general");
  const [supportSubject, setSupportSubject] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [chatHistory, setChatHistory] = useState<Array<{role: "user" | "ai", text: string}>>([]);

  // ── AI Enhance State ──
  const [enhancingFields, setEnhancingFields] = useState<Set<string>>(new Set());
  const [enhancedFields, setEnhancedFields] = useState<Set<string>>(new Set());
  const [enhanceAllProgress, setEnhanceAllProgress] = useState<{ current: number; total: number } | null>(null);

  // ── Manual Field Edit State (Location Profile sections) ──
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  const currentProvider = PROVIDERS.find((p) => p.id === provider)!;

  // The current expanded item's profile and visual images
  const currentProfile = expandedItem ? developedItems[expandedItem]?.profile ?? null : null;
  const currentVisualImages = expandedItem ? developedItems[expandedItem]?.visualImages ?? {} : {};
  const selectedLocation = expandedItem || "";

  // Discard any in-progress inline edit when the user switches locations
  useEffect(() => {
    setEditingField(null);
    setEditDraft("");
  }, [expandedItem]);

  // Visual study layer definitions — organized by production category
  const VISUAL_LAYERS = [
    // ── Tab 1: Camera Shots ──
    { key: "establishing", title: "Establishing Shot", subtitle: "Camera Shots", category: "camera", isCore: true, profileKey: "visualEstablishing" as keyof LocationProfile, description: "Extreme wide shot, full environment context, hero composition showing the complete location. Single continuous frame." },
    { key: "wideShot", title: "Wide Shot", subtitle: "Camera Shots", category: "camera", isCore: true, profileKey: "" as keyof LocationProfile, description: "Full wide angle showing the entire location with environmental context. Single continuous frame, eye level." },
    { key: "mediumShot", title: "Medium Shot", subtitle: "Camera Shots", category: "camera", isCore: true, profileKey: "" as keyof LocationProfile, description: "Mid-range framing isolating the key architectural or spatial feature. Single frame, standard lens perspective." },
    { key: "closeUp", title: "Close-Up", subtitle: "Camera Shots", category: "camera", isCore: true, profileKey: "" as keyof LocationProfile, description: "Extreme close-up of one defining detail: a surface texture, a door handle, an inscription, weathering pattern. Macro photography perspective. Single tight frame." },
    { key: "overTheShoulder", title: "Over-the-Shoulder POV", subtitle: "Camera Shots", category: "camera", isCore: true, profileKey: "" as keyof LocationProfile, description: "Camera positioned behind and slightly above a character's shoulder entering or observing this location. Single frame, shallow depth of field on the location." },
    { key: "lowAngle", title: "Low Angle (Worm's Eye)", subtitle: "Camera Shots", category: "camera", isCore: true, profileKey: "" as keyof LocationProfile, description: "Camera near ground level looking up, emphasizing the height, power, and scale of the location. Single dramatic frame." },
    { key: "highAngle", title: "High Angle (Bird's Eye)", subtitle: "Camera Shots", category: "camera", isCore: true, profileKey: "" as keyof LocationProfile, description: "Camera positioned high above looking down at the location layout, showing spatial relationships, pathways, and ground patterns. Single overhead frame." },
    { key: "dutchAngle", title: "Dutch Angle", subtitle: "Camera Shots", category: "camera", isCore: true, profileKey: "" as keyof LocationProfile, description: "Tilted camera angle creating unease and tension, showing the location at a dramatic diagonal. Single canted frame." },

    // ── Tab 2: Lighting & Time ──
    { key: "goldenHour", title: "Golden Hour", subtitle: "Lighting & Time", category: "lighting", isCore: true, profileKey: "visualLighting" as keyof LocationProfile, description: "Early morning or late afternoon warm golden light, long shadows, rich amber tones. Single frame." },
    { key: "blueHour", title: "Blue Hour", subtitle: "Lighting & Time", category: "lighting", isCore: true, profileKey: "" as keyof LocationProfile, description: "Twilight, cool blue ambient light before sunrise or after sunset. Single frame." },
    { key: "midday", title: "Harsh Midday", subtitle: "Lighting & Time", category: "lighting", isCore: true, profileKey: "" as keyof LocationProfile, description: "Direct overhead sun, hard shadows, high contrast, bleached highlights. Single frame." },
    { key: "night", title: "Night", subtitle: "Lighting & Time", category: "lighting", isCore: true, profileKey: "" as keyof LocationProfile, description: "Nighttime with available light only: moonlight, streetlamps, neon, firelight. Single frame." },
    { key: "backlit", title: "Backlit / Silhouette", subtitle: "Lighting & Time", category: "lighting", isCore: true, profileKey: "" as keyof LocationProfile, description: "Strong light source behind the main subject of the location creating rim lighting and silhouette. Single frame." },
    { key: "practicalLighting", title: "Practical Lighting Only", subtitle: "Lighting & Time", category: "lighting", isCore: true, profileKey: "" as keyof LocationProfile, description: "Lit solely by in-scene sources: candles, screens, dashboard lights, fire. No sunlight. Single frame." },

    // ── Tab 3: Weather & Atmosphere ──
    { key: "clearDay", title: "Clear Day", subtitle: "Weather & Atmosphere", category: "weather", isCore: false, profileKey: "" as keyof LocationProfile, description: "Bright sunshine, blue sky, crisp visibility, clean atmosphere. Single frame." },
    { key: "overcast", title: "Overcast / Flat Light", subtitle: "Weather & Atmosphere", category: "weather", isCore: false, profileKey: "" as keyof LocationProfile, description: "Heavy cloud cover, diffused shadowless light, muted desaturated palette. Single frame." },
    { key: "rain", title: "Rain", subtitle: "Weather & Atmosphere", category: "weather", isCore: false, profileKey: "" as keyof LocationProfile, description: "Active rainfall, wet reflective surfaces, puddles, streaked windows, grey sky. Single frame." },
    { key: "fog", title: "Fog / Mist", subtitle: "Weather & Atmosphere", category: "weather", isCore: false, profileKey: "" as keyof LocationProfile, description: "Dense atmospheric haze, reduced visibility, silhouetted shapes emerging from mist. Single frame." },
    { key: "storm", title: "Storm", subtitle: "Weather & Atmosphere", category: "weather", isCore: false, profileKey: "" as keyof LocationProfile, description: "Dramatic storm: dark roiling clouds, lightning, violent wind, debris. Single frame." },
    { key: "snow", title: "Snow", subtitle: "Weather & Atmosphere", category: "weather", isCore: false, profileKey: "" as keyof LocationProfile, description: "Snow covering the location, muted white palette, cold blue shadows, visible breath. Single frame." },

    // ── Tab 4: Production Design ──
    { key: "architectural", title: "Architectural Detail", subtitle: "Production Design", category: "production", isCore: false, profileKey: "visualArchitectural" as keyof LocationProfile, description: "Close study of ONE key architectural element: a doorway, window, column, beam, wall joint. Construction materials and craftsmanship visible. Single tight frame." },
    { key: "interiorFocal", title: "Interior Focal Point", subtitle: "Production Design", category: "production", isCore: false, profileKey: "visualInterior" as keyof LocationProfile, description: "The single most important interior space or room, showing furniture, props, and spatial depth. Single frame." },
    { key: "entryApproach", title: "Entry / Approach", subtitle: "Production Design", category: "production", isCore: false, profileKey: "" as keyof LocationProfile, description: "How a character first sees and approaches this location. The arrival perspective. Single frame." },
    { key: "keyProp", title: "Key Prop in Situ", subtitle: "Production Design", category: "production", isCore: false, profileKey: "" as keyof LocationProfile, description: "The single most narratively important object or prop shown in its natural position within the location. Single frame." },
    { key: "signageMarkings", title: "Signage & Markings", subtitle: "Production Design", category: "production", isCore: false, profileKey: "" as keyof LocationProfile, description: "Close-up of any signs, symbols, graffiti, labels, addresses, or identifying marks on the location. Single frame." },
    { key: "floorplan", title: "Overhead Layout", subtitle: "Production Design", category: "production", isCore: false, profileKey: "" as keyof LocationProfile, description: "Bird's-eye architectural layout view showing room arrangement, corridors, doors, and spatial flow. Single frame." },

    // ── Tab 5: Mood & Narrative ──
    { key: "empty", title: "Empty / Abandoned", subtitle: "Mood & Narrative", category: "mood", isCore: false, profileKey: "visualStorytelling" as keyof LocationProfile, description: "The location completely devoid of people, emphasizing loneliness, silence, and the space itself. Single frame." },
    { key: "populated", title: "Populated / Active", subtitle: "Mood & Narrative", category: "mood", isCore: false, profileKey: "" as keyof LocationProfile, description: "The location alive with activity, people, movement, noise, energy. Single frame." },
    { key: "aftermath", title: "Aftermath", subtitle: "Mood & Narrative", category: "mood", isCore: false, profileKey: "" as keyof LocationProfile, description: "The location after a significant event: damage, debris, overturned objects, scorch marks, flooding. Single frame." },
    { key: "hidden", title: "Hidden Area / Secret", subtitle: "Mood & Narrative", category: "mood", isCore: false, profileKey: "" as keyof LocationProfile, description: "A concealed or restricted part of the location: behind a wall panel, under the floor, inside a vent. Single frame." },
    { key: "dangerZone", title: "Danger Zone", subtitle: "Mood & Narrative", category: "mood", isCore: false, profileKey: "" as keyof LocationProfile, description: "The most dangerous area: structural damage, toxic spill, exposed wiring, unstable ground. Single frame." },
    { key: "safeHaven", title: "Safe Haven", subtitle: "Mood & Narrative", category: "mood", isCore: false, profileKey: "" as keyof LocationProfile, description: "The safest, most protected area: a locked room, a bunker, a warm corner. Single frame." },

    // ── Tab 6: Director's Vision ──
    { key: "custom", title: "Director Shot", subtitle: "Director's Vision", category: "director", isCore: false, profileKey: "visualCustom" as keyof LocationProfile, description: "Custom scene — any angle, time, weather, event (text input)" },
    { key: "emergency", title: "Emergency Condition", subtitle: "Director's Vision", category: "director", isCore: false, profileKey: "" as keyof LocationProfile, description: "Red alert: emergency lighting, alarms blaring, flashing strobes, evacuation signs illuminated. Single frame." },
    { key: "powerFailure", title: "Power Failure", subtitle: "Director's Vision", category: "director", isCore: false, profileKey: "" as keyof LocationProfile, description: "Complete darkness except emergency backup: battery LED strips, phone flashlights, sparking wires. Single frame." },
    { key: "decayed", title: "Decades Later", subtitle: "Director's Vision", category: "director", isCore: false, profileKey: "" as keyof LocationProfile, description: "This same location decades into the future: overgrown, crumbling, nature reclaiming, dust and rust. Single frame." },
  ];

  const PANEL_CATEGORIES = [
    { id: "camera", label: "Camera Shots", Icon: Camera },
    { id: "lighting", label: "Lighting & Time", Icon: Sun },
    { id: "weather", label: "Weather & Atmosphere", Icon: Cloud },
    { id: "production", label: "Production Design", Icon: Ruler },
    { id: "mood", label: "Mood & Narrative", Icon: Heart },
    { id: "director", label: "Director's Vision", Icon: Clapperboard },
  ];

  // Handle file upload (DOCX or TXT)
  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.name.endsWith(".txt")) {
        const text = await file.text();
        setSourceText(text);
        toast({ title: "File loaded", description: `${file.name} (${text.length.toLocaleString()} characters)` });
      } else if (file.name.endsWith(".docx")) {
        try {
          const mammoth = await import("mammoth");
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer });
          setSourceText(result.value);
          toast({ title: "File loaded", description: `${file.name} (${result.value.length.toLocaleString()} characters)` });
        } catch {
          toast({ title: "Error", description: "Could not read .docx file. Try pasting the text instead.", variant: "destructive" });
        }
      } else {
        toast({ title: "Unsupported format", description: "Please upload a .txt or .docx file.", variant: "destructive" });
      }
    },
    [toast]
  );

  // Step 1: Scan for locations
  const handleScan = async () => {
    // Demo mode
    if (demoMode) {
      setIsScanning(true);
      await new Promise((r) => setTimeout(r, 800));
      setDetectedLocations(DEMO_LOCATIONS);
      setDevelopedItems({});
      setExpandedItem(null);
      setStep("dashboard");
      setIsScanning(false);
      return;
    }

    if (!sourceText || sourceText.length < 50) {
      toast({ title: "Not enough text", description: "Please provide at least 50 characters.", variant: "destructive" });
      return;
    }
    if (!apiKey) {
      toast({ title: "API key required", description: "Enter your API key to continue.", variant: "destructive" });
      return;
    }

    setIsScanning(true);
    try {
      const res = await apiRequest("POST", "/api/scan", {
        text: sourceText,
        sourceType,
        provider,
        apiKey,
      });
      const data = await res.json();

      if (data.error) throw new Error(data.error);

      setDetectedLocations(data.locations);
      setDevelopedItems({});
      setExpandedItem(null);

      if (data.locations.length > 0) {
        setStep("dashboard");
      } else {
        toast({ title: "No locations found", description: "Try adding more text or detail.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Scan failed", description: err.message, variant: "destructive" });
    } finally {
      setIsScanning(false);
    }
  };

  // Step 2: Full analysis — now stores into developedItems
  const runAnalysis = async (locationName: string): Promise<boolean> => {
    // Demo mode
    if (demoMode) {
      setDevelopingLocation(locationName);
      setStep("analyzing");
      setIsAnalyzing(true);
      setAnalysisProgress(0);
      const demoStages = [
        { pct: 15, label: "Reading source text..." },
        { pct: 35, label: "Mapping geography & layout..." },
        { pct: 55, label: "Analyzing sensory profile..." },
        { pct: 75, label: "Building location arc..." },
        { pct: 90, label: "Generating theme & production notes..." },
        { pct: 100, label: "Done." },
      ];
      for (const stage of demoStages) {
        await new Promise((r) => setTimeout(r, 600));
        setAnalysisProgress(stage.pct);
        setAnalysisStage(stage.label);
      }
      setDevelopedItems((prev) => {
        const existing = prev[locationName];
        const edited = existing?.editedFields || {};
        const mergedProfile: LocationProfile = { ...DEMO_PROFILE };
        if (existing?.profile) {
          for (const k of Object.keys(edited)) {
            if (edited[k]) (mergedProfile as any)[k] = (existing.profile as any)[k];
          }
        }
        return {
          ...prev,
          [locationName]: {
            profile: mergedProfile,
            visualImages: existing?.visualImages || {},
            visualImageHistory: existing?.visualImageHistory || {},
            imageLocks: existing?.imageLocks,
            editedFields: edited,
          },
        };
      });
      setIsAnalyzing(false);
      setDevelopingLocation(null);
      setStep("dashboard");
      return true;
    }

    setDevelopingLocation(locationName);
    setStep("analyzing");
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    setAnalysisStage("Analyzing location...");

    const stages = [
      { pct: 10, label: "Reading source text..." },
      { pct: 25, label: "Mapping geography & layout..." },
      { pct: 40, label: "Analyzing history & timeline..." },
      { pct: 55, label: "Building sensory profile..." },
      { pct: 70, label: "Extracting mood & atmosphere..." },
      { pct: 80, label: "Constructing location arc..." },
      { pct: 90, label: "Generating theme & production notes..." },
    ];

    let stageIdx = 0;
    const progressInterval = setInterval(() => {
      if (stageIdx < stages.length) {
        setAnalysisProgress(stages[stageIdx].pct);
        setAnalysisStage(stages[stageIdx].label);
        stageIdx++;
      }
    }, 2500);

    try {
      const res = await apiRequest("POST", "/api/analyze", {
        text: sourceText,
        sourceType,
        provider,
        apiKey,
        locationName,
      });
      const data = await res.json();

      if (data.error) throw new Error(data.error);

      clearInterval(progressInterval);
      setAnalysisProgress(100);
      setAnalysisStage("Profile complete.");

      setDevelopedItems((prev) => {
        const existing = prev[locationName];
        const edited = existing?.editedFields || {};
        const mergedProfile: LocationProfile = { ...data.profile };
        if (existing?.profile) {
          for (const k of Object.keys(edited)) {
            if (edited[k]) (mergedProfile as any)[k] = (existing.profile as any)[k];
          }
        }
        return {
          ...prev,
          [locationName]: {
            profile: mergedProfile,
            visualImages: existing?.visualImages || {},
            visualImageHistory: existing?.visualImageHistory || {},
            imageLocks: existing?.imageLocks,
            editedFields: edited,
          },
        };
      });
      setStep("dashboard");
      return true;
    } catch (err: any) {
      clearInterval(progressInterval);
      toast({ title: "Analysis failed", description: err.message, variant: "destructive" });
      setStep("dashboard");
      return false;
    } finally {
      setIsAnalyzing(false);
      setDevelopingLocation(null);
    }
  };

  // Develop a single location from the dashboard
  const handleDevelop = async (name: string) => {
    await runAnalysis(name);
  };

  // Develop all undeveloped locations sequentially
  const handleDevelopAll = async () => {
    setIsDevelopingAll(true);
    const undeveloped = detectedLocations.filter((loc) => !developedItems[loc.name]);
    for (const loc of undeveloped) {
      const success = await runAnalysis(loc.name);
      if (!success) break;
    }
    setIsDevelopingAll(false);
  };

  // View a developed location
  const handleView = (name: string) => {
    setExpandedItem(name);
    setActiveSection("1");
    setStep("results");
  };

  // Back to dashboard from results
  const handleBackToDashboard = () => {
    setExpandedItem(null);
    setStep("dashboard");
  };

  // Export single DOCX
  const handleExport = async () => {
    if (!currentProfile || !expandedItem) return;
    setIsExporting(true);

    try {
      const res = await apiRequest("POST", "/api/export-docx", {
        profile: currentProfile,
        images: currentVisualImages,
      });

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${expandedItem || "Location"}_Profile.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ title: "Exported", description: "DOCX downloaded successfully." });
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  // Export All Developed as combined DOCX
  const handleExportAll = async () => {
    const devEntries = Object.entries(developedItems);
    if (devEntries.length === 0) return;
    setIsExportingAll(true);

    try {
      const items = devEntries.map(([name, item]) => ({
        name,
        profile: item.profile,
        images: item.visualImages,
      }));

      const res = await apiRequest("POST", "/api/export-all-docx", { items });

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "All_Location_Profiles.docx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ title: "Exported", description: `Combined DOCX with ${devEntries.length} locations downloaded.` });
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    } finally {
      setIsExportingAll(false);
    }
  };

  // Get the current style prompt text
  const currentStylePrompt = artStyle === "custom"
    ? customStylePrompt
    : (ART_STYLES.find((s) => s.id === artStyle)?.prompt || "");

  // Generate custom style prompt via AI
  const handleGenerateStylePrompt = async () => {
    if (!customStyleInput.trim()) return;
    setGeneratingStyle(true);
    try {
      const res = await apiRequest("POST", "/api/generate-style-prompt", {
        description: customStyleInput.trim(),
        provider: provider === "anthropic" ? "google" : provider,
        apiKey,
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.prompt) {
        setCustomStylePrompt(data.prompt);
        toast({ title: "Style generated", description: "Custom style directive created from your description." });
      }
    } catch (err: any) {
      toast({ title: "Style generation failed", description: err.message, variant: "destructive" });
    } finally {
      setGeneratingStyle(false);
    }
  };

  // ── Image Lock helpers ──
  // A locked image is protected from regeneration, upload-replacement, and batch
  // "Generate Tab"/"Generate All" actions. View / download / copy-prompt remain available.
  const isLayerLocked = (layerKey: string): boolean => {
    if (!expandedItem) return false;
    return !!developedItems[expandedItem]?.imageLocks?.[layerKey];
  };

  const toggleLayerLock = (layerKey: string) => {
    if (!expandedItem) return;
    setDevelopedItems((prev) => {
      const item = prev[expandedItem];
      if (!item) return prev;
      const currentLocks = item.imageLocks || {};
      const nextLocked = !currentLocks[layerKey];
      const nextLocks = { ...currentLocks, [layerKey]: nextLocked };
      if (!nextLocked) delete nextLocks[layerKey];
      return {
        ...prev,
        [expandedItem]: { ...item, imageLocks: nextLocks },
      };
    });
    toast({
      title: isLayerLocked(layerKey) ? "Image unlocked" : "Image locked",
      description: isLayerLocked(layerKey)
        ? "This image can now be regenerated or replaced."
        : "This image is protected from regeneration and batch actions.",
    });
  };

  // Show prompt for Midjourney
  // Note: prompt passed here already includes style lock from buildLayerPrompt
  const handleCopyPrompt = (layerKey: string, layerTitle: string, prompt: string) => {
    setShowPromptDialog({ layerKey, title: layerTitle, prompt: prompt || "(No prompt — generate a profile first)" });
  };

  // Download a single image
  const handleDownloadImage = (layerKey: string, layerTitle: string) => {
    const b64 = currentVisualImages[layerKey];
    if (!b64) return;
    const link = document.createElement("a");
    link.href = `data:image/png;base64,${b64}`;
    link.download = `${selectedLocation || "Location"}_${layerTitle.replace(/\s+/g, "_")}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Upload an external image into a panel (from Midjourney, etc.)
  const handleUploadPanelImage = (layerKey: string, file: File) => {
    if (!file.type.startsWith("image/") || !expandedItem) return;
    if (isLayerLocked(layerKey)) {
      toast({ title: "Image locked", description: "Unlock this image before uploading a replacement.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      if (!base64) return;
      setDevelopedItems(prev => {
        const item = prev[expandedItem];
        if (!item) return prev;
        // Preserve old image in history
        const oldImage = item.visualImages[layerKey];
        const existingHistory = item.visualImageHistory?.[layerKey] || [];
        const updatedHistory = oldImage ? [oldImage, ...existingHistory].slice(0, 10) : existingHistory;
        return {
          ...prev,
          [expandedItem]: {
            ...item,
            visualImages: { ...item.visualImages, [layerKey]: base64 },
            visualImageHistory: {
              ...(item.visualImageHistory || {}),
              [layerKey]: updatedHistory,
            },
          },
        };
      });
      toast({ title: "Image uploaded", description: `${file.name} set as ${layerKey} panel.` });
    };
    reader.readAsDataURL(file);
  };

  // Download all images as ZIP
  const handleDownloadAllImages = async () => {
    const entries = Object.entries(currentVisualImages);
    if (entries.length === 0) return;
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    const locName = selectedLocation || "Location";
    for (const [key, b64] of entries) {
      const layer = VISUAL_LAYERS.find((l) => l.key === key);
      const fileName = `${locName}_${layer?.title || key}.png`.replace(/\s+/g, "_");
      zip.file(fileName, b64, { base64: true });
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${locName}_Visual_Study.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Handle reference image uploads (up to 6)
  const handleReferenceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const remaining = 6 - userReferenceImages.length;
    const toProcess = Array.from(files).slice(0, remaining);
    
    for (const file of toProcess) {
      if (!file.type.startsWith("image/")) continue;
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        if (base64) {
          setUserReferenceImages((prev) => {
            if (prev.length >= 6) return prev;
            return [...prev, base64];
          });
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  const removeReferenceImage = (index: number) => {
    setUserReferenceImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Build the reference images array for a generation call
  const buildReferenceArray = (anchorImage?: string): string[] => {
    const refs: string[] = [];
    refs.push(...userReferenceImages);
    if (anchorImage) refs.push(anchorImage);
    return refs;
  };

  // Rate-limit delay helper
  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

  // Generate a single visual layer — now updates developedItems
  const handleGenerateVisual = async (layerKey: string, prompt: string, anchorOverride?: string) => {
    if (!prompt || !expandedItem) {
      if (!prompt) toast({ title: "No prompt", description: "This layer has no visual prompt.", variant: "destructive" });
      return;
    }
    if (isLayerLocked(layerKey)) {
      toast({ title: "Image locked", description: "Unlock this image before regenerating.", variant: "destructive" });
      return;
    }
    setGeneratingLayer(layerKey);
    try {
      const imgProvider = provider === "anthropic" ? "openai" : provider;
      const anchor = anchorOverride || (layerKey !== "establishing" ? currentVisualImages["establishing"] : undefined);
      const refs = buildReferenceArray(anchor);
      
      const imgRes = await apiRequest("POST", "/api/generate-image", {
        prompt,
        style: currentStylePrompt,
        referenceImages: refs.length > 0 ? refs : undefined,
        provider: imgProvider,
        apiKey,
      });
      const imgData = await imgRes.json();
      if (imgData.error) throw new Error(imgData.error);
      if (imgData.image) {
        setDevelopedItems((prev) => {
          // Preserve old image in history before replacing
          const oldImage = prev[expandedItem].visualImages[layerKey];
          const existingHistory = prev[expandedItem].visualImageHistory?.[layerKey] || [];
          const updatedHistory = oldImage ? [oldImage, ...existingHistory].slice(0, 10) : existingHistory; // Keep max 10 versions
          return {
            ...prev,
            [expandedItem]: {
              ...prev[expandedItem],
              visualImages: { ...prev[expandedItem].visualImages, [layerKey]: imgData.image },
              visualImageHistory: {
                ...(prev[expandedItem].visualImageHistory || {}),
                [layerKey]: updatedHistory,
              },
            },
          };
        });
        toast({ title: `${layerKey === "establishing" ? "Anchor image" : "Image"} generated` });
        return imgData.image as string;
      }
    } catch (err: any) {
      const msg = err.message || "Unknown error";
      let friendlyMsg = msg;
      if (msg.includes("429") || msg.includes("rate limit") || msg.includes("Rate limit")) {
        friendlyMsg = "Rate limit reached — waiting a moment before retrying. Try generating one image at a time.";
      } else if (msg.includes("503") || msg.includes("busy") || msg.includes("overload")) {
        friendlyMsg = "AI service is temporarily busy. Please wait a few seconds and try again.";
      } else if (msg.includes("422") || msg.includes("declined") || msg.includes("content")) {
        friendlyMsg = "Image was declined by the AI — try a different art style or simplify the description.";
      } else if (msg.includes("502")) {
        friendlyMsg = "Server is restarting. Please wait 30 seconds and try again.";
      }
      toast({ title: "Image generation failed", description: friendlyMsg, variant: "destructive" });
    } finally {
      setGeneratingLayer(null);
    }
    return undefined;
  };

  // Build a prompt for a visual layer, using profile data or description
  const buildLayerPrompt = (layer: typeof VISUAL_LAYERS[number], profile: LocationProfile): string => {
    const name = expandedItem || "the location";
    const layoutDesc = (profile.layoutDescription || "").substring(0, 300);
    const climate = profile.climate || "";
    const terrain = profile.terrain || "";
    const mood = (profile as any).defaultEmotionalTone || "";

    // Custom layer uses the user's typed customPrompt
    if (layer.key === "custom") {
      if (!customPrompt) return "";
      const ctxBase = `Same location (${name}): ${customPrompt}`;
      return `CRITICAL: Generate exactly ONE single image. ONE location. ONE viewpoint. This is NOT a collage, NOT a grid, NOT multiple panels, NOT side-by-side. Just ONE standalone image filling the entire frame. ${currentStylePrompt}. ${ctxBase}`;
    }

    // Always use the panel's own description as the primary prompt.
    // Profile data is appended as context only — never as the main directive,
    // because profile visual fields often describe multi-condition studies that cause composite images.
    const basePrompt = layer.description;
    
    let locationContext = `Location: ${name}`;
    if (layoutDesc) locationContext += `. ${layoutDesc}`;
    if (climate && climate !== "—") locationContext += `. Climate: ${climate}`;
    if (terrain && terrain !== "—") locationContext += `. Terrain: ${terrain}`;
    if (mood && mood !== "—") locationContext += `. Mood: ${mood}`;
    
    return `CRITICAL: Generate exactly ONE single image. ONE location. ONE viewpoint. This is NOT a collage, NOT a grid, NOT multiple panels, NOT side-by-side. Just ONE standalone image filling the entire frame. ${currentStylePrompt}. ${locationContext}. ${basePrompt}`;
  };

  // Generate all layers in the current visual tab sequentially with rate-limit delays
  const handleGenerateAll = async () => {
    if (!currentProfile || !expandedItem) return;
    const tabLayers = VISUAL_LAYERS.filter(l => l.category === visualTab && l.key !== "custom");
    
    // Step 1: Use or generate the establishing shot (anchor) first if not present
    let anchorImage = currentVisualImages["establishing"];
    if (!anchorImage) {
      const establishingLayer = VISUAL_LAYERS.find(l => l.key === "establishing");
      if (establishingLayer) {
        const prompt = buildLayerPrompt(establishingLayer, currentProfile);
        anchorImage = await handleGenerateVisual("establishing", prompt) || undefined;
        await delay(12000);
      }
    }
    
    // Step 2: Generate layers in current tab
    for (let i = 0; i < tabLayers.length; i++) {
      const layer = tabLayers[i];
      if (layer.key === "establishing" && anchorImage) continue;
      if (currentVisualImages[layer.key]) continue;
      if (isLayerLocked(layer.key)) continue; // locked images are protected from batch actions
      const prompt = buildLayerPrompt(layer, currentProfile);
      if (!prompt) continue;
      await handleGenerateVisual(layer.key, prompt, anchorImage);
      if (i < tabLayers.length - 1) {
        await delay(12000);
      }
    }
  };

  // Throttled, single-concurrency batch generator.
  // - Sequential (max concurrency 1)
  // - Configurable inter-request delay, default 12s
  // - 429/503 → wait 60s and retry (max 2 retries)
  // - Skips locked images; persists each image as it completes so partial progress survives
  // - Writes directly to developedItems[locName] instead of relying on expandedItem closure
  const runBatch = async (
    targets: string[],
    catLayers: typeof VISUAL_LAYERS,
    category: string
  ) => {
    const delayMs = Math.max(0, Math.round(batchDelaySec * 1000));
    const BACKOFF_MS = 60_000;
    const MAX_RETRIES = 2;
    const statusKey = (loc: string, k: string) => `${loc}||${k}`;
    const setStatus = (
      loc: string,
      k: string,
      s: "queued" | "generating" | "waiting" | "retrying" | "done" | "skipped" | "failed"
    ) => setBatchStatusByKey((prev) => ({ ...prev, [statusKey(loc, k)]: s }));

    const sleepCancellable = async (ms: number) => {
      const step = 250;
      const start = Date.now();
      while (Date.now() - start < ms) {
        if (batchCancelRef.current) return;
        await new Promise((r) => setTimeout(r, Math.min(step, ms - (Date.now() - start))));
      }
    };

    const generateOne = async (
      locName: string,
      layer: typeof VISUAL_LAYERS[number],
      prompt: string,
      anchorImage: string | undefined
    ): Promise<string | undefined> => {
      const imgProvider = provider === "anthropic" ? "openai" : provider;
      const refs: string[] = [];
      refs.push(...userReferenceImages);
      if (anchorImage && layer.key !== "establishing") refs.push(anchorImage);

      let attempt = 0;
      while (true) {
        if (batchCancelRef.current) return undefined;
        setStatus(locName, layer.key, attempt === 0 ? "generating" : "retrying");
        setBatchCurrentLabel(`${locName} — ${layer.title}`);
        try {
          const res = await apiRequest("POST", "/api/generate-image", {
            prompt,
            style: currentStylePrompt,
            referenceImages: refs.length > 0 ? refs : undefined,
            provider: imgProvider,
            apiKey,
          });
          const data = await res.json();
          if (data.error) throw new Error(data.error);
          const b64: string | undefined = data.image;
          if (!b64) throw new Error("No image returned");

          // Persist image immediately so partial progress survives
          setDevelopedItems((prev) => {
            const item = prev[locName];
            if (!item) return prev;
            const oldImage = item.visualImages?.[layer.key];
            const existingHistory = item.visualImageHistory?.[layer.key] || [];
            const updatedHistory = oldImage
              ? [oldImage, ...existingHistory].slice(0, 10)
              : existingHistory;
            return {
              ...prev,
              [locName]: {
                ...item,
                visualImages: { ...item.visualImages, [layer.key]: b64 },
                visualImageHistory: {
                  ...(item.visualImageHistory || {}),
                  [layer.key]: updatedHistory,
                },
              },
            };
          });
          setStatus(locName, layer.key, "done");
          return b64;
        } catch (err: any) {
          const msg = String(err?.message || err || "");
          const isRate =
            msg.includes("429") ||
            msg.toLowerCase().includes("rate limit") ||
            msg.includes("503") ||
            msg.toLowerCase().includes("overload") ||
            msg.toLowerCase().includes("busy");
          if (isRate && attempt < MAX_RETRIES) {
            setStatus(locName, layer.key, "waiting");
            setBatchCurrentLabel(
              `Rate limited — waiting ${Math.round(BACKOFF_MS / 1000)}s before retry ${attempt + 1}/${MAX_RETRIES}`
            );
            await sleepCancellable(BACKOFF_MS);
            if (batchCancelRef.current) return undefined;
            attempt++;
            continue;
          }
          setStatus(locName, layer.key, "failed");
          console.error(`Batch image failed for ${locName}/${layer.key}:`, msg);
          return undefined;
        }
      }
    };

    // Pre-seed status: queued / skipped
    const initial: Record<string, any> = {};
    let queuedCount = 0;
    for (const loc of targets) {
      const item = developedItems[loc];
      if (!item) continue;
      for (const layer of catLayers) {
        if (item.imageLocks?.[layer.key]) {
          initial[statusKey(loc, layer.key)] = "skipped";
        } else {
          initial[statusKey(loc, layer.key)] = "queued";
          queuedCount++;
        }
      }
    }
    setBatchStatusByKey(initial);
    setBatchProgress(0);

    let done = 0;
    const bump = () => {
      done++;
      setBatchProgress(queuedCount > 0 ? (done / queuedCount) * 100 : 100);
    };

    for (const locName of targets) {
      if (batchCancelRef.current) break;
      const item = developedItems[locName];
      if (!item) continue;

      // Ensure an anchor (establishing) image exists for non-camera categories
      let anchorImage: string | undefined = item.visualImages?.["establishing"];
      if (!anchorImage && category !== "camera") {
        const est = VISUAL_LAYERS.find((l) => l.key === "establishing");
        if (est && !item.imageLocks?.["establishing"]) {
          const p = buildLayerPrompt(est, item.profile);
          if (p) {
            const produced = await generateOne(locName, est, p, undefined);
            if (produced) anchorImage = produced;
            if (batchCancelRef.current) break;
            await sleepCancellable(delayMs);
          }
        }
      }

      for (const layer of catLayers) {
        if (batchCancelRef.current) break;
        if (item.imageLocks?.[layer.key]) continue; // already marked skipped
        const p = buildLayerPrompt(layer, item.profile);
        if (!p) {
          setStatus(locName, layer.key, "skipped");
          bump();
          continue;
        }
        await generateOne(locName, layer, p, anchorImage);
        bump();
        if (batchCancelRef.current) break;
        setBatchCurrentLabel(`Waiting ${Math.round(delayMs / 1000)}s before next image…`);
        await sleepCancellable(delayMs);
      }
    }
  };

  // ── AI Enhance Helpers ──

  const PLACEHOLDER_TEXT = "[Not enough information — consider developing this area]";

  const isFieldEmpty = (value: string | undefined): boolean => {
    if (!value) return true;
    if (value === "—") return true;
    if (value.includes("[Not enough information")) return true;
    return false;
  };

  const buildLocationContext = (profile: LocationProfile): string => {
    const contextParts: string[] = [];
    const keys: (keyof LocationProfile)[] = [
      "logline", "type", "scale", "timePeriod", "region", "terrain", "climate",
      "layoutDescription", "defaultEmotionalTone", "originFounding",
      "whoLivesWorksHere", "storyEventsHere",
    ];
    for (const k of keys) {
      const val = profile[k];
      if (val && !isFieldEmpty(val)) {
        contextParts.push(`${k}: ${val}`);
      }
    }
    return contextParts.join(". ") || "No additional context available.";
  };

  const handleEnhanceField = async (fieldKey: string, fieldLabel: string) => {
    if (!currentProfile || !expandedItem) return;
    const currentValue = (currentProfile as any)[fieldKey] || "";

    setEnhancingFields((prev) => new Set(prev).add(fieldKey));
    try {
      const res = await apiRequest("POST", "/api/enhance", {
        fieldKey,
        fieldLabel,
        currentValue,
        locationName: expandedItem,
        locationContext: buildLocationContext(currentProfile),
        provider,
        apiKey,
      });
      const data = await res.json();
      if (data.enhanced) {
        // Update profile in developedItems
        setDevelopedItems((prev) => {
          const item = prev[expandedItem!];
          if (!item) return prev;
          const updatedProfile = { ...item.profile, [fieldKey]: data.enhanced };
          return { ...prev, [expandedItem!]: { ...item, profile: updatedProfile } };
        });
        setEnhancedFields((prev) => new Set(prev).add(fieldKey));
      }
    } catch (err: any) {
      toast({ title: "Enhance failed", description: err.message, variant: "destructive" });
    } finally {
      setEnhancingFields((prev) => {
        const next = new Set(prev);
        next.delete(fieldKey);
        return next;
      });
    }
  };

  const handleEnhanceAll = async () => {
    if (!currentProfile || !expandedItem) return;

    // Gather all empty fields across all sections (excluding visual fields)
    const emptyFields: { key: string; label: string }[] = [];
    for (const section of PROFILE_SECTIONS) {
      for (const field of section.fields) {
        const val = (currentProfile as any)[field.key] || "";
        if (isFieldEmpty(val)) {
          emptyFields.push({ key: field.key, label: field.label });
        }
      }
    }
    if (emptyFields.length === 0) {
      toast({ title: "Nothing to enhance", description: "All profile fields already have content." });
      return;
    }

    setEnhanceAllProgress({ current: 0, total: emptyFields.length });

    for (let i = 0; i < emptyFields.length; i++) {
      setEnhanceAllProgress({ current: i + 1, total: emptyFields.length });
      await handleEnhanceField(emptyFields[i].key, emptyFields[i].label);
      // Small delay between calls to avoid rate limits
      if (i < emptyFields.length - 1) {
        await delay(1500);
      }
    }
    setEnhanceAllProgress(null);
    toast({ title: "Enhancement complete", description: `Enhanced ${emptyFields.length} fields with AI-generated content.` });
  };

  // ── Manual Field Edit Handlers ──
  const startEditField = (fieldKey: string) => {
    if (!currentProfile) return;
    const raw = (currentProfile as any)[fieldKey];
    setEditDraft(typeof raw === "string" ? raw : raw == null ? "" : String(raw));
    setEditingField(fieldKey);
  };

  const cancelEditField = () => {
    setEditingField(null);
    setEditDraft("");
  };

  const saveEditField = () => {
    if (!editingField || !expandedItem) return;
    const fieldKey = editingField;
    const draft = editDraft;
    setDevelopedItems((prev) => {
      const item = prev[expandedItem];
      if (!item) return prev;
      const updatedProfile = { ...item.profile, [fieldKey]: draft } as LocationProfile;
      const updatedEdited = { ...(item.editedFields || {}), [fieldKey]: true };
      return { ...prev, [expandedItem]: { ...item, profile: updatedProfile, editedFields: updatedEdited } };
    });
    setEditingField(null);
    setEditDraft("");
    toast({ title: "Saved", description: "Your changes were saved to this location." });
  };

  // Reset
  const handleReset = () => {
    setStep("upload");
    setSourceText("");
    setDetectedLocations([]);
    setDevelopedItems({});
    setExpandedItem(null);
    setUserReferenceImages([]);
    setAnalysisProgress(0);
    setAnalysisStage("");
  };

  // ── Auth Handlers ──

  const checkSession = async () => {
    const token = getSessionToken();
    if (!token) { setAuthLoading(false); return; }
    try {
      const res = await apiRequest("GET", "/api/auth/me");
      const user = await res.json();
      setAuthUser(user);
      setAppScreen("projects");
    } catch {
      setSessionToken(null);
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => { checkSession(); }, []);

  const handleRegister = async () => {
    setAuthError("");
    setAuthSubmitting(true);
    try {
      const res = await apiRequest("POST", "/api/auth/register", {
        email: authEmail, password: authPassword, displayName: authDisplayName,
      });
      const data = await res.json();
      setSessionToken(data.token);
      setAuthUser(data.user);
      setAppScreen("projects");
    } catch (err: any) {
      setAuthError(err.message?.replace(/^\d+:\s*/, "").replace(/.*"error":"/, "").replace(/".*/, "") || "Registration failed");
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogin = async () => {
    setAuthError("");
    setAuthSubmitting(true);
    try {
      const res = await apiRequest("POST", "/api/auth/login", {
        email: authEmail, password: authPassword,
      });
      const data = await res.json();
      setSessionToken(data.token);
      setAuthUser(data.user);
      setAppScreen("projects");
    } catch (err: any) {
      setAuthError(err.message?.replace(/^\d+:\s*/, "").replace(/.*"error":"/, "").replace(/".*/, "") || "Login failed");
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogout = async () => {
    if (currentProjectId) {
      try { await saveProjectState(); } catch { /* silent */ }
    }
    try { await apiRequest("POST", "/api/auth/logout"); } catch {}
    setSessionToken(null);
    setAuthUser(null);
    setAppScreen("auth");
    setAuthScreen("login");
    setCurrentProjectId(null);
    handleReset();
  };

  const handleForgotPassword = async () => {
    setAuthError("");
    setAuthSubmitting(true);
    try {
      const res = await apiRequest("POST", "/api/auth/forgot-password", { email: authEmail });
      const data = await res.json();
      setResetMessage(data.message || "Check your email for a reset link.");
      if (data.resetToken) setResetToken(data.resetToken);
    } catch (err: any) {
      setAuthError(err.message || "Failed to request password reset");
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    setAuthError("");
    setAuthSubmitting(true);
    try {
      const res = await apiRequest("POST", "/api/auth/reset-password", {
        token: resetToken, newPassword,
      });
      const data = await res.json();
      setResetMessage(data.message || "Password reset. You can now sign in.");
      setTimeout(() => { setAuthScreen("login"); setResetMessage(""); }, 2000);
    } catch (err: any) {
      setAuthError(err.message || "Password reset failed");
    } finally {
      setAuthSubmitting(false);
    }
  };

  // ── Project Handlers ──

  const loadProjects = async () => {
    setProjectsLoading(true);
    try {
      const res = await apiRequest("GET", "/api/projects");
      const data = await res.json();
      setProjects(data.projects || []);
    } catch {
      setProjects([]);
    } finally {
      setProjectsLoading(false);
    }
  };

  const loadSubscriptionStatus = async () => {
    try {
      const res = await apiRequest("GET", "/api/subscription/status");
      const data = await res.json();
      setSubscriptionStatus(data);
    } catch {}
  };

  useEffect(() => {
    if (appScreen === "projects" && authUser) {
      loadProjects();
      loadSubscriptionStatus();
    }
  }, [appScreen, authUser]);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    try {
      const res = await apiRequest("POST", "/api/projects", { name: newProjectName.trim() });
      const data = await res.json();
      setNewProjectName("");
      await loadProjects();
      handleOpenProject(data.id, data.name);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleOpenProject = async (id: number, name: string) => {
    setCurrentProjectId(id);
    setCurrentProjectName(name);
    try {
      const res = await apiRequest("GET", `/api/projects/${id}`);
      const data = await res.json();
      const state = data.state || {};
      // Restore project state
      if (state.sourceText) setSourceText(state.sourceText);
      if (state.sourceType) setSourceType(state.sourceType);
      if (state.provider) setProvider(state.provider);
      if (state.apiKey) setApiKey(state.apiKey);
      if (state.artStyle) setArtStyle(state.artStyle);
      if (state.customStylePrompt) setCustomStylePrompt(state.customStylePrompt);
      if (state.customStyleInput) setCustomStyleInput(state.customStyleInput);
      if (state.detectedLocations) setDetectedLocations(state.detectedLocations);
      if (state.developedItems) setDevelopedItems(state.developedItems);
      if (state.step) setStep(state.step);
      else setStep(state.detectedLocations?.length > 0 ? "dashboard" : "upload");
      setAppScreen("app");
    } catch (err: any) {
      toast({ title: "Error", description: "Failed to load project", variant: "destructive" });
    }
  };

  const handleDeleteProject = async (id: number) => {
    try {
      await apiRequest("DELETE", `/api/projects/${id}`);
      await loadProjects();
      if (currentProjectId === id) {
        setCurrentProjectId(null);
        handleReset();
        setAppScreen("projects");
      }
    } catch {}
  };

  const handleRenameProject = async (id: number) => {
    if (!renameValue.trim()) return;
    try {
      await apiRequest("PATCH", `/api/projects/${id}/rename`, { name: renameValue.trim() });
      if (currentProjectId === id) setCurrentProjectName(renameValue.trim());
      setRenamingProjectId(null);
      setRenameValue("");
      await loadProjects();
    } catch {}
  };

  const handleBackToProjects = () => {
    // Save current state before leaving
    if (currentProjectId) saveProjectState();
    setAppScreen("projects");
    handleReset();
    setCurrentProjectId(null);
  };

  // ── Auto-Save ──

  const saveProjectState = useCallback(async () => {
    if (!currentProjectId) return;
    const state: any = {
      sourceText, sourceType, provider, apiKey, artStyle,
      customStylePrompt, customStyleInput,
      detectedLocations, developedItems, step,
    };
    try {
      await apiRequest("PUT", `/api/projects/${currentProjectId}`, { state });
    } catch {}
  }, [currentProjectId, sourceText, sourceType, provider, apiKey, artStyle, customStylePrompt, customStyleInput, detectedLocations, developedItems, step]);

  // Auto-save on state changes (debounced)
  useEffect(() => {
    if (appScreen !== "app" || !currentProjectId) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      saveProjectState();
    }, 3000);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [sourceText, sourceType, provider, apiKey, artStyle, customStylePrompt, customStyleInput, detectedLocations, developedItems, step, appScreen, currentProjectId, saveProjectState]);

  // Close image preview on Escape
  useEffect(() => {
    if (!previewImage) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreviewImage(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [previewImage]);

  // ── Subscription Helpers ──

  const handleCheckout = async (plan: "monthly" | "yearly") => {
    try {
      const res = await apiRequest("POST", "/api/subscription/checkout", { plan });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleManageSubscription = async () => {
    try {
      const res = await apiRequest("POST", "/api/subscription/portal");
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  // Support handlers
  const handleAskSupport = async () => {
    if (!supportQuestion.trim() || askingSupport) return;
    const question = supportQuestion.trim();
    setChatHistory(prev => [...prev, { role: "user", text: question }]);
    setSupportQuestion("");
    setAskingSupport(true);
    try {
      const res = await apiRequest("POST", "/api/support/ai-chat", {
        question,
        apiKey: apiKey || undefined,
        provider: provider || "google",
      });
      const data = await res.json();
      setChatHistory(prev => [...prev, { role: "ai", text: data.answer }]);
    } catch (err: any) {
      setChatHistory(prev => [...prev, { role: "ai", text: `Error: ${err.message?.replace(/^\d+:\s*/, "") || "Failed to get answer"}` }]);
    } finally {
      setAskingSupport(false);
    }
  };

  const handleSubmitTicket = async () => {
    if (!supportSubject.trim() || !supportMessage.trim() || submittingTicket) return;
    setSubmittingTicket(true);
    try {
      const res = await apiRequest("POST", "/api/support/ticket", {
        category: supportCategory,
        subject: supportSubject.trim(),
        message: supportMessage.trim(),
      });
      const data = await res.json();
      toast({ title: "Ticket submitted", description: `Your support ticket has been received. Ticket #${data.ticketId}` });
      setSupportSubject("");
      setSupportMessage("");
      setSupportCategory("general");
      loadSupportTickets();
    } catch (err: any) {
      toast({ title: "Error", description: err.message?.replace(/^\d+:\s*/, "") || "Failed to submit ticket", variant: "destructive" });
    } finally {
      setSubmittingTicket(false);
    }
  };

  const loadSupportTickets = async () => {
    try {
      const res = await apiRequest("GET", "/api/support/tickets");
      const data = await res.json();
      setSupportTickets(data.tickets || []);
    } catch {}
  };

  // Dashboard helpers
  const developedCount = Object.keys(developedItems).length;
  const totalCount = detectedLocations.length;
  const importanceOrder: Record<string, number> = { major: 0, minor: 1, background: 2 };

  const filteredLocations = detectedLocations
    .filter((loc) => filterImportance === "all" || loc.estimatedImportance === filterImportance)
    .sort((a, b) => {
      if (sortBy === "importance") {
        return (importanceOrder[a.estimatedImportance] ?? 3) - (importanceOrder[b.estimatedImportance] ?? 3);
      }
      return a.name.localeCompare(b.name);
    });

  // ── Auth Loading Screen ──
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0a0b0d] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-[#00d4aa] mx-auto" />
          <p className="text-sm text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // ── Auth Gate ──
  if (appScreen === "auth") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: "hsl(225,15%,4%)" }}>
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-3">
              <img src="./location-forge-logo.png" alt="Location Forge" className="w-16 h-16 rounded-xl object-contain" />
            </div>
            <h1 className="text-xl font-semibold tracking-wide uppercase" style={{ color: "hsl(163,100%,42%)" }}>LOCATION FORGE</h1>
            <p className="text-xs font-mono tracking-wider uppercase mt-1" style={{ color: "hsl(220,5%,58%)" }}>
              Visual Location Development
            </p>
          </div>

          <Card className="border" style={{ background: "hsl(225,12%,14%)", borderColor: "hsl(225,10%,24%)" }}>
            <CardContent className="p-5">
              {/* Tab Toggle */}
              {(authScreen === "login" || authScreen === "register") ? (
                <div className="flex gap-1 mb-5 p-0.5 rounded-md" style={{ background: "hsl(225,12%,8%)" }}>
                  <button
                    className={`flex-1 text-sm py-2 rounded font-medium transition-colors ${
                      authScreen === "login" ? "bg-[#00d4aa] text-black" : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => { setAuthScreen("login"); setAuthError(""); }}
                    data-testid="tab-login"
                  >
                    Sign In
                  </button>
                  <button
                    className={`flex-1 text-sm py-2 rounded font-medium transition-colors ${
                      authScreen === "register" ? "bg-[#00d4aa] text-black" : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => { setAuthScreen("register"); setAuthError(""); }}
                    data-testid="tab-register"
                  >
                    Create Account
                  </button>
                </div>
              ) : (
                <div className="mb-5">
                  <h2 className="text-base font-semibold text-center">Reset Password</h2>
                  <p className="text-xs text-center mt-1" style={{ color: "hsl(220,5%,68%)" }}>
                    {authScreen === "forgot" ? "Enter your email to receive a reset token" : "Paste your token and choose a new password"}
                  </p>
                </div>
              )}

              {/* Auth Form */}
              <div className="space-y-3">
                {authScreen === "register" && (
                  <div>
                    <label className="text-xs font-mono tracking-wider uppercase block mb-1.5" style={{ color: "hsl(220,5%,72%)" }}>Display Name</label>
                    <Input value={authDisplayName} onChange={(e) => setAuthDisplayName(e.target.value)} placeholder="Your name"
                      className="text-sm h-10" style={{ background: "hsl(225,12%,10%)", borderColor: "hsl(225,10%,26%)", color: "hsl(0,0%,95%)" }} />
                  </div>
                )}

                {(authScreen === "login" || authScreen === "register" || authScreen === "forgot") && (
                  <div>
                    <label className="text-xs font-mono tracking-wider uppercase block mb-1.5" style={{ color: "hsl(220,5%,72%)" }}>Email</label>
                    <Input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="you@example.com"
                      className="text-sm h-10" style={{ background: "hsl(225,12%,10%)", borderColor: "hsl(225,10%,26%)", color: "hsl(0,0%,95%)" }} />
                  </div>
                )}

                {(authScreen === "login" || authScreen === "register") && (
                  <div>
                    <label className="text-xs font-mono tracking-wider uppercase block mb-1.5" style={{ color: "hsl(220,5%,72%)" }}>Password</label>
                    <Input type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="At least 6 characters"
                      className="text-sm h-10" style={{ background: "hsl(225,12%,10%)", borderColor: "hsl(225,10%,26%)", color: "hsl(0,0%,95%)" }}
                      onKeyDown={(e) => e.key === "Enter" && (authScreen === "login" ? handleLogin() : handleRegister())} />
                  </div>
                )}

                {authScreen === "forgot" && resetToken && (
                  <>
                    <div className="text-xs rounded-md p-2.5" style={{ color: "hsl(220,5%,68%)", background: "hsl(225,15%,8%)" }}>Reset token generated. Enter it below:</div>
                    <div>
                      <label className="text-xs font-mono tracking-wider uppercase block mb-1.5" style={{ color: "hsl(220,5%,72%)" }}>Reset Token</label>
                      <Input value={resetToken} onChange={(e) => setResetToken(e.target.value)} placeholder="paste-token-here"
                        className="text-sm h-10 font-mono" style={{ background: "hsl(225,12%,10%)", borderColor: "hsl(225,10%,26%)", color: "hsl(0,0%,95%)" }} />
                    </div>
                    <div>
                      <label className="text-xs font-mono tracking-wider uppercase block mb-1.5" style={{ color: "hsl(220,5%,72%)" }}>New Password</label>
                      <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 6 characters"
                        className="text-sm h-10" style={{ background: "hsl(225,12%,10%)", borderColor: "hsl(225,10%,26%)", color: "hsl(0,0%,95%)" }} />
                    </div>
                  </>
                )}

                {(authScreen === "reset") && (
                  <>
                    <div>
                      <label className="text-xs font-mono tracking-wider uppercase block mb-1.5" style={{ color: "hsl(220,5%,72%)" }}>Reset Token</label>
                      <Input value={resetToken} onChange={(e) => setResetToken(e.target.value)} placeholder="paste-token-here"
                        className="text-sm h-10 font-mono" style={{ background: "hsl(225,12%,10%)", borderColor: "hsl(225,10%,26%)", color: "hsl(0,0%,95%)" }} />
                    </div>
                    <div>
                      <label className="text-xs font-mono tracking-wider uppercase block mb-1.5" style={{ color: "hsl(220,5%,72%)" }}>New Password</label>
                      <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 6 characters"
                        className="text-sm h-10" style={{ background: "hsl(225,12%,10%)", borderColor: "hsl(225,10%,26%)", color: "hsl(0,0%,95%)" }} />
                    </div>
                  </>
                )}

                {authError && (
                  <div className="text-xs text-red-400 bg-red-400/10 rounded px-3 py-2 flex items-start gap-2">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>{authError}</span>
                  </div>
                )}

                <Button
                  onClick={() => {
                    if (authScreen === "login") handleLogin();
                    else if (authScreen === "register") handleRegister();
                    else if (authScreen === "forgot" && resetToken) handleResetPassword();
                    else if (authScreen === "forgot") handleForgotPassword();
                    else if (authScreen === "reset") handleResetPassword();
                  }}
                  disabled={authSubmitting}
                  className="w-full gap-2 mt-2 bg-[#00d4aa] hover:bg-[#00d4aa]/90 text-black font-semibold"
                >
                  {authSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : authScreen === "login" ? (
                    <><LogIn className="w-4 h-4" /> Sign In</>
                  ) : authScreen === "register" ? (
                    <><UserPlus className="w-4 h-4" /> Create Account</>
                  ) : (
                    <><KeyRound className="w-4 h-4" /> {resetToken ? "Reset Password" : "Send Reset Token"}</>
                  )}
                </Button>

                {authScreen === "login" && (
                  <button
                    className="w-full text-xs hover:text-foreground transition-colors mt-2" style={{ color: "hsl(220,5%,65%)" }}
                    onClick={() => { setAuthScreen("forgot"); setAuthError(""); }}
                  >
                    Forgot your password?
                  </button>
                )}
                {(authScreen === "forgot" || authScreen === "reset") && (
                  <button
                    className="w-full text-xs hover:text-foreground transition-colors mt-2" style={{ color: "hsl(220,5%,65%)" }}
                    onClick={() => { setAuthScreen("login"); setAuthError(""); setResetMessage(""); setResetToken(""); }}
                  >
                    &larr; Back to Sign In
                  </button>
                )}
              </div>
            </CardContent>
          </Card>

          <p className="text-xs text-center mt-6" style={{ color: "hsl(220,5%,55%)" }}>
            Your locations and visual studies are stored securely per account.
          </p>
          <p className="text-xs text-center mt-4" style={{ color: "hsl(220,5%,30%)" }}>
            Created with the Assistance of AI &copy; 2026 <a href="https://littleredappleproductions.com" target="_blank" rel="noopener noreferrer" style={{ color: "hsla(163,100%,42%,0.6)" }} className="hover:underline">Little Red Apple Productions</a>
          </p>
        </div>
      </div>
    );
  }

  // ── Project List Screen ──
  if (appScreen === "projects") {
    return (
      <div className="min-h-screen bg-[#0a0b0d]">
        <header className="border-b border-gray-800 bg-[#111214]/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src="./location-forge-logo.png" alt="Location Forge" className="w-8 h-8 rounded-sm object-contain" />
              <span className="font-bold text-lg text-white">Location Forge</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">{authUser?.displayName}</span>
              <Button variant="ghost" size="sm" onClick={async () => { if (currentProjectId) { try { await saveProjectState(); } catch { /* silent */ } } setAppScreen("account"); }} className="text-gray-400 hover:text-white">
                <User className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-gray-400 hover:text-white">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          {/* Subscription banner */}
          {subscriptionStatus && !subscriptionStatus.isAdmin && (
            <div className="mb-6">
              {subscriptionStatus.trialActive && !subscriptionStatus.subscriptionActive && (
                <div className="bg-[#111214] border border-[#00d4aa]/30 rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white">Free trial — <span className="text-[#00d4aa] font-semibold">{subscriptionStatus.trialDaysRemaining} days remaining</span></p>
                    <p className="text-xs text-gray-500 mt-0.5">Upgrade to keep building location profiles</p>
                  </div>
                  <Button size="sm" onClick={() => setAppScreen("account")} className="bg-[#00d4aa] hover:bg-[#00b894] text-black font-semibold">Upgrade</Button>
                </div>
              )}
              {!subscriptionStatus.canAccess && (
                <div className="bg-[#111214] border border-red-500/30 rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-red-400 font-semibold">Trial expired</p>
                    <p className="text-xs text-gray-500 mt-0.5">Subscribe to continue using Location Forge</p>
                  </div>
                  <Button size="sm" onClick={() => setAppScreen("account")} className="bg-[#00d4aa] hover:bg-[#00b894] text-black font-semibold">Subscribe</Button>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Projects</h2>
            <div className="flex items-center gap-2">
              <Input
                placeholder="New project name..."
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateProject()}
                className="w-56 bg-[#111214] border-gray-700 text-white text-sm"
              />
              <Button size="sm" onClick={handleCreateProject} className="bg-[#00d4aa] hover:bg-[#00b894] text-black font-semibold">
                <Plus className="w-4 h-4 mr-1" /> New
              </Button>
            </div>
          </div>

          {projectsLoading ? (
            <div className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#00d4aa] mx-auto" /></div>
          ) : projects.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <FolderOpen className="w-12 h-12 text-gray-600 mx-auto" />
              <p className="text-gray-500 mb-4">No projects yet. Create one to get started.</p>
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    const res = await apiRequest("POST", "/api/projects", { name: "Demo — 2001 / Dune / Terminator" });
                    const data = await res.json();
                    setDemoMode(true);
                    setDetectedLocations(DEMO_LOCATIONS);
                    setDevelopedItems({});
                    setExpandedItem(null);
                    setStep("dashboard");
                    setCurrentProjectId(data.id);
                    setCurrentProjectName("Demo — 2001 / Dune / Terminator");
                    setAppScreen("app");
                  } catch {
                    toast({ title: "Failed to create demo project", variant: "destructive" });
                  }
                }}
                className="border-[#00d4aa]/30 text-[#00d4aa] hover:bg-[#00d4aa]/10"
                data-testid="button-try-demo"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Try Demo with Sample Data
              </Button>
            </div>
          ) : (
            <div className="grid gap-3">
              {projects.map((p) => (
                <div key={p.id} className="bg-[#111214] border border-gray-800 rounded-lg p-4 flex items-center justify-between hover:border-gray-600 transition-colors group">
                  {renamingProjectId === p.id ? (
                    <div className="flex items-center gap-2 flex-1 mr-4">
                      <Input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleRenameProject(p.id); if (e.key === "Escape") setRenamingProjectId(null); }}
                        className="bg-[#0a0b0d] border-gray-700 text-white text-sm"
                      />
                      <Button size="sm" variant="ghost" onClick={() => handleRenameProject(p.id)} className="text-[#00d4aa]"><Check className="w-4 h-4" /></Button>
                    </div>
                  ) : (
                    <div className="cursor-pointer flex-1 min-w-0" onClick={() => handleOpenProject(p.id, p.name)}>
                      <h3 className="font-semibold text-white truncate">{p.name}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-500">{p.locationCount} location{p.locationCount !== 1 ? "s" : ""}</span>
                        <span className="text-xs text-gray-500">{p.developedCount} developed</span>
                        <span className="text-xs text-gray-600">Updated {new Date(p.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-white"
                      onClick={(e) => { e.stopPropagation(); setRenamingProjectId(p.id); setRenameValue(p.name); }}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-red-400"
                      onClick={(e) => { e.stopPropagation(); handleDeleteProject(p.id); }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Import from Story Forge (creates a NEW project) ── */}
          <div className="mt-8">
            <p className="text-xs mb-2" style={{ color: "hsl(220,5%,52%)" }}>
              Start a new project by pulling chapters from another Forge app, or open an existing project above to
              import Story Forge context into it.
            </p>
            <details
              open={sfImportOpen}
              onToggle={async (e) => {
                const opening = (e.currentTarget as HTMLDetailsElement).open;
                setSfImportOpen(opening);
                if (opening && sfProjects.length === 0) {
                  setSfProjectsLoading(true);
                  try {
                    const res = await apiRequest("GET", "/api/story-forge/projects");
                    const data = await res.json();
                    setSfProjects(data.projects || []);
                  } catch { /* silent */ }
                  setSfProjectsLoading(false);
                }
              }}
              className="rounded-lg"
              style={{ background: "hsl(225,18%,6%)", border: "1px solid hsl(225,10%,12%)" }}
            >
              <summary
                className="list-none w-full flex items-center justify-between px-4 py-3 cursor-pointer select-none"
                data-testid="summary-sf-import"
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" style={{ color: "hsl(163,100%,42%)" }} />
                  <span className="text-sm font-semibold" style={{ color: "hsl(180,5%,88%)" }}>Import from Story Forge → New project</span>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${sfImportOpen ? "rotate-180" : ""}`} style={{ color: "hsl(220,5%,40%)" }} />
              </summary>
              {(
              <div className="mt-2 rounded-lg p-4" style={{ background: "hsl(225,18%,6%)", border: "1px solid hsl(225,10%,12%)" }}>
                {sfProjectsLoading ? (
                  <div className="text-center py-6"><Loader2 className="w-5 h-5 animate-spin mx-auto" style={{ color: "hsl(163,100%,42%)" }} /></div>
                ) : sfProjects.length === 0 ? (
                  <p className="text-xs text-center py-4" style={{ color: "hsl(220,5%,52%)" }}>No Story Forge projects found for your account.</p>
                ) : !sfSelectedProject ? (
                  <div>
                    <p className="text-xs font-mono mb-3" style={{ color: "hsl(220,5%,52%)" }}>Select a Story Forge project:</p>
                    <div className="grid gap-2">
                      {sfProjects.map((p) => (
                        <button
                          key={p.id}
                          onClick={async () => {
                            setSfSelectedProject(p.name);
                            setSfChaptersLoading(true);
                            setSfSelectedChapters(new Set());
                            try {
                              const res = await apiRequest("GET", `/api/story-forge/chapters?project=${encodeURIComponent(p.name)}`);
                              const data = await res.json();
                              setSfChapters(data.chapters || []);
                            } catch { /* silent */ }
                            setSfChaptersLoading(false);
                          }}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:border-[hsl(163,100%,42%)]/40 transition-colors"
                          style={{ background: "hsl(225,15%,8%)", border: "1px solid hsl(225,10%,14%)" }}
                        >
                          <BookOpen className="w-4 h-4 shrink-0" style={{ color: "hsl(163,100%,42%)" }} />
                          <span className="text-sm font-medium truncate" style={{ color: "hsl(180,5%,88%)" }}>{p.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => { setSfSelectedProject(null); setSfChapters([]); setSfSelectedChapters(new Set()); }} className="text-xs underline" style={{ color: "hsl(163,100%,42%)" }}>&larr; Back</button>
                        <span className="text-xs font-mono" style={{ color: "hsl(220,5%,52%)" }}>{sfSelectedProject}</span>
                      </div>
                      <span className="text-[10px] font-mono" style={{ color: "hsl(220,5%,40%)" }}>{sfSelectedChapters.size} selected</span>
                    </div>
                    {sfChaptersLoading ? (
                      <div className="text-center py-6"><Loader2 className="w-5 h-5 animate-spin mx-auto" style={{ color: "hsl(163,100%,42%)" }} /></div>
                    ) : sfChapters.length === 0 ? (
                      <p className="text-xs text-center py-4" style={{ color: "hsl(220,5%,52%)" }}>No chapters found in this project.</p>
                    ) : (
                      <>
                        <div className="mb-2 flex items-center gap-2">
                          <button
                            onClick={() => {
                              if (sfSelectedChapters.size === sfChapters.length) {
                                setSfSelectedChapters(new Set());
                              } else {
                                setSfSelectedChapters(new Set(sfChapters.map((_, i) => i)));
                              }
                            }}
                            className="text-[10px] font-mono underline"
                            style={{ color: "hsl(163,100%,42%)" }}
                          >
                            {sfSelectedChapters.size === sfChapters.length ? "Deselect all" : "Select all"}
                          </button>
                        </div>
                        <div className="space-y-1 max-h-60 overflow-y-auto">
                          {sfChapters.map((ch, i) => {
                            const wc = ch.wordCount ?? (ch.text || ch.content || "").split(/\s+/).filter(Boolean).length;
                            return (
                              <label key={i} className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-white/5">
                                <input
                                  type="checkbox"
                                  checked={sfSelectedChapters.has(i)}
                                  onChange={() => {
                                    const next = new Set(sfSelectedChapters);
                                    next.has(i) ? next.delete(i) : next.add(i);
                                    setSfSelectedChapters(next);
                                  }}
                                  className="accent-[hsl(163,100%,42%)]"
                                />
                                <span className="text-xs truncate flex-1" style={{ color: "hsl(180,5%,88%)" }}>{ch.title || `Chapter ${i + 1}`}</span>
                                <span className="text-[10px] font-mono shrink-0" style={{ color: "hsl(220,5%,40%)" }}>{wc.toLocaleString()} words</span>
                              </label>
                            );
                          })}
                        </div>
                        <Button
                          size="sm"
                          disabled={sfSelectedChapters.size === 0 || sfImporting}
                          onClick={async () => {
                            setSfImporting(true);
                            try {
                              const selected = [...sfSelectedChapters].sort().map((i) => sfChapters[i]);
                              const res = await apiRequest("POST", "/api/story-forge/import-project", {
                                projectName: sfSelectedProject,
                                chapters: selected,
                              });
                              const data = await res.json();
                              toast({ title: `Imported "${sfSelectedProject}" with ${selected.length} chapter${selected.length !== 1 ? "s" : ""}` });
                              // Reset import state
                              setSfSelectedProject(null);
                              setSfChapters([]);
                              setSfSelectedChapters(new Set());
                              setSfImportOpen(false);
                              // Refresh project list
                              try {
                                const pr = await apiRequest("GET", "/api/projects");
                                const pd = await pr.json();
                                setProjects(pd.projects || []);
                              } catch {}
                            } catch (err: any) {
                              toast({ title: "Import failed", description: err.message, variant: "destructive" });
                            }
                            setSfImporting(false);
                          }}
                          className="mt-3 w-full bg-[#00d4aa] hover:bg-[#00b894] text-black font-semibold"
                        >
                          {sfImporting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                          Create Project
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
              )}
            </details>
          </div>

          {/* ── Import from Manuscript Forge (creates a NEW project) ── */}
          <div className="mt-3">
            <details
              open={mfImportOpen}
              onToggle={async (e) => {
                const opening = (e.currentTarget as HTMLDetailsElement).open;
                setMfImportOpen(opening);
                if (opening && mfProjects.length === 0) {
                  setMfProjectsLoading(true);
                  try {
                    const res = await apiRequest("GET", "/api/manuscript-forge/projects");
                    const data = await res.json();
                    setMfProjects(data.projects || []);
                  } catch { /* silent */ }
                  setMfProjectsLoading(false);
                }
              }}
              className="rounded-lg"
              style={{ background: "hsl(225,18%,6%)", border: "1px solid hsl(225,10%,12%)" }}
            >
              <summary
                className="list-none w-full flex items-center justify-between px-4 py-3 cursor-pointer select-none"
                data-testid="summary-mf-import"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" style={{ color: "hsl(163,100%,42%)" }} />
                  <span className="text-sm font-semibold" style={{ color: "hsl(180,5%,88%)" }}>Import from Manuscript Forge → New project</span>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${mfImportOpen ? "rotate-180" : ""}`} style={{ color: "hsl(220,5%,40%)" }} />
              </summary>
              {(
              <div className="mt-2 rounded-lg p-4" style={{ background: "hsl(225,18%,6%)", border: "1px solid hsl(225,10%,12%)" }}>
                {mfProjectsLoading ? (
                  <div className="text-center py-6"><Loader2 className="w-5 h-5 animate-spin mx-auto" style={{ color: "hsl(163,100%,42%)" }} /></div>
                ) : mfProjects.length === 0 ? (
                  <p className="text-xs text-center py-4" style={{ color: "hsl(220,5%,52%)" }}>No Manuscript Forge projects found for your account.</p>
                ) : !mfSelectedProject ? (
                  <div>
                    <p className="text-xs font-mono mb-3" style={{ color: "hsl(220,5%,52%)" }}>Select a Manuscript Forge project:</p>
                    <div className="grid gap-2">
                      {mfProjects.map((p) => (
                        <button
                          key={p.id}
                          onClick={async () => {
                            setMfSelectedProject(p.name);
                            setMfChaptersLoading(true);
                            setMfSelectedChapters(new Set());
                            try {
                              const res = await apiRequest("GET", `/api/manuscript-forge/chapters?project=${encodeURIComponent(p.name)}`);
                              const data = await res.json();
                              setMfChapters(data.chapters || []);
                            } catch { /* silent */ }
                            setMfChaptersLoading(false);
                          }}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:border-[hsl(163,100%,42%)]/40 transition-colors"
                          style={{ background: "hsl(225,15%,8%)", border: "1px solid hsl(225,10%,14%)" }}
                        >
                          <FileText className="w-4 h-4 shrink-0" style={{ color: "hsl(163,100%,42%)" }} />
                          <span className="text-sm font-medium truncate" style={{ color: "hsl(180,5%,88%)" }}>{p.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => { setMfSelectedProject(null); setMfChapters([]); setMfSelectedChapters(new Set()); }} className="text-xs underline" style={{ color: "hsl(163,100%,42%)" }}>&larr; Back</button>
                        <span className="text-xs font-mono" style={{ color: "hsl(220,5%,52%)" }}>{mfSelectedProject}</span>
                      </div>
                      <span className="text-[10px] font-mono" style={{ color: "hsl(220,5%,40%)" }}>{mfSelectedChapters.size} selected</span>
                    </div>
                    {mfChaptersLoading ? (
                      <div className="text-center py-6"><Loader2 className="w-5 h-5 animate-spin mx-auto" style={{ color: "hsl(163,100%,42%)" }} /></div>
                    ) : mfChapters.length === 0 ? (
                      <p className="text-xs text-center py-4" style={{ color: "hsl(220,5%,52%)" }}>No chapters found in this project.</p>
                    ) : (
                      <>
                        <div className="mb-2 flex items-center gap-2">
                          <button
                            onClick={() => {
                              if (mfSelectedChapters.size === mfChapters.length) {
                                setMfSelectedChapters(new Set());
                              } else {
                                setMfSelectedChapters(new Set(mfChapters.map((_, i) => i)));
                              }
                            }}
                            className="text-[10px] font-mono underline"
                            style={{ color: "hsl(163,100%,42%)" }}
                          >
                            {mfSelectedChapters.size === mfChapters.length ? "Deselect all" : "Select all"}
                          </button>
                        </div>
                        <div className="space-y-1 max-h-60 overflow-y-auto">
                          {mfChapters.map((ch, i) => {
                            const wc = ch.wordCount ?? (ch.text || ch.content || "").split(/\s+/).filter(Boolean).length;
                            return (
                              <label key={i} className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-white/5">
                                <input
                                  type="checkbox"
                                  checked={mfSelectedChapters.has(i)}
                                  onChange={() => {
                                    const next = new Set(mfSelectedChapters);
                                    next.has(i) ? next.delete(i) : next.add(i);
                                    setMfSelectedChapters(next);
                                  }}
                                  className="accent-[hsl(163,100%,42%)]"
                                />
                                <span className="text-xs truncate flex-1" style={{ color: "hsl(180,5%,88%)" }}>{ch.title || `Chapter ${i + 1}`}</span>
                                <span className="text-[10px] font-mono shrink-0" style={{ color: "hsl(220,5%,40%)" }}>{wc.toLocaleString()} words</span>
                              </label>
                            );
                          })}
                        </div>
                        <Button
                          size="sm"
                          disabled={mfSelectedChapters.size === 0 || mfImporting}
                          onClick={async () => {
                            setMfImporting(true);
                            try {
                              const selected = [...mfSelectedChapters].sort().map((i) => mfChapters[i]);
                              const res = await apiRequest("POST", "/api/manuscript-forge/import-project", {
                                projectName: mfSelectedProject,
                                chapters: selected,
                              });
                              const data = await res.json();
                              toast({ title: `Imported "${mfSelectedProject}" with ${selected.length} chapter${selected.length !== 1 ? "s" : ""}` });
                              // Reset import state
                              setMfSelectedProject(null);
                              setMfChapters([]);
                              setMfSelectedChapters(new Set());
                              setMfImportOpen(false);
                              // Refresh project list
                              try {
                                const pr = await apiRequest("GET", "/api/projects");
                                const pd = await pr.json();
                                setProjects(pd.projects || []);
                              } catch {}
                            } catch (err: any) {
                              toast({ title: "Import failed", description: err.message, variant: "destructive" });
                            }
                            setMfImporting(false);
                          }}
                          className="mt-3 w-full bg-[#00d4aa] hover:bg-[#00b894] text-black font-semibold"
                        >
                          {mfImporting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                          Create Project
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
              )}
            </details>
          </div>

          {/* ── Location Forge Pipeline explainer (always visible, not an accordion) ── */}
          <div className="mt-8 rounded-lg p-4" style={{ background: "hsl(225,18%,6%)", border: "1px solid hsl(225,10%,12%)" }}>
            <div className="flex items-center gap-2 mb-2">
              <Ruler className="w-4 h-4" style={{ color: "hsl(163,100%,42%)" }} />
              <span className="text-sm font-semibold" style={{ color: "hsl(180,5%,88%)" }}>
                Location Forge Pipeline — What it does
              </span>
            </div>
            <p className="text-xs leading-relaxed mb-2" style={{ color: "hsl(220,5%,65%)" }}>
              The pipeline lives <em>inside</em> each project. Open any project above (or create a new one) to:
            </p>
            <ul className="text-xs leading-relaxed mb-3 space-y-1 list-disc list-inside" style={{ color: "hsl(220,5%,65%)" }}>
              <li><strong>Import Story Forge context</strong> — enrich this project with storyWorld, theme, tone, characters, and canon places from a Story Forge JSON, directly from the Build Location Profiles screen.</li>
              <li><strong>Develop candidate locations</strong> — scan your source text and automatically seed candidates from Story Forge canon places.</li>
              <li><strong>Rescan / redevelop</strong> — re-extract against new chapters, compare what changed, redevelop individual candidates.</li>
              <li><strong>Export canon locations</strong> — download approved locations as JSON for downstream Forge apps.</li>
            </ul>
            {!currentProjectId && (
              <p className="text-xs" style={{ color: "hsl(220,5%,52%)" }}>
                👆 Open or create a project above to access the pipeline tools.
              </p>
            )}
            {currentProjectId && (
              <div className="space-y-4" data-testid="pipeline-tools">
                <div className="text-xs font-mono" style={{ color: "hsl(163,100%,42%)" }}>
                  Pipeline tools for: {currentProjectName}
                </div>
                {(
                  <>
                    {/* Story Forge Manual Import */}
                    <div>
                      <div className="text-xs font-mono mb-1" style={{ color: "hsl(220,5%,52%)" }}>Paste Story Forge JSON context (storyWorld / theme / tone / characters / canonPlaces…)</div>
                      <textarea
                        value={lfStoryJson}
                        onChange={(e) => setLfStoryJson(e.target.value)}
                        placeholder='{"storyWorld":"Harrow County","theme":"decay","tone":"melancholic","characters":[{"name":"Sarah","locationAssociations":["Old Mill"]}],"canonPlaces":[{"name":"Smith House","aliases":["Smith residence"]}]}'
                        className="w-full h-24 text-xs font-mono p-2 rounded"
                        style={{ background: "hsl(225,15%,8%)", border: "1px solid hsl(225,10%,14%)", color: "hsl(180,5%,88%)" }}
                      />
                      <Button
                        size="sm"
                        disabled={lfBusy !== null}
                        onClick={async () => {
                          setLfBusy("import");
                          try {
                            const payload = lfStoryJson.trim() ? JSON.parse(lfStoryJson) : {};
                            const res = await apiRequest("POST", "/api/location-forge/story-forge/manual-import", { projectId: currentProjectId, payload });
                            await res.json();
                            toast({ title: "Story Forge context imported" });
                          } catch (err: any) {
                            toast({ title: "Import failed", description: err.message, variant: "destructive" });
                          }
                          setLfBusy(null);
                        }}
                        className="mt-2 bg-[#00d4aa] hover:bg-[#00b894] text-black"
                      >
                        {lfBusy === "import" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Import Story Context"}
                      </Button>
                    </div>

                    {/* Extract + Compare */}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        disabled={lfBusy !== null || !sourceText || sourceText.length < 50}
                        onClick={async () => {
                          setLfBusy("extract");
                          try {
                            const res = await apiRequest("POST", "/api/location-forge/extract", { projectId: currentProjectId, text: sourceText });
                            const data = await res.json();
                            toast({ title: `Extracted ${data.count} candidates` });
                            const list = await apiRequest("GET", `/api/location-forge/candidates?projectId=${currentProjectId}`);
                            setLfCandidates((await list.json()).candidates || []);
                          } catch (err: any) {
                            toast({ title: "Extract failed", description: err.message, variant: "destructive" });
                          }
                          setLfBusy(null);
                        }}
                      >
                        {lfBusy === "extract" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Scan Source Text → Candidates"}
                      </Button>
                      <Button
                        size="sm" variant="outline"
                        disabled={lfBusy !== null || !sourceText}
                        onClick={async () => {
                          setLfBusy("compare");
                          try {
                            const res = await apiRequest("POST", "/api/location-forge/compare", { projectId: currentProjectId, text: sourceText });
                            const data = await res.json();
                            setLfCompareResult(data);
                            toast({ title: `Compare: ${data.entries.length} entries, ${data.missingFromScript.length} missing` });
                          } catch (err: any) {
                            toast({ title: "Compare failed", description: err.message, variant: "destructive" });
                          }
                          setLfBusy(null);
                        }}
                      >
                        Rescan / Reimport Compare
                      </Button>
                      <Button
                        size="sm" variant="outline"
                        disabled={lfBusy !== null}
                        onClick={async () => {
                          setLfBusy("sync");
                          try {
                            const res = await apiRequest("POST", "/api/location-forge/sync-developed", { projectId: currentProjectId });
                            const data = await res.json();
                            toast({ title: `Synced ${data.synced} developed locations to candidate table` });
                            const list = await apiRequest("GET", `/api/location-forge/candidates?projectId=${currentProjectId}`);
                            setLfCandidates((await list.json()).candidates || []);
                          } catch (err: any) {
                            toast({ title: "Sync failed", description: err.message, variant: "destructive" });
                          }
                          setLfBusy(null);
                        }}
                      >
                        Sync Developed → Candidates
                      </Button>
                      <Button
                        size="sm" variant="outline"
                        onClick={async () => {
                          try {
                            const res = await apiRequest("GET", `/api/location-forge/export/locations?projectId=${currentProjectId}&download=1&includeDeveloped=1`);
                            const blob = await res.blob();
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = "locations.json";
                            a.click();
                            URL.revokeObjectURL(url);
                          } catch (err: any) {
                            toast({ title: "Export failed", description: err.message, variant: "destructive" });
                          }
                        }}
                      >
                        Export Approved Locations JSON
                      </Button>
                    </div>

                    {/* Compare result summary */}
                    {lfCompareResult && (
                      <div className="text-xs p-3 rounded" style={{ background: "hsl(225,15%,8%)", border: "1px solid hsl(225,10%,14%)", color: "hsl(180,5%,75%)" }}>
                        <div className="font-mono mb-1">Compare Summary</div>
                        <div>New: {lfCompareResult.entries.filter((e: any) => e.status === "new").length} · Alias: {lfCompareResult.entries.filter((e: any) => e.status === "alias").length} · Duplicate: {lfCompareResult.entries.filter((e: any) => e.status === "duplicate").length} · Needs-dev: {lfCompareResult.entries.filter((e: any) => e.status === "needs-development").length}</div>
                        {lfCompareResult.missingFromScript.length > 0 && (
                          <div className="mt-1 text-amber-400">Missing from new scan: {lfCompareResult.missingFromScript.join(", ")}</div>
                        )}
                      </div>
                    )}

                    {/* Candidate list */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-mono" style={{ color: "hsl(220,5%,52%)" }}>Candidates ({lfCandidates.length})</div>
                        <select
                          value={lfFilterStatus}
                          onChange={(e) => setLfFilterStatus(e.target.value)}
                          className="text-xs px-2 py-1 rounded"
                          style={{ background: "hsl(225,15%,8%)", border: "1px solid hsl(225,10%,14%)", color: "hsl(180,5%,88%)" }}
                        >
                          <option value="">All</option>
                          <option value="candidate">Candidate</option>
                          <option value="developed">Developed</option>
                          <option value="approved">Approved</option>
                          <option value="canon">Canon</option>
                          <option value="archived">Archived</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </div>
                      <div className="max-h-96 overflow-y-auto space-y-1">
                        {lfCandidates
                          .filter((c: any) => !lfFilterStatus || c.status === lfFilterStatus)
                          .map((c: any) => (
                            <div key={c.id} className="flex items-center gap-2 px-2 py-2 rounded text-xs"
                              style={{ background: "hsl(225,15%,8%)", border: "1px solid hsl(225,10%,14%)", color: "hsl(180,5%,88%)" }}>
                              <span className="font-semibold flex-1 truncate">{c.name}</span>
                              <span className="font-mono text-[10px]" style={{ color: "hsl(220,5%,52%)" }}>
                                {c.type} · {c.category} · conf {Math.round((c.confidence || 0) * 100)}%
                              </span>
                              <span className="font-mono text-[10px] px-1 py-0.5 rounded"
                                style={{
                                  background: c.status === "approved" || c.status === "canon" ? "hsl(163,60%,20%)"
                                    : c.status === "rejected" || c.status === "archived" ? "hsl(0,30%,20%)"
                                    : "hsl(225,10%,18%)",
                                  color: "hsl(180,5%,88%)"
                                }}>{c.status}</span>
                              <button
                                className="text-[10px] underline"
                                style={{ color: "hsl(163,100%,42%)" }}
                                onClick={async () => {
                                  await apiRequest("POST", `/api/location-forge/candidates/${c.id}/redevelop`, {});
                                  const list = await apiRequest("GET", `/api/location-forge/candidates?projectId=${currentProjectId}`);
                                  setLfCandidates((await list.json()).candidates || []);
                                  toast({ title: `Redeveloped ${c.name}` });
                                }}
                              >Redevelop</button>
                              <button
                                className="text-[10px] underline"
                                style={{ color: "hsl(163,100%,42%)" }}
                                onClick={async () => {
                                  await apiRequest("PATCH", `/api/location-forge/candidates/${c.id}`, { status: "approved" });
                                  const list = await apiRequest("GET", `/api/location-forge/candidates?projectId=${currentProjectId}`);
                                  setLfCandidates((await list.json()).candidates || []);
                                }}
                              >Approve</button>
                              <button
                                className="text-[10px] underline"
                                style={{ color: "hsl(0,70%,60%)" }}
                                onClick={async () => {
                                  await apiRequest("PATCH", `/api/location-forge/candidates/${c.id}`, { status: "rejected" });
                                  const list = await apiRequest("GET", `/api/location-forge/candidates?projectId=${currentProjectId}`);
                                  setLfCandidates((await list.json()).candidates || []);
                                }}
                              >Reject</button>
                            </div>
                          ))}
                        {lfCandidates.length === 0 && (
                          <div className="text-xs text-center py-4" style={{ color: "hsl(220,5%,52%)" }}>No candidates yet — run a scan or sync developed items.</div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* FAQ & Cross-Promotion */}
          <div className="mt-12 mb-8">
            <h2 className="text-sm font-mono font-semibold tracking-wider uppercase mb-4" style={{ color: "hsl(220,5%,52%)" }}>
              Frequently Asked Questions
            </h2>
            <div className="space-y-2">
              {[
                {
                  q: "What is Location Forge?",
                  a: "Location Forge is an AI-powered location development tool for writers, screenwriters, filmmakers, and game designers. Upload a manuscript or describe a world, and AI will scan for locations, build detailed 10-section profiles covering geography, history, mood, and production notes, then generate visual studies from professional camera angles."
                },
                {
                  q: "What visual studies can I generate?",
                  a: "Location Forge offers 36 visual panels organized into 6 tabs: Camera Shots (establishing, wide, medium, close-up, bird's eye, worm's eye, dutch angle), Lighting & Time (golden hour, blue hour, night, backlit), Weather & Atmosphere (rain, fog, storm, snow), Production Design (architectural detail, interior, entry, key props), Mood & Narrative (empty, populated, aftermath, danger zone), and Director's Vision (custom shots, emergency, power failure, decades later). Every image panel also includes a copyable Midjourney-ready prompt, so you can generate additional reference images in external tools like Midjourney, Leonardo, or Stable Diffusion."
                },
                {
                  q: "How does the anchor system work?",
                  a: "The Establishing Shot generates first as the visual anchor. All subsequent panels reference it to maintain consistent architecture, materials, color palette, and environmental details across every generated image."
                },
                {
                  q: "What art styles are available?",
                  a: "Choose from 11 art styles: Cinematic Concept Art, Photorealistic, Pixar/3D Animation, Anime, 3D Render/Game Art, 2D Illustration, Comic Book, Watercolor, Oil Painting, Concept Art/Matte, and Custom/AI-Generated — where you describe any movie, genre, or aesthetic and AI creates the style directive."
                },
                {
                  q: "What file formats can I upload?",
                  a: "Location Forge accepts .docx (Word) and .txt files. You can also paste text directly."
                },
                {
                  q: "What AI providers are supported?",
                  a: "For text analysis and location profiling, Location Forge supports OpenAI (ChatGPT/GPT-4) and Google AI (Gemini). For image generation, we currently support OpenAI (DALL-E 3) and Google AI (Gemini image generation). During your 7-day trial, the platform API key covers all generation at no cost."
                },
                {
                  q: "Can I export my work?",
                  a: "Yes — export individual locations or all developed locations as Word documents (.docx). Download all visual images as a ZIP file."
                },
                {
                  q: "Why am I getting 502 errors?",
                  a: "A 502 error means the server is temporarily overloaded, usually from processing large images. Wait 30 seconds and try again. If it persists: try generating one image at a time instead of 'Generate All', use a simpler art style, or reduce the number of reference images. If the issue continues, submit a support ticket from your Account page."
                },
                {
                  q: "What should I do if image generation fails?",
                  a: "First, check your API key is valid — Google AI keys start with 'AIza' and OpenAI keys start with 'sk-'. If using the trial, the platform key may be rate-limited; wait a minute and retry. Try switching to a different art style or simplifying the location description. If you see repeated failures, go to Account > Support to report the issue."
                },
                {
                  q: "What happens after the free trial?",
                  a: "After the 7-day free trial, subscribe at $29.99/month or $299/year to continue. Your projects and data are preserved."
                },
                {
                  q: "Why do I need my own API key on the paid plan?",
                  a: "After your 7-day trial, you'll need your own API key from OpenAI or Google AI. This is by design — it keeps your subscription cost low ($29.99/mo vs $100+/mo if we bundled API costs) and is actually more cost-effective for you. Most users spend $5-15/month on API usage directly, which is far less than what a bundled service would charge. You only pay for what you use, and you maintain full control over your API spending."
                },
                {
                  q: "How many images can I generate during the free trial?",
                  a: "During your 7-day trial, image generation uses our shared platform API key (Google AI). You can typically generate 25-50 images per day, but availability depends on overall platform usage since the quota is shared across all trial users. If you hit a rate limit, wait a few minutes and try again. For the most reliable experience, generate images one at a time rather than 'Generate All'. After your trial, using your own API key gives you a dedicated quota with no sharing."
                },
                {
                  q: "What are the rate limits with my own API key?",
                  a: "Rate limits depend on your provider and tier level. Google AI free tier: ~500 images/day, 10-15 per minute, resets at midnight Pacific. Google AI Tier 1 (link a billing account — no upfront cost, no minimum spend): 2,000+ images/day, 150-300 per minute — a massive upgrade for $0. Google AI Tier 2 ($250 cumulative spend): 1,000+ per minute, essentially unlimited for Forge use. Cost is ~$0.02-0.04 per image. OpenAI DALL-E 3: Tier 1 ($5 paid) = 5 images/min, Tier 2 ($50) = 7/min, Tier 4 ($250) = 15/min. Cost is $0.04-0.12 per image. We recommend Google AI for the best value — the free tier alone covers most users."
                },
                {
                  q: "Which API provider should I choose?",
                  a: "Google AI (Gemini) is the best value for most users. The free tier gives you ~500 images/day at no cost, and linking a billing account (no upfront payment) jumps you to 2,000+/day. Image cost is $0.02-0.04 each. OpenAI (DALL-E 3) produces excellent results but is more expensive ($0.04-0.12/image) with stricter rate limits (5-15 images/minute even on high tiers). For heavy use, Google AI Tier 1 is the clear winner — unlimited-feeling generation for pennies per image."
                },
                {
                  q: "How can I maximize my image generation?",
                  a: "Generate the Establishing Shot first — it becomes the visual anchor for all other panels, so getting it right saves regeneration time. Use 'Generate All' during off-peak hours (evening/night Pacific Time) for better availability. If you're on Google AI's free tier, linking a Cloud billing account (no upfront cost) gives you 4x the daily quota. Cinematic and Concept Art styles tend to produce the most consistent single-image results."
                },
                {
                  q: "Is my API key stored?",
                  a: "No. Your API key is sent directly to the provider for each request and is never stored on our servers."
                },
              ].map((item, i) => (
                <details key={i} className="group rounded-lg" style={{ background: "hsl(225,18%,6%)", border: "1px solid hsl(225,10%,12%)" }}>
                  <summary className="flex items-center justify-between px-4 py-3 cursor-pointer text-xs font-medium select-none" style={{ color: "hsl(180,5%,88%)" }}>
                    {item.q}
                    <ChevronRight className="w-3.5 h-3.5 transition-transform group-open:rotate-90 shrink-0 ml-2" style={{ color: "hsl(220,5%,40%)" }} />
                  </summary>
                  <div className="px-4 pb-3 text-xs leading-relaxed" style={{ color: "hsl(220,5%,65%)" }}>
                    {item.a}
                  </div>
                </details>
              ))}
            </div>

            {/* Cross-Promotion: The Forge Suite */}
            <div className="mt-12">
              <h2 className="text-sm font-mono font-semibold tracking-wider uppercase mb-2 text-muted-foreground">
                The Forge Suite
              </h2>
              <p className="text-xs text-muted-foreground/70 mb-4">
                Location Forge is part of a complete AI production toolkit by Little Red Apple Productions.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { name: "Character Forge", url: "https://character.littleredappleproductions.com", icon: Users, desc: "AI-powered character development with multi-panel portrait studies and 11 art styles." },
                  { name: "Manuscript Forge", url: "https://manuscript.littleredappleproductions.com", icon: FileText, desc: "Production readiness analysis for screenplays — story structure, character arcs, pacing, and dialogue." },
                  { name: "Props Forge", url: "https://props.littleredappleproductions.com", icon: Box, desc: "AI-powered prop identification and visual development from manuscript analysis." },
                  { name: "Scene Forge", url: "https://scene.littleredappleproductions.com", icon: Clapperboard, desc: "Scene breakdown and shot lists with 10-section profiles — lighting, sound, VFX, and emotional mapping." },
                  { name: "Story Forge", url: "https://story-forge.littleredappleproductions.com", icon: BookOpen, desc: "AI-assisted story development and screenplay writing with structured narrative tools." },
                  { name: "Sound Forge", url: "https://github.com/wbraddock-edu/sound-forge", icon: Mic, desc: "AI-powered sound design — dialogue, ambience, foley, music cues, and scene sound profiles." },
                  { name: "Production Forge", url: "https://github.com/wbraddock-edu/production-forge", icon: Video, desc: "Unified production pipeline — clip generation, voice performance, and motion animation." },
                  { name: "Prompt Cinematographer", url: "https://github.com/wbraddock-edu/prompt-cinematographer", icon: Camera, desc: "Shot translation engine — converts cinematography language into AI video platform prompts." },
                ].map((mod) => (
                  <a
                    key={mod.name}
                    href={mod.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-lg p-4 bg-card border border-border hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <mod.icon className="w-4 h-4 text-primary" />
                      <span className="text-xs font-semibold text-foreground">{mod.name}</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      {mod.desc}
                    </p>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ── Account / Subscription Screen ──
  if (appScreen === "account") {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "hsl(225,15%,4%)" }}>
        <div className="h-12 flex items-center px-4 gap-3" style={{ borderBottom: "1px solid hsl(225,10%,12%)" }}>
          <button onClick={() => setAppScreen("projects")} className="p-1 rounded" style={{ color: "hsl(220,5%,52%)" }}>
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono font-semibold tracking-wider uppercase" style={{ color: "hsl(163,100%,42%)" }}>LOCATION FORGE</span>
          <span className="text-xs" style={{ color: "hsl(220,5%,30%)" }}>|</span>
          <span className="text-xs font-mono" style={{ color: "hsl(220,5%,52%)" }}>Account</span>
          <div className="flex-1" />
          <button onClick={handleLogout} className="text-[10px] font-mono px-3 py-1 rounded" style={{ color: "hsl(220,5%,52%)", border: "1px solid hsl(225,10%,14%)" }}>Sign Out</button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 py-8">
            {/* Profile Card */}
            <div className="rounded-lg p-6 mb-6" style={{ background: "hsl(225,18%,6%)", border: "1px solid hsl(225,10%,12%)" }}>
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold" style={{ background: "hsla(163,100%,42%,0.12)", color: "hsl(163,100%,42%)" }}>
                  {authUser?.displayName?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-lg font-semibold" style={{ color: "hsl(180,5%,88%)" }}>{authUser?.displayName}</h1>
                  <p className="text-sm font-mono" style={{ color: "hsl(220,5%,52%)" }}>{authUser?.email}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {subscriptionStatus?.isAdmin ? (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono" style={{ background: "hsla(280,80%,65%,0.08)", color: "hsl(280,80%,65%)" }}>
                        <Crown className="w-3 h-3" /> Creator
                      </div>
                    ) : subscriptionStatus?.subscriptionActive ? (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono" style={{ background: "hsla(163,100%,42%,0.08)", color: "hsl(163,100%,42%)" }}>
                        <CheckCircle2 className="w-3 h-3" /> Active Subscriber
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono" style={{ background: "hsla(163,100%,42%,0.08)", color: "hsl(163,100%,42%)" }}>
                        <Clock className="w-3 h-3" /> Trial · {subscriptionStatus?.trialDaysRemaining ?? 7} day{(subscriptionStatus?.trialDaysRemaining ?? 7) !== 1 ? "s" : ""} left
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Upgrade Section */}
            {subscriptionStatus && !subscriptionStatus.subscriptionActive && !subscriptionStatus.isAdmin && (
              <div className="rounded-lg overflow-hidden mb-6" style={{ border: "1px solid hsl(225,10%,12%)" }}>
                <div className="p-5" style={{ background: "linear-gradient(135deg, hsla(163,100%,42%,0.06), hsla(163,100%,42%,0.02))" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="w-4 h-4" style={{ color: "hsl(163,100%,42%)" }} />
                    <h2 className="text-sm font-semibold" style={{ color: "hsl(180,5%,88%)" }}>
                      {!subscriptionStatus.canAccess ? "Your trial has ended" : "Upgrade to Location Forge Pro"}
                    </h2>
                  </div>
                  <p className="text-xs" style={{ color: "hsl(220,5%,60%)" }}>
                    {!subscriptionStatus.canAccess
                      ? "Subscribe to continue developing locations with AI-powered profiles and visual studies."
                      : "Unlock unlimited location development after your trial ends."
                    }
                  </p>
                </div>
                <div className="p-5">
                  <div className="text-center mb-4">
                    <span className="text-3xl font-bold font-mono" style={{ color: "hsl(163,100%,42%)" }}>$29.99</span>
                    <span className="text-sm font-mono" style={{ color: "hsl(220,5%,40%)" }}>/month</span>
                  </div>
                  <div className="space-y-2 mb-5">
                    {["Unlimited location scanning & development", "AI-powered 10-section location profiles", "6-panel visual location studies", "Multi-project workspace with auto-save", "DOCX export & ZIP download", "10 art styles with reference images"].map((f, i) => (
                      <div key={i} className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 shrink-0" style={{ color: "hsl(163,100%,42%)" }} /><span className="text-xs" style={{ color: "hsl(220,5%,65%)" }}>{f}</span></div>
                    ))}
                  </div>
                  <Button className="w-full h-10 font-mono font-semibold text-sm bg-[#00d4aa] hover:bg-[#00d4aa]/90 text-black" onClick={() => handleCheckout("monthly")}>
                    <Zap className="w-4 h-4 mr-2" /> Subscribe — $29.99/mo
                  </Button>
                  <p className="text-[9px] font-mono text-center mt-3" style={{ color: "hsl(220,5%,30%)" }}>Secure payment via Stripe. Cancel anytime.</p>
                </div>
              </div>
            )}

            {/* Google AI API Key */}
            <div className="rounded-lg p-5 mb-6" style={{ background: "hsl(225,18%,6%)", border: "1px solid hsl(225,10%,12%)" }}>
              <div className="flex items-center gap-2 mb-3">
                <KeyRound className="w-4 h-4" style={{ color: "hsl(163,100%,42%)" }} />
                <h2 className="text-xs font-mono font-semibold tracking-wider uppercase" style={{ color: "hsl(220,5%,52%)" }}>Google AI API Key</h2>
              </div>
              <p className="text-xs leading-relaxed mb-3" style={{ color: "hsl(220,5%,58%)" }}>
                Your own Google AI API key is required to generate location profiles and images.
                Get a key at{" "}
                <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener" className="underline" style={{ color: "hsl(163,100%,42%)" }}>aistudio.google.com</a>.
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="AIza..."
                    className="w-full h-9 px-3 text-xs font-mono rounded"
                    style={{ background: "hsl(225,15%,4%)", border: "1px solid hsl(225,10%,14%)", color: "hsl(180,5%,88%)", outline: "none" }}
                  />
                  <button type="button" onClick={() => setShowApiKey(!showApiKey)} className="absolute right-2 top-1/2 -translate-y-1/2" style={{ color: "hsl(220,5%,40%)" }}>
                    {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              {apiKey && (
                <div className="flex items-center gap-1.5 mt-2">
                  <CheckCircle2 className="w-3 h-3" style={{ color: "hsl(163,100%,42%)" }} />
                  <span className="text-[10px] font-mono" style={{ color: "hsl(163,100%,42%)" }}>Key configured — auto-saved</span>
                </div>
              )}
            </div>

            {/* Account Details */}
            <div className="rounded-lg p-5" style={{ background: "hsl(225,18%,6%)", border: "1px solid hsl(225,10%,12%)" }}>
              <h2 className="text-xs font-mono font-semibold tracking-wider uppercase mb-3" style={{ color: "hsl(220,5%,52%)" }}>Account Details</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-1.5" style={{ borderBottom: "1px solid hsl(225,10%,10%)" }}>
                  <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "hsl(220,5%,40%)" }}>Name</span>
                  <span className="text-xs font-mono" style={{ color: "hsl(180,5%,88%)" }}>{authUser?.displayName}</span>
                </div>
                <div className="flex items-center justify-between py-1.5" style={{ borderBottom: "1px solid hsl(225,10%,10%)" }}>
                  <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "hsl(220,5%,40%)" }}>Email</span>
                  <span className="text-xs font-mono" style={{ color: "hsl(180,5%,88%)" }}>{authUser?.email}</span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "hsl(220,5%,40%)" }}>Status</span>
                  <span className="text-xs font-mono" style={{ color: "hsl(163,100%,42%)" }}>{subscriptionStatus?.isAdmin ? "Creator" : subscriptionStatus?.subscriptionActive ? "Active" : `Trial · ${subscriptionStatus?.trialDaysRemaining ?? 7}d`}</span>
                </div>
              </div>
            </div>

            {/* Support Section */}
            <div className="rounded-lg overflow-hidden mt-6" style={{ background: "hsl(225,18%,6%)", border: "1px solid hsl(225,10%,12%)" }}>
              <div className="flex items-center gap-2 px-5 pt-5 pb-3">
                <MessageCircle className="w-4 h-4" style={{ color: "hsl(163,100%,42%)" }} />
                <h2 className="text-xs font-mono font-semibold tracking-wider uppercase" style={{ color: "hsl(220,5%,52%)" }}>Support</h2>
              </div>

              {/* Tab bar */}
              <div className="flex" style={{ borderBottom: "1px solid hsl(225,10%,12%)" }}>
                {([
                  { id: "ai" as const, label: "AI Assistant", locked: !subscriptionStatus?.isAdmin && !subscriptionStatus?.subscriptionActive },
                  { id: "email" as const, label: "Email Support", locked: false },
                  { id: "tickets" as const, label: "My Tickets", locked: false },
                ]).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => { setSupportTab(tab.id); if (tab.id === "tickets") loadSupportTickets(); }}
                    className="flex-1 text-[10px] font-mono py-2.5 transition-colors"
                    style={{
                      color: supportTab === tab.id ? "hsl(163,100%,42%)" : "hsl(220,5%,45%)",
                      borderBottom: supportTab === tab.id ? "2px solid hsl(163,100%,42%)" : "2px solid transparent",
                      background: "transparent",
                    }}
                  >
                    {tab.label}{tab.locked ? " 🔒" : ""}
                  </button>
                ))}
              </div>

              <div className="p-5">
                {/* AI Assistant Tab */}
                {supportTab === "ai" && (
                  <div>
                    {(!subscriptionStatus?.isAdmin && !subscriptionStatus?.subscriptionActive) ? (
                      <div className="text-center py-6">
                        <Crown className="w-8 h-8 mx-auto mb-3" style={{ color: "hsl(163,100%,42%)" }} />
                        <p className="text-xs mb-1" style={{ color: "hsl(180,5%,88%)" }}>AI Support Assistant</p>
                        <p className="text-[11px] mb-4" style={{ color: "hsl(220,5%,55%)" }}>Available to paid subscribers. Upgrade to get instant AI-powered help.</p>
                        <button
                          onClick={() => handleCheckout("monthly")}
                          className="text-xs font-mono px-4 py-2 rounded"
                          style={{ background: "hsl(163,100%,42%)", color: "#000" }}
                        >Upgrade — $29.99/mo</button>
                      </div>
                    ) : (
                      <div>
                        {/* Chat history */}
                        {chatHistory.length === 0 && (
                          <div className="text-center py-4 mb-4">
                            <p className="text-[11px]" style={{ color: "hsl(220,5%,50%)" }}>Ask a question about Location Forge — features, troubleshooting, errors, billing.</p>
                          </div>
                        )}
                        {chatHistory.length > 0 && (
                          <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                            {chatHistory.map((msg, i) => (
                              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                <div
                                  className="max-w-[85%] rounded-lg px-3 py-2 text-[11px] leading-relaxed"
                                  style={{
                                    background: msg.role === "user" ? "hsla(163,100%,42%,0.12)" : "hsl(225,15%,9%)",
                                    color: msg.role === "user" ? "hsl(163,100%,42%)" : "hsl(180,5%,88%)",
                                    border: "1px solid " + (msg.role === "user" ? "hsla(163,100%,42%,0.2)" : "hsl(225,10%,14%)"),
                                  }}
                                >
                                  {msg.text}
                                </div>
                              </div>
                            ))}
                            {askingSupport && (
                              <div className="flex justify-start">
                                <div className="px-3 py-2 rounded-lg" style={{ background: "hsl(225,15%,9%)", border: "1px solid hsl(225,10%,14%)" }}>
                                  <Loader2 className="w-3 h-3 animate-spin" style={{ color: "hsl(163,100%,42%)" }} />
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Input
                            value={supportQuestion}
                            onChange={(e) => setSupportQuestion(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAskSupport(); } }}
                            placeholder="Ask about features, errors, or billing..."
                            className="flex-1 h-9 text-xs font-mono"
                            style={{ background: "hsl(225,15%,4%)", border: "1px solid hsl(225,10%,14%)", color: "hsl(180,5%,88%)" }}
                            disabled={askingSupport}
                          />
                          <button
                            onClick={handleAskSupport}
                            disabled={askingSupport || !supportQuestion.trim()}
                            className="h-9 w-9 flex items-center justify-center rounded shrink-0"
                            style={{ background: "hsl(163,100%,42%)", color: "#000", opacity: (askingSupport || !supportQuestion.trim()) ? 0.5 : 1 }}
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Email Support Tab */}
                {supportTab === "email" && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-mono uppercase tracking-wider block mb-1" style={{ color: "hsl(220,5%,40%)" }}>Category</label>
                      <Select value={supportCategory} onValueChange={setSupportCategory}>
                        <SelectTrigger className="h-9 text-xs font-mono" style={{ background: "hsl(225,15%,4%)", border: "1px solid hsl(225,10%,14%)", color: "hsl(180,5%,88%)" }}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General Question</SelectItem>
                          <SelectItem value="bug">Bug Report</SelectItem>
                          <SelectItem value="image_generation">Image Generation Issue</SelectItem>
                          <SelectItem value="502_error">502 / Server Error</SelectItem>
                          <SelectItem value="billing">Billing / Subscription</SelectItem>
                          <SelectItem value="api_key">API Key Issue</SelectItem>
                          <SelectItem value="feature_request">Feature Request</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-[10px] font-mono uppercase tracking-wider block mb-1" style={{ color: "hsl(220,5%,40%)" }}>Subject</label>
                      <Input
                        value={supportSubject}
                        onChange={(e) => setSupportSubject(e.target.value)}
                        placeholder="Brief description of your issue"
                        className="h-9 text-xs font-mono"
                        style={{ background: "hsl(225,15%,4%)", border: "1px solid hsl(225,10%,14%)", color: "hsl(180,5%,88%)" }}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono uppercase tracking-wider block mb-1" style={{ color: "hsl(220,5%,40%)" }}>Message</label>
                      <Textarea
                        value={supportMessage}
                        onChange={(e) => setSupportMessage(e.target.value)}
                        placeholder="Describe your issue in detail. Include any error messages you saw."
                        rows={5}
                        className="text-xs font-mono resize-none"
                        style={{ background: "hsl(225,15%,4%)", border: "1px solid hsl(225,10%,14%)", color: "hsl(180,5%,88%)" }}
                      />
                    </div>
                    <button
                      onClick={handleSubmitTicket}
                      disabled={submittingTicket || !supportSubject.trim() || !supportMessage.trim()}
                      className="w-full h-9 text-xs font-mono font-semibold rounded flex items-center justify-center gap-2"
                      style={{
                        background: "hsl(163,100%,42%)",
                        color: "#000",
                        opacity: (submittingTicket || !supportSubject.trim() || !supportMessage.trim()) ? 0.5 : 1,
                      }}
                    >
                      {submittingTicket ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      {submittingTicket ? "Submitting..." : "Submit Ticket"}
                    </button>
                    <p className="text-[10px] text-center" style={{ color: "hsl(220,5%,35%)" }}>We respond within 24–48 hours.</p>
                  </div>
                )}

                {/* My Tickets Tab */}
                {supportTab === "tickets" && (
                  <div>
                    {supportTickets.length === 0 ? (
                      <div className="text-center py-6">
                        <TicketCheck className="w-8 h-8 mx-auto mb-3" style={{ color: "hsl(220,5%,30%)" }} />
                        <p className="text-xs" style={{ color: "hsl(220,5%,45%)" }}>No support tickets yet.</p>
                        <button
                          onClick={() => setSupportTab("email")}
                          className="text-[10px] font-mono mt-2 underline"
                          style={{ color: "hsl(163,100%,42%)" }}
                        >Submit your first ticket</button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {supportTickets.map((ticket) => (
                          <div key={ticket.id} className="rounded p-3" style={{ background: "hsl(225,15%,4%)", border: "1px solid hsl(225,10%,10%)" }}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-mono font-semibold" style={{ color: "hsl(180,5%,88%)" }}>#{ticket.id} — {ticket.subject}</span>
                              <span
                                className="text-[9px] font-mono px-2 py-0.5 rounded-full"
                                style={{
                                  background: ticket.status === "open" ? "hsla(163,100%,42%,0.1)" : "hsla(220,5%,40%,0.1)",
                                  color: ticket.status === "open" ? "hsl(163,100%,42%)" : "hsl(220,5%,55%)",
                                }}
                              >
                                {ticket.status}
                              </span>
                            </div>
                            <p className="text-[10px] leading-relaxed" style={{ color: "hsl(220,5%,55%)" }}>{ticket.message.substring(0, 120)}{ticket.message.length > 120 ? "..." : ""}</p>
                            <p className="text-[9px] mt-1 font-mono" style={{ color: "hsl(220,5%,35%)" }}>{ticket.category} · {new Date(ticket.created_at).toLocaleDateString()}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 text-center">
              <p className="text-[10px]" style={{ color: "hsl(220,5%,30%)" }}>
                Created with the Assistance of AI &copy; 2026 <a href="https://littleredappleproductions.com" target="_blank" rel="noopener noreferrer" style={{ color: "hsla(163,100%,42%,0.6)" }} className="hover:underline">Little Red Apple Productions</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Main App (inside a project) ──
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src="./location-forge-logo.png"
              alt="Little Red Apple Productions"
              className="w-8 h-8 rounded-sm object-contain shrink-0"
            />
            <div className="flex items-baseline gap-0" data-testid="text-app-title">
              <span className="font-sans font-bold text-lg tracking-tight">Location Forge</span>
              {currentProjectName && (
                <span className="text-[11px] text-muted-foreground ml-1.5">— {currentProjectName}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Dashboard Menu */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDashboardMenu(!showDashboardMenu)}
                className={showDashboardMenu ? "bg-primary/10 text-primary" : ""}
                data-testid="button-dashboard-menu"
              >
                <LayoutGrid className="w-4 h-4 mr-1.5" />
                Dashboard
              </Button>
              {showDashboardMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowDashboardMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 w-64 z-50 rounded-lg overflow-hidden shadow-xl"
                    style={{ background: "hsl(225,18%,8%)", border: "1px solid hsl(225,10%,14%)" }}>
                    {/* Current Project */}
                    <div className="px-3 pt-3 pb-2">
                      <p className="text-[9px] font-mono uppercase tracking-wider mb-1.5" style={{ color: "hsl(220,5%,40%)" }}>Current Project</p>
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded" style={{ background: "hsla(163,100%,42%,0.06)" }}>
                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "hsl(163,100%,42%)" }} />
                        <span className="text-xs font-mono truncate" style={{ color: "hsl(163,100%,42%)" }}>{currentProjectName}</span>
                      </div>
                    </div>
                    <div style={{ borderTop: "1px solid hsl(225,10%,12%)" }} />
                    {/* All Projects */}
                    <button
                      onClick={() => { setShowDashboardMenu(false); handleBackToProjects(); }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-mono transition-colors hover:bg-[hsl(225,12%,12%)]"
                      style={{ color: "hsl(220,5%,65%)" }}
                      data-testid="button-all-projects"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      All Projects
                      <span className="ml-auto text-[10px] font-mono" style={{ color: "hsl(220,5%,40%)" }}>{projects.length}</span>
                    </button>
                    {/* New Project shortcut */}
                    <button
                      onClick={() => { setShowDashboardMenu(false); handleBackToProjects(); }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-mono transition-colors hover:bg-[hsl(225,12%,12%)]"
                      style={{ color: "hsl(220,5%,65%)", borderTop: "1px solid hsl(225,10%,12%)" }}
                      data-testid="button-new-project-menu"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      New Project
                    </button>
                  </div>
                </>
              )}
            </div>
            {step === "results" && (
              <Button variant="ghost" size="sm" onClick={handleBackToDashboard} data-testid="button-back-dashboard">
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                Locations
              </Button>
            )}
            {step === "dashboard" && (
              <Button variant="ghost" size="sm" onClick={handleReset} data-testid="button-new-scan">
                New
              </Button>
            )}
            <span className="text-xs text-muted-foreground">{authUser?.displayName}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="w-8 h-8"
              data-testid="button-theme-toggle"
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* ── STEP: Upload & Configure ── */}
        {(step === "upload" || step === "configure") && (
          <div className="space-y-6">
            {/* Hero */}
            <div className="text-center space-y-2 pb-2">
              <h1 className="font-sans font-bold text-xl">Build Location Profiles</h1>
              <p className="text-muted-foreground text-sm max-w-lg mx-auto">
                Upload a story manuscript or location description. The AI will scan for locations,
                then you can develop complete 10-section profiles with visual studies for any or all of them.
              </p>
            </div>

            {/* ── Import from Story Forge (in-project, always visible) ── */}
            {currentProjectId && (
              <Card data-testid="card-story-forge-import">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-primary" />
                    Import from Story Forge
                    <Badge variant="secondary" className="ml-2 text-[10px] font-normal">Optional</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Pull a manuscript from a Story Forge project as your source text, or paste a Story Forge
                    JSON context (storyWorld / theme / tone / characters / canon places) to enrich this project
                    — candidate locations, character associations, and canon places will seed the pipeline.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant={inProjSfMode === "chapters" ? "default" : "secondary"}
                      onClick={async () => {
                        const next = inProjSfMode === "chapters" ? "closed" : "chapters";
                        setInProjSfMode(next);
                        if (next === "chapters" && inProjSfProjects.length === 0) {
                          setInProjSfProjectsLoading(true);
                          try {
                            const res = await apiRequest("GET", "/api/story-forge/projects");
                            const data = await res.json();
                            setInProjSfProjects(data.projects || []);
                          } catch { /* silent */ }
                          setInProjSfProjectsLoading(false);
                        }
                      }}
                      data-testid="button-inproj-sf-chapters"
                    >
                      <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                      Import Chapters → Source Text
                    </Button>
                    <Button
                      size="sm"
                      variant={inProjSfMode === "json" ? "default" : "secondary"}
                      onClick={() => setInProjSfMode(inProjSfMode === "json" ? "closed" : "json")}
                      data-testid="button-inproj-sf-json"
                    >
                      <FileText className="w-3.5 h-3.5 mr-1.5" />
                      Paste Story Forge JSON Context
                    </Button>
                  </div>

                  {inProjSfMode === "chapters" && (
                    <div className="rounded-lg p-3 bg-muted/30 border border-border">
                      {inProjSfProjectsLoading ? (
                        <div className="text-center py-6"><Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" /></div>
                      ) : inProjSfProjects.length === 0 ? (
                        <p className="text-xs text-center py-4 text-muted-foreground">
                          No Story Forge projects found for your account. Sign in to Story Forge and create/save a project first.
                        </p>
                      ) : !inProjSfSelectedProject ? (
                        <div>
                          <p className="text-xs mb-2 text-muted-foreground">Select a Story Forge project:</p>
                          <div className="grid gap-2">
                            {inProjSfProjects.map((p) => (
                              <button
                                key={p.id}
                                onClick={async () => {
                                  setInProjSfSelectedProject(p.name);
                                  setInProjSfSelectedChapters(new Set());
                                  setInProjSfChaptersLoading(true);
                                  try {
                                    const res = await apiRequest("GET", `/api/story-forge/chapters?project=${encodeURIComponent(p.name)}`);
                                    const data = await res.json();
                                    setInProjSfChapters(data.chapters || []);
                                  } catch { /* silent */ }
                                  setInProjSfChaptersLoading(false);
                                }}
                                className="flex items-center gap-2 px-3 py-2 rounded-md text-left text-sm bg-background border border-border hover:border-primary/50 transition-colors"
                                data-testid={`button-inproj-sf-project-${p.id}`}
                              >
                                <BookOpen className="w-3.5 h-3.5 shrink-0 text-primary" />
                                <span className="truncate">{p.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => { setInProjSfSelectedProject(null); setInProjSfChapters([]); setInProjSfSelectedChapters(new Set()); }}
                                className="text-xs underline text-primary"
                              >
                                &larr; Back
                              </button>
                              <span className="text-xs font-mono text-muted-foreground">{inProjSfSelectedProject}</span>
                            </div>
                            <span className="text-[10px] font-mono text-muted-foreground">{inProjSfSelectedChapters.size} selected</span>
                          </div>
                          {inProjSfChaptersLoading ? (
                            <div className="text-center py-6"><Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" /></div>
                          ) : inProjSfChapters.length === 0 ? (
                            <p className="text-xs text-center py-4 text-muted-foreground">No chapters found in this project.</p>
                          ) : (
                            <>
                              <div className="mb-2">
                                <button
                                  onClick={() => {
                                    if (inProjSfSelectedChapters.size === inProjSfChapters.length) {
                                      setInProjSfSelectedChapters(new Set());
                                    } else {
                                      setInProjSfSelectedChapters(new Set(inProjSfChapters.map((_, i) => i)));
                                    }
                                  }}
                                  className="text-[10px] font-mono underline text-primary"
                                >
                                  {inProjSfSelectedChapters.size === inProjSfChapters.length ? "Deselect all" : "Select all"}
                                </button>
                              </div>
                              <div className="space-y-1 max-h-60 overflow-y-auto">
                                {inProjSfChapters.map((ch, i) => {
                                  const wc = ch.wordCount ?? (ch.text || ch.content || "").split(/\s+/).filter(Boolean).length;
                                  return (
                                    <label key={i} className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-muted">
                                      <input
                                        type="checkbox"
                                        checked={inProjSfSelectedChapters.has(i)}
                                        onChange={() => {
                                          const next = new Set(inProjSfSelectedChapters);
                                          next.has(i) ? next.delete(i) : next.add(i);
                                          setInProjSfSelectedChapters(next);
                                        }}
                                        className="accent-primary"
                                      />
                                      <span className="text-xs truncate flex-1">{ch.title || `Chapter ${i + 1}`}</span>
                                      <span className="text-[10px] font-mono shrink-0 text-muted-foreground">{wc.toLocaleString()} words</span>
                                    </label>
                                  );
                                })}
                              </div>
                              <Button
                                size="sm"
                                disabled={inProjSfSelectedChapters.size === 0 || inProjSfImporting}
                                onClick={() => {
                                  setInProjSfImporting(true);
                                  try {
                                    const selected = [...inProjSfSelectedChapters].sort((a, b) => a - b).map((i) => inProjSfChapters[i]);
                                    const combined = selected.map((ch: any) => ch.text || ch.content || "").join("\n\n");
                                    if (!combined.trim()) {
                                      toast({ title: "No chapter text found", variant: "destructive" });
                                    } else {
                                      setSourceText(combined);
                                      setSourceType("story");
                                      toast({ title: `Loaded ${selected.length} chapter${selected.length !== 1 ? "s" : ""} into source text` });
                                      setInProjSfMode("closed");
                                      setInProjSfSelectedProject(null);
                                      setInProjSfChapters([]);
                                      setInProjSfSelectedChapters(new Set());
                                    }
                                  } catch (err: any) {
                                    toast({ title: "Import failed", description: err.message, variant: "destructive" });
                                  }
                                  setInProjSfImporting(false);
                                }}
                                className="mt-3 w-full"
                                data-testid="button-inproj-sf-apply"
                              >
                                {inProjSfImporting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                                Load Into Source Text
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {inProjSfMode === "json" && (
                    <div className="rounded-lg p-3 bg-muted/30 border border-border space-y-2">
                      <p className="text-xs text-muted-foreground">
                        Paste a Story Forge JSON context. Canon places and character-location associations will seed
                        candidates in this project's pipeline.
                      </p>
                      <Textarea
                        value={inProjSfJson}
                        onChange={(e) => setInProjSfJson(e.target.value)}
                        placeholder='{"storyWorld":"Harrow County","theme":"decay","tone":"melancholic","characters":[{"name":"Sarah","locationAssociations":["Old Mill"]}],"canonPlaces":[{"name":"Smith House","aliases":["Smith residence"]}]}'
                        className="min-h-[120px] text-xs font-mono"
                        data-testid="input-inproj-sf-json"
                      />
                      <Button
                        size="sm"
                        disabled={inProjSfJsonImporting}
                        onClick={async () => {
                          setInProjSfJsonImporting(true);
                          try {
                            const payload = inProjSfJson.trim() ? JSON.parse(inProjSfJson) : {};
                            const res = await apiRequest("POST", "/api/location-forge/story-forge/manual-import", { projectId: currentProjectId, payload });
                            await res.json();
                            toast({ title: "Story Forge context imported into this project" });
                            setInProjSfJson("");
                            setInProjSfMode("closed");
                          } catch (err: any) {
                            toast({ title: "Import failed", description: err.message, variant: "destructive" });
                          }
                          setInProjSfJsonImporting(false);
                        }}
                        data-testid="button-inproj-sf-json-apply"
                      >
                        {inProjSfJsonImporting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                        Apply Story Forge Context
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Left: Text Input */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    Source Text
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Source type toggle */}
                  <div className="flex gap-2">
                    <Button
                      variant={sourceType === "story" ? "default" : "secondary"}
                      size="sm"
                      onClick={() => setSourceType("story")}
                      data-testid="button-source-story"
                    >
                      <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                      Story / Manuscript
                    </Button>
                    <Button
                      variant={sourceType === "description" ? "default" : "secondary"}
                      size="sm"
                      onClick={() => setSourceType("description")}
                      data-testid="button-source-description"
                    >
                      <Mountain className="w-3.5 h-3.5 mr-1.5" />
                      Location Description
                    </Button>
                  </div>

                  {/* File upload */}
                  <div>
                    <Label
                      htmlFor="file-upload"
                      className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
                    >
                      <Upload className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Drop a .txt or .docx file, or click to browse
                      </span>
                    </Label>
                    <input
                      id="file-upload"
                      type="file"
                      accept=".txt,.docx"
                      className="hidden"
                      onChange={handleFileUpload}
                      data-testid="input-file-upload"
                    />
                  </div>

                  {/* Text area */}
                  <Textarea
                    placeholder="Or paste your text here..."
                    value={sourceText}
                    onChange={(e) => setSourceText(e.target.value)}
                    className="min-h-[240px] resize-y text-sm"
                    data-testid="input-source-text"
                  />
                  {sourceText && (
                    <p className="text-xs text-muted-foreground">
                      {sourceText.length.toLocaleString()} characters
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Right: Configuration */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    AI Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Provider selection */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">AI Provider</Label>
                    <Select value={provider} onValueChange={(v: any) => setProvider(v)}>
                      <SelectTrigger data-testid="select-provider">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PROVIDERS.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            <div className="flex items-center gap-2">
                              {p.name}
                              {p.supportsImages && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                  + Images
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {currentProvider.supportsImages
                        ? "Text analysis + visual study generation"
                        : "Text analysis only (use OpenAI or Google for visuals)"}
                    </p>
                  </div>

                  {/* API Key */}
                  <div className="space-y-2">
                    <Label htmlFor="api-key" className="text-sm font-medium">
                      API Key
                    </Label>
                    <div className="relative flex items-center">
                      <Input
                        id="api-key"
                        type={showApiKey ? "text" : "password"}
                        placeholder={currentProvider.keyPlaceholder}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="pr-10 w-full"
                        data-testid="input-api-key"
                      />
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setShowApiKey(!showApiKey)}
                        data-testid="button-toggle-key-visibility"
                        aria-label={showApiKey ? "Hide API key" : "Show API key"}
                      >
                        {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Your key is sent directly to the provider. It is never stored.
                    </p>
                  </div>

                  <Separator />

                  {/* Demo Mode Toggle */}
                  <div className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2.5">
                    <div>
                      <p className="text-sm font-medium">Demo Mode</p>
                      <p className="text-xs text-muted-foreground">Test the full flow with sample data</p>
                    </div>
                    <button
                      onClick={() => setDemoMode(!demoMode)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${
                        demoMode ? "bg-primary" : "bg-input"
                      }`}
                      data-testid="button-demo-toggle"
                      aria-label="Toggle demo mode"
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                          demoMode ? "translate-x-5" : ""
                        }`}
                      />
                    </button>
                  </div>

                  {/* Info box */}
                  <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      How it works
                    </h4>
                    <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                      <li>AI scans your text and identifies all locations</li>
                      <li>All locations appear on a dashboard grid</li>
                      <li>Develop any location into a full 10-section profile</li>
                      <li>Generate 6-panel visual studies per location</li>
                      <li>Export individual or all locations as Word documents</li>
                    </ol>
                  </div>

                  {/* CTA */}
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleScan}
                    disabled={isScanning || (!demoMode && (!sourceText || !apiKey))}
                    data-testid="button-scan"
                  >
                    {isScanning ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {demoMode ? "Loading demo..." : "Scanning for locations..."}
                      </>
                    ) : (
                      <>
                        <MapPin className="w-4 h-4 mr-2" />
                        {demoMode ? "Try Demo" : "Scan for Locations"}
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ── STEP: Dashboard ── */}
        {step === "dashboard" && (
          <div className="space-y-6">
            {/* Dashboard Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-sans font-bold text-xl flex items-center gap-2">
                  <LayoutGrid className="w-5 h-5 text-primary" />
                  Location Dashboard
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {totalCount} location{totalCount !== 1 ? "s" : ""} detected
                  {" · "}
                  <span className={developedCount > 0 ? "text-primary font-medium" : ""}>
                    {developedCount} of {totalCount} developed
                  </span>
                </p>
              </div>
              <div className="flex gap-2 shrink-0 flex-wrap">
                {developedCount > 0 && (
                  <Button
                    onClick={handleExportAll}
                    disabled={isExportingAll}
                    variant="secondary"
                    size="sm"
                    data-testid="button-export-all"
                  >
                    {isExportingAll ? (
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Package className="w-3.5 h-3.5 mr-1.5" />
                    )}
                    Export All ({developedCount})
                  </Button>
                )}
                {developedCount < totalCount && (
                  <Button
                    onClick={handleDevelopAll}
                    disabled={isDevelopingAll || isAnalyzing}
                    size="sm"
                    data-testid="button-develop-all"
                  >
                    {isDevelopingAll ? (
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Wand2 className="w-3.5 h-3.5 mr-1.5" />
                    )}
                    Develop All ({totalCount - developedCount})
                  </Button>
                )}
              </div>
            </div>

            {/* Progress bar */}
            {totalCount > 0 && (
              <div className="space-y-1.5">
                <Progress value={(developedCount / totalCount) * 100} className="h-2" data-testid="progress-developed" />
                <p className="text-[11px] text-muted-foreground text-right">
                  {developedCount}/{totalCount} profiles complete
                </p>
              </div>
            )}

            {/* Filter/sort bar */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">Filter:</span>
                {["all", "major", "minor", "background"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilterImportance(f)}
                    className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                      filterImportance === f
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-transparent text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                    }`}
                    data-testid={`filter-${f}`}
                  >
                    {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">Sort:</span>
                <button
                  onClick={() => setSortBy("importance")}
                  className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                    sortBy === "importance"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-transparent text-muted-foreground border-border hover:border-primary/50"
                  }`}
                  data-testid="sort-importance"
                >
                  Importance
                </button>
                <button
                  onClick={() => setSortBy("name")}
                  className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                    sortBy === "name"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-transparent text-muted-foreground border-border hover:border-primary/50"
                  }`}
                  data-testid="sort-name"
                >
                  Name
                </button>
              </div>
            </div>

            {/* Location Cards Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredLocations.map((loc, i) => {
                const isDeveloped = !!developedItems[loc.name];
                const colors = IMPORTANCE_COLORS[loc.estimatedImportance] || IMPORTANCE_COLORS.background;
                const firstLetter = loc.name.charAt(0).toUpperCase();
                const isDevelopingThis = developingLocation === loc.name;

                return (
                  <Card
                    key={loc.name}
                    className={`transition-all ${
                      isDeveloped
                        ? "border-l-2 border-l-primary border-t-border border-r-border border-b-border shadow-sm"
                        : "border-border"
                    }`}
                    data-testid={`card-location-${i}`}
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${colors.bg} ${colors.text}`}
                        >
                          {firstLetter}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="font-semibold text-sm truncate">{loc.name}</h3>
                            {isDeveloped && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <Badge
                              variant={loc.estimatedImportance === "major" ? "default" : "secondary"}
                              className="text-[10px] shrink-0"
                            >
                              {loc.role}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] shrink-0">
                              {loc.estimatedImportance}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground line-clamp-2">{loc.briefDescription}</p>

                      {/* Actions */}
                      <div className="pt-1">
                        {isDeveloped ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
                            onClick={() => handleView(loc.name)}
                            data-testid={`button-view-${i}`}
                          >
                            <Eye className="w-3.5 h-3.5 mr-1.5" />
                            View Profile
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            className="w-full"
                            onClick={() => handleDevelop(loc.name)}
                            disabled={isAnalyzing || isDevelopingAll}
                            data-testid={`button-develop-${i}`}
                          >
                            {isDevelopingThis ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                Developing...
                              </>
                            ) : (
                              <>
                                <Wand2 className="w-3.5 h-3.5 mr-1.5" />
                                Develop
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Button variant="ghost" onClick={() => setStep("upload")} data-testid="button-back-to-upload">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back to source text
            </Button>
          </div>
        )}

        {/* ── STEP: Analyzing ── */}
        {step === "analyzing" && (
          <div className="max-w-md mx-auto text-center space-y-6 py-16">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Wand2 className="w-7 h-7 text-primary animate-pulse" />
            </div>
            <div className="space-y-2">
              <h2 className="font-sans font-bold text-xl">
                Building Profile for {developingLocation}
              </h2>
              <p className="text-sm text-muted-foreground">{analysisStage}</p>
            </div>
            <Progress value={analysisProgress} className="h-2" data-testid="progress-analysis" />
            <p className="text-xs text-muted-foreground">
              {isAnalyzing ? "This may take 30–60 seconds..." : "Finalizing..."}
            </p>
          </div>
        )}

        {/* ── STEP: Results (Expanded View) ── */}
        {step === "results" && currentProfile && expandedItem && (
          <div className="space-y-6">
            {/* Results Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="w-8 h-8 shrink-0" onClick={handleBackToDashboard} data-testid="button-back-to-dashboard-inline">
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <h2 className="font-sans font-bold text-xl">{expandedItem}</h2>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5 ml-10">{currentProfile.logline}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button onClick={handleExport} disabled={isExporting} data-testid="button-export-docx">
                  {isExporting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Export DOCX
                </Button>
              </div>
            </div>

            {/* Reference Image Upload */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Upload className="w-4 h-4 text-primary" />
                  Reference Images
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Optional</Badge>
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Upload up to 6 reference images to lock the location's look. These are sent as visual anchors alongside every generation.
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {userReferenceImages.map((img, i) => (
                    <div key={i} className="relative w-28 aspect-video rounded-lg overflow-hidden border border-border group">
                      <img
                        src={`data:image/png;base64,${img}`}
                        alt={`Reference ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => removeReferenceImage(i)}
                        className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Remove reference image"
                      >
                        ×
                      </button>
                      {i === 0 && (
                        <span className="absolute bottom-0 left-0 right-0 bg-primary/80 text-primary-foreground text-[8px] text-center py-0.5">PRIMARY</span>
                      )}
                    </div>
                  ))}
                  {userReferenceImages.length < 6 && (
                    <label className="w-28 aspect-video rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors">
                      <Upload className="w-4 h-4 text-muted-foreground mb-1" />
                      <span className="text-[9px] text-muted-foreground">{userReferenceImages.length}/6</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleReferenceUpload}
                        data-testid="input-reference-upload"
                      />
                    </label>
                  )}
                </div>
                {userReferenceImages.length > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-2">
                    {userReferenceImages.length} reference{userReferenceImages.length !== 1 ? "s" : ""} loaded — these will be included in every image generation call for visual consistency.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Location Art Studio */}
            <Card data-testid="location-art-studio">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Palette className="w-4 h-4 text-primary" />
                    Location Art Studio
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {Object.keys(currentVisualImages).length > 0 && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleDownloadAllImages}
                        data-testid="button-download-all-images"
                      >
                        <FolderDown className="w-3.5 h-3.5 mr-1.5" />
                        Download All
                      </Button>
                    )}
                    {artStudioTab === "studio" && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleGenerateAll}
                        disabled={!!generatingLayer}
                        data-testid="button-generate-all"
                      >
                        <Wand2 className="w-3.5 h-3.5 mr-1.5" />
                        Generate Tab ({PANEL_CATEGORIES.find(c => c.id === visualTab)?.label ?? ""})
                      </Button>
                    )}
                  </div>
                </div>
                {/* Style Selector */}
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <span className="text-xs font-medium text-muted-foreground shrink-0">Art Style:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {ART_STYLES.map((style) => (
                      <button
                        key={style.id}
                        onClick={() => {
                          setArtStyle(style.id);
                          // Clear visual images for current expanded item
                          if (expandedItem) {
                            setDevelopedItems((prev) => ({
                              ...prev,
                              [expandedItem]: {
                                ...prev[expandedItem],
                                visualImages: {},
                              },
                            }));
                          }
                        }}
                        className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                          artStyle === style.id
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-transparent text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                        }`}
                        data-testid={`style-${style.id}`}
                      >
                        {style.name}
                      </button>
                    ))}
                  </div>
                </div>
                {artStyle === "custom" && (
                  <div className="w-full mt-2 p-3 rounded-lg" style={{ background: "hsl(225,12%,8%)", border: "1px solid hsl(225,10%,14%)" }}>
                    <p className="text-[10px] text-muted-foreground mb-2">
                      Describe a movie, genre, art movement, or aesthetic. AI will generate the style directive.
                    </p>
                    <div className="flex gap-2">
                      <Input
                        value={customStyleInput}
                        onChange={(e) => setCustomStyleInput(e.target.value)}
                        placeholder='e.g. "Blade Runner 2049" or "dark gothic horror"'
                        className="flex-1 h-8 text-xs bg-muted/30"
                        data-testid="input-custom-style"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && customStyleInput.trim()) {
                            handleGenerateStylePrompt();
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        className="h-8 px-3"
                        onClick={handleGenerateStylePrompt}
                        disabled={generatingStyle || !customStyleInput.trim()}
                        data-testid="button-generate-style"
                      >
                        {generatingStyle ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </div>
                    {customStylePrompt && (
                      <div className="mt-2 p-2 rounded text-[10px] leading-relaxed" style={{ background: "hsla(163,100%,42%,0.06)", border: "1px solid hsla(163,100%,42%,0.15)", color: "hsl(163,100%,60%)" }}>
                        {customStylePrompt}
                      </div>
                    )}
                  </div>
                )}
                <p className="text-xs text-muted-foreground pt-1">
                  Visual workspace — Studio panels, gallery, batch generation, and custom scenes. Establishing Shot generates first as the visual anchor.
                </p>
              </CardHeader>
              <CardContent className="p-0">
                {/* Art Studio top-level tab bar */}
                <div className="border-b border-border px-3 pt-3">
                  <Tabs value={artStudioTab} onValueChange={(v) => setArtStudioTab(v as typeof artStudioTab)}>
                    <TabsList className="h-8 bg-muted/30 p-0.5 rounded-lg">
                      <TabsTrigger value="studio" className="text-[10px] h-7 rounded-md px-3 data-[state=active]:bg-card data-[state=active]:shadow-sm" data-testid="artstudio-tab-studio">
                        <Palette className="w-3 h-3 mr-1" /> Studio
                      </TabsTrigger>
                      <TabsTrigger value="gallery" className="text-[10px] h-7 rounded-md px-3 data-[state=active]:bg-card data-[state=active]:shadow-sm" data-testid="artstudio-tab-gallery">
                        <Image className="w-3 h-3 mr-1" /> Gallery
                      </TabsTrigger>
                      <TabsTrigger value="batch" className="text-[10px] h-7 rounded-md px-3 data-[state=active]:bg-card data-[state=active]:shadow-sm" data-testid="artstudio-tab-batch">
                        <Wand2 className="w-3 h-3 mr-1" /> Batch Generate
                      </TabsTrigger>
                      <TabsTrigger value="scene" className="text-[10px] h-7 rounded-md px-3 data-[state=active]:bg-card data-[state=active]:shadow-sm" data-testid="artstudio-tab-scene">
                        <Clapperboard className="w-3 h-3 mr-1" /> Custom Scene
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                {artStudioTab === "studio" && (<>
                {/* Category tab bar */}
                <div className="border-b border-border overflow-x-auto">
                  <div className="flex gap-0 min-w-max">
                    {PANEL_CATEGORIES.map((cat) => {
                      const catLayers = VISUAL_LAYERS.filter(l => l.category === cat.id);
                      const generated = catLayers.filter(l => currentVisualImages[l.key]).length;
                      const total = catLayers.length;
                      const isActive = visualTab === cat.id;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => setVisualTab(cat.id)}
                          data-testid={`tab-visual-${cat.id}`}
                          className={`flex items-center gap-1.5 px-3 py-2.5 text-xs border-b-2 transition-colors whitespace-nowrap ${
                            isActive
                              ? "border-primary text-foreground font-medium"
                              : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                          }`}
                        >
                          <cat.Icon className="w-3.5 h-3.5" />
                          <span>{cat.label}</span>
                          {generated > 0 && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                              generated === total
                                ? "bg-primary/20 text-primary"
                                : "bg-muted text-muted-foreground"
                            }`}>
                              {generated}/{total}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Panel grid for active tab */}
                <div className="p-4">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {VISUAL_LAYERS.filter(l => l.category === visualTab).map((layer) => {
                      const img = currentVisualImages[layer.key];
                      const isCustom = layer.key === "custom";
                      const isGenerating = generatingLayer === layer.key;
                      // Build the full prompt using buildLayerPrompt for consistent single-image enforcement
                      const fullPrompt = currentProfile ? buildLayerPrompt(layer, currentProfile) : "";
                      // For display in copy-prompt dialog, use the full prompt
                      const displayPrompt = fullPrompt;
                      const historyForPanel = (expandedItem && developedItems[expandedItem]?.visualImageHistory?.[layer.key]) || [];
                      const isLocked = isLayerLocked(layer.key);
                      return (
                        <Card key={layer.key} className={`overflow-hidden ${isCustom ? "border-primary/30 border-2" : ""} ${isLocked ? "ring-1 ring-amber-400/60" : ""}`} data-testid={`card-visual-${layer.key}`}>
                          {img ? (
                            <div className="relative w-full aspect-video overflow-hidden group">
                              <button
                                type="button"
                                className="w-full h-full block focus:outline-none focus:ring-2 focus:ring-primary"
                                onClick={() => setPreviewImage({
                                  layerKey: layer.key,
                                  title: layer.title,
                                  subtitle: layer.subtitle,
                                  category: layer.category,
                                  image: img,
                                  description: layer.description,
                                  locked: isLocked,
                                })}
                                aria-label={`View larger preview of ${layer.title}`}
                                title="Click to view larger"
                                data-testid={`button-preview-${layer.key}`}
                              >
                                <img
                                  src={`data:image/png;base64,${img}`}
                                  alt={layer.title}
                                  className="w-full h-full object-cover"
                                />
                                <span className="absolute top-1 right-1 w-7 h-7 rounded bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity pointer-events-none">
                                  <Maximize2 className="w-3.5 h-3.5" />
                                </span>
                              </button>
                              {isLocked && (
                                <div className="absolute top-1 right-10 flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/90 text-black text-[9px] font-semibold uppercase tracking-wider pointer-events-none">
                                  <Lock className="w-3 h-3" /> Locked
                                </div>
                              )}
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2 pointer-events-none">
                                <p className="text-xs font-medium text-white/90">{layer.title}</p>
                                <p className="text-[10px] text-white/60 uppercase tracking-wider">{layer.subtitle}</p>
                              </div>
                              {/* Image History */}
                              {historyForPanel.length > 0 && (
                                <div className="absolute top-1 left-1 flex items-center gap-0.5 z-10">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDevelopedItems(prev => {
                                        const item = prev[expandedItem!];
                                        if (!item) return prev;
                                        const history = item.visualImageHistory?.[layer.key] || [];
                                        if (history.length === 0) return prev;
                                        const currentImg = item.visualImages[layer.key];
                                        const [previousImg, ...restHistory] = history;
                                        return {
                                          ...prev,
                                          [expandedItem!]: {
                                            ...item,
                                            visualImages: { ...item.visualImages, [layer.key]: previousImg },
                                            visualImageHistory: {
                                              ...(item.visualImageHistory || {}),
                                              [layer.key]: [...restHistory, currentImg],
                                            },
                                          },
                                        };
                                      });
                                    }}
                                    className="w-6 h-6 rounded bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                                    title="Previous version"
                                  >
                                    <ArrowLeft className="w-3 h-3" />
                                  </button>
                                  <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-black/60 text-white/80">
                                    {historyForPanel.length + 1} ver{historyForPanel.length > 0 ? "s" : ""}
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDevelopedItems(prev => {
                                        const item = prev[expandedItem!];
                                        if (!item) return prev;
                                        const history = item.visualImageHistory?.[layer.key] || [];
                                        if (history.length === 0) return prev;
                                        const currentImg = item.visualImages[layer.key];
                                        const nextImg = history[history.length - 1];
                                        const newHistory = [currentImg, ...history.slice(0, -1)];
                                        return {
                                          ...prev,
                                          [expandedItem!]: {
                                            ...item,
                                            visualImages: { ...item.visualImages, [layer.key]: nextImg },
                                            visualImageHistory: {
                                              ...(item.visualImageHistory || {}),
                                              [layer.key]: newHistory,
                                            },
                                          },
                                        };
                                      });
                                    }}
                                    className="w-6 h-6 rounded bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                                    title="Next version"
                                  >
                                    <ChevronRight className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : isCustom && !isGenerating ? (
                            <div className="w-full aspect-video bg-[hsl(225,18%,6%)] p-3 flex flex-col">
                              <Textarea
                                placeholder="Describe the scene... e.g. 'aerial view during a thunderstorm at midnight, lightning illuminating the mountain, rain pouring down'"
                                value={customPrompt}
                                onChange={(e) => setCustomPrompt(e.target.value)}
                                className="flex-1 text-xs resize-none bg-transparent border-border"
                                data-testid="input-custom-prompt"
                              />
                            </div>
                          ) : (
                            <div className="w-full aspect-video bg-[hsl(225,18%,6%)] flex items-center justify-center">
                              {isGenerating ? (
                                <div className="text-center">
                                  <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin text-primary" />
                                  <p className="text-xs text-muted-foreground">Generating...</p>
                                </div>
                              ) : (
                                <div className="text-center p-4">
                                  <Image className="w-6 h-6 mx-auto mb-2 opacity-30" />
                                  <p className="text-xs text-muted-foreground">{layer.description}</p>
                                </div>
                              )}
                            </div>
                          )}
                          <div className="p-3 border-t border-border">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <p className="text-sm font-semibold">{layer.title}</p>
                                  {layer.key === "establishing" && img && (
                                    <Badge variant="default" className="text-[9px] px-1.5 py-0 h-4">
                                      ANCHOR
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{layer.subtitle}</p>
                              </div>
                              <div className="flex items-center gap-0.5">
                                {/* Copy prompt for Midjourney */}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="w-7 h-7"
                                  onClick={() => handleCopyPrompt(layer.key, layer.title, displayPrompt)}
                                  title="Copy prompt for Midjourney"
                                  data-testid={`button-copy-${layer.key}`}
                                >
                                  {copiedPrompt === layer.key ? (
                                    <Check className="w-3.5 h-3.5 text-primary" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </Button>
                                {/* Upload external image */}
                                <button
                                  className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors relative ${isLocked ? "text-muted-foreground/40 cursor-not-allowed" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}
                                  title={isLocked ? "Unlock this image to upload a replacement" : "Upload image (Midjourney, Leonardo, etc.)"}
                                  aria-label={isLocked ? "Upload disabled — image locked" : "Upload image"}
                                  onClick={(e) => { if (isLocked) e.preventDefault(); }}
                                >
                                  <Upload className="w-3.5 h-3.5" />
                                  <input
                                    type="file"
                                    accept="image/*"
                                    disabled={isLocked}
                                    className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleUploadPanelImage(layer.key, file);
                                      e.target.value = "";
                                    }}
                                    data-testid={`upload-panel-${layer.key}`}
                                  />
                                </button>
                                {/* Lock / Unlock — only when an image is present */}
                                {img && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className={`w-7 h-7 ${isLocked ? "text-amber-400 hover:text-amber-300" : ""}`}
                                    onClick={() => toggleLayerLock(layer.key)}
                                    title={isLocked ? "Unlock image" : "Lock image (protect from regeneration)"}
                                    aria-label={isLocked ? "Unlock image" : "Lock image"}
                                    aria-pressed={isLocked}
                                    data-testid={`button-lock-${layer.key}`}
                                  >
                                    {isLocked ? (
                                      <Lock className="w-3.5 h-3.5" />
                                    ) : (
                                      <Unlock className="w-3.5 h-3.5" />
                                    )}
                                  </Button>
                                )}
                                {/* Download image */}
                                {img && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="w-7 h-7"
                                    onClick={() => handleDownloadImage(layer.key, layer.title)}
                                    title="Download image"
                                    data-testid={`button-download-${layer.key}`}
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                                {/* Generate */}
                                <Button
                                  variant={isCustom && customPrompt ? "default" : "ghost"}
                                  size="icon"
                                  className="w-7 h-7"
                                  onClick={() => {
                                    if (isCustom && !customPrompt) {
                                      toast({ title: "Enter a description", description: "Type what you want to see in the text area above.", variant: "destructive" });
                                      return;
                                    }
                                    if (!currentProfile) return;
                                    const builtPrompt = buildLayerPrompt(layer, currentProfile);
                                    if (!builtPrompt) {
                                      toast({ title: "No prompt", description: "This layer has no visual prompt.", variant: "destructive" });
                                      return;
                                    }
                                    handleGenerateVisual(layer.key, builtPrompt);
                                  }}
                                  disabled={!!generatingLayer || isLocked}
                                  title={isLocked ? "Unlock this image to regenerate" : (img ? "Regenerate image" : "Generate image")}
                                  data-testid={`button-generate-${layer.key}`}
                                >
                                  {isGenerating ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Wand2 className="w-3.5 h-3.5" />
                                  )}
                                  </Button>
                              </div>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
                </>)}

                {/* ── Gallery Tab ── */}
                {artStudioTab === "gallery" && (() => {
                  const allImages: { locationName: string; layerKey: string; layerTitle: string; subtitle: string; image: string; locked: boolean }[] = [];
                  Object.entries(developedItems).forEach(([locName, item]) => {
                    Object.entries(item.visualImages || {}).forEach(([key, img]) => {
                      if (!img) return;
                      const layer = VISUAL_LAYERS.find((l) => l.key === key);
                      allImages.push({
                        locationName: locName,
                        layerKey: key,
                        layerTitle: layer?.title || key,
                        subtitle: layer?.subtitle || "",
                        image: img,
                        locked: !!item.imageLocks?.[key],
                      });
                    });
                  });
                  const devCount = Object.keys(developedItems).length;
                  return (
                    <div className="p-4">
                      {allImages.length === 0 ? (
                        <div className="text-center py-12">
                          <Image className="w-8 h-8 mx-auto mb-2 opacity-20" />
                          <p className="text-xs text-muted-foreground">
                            No images generated yet. Use the Studio tab to generate visual layers for this location.
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                              {allImages.length} image{allImages.length !== 1 ? "s" : ""} across {devCount} location{devCount !== 1 ? "s" : ""}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                            {allImages.map((item, i) => (
                              <div key={`${item.locationName}-${item.layerKey}-${i}`} className={`rounded-lg overflow-hidden border border-border bg-card group relative ${item.locked ? "ring-1 ring-amber-400/60" : ""}`}>
                                <button
                                  type="button"
                                  className="block w-full p-0 m-0 cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-primary/40"
                                  onClick={() => setGalleryLightbox(item)}
                                  aria-label={`Open ${item.locationName} ${item.layerTitle} in lightbox`}
                                  data-testid={`gallery-thumb-${i}`}
                                >
                                  <img
                                    src={`data:image/png;base64,${item.image}`}
                                    alt={`${item.locationName} - ${item.layerTitle}`}
                                    className="w-full aspect-video object-cover"
                                    loading="lazy"
                                  />
                                </button>
                                {item.locked && (
                                  <div className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/90 text-black text-[9px] font-semibold uppercase tracking-wider pointer-events-none">
                                    <Lock className="w-3 h-3" /> Locked
                                  </div>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const link = document.createElement("a");
                                    link.href = `data:image/png;base64,${item.image}`;
                                    link.download = `${item.locationName}_${item.layerTitle.replace(/\s+/g, "_")}.png`;
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                  }}
                                  className="absolute top-1.5 right-1.5 w-7 h-7 rounded-md bg-black/70 hover:bg-black/90 text-white flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity backdrop-blur-sm"
                                  aria-label={`Download ${item.locationName} ${item.layerTitle}`}
                                  data-testid={`gallery-download-${i}`}
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-5 pointer-events-none">
                                  <p className="text-[10px] font-semibold text-white">{item.locationName}</p>
                                  <p className="text-[8px] text-white/70">{item.layerTitle}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })()}

                {/* ── Batch Generate Tab ── */}
                {artStudioTab === "batch" && (() => {
                  const developedNames = Object.keys(developedItems);
                  const canRun = batchSelectedLocations.length > 0 && !isBatchGenerating && !generatingLayer;
                  return (
                    <div className="p-4 space-y-4">
                      <div>
                        <h3 className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Batch Generate</h3>
                        <p className="text-[10px] text-muted-foreground">
                          Select locations and a category to generate visual layers in bulk. Locked images are skipped automatically.
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Select Locations</Label>
                        {developedNames.length === 0 ? (
                          <p className="text-[10px] text-muted-foreground">Develop at least one location to enable batch generation.</p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {developedNames.map((name) => {
                              const isSelected = batchSelectedLocations.includes(name);
                              return (
                                <button
                                  key={name}
                                  onClick={() => {
                                    setBatchSelectedLocations((prev) =>
                                      isSelected ? prev.filter((n) => n !== name) : [...prev, name]
                                    );
                                  }}
                                  className={`px-2.5 py-1 text-[10px] rounded-md border transition-colors ${
                                    isSelected
                                      ? "bg-primary/15 text-primary border-primary/30"
                                      : "bg-muted/30 text-muted-foreground border-border hover:border-primary/30"
                                  }`}
                                  data-testid={`batch-loc-${name}`}
                                >
                                  {isSelected && <CheckCircle2 className="w-3 h-3 inline mr-1" />}
                                  {name}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Category</Label>
                        <Select value={batchCategory} onValueChange={setBatchCategory}>
                          <SelectTrigger className="h-8 text-xs bg-muted/30 max-w-sm" data-testid="batch-select-category">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PANEL_CATEGORIES.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                <span className="text-xs">{c.label}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                          <Timer className="w-3 h-3" /> Delay Between Images (sec)
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          max={120}
                          step={1}
                          value={batchDelaySec}
                          disabled={isBatchGenerating}
                          onChange={(e) => {
                            const v = parseInt(e.target.value, 10);
                            if (!Number.isNaN(v)) setBatchDelaySec(Math.max(0, Math.min(120, v)));
                          }}
                          className="h-8 text-xs bg-muted/30 max-w-[120px]"
                          data-testid="batch-delay-input"
                        />
                        <p className="text-[10px] text-muted-foreground">
                          Default 12s keeps under common provider rate limits (DALL-E Tier 1 ≈ 5 img/min, Gemini image preview is similarly throttled). Lower values risk 429s.
                        </p>
                      </div>

                      {(isBatchGenerating || Object.keys(batchStatusByKey).length > 0) && (
                        <div className="space-y-2">
                          <div className="space-y-1">
                            <Progress value={batchProgress} className="h-1.5" />
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-[10px] text-muted-foreground font-mono truncate">
                                {batchCurrentLabel || `${Math.round(batchProgress)}% complete`}
                              </p>
                              <p className="text-[10px] text-muted-foreground font-mono shrink-0">
                                {Math.round(batchProgress)}%
                              </p>
                            </div>
                          </div>
                          <div className="max-h-48 overflow-auto rounded-md border border-border bg-muted/20 p-2 space-y-0.5">
                            {Object.entries(batchStatusByKey).map(([k, s]) => {
                              const [loc, layerKey] = k.split("||");
                              const layer = VISUAL_LAYERS.find((l) => l.key === layerKey);
                              const colorClass =
                                s === "done" ? "text-green-500" :
                                s === "failed" ? "text-red-500" :
                                s === "skipped" ? "text-muted-foreground" :
                                s === "waiting" || s === "retrying" ? "text-amber-500" :
                                s === "generating" ? "text-primary" :
                                "text-muted-foreground";
                              const label =
                                s === "done" ? "done" :
                                s === "failed" ? "failed" :
                                s === "skipped" ? "skipped (locked or empty prompt)" :
                                s === "waiting" ? "waiting (rate limit)" :
                                s === "retrying" ? "retrying" :
                                s === "generating" ? "generating…" :
                                "queued";
                              return (
                                <div key={k} className="flex items-center justify-between text-[10px] font-mono">
                                  <span className="truncate">{loc} — {layer?.title || layerKey}</span>
                                  <span className={`shrink-0 ${colorClass}`}>{label}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 max-w-sm">
                        <Button
                          className="h-8 text-xs flex-1"
                          disabled={!canRun}
                          onClick={async () => {
                            const targets = [...batchSelectedLocations];
                            const catLayers = VISUAL_LAYERS.filter((l) => l.category === batchCategory && l.key !== "custom");
                            if (targets.length === 0 || catLayers.length === 0) return;
                            batchCancelRef.current = false;
                            setIsBatchGenerating(true);
                            setBatchProgress(0);
                            setBatchStatusByKey({});
                            setBatchCurrentLabel("Starting…");
                            try {
                              await runBatch(targets, catLayers, batchCategory);
                              if (batchCancelRef.current) {
                                toast({ title: "Batch canceled", description: "Partial progress has been saved." });
                              } else {
                                toast({ title: "Batch complete", description: `Processed ${targets.length} location${targets.length !== 1 ? "s" : ""}.` });
                              }
                            } catch (err: any) {
                              toast({ title: "Batch error", description: err?.message || "Batch generation failed", variant: "destructive" });
                            } finally {
                              setIsBatchGenerating(false);
                              setBatchCurrentLabel("");
                              batchCancelRef.current = false;
                            }
                          }}
                          data-testid="batch-generate-btn"
                        >
                          <Wand2 className="w-3.5 h-3.5 mr-1.5" />
                          Generate {PANEL_CATEGORIES.find(c => c.id === batchCategory)?.label ?? ""} for {batchSelectedLocations.length} Location{batchSelectedLocations.length !== 1 ? "s" : ""}
                        </Button>
                        {isBatchGenerating && (
                          <Button
                            variant="destructive"
                            className="h-8 text-xs"
                            onClick={() => { batchCancelRef.current = true; }}
                            data-testid="batch-cancel-btn"
                          >
                            <StopCircle className="w-3.5 h-3.5 mr-1.5" /> Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* ── Custom Scene Tab ── */}
                {artStudioTab === "scene" && (
                  <div className="p-4 space-y-4">
                    <div>
                      <h3 className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Custom Scene Generator</h3>
                      <p className="text-[10px] text-muted-foreground">
                        Generate a one-off image for the current location — describe any angle, time, weather, or event. Stored as the "Director Shot" panel.
                      </p>
                    </div>

                    {!expandedItem || !currentProfile ? (
                      <p className="text-[11px] text-muted-foreground">Open a location to generate a custom scene.</p>
                    ) : isLayerLocked("custom") ? (
                      <div className="p-3 rounded-md bg-amber-500/10 border border-amber-400/30">
                        <p className="text-[11px] text-amber-400 flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5" /> The Director Shot panel is locked. Unlock it from the Studio tab to regenerate.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Location</Label>
                          <p className="text-xs font-semibold">{expandedItem}</p>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Scene Description</Label>
                          <Textarea
                            placeholder="Describe the scene — any angle, time of day, weather, event... e.g. 'aerial view during a thunderstorm at midnight, lightning illuminating the mountain'"
                            value={scenePromptInput}
                            onChange={(e) => setScenePromptInput(e.target.value)}
                            className="min-h-[90px] resize-y text-xs bg-muted/30 border-border placeholder:text-muted-foreground/50"
                            data-testid="scene-prompt-input"
                          />
                        </div>
                        <Button
                          className="h-8 text-xs w-full max-w-sm"
                          disabled={!scenePromptInput.trim() || !!generatingLayer}
                          onClick={async () => {
                            if (!scenePromptInput.trim() || !currentProfile) return;
                            const anchor = currentVisualImages["establishing"];
                            const fullPrompt = `CRITICAL: Generate exactly ONE single image. ONE location. ONE viewpoint. This is NOT a collage, NOT a grid, NOT multiple panels, NOT side-by-side. Just ONE standalone image filling the entire frame. ${currentStylePrompt}. Same location (${expandedItem}): ${scenePromptInput.trim()}`;
                            await handleGenerateVisual("custom", fullPrompt, anchor);
                            toast({ title: "Scene generated", description: `Custom scene saved to the Director Shot panel.` });
                          }}
                          data-testid="scene-generate-btn"
                        >
                          {generatingLayer === "custom" ? (
                            <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Generating...</>
                          ) : (
                            <><Wand2 className="w-3.5 h-3.5 mr-1.5" /> Generate Scene</>
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats + Profile sections */}
            <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
              {/* Quick stats sidebar */}
              <Card className="h-fit">
                <CardContent className="p-4 space-y-3">
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Type</p>
                    <p className="text-sm">{currentProfile.type}</p>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Scale</p>
                    <p className="text-sm">{currentProfile.scale}</p>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Time Period</p>
                    <p className="text-sm">{currentProfile.timePeriod}</p>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Emotional Tone</p>
                    <p className="text-sm">{currentProfile.defaultEmotionalTone}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Profile sections */}
              <Card className="min-w-0 overflow-hidden">
                <Tabs value={activeSection} onValueChange={setActiveSection}>
                  <div className="border-b border-border">
                    <TabsList className="h-auto p-0 bg-transparent rounded-none grid w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-px">
                      {PROFILE_SECTIONS.map((s) => (
                        <TabsTrigger
                          key={s.num}
                          value={String(s.num)}
                          className="px-2 py-2 text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-center leading-snug min-w-0 whitespace-normal break-words h-auto min-h-[2.5rem]"
                          data-testid={`tab-section-${s.num}`}
                        >
                          {s.num}. {s.title}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>
                  {PROFILE_SECTIONS.map((section) => (
                    <TabsContent key={section.num} value={String(section.num)} className="p-5 mt-0">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-sans font-bold text-base text-primary">
                            Section {section.num} · {section.title}
                          </h3>
                          {enhanceAllProgress ? (
                            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Enhancing {enhanceAllProgress.current} of {enhanceAllProgress.total}...
                            </span>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs h-7 px-2 gap-1 text-primary hover:text-primary hover:bg-primary/10"
                              onClick={handleEnhanceAll}
                              disabled={enhancingFields.size > 0}
                            >
                              <Sparkles className="w-3 h-3" />
                              Enhance All Empty
                            </Button>
                          )}
                        </div>
                        <div className="space-y-3">
                          {section.fields.map((field) => {
                            const rawValue = (currentProfile as any)[field.key];
                            const value = rawValue || "—";
                            const empty = isFieldEmpty(value);
                            const isEnhancing = enhancingFields.has(field.key);
                            const wasEnhanced = enhancedFields.has(field.key);
                            const wasEdited = !!(expandedItem && developedItems[expandedItem]?.editedFields?.[field.key]);
                            const isEditing = editingField === field.key;
                            const otherEditing = editingField !== null && !isEditing;
                            return (
                              <div key={field.key}>
                                <div className="flex items-center justify-between gap-2 mb-0.5 flex-wrap">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                                      {field.label}
                                    </p>
                                    {wasEdited && !isEditing && (
                                      <Badge
                                        variant="secondary"
                                        className="text-[9px] uppercase tracking-wider px-1.5 py-0 h-4 bg-blue-500/15 text-blue-400 border-blue-500/20"
                                        title="This field was manually edited"
                                        data-testid={`badge-edited-${field.key}`}
                                      >
                                        Edited
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    {!isEditing && (empty || wasEnhanced) && !isEnhancing && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-5 w-5 p-0 text-primary/60 hover:text-primary hover:bg-primary/10"
                                        onClick={() => handleEnhanceField(field.key, field.label)}
                                        disabled={enhancingFields.size > 0 || !!editingField}
                                        title={empty ? "Enhance with AI" : "Re-enhance with AI"}
                                      >
                                        <Wand2 className="w-3 h-3" />
                                      </Button>
                                    )}
                                    {isEnhancing && (
                                      <Loader2 className="w-3 h-3 animate-spin text-primary" />
                                    )}
                                    {!isEditing && !isEnhancing && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-5 w-5 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                        onClick={() => startEditField(field.key)}
                                        disabled={otherEditing || enhancingFields.size > 0}
                                        title="Edit this field"
                                        data-testid={`button-edit-${field.key}`}
                                      >
                                        <Pencil className="w-3 h-3" />
                                      </Button>
                                    )}
                                    {isEditing && (
                                      <>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 px-2 text-xs gap-1 text-green-500 hover:text-green-400 hover:bg-green-500/10"
                                          onClick={saveEditField}
                                          title="Save changes"
                                          data-testid={`button-save-${field.key}`}
                                        >
                                          <Check className="w-3 h-3" />
                                          Save
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                                          onClick={cancelEditField}
                                          title="Discard changes"
                                          data-testid={`button-cancel-${field.key}`}
                                        >
                                          <XIcon className="w-3 h-3" />
                                          Cancel
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </div>
                                {isEditing ? (
                                  <Textarea
                                    value={editDraft}
                                    onChange={(e) => setEditDraft(e.target.value)}
                                    className="min-h-[90px] text-sm leading-relaxed whitespace-pre-wrap break-words max-w-full w-full resize-y"
                                    placeholder={`Enter ${field.label.toLowerCase()}...`}
                                    data-testid={`textarea-edit-${field.key}`}
                                    onKeyDown={(e) => {
                                      if (e.key === "Escape") {
                                        e.preventDefault();
                                        cancelEditField();
                                      } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                                        e.preventDefault();
                                        saveEditField();
                                      }
                                    }}
                                    autoFocus
                                  />
                                ) : (
                                  <p
                                    className={`text-sm leading-relaxed whitespace-pre-wrap break-words max-w-full ${wasEnhanced ? "bg-green-500/10 rounded px-1.5 py-0.5" : ""} ${wasEdited ? "border-l-2 border-blue-500/40 pl-2" : ""}`}
                                    data-testid={`field-value-${field.key}`}
                                  >
                                    {value}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </Card>
            </div>
          </div>
        )}

        {/* Gallery Lightbox */}
        {galleryLightbox && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            onClick={() => setGalleryLightbox(null)}
            role="dialog"
            aria-modal="true"
            aria-label={`Preview of ${galleryLightbox.locationName} ${galleryLightbox.layerTitle}`}
            data-testid="gallery-lightbox"
          >
            <div
              className="bg-card border border-border rounded-lg shadow-xl w-full max-w-[90vw] max-h-[90vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-3 border-b border-border flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-sm truncate">{galleryLightbox.locationName}</h3>
                    <Badge variant="secondary" className="text-[9px] uppercase tracking-wider px-1.5 py-0 h-4">
                      {galleryLightbox.layerTitle}
                    </Badge>
                  </div>
                  {galleryLightbox.subtitle && (
                    <p className="text-[11px] text-muted-foreground mt-1">{galleryLightbox.subtitle}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8"
                    onClick={() => {
                      const link = document.createElement("a");
                      link.href = `data:image/png;base64,${galleryLightbox.image}`;
                      link.download = `${galleryLightbox.locationName}_${galleryLightbox.layerTitle.replace(/\s+/g, "_")}.png`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    title="Download image"
                    aria-label="Download image"
                    data-testid="button-gallery-download"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8"
                    onClick={() => setGalleryLightbox(null)}
                    title="Close preview"
                    aria-label="Close preview"
                    data-testid="button-gallery-close"
                  >
                    <XIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="flex-1 min-h-0 bg-[hsl(225,18%,6%)] flex items-center justify-center p-2 overflow-hidden">
                <img
                  src={`data:image/png;base64,${galleryLightbox.image}`}
                  alt={`${galleryLightbox.locationName} ${galleryLightbox.layerTitle}`}
                  className="max-w-full max-h-[80vh] object-contain"
                />
              </div>
            </div>
          </div>
        )}

        {/* Image Preview Lightbox */}
        {previewImage && (() => {
          const liveImage = (expandedItem && developedItems[expandedItem]?.visualImages?.[previewImage.layerKey]) || previewImage.image;
          const liveLocked = isLayerLocked(previewImage.layerKey);
          return (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
              onClick={() => setPreviewImage(null)}
              role="dialog"
              aria-modal="true"
              aria-label={`Preview of ${previewImage.title}`}
              data-testid="image-preview-modal"
            >
              <div
                className="bg-card border border-border rounded-lg shadow-xl w-full max-w-[90vw] max-h-[90vh] flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-3 border-b border-border flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm truncate">{previewImage.title}</h3>
                      <Badge variant="secondary" className="text-[9px] uppercase tracking-wider px-1.5 py-0 h-4">
                        {previewImage.subtitle}
                      </Badge>
                      {liveLocked && (
                        <Badge variant="default" className="text-[9px] uppercase tracking-wider px-1.5 py-0 h-4 bg-amber-500 text-black hover:bg-amber-500">
                          <Lock className="w-3 h-3 mr-1" /> Locked
                        </Badge>
                      )}
                    </div>
                    {previewImage.description && (
                      <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{previewImage.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8"
                      onClick={() => toggleLayerLock(previewImage.layerKey)}
                      title={liveLocked ? "Unlock image" : "Lock image"}
                      aria-label={liveLocked ? "Unlock image" : "Lock image"}
                      aria-pressed={liveLocked}
                      data-testid="button-preview-lock"
                    >
                      {liveLocked ? <Lock className="w-4 h-4 text-amber-400" /> : <Unlock className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8"
                      onClick={() => handleDownloadImage(previewImage.layerKey, previewImage.title)}
                      title="Download image"
                      aria-label="Download image"
                      data-testid="button-preview-download"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8"
                      onClick={() => setPreviewImage(null)}
                      title="Close preview"
                      aria-label="Close preview"
                      data-testid="button-preview-close"
                    >
                      <XIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex-1 min-h-0 bg-[hsl(225,18%,6%)] flex items-center justify-center p-2 overflow-hidden">
                  <img
                    src={`data:image/png;base64,${liveImage}`}
                    alt={previewImage.title}
                    className="max-w-full max-h-[80vh] object-contain"
                  />
                </div>
              </div>
            </div>
          );
        })()}

        {/* Prompt Dialog for Midjourney */}
        {showPromptDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowPromptDialog(null)}>
            <div className="bg-card border border-border rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm">Midjourney Prompt — {showPromptDialog.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Select all and copy this prompt</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowPromptDialog(null)}>
                  ×
                </Button>
              </div>
              <div className="p-4">
                <textarea
                  id="prompt-copy-textarea"
                  readOnly
                  value={showPromptDialog.prompt}
                  className="w-full h-48 p-3 text-sm bg-muted rounded-md border border-border resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                  onFocus={(e) => e.target.select()}
                  data-testid="textarea-prompt-copy"
                />
                <div className="flex items-center justify-between mt-3">
                  <p className="text-xs text-muted-foreground">
                    Paste into Midjourney, Leonardo, or any image tool.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => {
                      const ta = document.getElementById("prompt-copy-textarea") as HTMLTextAreaElement;
                      if (ta) { ta.focus(); ta.select(); }
                      try {
                        document.execCommand("copy");
                        setCopiedPrompt(showPromptDialog.layerKey);
                        setTimeout(() => setCopiedPrompt(null), 2000);
                      } catch {}
                    }}
                    data-testid="button-copy-prompt"
                  >
                    {copiedPrompt === showPromptDialog.layerKey ? (
                      <><Check className="w-3.5 h-3.5 mr-1.5" /> Copied</>
                    ) : (
                      <><Copy className="w-3.5 h-3.5 mr-1.5" /> Copy Prompt</>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-16 py-6">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Your API keys are sent directly to providers and never stored.
          </p>
          <PerplexityAttribution />
        </div>
      </footer>
    </div>
  );
}
