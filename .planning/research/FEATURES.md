# Feature Research: Character Stats System

**Domain:** Character stat system — RPG/survival MMO (Into the Void)
**Researched:** 2026-02-18
**Confidence:** HIGH (codebase direct inspection + lore alignment); MEDIUM (competitor UX patterns via web research)

---

## Context: What Already Exists

Before listing features, the codebase baseline establishes what the new stat system is ADDING TO, not replacing.

| Component | Current State | Relevance to Stat System |
|-----------|---------------|--------------------------|
| `Player.health / maxHealth` | Numeric fields in `player.ts` | Durability stat drives `maxHealth` |
| `Player.energy / maxEnergy` | Numeric fields in `player.ts` | Vigor stat drives `maxEnergy` |
| `Player.level` | Integer in `player.ts` | Base stats scale linearly per level |
| `PlayerStats` (shared-types) | `strength, agility, endurance, intelligence, perception` — legacy pre-design type | REPLACE with new 8-stat model: Durability, Toughness, Power, Haste, Vigor, Recovery, Perception, Resilience |
| `ComputedStats` (game-logic) | `armor, speedMultiplier, hazardResistance, detectionRange, energyCapacity, rechargeRate, jumpHeight, bonuses` | Already maps equipment effects to derived values — the stat system provides the BASE layer; equipment provides BONUS layer on top |
| `effectiveStats()` in `inventory/stats.ts` | Pure function: sums equipment effects into ComputedStats | Must be extended: final stats = base (from character stats) + equipment bonuses |
| `calculateDamage()` in `combat/damage.ts` | Uses `attackerStats.strength` and `defenderStats.endurance` (old PlayerStats) | Must be updated to use new stat model (Power → damage, Toughness → armor reduction) |
| HUD (health + energy bars) | Already rendered in React HUD | Stat system does not change existing HUD bars — adds stat panel overlay |

**Key insight:** The new stat system introduces a BASE STATS layer that feeds into the existing COMPUTED STATS layer. It does not replace ComputedStats — it extends it. The formula becomes: `finalStat = baseStat(level) + equipmentBonus`.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that RPG/survival MMO players universally assume exist. Missing these makes the progression system feel hollow or broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Base stats scaling with level** | Every RPG player expects that leveling up makes their character measurably stronger. If killing a level 5 enemy gives the same result at level 10 as level 1, the level system feels meaningless. Linear scaling (constant per-level gain) is the standard for balanceable MMOs — Fire Emblem and WoW Classic both use linear HP growth because it keeps enemy design tractable across the level range. | LOW | Each of the 8 stats grows by a fixed amount per level (e.g., Durability = 10 + (level × 5) yielding maxHealth directly). Formula is pure math in `game-logic`, no DB write per level-up required. Stat values recomputed from `player.level` on every session load — not stored per stat in DB. |
| **Equipment bonuses layered on base stats** | Players expect equipped items to provide meaningful numerical improvements. In the existing system, equipment already produces ComputedStats. The new system means those bonuses stack ON TOP of base stats from level. This pattern is universal — every RPG from Diablo to WoW to No Man's Sky uses base + item bonus = final value. | LOW | Already partially implemented: `effectiveStats()` returns equipment contribution. New: `computeBaseStats(level)` returns base from level. Final: `finalStats = computeBaseStats(level) + effectiveStats(equipment)`. Both are pure functions in `game-logic`, no new architecture needed. |
| **Stat effects actually influence gameplay** | If stats exist but combat/movement/hazards ignore them, players feel cheated. The 8 designed stats MUST each have a clear, observable gameplay effect: Durability = health pool, Toughness = damage reduction, Power = damage output, Haste = movement speed, Vigor = energy pool, Recovery = energy regen rate, Perception = detection range, Resilience = hazard resistance. | MEDIUM | Each stat effect maps to an existing game system. Toughness feeds into `calculateDamage()` armor reduction. Haste feeds into movement speed in `MovementController`. Perception feeds into `visibility/range.ts`. Resilience feeds into biome hazard tick damage. These hooks exist — they need stat parameters plumbed in. |
| **Stat panel UI accessible from HUD** | Players need a place to see their stats. Every MMO has a character sheet (WoW: 'C' key, Diablo III: Details panel, Path of Exile: character sheet). Without it, players cannot see whether leveling up or equipping an item made them stronger. | MEDIUM | New HUD overlay panel (React component). Shows all 8 stats with: base value (from level), equipment bonus (+X from modules), final value (total). Toggled via keyboard shortcut (e.g., 'C' or 'Tab'). Does not replace existing health/energy bars — those stay in persistent HUD. |
| **Level-up notification with stat increase display** | When a character levels up, players expect immediate visual feedback showing WHAT improved. "Level 10!" with no indication of what changed makes leveling feel empty. WoW's classic level-up panel showed delta (+10 Stamina) — players remember this as satisfying. | LOW | On level-up server event: client shows overlay or HUD notification listing each stat that increased by X. Stat deltas computed server-side (`newStats - oldStats`), sent with the level-up event payload. No complex animation required — text display is sufficient. |
| **Creature stats reusing the same model** | Lore states this stat system will be reused for creatures. Players expect enemies to have comparable stats — a level 5 creature should feel like fighting a level 5 character in terms of health/damage. If creatures use a completely different system, difficulty scaling feels arbitrary. | MEDIUM | `CreatureStats` interface mirrors `CharacterStats` (same 8 stats). Creature stat values defined in creature definitions (already have `level` field in `Creature` type). `calculateDamage()` already accepts both player and creature stat parameters — just needs the new stat names substituted. |
| **Stat values visible on item tooltips (bonus preview)** | When hovering an equippable item, players expect to see: (a) what stat it affects, (b) by how much, and (c) optionally whether this is an increase or decrease versus currently equipped item. This is the standard "compare" pattern in every loot-based game (Diablo III's green/red delta arrows, WoW's tooltip comparison). | MEDIUM | Item tooltip (already exists as `ItemTooltip.tsx` component) needs: stat bonus rows derived from item effects array. Delta comparison (green +5 if better, red -3 if worse) requires knowing current ComputedStats — server sends these on inventory load, client stores in Zustand. |

