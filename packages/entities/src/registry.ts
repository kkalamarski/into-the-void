import type { EntityDefinition, EntityClass } from './types';
import type { BiomeType } from '@into-the-void/shared-types';

/**
 * Fallback entity for unknown IDs - prevents crashes
 */
const UNKNOWN_ENTITY: EntityDefinition = {
  id: 'unknown',
  displayName: 'Unknown Entity',
  description: 'Unknown entity. This should not appear in normal gameplay.',
  entityClass: 'creature',
  biomes: [],
  textureKey: 'entity_unknown',
  color: 0xff00ff, // Magenta - obvious error color
  lootTableId: 'loot_empty',
  behavior: 'herbivore',
  baseHealth: 1,
  levelRange: [1, 1],
  baseXp: 0,
  respawnSeconds: 60,
};

/**
 * Entity registry - singleton for entity definition lookups.
 * Mirrors ItemRegistryImpl pattern from packages/items.
 */
class EntityRegistryImpl {
  private readonly entities: Map<string, EntityDefinition> = new Map();

  /**
   * Register an entity definition.
   * @internal Used during static initialization
   */
  register(entity: EntityDefinition): void {
    if (this.entities.has(entity.id)) {
      console.warn(`Entity ID "${entity.id}" already registered, overwriting`);
    }
    this.entities.set(entity.id, entity);
  }

  /**
   * Register multiple entity definitions.
   * @internal Used during static initialization
   */
  registerAll(entities: readonly EntityDefinition[]): void {
    for (const entity of entities) {
      this.register(entity);
    }
  }

  /**
   * Get entity definition by ID.
   * Returns fallback 'unknown' entity with console warning if not found.
   */
  get(id: string): EntityDefinition {
    const entity = this.entities.get(id);
    if (!entity) {
      console.warn(`Unknown entity ID: "${id}", using fallback`);
      return UNKNOWN_ENTITY;
    }
    return entity;
  }

  /**
   * Check if entity ID exists without triggering fallback.
   */
  has(id: string): boolean {
    return this.entities.has(id);
  }

  /**
   * Get all registered entity IDs.
   */
  getAllIds(): string[] {
    return Array.from(this.entities.keys());
  }

  /**
   * Get all entities that can spawn in a specific biome.
   */
  getByBiome(biome: BiomeType): EntityDefinition[] {
    return Array.from(this.entities.values()).filter((e) =>
      e.biomes.includes(biome)
    );
  }

  /**
   * Get all entities of a specific class.
   */
  getByClass(entityClass: EntityClass): EntityDefinition[] {
    return Array.from(this.entities.values()).filter(
      (e) => e.entityClass === entityClass
    );
  }

  /**
   * Get count of registered entities.
   */
  get size(): number {
    return this.entities.size;
  }
}

/** Singleton registry instance */
export const EntityRegistry = new EntityRegistryImpl();
