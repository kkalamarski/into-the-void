# Feature Research: Equipment Stat Bonuses

**Domain:** RPG/MMO Equipment Stats System
**Researched:** 2026-02-21
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Additive stat stacking | Standard in all RPGs — players expect +10 toughness + +15 toughness = +25 toughness | LOW | Already implemented in `computeCharStats()` |
| Rarity-based stat scaling | Higher rarity = bigger numbers is fundamental expectation | LOW | Need to define multipliers per rarity tier |
| Equipment slot stat display | Players need to see what stats an item provides before equipping | LOW | UI work — backend already has `effects` array |
| Stat total breakdown | Players expect to see: base stats, equipment bonuses, total stats | LOW | Already implemented via `CharStatsPayload` |
| Suit archetype identity | Tank suits feel tanky, scout suits feel mobile — archetypes must be distinct | MEDIUM | Requires stat profile templates per archetype |
| Level-appropriate scaling | Level 1 gear < Level 40 gear in raw stats, even at same rarity | LOW | Already using `ilvl` and `requiredLevel` |
| Module slot scaling | Higher rarity suits = more module slots (3-6 range is standard) | LOW | Already implemented (3-6 slots) |
| Zero-duration buffs for equipment | Equipment bonuses are permanent while equipped (duration: 0) | LOW | Already implemented via `on_equip` trigger |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Granted abilities tied to suits | Suits grant unique abilities — not just stat sticks | MEDIUM | Already implemented — suits grant 2-5 abilities |
| Specialized suit archetypes | Beyond tank/scout/combat — hazmat, assault, recon with unique ability combos | MEDIUM | 4 specialized suits already added in Phase 58 |
| Stat profile coherence | Stats tell a story — "Assault Frame" has power+haste, not random stats | MEDIUM | Requires design discipline in item definitions |
| Hybrid stat distributions | Combat suits balance toughness+power+haste instead of single-stat focus | MEDIUM | Already present in some epic/rare suits |
| Progression clarity | Same suit at different rarities follows clear scaling (e.g., 1.5x rare → epic) | MEDIUM | Need to audit and normalize existing items |
| Eight-stat system depth | 8 stats (durability/toughness/power/haste/vigor/recovery/perception/resilience) vs standard 4-6 stats | MEDIUM | Already implemented — differentiates from competitors |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Multiplicative stat stacking | "Feels more rewarding at high levels" | Creates exponential power creep — balancing nightmare. 2x multipliers compound to 4x, 8x, 16x with multiple items | Stick to additive stacking with linear scaling |
| Randomized stat ranges on drop | "Adds replayability hunting perfect rolls" | Frustrating loot treadmill — invalidates item identity. "Is this Tactical Suit better than that Tactical Suit?" is bad UX | Fixed stats per item definition — rarity determines stats |
| Per-slot stat budgets | "Ensures balanced itemization" | Over-engineering for a non-competitive PvE MMO. WoW-style stat budgets add complexity without player-facing value | Manually balance suits with design guidelines |
| Diminishing returns on stats | "Prevents stacking one stat" | Opaque math — players hate invisible penalties. "Why did my +50 toughness only give +30?" | Design suit archetypes to naturally distribute stats |
| Percentage-based bonuses | "+10% toughness" instead of "+50 toughness" | Early game bonuses feel terrible (10% of 50 = +5). Late game bonuses scale infinitely (10% of 500 = +50) | Flat bonuses scale predictably with item level |
| Set bonuses (2-piece, 4-piece) | "Encourages build diversity" | Restricts build diversity — forces wearing mediocre pieces for set bonus. Adds UI/system complexity | Granted abilities already create suit identity |

## Feature Dependencies

```
[Stat Profile Templates]
    └──requires──> [Archetype Definitions]
                       └──requires──> [Eight-Stat System]

[Rarity Scaling Multipliers]
    └──requires──> [Baseline Stat Values]

[Equipment Stat Display] ──enhances──> [Stat Total Breakdown]

[Granted Abilities] ──conflicts──> [Set Bonuses]
  (Both try to create equipment identity — choose one)
```

