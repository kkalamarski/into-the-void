import { create } from 'zustand';
import { gameSocket } from '../network/socket';

interface ShieldState {
  /** Current shield remaining HP */
  remaining: number;
  /** Maximum shield absorb amount */
  maxAbsorb: number;
  /** Timestamp when shield expires */
  expiresAt: number;
  /** Whether shield is active */
  active: boolean;

  applyShield: (absorbAmount: number, durationMs: number, expiresAt: number) => void;
  absorbDamage: (absorbed: number, remaining: number, maxAbsorb: number) => void;
  expireShield: () => void;
  clearShield: () => void;
}

export const useShieldStore = create<ShieldState>((set) => ({
  remaining: 0,
  maxAbsorb: 0,
  expiresAt: 0,
  active: false,

  applyShield: (absorbAmount, _durationMs, expiresAt) =>
    set({ remaining: absorbAmount, maxAbsorb: absorbAmount, expiresAt, active: true }),

  absorbDamage: (_absorbed, remaining, maxAbsorb) =>
    set({ remaining, maxAbsorb, active: remaining > 0 }),

  expireShield: () =>
    set({ remaining: 0, maxAbsorb: 0, expiresAt: 0, active: false }),

  clearShield: () =>
    set({ remaining: 0, maxAbsorb: 0, expiresAt: 0, active: false }),
}));

// Wire socket events
gameSocket.on('shield:apply', (data: { absorbAmount: number; durationMs: number; expiresAt: number }) => {
  useShieldStore.getState().applyShield(data.absorbAmount, data.durationMs, data.expiresAt);
});

gameSocket.on('shield:absorb', (data: { absorbed: number; remaining: number; maxAbsorb: number }) => {
  useShieldStore.getState().absorbDamage(data.absorbed, data.remaining, data.maxAbsorb);
});

gameSocket.on('shield:expire', () => {
  useShieldStore.getState().expireShield();
});

gameSocket.on('player:death', () => {
  useShieldStore.getState().clearShield();
});
