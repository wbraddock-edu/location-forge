// Deterministic location extractor for Location Forge.
// Produces candidate locations from raw text (scripts, prose, or mixed).
// Goal: surface MORE locations than obvious sluglines — includes sublocations,
// implied environments, mentioned but unused places, character-associated places,
// worldbuilding places, and production-relevant environments.

export type CandidateSource =
  | "slugline"
  | "sublocation"
  | "action-line"
  | "mentioned"
  | "character-associated"
  | "worldbuilding"
  | "story-forge"
  | "manual";

export interface ExtractedCandidate {
  id: string;               // stable id derived from canonical name
  name: string;             // canonical/display name
  normalizedName: string;   // lowercase, stripped
  aliases: string[];
  type: "interior" | "exterior" | "hybrid" | "unknown";
  category: string;         // e.g. "residential", "industrial", "natural", "institutional", "transit", "unknown"
  sources: CandidateSource[];
  occurrences: number;
  firstOffset: number;      // char offset of first hit
  contexts: string[];       // up to ~3 short snippets around hits
  associatedCharacters: string[];
  parentHint?: string;      // possible parent/umbrella location name
  confidence: number;       // 0–1
  reasons: string[];        // why this candidate was surfaced
}

// ── Helpers ──────────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  "the","a","an","of","and","or","to","from","at","in","on","by","with","as",
  "her","his","their","my","our","your","its","this","that","these","those",
  "he","she","they","we","you","i","me","him","them","us",
  "is","was","were","be","been","being","are","am",
  "who","what","when","where","why","how","which",
  "very","just","into","onto","out","over","under","near","then","than",
]);

// Common category hints — used to classify by name tokens.
const CATEGORY_HINTS: Array<{ re: RegExp; category: string; type?: "interior" | "exterior" | "hybrid" }> = [
  { re: /\b(bedroom|kitchen|bathroom|living room|office|den|study|hallway|closet|basement|attic|loft|foyer|lobby|corridor|stairwell|lounge|parlor|library|dining room|nursery|garage|shed|barn|cellar|pantry|workshop)\b/i, category: "residential", type: "interior" },
  { re: /\b(hospital|clinic|infirmary|ward|operating room|morgue|pharmacy|lab|laboratory|research facility|observatory|courtroom|courthouse|city hall|police station|jail|prison|cell|precinct|firehouse|fire station|school|classroom|campus|library|museum|church|cathedral|chapel|temple|synagogue|mosque|monastery|convent|government building)\b/i, category: "institutional" },
  { re: /\b(factory|warehouse|shipyard|foundry|mill|plant|refinery|mine|quarry|rig|platform|dock|pier|port|yard|depot|station|terminal|hangar)\b/i, category: "industrial" },
  { re: /\b(cafe|diner|restaurant|bar|pub|tavern|saloon|club|nightclub|hotel|motel|inn|lodge|resort|bakery|bookstore|market|supermarket|shop|store|mall|boutique|gym|arena|stadium|theater|theatre|cinema|casino|parlor)\b/i, category: "commercial" },
  { re: /\b(forest|woods|jungle|mountain|valley|river|creek|stream|lake|pond|ocean|sea|beach|shore|cliff|cave|desert|canyon|meadow|field|plain|swamp|marsh|glacier|island|reef|prairie|tundra|wilderness|hilltop)\b/i, category: "natural", type: "exterior" },
  { re: /\b(street|alley|alleyway|avenue|boulevard|road|highway|interstate|bridge|tunnel|crosswalk|sidewalk|plaza|park|square|junction|intersection|roundabout|parking lot|parking garage|rooftop|courtyard|overpass|underpass)\b/i, category: "urban", type: "exterior" },
  { re: /\b(spaceship|starship|shuttle|cockpit|bridge|airlock|pod|capsule|station|outpost|colony|biodome|dome|bunker|vault|sanctum|dungeon|keep|citadel|fortress|castle|tower|ruins|temple)\b/i, category: "genre" },
  { re: /\b(car|truck|van|bus|train|subway|tram|taxi|cab|boat|ship|ferry|yacht|submarine|plane|airplane|aircraft|helicopter|jet|cockpit)\b/i, category: "transit" },
];

