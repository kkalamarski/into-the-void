# Pitfalls Research

**Domain:** MMO systems expansion — damage types, biome hazards, creature AI upgrades, ability rebalancing, and automation tech tree added to an existing sci-fi survival MMO (v1.24)
**Researched:** 2026-03-03
**Confidence:** HIGH (based on direct codebase analysis of combat, AI, ability, stat, and economy systems; supplemented by MMO industry patterns and game economy research)

---

## Critical Pitfalls

### Pitfall 1: Damage Type Added to Ability Effects But Ignored By Combat Calculation

**What goes wrong:**
`DamageType` (`Thermal | Cryo | Bio | Kinetic`) is added as a field on `AbilityEffect` and creature definitions. Abilities reference it. But `calculateDamage()` in `packages/game-logic/src/combat/damage.ts` ignores the new field — it has no parameter for damage type, no lookup for resistance multipliers. Resistance values exist on creature definitions but are never read. Combat deals flat damage as before. Players switch to Cryo Blast against a heat-immune creature and see identical numbers. The feature ships but does nothing.

**Why it happens:**
`calculateDamage()` is a standalone pure function with a fixed signature: `DamageParams → { damage, critical }`. Adding a damage type requires threading the type through four call sites: player ability execution in `ability.service.ts`, creature attack tick in `combat.service.ts`, `CombatService.creatureAttackTick()`, and the `DamageParams` interface itself. The function signature must change, the `DamageParams` interface must change, and both call sites must pass the new field. It is easy to add the type to the data model while forgetting to connect it in the combat calculation. No TypeScript error surfaces — the field is optional or ignored.

**How to avoid:**
Make `damageType` a required field on a new `DamageParamsV2` interface (not optional). Change the function signature to require it. TypeScript will fail to compile at both call sites until they pass the damage type. Add a unit test in `damage.test.ts` that asserts: calling `calculateDamage()` against a creature with `resistances.thermal: 0.5` with `damageType: 'Thermal'` produces half the damage of the same call with `damageType: 'Kinetic'`. Do this test first, before any definition changes.

**Warning signs:**
- All damage types deal identical amounts against the same creature regardless of its resistance profile
- Changing `damageType` in a test call to `calculateDamage()` has no effect on the returned damage value
- `CreatureDefinition.resistances` is defined in types but no code path reads from it in `combat.service.ts` or `ability.service.ts`
- The ability tooltip shows "Thermal" type but combat log shows no resistance modifier

**Phase to address:**
Damage type foundation phase — add the `damageType` parameter to `calculateDamage()` and its call sites before adding any creature resistance data.

---

### Pitfall 2: 83 Creature Definitions Need Resistance Fields — Partial Migration Breaks Balance

**What goes wrong:**
The `CreatureDefinition` type is extended with an optional `resistances?: DamageResistances` field. New creatures added in v1.24 get explicit resistance profiles. The 83 existing creatures (in `creatures.ts`, `aquatic-creatures.ts`, `exotic-creatures.ts`) receive no resistances — they default to `undefined`. The combat system interprets `undefined` as either 0% resistance (fully vulnerable to everything) or 100% neutral (ignores all damage types). Neither is correct for all 83 creatures. Tier IV Void Crawler is as vulnerable to Cryo as a Frozen Expanse creature. Balance breaks in every biome.

**Why it happens:**
Adding optional fields to an interface is low friction — TypeScript does not force the author to fill them for existing definitions. The pattern of "add optional field, fill it for new entities, update existing entities later" is consistently never completed under delivery pressure. The 83 existing creatures are across 3 files spanning 1,363 lines. A partial migration — where some creatures have resistances and others don't — creates inconsistent combat behavior that is hard to debug because each creature behaves differently.

**How to avoid:**
Two options — choose one and enforce it:
1. Make `resistances` required on `CreatureDefinition`. TypeScript will refuse to compile until all 83 creatures have the field. Do the full migration in one atomic pass using a script that inserts a neutral resistance profile (`{ thermal: 1.0, cryo: 1.0, bio: 1.0, kinetic: 1.0 }`) for every existing creature, then customize thematically.
2. Define a `DEFAULT_RESISTANCES` constant and make `calculateDamage()` fall back to it when `resistances` is `undefined`. This is safe but requires documenting which creatures are "untuned" vs. "intentionally neutral." Use a lint rule or validation test to flag creatures where `resistances` has been explicitly left undefined (vs. simply not yet assigned).

The resistances for all 83 existing creatures can be assigned thematically in bulk using biome as the primary signal (Frozen Expanse → high Cryo resistance, Volcanic Ridge → high Thermal resistance) even without individual per-creature tuning. This is faster than designing from scratch and produces sensible defaults.

**Warning signs:**
- `resistances` is optional in the type but zero existing creatures have it set after the type change lands
- Combat math treats all creatures the same regardless of biome when using a typed damage ability
- TypeScript strict mode does not flag missing `resistances` fields (confirmed that field is optional, not required)
- No migration script exists in the PR that added the `resistances` field

**Phase to address:**
Damage type foundation phase — resolve the migration strategy (required field vs. defaults) before any ability changes ship.

