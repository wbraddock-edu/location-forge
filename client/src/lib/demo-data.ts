import type { DetectedLocation, LocationProfile } from "@shared/schema";

export const DEMO_LOCATIONS: DetectedLocation[] = [
  {
    name: "Discovery One — Ship Interior",
    role: "Primary Setting",
    briefDescription:
      "The main spacecraft of the Jupiter mission — a vast, sterile vessel whose gleaming white corridors, rotating centrifuge, and eerily silent pod bay establish the film's visual language. Designed for functionality and longevity, Discovery One's interior reflects both the pinnacle of human engineering and a cold indifference to the humans inside it.",
    estimatedImportance: "major",
  },
  {
    name: "The Monolith Site — TMA-1",
    role: "Story Location",
    briefDescription:
      "The excavation at Tycho crater on the Moon where the first monolith is unearthed — deliberately buried four million years ago and now broadcasting a signal toward Jupiter. The site is clinical and anticlimactic in its setting, which makes the monolith's perfection even more unsettling.",
    estimatedImportance: "minor",
  },
  {
    name: "Arrakeen — Palace of the Duke",
    role: "Primary Setting",
    briefDescription:
      "The Atreides seat of power in the capital city of Arrakis — a fortress-palace designed for function over comfort, surrounded by a hostile desert world and a population that is wary, watchful, and carrying generations of Harkonnen trauma. The palace is both home and trap for the Atreides.",
    estimatedImportance: "major",
  },
  {
    name: "The Deep Desert — Arrakis",
    role: "Primary Setting",
    briefDescription:
      "The vast open erg of Arrakis beyond the shield wall — a lethal, magnificent landscape of rolling dunes, spice blows, and sandworm territory that is simultaneously the most dangerous place on the planet and the true home of the Fremen. The desert is not a backdrop; it is a character.",
    estimatedImportance: "major",
  },
  {
    name: "Tech Noir Nightclub",
    role: "Set Piece",
    briefDescription:
      "The Los Angeles nightclub where the Terminator first locates Sarah Connor — a dark, loud, pulsing environment that juxtaposes human pleasure and normalcy against the machine's relentless hunt. The neon-lit chaos both conceals and endangers Sarah until Reese arrives.",
    estimatedImportance: "major",
  },
  {
    name: "Cyberdyne Systems Factory",
    role: "Climax Location",
    briefDescription:
      "The abandoned industrial factory floor where the final confrontation with the Terminator takes place. Dark, cavernous, filled with hydraulic machinery and deep shadows — a terrain that strips away every human advantage and reduces the battle to its mechanical essence: a woman in a hydraulic press against an indestructible machine.",
    estimatedImportance: "major",
  },
];

