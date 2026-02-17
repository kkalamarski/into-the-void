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

// NOTE: Auto-registration will be added in Plan 25-02 when definitions exist
// import { ItemRegistry } from './registry';
// import { ALL_ITEMS } from './definitions';
// ItemRegistry.registerAll(ALL_ITEMS);
