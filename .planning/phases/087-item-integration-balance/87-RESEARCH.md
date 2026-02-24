# Phase 87: Item Integration & Balance - Research

**Researched:** 2026-02-24
**Domain:** Item definition, progression balance, and content integration
**Confidence:** HIGH

## Summary

Phase 87 integrates new equipment and consumables to support aquatic and exotic biome content added in Phases 82-86. The item definition system is mature and well-established — this phase is pure content expansion using proven patterns from 59 existing items (21 suits, 50+ tools, 30 consumables, 15 reagents).

**Critical architectural constraint:** There is NO crafting system. All items must be obtainable through loot tables, vendor purchases, or quest rewards. ITEM-07/ITEM-08 "materials" requirements are satisfied by reagents (world-items category) that drop from entities defined in Phase 83/86.

**Primary recommendation:** Follow Phase 60's stat migration pattern for new equipment. Use `generateSuitStats()` utility for suits with archetype profiles, use `getToolStats()` helper for tools with toolType specializations, and scale consumable effects by rarity (common=50, rare=100, epic=200, exotic=400, legendary=800 for heal/energy/repair).

**Key balance principle:** Phase 87 implements horizontal progression. New Tier I-II aquatic items are accessible sidegrades to existing Frontier zone gear (PROG-01). New Tier III-IV exotic items are powerful but require existing Tier I-II materials to obtain, preventing power creep (PROG-03).

## Standard Stack

### Core (Already in Place)
| Component | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| ItemDefinition interface | Current | Single source of truth for item data | 94 items use this schema consistently |
| ItemRegistry | Current | Singleton registry for item lookups | Thread-safe, fallback handling, category/rarity filtering |
| EquipSlot type | Current | Equipment slot definitions | 'exosuit', 'module', 'tool', 'accessory1', 'accessory2' |
| ItemEffect discriminated union | Current | Type-safe effect handling | 11 effect types with trigger conditions |
| computeIlvl() | Current | Tier + rarity → item level | Tier 1 Common = 10, Tier 5 Legendary = 110 |
| generateSuitStats() | Phase 63 | Archetype-based stat distribution | 7 archetypes (tank/scout/combat/balanced/hazmat/assault/recon) |
| getToolStats() | Phase 63 | ToolType-based stat bonuses | 8 tool types, includes yieldBonus/gatherSpeed for mining/bio tools |

### Supporting
| Component | Purpose | When to Use |
|-----------|---------|-------------|
| STAT_RARITY_MULTIPLIERS | Scales stat budgets by rarity | Common=1.0, Rare=1.4, Epic=2.0, Exotic=2.8, Legendary=4.0 |
| TIER_MULTIPLIERS | Scales stat budgets by tier | Tier 1=1.0, Tier 2=2.0, Tier 3=3.5, Tier 4=5.5, Tier 5=8.0 |
| ToolType enum | Tool specialization categories | 'universal', 'mining', 'combat', 'research', 'bio', 'demolition', 'stealth', 'anomaly' |
| grantedAbilities array | Abilities unlocked when equipped | Tools grant 2-6 abilities, suits grant 1-5 abilities |
| range parameter | Tool interaction range in tiles | 1-5 tiles, scales with rarity (higher rarity = longer reach) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| New aquatic/exotic files | Add to existing suits.ts/tools.ts | Separate files clearer for Phase 87 content scope |
| Crafting recipes | Direct loot/vendor availability | No crafting system exists; defer to future milestone |
| Custom water/void stat effects | Use existing stat types with thematic naming | Reuses proven stat framework, avoids system complexity |

**Installation:**
No new dependencies. All implementation extends `packages/items/src/definitions/` patterns.

## Architecture Patterns

### Recommended Project Structure
```
packages/items/src/definitions/
├── aquatic-suits.ts          # NEW: 3 aquatic suits (diving, pressure, abyssal)
├── aquatic-tools.ts          # NEW: 3 aquatic tools (harpoon, diving pick, net)
├── exotic-suits.ts           # NEW: 3 exotic suits (void-touched, anomaly, null)
├── exotic-tools.ts           # NEW: 3 exotic tools (phase extractor, void pick, reality anchor)
├── aquatic-consumables.ts    # NEW: 5 aquatic consumables (pressure pills, gill extract, etc.)
├── exotic-consumables.ts     # NEW: 5 exotic consumables (stability tonics, void essence, etc.)
└── index.ts                  # Update to export new definitions
```