---

### Differentiators (Competitive Advantage)

Features that fit Into the Void's specific sci-fi survival identity. Not expected by all players, but provide meaningful depth once table stakes are solid.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Stat breakdown showing base vs equipment contribution** | Most games show only the final stat value. Showing `Toughness: 45 (30 base + 15 from Armor Module Mk.II)` teaches players HOW the system works and makes module choices feel meaningful. Path of Exile players specifically requested this for PoE2 — the community feedback shows players want to understand their numbers, not just see totals. Albion Online and WoW's DejaCharacterStats addon both address this player need. | MEDIUM | Stat panel shows three columns: Base (from level), Bonus (from equipment), Total. Computed server-side from `computeBaseStats(level)` + `effectiveStats(equipment)`. No additional data fetching — both sources already available on character load. The breakdown makes module upgrades legible ("this module gave me +15 Toughness") and validates that the item system and stat system are connected. |
| **Lore-named stats (not generic Strength/Dexterity)** | The 8 designed stat names — Durability, Toughness, Power, Haste, Vigor, Recovery, Perception, Resilience — are thematically appropriate for sci-fi survival equipment. "Durability" fits an exo-suit body better than "Constitution." This naming creates setting immersion that generic RPG stat names cannot. Naming choices like these are validated by games like Dead Cells and Hades that use setting-appropriate stat naming to enhance tone. | LOW | Pure naming choice. No implementation complexity. Critical: the HUD panel must also include short tooltips explaining what each stat DOES ("Toughness: reduces incoming damage by X per point"). Players unfamiliar with the system need this education inline. |
| **Separate Recovery stat with observable regen rate** | Many RPGs bundle energy/stamina regen into a single invisible stat. Making Recovery an explicit named stat with a visible effect (energy recharges faster as you watch the bar) makes the Vigor/Recovery pair feel like a meaningful sub-system. This directly supports the exo-suit theme — suits have power cores that recharge at different rates. | LOW | Recovery stat → `energyRegenRate` in final computed stats. Already exists as `rechargeRate` in `ComputedStats`. Just needs to be driven by `baseStats.recovery + equipmentBonus` instead of a hardcoded value. The existing energy bar already shows the regen visually — no new UI needed. |
| **Perception stat with visible detection range indicator** | Perception controls how far the player can detect enemies/items/hazards. Making this visible — e.g., a subtle circle radius in the game world when the stat panel is open — gives players immediate feedback that the stat matters. Survival games like DayZ and The Long Dark use visible detection mechanics; players value them when they're transparent. | HIGH | Requires Phaser canvas rendering of a detection radius circle (configurable opacity, only shown when stat panel open). Uses existing `visibility/range.ts`. This is a differentiator not a prerequisite — defer if timeline is tight. |
| **Stat soft-caps (no hard ceiling, diminishing returns above threshold)** | Linear scaling is simple and predictable at low levels but can create extreme power gaps at high levels if uncapped. Soft-caps (e.g., armor reduction is capped at 75% regardless of Toughness value) prevent the system from breaking balance in higher-tier zones while preserving the value of stacking stats up to the cap. WoW Classic used armor cap, PoE uses diminishing returns on resistance — both validated by large player bases. | MEDIUM | Each of the 8 stats needs a derived-value cap defined as a constant. Example: Toughness provides damage reduction = `min(75%, toughness * 0.5%)`. The cap is on the DERIVED effect, not the stat value itself — players can still see their Toughness keep growing, but the diminishing returns are visible in the tooltip. This must be documented in the stat panel ("Max 75% reduction"). |

