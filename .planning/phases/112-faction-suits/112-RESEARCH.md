# Phase 112: Faction Suits - Research

**Researched:** 2026-03-03
**Domain:** Item definitions — TypeScript data authoring in `packages/items`
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Domain boundary:**
Create complete suit lines (Common through Legendary) for Verdant Dynamics, Helix Extraction, Nexus Frontiers, and Unaffiliated using generateSuitStats() — no hand-coded stats. 28 new suits total (5 main ladder + 2 off-archetype per faction). Faction identity expressed through grantedAbilities, textureKey, display names, and color. All conventions from FACTION-IDENTITY.md (Phase 109) are locked.

**Suit Naming & Flavor:**
- Display names escalate in impressiveness with rarity: Common feels humble, Legendary feels grand
- Legendary suits get proper named-item names (like "Void Walker") — e.g., "The Canopy Sovereign" (Verdant), "The Crucible" (Helix). Aspirational endgame gear
- Descriptions written in each faction's voice: Verdant = scientific, Helix = industrial, Nexus = sleek/techy, Unaffiliated = subtly different from corporate factions (practical, less polished) but not overtly scrappy
- Use word banks from FACTION-IDENTITY.md for all naming

**Tier & Level Gating:**
- Clean 1:1 rarity-to-tier mapping: Common=L1 (T1), Rare=L11 (T2), Epic=L21 (T3), Exotic=L31 (T4), Legendary=L41 (T5)
- Off-archetype suits require slightly higher levels than main ladder: Epic off-arch=L25, Legendary off-arch=L45
- Faction-flavored base values: Helix industrial suits worth ~10% more, Unaffiliated scrap suits worth ~10% less. Verdant and Nexus at standard values

**Off-Archetype Identity:**
- Division-themed naming: off-archetype suit names reference their lore division (Verdant combat → "Security Division" theming, Helix recon → "Deep Survey" theming, Nexus assault → "Enforcement Division" theming, Unaffiliated hazmat → "Wasteland Reclamation" theming)
- Shifted accent color: off-archetype suits use the faction's accent color instead of primary (Verdant off-arch = #3a9a4a vs main #2a7a3a)
- Different granted abilities: off-archetype abilities come from the off-archetype section of FACTION-IDENTITY.md ability matrix, not the main ladder abilities

**Existing Suit Handling:**
- Keep all 22 generic suits as non-faction alternatives — available to all players regardless of faction
- Keep SUIT_NEXUS_COMBAT_FRAME_EXOTIC and SUIT_HELIX_RESEARCH_FRAME_EXOTIC as unique standalone items, separate from the new faction suit lines
- Faction suits coexist with generics in loot tables (loot table specifics are a future concern)
- No faction restriction on equipping: any player can equip any faction's suit

### Claude's Discretion

- Whether off-archetype suits are mathematically equivalent side-grades or slightly premium (generateSuitStats uses same tier/rarity budget either way)
- Exact weight values per suit
- Specific word choices from faction word banks for each rarity level
- Module slot counts per rarity (following existing 3-6 pattern)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SUIT-02 | Verdant Dynamics suit line across tiers (Common through Legendary) using hazmat/scout archetypes | generateSuitStats('hazmat'/'balanced'/'combat', rarity, tier) verified working; FACTION-IDENTITY.md defines exact archetype progression per tier |
| SUIT-03 | Helix Extraction suit line across tiers (Common through Legendary) using tank/assault archetypes | generateSuitStats('tank'/'assault'/'recon', rarity, tier) verified working; FACTION-IDENTITY.md defines per-tier archetypes |
| SUIT-04 | Nexus Frontiers suit line across tiers (Common through Legendary) using recon/balanced archetypes | generateSuitStats('recon'/'assault', rarity, tier) verified working; FACTION-IDENTITY.md fully specifies |
| SUIT-05 | All faction suits use generateSuitStats() utility (no hand-coded stats) | generateSuitStats function verified at /packages/items/src/utils.ts; existing 22 suits already use this pattern; test suite enforces stats effects on every suit |
| SUIT-06 | Unaffiliated salvaged suit line across tiers with improvised/scavenged aesthetic | generateSuitStats('scavenger'/'balanced'/'hazmat', rarity, tier) verified working; scavenger archetype added in Phase 109 |
</phase_requirements>

