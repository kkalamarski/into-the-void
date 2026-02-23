import type { LoreFragment } from '@into-the-void/shared-types';

export const FACTION_LORE_FRAGMENTS: readonly LoreFragment[] = [
  {
    id: 'lore_faction_verdant_01',
    title: 'Verdant Dynamics: The Green Promise',
    category: 'faction_lore',
    content: `Verdant Dynamics rose from the agricultural colonies — worlds where every plant was engineered, every calorie optimized. They promised sustainability when others promised profit. On Terminus, they saw the ultimate laboratory.

Their scientists speak of "ecological harmony" while their security teams patrol biome boundaries. They collect samples of every organism, sequence every genome, and file patents on life forms that existed millions of years before humanity.

The other corporations call them naive. Verdant calls everyone else shortsighted.`,
    biome: 'fungal_forest',
    xpReward: 50,
  },
  {
    id: 'lore_faction_helix_01',
    title: 'Helix Extraction: Deep Core',
    category: 'faction_lore',
    content: `Helix Extraction built the machinery that kept the colonies alive. Atmosphere processors. Water recyclers. Mining rigs that could crack asteroids. When the colonies were dying, Helix was the last corporation turning a profit.

On Terminus, they see resources measured in centuries. Mineral deposits that dwarf anything in known space. Energy signatures that could power civilizations. And ruins filled with technology beyond current understanding.

Helix doesn't care about the ruins' origins. They care about extraction rates.`,
    biome: 'volcanic_ridge',
    xpReward: 50,
  },
  {
    id: 'lore_faction_nexus_01',
    title: 'Nexus Frontiers: The Edge',
    category: 'faction_lore',
    content: `Nexus Frontiers was founded by the colonists who refused to wait for the megacorporations to save humanity. They built generation ships from scrap. They terraformed inhospitable moons through sheer stubbornness. They survived in places others called impossible.

On Terminus, Nexus operates at the edges — the hostile zones the other corporations consider too dangerous. They explore the deepest ruins, harvest from the most alien ecosystems, and push into territories marked "No Return" on corporate maps.

Their motto is simple: "Fortune Favors the Fearless." Their mortality rate proves it.`,
    biome: 'ancient_ruins',
    xpReward: 50,
  },
] as const;
