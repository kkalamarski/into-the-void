import type { ItemDefinition } from '../types';
import { computeIlvl } from '../utils';

// ============================================================
// COMMON REAGENTS (2)
// ============================================================

export const REAGENT_CRYSTALLINE_DUST: ItemDefinition = {
  id: 'reagent_crystalline_dust',
  displayName: 'Crystalline Dust',
  description:
    'Fine powder ground from Terminus silicon crystals. Abundant and versatile — used as a base component in most module manufacturing processes. A staple of Nexus trading routes.',
  category: 'reagent',
  rarity: 'common',
  maxStack: 999,
  weight: 0.1,
  baseValue: 30,
  requiredLevel: 1,
  ilvl: computeIlvl(1, 'common'),
  textureKey: 'item_reagent_crystalline_dust',
  color: 0xccccee,
};

export const REAGENT_FUNGAL_EXTRACT: ItemDefinition = {
  id: 'reagent_fungal_extract',
  displayName: 'Fungal Extract',
  description:
    'Processed extract from Terminus fungal organisms. Base ingredient for most pharmaceutical compounds and biotech applications. Verdant Dynamics produces it in vast quantities from their Nursery facilities.',
  category: 'reagent',
  rarity: 'common',
  maxStack: 999,
  weight: 0.1,
  baseValue: 35,
  requiredLevel: 1,
  ilvl: computeIlvl(1, 'common'),
  textureKey: 'item_reagent_fungal_extract',
  color: 0xaa55aa,
};

// ============================================================
// RARE REAGENTS (2)
// ============================================================

export const REAGENT_THERMAL_COMPOUND: ItemDefinition = {
  id: 'reagent_thermal_compound',
  displayName: 'Thermal Compound',
  description:
    'A geothermally processed mineral compound with exceptional heat-resistance properties. Required for Power Core module manufacturing and thermal protection systems. Primarily sourced from Helix operations.',
  category: 'reagent',
  rarity: 'rare',
  maxStack: 999,
  weight: 0.2,
  baseValue: 150,
  requiredLevel: 5,
  ilvl: computeIlvl(1, 'rare'),
  textureKey: 'item_reagent_thermal_compound',
  color: 0xff8833,
};

export const REAGENT_ANCIENT_CIRCUITRY: ItemDefinition = {
  id: 'reagent_ancient_circuitry',
  displayName: 'Ancient Circuitry',
  description:
    'Circuit components recovered from Prior Inhabitant installations. Functional despite their age — the materials resist degradation through mechanisms not yet understood. Nexus pays a significant premium. All three corporations deny having a stockpile.',
  category: 'reagent',
  rarity: 'rare',
  maxStack: 999,
  weight: 0.15,
  baseValue: 500,
  requiredLevel: 10,
  ilvl: computeIlvl(2, 'rare'),
  textureKey: 'item_reagent_ancient_circuitry',
  color: 0x44ffaa,
};

// ============================================================
// EPIC REAGENTS (2)
// ============================================================

export const REAGENT_BIOGENIC_CATALYST: ItemDefinition = {
  id: 'reagent_biogenic_catalyst',
  displayName: 'Biogenic Catalyst',
  description:
    'A compound that dramatically accelerates biological processes. Extracted from deep Terminus organisms with rapid-adaptation capabilities. Verdant\'s classified research division uses quantities they don\'t report to the ICC.',
  category: 'reagent',
  rarity: 'epic',
  maxStack: 999,
  weight: 0.2,
  baseValue: 1500,
  requiredLevel: 15,
  ilvl: computeIlvl(2, 'epic'),
  textureKey: 'item_reagent_biogenic_catalyst',
  color: 0x44ee44,
};

export const REAGENT_QUANTUM_RESIDUE: ItemDefinition = {
  id: 'reagent_quantum_residue',
  displayName: 'Quantum Residue',
  description:
    'A material formed only in Anomaly Zones where quantum-level physics anomalies occur. Appears to maintain coherent quantum states at room temperature — something theoretically impossible. Essential for exotic module manufacturing.',
  category: 'reagent',
  rarity: 'epic',
  maxStack: 999,
  weight: 0.05,
  baseValue: 2000,
  requiredLevel: 15,
  ilvl: computeIlvl(3, 'epic'),
  textureKey: 'item_reagent_quantum_residue',
  color: 0x00ffee,
};