### Dependency Notes

- **Stat Profile Templates require Archetype Definitions:** Can't create templates without first defining what "tank" means in terms of stat distribution
- **Rarity Scaling requires Baseline Values:** Must establish what "common level 1" stats look like before defining 1.5x/2x/2.5x multipliers
- **Granted Abilities conflict with Set Bonuses:** Both systems create equipment identity. Granted abilities are simpler and already implemented — don't add set bonuses

## Archetype Stat Profiles

Based on analysis of Into the Void's 8 stats and existing suit definitions:

### Tank Archetype
**Identity:** Survive extended combat, absorb damage for team
**Primary stats:** Durability (max HP), Toughness (damage reduction), Resilience (status resist)
**Secondary stats:** Recovery (regen rate)
**Tertiary stats:** Vigor (energy pool)
**Dump stats:** Power, Haste, Perception

**Example ratio (100 stat points):**
- Durability: 35
- Toughness: 30
- Resilience: 15
- Recovery: 10
- Vigor: 10
- Power: 0
- Haste: 0
- Perception: 0

**Reference:** SUIT_REINFORCED_RARE (toughness 10, durability 15, resilience 5)

### Scout Archetype
**Identity:** High mobility, map awareness, energy efficiency
**Primary stats:** Haste (turn order), Perception (detection range), Vigor (energy pool)
**Secondary stats:** Recovery (sustain)
**Tertiary stats:** Durability (baseline survivability)
**Dump stats:** Power, Toughness, Resilience

**Example ratio (100 stat points):**
- Haste: 30
- Perception: 25
- Vigor: 25
- Recovery: 10
- Durability: 10
- Power: 0
- Toughness: 0
- Resilience: 0

**Reference:** SUIT_SCOUT_RARE (haste 8, perception 10, vigor 12)

### Combat Archetype
**Identity:** Damage output, sustained combat effectiveness
**Primary stats:** Power (damage), Haste (turn frequency), Toughness (survive retaliation)
**Secondary stats:** Durability (HP pool)
**Tertiary stats:** Vigor (ability usage)
**Dump stats:** Perception, Recovery, Resilience

**Example ratio (100 stat points):**
- Power: 35
- Haste: 25
- Toughness: 20
- Durability: 10
- Vigor: 10
- Perception: 0
- Recovery: 0
- Resilience: 0

**Reference:** SUIT_TACTICAL_EPIC (power 20, haste 12, toughness 25, durability 35)

### Hybrid/Utility Archetypes
**Balanced:** Even distribution — no clear weakness or strength (common suits)
**Hazmat/Environmental:** Resilience + Recovery + Durability (resist status, sustain in hazard zones)
**Assault:** Power + Durability + Haste (glass cannon with HP)
**Recon:** Perception + Haste + Vigor (scout variant with detection focus)

## Rarity Scaling Formula

Based on analysis of MMO scaling patterns and Into the Void's existing items:

### Multiplier Approach

**Base formula:** `stat_value = base_stat_for_archetype × rarity_multiplier × level_tier_multiplier`

### Rarity Multipliers (relative to common baseline)

| Rarity | Multiplier | Stat Increase | Module Slots | Notes |
|--------|------------|---------------|--------------|-------|
| Common | 1.0x | Baseline | 3-5 | Level 1: 3 slots, Level 40: 5 slots |
| Rare | 1.4x | +40% stats | 4-5 | +1 slot vs common at same level |
| Epic | 2.0x | +100% stats | 4-5 | Double common stats |
| Exotic | 2.8x | +180% stats | 5-6 | Corporate proprietary tech |
| Legendary | 4.0x | +300% stats | 6 | Ancient/anomaly tech |

**Rationale:**
- 1.4x rare multiplier creates noticeable upgrade without invalidating common gear
- 2.0x epic is "double the stats" — easy to communicate, feels substantial
- 2.8x exotic maintains ~40% gap between tiers
- 4.0x legendary feels extraordinary without being 10x game-breaking

