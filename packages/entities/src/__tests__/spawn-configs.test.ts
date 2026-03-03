// Side-effect import — trigger entity registration
import '../index';

import { describe, it, expect } from 'vitest';
import { ALL_ENTITIES } from '../definitions';
import { EntityRegistry } from '../registry';
// Import directly from source to avoid pulling in all world-gen transitive deps
import { BIOME_SPAWN_CONFIGS } from '@into-the-void/world-gen/src/generation/spawn';
import type { BiomeType } from '@into-the-void/shared-types';

// Rare/epic minerals are spawned via rarity.ts (getRareBiomeMinerals / getEpicBiomeMinerals)
// rather than through BIOME_SPAWN_CONFIGS. We inline the mapping here to avoid a circular
// dependency (rarity.ts imports from @into-the-void/entities).
const RARITY_SYSTEM_MINERALS: Record<string, string[]> = {
  void_plains: ['mineral_void_crystal_rare'],
  crystal_caves: ['mineral_prismatic_crystal_rare', 'mineral_prismatic_crystal_epic'],
  volcanic_ridge: ['mineral_volcanic_ore_rare', 'mineral_volcanic_ore_epic'],
  starfall_crater: ['mineral_cosmic_fragment_rare', 'mineral_cosmic_fragment_epic'],
  ancient_ruins: ['mineral_anomaly_crystal_epic', 'mineral_anomaly_crystal_rare'],
  fungal_forest: ['mineral_mycelial_cluster_rare'],
  tidal_pools: ['mineral_sea_crystal_rare'],
  toxic_wastes: ['mineral_corrosive_deposit_rare'],
  petrified_expanse: ['mineral_mineralized_log_rare'],
  bioluminescent_depths: ['mineral_depth_quartz_rare'],
  kelp_forests: ['mineral_pearl_node_rare'],
  frozen_expanse: ['mineral_permafrost_shard_rare', 'mineral_glacial_core_epic'],
  deep_trenches: ['mineral_abyssal_ore_rare', 'mineral_abyssal_ore_epic'],
};

// Collect all entity IDs referenced across all biome spawn configs,
// including rare/epic minerals spawned via the rarity system
function getAllSpawnConfigEntityIds(): Set<string> {
  const ids = new Set<string>();
  for (const [biome, config] of Object.entries(BIOME_SPAWN_CONFIGS)) {
    for (const c of config.creatures) ids.add(c.id);
    for (const m of config.minerals) ids.add(m.id);
    for (const p of config.plants) ids.add(p.id);
    for (const a of config.artifacts) ids.add(a.id);
    // Include rare/epic minerals spawned via the rarity system
    const rarityMinerals = RARITY_SYSTEM_MINERALS[biome];
    if (rarityMinerals) {
      for (const id of rarityMinerals) ids.add(id);
    }
  }
  return ids;
}

const allBiomes = Object.keys(BIOME_SPAWN_CONFIGS) as BiomeType[];