---

### Pitfall 3: Biome Hazard Tick Added to `runZoneTick()` Without Budget — 1s Tick Becomes 300ms

**What goes wrong:**
Biome hazard processing is added to `AiService.runZoneTick()`. For each player in the zone, the server looks up the player's current tile, fetches the biome at that position, checks equipped gear for hazard counters, and applies stat drains. This adds 2-5 async operations per player per zone per tick. In a zone with 10 players all standing on hazardous tiles, this extends tick processing from ~50ms to potentially 200-400ms. The `AI_TICK_WARN_MS = 200` threshold fires warnings, but the zone ticks continue. Multiple active zones multiply the problem. The server event loop saturates.

**Why it happens:**
The zone tick already processes all creatures (potentially 20-30 per zone), creature combat, and player regeneration. Adding hazard processing feels like "one more loop over players" — but each hazard check requires async zone/tile data, inventory lookups, and stat computation via `computeCharStats()` (which itself loops over all equipped items). `computeCharStats()` is called once per creature combat tick for damage calculation already; adding another call per hazard-checked player doubles the per-tick stat computation load. The current tick runs async operations serially in a for-loop — each `await` blocks the next iteration.

**How to avoid:**
Cache the biome hazard state for a player on zone entry and on equipment change events — not on every tick. A player's hazard vulnerability only changes when they move between biomes or change gear. On player movement, update a server-side `playerHazardState` Map (keyed by playerId) with the current hazard level and counter rating. The tick loop reads from this cached state (synchronous Map lookup) rather than recomputing it. For biome changes: emit a `biome:hazard` event on the WebSocket when the player's biome changes, and update the cached state then. Test the tick budget before and after adding hazard processing: log tick duration across 3 active zones with 5 simulated players each.

**Warning signs:**
- `[AiService] Tick for zone ${zoneId} took ${elapsed}ms (threshold: 200ms)` logs appear after adding hazard processing
- Tick processing time increases linearly with player count in a zone (indicates O(players) sync work inside the tick)
- Server CPU usage climbs to 80%+ with only 10-15 concurrent players
- Creature movement becomes visibly choppy (AI tick overrun causes delayed movement broadcasts)

**Phase to address:**
Biome hazard implementation phase — design the caching strategy before writing any hazard processing code in `runZoneTick()`.

---

### Pitfall 4: Environmental Hazards That Instantly Kill Unequipped Players Before They Can Respond

**What goes wrong:**
Biome hazards are implemented as tick-based HP drains (1 second intervals, matching `AI_TICK_INTERVAL_MS`). Toxic biomes drain 15% HP per tick, cold biomes drain 12% HP per tick. A level 5 player with 150 HP enters the Frozen Expanse (Tier III) and dies in 7 seconds before reaching safety. Players experience this as instant death from invisible punishment. The community response: "the hazard system is a death zone that deletes new players." Toxic/cold gear becomes mandatory gate content rather than meaningful progression.

**Why it happens:**
Tick damage values are designed in isolation from player HP totals. At level 20, a 15% drain on 280 HP is 42 HP/tick — painful but survivable with healing. At level 5, 15% of 150 HP is 22.5 HP/tick — 6-7 ticks to death. The hazard was designed for the expected player level in that tier but applies to any player who enters. The `TIER_LEVEL_REQUIREMENTS` in `biome.ts` restricts Expedition NPC access but a player can walk into an adjacent biome without restriction.

**How to avoid:**
Three design constraints for every hazard value:
1. Maximum tick drain never exceeds 8% of base max HP (not current HP). This ensures even a low-HP player at the wrong tier has at minimum 12 ticks (12 seconds) before death — enough time to flee.
2. First tick applies after a 3-second grace period (not immediately on biome entry). Players crossing a boundary while moving get the warning before any damage.
3. The combat log entry for hazard damage must fire on the first tick with the name of the gear counter (e.g., "Cryo Hazard — equip Thermal Insulation to resist"). No guessing.

Validate every hazard damage value against the lowest-level player who can realistically reach that biome (Tier II: level 10, Tier III: level 25, Tier IV: level 40) and confirm they get at least 10 seconds to react.

**Warning signs:**
- Hazard tick damage expressed as a percentage of max HP but not validated against the minimum HP a player entering this biome would have
- No grace period on first tick (player is punished the moment they step on a hazardous tile)
- Hazard damage feedback is generic ("You took damage") without identifying the hazard type or the counter gear
- Tier II biomes have higher tick damage than Tier I counterparts but are accessible to level 10 players with starting gear

**Phase to address:**
Biome hazard tuning pass — run the numbers after implementation before any QA session.

---

### Pitfall 5: Pack Call and Stampede Behaviors Added Without Zone-Level AI Coordination

**What goes wrong:**
Stampede (herbivores move together in a panic wave) and Pack Call (omnivores call nearby allies into combat) require one creature to affect the behavior of other creatures — cross-entity coordination. The current `tickCreatureAI()` is a pure function: `(creature, players, collisionMap) → AiTickResult`. It receives no information about other creatures. Adding Stampede requires knowing the positions and states of all nearby herbivores. Adding Pack Call requires finding all omnivores within N tiles and setting their `provoked` flag. Neither action is possible in the pure per-creature FSM.