---

## Summary

Phase 112 is a pure TypeScript data authoring task. There are no new libraries, no new systems, and no new infrastructure required. The phase consists of creating one new definition file (`packages/items/src/definitions/faction-suits.ts`) with 28 `ItemDefinition` objects, then integrating it into `definitions/index.ts` (the aggregator) and the `ITEM_IDS` constants map.

All mechanical infrastructure is already in place and verified: `generateSuitStats()` exists in `utils.ts` and accepts all 8 archetypes including `scavenger` (added in Phase 109). `FACTION-IDENTITY.md` is the locked source of truth for every decision about archetypes, abilities, colors, and naming. The existing `item-validation.test.ts` already validates that every suit has a stats effect — the new suits must pass these tests with zero modifications to the test file.

The one notable risk is the Helix Legendary stat budget: `generateSuitStats('assault', 'legendary', 5)` yields 2,464 total stats. This is the highest possible output and was flagged in STATE.md as potentially needing a TTK audit. For Phase 112 purposes this is acceptable since no game balance changes are in scope — the function produces what it produces.

**Primary recommendation:** Author one file `faction-suits.ts` with 28 definitions following the exact pattern of `aquatic-suits.ts` and `exotic-suits.ts`, integrate into `definitions/index.ts`, verify `nx run items:test` passes.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | Already in project | Item definition typing | `ItemDefinition` interface enforces required fields |
| Vitest | v4.0.18 (in use) | Test runner | Already configured, `pnpm --filter items test` runs in 141ms |

No new dependencies needed.

**Installation:**
None required.

---

## Architecture Patterns

### Recommended Project Structure

```
packages/items/src/definitions/
├── suits.ts                    # 22 existing generic suits (DO NOT MODIFY content)
├── faction-suits.ts            # NEW: 28 faction suit definitions
├── aquatic-suits.ts            # Pattern reference (3 suits)
├── exotic-suits.ts             # Pattern reference (3 suits)
└── index.ts                    # ADD: import + spread ALL_FACTION_SUITS
```

### Pattern 1: Faction Suit Definition File Structure

**What:** Single file `faction-suits.ts` exporting each suit as a named const and a collected `ALL_FACTION_SUITS` array.

**When to use:** Every new suit grouping in this codebase uses this file-per-group pattern.

**Example (from `aquatic-suits.ts`):**
```typescript
// packages/items/src/definitions/faction-suits.ts
/**
 * Faction Suit Design Reference
 * @see packages/items/FACTION-IDENTITY.md for:
 *   - Stat archetypes per faction (primary/secondary/off-archetype)
 *   - Ability assignment matrix (which abilities at which tier)
 *   - Naming conventions ({type}_{faction}_{name}_{rarity})
 *   - Color palette anchors per faction
 *   - Tier progression table
 */

import type { ItemDefinition } from '../types';
import { computeIlvl, generateSuitStats } from '../utils';

// ============================================================
// VERDANT DYNAMICS SUITS (7)
// ============================================================

export const SUIT_VERDANT_BIOWEAVE_COMMON: ItemDefinition = {
  id: 'suit_verdant_bioweave_common',
  displayName: 'Bioweave Exo-Suit',
  description: '...',
  category: 'suit',
  rarity: 'common',
  maxStack: 1,
  weight: 7.5,
  baseValue: 600,
  requiredLevel: 1,
  ilvl: computeIlvl(1, 'common'),
  textureKey: 'item_suit_verdant_common',
  color: 0x235f2f,   // Verdant primary darkened for common
  equipSlot: 'exosuit',
  moduleSlots: 3,
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('balanced', 'common', 1) } },
  ],
  grantedAbilities: ['nano_repair'],
};

// ... 6 more Verdant suits, then Helix (7), Nexus (7), Unaffiliated (7) ...

export const ALL_FACTION_SUITS: readonly ItemDefinition[] = [
  SUIT_VERDANT_BIOWEAVE_COMMON,
  // ... all 28 ...
];
```

