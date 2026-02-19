// Types
export type {
  NpcType,
  NpcFaction,
  DialogueLine,
  TradeItem,
  BaseNpcDefinition,
  TraderDefinition,
  GuardDefinition,
  FactionRepDefinition,
  AmbientDefinition,
  ServiceDefinition,
  NpcDefinition,
} from './types';

// Registry
export { NpcRegistry } from './registry';

// Definitions
export { ALL_NPCS, VERDANT_NPCS, HELIX_NPCS, NEXUS_NPCS, NEUTRAL_NPCS } from './definitions';

// Register all NPCs on module load
import { NpcRegistry } from './registry';
import { ALL_NPCS } from './definitions';
NpcRegistry.registerAll(ALL_NPCS);
