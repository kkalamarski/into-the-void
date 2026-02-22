import { create } from 'zustand';
import { gameSocket } from '../network/socket';
import { useGameStore } from './gameStore';
import { useEntityStore } from './entityStore';

export interface CombatLogEntry {
  id: string;
  timestamp: number;      // Unix timestamp for formatting
  type: 'dealt' | 'received';
  damage: number;
  targetName: string;     // Creature name for dealt, attacker name for received
  critical: boolean;
  killed: boolean;
}

interface CombatLogState {
  entries: CombatLogEntry[];
  visible: boolean;
  maxEntries: number;
  addEntry: (entry: Omit<CombatLogEntry, 'id'>) => void;
  toggleVisible: () => void;
  clearLog: () => void;
}

export const useCombatLogStore = create<CombatLogState>((set, get) => ({
  entries: [],
  visible: true,  // Default visible; persists via toggle
  maxEntries: 100,

  addEntry: (entry) => set((state) => {
    const newEntry: CombatLogEntry = {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    // Keep only last maxEntries
    const updated = [...state.entries, newEntry].slice(-state.maxEntries);
    return { entries: updated };
  }),

  toggleVisible: () => set((state) => ({ visible: !state.visible })),

  clearLog: () => set({ entries: [] }),
}));

// Format timestamp as [MM:SS] for display
export function formatCombatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `[${minutes}:${seconds}]`;
}

// Wire combat:damage socket event to add log entries
gameSocket.on('combat:damage', (data: {
  attackerId: string;
  attackerName?: string;
  defenderId: string;
  defenderName?: string;
  damage: number;
  defenderHealth: number;
  defenderMaxHealth: number;
  critical: boolean;
  killed: boolean;
}) => {
  const currentPlayer = useGameStore.getState().player;
  if (!currentPlayer) return;

  const entities = useEntityStore.getState().entities;

  // Determine if this is damage dealt or received
  if (data.attackerId === currentPlayer.id) {
    // Player dealt damage to creature - prefer name from payload, fallback to entity lookup
    const targetName = data.defenderName ?? entities.get(data.defenderId)?.name ?? 'Unknown';

    useCombatLogStore.getState().addEntry({
      timestamp: Date.now(),
      type: 'dealt',
      damage: data.damage,
      targetName,
      critical: data.critical,
      killed: data.killed,
    });
  } else if (data.defenderId === currentPlayer.id) {
    // Player received damage from creature - prefer name from payload, fallback to entity lookup
    const attackerName = data.attackerName ?? entities.get(data.attackerId)?.name ?? 'Unknown';

    useCombatLogStore.getState().addEntry({
      timestamp: Date.now(),
      type: 'received',
      damage: data.damage,
      targetName: attackerName,
      critical: data.critical,
      killed: data.killed,
    });
  }
  // If neither attacker nor defender is current player, ignore (other player's combat)
});