### Pattern 2: Index Integration

**What:** `definitions/index.ts` imports each definition file and spreads into `ALL_ITEMS`.

**When to use:** Every new definition file follows this; it is the mandatory integration step.

**Example (from existing `index.ts`):**
```typescript
// Add to imports:
import { ALL_FACTION_SUITS } from './faction-suits';

// Add to ALL_ITEMS array:
export const ALL_ITEMS: readonly ItemDefinition[] = [
  ...ALL_SUITS,
  // ... existing spreads ...
  ...ALL_FACTION_SUITS,  // Phase 112 faction suits
];

// Add to ITEM_IDS:
export const ITEM_IDS = {
  // ... existing ...
  // ---- FACTION SUITS: VERDANT ----
  SUIT_VERDANT_BIOWEAVE_COMMON: 'suit_verdant_bioweave_common',
  // ... 27 more ...
} as const;

// Add to re-exports at bottom:
export * from './faction-suits';
```

### Pattern 3: generateSuitStats() Usage

**What:** Always call `generateSuitStats(archetype, rarity, tier)` — never write numeric stat values directly.

**Verified signature** (from `packages/items/src/utils.ts`):
```typescript
generateSuitStats(
  archetype: keyof typeof ARCHETYPE_PROFILES,  // 8 options
  rarity: ItemRarity,                           // common|rare|epic|exotic|legendary
  tier: 1 | 2 | 3 | 4 | 5,
  baseBudget: number = 77                       // default 77, do not override
): Partial<Record<StatKey, number>>
```

**Spread into the stats effect:**
```typescript
effects: [
  { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('hazmat', 'rare', 2) } },
],
```

**What the function outputs at key tier/rarity combos:**

| Archetype | Rarity | Tier | Total Stats |
|-----------|--------|------|-------------|
| balanced | common | 1 | 77 |
| balanced | rare | 1 | 108 |
| hazmat | rare | 2 | 216 |
| hazmat | epic | 3 | 539 |
| hazmat | exotic | 4 | 1,186 |
| hazmat | legendary | 5 | 2,464 |
| tank | legendary | 5 | 2,464 |
| assault | legendary | 5 | 2,464 |
| recon | legendary | 5 | 2,464 |
| scavenger | legendary | 5 | 2,464 |

All faction archetypes at same tier/rarity produce identical total budget; only distribution differs.

### Pattern 4: textureKey Convention

**What:** Each faction uses faction-named textureKeys per rarity to avoid collisions. Since no sprites exist yet, these are placeholders (the CLAUDE.md fallback color rule applies).

**Proposed textureKey scheme** (none of these collide with existing 16 keys):
```
item_suit_verdant_common      item_suit_helix_common
item_suit_verdant_rare        item_suit_helix_rare
item_suit_verdant_epic        item_suit_helix_epic
item_suit_verdant_exotic      item_suit_helix_exotic
item_suit_verdant_legendary   item_suit_helix_legendary
item_suit_verdant_combat_epic         item_suit_helix_recon_epic
item_suit_verdant_combat_legendary    item_suit_helix_recon_legendary

item_suit_nexus_common        item_suit_unaffiliated_common
item_suit_nexus_rare          item_suit_unaffiliated_rare
item_suit_nexus_epic          item_suit_unaffiliated_epic
item_suit_nexus_exotic        item_suit_unaffiliated_exotic
item_suit_nexus_legendary     item_suit_unaffiliated_legendary
item_suit_nexus_assault_epic          item_suit_unaffiliated_hazmat_epic
item_suit_nexus_assault_legendary     item_suit_unaffiliated_hazmat_legendary
```

### Pattern 5: The Complete Faction-to-Archetype Matrix (Locked from FACTION-IDENTITY.md)

| Faction | Common | Rare | Epic | Exotic | Legendary | Epic Off | Legendary Off |
|---------|--------|------|------|--------|-----------|----------|---------------|
| Verdant | balanced | hazmat | hazmat | hazmat | hazmat | combat | combat |
| Helix | balanced | tank | tank | assault | assault | recon | recon |
| Nexus | balanced | recon | recon | recon | recon | assault | assault |
| Unaffiliated | balanced | scavenger | scavenger | scavenger | scavenger | hazmat | hazmat |

