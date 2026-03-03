# Phase 113: Faction Modules and Tools - Research

**Researched:** 2026-03-03
**Domain:** Item definition authoring — faction modules and tools in packages/items
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Module Identity**
- 2 module lines per faction with distinct roles that complement (not duplicate) suit archetypes
- Modules provide stat bonuses only — no granted abilities. Abilities remain the suit's domain
- Equal stat budget to generic modules of the same rarity — different distribution, not more power
- Module roles should complement the suit, not mirror it (e.g., Verdant hazmat suit + perception-focused bio-sensor module = well-rounded character)

**Tool Types & Faction Flavor**
- 2 tool lines per faction matching the toolType values from success criteria:
  - Verdant: bio + research
  - Helix: mining + demolition
  - Nexus: research + stealth
  - Unaffiliated: scrapper identity (own distinct aesthetic, not generic multi-tools)
- Tools provide utility bonuses plus 1 faction ability at higher rarities (mix of utility + ability)
- Unaffiliated tools have their own scrapper identity — salvage tools, improvised scanners, not copies of faction tools
- No faction restriction on equipping — any player can use any faction's modules and tools

**Rarity & Tier Coverage**
- Full Common through Legendary range (5 rarities) for all module and tool lines
- Level requirements match suit tier mapping: Common=L1, Rare=L11, Epic=L21, Exotic=L31, Legendary=L41
- Existing generic modules and tools kept as non-faction alternatives

**Naming & Description Style**
- Same escalating name pattern as suits: humble Common → grand Legendary
- Legendary modules and tools get proper named-item treatment (like suits)
- Consistent faction voice: Verdant=scientific, Helix=industrial, Nexus=techy, Unaffiliated=practical
- Same color system as suits: primary faction color for main line, accent color for secondary line
- Uses faction word banks from FACTION-IDENTITY.md

### Claude's Discretion

- Specific module role assignments per faction (what stat emphasis each of the 2 module lines provides)
- Which faction ability each tool grants at higher rarities
- Exact item weight and base value numbers (following faction-flavored value pattern from Phase 112: Helix +10%, Unaffiliated -10%)
- Specific word choices from faction word banks for module and tool names
- Off-archetype ability selections for tools

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

## Summary

Phase 113 adds faction-flavored modules and tools to complete the three-slot gear identity established by Phase 112's faction suits. The implementation domain is pure item authoring within `packages/items/src/definitions/` — no engine changes, no new systems, no schema modifications. The pattern is already well-established by the generic modules/tools and the faction suits from Phase 112.

The work breaks into two new definition files: `faction-modules.ts` and `faction-tools.ts`, each exporting an `ALL_FACTION_MODULES` and `ALL_FACTION_TOOLS` array respectively. These files are then wired into `definitions/index.ts` by adding their arrays to `ALL_ITEMS` and their ID constants to `ITEM_IDS`. The validation test file imports `ALL_MODULES` and `ALL_TOOLS` (not faction-specific arrays), so faction items must either join those generic arrays or the test must be updated to include the new faction arrays — the cleanest approach is the latter, mimicking how `ALL_FACTION_SUITS` is handled separately.

The entire content scope is: 4 factions × 2 module lines × 5 rarities = 40 modules, plus 4 factions × 2 tool lines × 5 rarities = 40 tools. Total: 80 new item definitions across two files.

