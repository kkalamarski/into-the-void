// Types
export type {
  EntityDefinition,
  CreatureDefinition,
  PlantDefinition,
  MineralDefinition,
  ArtifactDefinition,
  EntityClass,
  HarvestYield,
} from './types';

// Registry
export { EntityRegistry } from './registry';

// Definitions
export { ALL_ENTITIES, ENTITY_IDS } from './definitions';
export * from './definitions';

// Register all entities on module load
import { EntityRegistry } from './registry';
import { ALL_ENTITIES } from './definitions';
EntityRegistry.registerAll(ALL_ENTITIES);