---

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Stat point allocation on level-up** | Gives players agency — "I want to be a tanky build, so I put all points in Toughness." Feels very RPG. Classic approach in games like Path of Exile and Diablo II. | In a multiplayer survival MMO where players interact with the same creatures and environments, unequal stat distributions create extreme balance problems. A player who dumps all points into Haste moves across the map faster than the game's zone system can handle (teleport exploits, server-side position validation failures). More importantly: the project brief specifies LINEAR SCALING — adding player choice to that linear model requires a full rebalance pass. This is a different game. | Equipment-driven differentiation. Exo-suit module choices already provide the "build variety" that stat points would give — a player who equips 4 Haste modules is the "speed build." This is the right model: stats scale predictably from level (balance is maintainable), equipment provides build expression. |
| **Persistent stat buffs from consumables stored in character DB** | Players request this to "bank" buffs before difficult content. "Let me pre-buff and log off" is a common request. | Buff state persisting across sessions creates complex expiry logic, timezone-aware calculation of remaining time, and exploitable behavior (stack 20 buffs on Thursday, use them all in Friday's raid). Also inflates the `characters` DB row with time-indexed buff state. | Time-bounded session buffs only. Buff applied when consumable used, tracked in server memory (game session state), lost on disconnect or zone change. Simple to implement, no DB complexity. Buffs that matter happen when you play. |
| **Negative stats / debuffs that permanently reduce base stats** | "Hardcore" survival flavor — starving reduces Vigor, taking acid damage reduces Toughness permanently. Very survival-game. | Permanent negative modification to base stats (which scale from level) creates a compounding tracking problem: the stat formula `baseStat(level)` must now account for `- permanentDebuffs`. This is a separate system (debuff tracking) with its own persistence requirements, UI complexity, and exploit vectors (players might intentionally debuff others' base stats). | Use existing `CombatEffect` system for time-limited debuffs. Biome hazard ticks reduce current health/energy (already modeled). Permanent base stat reduction is a feature for a future "hardcore mode" milestone, not the foundational stat system. |
| **Multiplier stacking between stat bonuses** | Equipment bonuses multiply together instead of adding: `(1 + armor1%) × (1 + armor2%)`. Creates more interesting build choices. PoE uses this model. | Multiplicative stacking with linear base stats creates exponential power curves that are invisible to players and extremely difficult to balance. Example: 4 Armor modules each providing 20% multiplicative armor reduction = `(1.2)^4 = 2.07x` multiplier, not 1.8x additive. Players cannot intuit this. In a multiplayer context where server has to validate combat results, unpredictable damage values create client-server sync problems. | Additive stacking for all equipment bonuses. Consistent, predictable, easier to balance. The module slot limit on exo-suits (3-6 slots by rarity) naturally caps stacking without needing multiplicative diminishing returns. |
| **Stat window showing all computed internals (derived values, hidden multipliers)** | Power users want full transparency. PoE players notoriously demand complete stat breakdowns including hidden modifiers. | The current game design uses clean stat names with observable effects (Toughness → damage reduction, Haste → speed). Exposing internal derived values (0.0034 damage reduction per Toughness point, capped at 0.75 total) trains players to interact with numbers rather than gameplay. At this stage of development, a full internals dump would expose balance decisions that aren't finalized. | Show final derived effect, not intermediate formula: "Toughness 45 → 22% damage reduction." This is enough information for meaningful decisions without revealing implementation details. A full breakdown mode can be added in a polish pass once balance is locked. |

---

## Feature Dependencies

```
[computeBaseStats(level)] — pure function in game-logic
    └──feeds──> [ComputedStats (armor, speed, etc.)]
                    └──feeds──> [Combat damage calculation]
                    └──feeds──> [Movement speed (Haste)]
                    └──feeds──> [Energy regen (Recovery)]
                    └──feeds──> [Detection range (Perception)]
                    └──feeds──> [Hazard resistance (Resilience)]

[Stat Panel UI]
    └──requires──> [computeBaseStats(level)] (base column data)
    └──requires──> [effectiveStats(equipment)] (bonus column data)
    └──requires──> [Inventory system Phase 25+] (equipment must be loadable)

[Level-up notification]
    └──requires──> [computeBaseStats(level)] (to compute deltas)
    └──requires──> [XP system] (already in player.ts: level, xp, xpToNextLevel)

[Item tooltip stat bonus display]
    └──requires──> [Item effects system in packages/items] (already built, Phase 25)
    └──requires──> [Current ComputedStats from server] (available via inventory:update)
    └──requires──> [ItemTooltip.tsx] (already exists)

[Creature stat reuse]
    └──requires──> [computeBaseStats(level)] (shared formula, parameterized)
    └──requires──> [Creature definitions with level field] (already in Creature type)

[Soft caps]
    └──requires──> [computeBaseStats(level)] (caps applied at derived value stage)
    └──enhances──> [Stat Panel UI] (cap shown inline: "45 Toughness → 22% (cap: 75%)")

[Stat breakdown (base vs bonus)]
    └──requires──> [Stat Panel UI] (breakdown is a feature of the panel)
    └──requires──> [computeBaseStats(level)] (base value)
    └──requires──> [effectiveStats(equipment)] (bonus value, already returns per-stat)

[Perception visual indicator]
    └──requires──> [Stat Panel UI] (only visible when panel is open)
    └──requires──> [Phaser canvas access] (circle rendering in WorldScene)
    └──requires──> [visibility/range.ts] (already exists)
```

### Dependency Notes

- **Base stat computation is the critical path:** Every other feature depends on `computeBaseStats(level)` existing as a pure function in `game-logic`. This is the first deliverable.
- **ComputedStats already exists and must not be replaced:** The existing `effectiveStats()` function in `inventory/stats.ts` already handles equipment bonuses. The new system adds a `computeBaseStats()` function that produces the base layer. Final stats = base + equipment. Do not rebuild what already works.
- **Old `PlayerStats` type must be replaced, not extended:** The existing `PlayerStats` in `shared-types/core/player.ts` uses `strength, agility, endurance, intelligence, perception` — a legacy design. These names conflict with the new 8-stat model. Replace the type definition; audit `damage.ts` which references `attackerStats.strength` and `defenderStats.endurance`.
- **Stat panel is independent of combat implementation:** The UI can be built and tested before all 8 stat effects are fully wired into gameplay. Show the numbers; wire the effects in the same milestone.
- **Creature stats reuse the same function, parameterized:** `computeBaseStats(level, entityType)` where `entityType` controls scaling constants. Player and creature can have different per-level gains from the same function signature.

---

## MVP Definition

### Launch With (character stats milestone — v1 of the system)

Minimum to make the stat system real and observable to players.

- [ ] **`computeBaseStats(level)` pure function** — Returns the 8 base stats from `player.level`. Linear formula per stat. Lives in `packages/game-logic/src/stats/base.ts`. Unit-tested.
- [ ] **`CharacterStats` type definition** — Replaces old `PlayerStats` in `shared-types`. 8 fields: durability, toughness, power, haste, vigor, recovery, perception, resilience.
- [ ] **Final stat computation** — `computeFinalStats(level, equipment)` = `computeBaseStats(level)` + `effectiveStats(equipment)`. Returns unified stat object. Replaces the ComputedStats type or extends it cleanly.
- [ ] **Wire stats into existing gameplay systems** — Toughness → armor reduction in `calculateDamage()`. Haste → speed in movement. Vigor → maxEnergy. Recovery → rechargeRate. Durability → maxHealth. Perception → detectionRange. Resilience → hazardResistance. Power → baseDamage contribution.
- [ ] **Stat panel UI** — HUD overlay panel (toggle with 'C'). Shows all 8 stats in three columns: Base (from level), Bonus (from equipment), Total. Stat name + inline description of what it does.
- [ ] **Level-up stat delta notification** — Server sends stat deltas with level-up event. Client displays "+5 Durability, +3 Power" overlay for 3 seconds.
- [ ] **Creature stats via same formula** — `CreatureStats` computed from `computeBaseStats(creatureLevel, 'creature')`. Creature level already in `Creature.level`. `calculateDamage()` accepts creature stats.
- [ ] **Stat tooltip on stat panel entries** — Clicking/hovering a stat name shows "Resilience: Reduces hazard tick damage from biome environmental effects."

### Add After Validation (v1.x — refinement pass)

- [ ] **Soft-caps with display in stat panel** — Show "22% damage reduction (cap: 75%)" derived from Toughness.
- [ ] **Item tooltip delta comparison** — Green/red +/- delta when comparing item to equipped item, derived from stat bonus difference.
- [ ] **Stat breakdown in item tooltips** — "This module grants +15 Toughness" with clear label per effect type.
- [ ] **Stat history on level-up** — "Previous level stats" vs "current" comparison in a level-up summary panel (nice to have, not critical).

### Future Consideration (v2+ — defer)

- [ ] **Perception visual detection circle** — Phaser circle overlay when stat panel open. High complexity, medium value. Defer to polish milestone.
- [ ] **Faction-specific stat bonuses** — Verdant characters gain bonus Resilience (adapted to biome hazards), Helix gain bonus Power (mining and combat culture), Nexus gain bonus Perception (intelligence/scouting). Requires faction standing system.
- [ ] **Soft stat allocation via faction advancement** — As a future progression layer, faction rank grants small additional stat allocations. Not stat points per level — faction-progression-locked bonuses. This preserves linear level scaling while adding late-game differentiation.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| `computeBaseStats(level)` pure function | HIGH (foundation) | LOW | P1 |
| `CharacterStats` type (replaces old PlayerStats) | HIGH (type safety) | LOW | P1 |
| Final stat computation (base + equipment) | HIGH (foundation) | LOW | P1 |
| Wire stats into gameplay (damage, speed, energy, detection) | HIGH (makes stats real) | MEDIUM | P1 |
| Stat panel UI (8 stats, 3 columns) | HIGH (player visibility) | MEDIUM | P1 |
| Level-up delta notification | MEDIUM (reward feel) | LOW | P1 |
| Creature stats via same formula | HIGH (combat balance) | LOW | P1 |
| Stat name tooltips (inline descriptions) | MEDIUM (UX clarity) | LOW | P1 |
| Soft-caps with display | MEDIUM (balance safety) | MEDIUM | P2 |
| Item tooltip delta comparison | MEDIUM (gear clarity) | MEDIUM | P2 |
| Stat breakdown in item tooltips | LOW (advanced users) | LOW | P2 |
| Perception visual circle | LOW (visual delight) | HIGH | P3 |
| Faction-specific stat bonuses | MEDIUM (identity) | HIGH | P3 |

---

## Competitor Feature Analysis

| Feature | WoW (Classic) | Diablo III | Path of Exile | Our Approach |
|---------|--------------|------------|---------------|--------------|
| Stat scaling model | Linear per level (stamina, strength, etc.) | Automatic per level, no player choice | Per-level passive tree points | Linear per level, no player allocation — consistent with Fire Emblem / WoW Classic balance model |
| Number of primary stats | 5 (Strength, Agility, Stamina, Intellect, Spirit) | 4 (Strength, Dexterity, Intelligence, Vitality) | 4 (Strength, Dexterity, Intelligence, Life) + passive tree | 8 (Durability, Toughness, Power, Haste, Vigor, Recovery, Perception, Resilience) — more than genre standard, justified by 8 distinct gameplay systems each stat governs |
| Equipment bonus model | Flat additions to primary stats, then derived secondaries | Equipment adds to primary stats and secondary stats directly | Complex layered modifiers with additive/multiplicative categories | Additive only — flat bonus per equipped item sums onto base. Simpler than PoE, comparable to WoW Classic |
| Stat panel | Character sheet (C key), shows all primary + derived | Details panel shows offense/defense/life categories | Character sheet with full derived value chains | HUD overlay (C key), shows 8 stats with base/bonus/total columns |
| Level-up notification | Dialog showing stat gains | Automatic with animated effects | Text message only | Server event + client overlay showing per-stat delta |
| Creature parity with player stats | Creatures have equivalent stat values on loot tables | Creature stats are opaque (difficulty scaling only) | Creature stats shown in Path of Building (third party) | Same function, same formula — creature and player stats use identical model |
| Soft caps | Yes (armor cap, resistance cap, hit cap) | Yes (toughness, cooldown reduction capped) | Yes, diminishing returns on most stats | Yes — derived-effect caps (e.g., max 75% damage reduction from Toughness) |

---

## Existing Code Integration Map

This maps every stat to its existing code hook — no new systems needed, only new parameters.

| Stat | Effect | Existing Hook | Change Required |
|------|--------|---------------|-----------------|
| Durability | maxHealth | `player.maxHealth` field | Set from `finalStats.durability` on character load / level-up |
| Toughness | armor / damage reduction | `calculateDamage()`: `armorReduction` param | Pass `finalStats.toughness` as `armorReduction` |
| Power | base damage output | `calculateDamage()`: `baseDamage` param | `baseDamage += finalStats.power * POWER_FACTOR` |
| Haste | movement speed multiplier | `MovementController` speed param | `speed = BASE_SPEED * finalStats.speedMultiplier` where `speedMultiplier = 1 + (haste * 0.01)` |
| Vigor | maxEnergy | `player.maxEnergy` field | Set from `finalStats.vigor` on character load / level-up |
| Recovery | energy regen rate | `ComputedStats.rechargeRate` | Set from `finalStats.recovery` (base) + equipment rechargeRate bonus |
| Perception | detection range | `visibility/range.ts` | Pass `finalStats.detectionRange` to range computation |
| Resilience | hazard damage reduction | Biome hazard tick (in game-server zone tick) | Read `finalStats.hazardResistance` when applying biome damage tick |

All hooks exist. The work is: (1) build `computeBaseStats(level)` + `computeFinalStats()`, (2) plumb the result into these 8 call sites.

---

## Lore Alignment Notes

The 8 stat names were designed for this project. Confirming alignment with world-bible:

| Stat | Lore Grounding |
|------|----------------|
| Durability | Exo-suits take physical damage in Terminus. "How much punishment the suit and wearer can absorb" — aligns with Tier I-IV zone survivability requirements. |
| Toughness | Corporate workers in hostile zones (Volcanic Reaches, Tier III) need armor protection against silicon-armored predators and geological hazards. |
| Power | Helix Extraction's identity is industrial output — damage (mining yield, combat output) maps to their culture. All factions fight creatures. |
| Haste | Petrified Expanse lore explicitly states "everything that survives here has adapted to constant movement." Haste is survival in calcification-risk zones. |
| Vigor | Exo-suit power cores are mentioned repeatedly in lore. Vigor = the power reserve a suit can hold. |
| Recovery | "Energy" recharge connects to exo-suit power core recharge rate — Verdant's bioengineered suits might have better Recovery as faction bonus. |
| Perception | Nexus Frontiers are defined by intelligence gathering. Perception ("detecting vital clues, hiding enemies") fits their corporate identity. |
| Resilience | Miasma Marshes require "chemical filtration systems, sealed gear, decontamination protocols" — Resilience = hazard resistance to the planet's hostile environments. |

All 8 stats have clear lore grounding. Confirm with project owner before finalizing: do Resilience and Toughness need different names to avoid confusion? (Resilience = environmental hazard resistance; Toughness = physical damage armor — they are distinct but both sound defensive.)

---

## Sources

- Direct codebase inspection: `packages/shared-types/src/core/player.ts` (`PlayerStats` legacy type), `packages/game-logic/src/inventory/stats.ts` (`ComputedStats`, `effectiveStats()`), `packages/game-logic/src/combat/damage.ts` (`calculateDamage()`), `packages/game-logic/src/visibility/range.ts`
- WoW Classic linear level scaling model and armor cap: https://pavcreations.com/level-systems-and-character-growth-in-rpg-games/
- Path of Exile stat breakdown player demand: https://www.pathofexile.com/forum/view-thread/2713434/page/1
- Linear vs multiplicative progression balance: https://sinisterdesign.net/designing-rpg-mechanics-for-scalability/
- RPG stat design taxonomy (primary, secondary, derived): https://blog.writtenrealms.com/stats/
- Linear scaling for MMO balancability: https://www.davideaversa.it/blog/gamedesign-math-rpg-level-based-progression/
- Diablo III character screen breakdown approach: https://diablo.fandom.com/wiki/Character_Screen
- Into the Void world-bible.md (biome tiers, faction identity, environmental hazards, exo-suit lore)
- Into the Void Phase 25 research: `.planning/phases/25-item-data-model-foundation/25-RESEARCH.md`

---

*Feature research for: Character Stats System — Into the Void survival MMO*
*Researched: 2026-02-18*
*Confidence: HIGH for code integration map (codebase-confirmed); HIGH for stat-to-gameplay mapping (existing hooks verified); MEDIUM for competitor UX patterns (web research); MEDIUM for soft-cap values (placeholder constants, require balance testing)*