**Primary recommendation:** Create two new definition files following the exact faction-suits.ts pattern. Use `getModuleStats()` for all module stats and `getToolStats()` for all tool stats — no hand-coded stat values. Wire into `ALL_ITEMS` and `ITEM_IDS` in `definitions/index.ts`.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MODU-01 | Verdant Dynamics modules across rarity tiers with bio/life-support focus | FACTION-IDENTITY.md Section 5: Verdant primary=life_support, secondary=sensor. `getModuleStats('life_support', ...)` and `getModuleStats('sensor', ...)` already exist in modules.ts |
| MODU-02 | Helix Extraction modules across rarity tiers with armor/power-core focus | FACTION-IDENTITY.md Section 5: Helix primary=armor, secondary=power_core. `getModuleStats('armor', ...)` and `getModuleStats('power_core', ...)` already exist |
| MODU-03 | Nexus Frontiers modules across rarity tiers with sensor/speed focus | FACTION-IDENTITY.md Section 5: Nexus primary=sensor, secondary=speed. `getModuleStats('sensor', ...)` and `getModuleStats('speed', ...)` already exist |
| MODU-04 | Unaffiliated salvaged modules across rarity tiers with jury-rigged focus | FACTION-IDENTITY.md Section 5: Unaffiliated varied (power_core from salvaged Helix + life_support from salvaged Verdant). Both `getModuleStats` types exist |
| TOOL-01 | Verdant Dynamics tools with bio/research specialization | FACTION-IDENTITY.md Section 5 + toolType='bio' and toolType='research' both exist in types.ts. `getToolStats('bio',...)` and `getToolStats('research',...)` implemented in tools.ts |
| TOOL-02 | Helix Extraction tools with mining/combat specialization | CONTEXT.md specifies mining+demolition. `getToolStats('mining',...)` and `getToolStats('demolition',...)` implemented. Ability grants: mine, thermal_lance, plasma_burst per FACTION-IDENTITY.md |
| TOOL-03 | Nexus Frontiers tools with recon/anomaly specialization | CONTEXT.md specifies research+stealth. `getToolStats('research',...)` and `getToolStats('stealth',...)` implemented. Ability grants: resource_scan, analyze_specimen, overclock per FACTION-IDENTITY.md |
| TOOL-04 | Unaffiliated salvaged tools with multi-purpose specialization | CONTEXT.md specifies scrapper identity — not generic multi-tools. `getToolStats('universal',...)` or appropriate mix. FACTION-IDENTITY.md Section 5 shows universal+combat for Unaffiliated |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript (items package) | project version | Item definition authoring | All item files use TypeScript with strict typing |
| vitest | 4.0.18 | Test runner | Already configured in `packages/items/vitest.config.ts` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `computeIlvl` | local util | Compute item level from tier+rarity | Every item definition needs `ilvl` |
| `getModuleStats()` | local (modules.ts) | Generates stats effect object for module | Every faction module's effects array |
| `getToolStats()` | local (tools.ts) | Generates stats effect object for tool | Every faction tool's effects array |
| `STAT_RARITY_MULTIPLIERS` | local (utils.ts) | Used inside getModuleStats/getToolStats | Already used; no direct usage needed |
| `TIER_MULTIPLIERS` | local (utils.ts) | Used inside getModuleStats/getToolStats | Already used; no direct usage needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Separate `faction-modules.ts` + `faction-tools.ts` | Adding to existing `modules.ts` / `tools.ts` | Separate files mirror the faction-suits.ts precedent, keep faction content isolated, easier to review |
| `getModuleStats()` call | Hand-coded stats | Hand-coded stats fail CONT-03/CONT-05 validation tests and violate SUIT-05 precedent |

**Installation:** No new packages required. All utilities are already in place.

---

## Architecture Patterns

### Recommended Project Structure

```
packages/items/src/definitions/
├── faction-suits.ts          # Phase 112 — existing
├── faction-modules.ts        # Phase 113 — NEW (40 items)
├── faction-tools.ts          # Phase 113 — NEW (40 items)
└── index.ts                  # Updated: import + export new arrays, add ITEM_IDS
```

### Pattern 1: Faction Module Definition (mirrors faction-suits.ts)

**What:** Each faction module uses `getModuleStats()` for its stat effect, plus the faction-appropriate legacy effect (armor value, sensor range, etc.) from the generic module counterpart.

**When to use:** All 40 faction modules.

**Example (based on existing patterns in modules.ts and faction-suits.ts):**
```typescript
// Source: packages/items/src/definitions/modules.ts (getModuleStats pattern)
// Source: packages/items/src/definitions/faction-suits.ts (naming/structure pattern)

export const MODULE_VERDANT_BIOSENSOR_COMMON: ItemDefinition = {
  id: 'module_verdant_biosensor_common',
  displayName: 'Biosensor Array Mk.I',
  description: 'Standard Verdant field sensor unit tuned to Terminus biological signatures. Issued to all new Verdant research personnel.',
  category: 'module',
  rarity: 'common',
  maxStack: 1,
  weight: 0.6,
  baseValue: 200,
  requiredLevel: 1,
  ilvl: computeIlvl(1, 'common'),
  textureKey: 'item_module_sensor',   // reuse existing texture keys
  color: 0x235f2f,                    // Verdant primary darkened for common
  equipSlot: 'module',
  effects: [
    { trigger: 'on_equip', effect: { type: 'sensor', detectionRange: 15 } },
    { trigger: 'on_equip', effect: getModuleStats('sensor', 'common', 1) },
  ],
};
```

