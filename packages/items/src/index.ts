// Types
export type {
  ItemDefinition,
  ItemCategory,
  ItemRarity,
  ItemEffect,
  ItemEffectDef,
  EffectTrigger,
  EquipSlot,
  ToolType,
} from './types';

// Registry
export { ItemRegistry } from './registry';

// Utils
export { computeIlvl } from './utils';

// Definitions
export { ALL_ITEMS, ITEM_IDS } from './definitions';
export * from './definitions';

// Register all items on module load
import { ItemRegistry } from './registry';
import { ALL_ITEMS } from './definitions';
ItemRegistry.registerAll(ALL_ITEMS);