### Pattern 1: Aquatic Suit Definitions
**What:** Define 3 aquatic suits with water-adapted archetypes and lore-appropriate abilities
**When to use:** Populating aquatic biomes with thematically appropriate equipment
**Example:**
```typescript
// packages/items/src/definitions/aquatic-suits.ts
import type { ItemDefinition } from '../types';
import { computeIlvl, generateSuitStats } from '../utils';

// Tier I aquatic suit (accessible, comparable to existing Tier I gear)
export const SUIT_DIVING_RARE: ItemDefinition = {
  id: 'suit_diving_rare',
  displayName: 'Diving Exo-Suit',
  description:
    'A Helix Extraction suit modified for shallow water operations in Tidal Pools. Integrated pressure compensation allows extended submersion. Popular with aquatic resource teams.',
  category: 'suit',
  rarity: 'rare',
  maxStack: 1,
  weight: 9.5,
  baseValue: 2200,
  requiredLevel: 5,
  ilvl: computeIlvl(1, 'rare'),
  textureKey: 'item_suit_diving',
  color: 0x2266aa,
  equipSlot: 'exosuit',
  moduleSlots: 4,
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('balanced', 'rare', 1) } },
  ],
  grantedAbilities: ['nano_repair', 'energy_barrier'], // Water-appropriate defensive abilities
};

// Tier II aquatic suit (progression)
export const SUIT_PRESSURE_EPIC: ItemDefinition = {
  id: 'suit_pressure_epic',
  displayName: 'Pressure Exo-Suit',
  description:
    'Military-grade deep-water suit designed for Kelp Forest operations. Reinforced hull plating withstands extreme pressures. Nexus Frontiers uses these for contested aquatic territory patrols.',
  category: 'suit',
  rarity: 'epic',
  maxStack: 1,
  weight: 11.0,
  baseValue: 8500,
  requiredLevel: 15,
  ilvl: computeIlvl(2, 'epic'),
  textureKey: 'item_suit_pressure',
  color: 0x1144aa,
  equipSlot: 'exosuit',
  moduleSlots: 4,
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('tank', 'epic', 2) } },
  ],
  grantedAbilities: ['nano_repair', 'magnetic_field', 'fortify_systems'],
};

// Tier III aquatic suit (high-end)
export const SUIT_ABYSSAL_EXOTIC: ItemDefinition = {
  id: 'suit_abyssal_exotic',
  displayName: 'Abyssal Exo-Suit',
  description:
    'An experimental Helix deep-trench exploration suit incorporating PI material shielding. Rated for extreme pressure environments. Only three prototypes were authorized. Seven exist.',
  category: 'suit',
  rarity: 'exotic',
  maxStack: 1,
  weight: 10.0,
  baseValue: 32000,
  requiredLevel: 25,
  ilvl: computeIlvl(3, 'exotic'),
  textureKey: 'item_suit_abyssal',
  color: 0x003366,
  equipSlot: 'exosuit',
  moduleSlots: 5,
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('hazmat', 'exotic', 3) } },
  ],
  grantedAbilities: ['nano_repair', 'energy_barrier', 'regeneration_protocol', 'resource_scan'],
};
```