**Key constraint:** No `grantedAbilities` on modules — abilities are the suit's domain per locked decision.

### Pattern 2: Faction Tool Definition

**What:** Each faction tool uses `getToolStats()` for its stat effect. Tools also have `toolType`, `range`, and `grantedAbilities`. Abilities are faction-aligned per FACTION-IDENTITY.md Section 5.

**When to use:** All 40 faction tools.

**Example (based on existing TOOL_BIO_PROBE_RARE precedent in tools.ts):**
```typescript
// Source: packages/items/src/definitions/tools.ts (TOOL_BIO_PROBE_RARE, TOOL_DEMOLITION_EPIC patterns)

export const TOOL_VERDANT_BIOPROBE_COMMON: ItemDefinition = {
  id: 'tool_verdant_bioprobe_common',
  displayName: 'Verdant Field Bioprobe',
  description: 'Basic Verdant bio-interface tool for specimen interaction and environmental sampling. Issued to all incoming research personnel.',
  category: 'tool',
  rarity: 'common',
  maxStack: 1,
  weight: 1.5,
  baseValue: 300,
  requiredLevel: 1,
  ilvl: computeIlvl(1, 'common'),
  textureKey: 'item_tool_research',
  color: 0x235f2f,
  equipSlot: 'tool',
  toolType: 'bio',
  effects: [
    { trigger: 'on_equip', effect: getToolStats('bio', 'common', 1) },
  ],
  range: 1,
  grantedAbilities: ['harvest', 'energy_pulse'],
};
```

**Ability count per rarity for tools (inferred from suit pattern and existing tool precedents):**
- Common: 1-2 abilities (basic utility)
- Rare: 2-3 abilities
- Epic: 3-4 abilities
- Exotic: 4-5 abilities
- Legendary: 5-6 abilities (named item treatment)

### Pattern 3: Index Registration

**What:** Two new arrays `ALL_FACTION_MODULES` and `ALL_FACTION_TOOLS` exported from their files; added to `ALL_ITEMS` in `definitions/index.ts`; ITEM_IDS constants added for all 80 new items.

**When to use:** After both files are complete.

```typescript
// In definitions/index.ts additions:
import { ALL_FACTION_MODULES } from './faction-modules';
import { ALL_FACTION_TOOLS } from './faction-tools';

export const ALL_ITEMS: readonly ItemDefinition[] = [
  // ... existing arrays ...
  ...ALL_FACTION_SUITS,    // Phase 112
  ...ALL_FACTION_MODULES,  // Phase 113
  ...ALL_FACTION_TOOLS,    // Phase 113
];
```

### Pattern 4: Validation Test Update

**What:** The existing `item-validation.test.ts` imports `ALL_MODULES` and `ALL_TOOLS` (generic arrays). Faction items must be included in these imports OR the test must import the new faction arrays alongside.

**Recommended approach:** Import `ALL_FACTION_MODULES` and `ALL_FACTION_TOOLS` in the test file and spread them into the validated sets. This mirrors how `ALL_FACTION_SUITS` is a separate array that could be tested.

```typescript
// In item-validation.test.ts additions:
import { ALL_FACTION_MODULES } from '../definitions/faction-modules';
import { ALL_FACTION_TOOLS } from '../definitions/faction-tools';
// Then use [...ALL_MODULES, ...ALL_FACTION_MODULES] for module tests
// And [...ALL_TOOLS, ...ALL_FACTION_TOOLS] for tool tests
```

**Alternative approach:** Check what tests use. CONT-03 checks `ALL_MODULES` and `ALL_TOOLS` directly. Adding faction items to those generic arrays would break test intent (they are generic non-faction items). The test extension pattern is cleaner.

### Anti-Patterns to Avoid