### Pattern 6: Ability Assignment (Locked from FACTION-IDENTITY.md)

| Tier | Verdant | Helix | Nexus | Unaffiliated |
|------|---------|-------|-------|--------------|
| Common (1) | nano_repair | nano_repair | nano_repair | nano_repair |
| Rare (2) | energy_barrier, regeneration_protocol | magnetic_field, fortify_systems | overclock, resource_scan | nano_repair, emergency_shield |
| Epic (3) | energy_barrier, regeneration_protocol, nano_repair | magnetic_field, fortify_systems, power_surge | overclock, resource_scan, analyze_specimen | emergency_shield, overclock, energy_barrier |
| Exotic (4) | energy_barrier, regeneration_protocol, nano_repair, analyze_specimen | magnetic_field, fortify_systems, power_surge, emergency_shield | overclock, resource_scan, analyze_specimen, precision_shot | emergency_shield, overclock, energy_barrier, resource_scan |
| Legendary (5) | energy_barrier, regeneration_protocol, nano_repair, analyze_specimen, fortify_systems | magnetic_field, fortify_systems, power_surge, emergency_shield, concussive_strike | overclock, resource_scan, analyze_specimen, precision_shot, electrocute | emergency_shield, overclock, energy_barrier, resource_scan, power_surge |

Off-archetype abilities come from the off-archetype section in FACTION-IDENTITY.md (not the table above). The document specifies the ability pools but does NOT prescribe exact off-arch ability lists per tier — this is Claude's discretion informed by which abilities match the off-arch archetype's stat profile.

### Pattern 7: Color Values (Locked from FACTION-IDENTITY.md)

| Faction | Common | Rare | Epic | Exotic | Legendary |
|---------|--------|------|------|--------|-----------|
| Verdant main | 0x235f2f | 0x2a7a3a | 0x2f8a40 | 0x34994a | 0x3aaa55 |
| Verdant off-arch | — | — | 0x3a9a4a | — | 0x3a9a4a |
| Helix main | 0x6f221a | 0x8a2a1a | 0x9a301f | 0xa83525 | 0xbb3a2a |
| Helix off-arch | — | — | 0xaa3a2a | — | 0xaa3a2a |
| Nexus main | 0x153b60 | 0x1a4a7a | 0x1f5287 | 0x245a94 | 0x2a65a0 |
| Nexus off-arch | — | — | 0x2a5a8a | — | 0x2a5a8a |
| Unaffiliated main | 0x5f5f45 | 0x7a7a5a | 0x888865 | 0x959570 | 0xa0a07a |
| Unaffiliated off-arch | — | — | 0x9a9a6a | — | 0x9a9a6a |

