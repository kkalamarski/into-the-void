import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { CharStatsPayload, CharacterStats } from '@into-the-void/shared-types';
import { gameSocket } from '../network/socket';
import { STAT_DISPLAY_ORDER } from '../ui/constants';
import { useGameStore } from './gameStore';

interface StatsState {
  stats: CharStatsPayload | null;
  levelUpDeltas: Partial<CharacterStats> | null;
  setStats: (payload: CharStatsPayload) => void;
  clearStats: () => void;
  clearLevelUpDeltas: () => void;
}

export const useStatsStore = create<StatsState>()(
  immer((set) => ({
    stats: null,
    levelUpDeltas: null,

    setStats: (payload: CharStatsPayload) =>
      set((state) => {
        // Detect level-up by checking if level actually increased
        if (state.stats !== null && payload.level > state.stats.level) {
          const deltas: Partial<CharacterStats> = {};
          for (const { key } of STAT_DISPLAY_ORDER) {
            const prev = state.stats.base[key];
            const next = payload.base[key];
            if (next > prev) {
              deltas[key] = next - prev;
            }
          }
          if (Object.keys(deltas).length > 0) {
            state.levelUpDeltas = deltas;
          }
        }
        state.stats = payload;
      }),

    clearStats: () =>
      set((state) => {
        state.stats = null;
      }),

    clearLevelUpDeltas: () =>
      set((state) => {
        state.levelUpDeltas = null;
      }),
  }))
);

// Wire socket event: update stats state on server push
gameSocket.on('stats:update', (payload: CharStatsPayload) => {
  useStatsStore.getState().setStats(payload);

  // Update player's maxHealth based on durability stat (durability = maxHealth)
  const player = useGameStore.getState().player;
  if (player && payload.total.durability !== player.maxHealth) {
    useGameStore.setState({
      player: {
        ...player,
        maxHealth: payload.total.durability,
        // Cap current health if it exceeds new max
        health: Math.min(player.health, payload.total.durability),
      },
    });
  }
});