**Why it happens:**
The pure FSM design (`tickCreatureAI`) is correct and clean — it was a deliberate choice (visible in the `creature-ai.ts` docstring: "Pure FSM function: compute creature movement decision for one tick. No mutations, no I/O"). Stampede and Pack Call require a zone-level coordination step that is fundamentally outside this contract. The temptation is to add "nearby creatures" as a fourth parameter to `tickCreatureAI`, but this creates O(n²) lookups — every creature iterates all creatures to find neighbors — and breaks the pure function contract by making each creature aware of all others.

**How to avoid:**
Implement group behaviors as a zone-level pre-processing step in `AiService.runZoneTick()`, before the per-creature FSM loop. Before the `for (const creature of creatures)` loop, run a `detectGroupBehaviorTriggers(creatures, players)` function that:
1. Identifies herbivores in the same spatial cluster (within 5 tiles) that have flee triggers active — marks them with a shared `stampeding: true` flag
2. Identifies provoked omnivores — marks nearby omnivores (within 8 tiles) with `packCallActivated: true`

The FSM then reads these zone-level flags (passed in as part of the creature object or a side Map) without needing to compute them itself. The coordination is in `AiService` (the right place for server-side state mutation); the per-creature response remains pure. Critically, the zone-level step is O(n) for stampeders and O(n) for pack callers — not O(n²) — because it groups by spatial proximity once, then applies flags.

