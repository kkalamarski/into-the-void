import { create } from 'zustand';
import { gameSocket } from '../network/socket';
import type { ZoneMasteryProgress, MasteryTier, MasteryReward } from '@into-the-void/shared-types';

interface MasteryCompletionBanner {
  biome: string;
  tier: MasteryTier;
  rewards: MasteryReward[];
  id: string;
}

interface ZoneMasteryState {
  currentBiome: string | null;
  masteryProgress: Map<string, ZoneMasteryProgress>;
  completionBanners: MasteryCompletionBanner[];

  setCurrentBiome: (biome: string | null) => void;
  updateProgress: (biome: string, progress: ZoneMasteryProgress) => void;
  addCompletionBanner: (biome: string, tier: MasteryTier, rewards: MasteryReward[]) => void;
  removeCompletionBanner: (id: string) => void;
  getCurrentProgress: () => ZoneMasteryProgress | null;
  getProgressPercentage: (progress: ZoneMasteryProgress) => number;
  initializeMastery: (progressMap: Map<string, ZoneMasteryProgress>) => void;
}

export const useZoneMasteryStore = create<ZoneMasteryState>((set, get) => ({
  currentBiome: null,
  masteryProgress: new Map(),
  completionBanners: [],

  setCurrentBiome: (biome) =>
    set({ currentBiome: biome }),

  updateProgress: (biome, progress) =>
    set((state) => {
      const newMap = new Map(state.masteryProgress);
      newMap.set(biome, progress);
      return { masteryProgress: newMap };
    }),

  addCompletionBanner: (biome, tier, rewards) => {
    const id = `${biome}-${tier}-${Date.now()}`;
    set((state) => ({
      completionBanners: [...state.completionBanners.slice(-2), { biome, tier, rewards, id }],
    }));
    setTimeout(() => {
      get().removeCompletionBanner(id);
    }, 5000);
  },

  removeCompletionBanner: (id) =>
    set((state) => ({
      completionBanners: state.completionBanners.filter((b) => b.id !== id),
    })),

  getCurrentProgress: () => {
    const state = get();
    if (!state.currentBiome) return null;
    return state.masteryProgress.get(state.currentBiome) ?? null;
  },

  getProgressPercentage: (progress) => {
    if (!progress.objectives || progress.objectives.length === 0) return 0;
    const total = progress.objectives.reduce((sum, o) => sum + o.required, 0);
    const current = progress.objectives.reduce((sum, o) => sum + Math.min(o.current, o.required), 0);
    return Math.round((current / total) * 100);
  },

  initializeMastery: (progressMap) =>
    set({ masteryProgress: progressMap }),
}));

// Wire socket events
gameSocket.on('mastery:progress', (data: { biome: string; progress: ZoneMasteryProgress }) => {
  useZoneMasteryStore.getState().updateProgress(data.biome, data.progress);
});

gameSocket.on('mastery:completed', (data: { biome: string; tier: MasteryTier; rewards: MasteryReward[] }) => {
  useZoneMasteryStore.getState().addCompletionBanner(data.biome, data.tier, data.rewards);
});