- **Hand-coded stats:** Never write `{ type: 'stats', perception: 21 }` directly. Always call `getModuleStats()` or `getToolStats()`. The test suite will catch this, but the principle must be applied from the start.
- **Granted abilities on modules:** Modules must have `effects` only — no `grantedAbilities` field. This is a locked decision.
- **Wrong tier for requiredLevel:** The tier passed to `getModuleStats/getToolStats` must match the level bracket. Common=L1→tier 1, Rare=L11→tier 2, Epic=L21→tier 3, Exotic=L31→tier 4, Legendary=L41→tier 5.
- **Missing legacy effect on modules:** Generic modules carry both a legacy effect (e.g., `{ type: 'sensor', detectionRange: 15 }`) and a stats effect. Faction modules should follow the same pattern to remain mechanically consistent.
- **toolType mismatch with getToolStats:** The `toolType` field in the item definition must match what is passed to `getToolStats()` — the function distributes stats based on toolType.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Module stat generation | Custom stat objects per item | `getModuleStats(moduleType, rarity, tier)` | Existing function handles rarity/tier scaling correctly; hand-rolled will fail CONT-05 |
| Tool stat generation | Custom stat objects per item | `getToolStats(toolType, rarity, tier)` | Existing function includes gathering stats for bio/mining; hand-rolled misses edge cases |
| Item level computation | Manual ilvl math | `computeIlvl(tier, rarity)` | Formula is `tier * 10 * RARITY_MULTIPLIERS[rarity]` — already encapsulated |
| Faction color derivation | Guessing hex values | Section 4 of FACTION-IDENTITY.md | Color palette anchors and scaling rules are fully specified; follow the table |

**Key insight:** The `getModuleStats` and `getToolStats` functions are the single source of correct stat generation. They exist precisely to prevent the custom-solution trap.

---

## Common Pitfalls

### Pitfall 1: Module Stat Type Mismatch With Validation Tests

**What goes wrong:** CONT-05 validates modules by checking `m.id.includes('armor')`, `m.id.includes('speed')`, etc. Faction modules have IDs like `module_verdant_biosensor_common` — they contain faction names, not type names. The test will not check them unless explicitly included.

**Why it happens:** The test was written before faction modules existed. It uses string matching on `id`.

