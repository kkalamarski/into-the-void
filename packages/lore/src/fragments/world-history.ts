import type { LoreFragment } from '@into-the-void/shared-types';

export const WORLD_HISTORY_FRAGMENTS: readonly LoreFragment[] = [
  {
    id: 'lore_world_collapse_01',
    title: 'The Collapse',
    category: 'world_history',
    content: `No one alive remembers what truly ended Earth. The records are fragmented, contradictory, classified, or simply lost. Some archives speak of resource wars. Others mention environmental cascade failures. A few encrypted files reference something called "The Silence" — but their contents were never recovered.

What is known: Earth is gone. Not destroyed — just... empty. The last probe to return from Sol showed cities standing, oceans still blue, forests still green. But no signals. No life signs. No explanation.

Humanity doesn't speak of Earth anymore. It's considered bad luck.`,
    xpReward: 50,
  },
  {
    id: 'lore_world_scattering_01',
    title: 'The Scattering',
    category: 'world_history',
    content: `Humanity survived in fragments. Generation ships. Orbital stations. Hastily terraformed moons. Mining outposts that became permanent by necessity. Twelve major colonies emerged, connected by months-long trade routes and years-long communication delays.

Each colony developed independently. Cultures diverged. Languages shifted. But one thing remained constant: resources were finite, populations grew, and the colonies were dying — slowly, but certainly.

By 3000 CE, the Twelve Colonies had become the Eight. Then the Six.`,
    xpReward: 50,
  },
  {
    id: 'lore_world_terminus_discovery',
    title: 'The Discovery of Terminus',
    category: 'world_history',
    content: `The long-range probe Orpheus-7 was one of thousands sent into unexplored space over centuries. Most never returned. Orpheus-7 was different.

It found a planet in a region of space so empty it had been marked on charts simply as "The Void" — a starless gap between spiral arms where nothing should exist. And yet, there it was: a world with breathable atmosphere, liquid water, and — impossibly — ruins.

Someone had been there before. The ICC classified the discovery immediately.`,
    biome: 'void_plains',
    xpReward: 75,
  },
] as const;
