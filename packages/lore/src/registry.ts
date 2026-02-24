import type { LoreFragment, LoreCategory } from '@into-the-void/shared-types';
import { WORLD_HISTORY_FRAGMENTS } from './fragments/world-history';
import { FACTION_LORE_FRAGMENTS } from './fragments/faction-lore';
import { ANCIENT_TECH_FRAGMENTS } from './fragments/ancient-tech';
import { BIOME_ECOLOGY_FRAGMENTS } from './fragments/biome-ecology';

const ALL_FRAGMENTS: LoreFragment[] = [
  ...WORLD_HISTORY_FRAGMENTS,
  ...FACTION_LORE_FRAGMENTS,
  ...ANCIENT_TECH_FRAGMENTS,
  ...BIOME_ECOLOGY_FRAGMENTS,
];

const fragmentsById = new Map<string, LoreFragment>();
const fragmentsByCategory = new Map<LoreCategory, LoreFragment[]>();
const fragmentsByBiome = new Map<string, LoreFragment[]>();

// Build indexes
for (const fragment of ALL_FRAGMENTS) {
  fragmentsById.set(fragment.id, fragment);

  // Index by category
  const catList = fragmentsByCategory.get(fragment.category) ?? [];
  catList.push(fragment);
  fragmentsByCategory.set(fragment.category, catList);

  // Index by biome
  if (fragment.biome) {
    const biomeList = fragmentsByBiome.get(fragment.biome) ?? [];
    biomeList.push(fragment);
    fragmentsByBiome.set(fragment.biome, biomeList);
  }
}

export const LoreRegistry = {
  get(id: string): LoreFragment | undefined {
    return fragmentsById.get(id);
  },

  getByCategory(category: LoreCategory): readonly LoreFragment[] {
    return fragmentsByCategory.get(category) ?? [];
  },

  getBiomeFragments(biome: string): readonly LoreFragment[] {
    return fragmentsByBiome.get(biome) ?? [];
  },

  getAll(): readonly LoreFragment[] {
    return ALL_FRAGMENTS;
  },

  count(): number {
    return ALL_FRAGMENTS.length;
  },
} as const;