// ============================================================
// EXOTIC REAGENTS (2)
// ============================================================

export const REAGENT_NEXUS_CORE_FRAGMENT: ItemDefinition = {
  id: 'reagent_nexus_core_fragment',
  displayName: 'Nexus Core Fragment',
  description:
    'A shard from Nexus Frontiers\' classified research into Terminus energy anomalies. The fragment maintains a faint energy output without any power source. Nexus sells these to specific buyers at undisclosed prices. Why they sell them at all is the question.',
  category: 'reagent',
  rarity: 'exotic',
  maxStack: 999,
  weight: 0.1,
  baseValue: 8000,
  requiredLevel: 25,
  ilvl: computeIlvl(3, 'exotic'),
  textureKey: 'item_reagent_nexus_core_fragment',
  color: 0x2244ff,
};

export const REAGENT_VOID_ESSENCE: ItemDefinition = {
  id: 'reagent_void_essence',
  displayName: 'Void Essence',
  description:
    'A rare substance that appears only in the deepest Anomaly Zones. Appears as a contained spatial distortion — a pocket of the Void itself, stabilized by unknown means. Used in the most advanced crafting operations. The corporations have not announced a safe synthesis method.',
  category: 'reagent',
  rarity: 'exotic',
  maxStack: 999,
  weight: 0.01,
  baseValue: 12000,
  requiredLevel: 30,
  ilvl: computeIlvl(4, 'exotic'),
  textureKey: 'item_reagent_void_essence',
  color: 0x5500ff,
};

// ============================================================
// LEGENDARY REAGENTS (2)
// ============================================================

export const REAGENT_HELIX_GENE_SAMPLE: ItemDefinition = {
  id: 'reagent_helix_gene_sample',
  displayName: 'Helix Gene Sample',
  description:
    'A genetic material sample from Helix Extraction\'s classified Terminus organism modification research. What organisms these genes came from is not disclosed. What they\'ve been modified to do is more classified still. The research team that created this no longer exists as a team.',
  category: 'reagent',
  rarity: 'legendary',
  maxStack: 999,
  weight: 0.05,
  baseValue: 50000,
  requiredLevel: 35,
  ilvl: computeIlvl(4, 'legendary'),
  textureKey: 'item_reagent_helix_gene_sample',
  color: 0xff2222,
};

export const REAGENT_VOID_HEART: ItemDefinition = {
  id: 'reagent_void_heart',
  displayName: 'Void Heart',
  description:
    'The rarest crafting material on Terminus. A stabilized concentration of anomalous energy that pulses like a living organ. Its origin is unknown. The corporations have encountered perhaps a dozen. Administrator Thorne reportedly locked the first recovered specimen in a vault and has never explained why.',
  category: 'reagent',
  rarity: 'legendary',
  maxStack: 999,
  weight: 0.02,
  baseValue: 100000,
  requiredLevel: 40,
  ilvl: computeIlvl(4, 'legendary'),
  textureKey: 'item_reagent_void_heart',
  color: 0x8800ff,
};

// ============================================================
// ALL REAGENTS
// ============================================================

export const ALL_REAGENTS: readonly ItemDefinition[] = [
  REAGENT_CRYSTALLINE_DUST,
  REAGENT_FUNGAL_EXTRACT,
  REAGENT_THERMAL_COMPOUND,
  REAGENT_ANCIENT_CIRCUITRY,
  REAGENT_BIOGENIC_CATALYST,
  REAGENT_QUANTUM_RESIDUE,
  REAGENT_NEXUS_CORE_FRAGMENT,
  REAGENT_VOID_ESSENCE,
  REAGENT_HELIX_GENE_SAMPLE,
  REAGENT_VOID_HEART,
];
