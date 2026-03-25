import { useState, useCallback } from "react";
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
import { apiRequest } from "@/lib/queryClient";
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
} from "lucide-react";
import type { DetectedLocation, LocationProfile } from "@shared/schema";
import { ART_STYLES } from "@shared/schema";
import { DEMO_LOCATIONS, DEMO_PROFILE } from "@/lib/demo-data";

type Step = "upload" | "configure" | "select-location" | "analyzing" | "results";

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

export default function HomePage() {
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();

  // State
  const [step, setStep] = useState<Step>("upload");
  const [sourceText, setSourceText] = useState("");
  const [sourceType, setSourceType] = useState<"description" | "story">("story");
  const [provider, setProvider] = useState<"openai" | "anthropic" | "google">("openai");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [detectedLocations, setDetectedLocations] = useState<DetectedLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [profile, setProfile] = useState<LocationProfile | null>(null);
  const [visualImages, setVisualImages] = useState<Record<string, string>>({});
  const [generatingLayer, setGeneratingLayer] = useState<string | null>(null);
  const [artStyle, setArtStyle] = useState("cinematic");
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null);
  const [showPromptDialog, setShowPromptDialog] = useState<{ layerKey: string; title: string; prompt: string } | null>(null);
  const [userReferenceImages, setUserReferenceImages] = useState<string[]>([]);
  const [customPrompt, setCustomPrompt] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStage, setAnalysisStage] = useState("");
  const [activeSection, setActiveSection] = useState("1");

  const currentProvider = PROVIDERS.find((p) => p.id === provider)!;

  // Visual study layer definitions — 6 panels for locations
  const VISUAL_LAYERS = [
    { key: "establishing", title: "Establishing Shot", subtitle: "Scope Layer", profileKey: "visualEstablishing" as keyof LocationProfile, description: "Wide/aerial view — full environment scope" },
    { key: "architectural", title: "Architectural Detail", subtitle: "Structure Layer", profileKey: "visualArchitectural" as keyof LocationProfile, description: "Materials, textures, construction details" },
    { key: "interior", title: "Interior / Focal Point", subtitle: "Heart Layer", profileKey: "visualInterior" as keyof LocationProfile, description: "The most important space within" },
    { key: "lighting", title: "Lighting & Atmosphere", subtitle: "Mood Layer", profileKey: "visualLighting" as keyof LocationProfile, description: "Day, night, storm, emergency variations" },
    { key: "storytelling", title: "Environmental Storytelling", subtitle: "History Layer", profileKey: "visualStorytelling" as keyof LocationProfile, description: "Objects, wear, signs of life or decay" },
    { key: "custom", title: "Custom Scene", subtitle: "Director's Shot", profileKey: "" as keyof LocationProfile, description: "Describe any scene — change time, weather, angle, event" },
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
      setStep("select-location");
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

      if (data.locations.length === 1) {
        setSelectedLocation(data.locations[0].name);
        await runAnalysis(data.locations[0].name);
      } else if (data.locations.length > 1) {
        setStep("select-location");
      } else {
        toast({ title: "No locations found", description: "Try adding more text or detail.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Scan failed", description: err.message, variant: "destructive" });
    } finally {
      setIsScanning(false);
    }
  };

  // Step 2: Full analysis
  const runAnalysis = async (locationName: string) => {
    // Demo mode
    if (demoMode) {
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
      setProfile(DEMO_PROFILE);
      setVisualImages({});
      setIsAnalyzing(false);
      setStep("results");
      return;
    }

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

      setProfile(data.profile);
      setStep("results");
    } catch (err: any) {
      clearInterval(progressInterval);
      toast({ title: "Analysis failed", description: err.message, variant: "destructive" });
      setStep("configure");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleLocationSelect = async (name: string) => {
    setSelectedLocation(name);
    await runAnalysis(name);
  };

  // Export DOCX
  const handleExport = async () => {
    if (!profile) return;
    setIsExporting(true);

    try {
      const res = await apiRequest("POST", "/api/export-docx", {
        profile,
        images: visualImages,
      });

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedLocation || "Location"}_Profile.docx`;
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

  // Get the current style prompt text
  const currentStylePrompt = ART_STYLES.find((s) => s.id === artStyle)?.prompt || "";

  // Show prompt for Midjourney
  const handleCopyPrompt = (layerKey: string, layerTitle: string, prompt: string) => {
    const fullPrompt = `${currentStylePrompt}. ${prompt}`;
    setShowPromptDialog({ layerKey, title: layerTitle, prompt: fullPrompt });
  };

  // Download a single image
  const handleDownloadImage = (layerKey: string, layerTitle: string) => {
    const b64 = visualImages[layerKey];
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
    const entries = Object.entries(visualImages);
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

  // Generate a single visual layer
  const handleGenerateVisual = async (layerKey: string, prompt: string, anchorOverride?: string) => {
    if (!prompt || demoMode) return;
    setGeneratingLayer(layerKey);
    try {
      const imgProvider = provider === "anthropic" ? "openai" : provider;
      // Build references: user uploads + establishing anchor (for non-establishing layers)
      const anchor = anchorOverride || (layerKey !== "establishing" ? visualImages["establishing"] : undefined);
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
        setVisualImages((prev) => ({ ...prev, [layerKey]: imgData.image }));
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

  // Generate all visual layers sequentially with rate-limit delays
  const handleGenerateAll = async () => {
    if (!profile || demoMode) return;
    
    // Step 1: Generate the establishing shot (anchor) first
    const establishingPrompt = profile["visualEstablishing" as keyof LocationProfile] as string;
    let anchorImage = visualImages["establishing"];
    if (!anchorImage && establishingPrompt) {
      anchorImage = await handleGenerateVisual("establishing", establishingPrompt) || undefined;
      await delay(8000);
    }
    
    // Step 2: Generate all other layers using the anchor
    for (let i = 0; i < VISUAL_LAYERS.length; i++) {
      const layer = VISUAL_LAYERS[i];
      if (layer.key === "establishing" || layer.key === "custom") continue;
      const prompt = profile[layer.profileKey] as string;
      if (prompt && !visualImages[layer.key]) {
        await handleGenerateVisual(layer.key, prompt, anchorImage);
        if (i < VISUAL_LAYERS.length - 1) {
          await delay(8000);
        }
      }
    }
  };

  // Reset
  const handleReset = () => {
    setStep("upload");
    setSourceText("");
    setDetectedLocations([]);
    setSelectedLocation("");
    setProfile(null);
    setVisualImages({});
    setUserReferenceImages([]);
    setAnalysisProgress(0);
    setAnalysisStage("");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src="./lrap-logo.jpg"
              alt="Little Red Apple Productions"
              className="w-8 h-8 rounded-sm object-contain shrink-0"
            />
            <div className="flex items-baseline gap-0" data-testid="text-app-title">
              <span className="font-serif font-bold text-lg tracking-tight">Location Forge</span>
              <span className="text-[11px] text-muted-foreground ml-1.5">- by Little Red Apple Productions</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {step === "results" && (
              <Button variant="ghost" size="sm" onClick={handleReset} data-testid="button-new-location">
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                New
              </Button>
            )}
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
              <h1 className="font-serif font-bold text-xl">Build a Location Profile</h1>
              <p className="text-muted-foreground text-sm max-w-lg mx-auto">
                Upload a story manuscript or location description. The AI will scan for locations,
                then generate a complete 10-section development profile with a visual study.
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
                      <li>You pick which location to develop</li>
                      <li>A full 10-section profile is generated</li>
                      <li>A 6-panel visual study is created</li>
                      <li>Download everything as a Word document</li>
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

        {/* ── STEP: Select Location ── */}
        {step === "select-location" && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <h2 className="font-serif font-bold text-xl">Locations Found</h2>
              <p className="text-muted-foreground text-sm">
                {detectedLocations.length} location{detectedLocations.length !== 1 ? "s" : ""} detected.
                Select one to build a full profile.
              </p>
            </div>

            <div className="space-y-3">
              {detectedLocations.map((loc, i) => (
                <Card
                  key={i}
                  className="cursor-pointer transition-all hover:shadow-md hover:border-primary/30"
                  onClick={() => handleLocationSelect(loc.name)}
                  data-testid={`card-location-${i}`}
                >
                  <CardContent className="flex items-center gap-4 p-4">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                        loc.estimatedImportance === "major"
                          ? "bg-primary text-primary-foreground"
                          : loc.estimatedImportance === "minor"
                            ? "bg-muted text-foreground"
                            : "bg-muted/50 text-muted-foreground"
                      }`}
                    >
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm truncate">{loc.name}</h3>
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
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{loc.briefDescription}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </CardContent>
                </Card>
              ))}
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
              <h2 className="font-serif font-bold text-xl">
                Building Profile for {selectedLocation}
              </h2>
              <p className="text-sm text-muted-foreground">{analysisStage}</p>
            </div>
            <Progress value={analysisProgress} className="h-2" data-testid="progress-analysis" />
            <p className="text-xs text-muted-foreground">
              {isAnalyzing ? "This may take 30–60 seconds..." : "Finalizing..."}
            </p>
          </div>
        )}

        {/* ── STEP: Results ── */}
        {step === "results" && profile && (
          <div className="space-y-6">
            {/* Results Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-serif font-bold text-xl">{selectedLocation}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">{profile.logline}</p>
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
                    {Object.keys(visualImages).length > 0 && (
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
                        {visualImages["establishing"] ? "Generate Remaining" : "Generate All (Anchored)"}
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
                        onClick={() => { setArtStyle(style.id); setVisualImages({}); }}
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
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {VISUAL_LAYERS.map((layer) => {
                    const img = visualImages[layer.key];
                    const isCustom = layer.key === "custom";
                    const prompt = isCustom
                      ? (customPrompt ? `Same location (${selectedLocation}): ${customPrompt}` : "")
                      : (profile[layer.profileKey] as string);
                    const isGenerating = generatingLayer === layer.key;
                    return (
                      <Card key={layer.key} className={`overflow-hidden ${isCustom ? "border-primary/30 border-2" : ""}`} data-testid={`card-visual-${layer.key}`}>
                        {img ? (
                          <img
                            src={`data:image/png;base64,${img}`}
                            alt={layer.title}
                            className="w-full aspect-square object-cover"
                          />
                        ) : isCustom && !isGenerating ? (
                          <div className="w-full aspect-[4/3] bg-muted/30 p-3 flex flex-col">
                            <Textarea
                              placeholder="Describe the scene... e.g. 'aerial view during a thunderstorm at midnight, lightning illuminating the mountain, rain pouring down'"
                              value={customPrompt}
                              onChange={(e) => setCustomPrompt(e.target.value)}
                              className="flex-1 text-xs resize-none bg-transparent border-border"
                              data-testid="input-custom-prompt"
                            />
                          </div>
                        ) : (
                          <div className="w-full aspect-[4/3] bg-muted/50 flex items-center justify-center">
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
                                onClick={() => handleCopyPrompt(layer.key, layer.title, prompt)}
                                title="Copy prompt for Midjourney"
                                data-testid={`button-copy-${layer.key}`}
                              >
                                {copiedPrompt === layer.key ? (
                                  <Check className="w-3.5 h-3.5 text-green-600" />
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
                                    handleGenerateVisual(layer.key, prompt);
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
              </CardContent>
            </Card>

            {/* Quick Stats + Profile sections */}
            <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
              {/* Quick stats sidebar */}
              <Card className="h-fit">
                <CardContent className="p-4 space-y-3">
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Type</p>
                    <p className="text-sm">{profile.type}</p>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Scale</p>
                    <p className="text-sm">{profile.scale}</p>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Time Period</p>
                    <p className="text-sm">{profile.timePeriod}</p>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Emotional Tone</p>
                    <p className="text-sm">{profile.defaultEmotionalTone}</p>
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
                        <h3 className="font-serif font-bold text-base text-primary">
                          Section {section.num} · {section.title}
                        </h3>
                        <div className="space-y-3">
                          {section.fields.map((field) => {
                            const value = (profile as any)[field.key] || "—";
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
