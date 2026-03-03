# Feature Research

**Domain:** Sci-fi survival MMO — Combat Depth, Biome Hazards, Creature AI, Ability Balance, Automation (v1.24)
**Researched:** 2026-03-03
**Confidence:** MEDIUM-HIGH (codebase directly verified; design patterns sourced from WoW, D&D 5e, Dark Souls, No Man's Sky, Elden Ring, idle game design literature)

---

## Context: What Already Exists

This is a systems milestone, not a content milestone. All infrastructure below is already live.

**Existing combat system:**
- `calculateDamage()` in `packages/game-logic/src/combat/damage.ts` — single numeric damage, no type dimension
- `DamageParams` interface — `baseDamage`, `attackerStats`, `defenderStats`, `armorReduction`, no damage type field
- `AbilityEffect` union in `packages/shared-types/src/game/ability.ts` — `damage`, `heal`, `buff`, `debuff`, `dot`, `hot`, `gather` variants; no `shield` variant
- `computeCharStats()` — linear stat aggregation, no soft cap, hard cap, or taper logic
- 21 abilities in `packages/game-logic/src/ability/definitions.ts` — all `damage` effects use raw baseDamage; no damage type; Plasma Burst (35 baseDamage, 1.2 scaling) is strictly dominant over all alternatives

**Existing creature AI:**
- `tickCreatureAI()` in `packages/game-logic/src/ai/creature-ai.ts` — pure FSM, 4 behaviors
- `AiTickResult` — `newPosition`, `aggroTarget`, `shouldAttack`, `shouldReturn`
- No pack signaling, no frenzy state, no ambush state
- `CreatureDefinition` in `packages/entities/src/types.ts` — `behavior`, `baseHealth`, `levelRange`; no `resistances`, `frenzyThreshold`, `packCallRadius`, `ambushRadius`

**Existing biome hazard:**
- `BiomeHazard` interface in `packages/shared-types/src/game/biome.ts` — `type`, `damage`, `frequency` fields defined but not enforced in ZonesService (structure exists, implementation pending)

**Existing structure entity:**
- `Structure` interface in `packages/shared-types/src/core/entity.ts` — `ownerId`, `durability`, `maxDurability`; no automation fields

---

## Feature Landscape

### System 1: Damage Types (Thermal / Cryo / Bio / Kinetic)

#### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| 4 named damage types on abilities | Players expect thematically named abilities (Thermal Lance, Cryo Blast) to differ beyond raw numbers | LOW | Thermal Lance, Cryo Blast, Electrocute already exist — names imply types; mechanical backing is the missing piece |
| Per-creature resistance and vulnerability multipliers | Expected in every RPG with typed damage since Final Fantasy VII; creatures that ignore type context feel like placeholder content | MEDIUM | Add `resistances: Partial<Record<DamageType, number>>` to `CreatureDefinition`; apply multiplier in `calculateDamage()` after existing calculations |
| Damage type label in combat log | Players need confirmation the system has effect — "Thermal: 42" vs just "42" | LOW | Combat log already exists; add type prefix/suffix to damage event string |
| Color-coded floating damage numbers per type | Thermal = orange, Cryo = cyan, Bio = green, Kinetic = white — table stakes visual polish for typed damage | LOW | EntityRenderer floating numbers already implement color parameter; just map DamageType to hex color |

#### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Gear that boosts specific damage type output | Creates build diversity — Thermal specialist vs Bio specialist in same biome | MEDIUM | New `damage_type_bonus` effect key in item effect system; additive multiplier on ability damage if ability damageType matches |
| Creature type distribution matches biome lore | Ice creatures in Frozen Expanse resist Cryo, vulnerable to Thermal — world feels coherent | LOW | Design decision only; existing lore maps biome identity to expected damage type; code cost is just populating `resistances` per creature definition |
| Damage type synergy loop with biome hazards | Cryo-resistant creatures flourish in Frozen Expanse hazard zones — hazard resistance correlates with damage resistance | MEDIUM | Requires Biome Hazard system (System 2); once both exist, creatures with Cryo resistance have appropriate biome placement |

#### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Resistance stat on player per damage type (like WoW's 5 resistance stats) | "More depth per stat" — WoW had Fire Resist, Frost Resist, Nature Resist, Shadow Resist, Arcane Resist | WoW abandoned this system entirely. Per-type player resistance requires dedicated gear sets per encounter that become useless outside that encounter; non-linear scaling (first points weak, last points strong) baffles players; confirmed by WoW community that "stats being sacrificed to add resistance only meaningful in narrow situations" was the primary reason for removal | Keep resistance on the creature side only; player interaction is through offense (damage type bonus items) not defense (type resistance) |
| Immunity to damage type (0x multiplier) | "Solve the puzzle of finding the right weapon" | Creates hard player lock-out — a group or player without the right damage type cannot progress at all; particularly harmful in PvE MMO where loadouts are pre-committed | Cap resistance at 70% reduction maximum; creatures always take at least 30% of base damage; player always has a path forward regardless of loadout |
| Vulnerability = 2x damage (D&D 5e style) | Simple binary: resistance halves, vulnerability doubles | D&D 2024 designers documented this as a problem: vulnerability creates extreme damage swings that trivialize fights; the 2024 Monster Manual barely added any new vulnerabilities despite hundreds of new stat blocks, explicitly because doubling damage is too punishing | Use soft bands: 0.5-0.75x for resistance, 1.25-1.5x for vulnerability; never more extreme |
| All 21 abilities retroactively typed as different damage types | "More variety" | Combat readability collapses if players need to track 21 ability-type interactions; useful for progression damage types only | Assign damage type to thematically obvious abilities (Thermal Lance = Thermal, Cryo Blast = Cryo, Electrocute = Bio for shock/organic, Concussive Strike = Kinetic); leave basic/generic abilities as untyped "Physical" which no creature resists |

---

### System 2: Biome Environmental Hazards

#### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| HP drain in hazardous biomes without protection gear | Dark Souls poison swamps, NMS radiation/heat planets — players expect dangerous zones to cost HP over time | MEDIUM | `BiomeHazard.damage` field exists in `biome.ts` but is not applied; implement in ZonesService per-tick; check player gear's `hazardProtection` before applying |
| Stat debuffs in extreme biomes without gear | Frozen Expanse reduces Haste (movement slowed by cold); Volcanic Ridge reduces Durability regen (heat degrades suit) — zone identity beyond just HP | MEDIUM | Buff system already supports debuffs; add server-side hazard tick that applies timed debuffs; debuffs auto-reapply each tick while in biome without protection |
| Specific gear items counter specific biome hazards | OSRS slayer equipment grants specific creature immunity; NMS hazard suits per planet type — gear purpose drives progression | MEDIUM | New `hazardProtection: HazardType[]` field in item effects; ZonesService checks player's active equipment for hazardProtection before applying hazard tick |
| HUD indicator showing active hazard | Players need awareness: "I am being drained by environment" — Dark Souls shows poison buildup bar | LOW | Zone HUD already shows tier indicator; add hazard icon overlay (color-coded by hazard type) when player is in unprotected hazard zone |
| Hazard gear available before hazard zone rollout | Deploying hazard damage to tier II+ zones without protection gear being purchasable = punitive to all players | LOW | Design gate only: ensure each hazard biome has a corresponding protective gear item in faction hub traders before enabling hazard damage for that biome |

#### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Tiered hazard severity matching biome tier | Tier II biomes: stat debuff only (survivable without gear but inefficient); Tier III: HP drain + debuff (cannot sustain without gear); Tier IV: stacking drain (lethal without full protection) — rewards partial gear investment | MEDIUM | Three hazard severity levels map to BiomeTier 2/3/4; Tier I biomes have no environmental hazards |
| Hazard-specific consumables as emergency counters | Players without proper gear can use consumables for timed protection — creates economy demand and "temporary power" moments | LOW | Consumables already exist as category; add `hazard_antidote` consumable type with 5-minute timed protection; sold by traders and dropped by hazard-adapted creatures |
| Hazard type maps to damage type | Toxic hazard = Bio damage type; Cryo hazard = Cryo damage type — unified type vocabulary across combat and environment | LOW | Design coherence decision; no extra code; same `DamageType` enum used for both creature resistances and biome hazard classification |

#### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Instant death without proper gear | "Hardcore survival feel" | Punishes new players who accidentally enter wrong tier zone; breaks moment-to-moment exploration for testing gear combos; kills progression experimentation | Rapid HP drain kills in approximately 30-45 seconds without gear — fast enough to communicate danger, slow enough to allow retreat |
| Movement slow in all hazard zones | Dark Souls poison swamp movement penalty is iconic | Stacking movement penalty with HP drain and stat debuff is triple-punishment in the same zone; Dark Souls swamps are widely cited as the least-liked zones in the series specifically because of this stacking | Choose one hazard type per biome: HP drain OR stat debuff OR movement penalty, not all three |
| Hazards that bypass Emergency Shield and consumables | "Forces gear dependency" | Removes all player agency; no counterplay loop | All hazards must have at least one countermeasure (gear, consumable, or ability); Emergency Shield grants 5s immunity window to hazard damage |
| Global hazard tick every second | Performance | ZonesService tick already runs; adding per-player hazard check every second with inventory inspection across 100+ players is O(n) per second | Hazard tick every 5-10 seconds; short-duration debuffs auto-refresh; does not need to be realtime |

---

### System 3: Creature Behavior Upgrades

#### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Pack Call: omnivore signals nearby allies on aggro | WoW "adds" on aggro, OSRS linked spawns — "help is coming" is expected for social creatures | MEDIUM | `AiTickResult` needs `packCall?: boolean` signal; ZonesService handles radius scan for same-speciesId creatures within `packCallRadius`; triggers `aggroTarget` on allies |
| Frenzy: predator and maniac enter rage below 30% HP | Boss enrage mechanic exists in every RPG; players expect escalating threat at low HP | LOW | Add `frenzyThreshold?: number` to `CreatureDefinition`; in `tickPredator()`, check `creature.health / creature.maxHealth < frenzyThreshold` and apply damage/speed multiplier to `shouldAttack` result |
| Ambush: creature breaks from passive until trigger radius | Stalking predators are expected in dangerous zones; Rise of the Tomb Raider wolves, Alien Isolation — waiting threats are memorable | MEDIUM | New `ambush_waiting` state in creature FSM; creature does not wander until player enters `ambushRadius` tiles; state transition to standard predator aggro on trigger |
| Stampede: fleeing herbivores pull nearby herd into flee cascade | Herd flight behavior; expected for large grazing animals; boids-style cascade flee is intuitive | MEDIUM | Herbivores in flee state broadcast to nearby same-species within `stampede_radius`; other herbivores join flee in same direction using existing `flee()` function |

#### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| One behavior upgrade per behavior type (Stampede/Pack Call/Ambush/Frenzy mapped to herbivore/omnivore/predator/maniac) | Herbivores feel like herbivores; omnivores feel social and reactive; predators feel like hunters; maniacs feel unpredictably dangerous — each type has strong identity | LOW | No extra implementation complexity; upgrade is just the natural expression of the behavior type's already-established identity |
| Frenzy triggers creature color state change | Players learn frenzy threshold by observation — creature turns red/orange — not by reading stats; emergence over instruction | LOW | EntityRenderer already supports color overrides; add frenzy color state overlay when `frenzyActive` flag is true |
| Pack Call hard-capped at 2-3 allies maximum | Prevents infinite pull chains — WoW Classic's linked patrol pull chains are infamous for group wipes | LOW | Hard cap in ally scan: `nearbyAllies.slice(0, MAX_PACK_CALL_COUNT)` where constant is 2; documented in code |

#### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Adaptive learning AI (creature learns player attack patterns) | "Living world" appeal | Extremely high implementation complexity; no proven production MMO implements ML-based per-creature learning; creates untestable edge-case behaviors at scale; maintenance burden per update | Deterministic scripted behavioral upgrades via state machines — predictable, testable, engageable; fun comes from player learning creature patterns, not creature learning player |
| Creature reinforcement spawning (Pack Call summons new creatures from offscreen) | More threat | Spawn cap complexity; can flood zones with creatures if pack call triggers recursively; server performance risk | Pack Call only signals existing nearby creatures; never spawns new ones; if no creatures are in radius, no allies arrive — tension without risk |
| Stampede physics with entity collision simulation | "Realistic herd panic" | Core movement is tile-based grid; free-movement physics collision requires rewriting movement system | Stampede on grid: cascade flee-direction broadcast using existing `flee()` function; visual effect communicates the chaos without physics simulation |
| Frenzy as permanent state once triggered | "Boss-phase intensity" | Without a timer, frenzy becomes the creature's de facto default late in every fight; removes tension arc | Frenzy is health-threshold-based: active below 30% HP, deactivates on health restoration (e.g., from creature regeneration); creates re-emergence tension |

---

### System 4: Ability Rebalance

#### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Plasma Burst dominance removed | Current: 35 baseDamage + 1.2 scaling vs Energy Pulse at 12 baseDamage + 0.8 scaling; rational player always chooses Plasma Burst; zero ability diversity exists | LOW | Reduce Plasma Burst to 28 baseDamage + 1.0 scaling; assign Thermal damage type for situational niche; lower energy cost of alternatives by 3-5 to encourage use |
| Defensive abilities grant actual shields or damage reduction | Currently Emergency Shield and Magnetic Field buff `toughness` stat, which only slightly reduces armor calculation — not a meaningful defense in fast real-time combat | MEDIUM | Add `shield` variant to `AbilityEffect` union: `{ type: 'shield'; absorb: number; duration: number }` in `ability.ts`; Emergency Shield = 50 HP absorb shield for 8s; Magnetic Field = 15% damage reduction buff for 12s |
| Each offensive ability has a unique situational niche | Currently all 11 offensive abilities differ only in baseDamage and cooldown — no reason to choose one over another besides "highest damage per energy" | MEDIUM | Assign `damageType` to thematically matched abilities; add secondary effects (slow, armor pierce, DoT bonus) that match damage type identity |
| Defensive and utility abilities have identifiable purpose | Currently a player can complete all content using only Plasma Burst + Nano Repair; defensive abilities are optional flavor | MEDIUM | Biome hazards and creature behavior upgrades make defensive abilities necessary: Emergency Shield counters Frenzy burst, Energy Barrier mitigates biome hazard ticks |

#### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Damage type assigned per ability at the definition level | Players select abilities knowing what damage type they deal — pre-encounter gear planning becomes strategic | LOW | Add `damageType?: DamageType` to `AbilityDefinition` in `shared-types/src/game/ability.ts`; optional field (undefined = Physical/untyped, which no creature resists as a default) |
| Defensive abilities counter specific creature behaviors | Emergency Shield absorbs one Stampede/Frenzy burst; Energy Barrier reduces biome hazard tick damage — defensive abilities feel purposeful vs specific threats | MEDIUM | Implementation is purely in ZonesService and combat handling: check if player has Emergency Shield active when Stampede burst resolves; subtract absorb amount |
| Utility abilities given combat-relevant secondary hooks | Resource Scan also reveals target creature's damage type resistances (tooltip shows "Weak: Thermal, Resistant: Cryo"); Analyze Specimen adds 10% damage amp vs target for 15s — utility slotting has combat reward | LOW | Analyze Specimen already has `power` buff; add a secondary effect that broadcasts creature resistance data to player; zero new system needed, just extend AbilityService handler |

#### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| New abilities added (22+) | "More choices = more fun" | Current 21 abilities are already underutilized because several have no distinguishable purpose; adding more before fixing existing ones creates a longer list of ineffective abilities | Deepen existing 21 with damage types and secondary effects; PROJECT.md explicitly scopes "rebalance existing 21, don't add new ones yet" |
| Hard ability counters (one ability nullifies another entirely) | Competitive game depth | PvP is explicitly out of scope in PROJECT.md; hard counters in PvE frustrate players when their loadout lacks the counter; creates mandatory-optimal builds | Soft counters: abilities deal 20-30% more vs specific conditions, never complete shutdown |
| Per-creature ability unlock (Thermal Lance only works on fire creatures) | "Puzzle-like encounters" | Creates player lock-out in zones with mixed creature types; inventory management overhead; requires ability availability tracking per target | Damage type multipliers provide situational depth without locking ability availability; all abilities work on all targets, just more/less effectively based on type match |
| Ability synergy combos (Electrocute + Bio vulnerability = special effect) | Deep combat system feel | Synergy tracking requires server-side state per active-ability combination; high implementation cost for a system where combat is already fast and fluid | Damage type alignment (Cryo ability vs Cryo-vulnerable creature) is sufficient depth signal; chain combos deferred to future milestone |

---

### System 5: Stat Caps with Diminishing Returns

#### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Soft cap at stat value 200 | Elden Ring has multiple soft cap inflection points per stat; Diablo III has DR on attack speed; WoW had haste DR; stat caps are universal in action RPG progression | LOW | Add taper logic in `computeCharStats()` after equipment aggregation: `effectiveStat = raw <= 200 ? raw : 200 + (raw - 200) * 0.5` |
| Hard cap at stat value 400 | Absolute ceiling prevents infinite-scaling cheese builds; expected in any game with equipment bonuses | LOW | `Math.min(effectiveStat, 400)` per stat; applied after soft cap taper |
| Stats panel shows soft cap threshold | Players need to know when they've hit the soft cap — tooltip, indicator, or color shift on stat display | LOW | Stats panel already exists; add "(soft cap)" text label or color change when computed stat > 200 before taper |
| Soft cap applied to equipment bonuses only, not base level stats | Level scaling is linear by design; capping base level stats would punish leveling — Elden Ring model: level caps per stat, not a universal cap on total stat | LOW | Apply taper only to the `equipment + buff` portion of stat computation; base level scaling remains linear |

#### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Per-stat different soft cap thresholds | Haste soft caps at 150 (attack speed has diminishing practical returns earlier); Durability at 250 (HP should remain meaningful at high values) — balance reality expressed through design constants | LOW | Single config object `STAT_SOFT_CAPS: Partial<Record<keyof CharacterStats, number>>` with defaults for each stat; applied in `computeCharStats()` |
| Specific exotic/legendary items noted as "bypasses soft cap" flavor | End-game chase items that push past the usual ceiling — creates legendary item fantasy | LOW | `bypasses_soft_cap?: boolean` on item definition; ZonesService skips taper for that stat contribution if present; rare treat for top-tier gear |

#### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Multiple breakpoint curves (soft cap / hardcap / diminishing cap / extreme cap) | "More nuanced progression curves" | WoW's legacy resistance non-linearity was extensively documented as confusing — "your first points are worth very little, each additional is worth more than the last" was specifically called out as counter-intuitive design; players need to understand the curve to plan builds | Single soft cap at 200, single hard cap at 400; two numbers players can remember; formula expressible as one line |
| Diminishing returns on base level-up stat gains | "High-level stats shouldn't feel as impactful" | Undermines the primary motivation for leveling (stat growth); base level scaling must feel rewarding per level to maintain XP loop interest | DR applies only to total equipment bonus contributions, not level-derived base stats |
| Retroactive soft cap recalculation on all existing characters | Implementation safety | Could cause sudden stat drops on login for established characters; negative experience | Apply soft cap only to new stat calculations; established characters remain grandfathered until next stat recalc event or re-equip |

---

### System 6: Automation Tech Tree

#### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Deployable extractors placed on resource nodes (T2) | NMS Mineral Extractor, Factorio mining drill — automated node extraction is the expected first step of any base-building/automation arc | HIGH | New `Structure` entity subtype `extractor`; add `accumulatedResources: number`, `targetNodeId: string`, `extractionRate: number`, `maintenanceDue: number` fields to Structure (already has `ownerId` and `durability`) |
| Extractor generates resources passively over time | Core of offline loop — player returns to collect accumulated resources | MEDIUM | Server-side automation tick service (e.g., every 5 minutes); adds to `accumulatedResources`; capped at max storage |
| Extractor has maintenance fee (credit debit per tick) | NMS extractors require power; creates credit sink and active gameplay incentive to check extractors | MEDIUM | On each automation tick, deduct maintenance cost from player credits; if player credits reach 0, extractor pauses; player must return to resume |
| Extractor has maximum storage cap requiring collection visits | NMS storage depots fill up and require manual pickup — creates return-to-base loop | LOW | `maxStorage: number` constant per extractor tier; accumulation stops when full; player must visit to collect |
| Survey Beacon caches passive resource deposit data (T3) | NMS survey beacon reveals deposit type and quality; players expect passive scanning in sci-fi automation context | HIGH | New `Structure` type `survey_beacon`; on player zone entry, broadcasts cached deposit data (resource type, location, estimated richness) to that player |
| Planetary Extractor with high throughput, high cost (T4) | Capstone automation; higher tier version of basic extractor with 5-10x resource rate | HIGH | Same structure type, different tier constants (higher `extractionRate`, higher deploy cost, limit 1 per zone per player) |
| Resource Refinery converts raw to refined materials (T5) | NMS refiner, Factorio assembler — raw → processed is table stakes for automation endgame | HIGH | New `Structure` type `refinery`; accepts raw resource input, time delay, produces refined output; recipe table maps input → output |
| Credit sinks for deployment, maintenance, and repair | Without sinks, credits accumulate unboundedly after trading is mastered; automation deployment is the natural high-value credit sink | MEDIUM | Deployment cost scales with tier (T2: 500 credits, T3: 2000 credits, T4: 8000 credits, T5: 15000 credits); maintenance fee per 5-min tick scales proportionally |

#### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Per-biome extractor efficiency modifier | Verdant extractor in fungal_forest yields 20% more bio-materials — faction gear synergy expressed through automation | LOW | `extractorEfficiency: Partial<Record<BiomeType, number>>` in extractor configuration; applied as multiplier on `accumulatedResources` per tick |
| Extractors damageable by Stampede behavior | Creature behavior upgrades have real stakes — automation investment at risk in dangerous zones | MEDIUM | Creatures with Stampede behavior have optional `structureDamage: number` flag; ZonesService applies damage to nearby structures during Stampede event; creates zone tension |
| Refinery output rate scales with player Perception stat | Operationally engaging — the player who invested in Perception gains refinery throughput bonus | LOW | `refineryBonus = player.stats.perception * 0.005` multiplier on output quantity; small but meaningful; thematically: skilled analyst operates refinery better |

#### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Multiple automation-specific currencies (fuel cells, power cores, maintenance chips) | "Realism" of running industrial machinery | Idle game design principle (verified from multiple practitioner sources): introducing more than one new resource per feature layer overwhelms players; "the biggest mistake new idle devs make is layering new currencies" | Use existing `credits` as the only automation cost currency; resource materials as the only input cost; single credit maintenance fee per tick |
| Conveyor belts and pipe networks routing resources | "Factorio-like depth" | Tile-based isometric grid does not support conveyor routing; would require new tile interaction layer rewrite; out of scope | Storage depot proximity rule replaces pipe routing: extractor must be within N tiles of refinery to auto-feed; simple spatial relationship replaces routing complexity |
| Crafting recipes unlocked through automation | "Automation unlocks crafting potential" | Crafting is explicitly out of scope in PROJECT.md for this milestone; conflating automation with crafting creates milestone scope creep | Automation produces refined raw materials; a future crafting milestone uses those materials; the two milestones chain naturally |
| Player-owned structures visible to and attackable by other players | "Base raiding tension" | PvP is explicitly out of scope; structures attackable by players creates griefing with no retaliation mechanism; opens complex ownership disputes | Structures are server-authoritative but only damageable by creatures (Stampede behavior); no player-vs-structure damage |
| Automation that replaces manual gathering entirely | "Full idle progression mode" | Kills the gathering mini-game and proficiency system (built in v1.17); makes gathering content dead-weight; makes biome exploration optional after initial extractor placement | Automation supplements offline accumulation; manual gathering yields 2-3x more resources per active hour than equivalent automation; automation covers offline time, active gathering remains optimal for engaged play |
| Automation requiring advanced tool tiers to deploy | "Gating" | Adds friction to automation entry; NMS requires relatively low-tier gear to place first extractors — the point is to let players get automation running, then upgrade it | Gate by credit cost only; any player who earns enough credits can deploy T2 extractor; tool tier affects gathering efficiency separately |

---

## Feature Dependencies

```
[Damage Types]
    └──requires──> [DamageType field added to AbilityDefinition (shared-types)]
    └──requires──> [DamageType field added to DamageParams + calculateDamage() (game-logic)]
    └──requires──> [resistances field added to CreatureDefinition (entities)]
    └──enhances──> [Ability Rebalance] — each ability assigned a damage type gets situational niche
    └──enhances──> [Biome Hazards] — hazard type and damage type use same vocabulary

[Biome Hazards]
    └──requires──> [Damage Types] — hazard uses DamageType enum for classification
    └──requires──> [ZonesService hazard tick with gear check]
    └──requires──> [hazardProtection field in item effects system]
    └──requires──> [Hazard protection gear available in faction traders before hazard zones enabled]
    └──enhances──> [Stat Caps] — stat debuffs from hazards computed through same stat pipeline

[Creature Behavior Upgrades]
    └──requires──> [AiTickResult extended with packCall, frenzyActive signals]
    └──requires──> [CreatureDefinition extended with frenzyThreshold, packCallRadius, ambushRadius]
    └──enhances──> [Damage Types] — Frenzy creatures deal more Kinetic damage (multiplier in frenzy handler)
    └──validates──> [Ability Rebalance] — Stampede burst validates Emergency Shield; Frenzy validates Fortify Systems

[Ability Rebalance]
    └──requires──> [Damage Types] — needs DamageType on AbilityEffect.damage before type assignments
    └──requires──> [shield variant added to AbilityEffect union (shared-types)]
    └──enhances──> [Biome Hazards] — Energy Barrier reduces hazard tick damage
    └──validates──> [Creature Behavior Upgrades] — defensive abilities need threats to counter

[Stat Caps]
    └──requires──> [computeCharStats() taper logic (game-logic)]
    └──requires──> [Stats panel UI: cap threshold indicator]
    └──independent of──> [Damage Types, Biome Hazards, Creature AI, Automation]
    └──should precede──> [Ability Rebalance buff amount tuning] — buff values should be set with soft cap in mind

[Automation Tech Tree]
    └──requires──> [Structure entity extended with accumulatedResources, maintenanceDue fields (shared-types)]
    └──requires──> [Server-side automation tick service (game-server)]
    └──requires──> [Credit deduction on maintenance tick (game-server)]
    └──requires──> [New WebSocket events: structure:deploy, structure:collect, structure:query]
    └──optional──> [Creature Behavior Upgrades: Stampede damaging structures is enhancement, not required]
    └──independent of──> [Damage Types, Biome Hazards, Ability Rebalance, Stat Caps]

[Stat Caps] ──conflict risk──> [Ability Rebalance buff amounts]:
  Emergency Shield buffs toughness by 12 (current); if player already at soft cap, buff loses most value.
  Solution: Review all buff amounts against soft cap after stat cap is implemented first.
```

### Dependency Notes

- **Damage Types must precede Ability Rebalance:** Assigning damage types to abilities is meaningful only after creature resistance data exists. Building ability niches before resistance data means no way to test whether the niches function.
- **Stat Caps should precede buff amount review:** The current Emergency Shield toughness buff of +12 may be over- or under-tuned relative to the soft cap at 200. Implement caps first, then review all buff amounts.
- **Biome Hazards require gear rollout sequence:** The hazard tick must be disabled per biome until at least one counter-item is purchasable for that biome's hazard type. Failure to sequence this creates hostile player experience.
- **Automation is fully independent of combat systems:** The automation tech tree has zero code dependency on damage types, hazards, or AI upgrades. It can be built in parallel.
- **Creature behavior upgrades validate defensive ability rebalance:** Without Pack Call and Frenzy creating genuine threats, there is no player-visible motivation to slot Emergency Shield or Fortify Systems. The AI upgrades provide the threat context that makes defensive abilities purposeful.

---

## MVP Definition

### This Milestone (v1.24) — Phase 1: Combat Depth (Build First)

- [ ] **Damage Types — DamageType enum + calculateDamage() integration** — foundational; unblocks ability rebalance
- [ ] **Creature resistance/vulnerability data** — populate for all 100+ existing creatures; design work
- [ ] **Ability Rebalance — damage types assigned + Plasma Burst detuned** — immediate combat depth payoff
- [ ] **Shield AbilityEffect type** — unblocks Emergency Shield and Fortify Systems having real function
- [ ] **Stat Caps — soft cap 200, hard cap 400 in computeCharStats()** — prevents runaway scaling; precedes buff tuning
- [ ] **Creature behavior upgrades — one upgrade per behavior type** — Pack Call, Frenzy, Ambush, Stampede

### This Milestone (v1.24) — Phase 2: World Depth (Build Second)

- [ ] **Biome hazard tick implementation** — HP drain + stat debuff per hazard-enabled biome
- [ ] **Hazard protection item effects** — `hazardProtection` field in item system
- [ ] **Hazard gear added to faction trader inventories** — required before enabling hazard damage per biome
- [ ] **HUD hazard indicator** — pulsing icon when in unprotected hazard zone

### This Milestone (v1.24) — Phase 3: Automation (Build Third)

- [ ] **Deployable extractor (T2)** — Structure entity extension + automation tick service + collection WebSocket event
- [ ] **Credit sink implementation** — maintenance fee deducted per tick
- [ ] **Survey beacon (T3)** — deposit caching + zone-entry broadcast
- [ ] **Planetary extractor (T4)** — higher tier constant, 1-per-zone cap
- [ ] **Resource refinery (T5)** — input-output recipe table + processing delay

### Add After Validation (v1.25+)

- [ ] **Dynamic hazard events** (void storms, acid rain timed pulses) — trigger when hazard tick infrastructure proven stable
- [ ] **Automation-creature interaction** (Stampede damages structures) — after both systems are independently stable
- [ ] **Per-biome extractor efficiency modifiers** — after automation usage patterns are measured

### Future Consideration (v2+)

- [ ] **Adaptive creature learning AI** — implementation complexity too high; deferred
- [ ] **Ability synergy combo chains** — after base ability balance proven; separate system
- [ ] **Crafting recipes using refined automation output** — next systems milestone; PROJECT.md scope boundary

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Damage types + creature resistances | HIGH | MEDIUM | P1 |
| Ability rebalance (Plasma Burst nerf, shield effect) | HIGH | LOW | P1 |
| Stat caps (soft 200, hard 400) | MEDIUM | LOW | P1 |
| Creature behavior upgrades (4 types) | HIGH | MEDIUM | P1 |
| Biome hazards (HP drain + stat debuff + gear counter) | HIGH | MEDIUM | P1 |
| Deployable extractors (T2) | HIGH | HIGH | P1 |
| Credit sinks for automation | MEDIUM | LOW | P1 (alongside automation) |
| Survey beacons (T3) | MEDIUM | HIGH | P2 |
| Planetary extractors (T4) | MEDIUM | HIGH | P2 |
| Resource refinery (T5) | HIGH | HIGH | P2 |
| Hazard protection gear items | MEDIUM | LOW | P1 (prerequisite for hazard rollout) |
| Dynamic hazard events | MEDIUM | HIGH | P3 |
| Automation-creature structure damage | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must ship in v1.24
- P2: Should ship in v1.24; sequential after P1 phases complete
- P3: Future milestone

---

## Competitor Feature Analysis

| Feature | WoW (Classic) | No Man's Sky | Dark Souls / Elden Ring | D&D 5e (2024) | Our Approach |
|---------|---------------|--------------|------------------------|---------------|--------------|
| Damage types | 6 magic schools + Physical; resistance stats on player AND creature | Not explicitly typed | 6 damage types per weapon; no resistance system, only flat damage numbers | 13 damage types; resistance halves, vulnerability doubles | 4 types (Thermal/Cryo/Bio/Kinetic); resistance on creatures only; soft bands 0.5-1.5x; no player resistance stat |
| Biome hazards | Zone-specific encounter-based resistance sets (not persistent environmental damage) | Per-planet radiation/heat/cold draining life support; hazard suit tiers counter each | Poison swamps, lava zones, scarlet rot zones; ring/armor counters | Not applicable | Persistent per-biome tick; tier-scaled severity (debuff/drain/stacking); gear + consumable counters |
| Creature behaviors | Patrol, aggro range, linked pulls, flee, enrage at low HP | Simple aggro sphere; no advanced behaviors | Boss phases, specific AI per enemy type | Not applicable | 4 existing + 1 upgrade per type: Stampede (herbivore), Pack Call (omnivore), Ambush (predator), Frenzy (maniac) |
| Ability balance | Iterative nerf/buff patches every content cycle; situational niches per spec | Not applicable | Weapon scaling types (STR/DEX/INT/FTH), Ash of War niches | Not applicable | Damage type per ability + shield AbilityEffect; each ability gets type niche vs Plasma Burst generalist dominance |
| Stat caps | Removed elemental resist stats entirely in Cata; soft caps per combat stat (haste, crit) | No stat system | Hard cap at 99; multiple soft cap inflection points per stat | Not applicable | Soft cap at 200, hard cap at 400; taper formula 50% above soft cap; per-stat soft cap constants |
| Automation | None | T1 portable refiner → T2 medium refiner → T3 large refiner; mineral extractor + storage depot; offline accumulation | None | Not applicable | T2 extractor → T3 survey beacon → T4 planetary extractor → T5 refinery; credit-based maintenance; supplements manual gathering |

---

## Existing Codebase Integration Points

Specific files and changes required per system:

| System | Change | File |
|--------|--------|------|
| Damage Types | Add `DamageType` union type and `damageType?: DamageType` to `AbilityDefinition` | `packages/shared-types/src/game/ability.ts` |
| Damage Types | Add `damageType?: DamageType` to `DamageParams`; multiply by resistance in `calculateDamage()` | `packages/game-logic/src/combat/damage.ts` |
| Damage Types | Add `resistances?: Partial<Record<DamageType, number>>` to `CreatureDefinition` | `packages/entities/src/types.ts` |
| Ability Rebalance | Add `shield` variant to `AbilityEffect` union: `{ type: 'shield'; absorb: number; duration: number }` | `packages/shared-types/src/game/ability.ts` |
| Ability Rebalance | Update `ALL_ABILITIES` constants with damage types and rebalanced values | `packages/game-logic/src/ability/definitions.ts` |
| Stat Caps | Add taper function and hard cap clamp after equipment aggregation | `packages/game-logic/src/stats/char-stats.ts` |
| Biome Hazards | Add `statDebuff?: { stat: keyof CharacterStats; amount: number }` to `BiomeHazard` | `packages/shared-types/src/game/biome.ts` |
| Biome Hazards | Add `hazardProtection?: HazardType[]` to item effect system | `packages/items/src/types.ts` (or equivalent) |
| Creature AI Upgrades | Add `packCall?: boolean`, `frenzyActive?: boolean`, `ambushTriggered?: boolean` to `AiTickResult` | `packages/game-logic/src/ai/creature-ai.ts` |
| Creature AI Upgrades | Add `frenzyThreshold?: number`, `packCallRadius?: number`, `ambushRadius?: number` to `CreatureDefinition` | `packages/entities/src/types.ts` |
| Automation | Add `accumulatedResources?: number`, `targetNodeId?: string`, `maintenanceDue?: number` to `Structure` | `packages/shared-types/src/core/entity.ts` |

---

## Sources

- [WoW Resistance System — Wowpedia](https://wowpedia.fandom.com/wiki/Resistance) (MEDIUM confidence — community wiki with historical accuracy on mechanic removal rationale)
- [Elemental Damage and Resistance WoW Discussion](https://us.forums.blizzard.com/en/wow/t/elemental-damage-and-resistance/134937) (MEDIUM confidence — community forum)
- [D&D 5e Vulnerability is Bad — Blog of Holding](https://www.blogofholding.com/?p=8544) (HIGH confidence — quantitative analysis; double damage too punishing)
- [D&D 2024 Monster Manual Resistance Removal Discussion — D&D Beyond](https://www.dndbeyond.com/forums/dungeons-dragons-discussion/rules-game-mechanics/215361-opinions-about-removal-of-resistances-and) (MEDIUM confidence — community analysis of WotC design decision)
- [Diminishing Returns in Game Design — Nerd Bucket](https://blog.nerdbucket.com/diminishing-returns-in-game-design/article) (HIGH confidence — game design publication)
- [Elden Ring Stat Caps Explained — Game Rant](https://gamerant.com/elden-ring-stat-attribute-soft-hard-caps-diminishing-returns/) (HIGH confidence — verified against shipped game)
- [Dark Souls Environmental Hazards — Dark Souls Wiki](https://darksouls.fandom.com/wiki/Environmental_Hazards) (HIGH confidence — official mechanics documented)
- [Passive Resource Systems in Idle Games — AC&A](https://adriancrook.com/passive-resource-systems-in-idle-games/) (HIGH confidence — industry practitioner)
- [NMS Mineral Extractor — No Man's Sky Wiki](https://nomanssky.fandom.com/wiki/Mineral_Extractor) (MEDIUM confidence — community wiki for shipped feature)
- [Idle Game Design Principles — Eric Guan](https://ericguan.substack.com/p/idle-game-design-principles) (MEDIUM confidence — practitioner analysis)
- [6 Core Systems That Make or Break Idle Games](https://subtlezungle.substack.com/p/6-core-systems-that-make-or-break) (MEDIUM confidence — design analysis)
- [Boids Algorithm — Wikipedia](https://en.wikipedia.org/wiki/Boids) (HIGH confidence — academic source for pack/herd AI framework)
- [Designing Game Economies — Medium](https://medium.com/@msahinn21/designing-game-economies-inflation-resource-management-and-balance-fa1e6c894670) (MEDIUM confidence — practitioner overview)
- Codebase direct verification: `damage.ts`, `creature-ai.ts`, `char-stats.ts`, `definitions.ts`, `entity.ts`, `biome.ts`, `ability.ts`, `combat.ts` (HIGH confidence — direct file analysis)

---

*Feature research for: Into the Void v1.24 Balance & Automation*
*Researched: 2026-03-03*