**Evidence from existing suits:**
- SUIT_BASIC_COMMON (L1): toughness 5, durability 20 = 25 total stats
- SUIT_REINFORCED_RARE (L5): toughness 10, durability 15, resilience 5 = 30 total stats (~1.2x)
- SUIT_TACTICAL_EPIC (L15): toughness 25, power 20, haste 12, durability 35 = 92 total stats (~3.7x vs L1 common)

*Current implementation is inconsistent — needs normalization*

### Level Tier Multipliers

| Level Range | Tier | Multiplier | ilvl Range (Common) |
|-------------|------|------------|---------------------|
| 1-10 | 1 | 1.0x | 1-10 |
| 11-20 | 2 | 2.0x | 11-20 |
| 21-30 | 3 | 3.5x | 21-30 |
| 31-40 | 4 | 5.5x | 31-40 |
| 41-50 | 5 | 8.0x | 41-50 |

**Combined example:**
- Scout suit, Rare, Level 1, Tier 1: 30 total stats × 1.4 (rare) × 1.0 (tier 1) = **42 stats**
- Scout suit, Epic, Level 25, Tier 3: 30 total stats × 2.0 (epic) × 3.5 (tier 3) = **210 stats**
- Scout suit, Legendary, Level 40, Tier 4: 30 total stats × 4.0 (legendary) × 5.5 (tier 4) = **660 stats**

This creates meaningful progression while maintaining archetype identity (stats distributed according to scout profile at all levels).

## Stat Budget Allocation (Per Stat)

Based on archetype profiles, recommend these **per-stat baseline values for common tier 1**:

| Stat | Tank | Scout | Combat | Balanced | Notes |
|------|------|-------|--------|----------|-------|
| Durability | 20 | 5 | 10 | 15 | Tank focus |
| Toughness | 18 | 0 | 15 | 12 | Tank/Combat |
| Power | 0 | 0 | 25 | 10 | Combat focus |
| Haste | 0 | 18 | 15 | 8 | Scout/Combat |
| Vigor | 6 | 15 | 8 | 12 | Scout focus |
| Recovery | 6 | 6 | 0 | 6 | Support stat |
| Perception | 0 | 15 | 0 | 8 | Scout focus |
| Resilience | 10 | 0 | 0 | 6 | Tank focus |
| **TOTAL** | **60** | **59** | **73** | **77** | Normalize to ~60-70 range |

*Note: Combat archetype over-budget — reduce Power to 20 or Toughness to 10 for 63-68 total*

## Complexity Assessment

| Feature | Implementation Complexity | Design Complexity | Notes |
|---------|---------------------------|-------------------|-------|
| Stat profile templates | LOW | MEDIUM | Code is simple loops — design requires playtesting |
| Rarity multipliers | LOW | LOW | Single multiplier per rarity |
| Level tier scaling | LOW | MEDIUM | Need to balance curve feel |
| Archetype differentiation | MEDIUM | HIGH | Requires item audit + rebalance |
| Stat normalization | MEDIUM | LOW | Tedious but straightforward |

## Implementation Priority

### P1: Must Have for Launch
- [ ] **Stat profile templates** — Tank/Scout/Combat archetypes defined with stat ratios
- [ ] **Rarity multiplier constants** — 1.0x / 1.4x / 2.0x / 2.8x / 4.0x
- [ ] **Level tier scaling** — 1.0x to 8.0x across 5 tiers
- [ ] **Stat budget normalization** — Audit all 21 suits, apply formulas

### P2: Should Have, Add When Possible
- [ ] **Hybrid archetype profiles** — Hazmat/Assault/Recon stat templates
- [ ] **Visual stat comparison** — Tooltip shows "+25 vs equipped" on hover
- [ ] **Archetype labeling** — UI shows "Tank Suit" or "Scout Suit" tag

### P3: Nice to Have, Future Consideration
- [ ] **Stat soft caps** — Warn if stacking reduces effectiveness (not hard cap, just UI warning)
- [ ] **Breakpoint calculator** — "47 haste = 2 actions per turn" (external tool, not in-game)

## Competitor Analysis