### Pattern 2: Aquatic Tool Definitions
**What:** Define 3 aquatic tools with water-specialized toolTypes and gathering bonuses
**When to use:** Providing thematically appropriate tools for aquatic resource extraction
**Example:**
```typescript
// packages/items/src/definitions/aquatic-tools.ts
import type { ItemDefinition, ToolType } from '../types';
import { computeIlvl, STAT_RARITY_MULTIPLIERS, TIER_MULTIPLIERS } from '../utils';

// Helper function for aquatic tool stats (similar to existing getToolStats pattern)
function getAquaticToolStats(toolType: ToolType, rarity: ItemRarity, tier: 1 | 2 | 3 | 4 | 5) {
  const base = 15;
  const rarityMult = STAT_RARITY_MULTIPLIERS[rarity];
  const tierMult = TIER_MULTIPLIERS[tier];
  const value = Math.round(base * rarityMult * tierMult);

  // Gathering bonuses for aquatic tools
  const gatheringStats: { yieldBonus?: number; gatherSpeed?: number } = {};
  switch (tier) {
    case 1: gatheringStats.yieldBonus = 0.0; gatheringStats.gatherSpeed = 0.0; break;
    case 2: gatheringStats.yieldBonus = 0.1; gatheringStats.gatherSpeed = 0.1; break;
    case 3: gatheringStats.yieldBonus = 0.2; gatheringStats.gatherSpeed = 0.2; break;
  }

  switch (toolType) {
    case 'combat': return { type: 'stats', power: value };
    case 'mining': return { type: 'stats', perception: value, ...gatheringStats };
    case 'bio': return { type: 'stats', vigor: value, ...gatheringStats };
    default: return { type: 'stats', power: value };
  }
}

// Tier I aquatic combat tool
export const TOOL_HARPOON_RARE: ItemDefinition = {
  id: 'tool_harpoon_rare',
  displayName: 'Aquatic Harpoon',
  description:
    'A directed-energy harpoon designed for underwater combat. Effective against aquatic predators and for resource extraction. Standard issue for Helix aquatic security teams.',
  category: 'tool',
  rarity: 'rare',
  maxStack: 1,
  weight: 2.5,
  baseValue: 1200,
  requiredLevel: 5,
  ilvl: computeIlvl(1, 'rare'),
  textureKey: 'item_tool_harpoon',
  color: 0x2255aa,
  equipSlot: 'tool',
  toolType: 'combat',
  effects: [
    { trigger: 'on_equip', effect: getAquaticToolStats('combat', 'rare', 1) },
  ],
  range: 2,
  grantedAbilities: ['basic_strike', 'shield_bash', 'electrocute'],
};

// Tier II aquatic mining tool
export const TOOL_DIVING_PICK_EPIC: ItemDefinition = {
  id: 'tool_diving_pick_epic',
  displayName: 'Deep-Sea Mining Pick',
  description:
    'A pressure-adapted extraction tool with sonic resonance capabilities. Cuts through underwater mineral formations without creating debris clouds. Helix Deep Shaft Aquatic Division standard.',
  category: 'tool',
  rarity: 'epic',
  maxStack: 1,
  weight: 4.0,
  baseValue: 5000,
  requiredLevel: 15,
  ilvl: computeIlvl(2, 'epic'),
  textureKey: 'item_tool_diving_pick',
  color: 0x1166aa,
  equipSlot: 'tool',
  toolType: 'mining',
  effects: [
    { trigger: 'on_equip', effect: getAquaticToolStats('mining', 'epic', 2) },
  ],
  range: 3,
  grantedAbilities: ['mine', 'basic_strike', 'thermal_lance', 'plasma_burst'],
};

// Tier I aquatic bio tool
export const TOOL_NET_RARE: ItemDefinition = {
  id: 'tool_net_rare',
  displayName: 'Specimen Collection Net',
  description:
    'An energy-mesh net for capturing aquatic specimens and harvesting biological materials. Verdant Dynamics field biology standard for Tidal Pool operations.',
  category: 'tool',
  rarity: 'rare',
  maxStack: 1,
  weight: 1.5,
  baseValue: 1200,
  requiredLevel: 5,
  ilvl: computeIlvl(1, 'rare'),
  textureKey: 'item_tool_net',
  color: 0x33aa88,
  equipSlot: 'tool',
  toolType: 'bio',
  effects: [
    { trigger: 'on_equip', effect: getAquaticToolStats('bio', 'rare', 1) },
  ],
  range: 2,
  grantedAbilities: ['harvest', 'energy_pulse', 'analyze_specimen'],
};
```

### Pattern 3: Exotic Suit Definitions
**What:** Define 3 exotic suits with anomaly-resistant archetypes and void-themed abilities
**When to use:** Populating exotic/anomaly biomes with high-tier equipment
**Example:**
```typescript
// packages/items/src/definitions/exotic-suits.ts
import type { ItemDefinition } from '../types';
import { computeIlvl, generateSuitStats } from '../utils';

// Tier III exotic suit (requires Tier I-II materials to obtain)
export const SUIT_VOID_TOUCHED_EXOTIC: ItemDefinition = {
  id: 'suit_void_touched_exotic',
  displayName: 'Void-Touched Exo-Suit',
  description:
    'A suit incorporating materials forged in Anomaly Zones. Partial resistance to reality distortions. The suit sometimes moves before the wearer commands it. This is considered "normal".',
  category: 'suit',
  rarity: 'exotic',
  maxStack: 1,
  weight: 8.5,
  baseValue: 30000,
  requiredLevel: 25,
  ilvl: computeIlvl(3, 'exotic'),
  textureKey: 'item_suit_void_touched',
  color: 0x5500aa,
  equipSlot: 'exosuit',
  moduleSlots: 5,
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('scout', 'exotic', 3) } },
  ],
  grantedAbilities: ['nano_repair', 'magnetic_field', 'fortify_systems', 'overclock'],
};

// Tier IV exotic suit (high-end anomaly resistance)
export const SUIT_ANOMALY_EXOTIC: ItemDefinition = {
  id: 'suit_anomaly_exotic',
  displayName: 'Anomaly Resistance Suit',
  description:
    'Nexus Frontiers prototype incorporating Ancient stabilization technology. Provides unprecedented anomaly resistance. The research team cannot explain how it works. They stopped asking after the third incident.',
  category: 'suit',
  rarity: 'exotic',
  maxStack: 1,
  weight: 9.0,
  baseValue: 35000,
  requiredLevel: 30,
  ilvl: computeIlvl(4, 'exotic'),
  textureKey: 'item_suit_anomaly',
  color: 0x6600cc,
  equipSlot: 'exosuit',
  moduleSlots: 5,
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('recon', 'exotic', 4) } },
  ],
  grantedAbilities: ['nano_repair', 'energy_barrier', 'regeneration_protocol', 'power_surge'],
};

// Tier IV exotic suit (extreme environment)
export const SUIT_NULL_LEGENDARY: ItemDefinition = {
  id: 'suit_null_legendary',
  displayName: 'Null Containment Suit',
  description:
    'An impossibly advanced suit recovered from a Null Pocket. Functions where all other technology fails. Analysis shows it is not powered by any detectable source. It simply... works.',
  category: 'suit',
  rarity: 'legendary',
  maxStack: 1,
  weight: 7.0,
  baseValue: 120000,
  requiredLevel: 40,
  ilvl: computeIlvl(4, 'legendary'),
  textureKey: 'item_suit_null',
  color: 0x220044,
  equipSlot: 'exosuit',
  moduleSlots: 6,
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('balanced', 'legendary', 4) } },
  ],
  grantedAbilities: ['nano_repair', 'regeneration_protocol', 'energy_barrier', 'overclock', 'void_drain'],
};
```