function normalize(name: string): string {
  return name
    .replace(/[’'`]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function titleCase(s: string): string {
  return s
    .split(" ")
    .map((w) => (w.length > 3 && !STOP_WORDS.has(w.toLowerCase())
      ? w[0].toUpperCase() + w.slice(1)
      : STOP_WORDS.has(w.toLowerCase()) ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1)))
    .join(" ")
    .trim();
}

function cleanName(raw: string): string {
  let s = raw.replace(/^[\-\–\—\s]+/, "").replace(/[\-\–\—\s]+$/, "");
  s = s.replace(/^(the|a|an)\s+/i, (m) => m); // keep article
  return titleCase(s);
}

function classify(name: string): { type: "interior" | "exterior" | "hybrid" | "unknown"; category: string } {
  for (const h of CATEGORY_HINTS) {
    if (h.re.test(name)) {
      return { type: h.type ?? "unknown", category: h.category };
    }
  }
  return { type: "unknown", category: "unknown" };
}

function idFor(name: string): string {
  return normalize(name).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "loc";
}

function snippetAround(text: string, offset: number, len = 140): string {
  const start = Math.max(0, offset - 40);
  const end = Math.min(text.length, offset + len);
  return text.slice(start, end).replace(/\s+/g, " ").trim();
}

// ── Extractor ────────────────────────────────────────────────────────────

export interface ExtractOptions {
  maxCandidates?: number;
  knownCharacters?: string[];  // helps character-associated detection
  storyForgePlaces?: string[]; // canon places to match/merge
}

export function extractCandidates(text: string, opts: ExtractOptions = {}): ExtractedCandidate[] {
  if (!text || text.length < 30) return [];
  const maxCandidates = opts.maxCandidates ?? 200;
  const knownChars = new Set((opts.knownCharacters || []).map((c) => c.toLowerCase()));
  const storyPlaces = new Set((opts.storyForgePlaces || []).map((p) => p.toLowerCase()));

  // Map keyed by normalized name
  const byKey = new Map<string, ExtractedCandidate>();

  function record(
    rawName: string,
    source: CandidateSource,
    offset: number,
    reason: string,
    extras?: Partial<ExtractedCandidate>
  ) {
    const name = cleanName(rawName);
    if (!name || name.length < 2 || name.length > 80) return;
    // Reject pure stop-word or punctuation-ish tokens
    const tokens = name.split(/\s+/).filter(Boolean);
    if (tokens.every((t) => STOP_WORDS.has(t.toLowerCase()))) return;

    const key = normalize(name);
    let existing = byKey.get(key);
    if (!existing) {
      const c = classify(name);
      existing = {
        id: idFor(name),
        name,
        normalizedName: key,
        aliases: [],
        type: c.type,
        category: c.category,
        sources: [],
        occurrences: 0,
        firstOffset: offset,
        contexts: [],
        associatedCharacters: [],
        confidence: 0,
        reasons: [],
      };
      byKey.set(key, existing);
    }
    existing.occurrences += 1;
    if (!existing.sources.includes(source)) existing.sources.push(source);
    if (!existing.reasons.includes(reason)) existing.reasons.push(reason);
    if (offset < existing.firstOffset) existing.firstOffset = offset;
    if (existing.contexts.length < 3) {
      const snip = snippetAround(text, offset);
      if (snip && !existing.contexts.includes(snip)) existing.contexts.push(snip);
    }
    if (extras?.parentHint && !existing.parentHint) existing.parentHint = extras.parentHint;
    if (extras?.aliases) for (const a of extras.aliases) if (!existing.aliases.includes(a)) existing.aliases.push(a);
    if (extras?.associatedCharacters) {
      for (const ch of extras.associatedCharacters) {
        if (!existing.associatedCharacters.includes(ch)) existing.associatedCharacters.push(ch);
      }
    }
  }

  // 1) SLUGLINES — screenplay: INT./EXT. LOCATION - TIME
  //    Matches many variants: "INT.", "EXT.", "INT/EXT", "I/E", etc.
  const slugRe = /^[ \t]*(INT\.?|EXT\.?|I\/E|INT\/EXT|EXT\/INT)[ \t\.:\-]+([^\n\-–—]+?)(?:[ \t]*[\-–—][ \t]*([^\n]+?))?[ \t]*$/gim;
  let m: RegExpExecArray | null;
  while ((m = slugRe.exec(text)) !== null) {
    const prefix = m[1].toUpperCase();
    const body = m[2].trim();
    const time = (m[3] || "").trim();
    const type: "interior" | "exterior" | "hybrid" =
      /I\/E|INT\/EXT|EXT\/INT/.test(prefix) ? "hybrid" :
      prefix.startsWith("EXT") ? "exterior" : "interior";

    // Split sublocation pieces on " - " chain. E.g. "SMITH HOUSE - KITCHEN - NIGHT"
    const parts = body.split(/[ \t]*[\-–—][ \t]*/).filter(Boolean);
    if (parts.length === 0) continue;
    const parent = parts[0];
    record(parent, "slugline", m.index, "Slugline primary location", { aliases: [], });
    const existing = byKey.get(normalize(cleanName(parent)));
    if (existing) { existing.type = type; }

    // Sublocations: everything after the first chunk that is not a time-of-day.
    const timeWords = /^(DAY|NIGHT|MORNING|AFTERNOON|EVENING|DAWN|DUSK|MIDNIGHT|CONTINUOUS|LATER|SAME|MOMENTS? LATER|FLASHBACK)$/i;
    for (let i = 1; i < parts.length; i++) {
      const sub = parts[i];
      if (timeWords.test(sub) || timeWords.test(time)) continue;
      if (!sub) continue;
      if (/^(DAY|NIGHT|MORNING|AFTERNOON|EVENING|DAWN|DUSK)\b/i.test(sub)) continue;
      record(sub, "sublocation", m.index, `Sublocation of ${cleanName(parent)}`, { parentHint: cleanName(parent) });
    }
  }

  // 2) ACTION-LINE / IMPLIED ENVIRONMENTS — e.g., "she walks through the rain-slick ALLEY"
  //    Heuristic: ALL-CAPS noun phrases in prose (common in screenplays),
  //    plus prepositional phrases like "in the <Noun Phrase>", "through the <Noun Phrase>".
  const allCapsRe = /\b([A-Z][A-Z0-9'\-]{2,}(?:[ \t]+[A-Z][A-Z0-9'\-]{2,}){0,4})\b/g;
  while ((m = allCapsRe.exec(text)) !== null) {
    const raw = m[1];
    // Skip all-caps that is obviously a character cue (single word followed by ":" or "(")
    const after = text.slice(m.index + raw.length, m.index + raw.length + 4);
    if (/^\s*[:(]/.test(after)) continue;
    // Skip common non-locations (slugline/meta words, time-of-day, stage directions)
    if (/^(FADE|CUT|INT|EXT|THE END|BEGIN|SMASH|TITLE|CREDITS|OVER|ON|OFF|CONT|CONTINUED|V\.O|O\.S|DAY|NIGHT|MORNING|AFTERNOON|EVENING|DAWN|DUSK|MIDNIGHT|CONTINUOUS|LATER|SAME|MOMENTS? LATER|FLASHBACK|INTERCUT|SUPER|BLACK|WHITE|MONTAGE|DISSOLVE|BEAT|PAUSE|SILENCE|END|START)\b/.test(raw)) continue;
    // Skip if match is on its own line (likely a character cue for dialogue)
    const line = raw;
    if (/^[A-Z][A-Z0-9'\-]{1,}$/.test(line)) {
      // Single all-caps word — check if it's likely a character name (followed by dialogue)
      const afterLine = text.slice(m.index + raw.length, m.index + raw.length + 60);
      if (/^\s*\n\s{2,}/.test(afterLine) || /^\s*\([^)]+\)\s*\n/.test(afterLine)) continue;
    }
    // Require either a known place token or multiple capitalized words
    const hasPlaceToken = /(HOUSE|APARTMENT|OFFICE|STATION|STREET|ALLEY|ROAD|BRIDGE|TUNNEL|ROOM|KITCHEN|BEDROOM|BATHROOM|HALL|LOBBY|GARAGE|BASEMENT|ATTIC|LAB|CLINIC|HOSPITAL|CHURCH|TEMPLE|WAREHOUSE|FACTORY|BAR|CAFE|DINER|HOTEL|MOTEL|SHOP|STORE|PARK|BEACH|FOREST|CAVE|RIVER|LAKE|MOUNTAIN|SIGN|DOOR|GATE|WINDOW|YARD|PORCH|ROOF|ROOFTOP)/.test(raw);
    const multiWord = /\s/.test(raw);
    if (!hasPlaceToken && !multiWord) continue;
    // If it looks like a place (>= 2 chars, contains at least one vowel), record
    if (!/[AEIOU]/i.test(raw)) continue;
    record(raw, "action-line", m.index, "ALL-CAPS environment in action");
  }

  // Prepositional-phrase sweep (case-sensitive on first letter): "in the Old Warehouse"
  const prepRe = /\b(in|inside|into|through|across|past|near|beyond|behind|above|below|under|at|to|from|toward|towards)\s+the\s+([A-Z][A-Za-z'’\-]+(?:\s+[A-Z][A-Za-z'’\-]+){0,4})/g;
  while ((m = prepRe.exec(text)) !== null) {
    const phrase = m[2];
    // Skip if phrase is likely a person (known character)
    if (knownChars.has(phrase.toLowerCase())) continue;
    record(phrase, "action-line", m.index, `Implied location after "${m[1]}"`);
  }

  // 3) MENTIONED BUT UNUSED — quoted place names in dialogue / prose (e.g. "Stanton", "the old mill")
  const mentionRe = /\b(?:called|named|known as|from|at|to|visiting|visited)\s+(?:the\s+)?([A-Z][A-Za-z'’\-]+(?:\s+[A-Z][A-Za-z'’\-]+){0,3})/g;
  while ((m = mentionRe.exec(text)) !== null) {
    record(m[1], "mentioned", m.index, "Referenced by name");
  }

  // 4) WORLDBUILDING PLACES — fantasy/sci-fi markers (Mount X, X-town, House of X, Realm of X...)
  const wbRe = /\b(?:Mount|Mt\.|Lake|River|Isle|Island|Castle|Keep|Citadel|Fortress|Tower|Kingdom|Realm|City|Village|Town|Port|Temple|Palace|Halls?|Ruins? of|Bay of|Gulf of|Sea of|Valley of|House of|Order of|Academy of)\s+([A-Z][A-Za-z'’\-]+(?:\s+[A-Z][A-Za-z'’\-]+){0,3})/g;
  while ((m = wbRe.exec(text)) !== null) {
    record(m[0], "worldbuilding", m.index, "Worldbuilding place marker");
  }

  // 5) CHARACTER-ASSOCIATED PLACES — "<CHARACTER>'s <place>"
  const placeWords = /^(house|home|apartment|apt|flat|office|studio|shop|store|bar|cafe|diner|room|bedroom|kitchen|garage|boat|yacht|car|truck|ranch|farm|estate|mansion|cabin|cottage|tent|hideout|lair|bunker|clinic|lab|church|temple|castle|kingdom|village|town|city|place|loft)$/i;
  const possessiveRe = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)(?:'s|’s)\s+([A-Za-z]+)/g;
  while ((m = possessiveRe.exec(text)) !== null) {
    const person = m[1];
    const noun = m[2];
    if (!placeWords.test(noun)) continue;
    const name = `${person}'s ${noun[0].toUpperCase() + noun.slice(1).toLowerCase()}`;
    record(name, "character-associated", m.index, `Associated with ${person}`, {
      associatedCharacters: [person],
    });
  }

  // 6) STORY FORGE CANON OVERLAY — boost any candidate that matches a story-forge place
  if (storyPlaces.size) {
    const byKeyList = Array.from(byKey.values());
    for (const cand of byKeyList) {
      if (storyPlaces.has(cand.normalizedName)) {
        if (!cand.sources.includes("story-forge")) cand.sources.push("story-forge");
        cand.reasons.push("Matches Story Forge canon place");
      }
    }
  }

  // ── Dedupe by alias / substring ────────────────────────────────────────
  const candidates = Array.from(byKey.values());
  // If one name is fully contained in another (token-wise), treat the longer one as canonical
  // and the shorter as alias (only when both appear at least once).
  candidates.sort((a, b) => b.name.length - a.name.length);
  const merged = new Map<string, ExtractedCandidate>();
  for (const c of candidates) {
    let absorbed = false;
    const mergedList = Array.from(merged.values());
    for (const existing of mergedList) {
      const a = existing.normalizedName;
      const b = c.normalizedName;
      // token-set containment
      const aTok = new Set(a.split(/\s+/));
      const bTok = new Set(b.split(/\s+/));
      const bTokArr = Array.from(bTok);
      const contained = bTokArr.every((t) => aTok.has(t));
      if (contained && a !== b && bTok.size >= 1 && aTok.size - bTok.size <= 2) {
        // absorb c into existing
        if (!existing.aliases.includes(c.name)) existing.aliases.push(c.name);
        existing.occurrences += c.occurrences;
        for (const s of c.sources) if (!existing.sources.includes(s)) existing.sources.push(s);
        for (const r of c.reasons) if (!existing.reasons.includes(r)) existing.reasons.push(r);
        for (const ctx of c.contexts) if (existing.contexts.length < 5 && !existing.contexts.includes(ctx)) existing.contexts.push(ctx);
        for (const ch of c.associatedCharacters) if (!existing.associatedCharacters.includes(ch)) existing.associatedCharacters.push(ch);
        absorbed = true;
        break;
      }
    }
    if (!absorbed) merged.set(c.normalizedName, c);
  }

  // ── Scoring ───────────────────────────────────────────────────────────
  const out = Array.from(merged.values()).map((c) => {
    let score = 0;
    if (c.sources.includes("slugline")) score += 0.5;
    if (c.sources.includes("sublocation")) score += 0.3;
    if (c.sources.includes("story-forge")) score += 0.3;
    if (c.sources.includes("worldbuilding")) score += 0.2;
    if (c.sources.includes("character-associated")) score += 0.15;
    if (c.sources.includes("action-line")) score += 0.1;
    if (c.sources.includes("mentioned")) score += 0.05;
    if (c.occurrences >= 3) score += 0.1;
    if (c.occurrences >= 10) score += 0.1;
    if (c.aliases.length > 0) score += 0.05;
    c.confidence = Math.min(1, Math.round(score * 100) / 100);
    return c;
  });

  // Filter out very low-signal, single-source "mentioned" candidates of generic nouns
  const filtered = out.filter((c) => {
    if (c.sources.length === 1 && c.sources[0] === "mentioned" && c.occurrences < 2) return false;
    if (c.name.length < 3) return false;
    // Reject purely lowercase fragments that slipped through
    if (!/[A-Z]/.test(c.name)) return false;
    return true;
  });

  filtered.sort((a, b) => (b.confidence - a.confidence) || (b.occurrences - a.occurrences));
  return filtered.slice(0, maxCandidates);
}