| Feature | World of Warcraft | Path of Exile | Into the Void Approach |
|---------|-------------------|---------------|------------------------|
| Stat stacking | Additive within category, multiplicative across | Additive → More multipliers | Pure additive (simpler) |
| Rarity scaling | ilvl-based stat budget | No rarity tiers (all unique) | Fixed multipliers per rarity |
| Archetypes | Plate/Leather/Mail defines stats | Implicit mods per base type | Suit category defines profile |
| Progression curve | 15% per 15 ilvls (exponential) | Linear per base type | Tier-based multipliers (stepped linear) |
| Set bonuses | 2/4/6 piece bonuses | Unique items only | None — granted abilities instead |

**Key differentiator:** Into the Void uses **granted abilities + stat profiles** instead of set bonuses, creating suit identity without restricting gear choices.

## Expected Player Behavior

### Positive Patterns (Design Supports)
- **Archetype experimentation:** Players try tank suits, scout suits, combat suits to find playstyle
- **Rarity hunting:** Players excited to find epic/exotic versions of suits they like
- **Progression clarity:** "I'm level 25, I need tier 3 gear now"
- **Build diversity:** Granted abilities + module slots create variety without punishing stat choices

### Anti-Patterns (Design Prevents)
- **Single-stat stacking:** Archetype profiles naturally distribute stats (no all-toughness suits)
- **Rarity confusion:** Clear multipliers (2x epic, 4x legendary) — no random rolls
- **Analysis paralysis:** Fixed stats per item — no "is this roll better?" comparisons
- **Set bonus lock-in:** No sets — wear what you like

## Sources

**Equipment Stat Design:**
- [RPG Stats: Implementing Character Stats](https://howtomakeanrpg.com/r/a/how-to-make-an-rpg-stats.html) — Additive vs multiplicative stacking
- [Composite Design Pattern for RPG Attributes](https://gamedevelopment.tutsplus.com/tutorials/using-the-composite-design-pattern-for-an-rpg-attributes-system--gamedev-243) — Modifier application order
- [Stat System | Camelot Unchained](https://www.camelotunchained.com/v3/bsc-design-docs/stat-system/) — Alternative to item stat bonuses

**Rarity Scaling:**
- [Gear Refinement Guide - Blue Protocol](https://maxroll.gg/blue-protocol/resources/gear-refinement-guide) — Substat mechanics by rarity
- [The Forge Ore Traits Guide](https://noleep.com/en/the-forge-ore-traits-tier-list/) — Crafting multipliers (6.3x to 25x)
- [Stat Budget - Wowpedia](https://wowpedia.fandom.com/wiki/Stat_budget) — Item level stat allocation formula

**Archetype Design:**
- [Tank - Ashes of Creation Wiki](https://ashesofcreation.wiki/Tank) — Tank archetype role definition
- [Best Division 2 Gear Sets 2025](https://dving.net/guides/the-division-2-guides/best-division-2-gear-sets-brand-sets-in-2025) — Archetype-specific stat bonuses
- [ESO Tank Gear Guide 2026](https://thetankclub.com/eso-tank-gear/) — Defense/utility focus for tanks
- [Damager, Healer, Tank - TV Tropes](https://tvtropes.org/pmwiki/pmwiki.php/Main/DamagerHealerTank) — Core archetype framework

**Stacking Mechanics:**
- [Additive vs Multiplicative Damage](https://refreshertowelgames.wordpress.com/2024/02/17/how-to-comfortably-deal-with-modifiable-stats/) — Modifier application patterns
- [GAF: Multiplicative vs Additive](https://www.neogaf.com/threads/gaf-i-need-your-help-understanding-multiplicative-vs-additive.1262391/) — Player confusion examples

**Rarity Systems:**
- [Color-Coded Item Tiers - TV Tropes](https://tvtropes.org/pmwiki/pmwiki.php/Main/ColorCodedItemTiers) — Standard rarity conventions
- [Item Rarity :: Enshrouded](https://steamcommunity.com/app/1203620/discussions/0/4142816719800199196/) — Rarity tier implementation examples

---
*Feature research for: Equipment Stat Bonuses System*
*Researched: 2026-02-21*
*Confidence: HIGH (web search + existing codebase analysis)*