**How to avoid:** The test file must be updated to import `ALL_FACTION_MODULES` and validate them. For faction modules, the stat validation assertions need to be type-aware (check by `moduleType` field if it existed — but modules don't have `moduleType`). Instead, validate that all faction modules have a stats effect (CONT-03 style) and that the stats come from the correct `getModuleStats` call.

**Warning signs:** Tests pass without including faction modules in the test sweep, leaving them unvalidated.

### Pitfall 2: Unaffiliated Module/Tool Identity Confusion

**What goes wrong:** Unaffiliated tools described as "copies of faction tools with different colors" rather than the scrapper aesthetic. The CONTEXT.md is explicit: scrapper identity, salvage tools, improvised scanners — not generic multi-tools or faction clones.

**Why it happens:** The path of least resistance is to copy a faction pattern. But the Unaffiliated aesthetic requires visible improvisation in descriptions and names.

**How to avoid:** Unaffiliated modules use `power_core` (salvaged Helix) and `life_support` (salvaged Verdant) module types per FACTION-IDENTITY.md, but named with scrapper word bank: cobbled, salvage, makeshift, jury-rig, tinkered, etc. Tools should feel resourceful — a cobbled scanner that scans minerals AND specimens because "why buy two tools."

### Pitfall 3: Wrong Color Scaling Direction

**What goes wrong:** Common = brightest color, Legendary = darkest color (reversed).

**Why it happens:** Intuition might suggest "more powerful = more vivid," but reading the direction of "Base - 15%" for common vs "Base + 30%" for legendary confirms legendary is brighter.

**How to avoid:** FACTION-IDENTITY.md Section 4 color scaling table: Common = Base - 15% (muted), Legendary = Base + 30% (most vivid). For Verdant, common modules use ~0x1a4a22 (darker than 0x2a7a3a), legendary uses ~0x3aaa55.

### Pitfall 4: Tier/Level Mapping Error

**What goes wrong:** Using tier 1 with `requiredLevel: 11` or tier 2 with `requiredLevel: 1`.

**Why it happens:** The 5-rarity ladder (Common/Rare/Epic/Exotic/Legendary) maps to tiers 1–5, but the locked decision says Common=L1, Rare=L11, Epic=L21, Exotic=L31, Legendary=L41. This is NOT the generic progression (which uses multiple tiers per rarity for the intermediate scaling items in modules.ts).

**How to avoid:** The faction items use EXACTLY 5 items per line (one per rarity), each at the START of its tier:
- Common → `requiredLevel: 1`, tier 1
- Rare → `requiredLevel: 11`, tier 2
- Epic → `requiredLevel: 21`, tier 3
- Exotic → `requiredLevel: 31`, tier 4
- Legendary → `requiredLevel: 41`, tier 5

### Pitfall 5: Missing Item Count Update in Index Comment

**What goes wrong:** The comment at the top of `definitions/index.ts` says "Total: 150 items" — it needs updating when new items are added.

**Why it happens:** Easy to forget cosmetic comment updates.

**How to avoid:** Update the comment in `definitions/index.ts` to reflect 150 + 40 + 40 = 230 items.

---

## Code Examples

Verified patterns from official sources (the codebase itself — all HIGH confidence):

### Module Definition (full example)

```typescript
// Source: packages/items/src/definitions/modules.ts (existing pattern) +
//         packages/items/src/definitions/faction-suits.ts (faction naming)

import type { ItemDefinition, ItemRarity } from '../types';
import { computeIlvl, STAT_RARITY_MULTIPLIERS, TIER_MULTIPLIERS } from '../utils';

// Re-use getModuleStats from modules.ts or replicate the private function:
function getModuleStats(moduleType: string, rarity: ItemRarity, tier: 1 | 2 | 3 | 4 | 5) {
  // ... (copy the existing function or import if exported)
}

export const MODULE_VERDANT_BIOSENSOR_LEGENDARY: ItemDefinition = {
  id: 'module_verdant_bloom_sensor_legendary',
  displayName: 'The Terminus Bloom Network',
  description:
    'Verdant\'s final word in ecological sensing. The Bloom Network does not scan for specimens — it communes with them. Field researchers who have used it describe knowing a biome\'s state before entering it. Verdant\'s board declined to investigate how.',
  category: 'module',
  rarity: 'legendary',
  maxStack: 1,
  weight: 0.3,
  baseValue: 50000,
  requiredLevel: 41,
  ilvl: computeIlvl(5, 'legendary'),
  textureKey: 'item_module_sensor',
  color: 0x3aaa55,   // Verdant Base + 30%
  equipSlot: 'module',
  effects: [
    { trigger: 'on_equip', effect: { type: 'sensor', detectionRange: 88 } },
    { trigger: 'on_equip', effect: getModuleStats('sensor', 'legendary', 5) },
  ],
  // No grantedAbilities — modules never grant abilities (locked decision)
};
```

### Tool Definition (full example with ability escalation)

```typescript
// Source: packages/items/src/definitions/tools.ts (TOOL_BIO_PROBE_RARE pattern +
//         FACTION-IDENTITY.md Section 5 ability grants)

export const TOOL_VERDANT_BIOPROBE_RARE: ItemDefinition = {
  id: 'tool_verdant_enzyme_probe_rare',
  displayName: 'Chloro-Enzyme Probe',
  description:
    'A Verdant research instrument for extracting and cataloging biological specimens. The enzyme tip preserves sample viability during extraction — critical for living-organism research requirements.',
  category: 'tool',
  rarity: 'rare',
  maxStack: 1,
  weight: 1.5,
  baseValue: 1320,   // standard value * 1.1 (no Verdant premium, this is base)
  requiredLevel: 11,
  ilvl: computeIlvl(2, 'rare'),
  textureKey: 'item_tool_research',
  color: 0x2a7a3a,   // Verdant Base (standard for rare)
  equipSlot: 'tool',
  toolType: 'bio',
  effects: [
    { trigger: 'on_equip', effect: getToolStats('bio', 'rare', 2) },
  ],
  range: 2,
  grantedAbilities: ['harvest', 'analyze_specimen', 'energy_pulse'],
};
```

### Index Integration

```typescript
// In packages/items/src/definitions/index.ts:
import { ALL_FACTION_MODULES } from './faction-modules';
import { ALL_FACTION_TOOLS } from './faction-tools';

export const ALL_ITEMS: readonly ItemDefinition[] = [
  // ... existing ...
  ...ALL_FACTION_SUITS,    // Phase 112 — 28 items
  ...ALL_FACTION_MODULES,  // Phase 113 — 40 items
  ...ALL_FACTION_TOOLS,    // Phase 113 — 40 items
];
```

### ITEM_IDS pattern for new faction items

```typescript
// Pattern from existing Phase 112 entries in ITEM_IDS:
// SUIT_VERDANT_BIOWEAVE_COMMON: 'suit_verdant_bioweave_common',

// New Phase 113 entries follow same pattern:
// ---- FACTION MODULES: VERDANT (Phase 113) ----
MODULE_VERDANT_BIOSENSOR_COMMON: 'module_verdant_biosensor_common',
MODULE_VERDANT_BIOSENSOR_RARE: 'module_verdant_biosensor_rare',
// ... etc
```

---

## Design Recommendations (Claude's Discretion)

### Module Role Assignments Per Faction

Following the complement-not-mirror principle from CONTEXT.md:

| Faction | Main Suit Archetype | Module Line 1 | Module Line 2 | Reasoning |
|---------|--------------------|-----------|-----------|-|
| Verdant | hazmat (resilience/recovery) | sensor (perception) | life_support (resilience+recovery) | Sensor fills perception gap in hazmat suit; life_support deepens environmental identity |
| Helix | tank/assault (durability/toughness) | armor (toughness) | power_core (vigor+recovery) | Armor doubles down on toughness for tank builds; power_core adds stamina/energy that assault builds lack |
| Nexus | recon (perception/haste) | sensor (perception) | speed (haste) | Sensor deepens perception lead; speed amplifies haste advantage for max-awareness builds |
| Unaffiliated | scavenger (vigor/recovery/perception) | power_core (salvaged Helix, vigor+recovery) | life_support (salvaged Verdant, resilience+recovery) | Mixed-origin aesthetic; fills both energy and environmental gaps |

This matches FACTION-IDENTITY.md Section 5 exactly.

### Tool Ability Grant Progression

From FACTION-IDENTITY.md Section 5 ability grants per faction:

**Verdant bio tools:** `harvest` → `energy_pulse` → `analyze_specimen` → `nano_repair` → `regeneration_protocol`

**Verdant research tools:** `energy_pulse` → `resource_scan` → `analyze_specimen` → `overclock` → `fortify_systems`

**Helix mining tools:** `mine` → `basic_strike` → `thermal_lance` → `plasma_burst` → `overload_pulse`

**Helix demolition tools:** `basic_strike` → `concussive_strike` → `overload_pulse` → `power_surge` → `magnetic_field`

**Nexus research tools:** `energy_pulse` → `resource_scan` → `analyze_specimen` → `overclock` → `precision_shot`

**Nexus stealth tools:** `precision_shot` → `resource_scan` → `overclock` → `void_drain` → `electrocute`

**Unaffiliated (scrapper) tools — Line 1 (salvage scanner):** `energy_pulse` → `resource_scan` → `analyze_specimen` → `overclock` → `void_drain` (jack-of-all-trades research/scan)

**Unaffiliated (scrapper) tools — Line 2 (improvised extractor):** `harvest` → `mine` → `basic_strike` → `overload_pulse` → `power_surge` (does a bit of everything)

### Value Modifier by Faction

Following Phase 112 suit pattern:
- Verdant: base value (no modifier)
- Helix: base value × 1.1 (+10% industrial premium)
- Nexus: base value (no modifier, tech is standard-priced)
- Unaffiliated: base value × 0.9 (-10% salvaged goods discount)

Base values to use (same as generic equivalents of same rarity/tier):
- Module Common: 200, Rare: 800, Epic: 3000, Exotic: 12000, Legendary: 50000
- Tool Common: 300, Rare: 1200, Epic: 5000, Exotic: 20000, Legendary: 80000

### Naming Approach

Use faction word banks from FACTION-IDENTITY.md Section 3:

**Verdant modules:** biosensor, symbiont sensor, chloro-filter, bloom network, spore analyzer
**Verdant tools:** enzyme probe, tendril scanner, phyto-extractor, synthesis probe, canopy interpreter

**Helix modules:** slag armor, crucible plating, foundry core, ingot power cell, furnace battery
**Helix tools:** bore drill, quarry cutter, slag breaker, anvil disruptor, furnace auger

**Nexus modules:** cipher sensor, lattice array, echo relay, signal detector, grid mapper
**Nexus tools:** signal probe, vector scanner, phantom infiltrator, trace harvester, echo extractor

**Unaffiliated modules:** cobbled cell, salvage core, makeshift filter, jury-rig support, tinkered battery
**Unaffiliated tools:** scrap scanner, cobbled extractor, salvage probe, jury-rig cutter, improvised analyzer

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hand-coded stat values per item | `getModuleStats()` / `getToolStats()` / `generateSuitStats()` | Phase 63 | No manual stat math; test suite enforces compliance |
| Single definition file for all items | Category-specific definition files | Phase 87 onwards | Faction items get their own file (faction-suits.ts precedent from Phase 112) |
| `stat_buff` effect type | `stats` effect type | Phase 60 | ESLint rule `no-legacy-stat-buff` enforces this |

**Deprecated/outdated:**
- `stat_buff` effect: replaced by `stats` effect type. ESLint rule `custom-rules/no-legacy-stat-buff` will flag any use of the old pattern.

---

## Open Questions

1. **Should `getModuleStats` and `getToolStats` be exported from their files?**
   - What we know: Both functions are currently `function` declarations (not exported) in `modules.ts` and `tools.ts`
   - What's unclear: The new faction files need to call these functions. Options: (a) copy-paste the functions, (b) extract to `utils.ts` and export, (c) move faction definitions into the same files as the generic ones
   - Recommendation: Extract both stat-generation functions to `utils.ts` and export them. This keeps faction files clean and avoids duplication. Alternatively, define them inline in the faction files — they are small (< 20 lines each).

2. **Validation test coverage for faction modules/tools**
   - What we know: `item-validation.test.ts` currently only validates `ALL_MODULES` and `ALL_TOOLS` (generic arrays). Faction modules/tools will NOT be validated unless the test is explicitly updated.
   - What's unclear: The test's CONT-05 module checks use `m.id.includes('armor')` pattern — this won't match faction module IDs.
   - Recommendation: Add a new describe block `'CONT-06: Faction modules and tools have valid stats'` that imports `ALL_FACTION_MODULES` and `ALL_FACTION_TOOLS` and validates: (a) all have stats effects, (b) stat totals are within expected budget for rarity/tier. This is the cleanest extension and doesn't break existing tests.

3. **textureKey values for faction items**
   - What we know: Faction suits use textureKeys like `item_suit_verdant_common` that don't exist as sprites yet (color fallback is used per CLAUDE.md)
   - What's unclear: Should faction modules/tools get unique textureKeys or reuse generic ones (`item_module_sensor`, `item_tool_research`)?
   - Recommendation: Reuse existing generic textureKeys. The `color` field provides visual faction differentiation. Creating new textureKeys for items that won't have sprites yet adds unnecessary complexity and inconsistency.

---

## Validation Architecture

`nyquist_validation` is `false` in `.planning/config.json` — skipping formal Validation Architecture section.

**Test command:** `cd packages/items && npx vitest run`
**Current state:** 17 tests passing before this phase.
**Expected after Phase 113:** 17+ tests (new faction validation tests added per Open Question 2 recommendation).

---

## Sources

### Primary (HIGH confidence)
- `packages/items/src/definitions/faction-suits.ts` — exact template for faction definition files; 28 suits, all patterns verified by running tests
- `packages/items/src/definitions/modules.ts` — `getModuleStats()` function implementation and all 5 module type patterns
- `packages/items/src/definitions/tools.ts` — `getToolStats()` function implementation and all tool type patterns
- `packages/items/FACTION-IDENTITY.md` — locked source of truth for faction identities, module/tool assignments, ability grants, word banks, color palette
- `packages/items/src/utils.ts` — `computeIlvl`, `STAT_RARITY_MULTIPLIERS`, `TIER_MULTIPLIERS`, `ARCHETYPE_PROFILES`
- `packages/items/src/types.ts` — `ItemDefinition`, `ToolType`, all type constraints
- `packages/items/src/__tests__/item-validation.test.ts` — 17 tests currently passing; all new items must continue passing CONT-03, CONT-04, CONT-05
- `packages/items/src/definitions/index.ts` — integration point for `ALL_ITEMS` and `ITEM_IDS`
- `.planning/phases/113-faction-modules-and-tools/113-CONTEXT.md` — locked user decisions for this phase

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` — confirms Phase 112 complete with 150 items in registry, 17/17 tests passing
- `.planning/REQUIREMENTS.md` — MODU-01/02/03/04, TOOL-01/02/03/04 requirement descriptions confirmed

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all patterns verified directly from working codebase
- Architecture: HIGH — direct extension of Phase 112 pattern; no new patterns invented
- Pitfalls: HIGH — identified from code inspection and test analysis, not speculation
- Design recommendations (discretion areas): MEDIUM — based on FACTION-IDENTITY.md guidance + faction suit precedent, but exact naming/values are Claude's call

**Research date:** 2026-03-03
**Valid until:** Stable codebase — no external dependencies. Valid as long as `packages/items` structure doesn't change.
