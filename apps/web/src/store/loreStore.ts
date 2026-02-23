import { create } from 'zustand';
import { gameSocket } from '../network/socket';
import type { CollectedLoreEntry, LoreCategory } from '@into-the-void/shared-types';

interface LoreState {
  collectedLore: CollectedLoreEntry[];
  isCodexOpen: boolean;
  selectedCategory: LoreCategory | 'all';
  selectedLoreId: string | null;

  addCollectedLore: (entry: CollectedLoreEntry) => void;
  markAsRead: (loreId: string) => void;
  toggleCodex: () => void;
  setSelectedCategory: (category: LoreCategory | 'all') => void;
  setSelectedLore: (loreId: string | null) => void;
  getUnreadCount: () => number;
  initializeLore: (entries: CollectedLoreEntry[]) => void;
}

export const useLoreStore = create<LoreState>((set, get) => ({
  collectedLore: [],
  isCodexOpen: false,
  selectedCategory: 'all',
  selectedLoreId: null,

  addCollectedLore: (entry) =>
    set((state) => ({
      collectedLore: [...state.collectedLore, entry],
    })),

  markAsRead: (loreId) =>
    set((state) => ({
      collectedLore: state.collectedLore.map((e) =>
        e.loreId === loreId ? { ...e, isRead: true } : e
      ),
    })),

  toggleCodex: () =>
    set((state) => ({ isCodexOpen: !state.isCodexOpen })),

  setSelectedCategory: (category) =>
    set({ selectedCategory: category, selectedLoreId: null }),

  setSelectedLore: (loreId) =>
    set({ selectedLoreId: loreId }),

  getUnreadCount: () => {
    return get().collectedLore.filter((e) => !e.isRead).length;
  },

  initializeLore: (entries) =>
    set({ collectedLore: entries }),
}));

// Wire socket events at module level
gameSocket.on('lore:collected', (data: { loreId: string; title: string; category: string; xpReward: number }) => {
  useLoreStore.getState().addCollectedLore({
    loreId: data.loreId,
    collectedAt: Date.now(),
    isRead: false,
  });
});

// Keyboard handler for L key
export function handleLoreHotkey(e: KeyboardEvent): void {
  if (e.key === 'l' || e.key === 'L') {
    if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
      return;
    }
    useLoreStore.getState().toggleCodex();
  }
}
