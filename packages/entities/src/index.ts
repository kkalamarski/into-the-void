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

// Definitions will be added in Plan 33-03
// export { ALL_ENTITIES, ENTITY_IDS } from './definitions';
// export * from './definitions';

// Note: Registration happens in Plan 33-03 after definitions are created
// import { EntityRegistry } from './registry';
// import { ALL_ENTITIES } from './definitions';
// EntityRegistry.registerAll(ALL_ENTITIES);
