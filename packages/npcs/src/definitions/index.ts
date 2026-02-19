import { VERDANT_NPCS } from './verdant';
import { HELIX_NPCS } from './helix';
import { NEXUS_NPCS } from './nexus';
import { NEUTRAL_NPCS } from './neutral';
import type { NpcDefinition } from '../types';

export { VERDANT_NPCS } from './verdant';
export { HELIX_NPCS } from './helix';
export { NEXUS_NPCS } from './nexus';
export { NEUTRAL_NPCS } from './neutral';

/** All NPC definitions combined for registry initialization */
export const ALL_NPCS: readonly NpcDefinition[] = [
  ...VERDANT_NPCS,
  ...HELIX_NPCS,
  ...NEXUS_NPCS,
  ...NEUTRAL_NPCS,
];
