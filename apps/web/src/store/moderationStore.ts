import { create } from 'zustand';
import { apiCall } from '../utils/api';
import { useGameStore } from './gameStore';

interface MuteResponse {
  id: string;
  characterId: string;
  mutedCharacterId: string;
  createdAt: string;
}

interface BlockResponse {
  id: string;
  characterId: string;
  blockedCharacterId: string;
  createdAt: string;
}

interface ModerationState {
  mutedIds: Set<string>;
  blockedIds: Set<string>;
  loaded: boolean;

  loadModeration: () => Promise<void>;
  addMute: (targetCharacterId: string) => Promise<void>;
  removeMute: (targetCharacterId: string) => Promise<void>;
  addBlock: (targetCharacterId: string) => Promise<void>;
  removeBlock: (targetCharacterId: string) => Promise<void>;
  isMuted: (characterId: string) => boolean;
  isBlocked: (characterId: string) => boolean;
  reset: () => void;
}

export const useModerationStore = create<ModerationState>((set, get) => ({
  mutedIds: new Set<string>(),
  blockedIds: new Set<string>(),
  loaded: false,

  loadModeration: async () => {
    const player = useGameStore.getState().player;
    if (!player) return;

    try {
      const [mutes, blocks] = await Promise.all([
        apiCall<MuteResponse[]>(`/moderation/mutes/${player.id}`),
        apiCall<BlockResponse[]>(`/moderation/blocks/${player.id}`),
      ]);

      set({
        mutedIds: new Set(mutes.map((m) => m.mutedCharacterId)),
        blockedIds: new Set(blocks.map((b) => b.blockedCharacterId)),
        loaded: true,
      });
    } catch (error) {
      console.error('[moderationStore] Failed to load moderation data:', error);
      // Graceful degradation: mark as loaded so we don't retry endlessly
      set({ loaded: true });
    }
  },

  addMute: async (targetCharacterId: string) => {
    const player = useGameStore.getState().player;
    if (!player) return;

    try {
      await apiCall('/moderation/mutes', {
        method: 'POST',
        body: JSON.stringify({ characterId: player.id, targetCharacterId }),
      });

      set((state) => ({
        mutedIds: new Set([...state.mutedIds, targetCharacterId]),
      }));
    } catch (error) {
      console.error('[moderationStore] Failed to mute player:', error);
    }
  },

  removeMute: async (targetCharacterId: string) => {
    const player = useGameStore.getState().player;
    if (!player) return;

    try {
      await apiCall(`/moderation/mutes/${player.id}/${targetCharacterId}`, {
        method: 'DELETE',
      });

      set((state) => {
        const newMutedIds = new Set(state.mutedIds);
        newMutedIds.delete(targetCharacterId);
        return { mutedIds: newMutedIds };
      });
    } catch (error) {
      console.error('[moderationStore] Failed to unmute player:', error);
    }
  },

  addBlock: async (targetCharacterId: string) => {
    const player = useGameStore.getState().player;
    if (!player) return;

    try {
      await apiCall('/moderation/blocks', {
        method: 'POST',
        body: JSON.stringify({ characterId: player.id, targetCharacterId }),
      });

      set((state) => ({
        blockedIds: new Set([...state.blockedIds, targetCharacterId]),
      }));
    } catch (error) {
      console.error('[moderationStore] Failed to block player:', error);
    }
  },

  removeBlock: async (targetCharacterId: string) => {
    const player = useGameStore.getState().player;
    if (!player) return;

    try {
      await apiCall(`/moderation/blocks/${player.id}/${targetCharacterId}`, {
        method: 'DELETE',
      });

      set((state) => {
        const newBlockedIds = new Set(state.blockedIds);
        newBlockedIds.delete(targetCharacterId);
        return { blockedIds: newBlockedIds };
      });
    } catch (error) {
      console.error('[moderationStore] Failed to unblock player:', error);
    }
  },

  isMuted: (characterId: string) => get().mutedIds.has(characterId),

  isBlocked: (characterId: string) => get().blockedIds.has(characterId),

  reset: () => set({ mutedIds: new Set<string>(), blockedIds: new Set<string>(), loaded: false }),
}));

// Auto-load moderation state when player is set (game session starts)
// Uses Zustand subscribe to react to player state changes
useGameStore.subscribe((state) => {
  const player = state.player;
  const { loaded, loadModeration } = useModerationStore.getState();
  if (player && !loaded) {
    loadModeration();
  }
});
