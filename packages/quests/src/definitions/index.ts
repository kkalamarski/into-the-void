import { TUTORIAL_QUESTS } from './tutorial';
import { VERDANT_QUESTS } from './verdant';
import { HELIX_QUESTS } from './helix';
import { NEXUS_QUESTS } from './nexus';
import type { QuestDefinition } from '../types';

export { TUTORIAL_QUESTS } from './tutorial';
export { VERDANT_QUESTS } from './verdant';
export { HELIX_QUESTS } from './helix';
export { NEXUS_QUESTS } from './nexus';

/** All quest definitions combined for registry initialization */
export const ALL_QUESTS: readonly QuestDefinition[] = [
  ...TUTORIAL_QUESTS,
  ...VERDANT_QUESTS,
  ...HELIX_QUESTS,
  ...NEXUS_QUESTS,
];