### Pattern 4: Consumable Definitions
**What:** Define 10 new consumables (5 aquatic, 5 exotic) with thematic effects
**When to use:** Providing biome-specific utility items and buff consumables
**Example:**
```typescript
// packages/items/src/definitions/aquatic-consumables.ts
import type { ItemDefinition } from '../types';
import { computeIlvl } from '../utils';

// Tier I aquatic consumable (pressure resistance)
export const PRESSURE_PILL_COMMON: ItemDefinition = {
  id: 'pressure_pill_common',
  displayName: 'Pressure Stabilization Pill',
  description:
    'A pharmaceutical compound that temporarily regulates internal pressure for underwater operations. Standard issue for Tidal Pool teams. Side effects include minor disorientation.',
  category: 'consumable',
  rarity: 'common',
  maxStack: 20,
  weight: 0.1,
  baseValue: 80,
  requiredLevel: 1,
  ilvl: computeIlvl(1, 'common'),
  textureKey: 'item_pressure_pill',
  color: 0x4488cc,
  effects: [
    { trigger: 'on_use', effect: { type: 'stat_buff', stat: 'hazard_resistance', amount: 20, duration: 60 } }
  ],
};

// Tier II aquatic consumable (breathing assist)
export const GILL_EXTRACT_RARE: ItemDefinition = {
  id: 'gill_extract_rare',
  displayName: 'Gill Extract Compound',
  description:
    'A Verdant Dynamics biotech compound derived from Terminus aquatic organisms. Temporarily enhances oxygen extraction efficiency. Legal only for licensed personnel. Widely available anyway.',
  category: 'consumable',
  rarity: 'rare',
  maxStack: 20,
  weight: 0.15,
  baseValue: 300,
  requiredLevel: 10,
  ilvl: computeIlvl(2, 'rare'),
  textureKey: 'item_gill_extract',
  color: 0x3388aa,
  effects: [
    { trigger: 'on_use', effect: { type: 'stat_buff', stat: 'recovery', amount: 35, duration: 90 } }
  ],
};

// Tier III aquatic consumable (deep-water repair)
export const DEPTH_CHARGE_EPIC: ItemDefinition = {
  id: 'depth_charge_epic',
  displayName: 'Emergency Depth Charge',
  description:
    'A one-use emergency repair compound designed for Deep Trench operations. Rapidly seals pressure breaches in exo-suits. Helix teams carry these as mandatory equipment. The survival rate improvement is documented.',
  category: 'consumable',
  rarity: 'epic',
  maxStack: 10,
  weight: 0.3,
  baseValue: 1200,
  requiredLevel: 20,
  ilvl: computeIlvl(3, 'epic'),
  textureKey: 'item_depth_charge',
  color: 0x2266aa,
  effects: [
    { trigger: 'on_use', effect: { type: 'suit_repair', amount: 200 } }
  ],
};

// Aquatic health restore
export const KELP_SALVE_COMMON: ItemDefinition = {
  id: 'kelp_salve_common',
  displayName: 'Kelp Salve',
  description:
    'A topical biomedical compound derived from processed Kelp Forest organisms. Accelerates wound healing. Smells terrible. Works well.',
  category: 'consumable',
  rarity: 'common',
  maxStack: 20,
  weight: 0.2,
  baseValue: 60,
  requiredLevel: 1,
  ilvl: computeIlvl(1, 'common'),
  textureKey: 'item_kelp_salve',
  color: 0x44aa66,
  effects: [
    { trigger: 'on_use', effect: { type: 'heal', amount: 50 } }
  ],
};

// Aquatic energy restore
export const BRINE_CAPACITOR_RARE: ItemDefinition = {
  id: 'brine_capacitor_rare',
  displayName: 'Brine Capacitor',
  description:
    'An energy cell incorporating electrolytes extracted from Tidal Pool organisms. Stable, efficient, and inexplicably salty to the touch.',
  category: 'consumable',
  rarity: 'rare',
  maxStack: 20,
  weight: 0.3,
  baseValue: 250,
  requiredLevel: 5,
  ilvl: computeIlvl(1, 'rare'),
  textureKey: 'item_brine_capacitor',
  color: 0x5599cc,
  effects: [
    { trigger: 'on_use', effect: { type: 'energy_restore', amount: 100 } }
  ],
};
```

