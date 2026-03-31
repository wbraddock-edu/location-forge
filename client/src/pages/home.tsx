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
  const [newProjectName, setNewProjectName] = useState("");
  const [renamingProjectId, setRenamingProjectId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // ── Subscription State ──
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);

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
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null);
  const [showPromptDialog, setShowPromptDialog] = useState<{ layerKey: string; title: string; prompt: string } | null>(null);
  const [userReferenceImages, setUserReferenceImages] = useState<string[]>([]);
  const [customPrompt, setCustomPrompt] = useState("");
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

  const currentProvider = PROVIDERS.find((p) => p.id === provider)!;

  // The current expanded item's profile and visual images
  const currentProfile = expandedItem ? developedItems[expandedItem]?.profile ?? null : null;
  const currentVisualImages = expandedItem ? developedItems[expandedItem]?.visualImages ?? {} : {};
  const selectedLocation = expandedItem || "";

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
      setDevelopedItems((prev) => ({
        ...prev,
        [locationName]: { profile: DEMO_PROFILE, visualImages: {} },
      }));
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

      setDevelopedItems((prev) => ({
        ...prev,
        [locationName]: { profile: data.profile, visualImages: {} },
      }));
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
  const currentStylePrompt = ART_STYLES.find((s) => s.id === artStyle)?.prompt || "";

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
    if (!prompt || demoMode || !expandedItem) {
      if (!prompt) toast({ title: "No prompt", description: "This layer has no visual prompt.", variant: "destructive" });
      if (!apiKey) toast({ title: "No API key", description: "Enter your API key to generate images.", variant: "destructive" });
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
        setDevelopedItems((prev) => ({
          ...prev,
          [expandedItem]: {
            ...prev[expandedItem],
            visualImages: { ...prev[expandedItem].visualImages, [layerKey]: imgData.image },
          },
        }));
        toast({ title: `${layerKey === "establishing" ? "Anchor image" : "Image"} generated` });
        return imgData.image as string;
      }
    } catch (err: any) {
      toast({ title: "Image generation failed", description: err.message, variant: "destructive" });
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

    // Use profile-specific prompt if available (non-empty profileKey)
    const profilePrompt = layer.profileKey ? (profile[layer.profileKey] as string) : "";
    const basePrompt = (profilePrompt && profilePrompt !== "—" && profilePrompt.length > 5) ? profilePrompt : layer.description;
    
    let locationContext = `Location: ${name}`;
    if (layoutDesc) locationContext += `. ${layoutDesc}`;
    if (climate && climate !== "—") locationContext += `. Climate: ${climate}`;
    if (terrain && terrain !== "—") locationContext += `. Terrain: ${terrain}`;
    if (mood && mood !== "—") locationContext += `. Mood: ${mood}`;
    
    return `CRITICAL: Generate exactly ONE single image. ONE location. ONE viewpoint. This is NOT a collage, NOT a grid, NOT multiple panels, NOT side-by-side. Just ONE standalone image filling the entire frame. ${currentStylePrompt}. ${locationContext}. ${basePrompt}`;
  };

  // Generate all layers in the current visual tab sequentially with rate-limit delays
  const handleGenerateAll = async () => {
    if (!currentProfile || demoMode || !expandedItem) return;
    const tabLayers = VISUAL_LAYERS.filter(l => l.category === visualTab && l.key !== "custom");
    
    // Step 1: Use or generate the establishing shot (anchor) first if not present
    let anchorImage = currentVisualImages["establishing"];
    if (!anchorImage) {
      const establishingLayer = VISUAL_LAYERS.find(l => l.key === "establishing");
      if (establishingLayer) {
        const prompt = buildLayerPrompt(establishingLayer, currentProfile);
        anchorImage = await handleGenerateVisual("establishing", prompt) || undefined;
        await delay(8000);
      }
    }
    
    // Step 2: Generate layers in current tab
    for (let i = 0; i < tabLayers.length; i++) {
      const layer = tabLayers[i];
      if (layer.key === "establishing" && anchorImage) continue;
      if (currentVisualImages[layer.key]) continue;
      const prompt = buildLayerPrompt(layer, currentProfile);
      if (!prompt) continue;
      await handleGenerateVisual(layer.key, prompt, anchorImage);
      if (i < tabLayers.length - 1) {
        await delay(8000);
      }
    }
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
      detectedLocations, developedItems, step,
    };
    try {
      await apiRequest("PUT", `/api/projects/${currentProjectId}`, { state });
    } catch {}
  }, [currentProjectId, sourceText, sourceType, provider, apiKey, artStyle, detectedLocations, developedItems, step]);

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
  }, [sourceText, sourceType, provider, apiKey, artStyle, detectedLocations, developedItems, step, appScreen, currentProjectId, saveProjectState]);

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
            Created with AI by <a href="https://littleredappleproductions.com" target="_blank" rel="noopener" style={{ color: "hsla(163,100%,42%,0.6)" }}>Little Red Apple Productions</a> &copy; 2026
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
              <Button variant="ghost" size="sm" onClick={() => setAppScreen("account")} className="text-gray-400 hover:text-white">
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
              <p className="text-gray-500">No projects yet. Create one to get started.</p>
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

            <div className="mt-8 text-center">
              <p className="text-[10px]" style={{ color: "hsl(220,5%,30%)" }}>
                Created with AI by <a href="https://littleredappleproductions.com" target="_blank" rel="noopener" style={{ color: "hsla(163,100%,42%,0.6)" }}>Little Red Apple Productions</a> &copy; 2026
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
            <Button variant="ghost" size="sm" onClick={handleBackToProjects}>
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Projects
            </Button>
            {step === "results" && (
              <Button variant="ghost" size="sm" onClick={handleBackToDashboard} data-testid="button-back-dashboard">
                Dashboard
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
                    <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border group">
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
                    <label className="w-20 h-20 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors">
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

            {/* Visual Location Study */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Image className="w-4 h-4 text-primary" />
                    Visual Location Study
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
                    {!demoMode && (
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
                <p className="text-xs text-muted-foreground pt-1">
                  Establishing Shot generates first as the visual anchor — all other layers reference it for consistent architecture, materials, and style.
                  {demoMode && " Connect an API key to generate images."}
                </p>
              </CardHeader>
              <CardContent className="p-0">
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
                      return (
                        <Card key={layer.key} className={`overflow-hidden ${isCustom ? "border-primary/30 border-2" : ""}`} data-testid={`card-visual-${layer.key}`}>
                          {img ? (
                            <div className="relative w-full aspect-square">
                              <img
                                src={`data:image/png;base64,${img}`}
                                alt={layer.title}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2">
                                <p className="text-xs font-medium text-white/90">{layer.title}</p>
                                <p className="text-[10px] text-white/60 uppercase tracking-wider">{layer.subtitle}</p>
                              </div>
                            </div>
                          ) : isCustom && !isGenerating ? (
                            <div className="w-full aspect-[4/3] bg-[hsl(225,18%,6%)] p-3 flex flex-col">
                              <Textarea
                                placeholder="Describe the scene... e.g. 'aerial view during a thunderstorm at midnight, lightning illuminating the mountain, rain pouring down'"
                                value={customPrompt}
                                onChange={(e) => setCustomPrompt(e.target.value)}
                                className="flex-1 text-xs resize-none bg-transparent border-border"
                                data-testid="input-custom-prompt"
                              />
                            </div>
                          ) : (
                            <div className="w-full aspect-[4/3] bg-[hsl(225,18%,6%)] flex items-center justify-center">
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
                                {!demoMode && (
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
                                    disabled={!!generatingLayer}
                                    data-testid={`button-generate-${layer.key}`}
                                  >
                                    {isGenerating ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Wand2 className="w-3.5 h-3.5" />
                                    )}
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
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
              <Card>
                <Tabs value={activeSection} onValueChange={setActiveSection}>
                  <div className="border-b border-border overflow-x-auto">
                    <TabsList className="h-auto p-0 bg-transparent rounded-none flex-nowrap">
                      {PROFILE_SECTIONS.map((s) => (
                        <TabsTrigger
                          key={s.num}
                          value={String(s.num)}
                          className="px-3 py-2.5 text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none whitespace-nowrap"
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
                        <h3 className="font-sans font-bold text-base text-primary">
                          Section {section.num} · {section.title}
                        </h3>
                        <div className="space-y-3">
                          {section.fields.map((field) => {
                            const value = (currentProfile as any)[field.key] || "—";
                            return (
                              <div key={field.key}>
                                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">
                                  {field.label}
                                </p>
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">{value}</p>
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