**Warning signs:**
- Stampede or Pack Call is implemented by adding a `nearbyCreatures: Creature[]` parameter to `tickCreatureAI()` — this is the wrong architecture
- Group behavior triggers cause every creature to run a distance check against every other creature every tick (O(n²) per tick)
- Pack Call sets the `provoked` flag on omnivores but the flag-setting code is inside `tickCreatureAI()` itself — mutations inside a "pure" function
- Stampede does not propagate to creatures added to the zone after the trigger fires (because only the triggering creature's state was updated)

**Phase to address:**
Creature AI upgrades phase — design the zone-level coordination architecture before implementing any group behaviors.

---

### Pitfall 6: Plasma Burst Dominance Survives the Rebalance Because Defensive Abilities Still Have No Compelling Reason to Use

**What goes wrong:**
Plasma Burst (`baseDamage: 35, scaling: 1.2, cooldown: 8s`) is nerfed. Its baseDamage drops to 25. Players stop using it as their primary — they switch to Thermal Lance (`baseDamage: 28, cooldown: 7s`) or Concussive Strike (`baseDamage: 20, cooldown: 5s`). Defensive abilities (`Emergency Shield`, `Magnetic Field`, `Fortify Systems`) are "buffed" — their toughness bonuses are increased from +8 to +12. But the buff amounts still apply to a toughness stat that currently provides armor reduction in `calculateDamage()` through a linear formula (`effectiveArmor = armorReduction * (1 + toughness * 0.02)`). At endgame toughness of 150, a +12 buff represents a 2.4% damage reduction increase. This is invisible to players. Defensive abilities remain unused. The rebalance is declared complete, but the offensive meta is unchanged — just redistributed.

**Why it happens:**
Defensive abilities are currently implemented as stat buffs (e.g., `{ type: 'buff', stat: 'toughness', amount: 8, duration: 12000 }`). The `toughness` stat feeds into a linear damage reduction formula that provides diminishing returns at higher stat values. At endgame stats, adding 8-12 toughness represents a rounding error. The players ignoring defensive abilities are not irrational — the expected value of a defensive buff is objectively lower than the expected value of an offensive one, given current stat-to-effect scaling. The milestone specifies "defensive abilities with real damage reduction/shields" — this requires adding a new effect type (`DR` or `shield`) to the `AbilityEffect` discriminated union, not just increasing numbers on existing buff amounts.

**How to avoid:**
For the rebalance to work, defensive abilities must deliver an effect that is visible and un-ignorable: a flat damage reduction percentage (e.g., "absorbs 20% of all incoming damage for 8 seconds") or a HP shield (a separate HP buffer that depletes before actual health). Both require new code paths:
- Add `{ type: 'shield', amount: number }` to `AbilityEffect` — stores an active shield HP pool in `AbilityService.activeBuffs` alongside regular buffs
- In `CombatService.creatureAttackTick()` and `AbilityService.executeAbilityEffects()`, check for active shield before applying HP damage
- The shield pool appears in the HUD as a distinct bar or overlay so players can perceive it working

Without the new effect type, no amount of numerical adjustment to toughness buffs will produce a felt difference in survivability.

**Warning signs:**
- Defensive ability rebalance consists exclusively of number increases on existing `{ type: 'buff', stat: 'toughness', ... }` effects — no new effect types
- Player tests of `Emergency Shield` show HP depletion at the same rate before and after the buff (because toughness at endgame is already high enough that +12 makes no felt difference)
- After the rebalance patch, combat log analysis shows defensive abilities still account for less than 5% of ability uses by active players
- No changes to `AbilityEffect` union type in `packages/shared-types/src/game/ability.ts`

**Phase to address:**
Defensive ability rebalance phase — identify the required new effect type(s) in the type definition before writing any rebalance numbers.

---

### Pitfall 7: Stat Caps at 200 Invalidate Existing Legendaries Because Players Are Already Above the Cap

**What goes wrong:**
The stat cap is defined: above 200 in any stat, gains apply with diminishing returns. Players check their current stats after the patch. A fully-geared level 30+ player with a legendary exosuit already has Power = 185 and Toughness = 172. Any player who equipped a single Power Surge ability buff (+9 power for 12s) was already pushing 194 before the cap landed. After the cap, two players equipping the same total gear load may have different effective stats depending on which buffs are active. Players immediately begin optimization testing to exploit "cap windows." More critically: players who invested in high-power builds discover their legendary gear is "nerfed to the same level as a rare suit stacked with modules" because the effective ceiling was set below the gear's natural output.

**Why it happens:**
Stat caps require two decisions that are often made in sequence rather than simultaneously: (1) where to set the cap, and (2) what currently-equipped gear produces above the cap. Decision 1 is made by looking at intended balance. Decision 2 requires auditing every item in the 230+ item catalog. If the cap is set without the audit, it will retroactively penalize players who built legally under the old system. The `computeCharStats()` function is purely additive — it has no ceiling per stat. Adding diminishing returns above 200 requires a post-aggregation clamp, which is structurally clean. But the economic impact (existing legendaries become less effective) is a player relations problem, not a code problem.

**How to avoid:**
Before setting the cap value, run `computeCharStats()` for a simulated best-in-slot loadout at each tier using existing items. Document the actual stat ceilings naturally achieved by current gear:
- Level 20 + best Tier II legendary suit + 4 modules: Power = X, Toughness = Y
- Level 30 + best Tier III exotic suit + 6 modules: Power = X, Toughness = Y

Set the cap at or above the 85th percentile of natural endgame stat totals — not below the median. The cap should "catch only outliers," not clip the middle of the existing gear distribution. The diminishing returns curve above the cap matters more than the cap itself — a gentle curve (10% reduction per 10 points above cap) is far less disruptive than a hard ceiling.

**Warning signs:**
- Stat cap value (200) is lower than the natural stat total achievable by equipping any currently-existing legendary suit at level 25 with common modules
- Ability buffs (`Magnetic Field: +8 toughness`) are not factored into the cap calculation — a buffed player hits a different effective ceiling than an unbuffed one
- Players report that upgrading from an epic to a legendary suit produces zero effective stat change (the upgrade is entirely absorbed by the cap)
- No pre-implementation audit of current stat distributions across gear tiers exists

**Phase to address:**
Stat cap design phase — run the simulation before selecting any cap value.

---

### Pitfall 8: Automation Extractors Generate Resources But No Credit Sink Results in Runaway Inflation

**What goes wrong:**
Deployable extractors passively accumulate resources while the player is offline. Survey beacons boost collection rates. Planetary extractors operate at scale. Resource processing converts raw materials to refined outputs. Players run for 48 hours and have stockpiles that took 40+ hours of manual gathering to accumulate. Materials flood the economy. The tradeable value of gathered resources collapses. Players who gathered manually pre-automation feel cheated. Players deploying automation feel no sense of progression after the initial setup. Credits become meaningless.

**Why it happens:**
The v1.24 milestone explicitly identifies the lack of credit sinks as a known problem: "Economy with no credit sinks that needs automation costs balanced." Automation deployment costs (deploy fee + maintenance) are the natural sink, but if they are set too low relative to output value, the net credit flow is positive from day one. The classic design error is calculating deployment cost based on initial investment (one-time fee) without accounting for ongoing resource generation rate — the extractor pays for itself in 2 hours and then prints value indefinitely. The `PROJECT.md` notes "Credit sinks tied to automation deployments" — but the binding design question is whether sinks are front-loaded (pay to deploy) or recurring (pay to maintain, or the extractor breaks).

**How to avoid:**
Automation must have recurring costs, not just deployment costs. Design around a "maintenance loop":
- Planetary extractors require periodic resupply of a consumable fuel/reagent (purchased from traders or gathered) — this is both a credit sink and a reason to remain actively engaged
- Extractors have a storage cap: they stop generating when full — forcing players to actively collect, which is time they spend in the world, which generates danger, which makes the game interesting
- Extractor output scales with the rarity of the biome it is deployed in (riskier placement = better output) — players must choose between safe low-yield and dangerous high-yield locations

Document the intended automation income per hour at each tier before writing any code. Verify the credit sink (maintenance cost per hour) is always greater than or equal to 60% of the automation income value. The remaining 40% is profit — the incentive to run the system.

**Warning signs:**
- Automation deployment has a one-time cost but no recurring maintenance mechanic
- Extractor output has no storage cap — it accumulates indefinitely while offline
- Running a planetary extractor for 24 hours generates more resources than 40 hours of manual gathering at the same tier
- The "credit sinks" in the design are entirely up-front (deployment) with no ongoing drain tied to automation output

**Phase to address:**
Automation tech tree design phase — document the income/sink balance sheet before implementing any tier of the tech tree.

---

### Pitfall 9: Ambush Behavior Uses Full Entity List to Find Hidden Positions — O(n) Zone Scan Per Tick

**What goes wrong:**
Predator Ambush behavior requires detecting "out-of-line-of-sight" tile positions. For each Ambush creature, the AI computes positions where the creature is not visible to the target player, then moves toward those. To compute visibility, the AI scans tiles or uses a line-of-sight calculation that iterates over obstacles. With 15 Ambush predators in one zone and 5 players, the per-tick computation becomes expensive. Each tick: 15 creatures × 5 players × (line-of-sight ray-casting) = significant CPU. Combined with existing creature movement, combat processing, and hazard ticks, the 1s AI tick budget is consumed.

**Why it happens:**
Ambush is a behavior that sounds simple ("hide and then attack") but requires spatial reasoning that standard FSM ticks do not. The current tick receives a collision map (`boolean[][]`) but no visibility state. Computing "where can I stand that the player cannot see me" requires either a pre-computed shadow map (expensive to generate per tick) or a per-step ray cast (expensive per creature). The architectural limit of the current system is that the collision map alone is insufficient for visibility-aware movement.

**How to avoid:**
Implement Ambush as a state machine with two phases:
1. **Stalking:** The creature moves toward the player's last known position but through a pre-computed "flank approach" path (e.g., staying at maximum aggro radius, moving perpendicular to the player, not directly toward them). This requires no visibility computation — just directional bias in `moveToward()`.
2. **Strike:** When within 2 tiles, the creature transitions to direct attack. The "hidden until close" feel comes from the indirect approach path, not from actual visibility computation.

Reserve true line-of-sight for the optional Ambush detection mechanic on the player side (a UI warning when an Ambush creature is nearby) rather than implementing it inside the creature FSM. This keeps the creature tick O(1) per creature while delivering the gameplay feel of ambush.

**Warning signs:**
- Ambush implementation adds line-of-sight ray casting inside `tickCreatureAI()` or `AiService.runZoneTick()`
- The tick warn threshold (200ms) triggers consistently in zones with 3+ Ambush creatures
- Ambush creatures share the same tick loop position as all other creature AI — no separate lighter processing path

**Phase to address:**
Creature AI upgrades phase — design the Ambush behavior to avoid visibility computation before any code is written.

---

### Pitfall 10: Frenzy State Not Cleared on Creature Death — Dead Creatures in Frenzy Queue

**What goes wrong:**
Frenzy behavior (maniacs attack faster and deal more damage when below 30% HP) requires tracking a `frenzied: boolean` state on each creature at the server level. When a frenzy creature dies during an AI tick, `CombatService.stopCreatureCombat()` is called, the creature's `active` flag is set to `false`, but a Frenzy state timer or flag may remain in an in-memory Map in a future `FrenzyService` or `AiService`. On the next tick, the zone processes "active frenzy creatures" by iterating the Map — it finds the dead creature's ID, attempts to fetch it from the zone, gets `null` or `active: false`, and either logs an error or silently skips. No crash, but state leaks accumulate over time.

**Why it happens:**
State cleanup on creature death has a known existing pattern: `CombatService.stopCreatureCombat(creatureId)` clears the creature's combat session. But combat sessions are stored in `CombatService` (a single Map). Any new AI state introduced for Frenzy/Stampede/Pack Call stored in a new Map (whether in `AiService` or a new service) requires its own cleanup hook — and that hook must be called from both the "creature died to player ability" path (in `AbilityService.executeAbilityEffects()`) and the "creature died to auto-attack" path (in `CombatService.creatureAttackTick()`). Missing one path = state leak.

**How to avoid:**
Centralize all creature state cleanup in a single `handleCreatureDeath(creatureId, zoneId)` method in `EntityService` or `CombatService`. This method is the single point of truth for what gets cleaned up when a creature dies. Any new AI state Maps (Frenzy, Stampede, Pack Call activation timers) register a cleanup callback with this central method. The existing two death paths (`ability.service.ts` and `combat.service.ts`) both call this central method. This pattern is consistent with how `CombatService.handleCreatureDeath()` already exists — extend it rather than create parallel cleanup paths.

**Warning signs:**
- A new `frenziedCreatures: Map<string, FrenzyState>` is added without a corresponding cleanup in `handleCreatureDeath()`
- After killing a frenzy creature, its ID still appears in frenzy-related Maps during the next tick
- Long-running server sessions show increasing memory usage correlated with creature count (Maps grow but entries are never removed)
- `console.warn` frequency for "creature not found" errors increases after the frenzy implementation ships

**Phase to address:**
Creature AI upgrades phase — extend the centralized death cleanup function before adding any per-behavior state Maps.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Making `resistances` optional on `CreatureDefinition` | No compiler errors for 83 existing creatures | Partial resistance coverage creates inconsistent combat behavior; tuning is deferred indefinitely | Never — use required field + default constant, or validate completeness with a test |
| Implementing defensive ability rebalance as larger numbers on existing `buff` effects | No new code needed | Player-invisible improvement; defensive abilities remain unused; "balance pass" had no effect | Never — the milestone explicitly specifies "real damage reduction/shields," which requires new `AbilityEffect` types |
| Front-loading all automation costs (deploy only, no maintenance) | Simpler implementation | No recurring sink; resource inflation once deployers stabilize; economy collapses | Never — recurring maintenance is structurally required for any passive income system to remain balanced |
| Adding biome hazard processing inside `runZoneTick()` without caching | Accurate per-tile hazard detection | Async lookups per player per tick cause tick budget overrun at >5 players per zone | Never for per-player per-tile lookups — cache hazard state on biome entry and gear change events |
| Computing group behaviors (Stampede, Pack Call) inside `tickCreatureAI()` with `nearbyCreatures` parameter | Single function handles all AI | O(n²) per tick; breaks pure function contract; untestable in isolation | Never — zone-level pre-processing is the correct architecture |
| Using the same 1s AI tick interval for both creature movement and hazard damage | Simpler scheduling | Tick budget for hazard damage competes with creature movement; slower ticks break creature responsiveness | Acceptable only if hazard tick is synchronous and O(1) per player (cached state, no async ops) |
| Setting the stat cap value without auditing current gear stat distributions | Fast design decision | Cap falls below natural endgame stat totals; existing legendaries are retroactively nerfed | Never — requires simulation run before the cap value is chosen |

---

## Integration Gotchas

Common mistakes when the 5 new systems interact with existing systems.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Damage types + `calculateDamage()` | Passing damage type through ability effect but not reading it in the damage function | Make `damageType` a required field on `DamageParams` — TypeScript will catch missing pass-through |
| Biome hazards + player regen | Hazard drains HP at 1%/tick while regen restores 1%/tick — net effect is zero for a base-stat player | Hazard drain must be calculated after regen is applied, or set at a rate definitively above the regen baseline |
| Group behaviors + combat sessions | Stampede/Pack Call triggers fire after `processCreatureCombatTick()` — creatures called to combat by Pack Call don't have sessions started until next tick | Run group behavior trigger detection before combat session processing in `runZoneTick()`, not after |
| Stat caps + buff system | Active buff from `Magnetic Field` (+8 toughness) pushes player over cap — cap applies mid-buff — buff appears active but adds zero benefit above the cap | Apply the cap at the point of use (damage calculation), not at buff application — buff numbers displayed in HUD should show actual effective values, not raw buff amount |
| Automation extractors + zone entity system | Deploying an extractor spawns a `Structure` entity in the zone — but the `Structure` interface in `entity.ts` has no `extractorState` field; it cannot track what it is extracting | Extend the `Structure` interface or create a separate `ExtractorEntity extends Structure` — do not store extractor state in the generic Structure type as untyped extra fields |
| Ability rebalance + existing damage type assignment | Thermal Lance already has a thematic name suggesting Thermal type — but if `damageType` is assigned based on new rules, weapons already granted via existing suits will silently change behavior | Audit ability-to-damage-type assignments against all currently granted abilities in all 230+ item definitions before finalizing the mapping |
| Biome hazards + hub zones | The `isHubZone()` guard in `combat.service.ts` and `ability.service.ts` prevents damage in hubs — but a new hazard service that is not guarded with `isHubZone()` could apply tick damage to hub players | Apply `isHubZone()` as the first check in any new hazard processing code, parallel to the existing combat guard pattern |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Hazard processing: async zone/inventory lookups per player per tick | Tick duration grows linearly with active players; `[AiService] Tick took Xms` warnings | Cache hazard vulnerability on biome entry and gear change; read synchronously in tick | Breaks at ~5 players per zone if each requires 2-3 async ops per tick |
| Group behavior detection: O(n²) creature distance comparison every tick | Tick duration grows quadratically with creature count | Pre-sort creatures into a spatial grid or run group detection only when a trigger condition changes (player enters, creature is attacked) | Breaks at ~20 creatures in zone if each compares to all others |
| `computeCharStats()` called per-player for every tick operation | Each tick call computes item effects across all equipped items (up to 9 item slots) | Cache computed stats in `PlayerService`; invalidate on equipment change events | Breaks at ~10 concurrent calls per tick; already called multiple times per tick in current code |
| Automation extractor persistence: writing extractor state to DB on every resource accumulation tick | DB write throughput saturates under multi-player automation deployment | Accumulate in memory, persist to DB only on player pickup or server shutdown/interval (every 5 minutes) | Breaks at ~20 deployed extractors if each writes every 30s |
| Frenzy state check: reading from in-memory Map inside creature combat tick | Acceptable overhead per Map lookup | Map lookup is O(1); not a trap unless the Map contains stale entries (see Pitfall 10) | Not a performance concern — purely a correctness concern |

---

## UX Pitfalls

Common user experience mistakes with these 5 systems.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Damage type shown in ability tooltip but not in combat log output | Players learn to think about damage types but cannot confirm if resistance is applying; "Thermal Lance vs fire-resistant enemy — did that help or hurt?" | Add damage type label to combat log entries: "Thermal Lance: 45 (Thermal — 0.5x Resist)" — players can immediately verify the system is working |
| Biome hazard applies silently with no counter-gear indicator on first hit | Player dies to an invisible mechanic with no recovery path — hostile UX | First hazard tick shows a persistent HUD warning: "Cryo Hazard active — Thermal Insulation reduces this effect" — name the counter gear specifically |
| Defensive abilities now provide a damage-absorption shield but the HUD doesn't show shield HP | Players activate Emergency Shield but see their HP bar drop normally — the shield is absorbing damage but it's invisible | Add a shield HP bar (or overlay on the health bar) to the HUD. Without visual feedback, the ability feels broken. |
| Automation extractors deployed in Tier III biomes by Tier II players — extractor is killed by creatures | Player loses the extractor and the deployment cost with no warning | Show a "Threat Level: High — creatures may attack this structure" warning on the deployment confirmation screen for extractors placed in Tier III+ zones |
| Stampede behavior makes harmless herbivores suddenly lethal | Players conditioned to ignore herbivores get killed in a stampede — feels unfair | Stampede has a visible trigger event (a panic sound, a creature icon change to the stampede variant) with 2-3 seconds before the creature group becomes dangerous |
| Stat caps applied retroactively cause player stats to visibly decrease in the stats panel | Players log in after the patch and their stats dropped — even if effective combat is unchanged, the perception is "they nerfed me" | Frame the cap as diminishing returns in the UI: "Effective Power: 200 (196 + 12 buff — diminishing returns applied)" — show the math transparently |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Damage type system:** Damage types defined and on abilities — verify: `calculateDamage()` actually reads `damageType` and applies `resistances` from the target creature; test with a creature that has `resistances.thermal: 0.5` — Thermal ability should deal exactly half the damage of an equal Kinetic ability
- [ ] **Creature resistances:** New creatures have resistance profiles — verify: all 83 existing creatures also have `resistances` set (either explicit or via required-field default); no creature returns `undefined` for its resistance to any damage type
- [ ] **Biome hazard implementation:** Hazard tick logic exists — verify: `isHubZone()` guard applied; hazard does NOT apply in hub zones; first tick has 3-second grace period; combat log entry includes counter-gear name
- [ ] **Hazard counter gear:** Items flagged as hazard counters — verify: equipping a Cryo Resistance suit actually reduces tick drain (not just sets a flag); test with and without gear
- [ ] **Stampede behavior:** Herbivores stampede when player approaches — verify: stampede trigger fires correctly; stampede propagates to nearby herbivores in the same zone (not just the triggered one); stampede state is cleared when players leave range
- [ ] **Pack Call behavior:** Omnivores call allies — verify: called creatures enter combat even if they had no `combatTarget`; Pack Call has a range limit and does not pull creatures from across the zone
- [ ] **Ambush behavior:** Predators take flanking paths — verify: Ambush approach does not use ray-casting (tick budget remains under 200ms with 10 Ambush creatures in zone); Ambush transitions to direct attack within 2 tiles
- [ ] **Frenzy behavior:** Maniacs enter frenzy below 30% HP — verify: Frenzy state is cleared when creature dies (no Map leak); Frenzy damage increase is applied to the actual damage formula in `calculateDamage()`, not just a creature stat buff
- [ ] **Defensive ability rebalance:** Emergency Shield / Magnetic Field updated — verify: new `shield` effect type exists in `AbilityEffect` union; shield HP absorbs damage before HP pool; shield HP visible in HUD
- [ ] **Stat caps:** Diminishing returns implemented above 200 — verify: audit of current gear confirms no existing legendary equipment naturally produces stats above the cap without buffs; diminishing returns curve is documented
- [ ] **Automation extractors:** Deployable extractors implemented — verify: extractor has a storage cap (stops filling when full); maintenance cost mechanic exists (or resource drain); extractors cannot be deployed in hub zones; `Structure` entity extended cleanly for extractor state

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Damage type ignored in combat calculation | LOW | Update `calculateDamage()` to read `damageType` and apply `resistances`; no DB migration needed; takes effect immediately on server restart |
| Partial resistance migration (83 existing creatures not updated) | MEDIUM | Write a script to apply default `resistances: { thermal: 1.0, cryo: 1.0, bio: 1.0, kinetic: 1.0 }` to all definitions missing the field; then thematic pass for biome-appropriate values; TypeScript compile confirms completeness |
| Tick budget overrun from hazard processing | MEDIUM | Extract async hazard lookups to a cached state Map; requires refactor of hazard logic but no DB migration; tick timing is immediately measurable |
| Defensive ability rebalance had no felt effect | MEDIUM | Add `shield` effect type to `AbilityEffect` union; update `Emergency Shield` and `Magnetic Field` definitions to use it; add shield HP processing to combat service; requires HUD changes to display shield bar |
| Stat cap invalidates existing legendaries | HIGH | Raise the cap threshold or flatten the diminishing returns curve; if players already received notification of the lower cap value, communication is required; no DB migration but requires a hotfix patch |
| Automation produces runaway inflation | HIGH | Add maintenance costs retroactively; rate-limit extractor output; requires rebalancing existing deployed extractors and communicating the nerf to players; early detection via economy monitoring avoids this entirely |
| Frenzy/Stampede Map leak | LOW | Add cleanup call in `handleCreatureDeath()`; maps are in-memory so a server restart clears them immediately; but the fix must land before the next deployment |
| Automation extractor writes to DB every tick | MEDIUM | Migrate to in-memory accumulation with periodic flush; no DB schema change needed; requires a migration of any existing extractor state to the new format |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Damage type ignored in combat calculation | Damage type foundation — Phase 1 | Unit test: `calculateDamage()` with `resistances.thermal: 0.5` + `damageType: 'Thermal'` = half damage of Kinetic equivalent |
| Partial resistance migration (83 creatures) | Damage type foundation — same phase as type change | TypeScript compile confirms all creatures have `resistances` field; or validation test if field remains optional |
| Biome hazard tick overrun | Biome hazard implementation — before writing any tick code | Tick benchmark: 3 active zones, 5 players each, all on hazardous tiles — tick duration <100ms |
| Lethal tick damage for unequipped players | Biome hazard tuning — after implementation, before QA | Math check: minimum-level player for each biome tier survives at least 10 ticks (10 seconds) before death |
| Group AI coordination architecture | Creature AI upgrades — design review before code | Architecture document: group behavior uses zone-level pre-processing pass, not per-creature parameters |
| Frenzy/group state leak on creature death | Creature AI upgrades — before implementing any new state Maps | Centralized `handleCreatureDeath()` extended; test: creature killed during Frenzy — frenzy Map entry cleared |
| Defensive abilities still ineffective after rebalance | Ability rebalance — new effect type design | `AbilityEffect` union includes `shield` type; combat service reads shield HP before applying HP damage |
| Stat cap invalidates existing gear | Stat cap design — simulation run before any value is chosen | Simulation: best-in-slot loadout at each tier produces stats below cap without buffs |
| Automation credit inflation | Automation design — income/sink balance sheet before implementation | Design doc: maintenance cost per hour >= 60% of automation output value at each tier |
| Extractor storage cap absent | Automation tech tree — Extractor tier implementation | Test: extractor stops accumulating resources when storage cap is reached |

---

## Sources

- Direct codebase analysis: `packages/game-logic/src/combat/damage.ts` (current `calculateDamage()` signature — no `damageType` parameter), `packages/game-logic/src/ai/creature-ai.ts` (pure FSM with no cross-creature awareness), `apps/game-server/src/game/ai.service.ts` (1s tick loop and tick budget pattern), `apps/game-server/src/game/combat.service.ts` (creature death cleanup flow), `apps/game-server/src/game/ability.service.ts` (defensive ability as stat buff — no shield type), `packages/shared-types/src/game/ability.ts` (current `AbilityEffect` union — no shield or DR type), `packages/entities/src/definitions/creatures.ts` (83 creatures, no `resistances` field)
- `packages/shared-types/src/game/biome.ts` — `BiomeHazard` interface already defined but not yet implemented in tick loop; `isHubZone` pattern confirmed in combat and ability guards
- `packages/game-logic/src/stats/char-stats.ts` — `computeCharStats()` purely additive, no caps; called multiple times per tick already (combat + regen)
- `.planning/PROJECT.md` — v1.24 milestone explicitly identifies: no credit sinks, stat caps needed, Plasma Burst dominance, defensive abilities need real value
- MMO power creep and defensive ability underuse: [The problem with damage shields — ESO Forums](https://forums.elderscrollsonline.com/en/discussion/165765/the-problem-with-damage-shields), [System Mechanics: Buffs, Healing and Shields — City of Titans](https://cityoftitans.com/forum/system-mechanics-buffs-healing-and-shields)
- Economy sink design: [Gold sink — Wikipedia](https://en.wikipedia.org/wiki/Gold_sink), [Designing Game Economies: Inflation, Resource Management — Medium 2026](https://medium.com/@msahinn21/designing-game-economies-inflation-resource-management-and-balance-fa1e6c894670), [Passive Resource Systems in Idle Games](https://adriancrook.com/passive-resource-systems-in-idle-games/)
- Stat diminishing returns implementation patterns: [Stat Diminishing Returns — WoW Maxroll](https://maxroll.gg/wow/resources/stat-diminishing-returns), [Diminishing Returns for Balance — TV Tropes](https://tvtropes.org/pmwiki/pmwiki.php/Main/DiminishingReturnsForBalance)
- Flocking/group behavior architecture: [Boids — Wikipedia](https://en.wikipedia.org/wiki/Boids), [AI for Game Developers: Flocking (O'Reilly)](https://www.oreilly.com/library/view/ai-for-game/0596005555/ch04.html)

---
*Pitfalls research for: v1.24 Balance & Automation milestone (damage types, biome hazards, creature AI upgrades, ability rebalancing, automation tech tree)*
*Researched: 2026-03-03*