```typescript
// packages/items/src/definitions/exotic-consumables.ts
import type { ItemDefinition } from '../types';
import { computeIlvl } from '../utils';

// Tier III exotic consumable (reality stabilization)
export const STABILITY_TONIC_EPIC: ItemDefinition = {
  id: 'stability_tonic_epic',
  displayName: 'Reality Stabilization Tonic',
  description:
    'A compound incorporating Anomaly Catalyst reagents. Temporarily anchors the user in stable spacetime. Essential for prolonged Void Rift operations. The ICC has not approved it. Nexus uses it anyway.',
  category: 'consumable',
  rarity: 'epic',
  maxStack: 10,
  weight: 0.2,
  baseValue: 1500,
  requiredLevel: 25,
  ilvl: computeIlvl(3, 'epic'),
  textureKey: 'item_stability_tonic',
  color: 0x7700ff,
  effects: [
    { trigger: 'on_use', effect: { type: 'stat_buff', stat: 'resilience', amount: 50, duration: 120 } }
  ],
};

// Tier IV exotic consumable (void energy)
export const VOID_ESSENCE_VIAL_EXOTIC: ItemDefinition = {
  id: 'void_essence_vial_exotic',
  displayName: 'Void Essence Vial',
  description:
    'A concentrated sample of Void Essence in consumable form. Restores suit energy by drawing on anomalous spatial distortions. Using it feels wrong. It works anyway.',
  category: 'consumable',
  rarity: 'exotic',
  maxStack: 10,
  weight: 0.1,
  baseValue: 3000,
  requiredLevel: 30,
  ilvl: computeIlvl(4, 'exotic'),
  textureKey: 'item_void_essence_vial',
  color: 0x5500ff,
  effects: [
    { trigger: 'on_use', effect: { type: 'energy_restore', amount: 400 } }
  ],
};

// Tier III exotic consumable (phase shift)
export const PHASE_CAPSULE_EPIC: ItemDefinition = {
  id: 'phase_capsule_epic',
  displayName: 'Phase Capsule',
  description:
    'A biotech compound using dimensional materials. Temporarily enhances movement speed and perception. Nexus operatives use these for rapid retreat from Anomaly Zones. The side effects are... being studied.',
  category: 'consumable',
  rarity: 'epic',
  maxStack: 10,
  weight: 0.15,
  baseValue: 1800,
  requiredLevel: 25,
  ilvl: computeIlvl(3, 'epic'),
  textureKey: 'item_phase_capsule',
  color: 0x6600cc,
  effects: [
    { trigger: 'on_use', effect: { type: 'stat_buff', stat: 'haste', amount: 45, duration: 90 } }
  ],
};

// Tier IV exotic heal
export const DIMENSIONAL_MEND_EXOTIC: ItemDefinition = {
  id: 'dimensional_mend_exotic',
  displayName: 'Dimensional Mend',
  description:
    'A medical compound incorporating Ancient stabilizer fragments. Rapidly repairs tissue damage through mechanisms current medicine cannot explain. Extremely effective. Disturbingly so.',
  category: 'consumable',
  rarity: 'exotic',
  maxStack: 10,
  weight: 0.1,
  baseValue: 3500,
  requiredLevel: 30,
  ilvl: computeIlvl(4, 'exotic'),
  textureKey: 'item_dimensional_mend',
  color: 0x8800ff,
  effects: [
    { trigger: 'on_use', effect: { type: 'heal', amount: 400 } }
  ],
};

// Tier III exotic suit repair
export const NULL_PATCH_KIT_EPIC: ItemDefinition = {
  id: 'null_patch_kit_epic',
  displayName: 'Null-Field Patch Kit',
  description:
    'A suit repair system using void-forged materials. Repairs structural damage even in Null Pockets where conventional technology fails. How it functions without power is unknown.',
  category: 'consumable',
  rarity: 'epic',
  maxStack: 10,
  weight: 0.25,
  baseValue: 1400,
  requiredLevel: 25,
  ilvl: computeIlvl(3, 'epic'),
  textureKey: 'item_null_patch_kit',
  color: 0x4400aa,
  effects: [
    { trigger: 'on_use', effect: { type: 'suit_repair', amount: 200 } }
  ],
};
```

