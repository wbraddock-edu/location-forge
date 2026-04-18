// Lightweight runnable verification for locationExtractor.
// Run with: npx tsx server/locationExtractor.test.ts
import { extractCandidates, compareCandidates, redevelopProfile } from "./locationExtractor";

const SCRIPT = `
FADE IN:

INT. SMITH HOUSE - KITCHEN - DAY

Sunlight streams through the window. SARAH stands at the sink.

                    SARAH
          I can't go back to the Old Mill.

EXT. OLD MILL - NIGHT

The decrepit building looms against the moon.

INT/EXT. POLICE STATION - LOBBY - CONTINUOUS

Officers pass through. A sign reads "PRECINCT 14".

She walks through the rain-slick ALLEY, past the BROKEN NEON SIGN.

Jack's Apartment is three blocks away. Meanwhile at the Kingdom of Arneth...

Detective Miller's Office is a mess. Files stacked on every surface.

The group visited Mount Caradhras last summer. Sarah remembers the hike.
`;

function assert(cond: any, msg: string) {
  if (!cond) { console.error("FAIL:", msg); process.exit(1); }
  console.log("OK:", msg);
}

const candidates = extractCandidates(SCRIPT, { knownCharacters: ["Sarah", "Jack"] });
console.log(`\nExtracted ${candidates.length} candidates:`);
for (const c of candidates) {
  console.log(`  - ${c.name}  [${c.sources.join(",")}] conf=${c.confidence} occ=${c.occurrences} type=${c.type} cat=${c.category}${c.parentHint ? ` parent=${c.parentHint}` : ""}`);
}

const names = candidates.map((c) => c.name.toLowerCase());
assert(names.some((n) => n.includes("smith house")), "Slugline parent SMITH HOUSE found");
assert(names.some((n) => n.includes("kitchen")), "Sublocation KITCHEN found");
assert(names.some((n) => n.includes("old mill")), "Mentioned OLD MILL found");
assert(names.some((n) => n.includes("police station")), "Slugline POLICE STATION found");
assert(names.some((n) => n.includes("alley")), "Action-line ALLEY found");
assert(names.some((n) => n.includes("mount caradhras")), "Worldbuilding Mount Caradhras found");
assert(names.some((n) => n.includes("jack")), "Character-associated Jack's Apartment found");

// Compare test
const existing = [
  { name: "Smith House", aliases: ["The Smith residence"], status: "developed" },
  { name: "Retired Location", aliases: [], status: "approved" },
];
const cmp = compareCandidates(candidates, existing);
console.log(`\nCompare: ${cmp.entries.length} entries, missing: ${cmp.missingFromScript.join(", ")}`);
assert(cmp.missingFromScript.includes("Retired Location"), "Retired Location reported as missing from new scan");
assert(cmp.entries.some((e) => e.status === "duplicate" || e.status === "alias"), "Existing Smith House detected as duplicate/alias");

// Redevelop test
const weak = { logline: "", type: "", scale: "[Not enough information]" } as Record<string, string>;
const { profile, filled } = redevelopProfile({
  name: "The Old Mill",
  existingProfile: weak,
  candidate: candidates.find((c) => c.name.toLowerCase().includes("old mill")),
  storyContext: { storyWorld: "Harrow County", theme: "decay", tone: "melancholic" },
});
console.log(`\nRedeveloped ${filled.length} fields. Sample logline: ${profile.logline}`);
assert(profile.logline.length > 10, "Redevelop filled logline");
assert(filled.includes("type"), "Redevelop filled type");

console.log("\nALL OK");