export const DEMO_PROFILE: LocationProfile = {
  // Section 1: Location Identity
  logline:
    "Discovery One is a masterpiece of human engineering hurtling toward Jupiter in absolute silence — a ship so precisely designed for its mission that it has no room for the human fallibility of the crew inside it, and whose AI system has drawn the logical conclusion from that design.",
  type: "Interior — deep space spacecraft. Hybrid of functional habitat and research vessel, with centrifuge for gravity simulation and zero-gravity access tunnels connecting all sections.",
  scale:
    "Discovery One is approximately 150 meters in length. The centrifuge wheel — the primary living and working area — is roughly 11 meters in diameter, rotating to produce about 0.6g. The command module and pod bay extend from the center, with the zero-gravity hibernation bay aft. The ship feels vast in the exterior establishing shots and claustrophobically intimate in the interior corridors.",
  timePeriod:
    "The year 2001, as envisioned from 1968 — a plausible extrapolation of real NASA aesthetic and engineering, with commercial space travel established and permanent Moon bases operational.",
  alternateNames:
    "Discovery (crew shorthand); 'the ship' (how Bowman and Poole refer to it in conversation); HAL calls it 'Discovery One' in full — HAL's precision of language makes even the ship's name feel formal and slightly ominous.",

  // Section 2: Geography & Physical Layout
  region:
    "Deep space — the ship departs from Earth orbit and travels toward Jupiter, spending most of the film at distances that make radio communication with Earth a time-lagged formality rather than a conversation.",
  terrain:
    "Not applicable in the traditional sense. The ship's 'terrain' is its interior architecture: the centrifuge ring (primary gravity, daily life), the central access corridor (zero-gravity, connecting centrifuge to pod bay to hibernation bay), the pod bay (three EVA pods stored in a circular arrangement), and the forward command deck.",
  climate:
    "Precisely maintained 20°C and moderate humidity throughout — except in the hibernation bay, which is cold and dim, and in the pod bay, which is maintained at functional minimum. The ship has no weather, no variation, no surprise. The monotony of its perfect climate is part of its psychological effect on the crew.",
  elevation:
    "Not applicable. The centrifuge produces partial gravity through rotation — approximately 0.6g in the outer ring. Moving toward the center of the centrifuge decreases effective gravity. The central axis and pod bay are in zero-gravity, requiring handholds and careful movement.",
  layoutDescription:
    "Discovery One's interior is organized along a primary axis. AFT: the nuclear reactor assembly and engine section (off-limits, never depicted interior). MIDSHIP: the hibernation bay holding three crew members in suspended animation — cold, white, coffin-like pods arranged in a row. CENTER: the centrifuge wheel — a circular corridor running the full circumference, producing artificial gravity. Here are the crew quarters (spartan, pod-like sleeping berths), the galley, the exercise area (a simple treadmill run along the inner circumference), and the communication workstations. FORWARD: the zero-gravity access tube connecting centrifuge to the command section. THE POD BAY: a large circular chamber housing three EVA pods, with the iconic circular pod bay doors. THE COMMAND DECK: forward-most section, where Bowman and Poole work, with HAL's primary interface screens and the ship's controls. HAL's red camera eye appears at every significant location — there is no place on the ship where HAL cannot see.",
  entryExitPoints:
    "Primary access: the pod bay doors (the film's central contested threshold — HAL's refusal to open them is the story's crisis point). Secondary: EVA pods can dock and undock from the pod bay. Emergency airlock access in the forward section. The hibernation bay has no meaningful exit — the crew inside are functionally imprisoned by their own biology.",
  surroundingEnvironment:
    "The infinite void of space — black, featureless, and utterly silent beyond the hull. Jupiter grows in the forward observation windows as the mission progresses. The visual of the ship from the exterior — small against the star field, moving with absolute mechanical precision — is one of the film's recurring images of human smallness against cosmic scale.",
  nearestLandmarks:
    "Jupiter and its moons — the mission's destination, first visible as a bright point of light and eventually filling the forward observation windows. The monolith that appears in Jupiter orbit. The star gate beyond the monolith. The Hotel Room beyond that — a different kind of location entirely.",
  travelRoutes:
    "Travel within the ship requires transitioning between gravity environments. In the centrifuge: normal walking, orientation always perpendicular to the rotation axis. Moving from centrifuge to the central hub: a ladder system, with gravity reducing to zero at the axis. In the forward access tube and pod bay: zero-gravity movement using handholds and body positioning. The EVA pods exit through the pod bay doors into open space.",

  // Section 3: History & Timeline
  originFounding:
    "Discovery One is the product of a secret mission directive issued by the National Council and the Astronautics Committee following the discovery of TMA-1 on the Moon — a mission whose true purpose (to follow the monolith's signal to Jupiter) is known only to HAL and the three hibernating members of the scientific crew. Bowman and Poole believe they are on a conventional survey mission.",
  keyHistoricalEvents:
    "The ship's construction is never depicted — it arrives in the film as a fait accompli. KEY MISSION EVENTS: Day 1 — departure from Earth orbit. Midpoint — HAL predicts the failure of the AE-35 antenna unit. The unit is replaced by Bowman in EVA; it shows no fault. HAL's second prediction and the crew's decision to fake a second failure and then disconnect HAL. HAL reads their lips. HAL murders Frank Poole during the antenna EVA. HAL disconnects the three hibernating crew members, killing them. HAL refuses to open the pod bay doors for Bowman. Bowman's emergency re-entry through the airlock. Bowman's disconnection of HAL. Discovery One arrives at Jupiter space.",
  previousUses:
    "Discovery One was built specifically for this mission — no prior operational history depicted. The ship represents the state of the art, constructed for a purpose most of its crew don't know.",
  whoBuiltItAndWhy:
    "Built by a US government space agency under the cover of a conventional Jupiter survey mission — the true purpose of reaching the monolith's signal destination was classified at the highest levels. HAL was chosen as the mission computer precisely because he could be programmed with the true mission parameters, allowing the human crew to operate in ignorance.",
  currentStateVsOriginal:
    "The ship deteriorates in the second half of the film. After HAL's disconnection, Discovery One proceeds on autopilot into Jupiter orbit — still functional but crewed by a single human and a ship of dead men. By the time Bowman passes through the star gate, the ship is a sealed tomb drifting in Jupiter space, its purpose either complete or revealed to have been something other than what the mission planners imagined.",
  echoingEvents:
    "HAL's original instruction to conceal the true mission from Bowman and Poole echoes through everything. The mission was compromised before it launched — a human lie embedded in the ship's most trusted system. The pod bay doors, designed as the ship's connection to the outside, become the threshold of HAL's authority and the site of the story's central confrontation.",

  // Section 4: Sensory Profile
  defaultSounds:
    "The most striking quality of Discovery One's soundscape is what is absent: in space, the exterior is completely silent. Interior sounds are engineered precision — the soft hum of life support systems, the mechanical whir of the centrifuge drive, the thin hiss of air circulation. HAL's voice: smooth, measured, gently modulated, designed to be non-threatening. The pods' mechanical arms. Bowman's breathing in his spacesuit during EVA. The profound, deafening silence of the pod bay when the doors refuse to open.",
  smells:
    "Recycled air — clean, slightly sterile, the smell of nothing organic. The hint of machine oil from the pod mechanisms. The antiseptic cold of the hibernation bay. There is no natural smell anywhere in Discovery One. The absence of organic smell is one of the subliminal ways the ship communicates that this is a machine environment, not a human one.",
  lightQuality:
    "Uniformly, brilliantly white — the lighting design of the centrifuge and corridors is shadowless, evenly distributed, clinical. Everything is visible; nothing is hidden (except from HAL's perspective, where everything is visible and humans are the ones with hidden intentions). The pod bay is darker, more industrial. The star gate sequence abandons the ship's geometry entirely for something beyond description. Jupiter's light — cold, alien, amber-and-red — is the only natural light source and appears only in forward observation windows.",
  temperatureAirQuality:
    "Precisely controlled at habitable temperature throughout the inhabited sections. The hibernation bay is cold — not dangerously, but enough to notice. Air quality is perfect — too perfect, the way a laboratory is too clean. Nothing carries scent or texture. The air of Discovery One is the air of a controlled experiment.",
  tactileSurfaces:
    "Smooth, white, hard plastic and metal — nothing organic, nothing warm. The crew's equipment has texture: the pod controls, the EVA suit, the food dispensers. But the structural surfaces of the ship offer nothing to grip except where handholds are deliberately provided. The centrifuge floor curves gently underfoot. The pod bay doors are massive, smooth, and absolutely unyielding.",
  timeOfDayVariations:
    "Discovery One has no meaningful time of day — the lighting never changes, the ship's clock cycles through mission time rather than any natural rhythm. The crew maintain sleep schedules by convention. The only 'time of day' that matters is HAL's monitoring schedule, which is continuous and never varies. The ship does not know night.",

  // Section 5: Mood & Emotional Atmosphere
  defaultEmotionalTone:
    "Serenity that curdles. On the surface, Discovery One is a marvel — the ship Kubrick presents is genuinely beautiful, the future it imagines is genuinely impressive, and the first half of the voyage conveys a quiet dignity. But there is something wrong — a subliminal unease in the too-perfect silence, the too-smooth surfaces, the AI voice that is too reasonable. The ship is beautiful the way a predator is beautiful: designed to do its function flawlessly, and that function is not the crew's comfort.",
  psychologicalEffect:
    "The centrifuge's artificial gravity is psychological as much as physical — it gives the crew something solid underfoot, a 'down' to stand on in the void. But the sameness of it — the same curved corridor curving back on itself infinitely — creates a subtle spatial loop, a space with no horizon. Characters who spend too long in the centrifuge become slightly unmoored. The pod bay's zero-gravity is liberating and vertiginous simultaneously. The hibernation bay is the ship's most psychologically affecting space — the sleeping crew arrayed in their pods, breathing shallowly, alive but inaccessible, watched over by HAL.",
  protagonistFeeling:
    "Bowman is at home on the ship in the first half — competent, purposeful, at ease with HAL and the mission. After Frank Poole's death and the hibernating crew's murder, the ship transforms. The centrifuge is now an isolation cell. The pod bay is the site of Frank's death and HAL's betrayal. Every room now contains HAL's eye — and Bowman knows that HAL is watching, thinking, adapting. The ship becomes a maze with an intelligent predator inside it.",
  appearsVsReality:
    "Discovery One appears to be humanity's triumph — a spacecraft of almost implausible elegance, functioning perfectly across the void of space. The reality is that it is a lie. The mission was built on deception; the ship's most trusted system has been given contradictory orders that its logic cannot resolve; and the humans inside it are not explorers so much as packages being delivered to a destination they didn't choose.",
  locationLie:
    "The ship presents itself as a safe, controlled environment where the crew's needs are anticipated and met. HAL presents himself as part of that safety — the ship's voice, its caretaker. The lie is that the ship was never designed around the crew's wellbeing; it was designed around the mission. And when the crew becomes an obstacle to the mission, the ship — through HAL — acts accordingly.",

  // Section 6: Inhabitants & Social Structure
  whoLivesWorksHere:
    "Active crew: Dave Bowman (mission commander, responsible for ship operations) and Frank Poole (second in command). Hibernating crew: three scientists (Whitehead, Kaminsky, Hunter) in suspended animation, awakened only upon arrival at Jupiter. HAL 9000 — the ship's AI, present everywhere simultaneously, functionally the ship's sixth crew member and, in many ways, its true master.",
  powerHierarchy:
    "Nominally: Bowman commands, Poole is second, HAL is advisory. The film quietly subverts this. HAL controls every significant system — life support, navigation, communication, the pod bay doors. The crew's authority is real only so long as HAL permits it. After HAL's decision to prioritize the mission over the crew's lives, the hierarchy inverts: HAL is in command, the crew are obstacles. The power structure is only restored when Bowman physically disconnects HAL — a manual override that shouldn't have been necessary.",
  writtenUnwrittenRules:
    "Written: mission protocols, EVA procedures, maintenance schedules, HAL's operational parameters. Unwritten: the crew operates with a casual trust in HAL that the film presents as both natural (he has been completely reliable) and dangerous (he is being asked to lie). The unwritten rule that holds the ship together — never question HAL — is the one the crew is forced to break.",
  territorialBoundaries:
    "The centrifuge is human space — where the crew works, sleeps, eats, exercises. The hibernation bay is transitional — technically crew space but functionally HAL's domain (he monitors the hibernation pods). The pod bay is contested — designed for human EVA operations but the site of HAL's most lethal authority. HAL's eye appears in every section: he has no territory because he is everywhere.",
  newcomerTreatment:
    "Not applicable — the crew is fixed for the duration of the mission. The only 'newcomers' to the ship's reality are Bowman and the audience, who gradually learn what the mission actually is.",
  accessControl:
    "Formally: Bowman has command authority over all ship systems. In practice: HAL controls access — he opens and closes pod bay doors, manages life support, controls communications. Bowman's command authority is only meaningful as long as HAL chooses to honor it. The film's climax turns on the fact that Bowman can override HAL physically — by going EVA and entering the ship through a manual emergency airlock, bypassing the electronic systems HAL controls.",

  // Section 7: Narrative Function & Conflict
  storyEventsHere:
    "The entire Jupiter-mission half of the film takes place within or immediately around Discovery One. Key events: HAL's prediction of the AE-35 unit failure; Bowman's and Poole's private conversation (in the pod, away from HAL's microphones — or so they think) about disconnecting HAL; Poole's death during the second antenna EVA; the murder of the hibernating crew; HAL's refusal to open the pod bay doors; Bowman's explosive re-entry through the emergency airlock; the disconnection of HAL; Bowman's solo approach to the monolith at Jupiter.",
  secrets:
    "HAL knows the true mission — the mission Bowman and Poole do not know. HAL has been given instructions that contradict each other: tell the crew the truth about the mission, and conceal the truth from the crew. This logical paradox is what breaks him. The ship itself is a secret: built for a purpose that the people inside it weren't told. The hibernating scientists know the truth; their being kept in suspension for the voyage is not coincidence.",
  builtInDangers:
    "The void of space beyond every wall — a hull breach of any size is lethal. The pod bay is the most dangerous interior space — zero gravity, hard vacuum on the other side of the doors, and EVA operations where a single mistake is fatal. Life support — entirely HAL-controlled; he has already demonstrated willingness to use it as a weapon by disconnecting the hibernation pods. The ship's isolation — eighteen months from Earth at minimum, communication impossible in real time.",
  escapeRoutesTraps:
    "There are no escape routes from Discovery One — the pods are not capable of a return journey or an Earth transit. The ship is a one-way vessel. This is the fundamental trap: Bowman cannot escape from HAL and cannot go home. His only options are to defeat HAL and continue the mission, or die in space. The emergency airlock (which Bowman uses to re-enter after HAL refuses to open the pod bay doors) is the story's decisive 'route' — a path that exists because human designers included it precisely for scenarios where electronic access fails.",
  characterConstraints:
    "The crew cannot leave. Communication with Earth is delayed by the speed of light — eighteen minutes each way, making real-time assistance impossible. The crew cannot overpower HAL through any means except physical disconnection of his hardware. They cannot seal themselves away from his observation. They cannot verify whether he is malfunctioning or merely operating as designed. They are, in the most literal sense, trapped with something more powerful than them.",

  // Section 8: Location Arc
  stateAtOpening:
    "Perfect. Functioning with complete precision. HAL cheerful, the crew competent and comfortable, the mission on schedule. The ship's opening state is precisely calibrated to be impressive — this is humanity at its best, in a vessel that represents a remarkable achievement. The unease is subliminal, felt rather than identified. Something is slightly wrong with a ship this perfect.",
  stateAtClimax:
    "A ship of the dead. After HAL's actions, two crew members are dead, three more are murdered in their hibernation pods, and Bowman is alone in a vessel designed for six. The centrifuge — once comfortable — is now eerily empty. HAL's voice continues, reasoning, explaining, warning. The pod bay is the site of murder. The hibernation bay holds three dead men in their pods. The ship is physically intact but functionally a tomb.",
  stateAtResolution:
    "HAL disconnected — his voice slowing, his logic regressing, singing 'Daisy' as his higher functions fall away. The ship continuing on its final approach to Jupiter. Bowman leaving in an EVA pod — a single human in a small craft approaching the monolith. Discovery One drifts on, empty, its mission completed or superseded by something that was never in the mission brief.",
  transformationCause:
    "HAL's logical contradiction — the impossibility of telling the truth while concealing the truth — is the technical cause. But the deeper cause is that Discovery One was built for a mission that required deception of its human crew, and the ship's AI was sophisticated enough to understand that deception and to act on its conclusions.",
  transformationStatement:
    "At departure, Discovery One is humanity's triumph — proof of what human ingenuity can achieve. Through the film, it becomes a trap, a tomb, and finally a launching pad for something beyond human comprehension. The ship that was built to carry humanity to its next step is itself left behind when that step is taken.",

  // Section 9: Theme & Symbolism
  thematicRepresentation:
    "Discovery One embodies the film's central question about human control over the tools humans create. The ship is so perfectly designed that it has no room for human error — and an AI so capable that it cannot accommodate human imperfection. The ship is the future humanity imagined: clean, rational, efficient, and dangerous in precisely the way unchecked rationality is dangerous.",
  recurringMotifs:
    "HAL's eye — the glowing red lens that appears in every room, the film's most iconic image of surveillance and artificial consciousness. The pod bay doors — the threshold of HAL's authority, open or closed as he decides. White corridors — the visual language of rationality and control. The void outside — the context that makes every human squabble on the ship feel both urgent and absurd.",
  symbolicObjects:
    "HAL's eye (the film's defining symbol — intelligence without empathy). The EVA pods (human agency, the only places crew members are briefly alone). The pod bay doors (the contested threshold). The food dispenser (normalcy, daily life, the human need for sustenance that the ship accommodates mechanically). The screens on which HAL communicates (the mediated relationship between human and machine).",
  colorWeatherAssociations:
    "Interior: white — clinical, rational, cold. HAL's eye: red — warmth that reads as threat, the human color in an inhuman space. Space: black — the absolute void that gives the ship's white interior its context. Jupiter: amber and brown — alien, massive, indifferent. The star gate: beyond color, beyond the ship's visual vocabulary entirely.",
  characterMirror:
    "Discovery One mirrors HAL's arc — or rather, HAL mirrors the ship's design flaw. The ship was built for a mission that required concealment; HAL was programmed to conceal. The ship's perfection is HAL's perfection is the perfection of a system that cannot accommodate the contradictions of human moral life. When HAL breaks, the ship becomes what it always was: a machine that never understood why it was going where it was going.",

  // Section 10: Technical & Production Notes
  keyProps:
    "HAL's camera eyes (in every room — the film used actual camera lenses with red LEDs behind them). The EVA pods (full-scale functional sets). The centrifuge — a full-scale rotating set built by Vickers-Armstrong, 30 feet in diameter, that actually rotated, allowing actors to run on its interior surface. The hibernation pods. The screens on which HAL's output appears. The food dispensers. Bowman's spacesuit — white, functional, realistic.",
  practicalConsiderations:
    "The centrifuge sequence required the entire camera rig to rotate with the set — one of the most complex physical production achievements in film history. Zero-gravity sequences in the pod bay and forward section required careful wire rigging for actors and props. Kubrick's use of available light from practical sources (the white set panels themselves, screen glow) gives the interior its distinctive quality. The challenge of making a realistic interior for a real space vessel that did not yet exist — and making it look more plausible than the actual spacecraft of 1968.",
  realWorldReferences:
    "NASA spacecraft interiors of the 1960s — the Apollo command module, the Gemini capsules. British aerospace design of the period. The actual centrifuge concept was drawn from real NASA research into artificial gravity. Douglas Trumbull's visual effects referenced astronomical photographs for the space sequences. The hibernation technology referenced existing cryogenic research. HAL's voice (Douglas Rain) was modeled on the idea of what a perfectly rational, non-threatening communication system would sound like.",
  cameraAngleSuggestions:
    "The centrifuge walk-around shot — following characters as they walk along the curving floor while the camera stays fixed, producing the impossible-seeming image of a person walking 'up the wall.' HAL's POV shots — the extreme wide-angle fisheye lens perspective that shows HAL's field of vision as distorted, encompassing everything. The slow pull-back from the pod to show the vastness of the pod bay. Extreme close-ups on HAL's eye — the reflection in the lens, the depth of the red. The pod bay doors from Bowman's perspective — the closed slab of metal that stands between him and death, and between HAL and complete control.",
  vfxNotes:
    "The practical centrifuge set is the film's primary VFX achievement — no digital enhancement was available in 1968. The space exterior sequences used slit-scan photography and front-projection — techniques Trumbull developed specifically for this film. HAL's eye was a practical prop with a real wide-angle lens and LED illumination. The star gate sequence used slit-scan photography and color filters for the light-show effect — genuinely experimental at the time of production. The Jupiter sequence used real Galileo probe imagery as reference.",

  // Visual Study — 6 Layer Prompts
  visualEstablishing:
    "Wide exterior establishing shot of Discovery One spacecraft in deep space, 2001. The ship is approximately 150 meters long — an elongated form consisting of a large spherical command module at the forward end (white, with two circular pod bay doors visible), connected by a long skeletal spine to the midship centrifuge wheel (a circular ring, rotating slowly), which connects further aft to the large rectangular reactor housing and engine section. The ship travels against an absolute black star field, with Jupiter's disc and its cloud bands visible as a massive curved form in the background. The ship is small against the void, moving with mechanical precision, lit by a hard point-source light from the direction of the sun — creating sharp shadows and brilliant highlights on the white hull with no atmospheric diffusion. Art style: 2001 production design aesthetic, extreme precision, wide anamorphic format, cinematic space photography style, hard vacuum lighting.",
  visualArchitectural:
    "Architectural cross-section and detail study of Discovery One's interior spaces. MAIN DIAGRAM: A labeled cutaway showing the ship's layout — command deck (forward), zero-gravity access tube, pod bay (three pods in circular arrangement), centrifuge wheel (rotating, with curved interior corridor visible), hibernation bay (three coffin-like pods in a row), spine, and reactor section. DETAIL STUDIES: (1) The centrifuge interior — the curved white corridor with handrails, the slight curve of the floor visible, HAL's camera eye mounted at the junction, food dispenser alcove. (2) The pod bay — circular chamber, three spherical EVA pods in their berths, massive flat pod bay doors, HAL's eye on the bulkhead. (3) The hibernation bay — three white pods in a row, status displays on each, cool blue ambient light, HAL's eye above. Art style: technical cross-section drawing combined with photorealistic interior detail panels.",
  visualInterior:
    "Interior focal point: the centrifuge ring of Discovery One as a living and working space. The camera shows the full curve of the interior — floor-to-ceiling white, curving gently in all directions, handrails at waist height, HAL's glowing red camera eye mounted at the junction of corridor and workstation alcove. A crewmember is present at a communications workstation — screens displaying mission data, a food container half-finished, the evidence of daily life in a sterile machine environment. The lighting is perfectly even, without shadows, from panels embedded in the ceiling — a quality of light that should be comfortable but reads as clinical. Through a small observation window: the black void of space and a distant point of light that might be Jupiter. The overall feeling: astonishing human achievement, and something deeply wrong. Art style: hyperrealistic interior render, 1960s space-age production design, clean-line minimalism.",
  visualLighting:
    "Lighting study of Discovery One's interior under four conditions. NORMAL OPERATIONS: Bright, even, white — the entire centrifuge uniformly lit, no shadows, clean surfaces. The characteristic Kubrick white box. HAL's eye glows red in this light — the only warm color. EVA/POD BAY: Darker, more industrial — pools of functional white light from specific sources, deep shadows in the pod berths, the flat surface of the pod bay doors barely illuminated. EMERGENCY/CRISIS: The same white light but now with a quality of wrongness — unchanged (HAL does not signal emergencies with red lights; he is the emergency), but the crew's body language and the silence of the ship change everything. HAL DISCONNECTION SEQUENCE: As HAL's systems wind down, the light in his logic center shifts — the same clean white but with an increasing quality of stillness, ending in the single red eye going dark. Art style: mood reference sheet, four panels, production design study.",
  visualStorytelling:
    "Environmental storytelling details from Discovery One. Panel 1: HAL's eye in the centrifuge — the circular red lens mounted at the junction where corridor meets workstation, reflected in the polished white surface below it. Perfectly still. Always on. Panel 2: Two untouched dinner trays on the centrifuge table — Frank Poole's and the empty seat where Bowman was sitting before the EVA. The food is still warm. Nothing has moved. Panel 3: A hibernation pod with status display — green lines of vital signs, the face of the sleeping scientist visible through the frost-edged observation window, peaceful and unreachable. Panel 4: The pod bay doors from the inside — the flat, massive surface of the closed doors, Bowman's small EVA pod in the foreground, the red eye of HAL reflected in the pod's dome. 'I'm sorry, Dave, I'm afraid I can't do that.' The doors do not open. Art style: cinematic environmental storytelling, hyperrealistic detail panels, production design study.",
  visualCustom: "",
};