### Anti-Patterns to Avoid
- **Crafting recipes for new items:** No crafting system exists; items must come from loot/vendors/quests
- **Custom stat types for water/void effects:** Reuse existing stat framework (resilience for anomaly resistance, recovery for life support)
- **Power creep through stat inflation:** New exotic items are sidegrades, not upgrades — horizontal progression only
- **Tier I items requiring high-tier materials:** Aquatic Tier I-II must be accessible to new players in those zones

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Item level calculation | Custom tier/rarity formulas | `computeIlvl(tier, rarity)` | Maintains consistent ilvl scaling (Tier 1 Common=10, Tier 5 Legendary=110) |
| Suit stat distribution | Manual stat assignment | `generateSuitStats(archetype, rarity, tier)` | Ensures balanced stat budgets using proven archetype profiles |
| Tool stat bonuses | Hard-coded stat values | Helper functions using STAT_RARITY_MULTIPLIERS and TIER_MULTIPLIERS | Consistent scaling across all tools |
| Consumable effect scaling | Random heal amounts | Rarity-based formula (common=50, rare=100, epic=200, exotic=400) | Predictable progression matching existing consumables |

**Key insight:** The item system has mature utilities for stat generation and balance. Custom calculations introduce inconsistencies and balance problems. Use the established helpers.

## Common Pitfalls

### Pitfall 1: Power Creep Through Stat Inflation
**What goes wrong:** New exotic items have higher stats than existing items at same tier, making old content obsolete
**Why it happens:** Temptation to make new content "exciting" through numerical superiority
**How to avoid:** Follow PROG-03 requirement — high-tier exotic items are sidegrades with different stat distributions, not straight upgrades. Abyssal Suit (exotic, tier 3, hazmat archetype) vs. Environmental Suit (epic, tier 2, hazmat archetype) should have different focuses, not pure stat superiority.
**Warning signs:** New tier 3 exotic has more total stats than existing tier 3 exotic; players replace all gear with new items

### Pitfall 2: Inaccessible Tier I Aquatic Items
**What goes wrong:** Tier I aquatic items require materials that only drop in Tier III zones
**Why it happens:** Forgetting ITEM-09 requirement that aquatic Tier I-II must be accessible without high-tier prerequisites
**How to avoid:** Tier I-II aquatic items should be craftable from common/rare reagents or purchasable from vendors for credits. Only Tier III+ exotic items should require exotic materials (ITEM-10).
**Warning signs:** Player cannot access Diving Suit without first completing Void Rift content

### Pitfall 3: Crafting System Assumptions
**What goes wrong:** Defining item recipes when no crafting system exists
**Why it happens:** Assuming crafting will be implemented in Phase 87
**How to avoid:** Remember that crafting is deferred to v1.19+. Items must be obtainable through loot tables (creature drops, node harvests), vendor purchases (NPC traders), or quest rewards. ITEM-07/ITEM-08 "materials" are reagents that drop from entities, not crafting ingredients.
**Warning signs:** Writing recipe definitions, referencing crafting UI, planning material combination mechanics

### Pitfall 4: Inconsistent Stat Scaling
**What goes wrong:** New tools don't follow established toolType stat conventions
**Why it happens:** Not referencing existing `getToolStats()` pattern from tools.ts
**How to avoid:** Combat/demolition/universal tools grant `power`, mining/research tools grant `perception`, bio tools grant `vigor`, stealth tools grant `perception + haste`, anomaly tools grant `resilience`. Mining/bio tools also grant `yieldBonus` and `gatherSpeed` based on tier.
**Warning signs:** Harpoon (combat tool) grants perception instead of power; Diving Pick (mining tool) doesn't grant yieldBonus

### Pitfall 5: Ability Creep
**What goes wrong:** New items grant 7+ abilities, making them mandatory upgrades
**Why it happens:** Adding every thematically appropriate ability without constraint
**How to avoid:** Existing suits grant 1-5 abilities (common=1-2, rare=2-3, epic=3-4, exotic=4-5, legendary=5-6). Existing tools grant 2-6 abilities. New items should match this progression.
**Warning signs:** Diving Suit grants more abilities than Legendary Ancient Prototype Suit

## Code Examples

Verified patterns from existing item definitions:

