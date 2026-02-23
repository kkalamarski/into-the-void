import type { HarvestYield } from '@into-the-void/entities';

/**
 * Static creature loot tables keyed by lootTableId.
 *
 * Convention: lootTableId format is 'loot_<entity_id>'.
 * Used as the runtime source of truth for loot rolls (avoids DB queries per kill).
 * The DB tables (loot_tables, loot_table_entries) mirror this data for admin tooling.
 *
 * Item IDs reference the @into-the-void/items registry:
 * - world_organic_material_common  — Tier I common creature drop
 * - world_organic_material_rare    — Tier II-III rare creature drop
 * - world_organic_material_epic    — Tier III-IV apex predator drop
 * - reagent_crystalline_dust       — Crystal Caves area
 * - reagent_fungal_extract         — Fungal Forest area
 * - world_fungal_spore_cluster     — Fungal Forest world item
 * - world_mycelial_fiber           — Fungal Forest rare world item
 * - world_toxic_residue            — Miasma Marshes world item
 * - world_frozen_shard             — Frozen Expanse world item
 * - world_alien_flora_petrified    — Petrified Expanse world item
 * - world_volcanic_glass           — Volcanic Ridge world item
 * - world_geothermal_compound      — Volcanic Ridge rare world item
 * - world_crater_dust              — Void Plains world item
 * - world_crystal_fragment         — Crystal Caves epic world item
 * - reagent_quantum_residue        — Anomaly Zone reagent (Void Horror)
 * - world_void_crystal             — Anomaly Zone exotic world item
 * - world_ancient_fragment         — Ancient Ruins legendary world item
 * - reagent_ancient_circuitry      — Ancient Ruins reagent
 * - reagent_thermal_compound       — Volcanic rare reagent
 */
