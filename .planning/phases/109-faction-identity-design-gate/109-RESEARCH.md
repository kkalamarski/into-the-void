# Phase 109: Faction Identity Design Gate - Research

**Researched:** 2026-03-02
**Domain:** Game design documentation / faction identity systems
**Confidence:** HIGH

## Summary

Phase 109 is a design-documentation phase, not a code implementation phase. The deliverable is a committed design artifact that locks faction identity decisions before any faction item definitions are authored in Phases 112-114. The existing codebase provides all the infrastructure needed: 7 archetype profiles in `utils.ts`, 26 ability definitions in `definitions.ts`, established item definition patterns in `suits.ts`/`modules.ts`/`tools.ts`, and comprehensive faction lore in `lore/world-bible.md`.

The key challenge is creating a design document that maps the 21 grantable abilities (excluding gathering/universal) to factions using the stat-driven grouping rule, defines the scavenger archetype for Unaffiliated, establishes faction word banks, and documents naming/color conventions. A small code change is also needed: adding the `scavenger` archetype to `ARCHETYPE_PROFILES` in `utils.ts`, plus a reference comment in item definition files pointing to the design document.

**Primary recommendation:** Create a single comprehensive design document at `packages/items/FACTION-IDENTITY.md` (co-located with the items package it governs), add the scavenger archetype to utils.ts, and add reference comments to definition files.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Verdant Dynamics:** Primary = hazmat (resilience/recovery/durability), Secondary = balanced (scientific versatility)
- **Helix Extraction:** Primary = tank (durability/toughness), Secondary = assault (power/durability/haste)
- **Nexus Frontiers:** Primary = recon (perception/haste/vigor), Secondary = scout (haste/perception/vigor)
- **Unaffiliated:** New **scavenger** archetype -- vigor (30%), recovery (25%), perception (25%), with remaining spread across durability/resilience. Represents survival instincts from scrounging, no combat specialization
- Shared stats between factions are acceptable -- what matters is different emphasis
- Each faction gets **1 lore-justified off-archetype** suit variant (e.g., Verdant security division using combat archetype). The off-archetype must have a narrative reason within faction lore
- **Fully shared access model** -- all factions can eventually access all abilities, but faction-aligned abilities unlock at lower tiers/earlier in progression
- **Stat-driven grouping** determines which abilities are "in-faction": abilities that buff or leverage the faction's primary stats are considered faction-aligned
- **Scaling ability count per rarity:** Common = 1 ability, Rare = 2, Epic = 3, Exotic = 4, Legendary = 5
- **Unaffiliated** pulls 1-2 abilities from each faction's pool -- jack-of-all-trades combinations
- **Item ID pattern:** `{type}_{faction}_{name}_{rarity}` -- e.g., `suit_verdant_bioweave_rare`
- **Display names:** Faction-themed vocabulary, NOT faction name prefix
- **Faction word banks** (10-15 words each) must be documented
- **Color palette anchors (earth tones):** Verdant: greens (#2a7a3a range), Helix: reds/oranges (#8a2a1a range), Nexus: blues/teals (#1a4a7a range), Unaffiliated: grays/yellows (#7a7a5a range)
- **Gradual archetype shift:** Common-tier suits start more balanced/generic, higher tiers specialize deeper
- **7 suits per faction:** 5 main ladder (Common-Legendary) + 2 off-archetype variants at Epic and Legendary
- **Off-archetype uses the SAME archetype at both tiers** (consistent sub-identity)
- **28 total faction suits** across all four factions
- **Modules and tools follow the same full Common-through-Legendary rarity ladder** as suits

### Claude's Discretion
- Exact stat weight percentages for the scavenger archetype (within vigor/recovery/perception direction)
- Specific ability-to-faction mappings (using the stat-driven grouping rule)
- Which off-archetype each faction uses (must be lore-justified)
- Specific faction word bank contents (within thematic direction)
- Exact hex color values within specified ranges

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SUIT-01 | Faction identity pillars defined from lore (Verdant=resilience/biotech, Helix=power/industrial, Nexus=perception/surveillance) | Lore verified in world-bible.md; all 7 existing archetypes documented; 21 grantable abilities catalogued; item definition patterns understood |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| N/A (design phase) | - | This phase produces a markdown design document and minor code additions | No new dependencies needed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Existing `packages/items/src/utils.ts` | Current | ARCHETYPE_PROFILES, generateSuitStats() | Adding scavenger archetype |
| Existing `packages/items/src/types.ts` | Current | ItemDefinition interface, ToolType, etc. | Reference for naming conventions |

## Architecture Patterns

### Existing Archetype System
```typescript
// packages/items/src/utils.ts - 7 existing archetypes
export const ARCHETYPE_PROFILES = {
  tank: { durability: 35, toughness: 30, resilience: 15, recovery: 10, vigor: 10 },
  scout: { haste: 30, perception: 25, vigor: 25, recovery: 10, durability: 10 },
  combat: { power: 30, haste: 20, toughness: 20, durability: 15, vigor: 15 },
  balanced: { durability: 15, toughness: 12, power: 10, haste: 10, vigor: 15, recovery: 8, perception: 15, resilience: 15 },
  hazmat: { resilience: 30, recovery: 25, durability: 25, vigor: 20 },
  assault: { power: 35, durability: 25, haste: 25, toughness: 15 },
  recon: { perception: 35, haste: 30, vigor: 25, recovery: 10 },
} as const;
```

### Existing Ability Categories (21 grantable + 5 gathering/universal)

**Offensive (11):** basic_strike, shield_bash, energy_pulse, electrocute, plasma_burst, concussive_strike, thermal_lance, void_drain, cryo_blast, overload_pulse, precision_shot

**Defensive (6):** nano_repair, magnetic_field, emergency_shield, regeneration_protocol, fortify_systems, energy_barrier

**Utility (5):** home_recall (universal), resource_scan, overclock, power_surge, analyze_specimen

**Gathering (5):** gather (universal), harvest, mine, basic_harvest, basic_mine

**Stat-ability alignment analysis:**
- **Resilience/Recovery/Durability abilities (Verdant-aligned):** energy_barrier (resilience buff), regeneration_protocol (heal-over-time/recovery), nano_repair (self-heal), fortify_systems (durability buff)
- **Durability/Toughness/Power abilities (Helix-aligned):** magnetic_field (toughness buff), emergency_shield (toughness buff), fortify_systems (durability), power_surge (power buff), concussive_strike (power-based), plasma_burst (heavy damage), thermal_lance (armor pierce)
- **Perception/Haste/Vigor abilities (Nexus-aligned):** resource_scan (perception buff), overclock (haste buff), analyze_specimen (perception+power buff), precision_shot (long-range), electrocute (shock DoT)
- **Cross-faction (shared by all):** basic_strike, shield_bash, energy_pulse, nano_repair

### Existing Item ID Patterns
```
suit_basic_common           -- generic suits
suit_nexus_combat_frame_exotic  -- faction-specific
module_armor_common         -- generic modules
tool_mining_common          -- generic tools
tool_bio_probe_rare         -- specialized tools
```

### Existing Faction Color Ranges (from current items)
- Verdant items: 0x2a5a2a (environmental epic), 0x44aa44 (bio probe) -- greens
- Helix items: 0x4a1a1a (helix research), 0xaa4400 (demolition) -- reds/oranges
- Nexus items: 0x1a2a4a (nexus combat frame), 0x444488 (infiltrator) -- blues
- Unaffiliated: 0x7a6040 (salvaged suit) -- warm grays

### Item Definition File Structure
Faction suits should go in new files: `packages/items/src/definitions/faction-suits.ts` (or per-faction files). The design document determines this structure.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Stat generation | Hand-coded stat numbers | `generateSuitStats(archetype, rarity, tier)` | Consistent scaling, already proven |
| Item level calc | Manual ilvl values | `computeIlvl(tier, rarity)` | Formula ensures proper progression |
| Ability definitions | New ability types | Existing 21 abilities via `grantedAbilities` array | Scope constraint -- no new abilities this milestone |

## Common Pitfalls

### Pitfall 1: Ability Overlap Causing Identity Collapse
**What goes wrong:** Two factions grant identical ability sets, making them feel mechanically indistinguishable.
**Why it happens:** Not carefully differentiating which abilities appear at which tiers for each faction.
**How to avoid:** The design document must have a complete matrix showing every ability assignment per faction per tier. Visual diff should be easy.
**Warning signs:** Same 3+ abilities on two different factions at the same rarity tier.

### Pitfall 2: Scavenger Archetype Percentages Not Summing to 100
**What goes wrong:** The new scavenger archetype has stat percentages that don't sum to 100, causing generateSuitStats to produce incorrect total budgets.
**Why it happens:** CONTEXT.md specifies vigor 30%, recovery 25%, perception 25% = 80%, leaving 20% unspecified.
**How to avoid:** Explicitly document the remaining 20% split (durability/resilience per context) and validate sum = 100.
**Warning signs:** `generateSuitStats('scavenger', ...)` producing different total stats than other archetypes at same tier/rarity.

### Pitfall 3: Design Document Location Not Referenced
**What goes wrong:** Phase 112+ contributors create faction items without consulting the design document because they don't know it exists.
**Why it happens:** Document created but not referenced from the actual code files.
**How to avoid:** Success criterion 4 requires a reference in item definition files. Add a comment block at the top of suits.ts, modules.ts, and tools.ts pointing to the design document.
**Warning signs:** No `@see` or `// Design reference:` comments in definition files.

### Pitfall 4: Off-Archetype Inconsistency
**What goes wrong:** Off-archetype suits at Epic and Legendary use different archetypes, breaking the "consistent sub-identity" rule.
**Why it happens:** Not reading the constraint that off-archetype must use the SAME archetype at both tiers.
**How to avoid:** Design document must specify one off-archetype per faction, used at both Epic and Legendary tiers.

## Code Examples

### Adding Scavenger Archetype to utils.ts
```typescript
// packages/items/src/utils.ts
export const ARCHETYPE_PROFILES = {
  // ... existing 7 archetypes ...
  scavenger: { vigor: 30, recovery: 25, perception: 25, durability: 12, resilience: 8 },
} as const;
```

### Design Document Reference Comment
```typescript
// packages/items/src/definitions/suits.ts (top of file)
/**
 * Faction suit design governed by: packages/items/FACTION-IDENTITY.md
 * See that document for stat archetypes, ability matrices, naming conventions,
 * and color palette anchors before adding or modifying faction suits.
 */
```

### Faction Suit ID Pattern
```typescript
// Following the {type}_{faction}_{name}_{rarity} convention:
id: 'suit_verdant_bioweave_rare',
id: 'suit_helix_ironclad_epic',
id: 'suit_nexus_spectre_exotic',
id: 'suit_unaffiliated_patchwork_common',
```

## Open Questions

1. **Design document location: `packages/items/FACTION-IDENTITY.md` vs `.planning/` directory?**
   - Recommendation: `packages/items/FACTION-IDENTITY.md` -- co-located with the code it governs, visible to contributors working on items. The `.planning/` path is for project management artifacts, not developer-facing design references.

2. **Module slot counts for faction suits**
   - Existing pattern: Common = 3 slots, Rare = 4, Epic = 4, Exotic = 5, Legendary = 6
   - Recommendation: Follow existing pattern. Document in design artifact.

## Sources

### Primary (HIGH confidence)
- `packages/items/src/utils.ts` -- ARCHETYPE_PROFILES, generateSuitStats(), STAT_RARITY_MULTIPLIERS, TIER_MULTIPLIERS
- `packages/game-logic/src/ability/definitions.ts` -- All 26 ability definitions
- `packages/items/src/definitions/suits.ts` -- 22 existing suit definitions with patterns
- `packages/items/src/definitions/modules.ts` -- Module definition patterns
- `packages/items/src/definitions/tools.ts` -- Tool definition patterns with toolType system
- `packages/items/src/types.ts` -- ItemDefinition interface, ItemRarity, ToolType
- `packages/items/src/definitions/index.ts` -- ITEM_IDS constants, ALL_ITEMS aggregation
- `lore/world-bible.md` -- Faction descriptions, hub descriptions, leadership profiles

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No external libraries, pure documentation + minor code additions
- Architecture: HIGH - Existing patterns fully understood from codebase exploration
- Pitfalls: HIGH - All identified from concrete analysis of existing code patterns

**Research date:** 2026-03-02
**Valid until:** 2026-04-02 (stable -- design documentation)

---
*Phase: 109-faction-identity-design-gate*
*Research completed: 2026-03-02*