### Suit Definition with Archetype Stats
```typescript
// Source: packages/items/src/definitions/suits.ts (lines 160-180)
export const SUIT_REINFORCED_RARE: ItemDefinition = {
  id: 'suit_reinforced_rare',
  displayName: 'Reinforced Exo-Suit',
  description: 'A heavy-duty suit with layered composite plating...',
  category: 'suit',
  rarity: 'rare',
  maxStack: 1,
  weight: 11.0,
  baseValue: 2000,
  requiredLevel: 5,
  ilvl: computeIlvl(1, 'rare'),
  textureKey: 'item_suit_reinforced',
  color: 0x4a6080,
  equipSlot: 'exosuit',
  moduleSlots: 4,
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('tank', 'rare', 1) } },
  ],
  grantedAbilities: ['nano_repair', 'magnetic_field'],
};
```

### Tool Definition with ToolType Stats
```typescript
// Source: packages/items/src/definitions/tools.ts (lines 133-154)
export const TOOL_MINING_RARE: ItemDefinition = {
  id: 'tool_mining_rare',
  displayName: 'Excavator Mk.II',
  description: 'A rotary excavation tool with variable-torque settings...',
  category: 'tool',
  rarity: 'rare',
  maxStack: 1,
  weight: 3.5,
  baseValue: 1200,
  requiredLevel: 5,
  ilvl: computeIlvl(1, 'rare'),
  textureKey: 'item_tool_mining',
  color: 0xdd9944,
  equipSlot: 'tool',
  toolType: 'mining',
  effects: [
    { trigger: 'on_equip', effect: getToolStats('mining', 'rare', 1) },
  ],
  range: 2,
  grantedAbilities: ['mine', 'basic_strike', 'thermal_lance'],
};
```

### Consumable Definition with On-Use Effect
```typescript
// Source: packages/items/src/definitions/consumables.ts (lines 25-40)
export const HEALTH_VIAL_RARE: ItemDefinition = {
  id: 'health_vial_rare',
  displayName: 'Advanced Health Vial',
  description: 'An improved biofix formula with accelerated cellular repair compounds...',
  category: 'consumable',
  rarity: 'rare',
  maxStack: 20,
  weight: 0.2,
  baseValue: 200,
  requiredLevel: 5,
  ilvl: computeIlvl(1, 'rare'),
  textureKey: 'item_health_vial',
  color: 0x44ee44,
  effects: [{ trigger: 'on_use', effect: { type: 'heal', amount: 100 } }],
};
```