export const CREATURE_LOOT_TABLES = new Map<string, readonly HarvestYield[]>([
  // Tier I — Void Plains (Omnivore, levels 1-5)
  ['loot_creature_void_crawler', [
    { itemId: 'world_organic_material_common', minAmount: 1, maxAmount: 2, chance: 0.8 },
    { itemId: 'world_crater_dust', minAmount: 1, maxAmount: 3, chance: 0.5 },
    { itemId: 'world_organic_material_rare', minAmount: 1, maxAmount: 1, chance: 0.05 },
  ]],

  // Tier I — Fungal Forest (Herbivore, levels 1-6)
  ['loot_creature_canopy_grazer', [
    { itemId: 'world_organic_material_common', minAmount: 1, maxAmount: 3, chance: 0.85 },
    { itemId: 'world_fungal_spore_cluster', minAmount: 1, maxAmount: 2, chance: 0.4 },
    { itemId: 'reagent_fungal_extract', minAmount: 1, maxAmount: 2, chance: 0.25 },
    { itemId: 'world_luminous_extract', minAmount: 1, maxAmount: 1, chance: 0.08 },
  ]],

  // Tier II — Fungal Forest (Omnivore, levels 4-12)
  ['loot_creature_spore_carrier', [
    { itemId: 'world_organic_material_common', minAmount: 1, maxAmount: 2, chance: 0.75 },
    { itemId: 'world_fungal_spore_cluster', minAmount: 2, maxAmount: 4, chance: 0.6 },
    { itemId: 'world_mycelial_fiber', minAmount: 1, maxAmount: 1, chance: 0.2 },
    { itemId: 'reagent_fungal_extract', minAmount: 1, maxAmount: 3, chance: 0.35 },
    { itemId: 'world_spore_sack', minAmount: 1, maxAmount: 1, chance: 0.1 },
  ]],

  // Tier II — Crystal Caves (Predator, levels 8-18)
  ['loot_creature_crystal_hunter', [
    { itemId: 'world_organic_material_rare', minAmount: 1, maxAmount: 2, chance: 0.7 },
    { itemId: 'reagent_crystalline_dust', minAmount: 2, maxAmount: 5, chance: 0.65 },
    { itemId: 'world_crystal_fragment', minAmount: 1, maxAmount: 1, chance: 0.1 },
  ]],

  // Tier II — Miasma Marshes (Predator, levels 5-15)
  ['loot_creature_marsh_lurker', [
    { itemId: 'world_organic_material_common', minAmount: 1, maxAmount: 2, chance: 0.7 },
    { itemId: 'world_toxic_residue', minAmount: 1, maxAmount: 2, chance: 0.55 },
    { itemId: 'world_organic_material_rare', minAmount: 1, maxAmount: 1, chance: 0.15 },
  ]],

  // Tier II — Petrified Expanse (Predator, levels 6-16)
  ['loot_creature_dart_runner', [
    { itemId: 'world_organic_material_common', minAmount: 1, maxAmount: 2, chance: 0.75 },
    { itemId: 'world_alien_flora_petrified', minAmount: 1, maxAmount: 1, chance: 0.3 },
    { itemId: 'world_organic_material_rare', minAmount: 1, maxAmount: 1, chance: 0.12 },
    { itemId: 'reagent_petrification_enzyme', minAmount: 1, maxAmount: 1, chance: 0.08 },
  ]],

  // Tier III — Frozen Expanse (Predator, levels 10-22)
  ['loot_creature_frost_stalker', [
    { itemId: 'world_organic_material_rare', minAmount: 1, maxAmount: 2, chance: 0.75 },
    { itemId: 'world_frozen_shard', minAmount: 1, maxAmount: 3, chance: 0.6 },
    { itemId: 'world_organic_material_epic', minAmount: 1, maxAmount: 1, chance: 0.1 },
    { itemId: 'reagent_frost_essence', minAmount: 1, maxAmount: 1, chance: 0.15 },
  ]],

  // Tier III — Volcanic Ridge (Predator, levels 12-28)
  ['loot_creature_magma_beast', [
    { itemId: 'world_organic_material_rare', minAmount: 1, maxAmount: 2, chance: 0.7 },
    { itemId: 'world_volcanic_glass', minAmount: 1, maxAmount: 3, chance: 0.55 },
    { itemId: 'reagent_thermal_compound', minAmount: 1, maxAmount: 2, chance: 0.3 },
    { itemId: 'world_geothermal_compound', minAmount: 1, maxAmount: 1, chance: 0.15 },
    { itemId: 'world_organic_material_epic', minAmount: 1, maxAmount: 1, chance: 0.08 },
  ]],

  // Tier III — Toxic Wastes (Predator, levels 8-20)
  ['loot_creature_toxic_lurker', [
    { itemId: 'world_organic_material_rare', minAmount: 1, maxAmount: 2, chance: 0.7 },
    { itemId: 'world_toxic_residue', minAmount: 2, maxAmount: 4, chance: 0.6 },
    { itemId: 'world_organic_material_epic', minAmount: 1, maxAmount: 1, chance: 0.08 },
  ]],

  // Tier IV — Ancient Ruins + Starfall Crater (Maniac, levels 20-35)
  ['loot_creature_void_horror', [
    { itemId: 'world_organic_material_epic', minAmount: 1, maxAmount: 2, chance: 0.85 },
    { itemId: 'world_void_crystal', minAmount: 1, maxAmount: 1, chance: 0.25 },
    { itemId: 'reagent_quantum_residue', minAmount: 1, maxAmount: 1, chance: 0.2 },
    { itemId: 'world_ancient_fragment', minAmount: 1, maxAmount: 1, chance: 0.08 },
    { itemId: 'reagent_ancient_circuitry', minAmount: 1, maxAmount: 2, chance: 0.15 },
    { itemId: 'world_temporal_shard', minAmount: 1, maxAmount: 1, chance: 0.12 },
    { itemId: 'reagent_anomaly_catalyst', minAmount: 1, maxAmount: 1, chance: 0.05 },
  ]],

  // Tier I — Void Plains (Herbivore, levels 1-4)
  ['loot_creature_coastal_scuttler', [
    { itemId: 'world_organic_material_common', minAmount: 1, maxAmount: 2, chance: 0.75 },
    { itemId: 'world_crater_dust', minAmount: 1, maxAmount: 2, chance: 0.4 },
  ]],

  // Tier III — Volcanic Ridge (Omnivore, levels 10-20)
  ['loot_creature_ash_skimmer', [
    { itemId: 'world_organic_material_rare', minAmount: 1, maxAmount: 2, chance: 0.7 },
    { itemId: 'world_volcanic_glass', minAmount: 1, maxAmount: 2, chance: 0.5 },
    { itemId: 'reagent_thermal_compound', minAmount: 1, maxAmount: 1, chance: 0.2 },
  ]],

  // Tier II — Miasma Marshes (Herbivore, levels 3-10)
  ['loot_creature_miasma_drifter', [
    { itemId: 'world_organic_material_common', minAmount: 1, maxAmount: 2, chance: 0.8 },
    { itemId: 'world_toxic_residue', minAmount: 1, maxAmount: 1, chance: 0.35 },
    { itemId: 'world_organic_material_rare', minAmount: 1, maxAmount: 1, chance: 0.08 },
  ]],

  // Tier III — Frozen Expanse (Predator, levels 12-24)
  ['loot_creature_ice_burrower', [
    { itemId: 'world_organic_material_rare', minAmount: 1, maxAmount: 2, chance: 0.75 },
    { itemId: 'world_frozen_shard', minAmount: 2, maxAmount: 4, chance: 0.6 },
    { itemId: 'world_organic_material_epic', minAmount: 1, maxAmount: 1, chance: 0.12 },
    { itemId: 'reagent_frost_essence', minAmount: 1, maxAmount: 1, chance: 0.18 },
  ]],

  // Tier II — Crystal Caves (Herbivore, levels 5-12)
  ['loot_creature_crystal_crawler', [
    { itemId: 'world_organic_material_common', minAmount: 1, maxAmount: 2, chance: 0.7 },
    { itemId: 'reagent_crystalline_dust', minAmount: 1, maxAmount: 3, chance: 0.5 },
    { itemId: 'world_organic_material_rare', minAmount: 1, maxAmount: 1, chance: 0.1 },
  ]],

  // Tier IV — Ancient Ruins (Predator, levels 18-30)
  ['loot_creature_ruin_seeker', [
    { itemId: 'world_organic_material_epic', minAmount: 1, maxAmount: 2, chance: 0.8 },
    { itemId: 'reagent_ancient_circuitry', minAmount: 1, maxAmount: 2, chance: 0.3 },
    { itemId: 'world_ancient_fragment', minAmount: 1, maxAmount: 1, chance: 0.05 },
    { itemId: 'world_temporal_shard', minAmount: 1, maxAmount: 1, chance: 0.1 },
  ]],

  // Tier II — Petrified Expanse (Predator, levels 8-18)
  ['loot_creature_petrified_lurker', [
    { itemId: 'world_organic_material_common', minAmount: 1, maxAmount: 2, chance: 0.7 },
    { itemId: 'world_alien_flora_petrified', minAmount: 1, maxAmount: 2, chance: 0.4 },
    { itemId: 'world_organic_material_rare', minAmount: 1, maxAmount: 1, chance: 0.15 },
  ]],

  // Tier I — Tidal Pools (Herbivore, levels 1-6)
  ['loot_creature_tide_crab', [
    { itemId: 'world_organic_material_common', minAmount: 1, maxAmount: 2, chance: 0.8 },
    { itemId: 'world_crater_dust', minAmount: 1, maxAmount: 2, chance: 0.4 },
  ]],

  // Tier I — Tidal Pools (Herbivore, levels 1-5)
  ['loot_creature_coastal_urchin', [
    { itemId: 'world_organic_material_common', minAmount: 1, maxAmount: 2, chance: 0.75 },
    { itemId: 'world_crystal_fragment', minAmount: 1, maxAmount: 1, chance: 0.1 },
  ]],

  // Tier I — Tidal Pools (Omnivore, levels 2-7)
  ['loot_creature_reef_scavenger', [
    { itemId: 'world_organic_material_common', minAmount: 1, maxAmount: 3, chance: 0.85 },
    { itemId: 'world_crater_dust', minAmount: 1, maxAmount: 2, chance: 0.3 },
    { itemId: 'world_organic_material_rare', minAmount: 1, maxAmount: 1, chance: 0.05 },
  ]],

  // Tier II — Kelp Forests (Herbivore, levels 6-14)
  ['loot_creature_kelp_grazer', [
    { itemId: 'world_organic_material_common', minAmount: 2, maxAmount: 3, chance: 0.85 },
    { itemId: 'world_mycelial_fiber', minAmount: 1, maxAmount: 2, chance: 0.35 },
    { itemId: 'world_organic_material_rare', minAmount: 1, maxAmount: 1, chance: 0.1 },
  ]],

  // Tier II — Kelp Forests (Predator, levels 8-16)
  ['loot_creature_tangle_stalker', [
    { itemId: 'world_organic_material_rare', minAmount: 1, maxAmount: 2, chance: 0.75 },
    { itemId: 'world_crystal_fragment', minAmount: 1, maxAmount: 2, chance: 0.4 },
    { itemId: 'reagent_biogenic_catalyst', minAmount: 1, maxAmount: 1, chance: 0.2 },
  ]],

  // Tier II — Kelp Forests (Omnivore, levels 7-15)
  ['loot_creature_current_rider', [
    { itemId: 'world_organic_material_common', minAmount: 2, maxAmount: 3, chance: 0.8 },
    { itemId: 'world_organic_material_rare', minAmount: 1, maxAmount: 1, chance: 0.12 },
    { itemId: 'reagent_crystalline_dust', minAmount: 1, maxAmount: 1, chance: 0.15 },
  ]],

  // Tier III — Deep Trenches (Herbivore, levels 12-20)
  ['loot_creature_pressure_feeder', [
    { itemId: 'world_organic_material_rare', minAmount: 1, maxAmount: 2, chance: 0.8 },
    { itemId: 'reagent_thermal_compound', minAmount: 1, maxAmount: 1, chance: 0.3 },
    { itemId: 'world_void_crystal', minAmount: 1, maxAmount: 1, chance: 0.15 },
  ]],

  // Tier III — Deep Trenches (Predator, levels 14-24)
  ['loot_creature_trench_hunter', [
    { itemId: 'world_organic_material_rare', minAmount: 2, maxAmount: 3, chance: 0.85 },
    { itemId: 'world_void_crystal', minAmount: 1, maxAmount: 2, chance: 0.4 },
    { itemId: 'reagent_void_essence', minAmount: 1, maxAmount: 1, chance: 0.25 },
    { itemId: 'world_organic_material_epic', minAmount: 1, maxAmount: 1, chance: 0.08 },
  ]],

  // Tier III — Deep Trenches (Omnivore, levels 13-22)
  ['loot_creature_abyssal_scavenger', [
    { itemId: 'world_organic_material_rare', minAmount: 1, maxAmount: 2, chance: 0.75 },
    { itemId: 'world_geothermal_compound', minAmount: 1, maxAmount: 1, chance: 0.3 },
    { itemId: 'world_organic_material_epic', minAmount: 1, maxAmount: 1, chance: 0.06 },
  ]],

  // Tier IV — Deep Trenches (Maniac, levels 20-32)
  ['loot_creature_abyssal_leviathan', [
    { itemId: 'world_organic_material_epic', minAmount: 2, maxAmount: 3, chance: 0.9 },
    { itemId: 'world_void_crystal', minAmount: 2, maxAmount: 4, chance: 0.5 },
    { itemId: 'reagent_void_essence', minAmount: 2, maxAmount: 3, chance: 0.4 },
    { itemId: 'world_ancient_fragment', minAmount: 1, maxAmount: 1, chance: 0.15 },
    { itemId: 'reagent_thermal_compound', minAmount: 1, maxAmount: 2, chance: 0.3 },
    { itemId: 'reagent_quantum_residue', minAmount: 1, maxAmount: 1, chance: 0.1 },
  ]],
]);

/**
 * Look up loot entries for a creature by lootTableId.
 * Returns an empty array if the lootTableId is not registered.
 */
export function getCreatureLoot(lootTableId: string): readonly HarvestYield[] {
  return CREATURE_LOOT_TABLES.get(lootTableId) ?? [];
}
