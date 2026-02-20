import { create } from 'zustand';
import { gameSocket } from '../network/socket';

/**
 * Client-side buff representation for UI display.
 */
export interface ClientBuff {
  /** Unique buff instance ID */
  id: string;
  /** Display name for tooltip (ability name) */
  displayName: string;
  /** Stat being modified (e.g., 'toughness', 'power') */
  stat: string;
  /** Amount added to stat (positive for buff, negative for debuff) */
  amount: number;
  /** Timestamp when buff expires */
  expiresAt: number;
  /** Icon background color (hex number) */
  iconColor: number;
}

interface BuffState {
  /** Active buffs indexed by buffId */
  buffs: Map<string, ClientBuff>;

  /** Add or update a buff */
  addBuff: (buff: ClientBuff) => void;

  /** Remove a buff by ID */
  removeBuff: (buffId: string) => void;

  /** Get all buffs as array (for rendering) */
  getBuffs: () => ClientBuff[];

  /** Clear all buffs (e.g., on death/disconnect) */
  clearBuffs: () => void;
}

export const useBuffStore = create<BuffState>((set, get) => ({
  buffs: new Map(),

  addBuff: (buff) =>
    set((state) => {
      const newBuffs = new Map(state.buffs);
      newBuffs.set(buff.id, buff);
      return { buffs: newBuffs };
    }),

  removeBuff: (buffId) =>
    set((state) => {
      const newBuffs = new Map(state.buffs);
      newBuffs.delete(buffId);
      return { buffs: newBuffs };
    }),

  getBuffs: () => Array.from(get().buffs.values()),

  clearBuffs: () => set({ buffs: new Map() }),
}));

// Wire socket events at module level
gameSocket.on('buff:apply', (data) => {
  useBuffStore.getState().addBuff({
    id: data.buffId,
    displayName: data.displayName,
    stat: data.stat,
    amount: data.amount,
    expiresAt: data.expiresAt,
    iconColor: data.iconColor,
  });
});

gameSocket.on('buff:expire', (data) => {
  useBuffStore.getState().removeBuff(data.buffId);
});

gameSocket.on('player:death', () => {
  useBuffStore.getState().clearBuffs();
});