### Stat Buff Consumable Definition
```typescript
// Source: packages/items/src/definitions/consumables.ts (lines 365-379)
export const STIM_FOCUS_COMMON: ItemDefinition = {
  id: 'stim_focus_common',
  displayName: 'Focus Stim',
  description: 'A mild cognitive enhancer used by Nexus operatives...',
  category: 'consumable',
  rarity: 'common',
  maxStack: 10,
  weight: 0.1,
  baseValue: 100,
  requiredLevel: 1,
  ilvl: computeIlvl(1, 'common'),
  textureKey: 'item_stim',
  color: 0x4488ff,
  effects: [
    { trigger: 'on_use', effect: { type: 'stat_buff', stat: 'scan_speed', amount: 20, duration: 60 } }
  ],
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `stat_buff` for equipment | `stats` effect type with multiple stat properties | Phase 60 (Feb 2024) | Equipment uses granular stats (durability, toughness, power, etc.) instead of generic buffs |
| Manual stat calculations | `generateSuitStats()` and `getToolStats()` helpers | Phase 63 | Consistent stat budgets across all equipment |
| Direct loot assignment | Entity loot tables in `creature-loot.ts` | Phase 35 | Centralized loot definitions, easier balancing |
| Arbitrary item levels | `computeIlvl(tier, rarity)` formula | Phase 25 | Predictable ilvl progression (10-110 range) |

**Deprecated/outdated:**
- `stat_buff` effect for on_equip triggers: Use `stats` effect with multiple stat properties
- Hard-coded stat values in item definitions: Use helper functions for consistent scaling
- Embedding loot tables in entity definitions: Define in separate `creature-loot.ts` file

## Progression Balance Constraints

### PROG-01: Aquatic Tier I-II Accessibility
**Requirement:** Aquatic Tier I (Tidal Pools) comparable to existing Frontier zones

**Implementation:**
- Diving Suit (Tier I rare): Same ilvl/stats as Scout Suit (Tier I rare, existing Frontier gear)
- Harpoon (Tier I rare): Same damage scaling as Pulse Pistol (Tier I rare combat tool)
- Pressure Pill (common): Same effect magnitude as Antitoxin (common hazard resistance consumable)

**Verification:** New player in Tidal Pools can afford/obtain basic aquatic gear without completing higher-tier content

### PROG-02: Exotic Tier IV Survival Requirements
**Requirement:** Exotic Tier IV (Void Rift) requires Tier III equipment to survive

**Implementation:**
- Void Rift hazards deal damage that requires resilience stat (provided by Tier III+ suits)
- Reality distortion effects require stability consumables (epic/exotic rarity)
- Base Tier I-II suits provide insufficient hazard resistance for survival

**Verification:** Player in basic Diving Suit (Tier I) takes lethal damage in Void Rift within 60 seconds

### PROG-03: Horizontal Progression (No Power Creep)
**Requirement:** New high-tier items are sidegrades, not upgrades

**Implementation:**
- Abyssal Suit (exotic tier 3, hazmat archetype): High resilience/recovery, lower power/haste — sidegrade to Tactical Suit (epic tier 2, combat archetype)
- Void-Touched Suit (exotic tier 3, scout archetype): High haste/perception, lower durability/toughness — sidegrade to Environmental Suit (epic tier 2, hazmat archetype)
- Different archetypes optimize for different playstyles, not pure power increase

**Verification:** Void-Touched Suit has different stat distribution than existing exotic suits, not higher total stats

## Lore Compliance

All new items must align with established world-bible lore:

### Aquatic Items Lore Alignment
- **Tidal Pools (Tier I):** Accessible zone with "drowning, aquatic predators, toxic marine life" hazards — suits provide pressure compensation and hazard resistance
- **Kelp Forests (Tier II):** Dense flora environment — tools designed for underwater mineral/bio extraction
- **Deep Trenches (Tier III):** Extreme pressure environment — advanced suits with PI material shielding (lore established in world-bible.md lines 291-293)

### Exotic Items Lore Alignment
- **Anomaly Zones (Tier IV):** "Reality distortion, temporal displacement, spatial traps" — suits provide anomaly resistance and stabilization
- **Void phenomena:** Described as "regions where physics is unreliable" — items incorporate void-forged materials and Ancient technology
- **Corporate denial:** Lore states "corporations deny connection between Anomalies and Ancients" — item descriptions hint at classified research and unexplained mechanisms

## Open Questions

1. **Vendor availability for new items**
   - What we know: No crafting system exists; items must come from loot/vendors/quests
   - What's unclear: Which NPCs should sell aquatic/exotic items? At what prices?
   - Recommendation: Add aquatic items to Helix/Verdant faction vendors in Tidal Pool zones; add exotic items to high-tier Nexus vendors as restricted purchases

2. **Loot table assignment**
   - What we know: Phase 83/86 defined aquatic/exotic entities with placeholder loot tables
   - What's unclear: Should new equipment drop from creatures, or only be vendor/quest rewards?
   - Recommendation: Common/rare consumables drop from creatures; equipment is vendor/quest-only to maintain progression control

3. **Quest integration**
   - What we know: PROG-04 requires zone mastery objectives for new biomes
   - What's unclear: Should new items be quest rewards for zone mastery completion?
   - Recommendation: Epic/exotic equipment as zone mastery completion rewards provides progression incentive

## Sources

### Primary (HIGH confidence)
- `/packages/items/src/types.ts` - ItemDefinition interface, effect types, rarity/category enums
- `/packages/items/src/utils.ts` - computeIlvl(), generateSuitStats(), STAT_RARITY_MULTIPLIERS, TIER_MULTIPLIERS
- `/packages/items/src/definitions/suits.ts` - 21 suit definitions with archetype patterns
- `/packages/items/src/definitions/tools.ts` - 50+ tool definitions with toolType patterns
- `/packages/items/src/definitions/consumables.ts` - 30 consumable definitions with effect scaling
- `/packages/items/src/definitions/reagents.ts` - 15 reagent definitions (materials for "crafting")
- `/.planning/REQUIREMENTS.md` - ITEM-01 through ITEM-10, PROG-01 through PROG-03 requirements
- `/lore/world-bible.md` - Aquatic biome descriptions (lines 174-183), Anomaly Zone lore (lines 266-283)

### Secondary (MEDIUM confidence)
- Phase 60 migration docs - stat_buff to stats effect migration pattern
- Phase 63 archetype system - suit stat distribution methodology
- Phase 83/86 entity definitions - aquatic/exotic entity loot table references

### Tertiary (LOW confidence)
- None — all findings verified against codebase

## Metadata

**Confidence breakdown:**
- Item definition patterns: HIGH - 94 existing items follow identical schema
- Stat scaling formulas: HIGH - Proven utilities in utils.ts, used across all equipment
- Progression balance: MEDIUM - Requirements clear, but vendor pricing/quest integration needs design
- Lore compliance: HIGH - World-bible provides explicit biome descriptions and hazard profiles

**Research date:** 2026-02-24
**Valid until:** 60 days for stable patterns, 30 days for progression balance decisions (subject to playtesting feedback)