// ── Compare new candidates vs existing canon/developed items ─────────────

export interface CompareResultEntry {
  candidate: ExtractedCandidate;
  status: "new" | "alias" | "duplicate" | "conflict" | "needs-development";
  matchedCanonName?: string;
  note?: string;
}

export interface CompareSummary {
  entries: CompareResultEntry[];
  missingFromScript: string[]; // canon names not present in new candidate set
}

export function compareCandidates(
  newCandidates: ExtractedCandidate[],
  existing: Array<{ name: string; aliases?: string[]; status?: string; profile?: any }>
): CompareSummary {
  const entries: CompareResultEntry[] = [];
  const existingByKey = new Map<string, { name: string; aliases: string[]; status?: string; profile?: any }>();
  for (const e of existing) {
    existingByKey.set(normalize(e.name), {
      name: e.name,
      aliases: (e.aliases || []).map(normalize),
      status: e.status,
      profile: e.profile,
    });
    for (const a of (e.aliases || [])) {
      existingByKey.set(normalize(a), {
        name: e.name,
        aliases: (e.aliases || []).map(normalize),
        status: e.status,
        profile: e.profile,
      });
    }
  }

  const seenCanon = new Set<string>();

  for (const cand of newCandidates) {
    const exact = existingByKey.get(cand.normalizedName);
    if (exact) {
      seenCanon.add(normalize(exact.name));
      // Is the candidate's name different casing/wording from canonical? → alias
      if (normalize(exact.name) !== cand.normalizedName) {
        entries.push({ candidate: cand, status: "alias", matchedCanonName: exact.name, note: "Variant of existing canon name" });
      } else {
        entries.push({ candidate: cand, status: "duplicate", matchedCanonName: exact.name, note: "Already in canon" });
      }
      continue;
    }
    // Fuzzy: substring or shared tokens
    let matched: string | undefined;
    const entryList = Array.from(existingByKey.entries());
    for (const [key, e] of entryList) {
      if (key === cand.normalizedName) continue;
      const aT = new Set(key.split(/\s+/));
      const bT = new Set(cand.normalizedName.split(/\s+/));
      const bTArr = Array.from(bT);
      const shared = bTArr.filter((t) => aT.has(t)).length;
      if (shared >= Math.max(1, Math.min(aT.size, bT.size) - 1)) {
        matched = e.name;
        seenCanon.add(normalize(e.name));
        break;
      }
    }
    if (matched) {
      entries.push({ candidate: cand, status: "alias", matchedCanonName: matched, note: "Likely alias of canon" });
      continue;
    }
    // If candidate has high confidence and no canon match → new
    if (cand.confidence >= 0.5) {
      entries.push({ candidate: cand, status: "new", note: "High-confidence new location" });
    } else {
      entries.push({ candidate: cand, status: "needs-development", note: "Weak candidate — review needed" });
    }
  }

  const missingFromScript: string[] = [];
  for (const e of existing) {
    if (!seenCanon.has(normalize(e.name))) missingFromScript.push(e.name);
  }

  return { entries, missingFromScript };
}

