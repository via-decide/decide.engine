# Mars Decision Lab — Refinement Paths

This roadmap focuses on practical improvements to the existing Mars Rover simulator without resetting the core game.

## Path 1 — New User Activation (Onboarding + First Success)

Goal: reduce drop-off between landing and first completed mission.

1. Replace demo-code friction for first run
   - Keep current demo auth, but allow one low-risk "guest drill" mission without code.
   - Trigger demo code gate before advanced mission set.
2. Add progress checklist in coach
   - `Move` → `Scan` → `Answer` → `Handle terrain event` → `Complete mission`.
3. Add first-mission guaranteed win window
   - Cap risk spikes and avoid punishing modifiers in first 2–3 minutes.

Success metrics:
- first mission completion rate
- demo unlock conversion rate
- time-to-first-success

## Path 2 — Decision Depth (Core Gameplay Loop)

Goal: make decisions feel more meaningful than click-speed.

1. Add explicit trade-off cards before major decisions
   - Show "energy cost / risk change / expected intel gain" side-by-side.
2. Introduce 2-step consequence model
   - Immediate result + delayed consequence after 2 turns.
3. Add mission-specific objectives
   - Not just survival/XP, but evidence-quality target and integrity threshold.

Success metrics:
- average decision dwell time
- replay rate per mission
- percentage of runs with strategic (non-random) choices

## Path 3 — Economy & Progression

Goal: convert XP into meaningful long-term progression.

1. Skill tree with role-based branches
   - Student: learning insights and guided hints
   - Analyst: scan fidelity and anomaly decoding
   - Commander: risk control and modifier efficiency
2. Persist loadout choices between runs
   - Pre-mission loadout affects scan cooldown, energy profile, event handling.
3. Badge utility
   - Badges should unlock mechanics, not just cosmetics.

Success metrics:
- D1/D7 return rate
- number of unlocks per active user
- mission depth reached per session

## Path 4 — Systems Reliability & Performance

Goal: improve consistency on mobile and in-app browsers.

1. Add low-performance mode toggle
   - Reduce visual effects, animations, scan overlays, and audio complexity.
2. Add deterministic fallback when API/auth fails
   - Friendly offline path with local-only mission subset.
3. Add state recovery
   - Resume last mission from local state after accidental close.

Success metrics:
- crash/abort rate
- session continuation after interruption
- lower-end device completion rate

## Path 5 — Narrative Layer

Goal: create stronger emotional progression and mission identity.

1. Mission arcs in 3 episodes
   - Recon → Validation → Extraction Decision.
2. Terrain events tied to storyline stakes
   - Each event should influence narrative branch.
3. End-of-run debrief report
   - Decision summary, mistakes, and recommended next mission.

Success metrics:
- mission chain completion rate
- debrief share rate
- storyline branch diversity

## Path 6 — Monetisation-Ready Design (Without Breaking Learning Value)

Goal: prepare premium paths while keeping free core loop useful.

1. Free tier
   - Core missions + baseline progression.
2. Pro tier
   - Advanced missions, deeper analytics debrief, role-specialized skill paths.
3. Team/School tier
   - Cohort dashboards, instructor mode, comparative run analytics.

Guardrails:
- never paywall first success
- keep core learning loop free
- paywall depth, scale, and analytics (not basic playability)

## Suggested rollout order (fastest impact)

1. Path 1 (activation)
2. Path 4 (reliability)
3. Path 2 (decision depth)
4. Path 3 (progression)
5. Path 5 (narrative)
6. Path 6 (monetisation)

## Existing mechanics this roadmap builds on

- Demo unlock flow and in-app browser guidance
- Coach tips
- Difficulty presets and mission modifiers
- Quick/deep scan loop and combo scans
- Terrain event modal (safe vs aggressive)
- XP / tiers / badges / skill-node scaffolding