describe('Biome Spawn Config Validation', () => {
  describe('Every spawnable entity appears in BIOME_SPAWN_CONFIGS', () => {
    const spawnConfigEntityIds = getAllSpawnConfigEntityIds();
    const spawnableEntities = ALL_ENTITIES.filter((e) => e.biomes.length > 0);

    it.each(spawnableEntities.map((e) => [e.id, e] as const))(
      'entity "%s" is referenced in at least one biome spawn config',
      (id, entity) => {
        expect(
          spawnConfigEntityIds.has(id),
          `Entity "${id}" declares biomes [${entity.biomes.join(', ')}] but is not referenced in any BIOME_SPAWN_CONFIGS entry. Add it to the spawn config for its biome(s) in packages/world-gen/src/generation/spawn.ts`
        ).toBe(true);
      }
    );
  });

  describe('Every entity ID in BIOME_SPAWN_CONFIGS references a registered entity', () => {
    for (const biome of allBiomes) {
      const config = BIOME_SPAWN_CONFIGS[biome];
      const entries = [
        ...config.creatures.map((c) => ({ ...c, category: 'creatures' })),
        ...config.minerals.map((m) => ({ ...m, category: 'minerals' })),
        ...config.plants.map((p) => ({ ...p, category: 'plants' })),
        ...config.artifacts.map((a) => ({ ...a, category: 'artifacts' })),
      ];

      if (entries.length > 0) {
        it.each(entries.map((e) => [biome, e.category, e.id] as const))(
          'BIOME_SPAWN_CONFIGS["%s"].%s entity "%s" exists in EntityRegistry',
          (b, category, entityId) => {
            expect(
              EntityRegistry.has(entityId),
              `BIOME_SPAWN_CONFIGS["${b}"].${category} references entity "${entityId}" which does not exist in EntityRegistry. Check packages/entities/src/definitions/ for valid entity IDs`
            ).toBe(true);
          }
        );
      }
    }
  });

  describe('No biome has completely empty entity lists', () => {
    it.each(allBiomes.map((b) => [b] as const))(
      'biome "%s" has at least one spawnable entity type',
      (biome) => {
        const config = BIOME_SPAWN_CONFIGS[biome];
        const totalEntities =
          config.creatures.length +
          config.plants.length +
          config.minerals.length;
        expect(
          totalEntities,
          `Biome "${biome}" has no creatures, plants, or minerals in its spawn config — it would be completely lifeless`
        ).toBeGreaterThan(0);
      }
    );
  });

  describe('Rarity system mineral IDs reference registered entities', () => {
    const allRarityEntries = Object.entries(RARITY_SYSTEM_MINERALS).flatMap(
      ([biome, ids]) => ids.map((id) => [biome, id] as const)
    );

    it.each(allRarityEntries)(
      'rarity mineral "%s" → "%s" exists in EntityRegistry',
      (biome, entityId) => {
        expect(
          EntityRegistry.has(entityId),
          `RARITY_SYSTEM_MINERALS["${biome}"] references entity "${entityId}" which does not exist in EntityRegistry. Update the inline mapping in spawn-configs.test.ts or add the entity definition`
        ).toBe(true);
      }
    );
  });

  describe('Spawn config value ranges are valid', () => {
    for (const biome of allBiomes) {
      const config = BIOME_SPAWN_CONFIGS[biome];

      describe(`biome "${biome}"`, () => {
        if (config.creatures.length > 0) {
          it.each(config.creatures.map((c) => [c.id, c] as const))(
            'creature "%s" has valid weight and level range',
            (id, creature) => {
              expect(
                creature.weight,
                `BIOME_SPAWN_CONFIGS["${biome}"].creatures "${id}" has weight ${creature.weight} — must be > 0`
              ).toBeGreaterThan(0);
              expect(
                creature.minLevel,
                `BIOME_SPAWN_CONFIGS["${biome}"].creatures "${id}" has minLevel ${creature.minLevel} — must be >= 1`
              ).toBeGreaterThanOrEqual(1);
              expect(
                creature.maxLevel,
                `BIOME_SPAWN_CONFIGS["${biome}"].creatures "${id}" has maxLevel ${creature.maxLevel} < minLevel ${creature.minLevel}`
              ).toBeGreaterThanOrEqual(creature.minLevel);
            }
          );
        }

        if (config.minerals.length > 0) {
          it.each(config.minerals.map((m) => [m.id, m] as const))(
            'mineral "%s" has valid weight and rarity',
            (id, mineral) => {
              expect(
                mineral.weight,
                `BIOME_SPAWN_CONFIGS["${biome}"].minerals "${id}" has weight ${mineral.weight} — must be > 0`
              ).toBeGreaterThan(0);
              expect(
                mineral.rarity,
                `BIOME_SPAWN_CONFIGS["${biome}"].minerals "${id}" has rarity ${mineral.rarity} — must be >= 1`
              ).toBeGreaterThanOrEqual(1);
            }
          );
        }

        if (config.plants.length > 0) {
          it.each(config.plants.map((p) => [p.id, p] as const))(
            'plant "%s" has valid weight',
            (id, plant) => {
              expect(
                plant.weight,
                `BIOME_SPAWN_CONFIGS["${biome}"].plants "${id}" has weight ${plant.weight} — must be > 0`
              ).toBeGreaterThan(0);
            }
          );
        }

        if (config.artifacts.length > 0) {
          it.each(config.artifacts.map((a) => [a.id, a] as const))(
            'artifact "%s" has valid weight',
            (id, artifact) => {
              expect(
                artifact.weight,
                `BIOME_SPAWN_CONFIGS["${biome}"].artifacts "${id}" has weight ${artifact.weight} — must be > 0`
              ).toBeGreaterThan(0);
            }
          );
        }

        it('has positive density values', () => {
          expect(
            config.creatureDensity,
            `Biome "${biome}" has creatureDensity ${config.creatureDensity} — must be > 0`
          ).toBeGreaterThan(0);
          expect(
            config.mineralDensity,
            `Biome "${biome}" has mineralDensity ${config.mineralDensity} — must be > 0`
          ).toBeGreaterThan(0);
          expect(
            config.plantDensity,
            `Biome "${biome}" has plantDensity ${config.plantDensity} — must be > 0`
          ).toBeGreaterThan(0);
        });
      });
    }
  });
});
