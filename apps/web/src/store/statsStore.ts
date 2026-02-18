import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { CharStatsPayload } from '@into-the-void/shared-types';
import { gameSocket } from '../network/socket';

interface StatsState {
  stats: CharStatsPayload | null;
  setStats: (payload: CharStatsPayload) => void;
  clearStats: () => void;
}

export const useStatsStore = create<StatsState>()(
  immer((set) => ({
    stats: null,

    setStats: (payload: CharStatsPayload) =>
      set((state) => {
        state.stats = payload;
      }),

    clearStats: () =>
      set((state) => {
        state.stats = null;
      }),
  }))
);

// Wire socket event: update stats state on server push
gameSocket.on('stats:update', (payload: CharStatsPayload) => {
  useStatsStore.getState().setStats(payload);
});