// ── Redevelop (deterministic, no paid deps) ─────────────────────────────

export interface RedevelopInput {
  name: string;
  existingProfile?: Record<string, string>;
  candidate?: ExtractedCandidate;
  storyContext?: {
    storyWorld?: string;
    theme?: string;
    tone?: string;
    genre?: string;
    timePeriod?: string;
    characters?: string[];
  };
}

// Builds richer default strings for weak/empty profile fields using templates.
// Does NOT overwrite non-empty, non-placeholder values.
export function redevelopProfile(input: RedevelopInput): { profile: Record<string, string>; filled: string[] } {
  const base: Record<string, string> = { ...(input.existingProfile || {}) };
  const ctx = input.storyContext || {};
  const cand = input.candidate;
  const name = input.name;
  const cat = cand?.category ?? "unknown";
  const type = cand?.type ?? "unknown";
  const chars = (cand?.associatedCharacters?.length ? cand.associatedCharacters : ctx.characters) || [];
  const filled: string[] = [];

  function setIfWeak(key: string, value: string) {
    const v = (base[key] || "").trim();
    if (!v || /\[Not enough information/i.test(v) || v.length < 8) {
      base[key] = value;
      filled.push(key);
    }
  }

  const toneFragment = ctx.tone ? ` with a ${ctx.tone.toLowerCase()} tone` : "";
  const themeFragment = ctx.theme ? ` echoing the theme of ${ctx.theme.toLowerCase()}` : "";
  const worldFragment = ctx.storyWorld ? ` in ${ctx.storyWorld}` : "";

  setIfWeak("logline", `${name}${worldFragment} — a ${cat === "unknown" ? "key" : cat} ${type === "unknown" ? "location" : type} space${toneFragment}${themeFragment}.`);
  setIfWeak("type", type === "unknown" ? "interior" : type);
  setIfWeak("scale", cat === "urban" || cat === "natural" ? "district / region" : "building / room");
  setIfWeak("timePeriod", ctx.timePeriod || "Present day");
  setIfWeak("alternateNames", (cand?.aliases || []).join(", ") || "—");

  setIfWeak("region", ctx.storyWorld || "Unspecified region");
  setIfWeak("terrain", cat === "natural" ? "Natural terrain shaped by weather and time" : "Built environment");
  setIfWeak("climate", "Temperate — seasonal variation");
  setIfWeak("elevation", "Ground level");
  setIfWeak("layoutDescription", `Primary space anchors the location; ${cand?.aliases?.length ? `also known as ${cand.aliases.join(", ")}. ` : ""}Entry points and sightlines shape how characters move through it.`);
  setIfWeak("entryExitPoints", "Main entrance; secondary access for staff/emergency; sight-line windows.");
  setIfWeak("surroundingEnvironment", "Adjacent streets and structures define the immediate context.");
  setIfWeak("nearestLandmarks", cand?.parentHint ? `Within ${cand.parentHint}.` : "Nearby landmarks to be defined.");
  setIfWeak("travelRoutes", "Accessible by foot and vehicle; well-worn paths from principal characters.");

  setIfWeak("originFounding", "Built or formed in a prior era; current use grew out of that original purpose.");
  setIfWeak("keyHistoricalEvents", "Past events here still shape the emotional weight of the space.");
  setIfWeak("previousUses", "Its prior life lingers in architectural detail.");
  setIfWeak("whoBuiltItAndWhy", "Constructed for practical reasons that persist or have been subverted.");
  setIfWeak("currentStateVsOriginal", "Evolved from its origin — scars and repairs tell the story.");
  setIfWeak("echoingEvents", "Patterns here recur; echoes of earlier moments haunt the present.");

  setIfWeak("defaultSounds", cat === "natural" ? "Wind, distant wildlife, ambient weather." : "Ambient building noise, distant traffic, human presence.");
  setIfWeak("smells", "Characteristic odors tied to materials and inhabitants.");
  setIfWeak("lightQuality", "Varies strongly with time of day; signature lighting in key moments.");
  setIfWeak("temperatureAirQuality", "Comfortable, with pockets that feel colder or warmer depending on recent use.");
  setIfWeak("tactileSurfaces", "Mix of worn and pristine surfaces; touch reveals age.");
  setIfWeak("timeOfDayVariations", "Transforms between day and night — different population, different mood.");

  setIfWeak("defaultEmotionalTone", ctx.tone || "Charged — the place carries weight");
  setIfWeak("psychologicalEffect", "Visitors feel observed or oriented around a focal point.");
  setIfWeak("protagonistFeeling", "Ambivalent — drawn in, yet guarded.");
  setIfWeak("appearsVsReality", "What it appears to be and what it is are not the same.");
  setIfWeak("locationLie", `Presents as ordinary but conceals its ${themeFragment || "deeper purpose"}.`);

  setIfWeak("whoLivesWorksHere", chars.length ? `Associated with ${chars.join(", ")}.` : "Characters whose identities are tied to the space.");
  setIfWeak("powerHierarchy", "Informal but real — who belongs here is quickly understood.");
  setIfWeak("writtenUnwrittenRules", "Unspoken rules govern conduct; violations carry consequences.");
  setIfWeak("territorialBoundaries", "Clear zones of use; outsiders are visible by contrast.");
  setIfWeak("newcomerTreatment", "Scrutinized, then slowly accepted — or rejected.");
  setIfWeak("accessControl", "Normal access during hours; restricted elsewhere.");

  setIfWeak("storyEventsHere", chars.length ? `Scenes involving ${chars.join(", ")} take place here.` : "Pivotal scenes unfold here.");
  setIfWeak("secrets", "A concealed truth rewards attentive observation.");
  setIfWeak("builtInDangers", "Hazards consistent with the category and era of the place.");
  setIfWeak("escapeRoutesTraps", "Clear and concealed exits; pressure points to avoid or exploit.");
  setIfWeak("characterConstraints", "Characters are shaped and bounded by the geography of this place.");

  setIfWeak("stateAtOpening", "Stable, yet already shifting.");
  setIfWeak("stateAtClimax", "Stressed — the place reflects the pressure on its characters.");
  setIfWeak("stateAtResolution", "Altered in meaningful ways by the events here.");
  setIfWeak("transformationCause", "Characters and events reshape the location’s identity.");
  setIfWeak("transformationStatement", `At the start, ${name} is ${ctx.tone?.toLowerCase() || "charged with potential"}. Through the story it becomes a crucible. By the end, it represents what was won or lost here.`);

  setIfWeak("thematicRepresentation", ctx.theme || "A physical stand-in for the story’s central idea.");
  setIfWeak("recurringMotifs", "Visual, auditory, or tactile repetitions tie scenes together.");
  setIfWeak("symbolicObjects", "Props and fixtures here carry meaning beyond function.");
  setIfWeak("colorWeatherAssociations", "A signature palette keyed to mood shifts.");
  setIfWeak("characterMirror", chars.length ? `Mirrors the inner state of ${chars[0]}.` : "Reflects the protagonist’s inner arc.");

  setIfWeak("keyProps", "Critical practical items particular to the space.");
  setIfWeak("practicalConsiderations", "Consider access, lighting, and continuity when shooting here.");
  setIfWeak("realWorldReferences", "Inspired by identifiable real-world analogs.");
  setIfWeak("cameraAngleSuggestions", "Wide establishing, mid on characters, tight on details.");
  setIfWeak("vfxNotes", "Minimal VFX; atmosphere and lighting carry the effect.");

  setIfWeak("visualEstablishing", `Establishing wide shot of ${name}${worldFragment}. Cinematic concept art, ${ctx.tone?.toLowerCase() || "evocative"} mood${themeFragment}.`);
  setIfWeak("visualArchitectural", `Architectural detail study of ${name} — materials, wear, construction that reflect its era and use.`);
  setIfWeak("visualInterior", `Interior focal point of ${name} — the single most narratively important space, lit for storytelling.`);
  setIfWeak("visualLighting", `Lighting/atmosphere study of ${name} across dawn, midday, dusk, and night.`);
  setIfWeak("visualStorytelling", `Environmental storytelling close-up at ${name} — objects, signs, and wear that reveal its history.`);
  setIfWeak("visualCustom", "");

  return { profile: base, filled };
}