(Common uses Base-15% per FACTION-IDENTITY.md; each step brightens toward Legendary's Base+30%)

### Pattern 8: Level & BaseValue Reference

| Rarity | Tier | requiredLevel | computeIlvl call | Standard baseValue | Helix (+10%) | Unaffiliated (-10%) |
|--------|------|--------------|-------------------|--------------------|--------------|---------------------|
| common | 1 | 1 | computeIlvl(1,'common') | 600 | 660 | 540 |
| rare | 2 | 11 | computeIlvl(2,'rare') | 2,200 | 2,420 | 1,980 |
| epic | 3 | 21 | computeIlvl(3,'epic') | 9,000 | 9,900 | 8,100 |
| exotic | 4 | 31 | computeIlvl(4,'exotic') | 35,000 | 38,500 | 31,500 |
| legendary | 5 | 41 | computeIlvl(5,'legendary') | 120,000 | 132,000 | 108,000 |
| epic (off-arch) | 3 | 25 | computeIlvl(3,'epic') | ~9,500 | ~10,450 | ~8,550 |
| legendary (off-arch) | 5 | 45 | computeIlvl(5,'legendary') | ~125,000 | ~137,500 | ~112,500 |

### Anti-Patterns to Avoid

- **Hand-coded stats:** Never write `durability: 45` directly. Always spread `generateSuitStats(...)`.
- **Incorrect tier argument:** The `tier` in `generateSuitStats` must match the suit's actual level tier, NOT the rarity tier. A Legendary suit at L41 is tier 5.
- **textureKey collision:** Do not reuse existing textureKeys like `item_suit_tactical` or `item_suit_environmental`. Each faction suit needs its own key even if it's a placeholder.
- **Ability lists not matching FACTION-IDENTITY.md:** The ability matrix in FACTION-IDENTITY.md is locked. Copy from it exactly.
- **Exporting without registering:** Exporting from `faction-suits.ts` alone is not enough — the `ALL_FACTION_SUITS` array must be spread into `ALL_ITEMS` in `index.ts` for the registry to pick it up.
- **Forgetting ITEM_IDS constants:** Every new item must get a constant in the `ITEM_IDS` map; this is the project's type-safe ID pattern.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Stat values per suit | Custom numeric calculations | `generateSuitStats(archetype, rarity, tier)` | Requirement SUIT-05; test enforces it |
| Item level | Manual ilvl numbers | `computeIlvl(tier, rarity)` | Existing utility, ensures consistency |
| Color scaling per rarity | Custom hex math | Reference color table in FACTION-IDENTITY.md section 4 | Already designed; just copy values |
| Ability progression | Custom ability logic | FACTION-IDENTITY.md Section 2 ability matrix | Locked decisions; deviation breaks design |

**Key insight:** This phase is pure data entry against a locked specification. The infrastructure exists; the design is locked. The only work is transcribing FACTION-IDENTITY.md decisions into TypeScript `ItemDefinition` objects.

---

## Common Pitfalls

### Pitfall 1: Off-Archetype Ability Sets Not Defined in FACTION-IDENTITY.md

**What goes wrong:** The FACTION-IDENTITY.md Ability Assignment Matrix (Section 2) only covers the 5-suit main ladder. It does NOT specify per-tier ability lists for off-archetype suits. There is a list of which abilities come from the off-arch pool but no progression table.

**Why it happens:** The design doc specifies the ability pool but leaves the per-tier combination to the implementer.

**How to avoid:** For off-archetype Epic (3 abilities) and Legendary (5 abilities), draw from the faction's off-archetype ability pool using the same pattern: earlier abilities repeat, later abilities add. For example, Verdant combat off-arch Epic might use `power_surge, fortify_systems, concussive_strike` — abilities that reinforce the combat archetype stats.

**Warning signs:** If an off-archetype suit has the same `grantedAbilities` as the main ladder suit at the same tier, that is wrong.

### Pitfall 2: Wrong Tier in generateSuitStats()

**What goes wrong:** Using `rarity` index as `tier` argument, or using a fixed tier for all off-archetype suits.

**Why it happens:** Off-archetype Epic suits are at L25 = Tier 3 and off-archetype Legendary at L45 = Tier 5. These must use `generateSuitStats('combat', 'epic', 3)` and `generateSuitStats('combat', 'legendary', 5)` respectively.

**How to avoid:** Derive tier from `requiredLevel`: L1-10=T1, L11-20=T2, L21-30=T3, L31-40=T4, L41-50=T5.

**Warning signs:** A Legendary off-arch at L45 using `tier: 4` would produce 1,186 total stats instead of 2,464.

### Pitfall 3: Collision With Existing Pre-Faction Helix/Nexus Suits

**What goes wrong:** `SUIT_NEXUS_COMBAT_FRAME_EXOTIC` and `SUIT_HELIX_RESEARCH_FRAME_EXOTIC` already exist in `suits.ts` as standalone items. The new Nexus Exotic main-ladder suit and Helix off-arch Legendary could overlap conceptually.

**Why it happens:** The standalone exotics were authored before the faction ladder existed and are described as "unique standalone items" that remain separate.

**How to avoid:** Give new faction suits distinct IDs, textureKeys, names, and avoid duplicating those standalone items' exact ability combos. The CONTEXT.md explicitly calls out keeping these as separate standalone items.

### Pitfall 4: ALL_FACTION_SUITS Not Spread Into ALL_ITEMS

**What goes wrong:** The file compiles, exports work, but `ItemRegistry` never sees the new suits because `ALL_ITEMS` in `index.ts` was not updated.

**Why it happens:** The registry is populated from `ALL_ITEMS` in `index.ts` on module load (`ItemRegistry.registerAll(ALL_ITEMS)`). Items not in `ALL_ITEMS` are invisible to the registry.

**How to avoid:** After authoring the definition file, always update `index.ts`: add import, spread into `ALL_ITEMS`, add to `ITEM_IDS`, add to re-exports.

### Pitfall 5: Item ID Format Violations

**What goes wrong:** IDs like `suit_verdant_bioweave` (missing rarity) or `verdant_bioweave_common` (missing `suit_` prefix) break the naming convention.

**How to avoid:** Always use `{type}_{faction}_{name}_{rarity}` from FACTION-IDENTITY.md Section 3. The TypeScript const name follows `SUIT_VERDANT_BIOWEAVE_COMMON` (all caps with underscores).

---

## Code Examples

### Complete Verdant Common Suit (canonical template)

```typescript
// Source: derived from existing suits.ts pattern + FACTION-IDENTITY.md
export const SUIT_VERDANT_BIOWEAVE_COMMON: ItemDefinition = {
  id: 'suit_verdant_bioweave_common',
  displayName: 'Bioweave Exo-Suit',
  description:
    'Standard Verdant Dynamics field suit with integrated bioweave filtration membranes. Rated for Tier I biome exposure. Issued to new Verdant personnel upon environmental clearance.',
  category: 'suit',
  rarity: 'common',
  maxStack: 1,
  weight: 7.5,
  baseValue: 600,
  requiredLevel: 1,
  ilvl: computeIlvl(1, 'common'),
  textureKey: 'item_suit_verdant_common',
  color: 0x235f2f,      // Verdant primary darkened (Base-15%)
  equipSlot: 'exosuit',
  moduleSlots: 3,
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('balanced', 'common', 1) } },
  ],
  grantedAbilities: ['nano_repair'],
};
```

### Verdant Legendary (named item example)

```typescript
export const SUIT_VERDANT_CANOPY_SOVEREIGN_LEGENDARY: ItemDefinition = {
  id: 'suit_verdant_canopy_sovereign_legendary',
  displayName: 'The Canopy Sovereign',
  description:
    'The pinnacle of Verdant Dynamics biosuit engineering. Symbiotic mycelial networks woven throughout the frame provide real-time biome adaptation. Fewer than forty have ever been completed. Each one is named.',
  category: 'suit',
  rarity: 'legendary',
  maxStack: 1,
  weight: 6.5,
  baseValue: 120000,
  requiredLevel: 41,
  ilvl: computeIlvl(5, 'legendary'),
  textureKey: 'item_suit_verdant_legendary',
  color: 0x3aaa55,      // Verdant primary brightened (Base+30%)
  equipSlot: 'exosuit',
  moduleSlots: 6,
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('hazmat', 'legendary', 5) } },
  ],
  grantedAbilities: ['energy_barrier', 'regeneration_protocol', 'nano_repair', 'analyze_specimen', 'fortify_systems'],
};
```

### Verdant Combat Off-Archetype Epic (Security Division)

```typescript
export const SUIT_VERDANT_CANOPY_WARDEN_EPIC: ItemDefinition = {
  id: 'suit_verdant_canopy_warden_epic',
  displayName: 'Canopy Warden Frame',
  description:
    'Verdant Security Division combat suit. Biologically-reinforced plating over a flexible mycelial underlayer. Deployed when protecting specimens requires force.',
  category: 'suit',
  rarity: 'epic',
  maxStack: 1,
  weight: 9.0,
  baseValue: 9500,
  requiredLevel: 25,    // Off-archetype: L25 not L21
  ilvl: computeIlvl(3, 'epic'),
  textureKey: 'item_suit_verdant_combat_epic',
  color: 0x3a9a4a,      // Verdant ACCENT (off-arch uses accent color, not primary)
  equipSlot: 'exosuit',
  moduleSlots: 4,
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('combat', 'epic', 3) } },
  ],
  grantedAbilities: ['power_surge', 'fortify_systems', 'concussive_strike'],
};
```

### index.ts Integration (diff-style)

```typescript
// ADD import:
import { ALL_FACTION_SUITS } from './faction-suits';

// ADD to ALL_ITEMS:
export const ALL_ITEMS: readonly ItemDefinition[] = [
  ...ALL_SUITS,
  ...ALL_MODULES,
  ...ALL_TOOLS,
  ...ALL_CONSUMABLES,
  ...ALL_WORLD_ITEMS,
  ...ALL_REAGENTS,
  ...ALL_AQUATIC_SUITS,
  ...ALL_AQUATIC_TOOLS,
  ...ALL_AQUATIC_CONSUMABLES,
  ...ALL_EXOTIC_SUITS,
  ...ALL_EXOTIC_TOOLS,
  ...ALL_EXOTIC_CONSUMABLES,
  ...ALL_FACTION_SUITS,  // Phase 112 faction suits
];

// ADD to ITEM_IDS (28 entries):
SUIT_VERDANT_BIOWEAVE_COMMON: 'suit_verdant_bioweave_common',
// ... all 28 ...

// ADD re-export at bottom:
export * from './faction-suits';
```

---

## Validation Architecture

> `nyquist_validation` is `false` in `.planning/config.json` — this section is skipped.

---

## Open Questions

1. **Off-archetype Epic/Legendary ability sets not fully specified in FACTION-IDENTITY.md**
   - What we know: The doc specifies the ability *pool* for each off-archetype (combat pool, recon pool, assault pool, hazmat pool) but not the exact per-tier progression for off-archetype suits
   - What's unclear: For example, does Verdant Security Division Epic grant 3 combat-flavored abilities? Which 3?
   - Recommendation: Use Claude's discretion (it is explicitly in scope per CONTEXT.md). Abilities should be drawn from the off-archetype faction's aligned ability pool and should match the off-archetype archetype's stat focus. Pattern: Epic=3 abilities, Legendary=5 abilities, using cumulative unlocks same as main ladder.

2. **Stat budget ceiling concern (logged in STATE.md)**
   - What we know: STATE.md flags that `generateSuitStats('tank', 'legendary', 5)` yields ~2,464 total stats; TTK ceiling not verified against game-logic combat constants
   - What's unclear: Whether this breaks PvE balance
   - Recommendation: This is out of scope for Phase 112 (requirements say to use `generateSuitStats()` universally). Implement as specified; flag in SUMMARY.md that a future TTK audit is recommended.

---

## Sources

### Primary (HIGH confidence)

- Direct file read: `packages/items/FACTION-IDENTITY.md` — faction archetypes, abilities, naming, colors, tier progression table
- Direct file read: `packages/items/src/utils.ts` — `generateSuitStats()` signature, all 8 archetypes, budget math
- Direct file read: `packages/items/src/definitions/suits.ts` — 22 existing suits as pattern reference
- Direct file read: `packages/items/src/definitions/index.ts` — integration pattern for new definition files
- Direct file read: `packages/items/src/types.ts` — `ItemDefinition` interface (all required fields)
- Direct file read: `packages/items/src/__tests__/item-validation.test.ts` — test expectations new suits must satisfy
- Direct file read: `packages/items/src/definitions/aquatic-suits.ts` — canonical template for new definition files
- Test run: `pnpm --filter items test` — 17 tests pass in 141ms (baseline green)
- Computed: stat budget table (node -e inline calculation, verified against utils.ts math)

### Secondary (MEDIUM confidence)

None needed — all critical information sourced directly from codebase.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified by reading source files and running tests
- Architecture patterns: HIGH — directly derived from existing working code patterns
- Pitfalls: HIGH — derived from code inspection and explicit project constraints
- Stat budgets: HIGH — computed from source code math, not estimated

**Research date:** 2026-03-03
**Valid until:** 2026-04-03 (stable data — no fast-moving dependencies)
