import { create } from 'zustand';
import { gameSocket } from '../network/socket';
import type { LiquidUpdatePayload, LiquidDamagePayload, LiquidHealPayload } from '@into-the-void/shared-types';

interface LiquidStore {
  /** Whether a liquid effect is currently active */
  active: boolean;
  /** Liquid tile ID (e.g., 'magma', 'luminous_nectar') */
  liquidTileId: string | null;
  /** Display name (e.g., "Magma", "Luminous Nectar") */
  displayName: string | null;
  /** Hex color number from tile definition */
  color: number | null;
  /** Movement speed multiplier while in liquid */
  speedMultiplier: number;
  /** Damage per tick (0 = no damage) */
  damagePerTick: number;
  /** Heal per tick (0 = no healing) */
  healPerTick: number;

  setLiquidState: (data: LiquidUpdatePayload) => void;
  clear: () => void;
}

export const useLiquidStore = create<LiquidStore>((set) => ({
  active: false,
  liquidTileId: null,
  displayName: null,
  color: null,
  speedMultiplier: 1.0,
  damagePerTick: 0,
  healPerTick: 0,

  setLiquidState: (data: LiquidUpdatePayload) => {
    if (!data.active) {
      set({
        active: false,
        liquidTileId: null,
        displayName: null,
        color: null,
        speedMultiplier: 1.0,
        damagePerTick: 0,
        healPerTick: 0,
      });
      return;
    }
    set({
      active: true,
      liquidTileId: data.liquidTileId ?? null,
      displayName: data.displayName ?? null,
      color: data.color ?? null,
      speedMultiplier: data.speedMultiplier ?? 1.0,
      damagePerTick: data.damagePerTick ?? 0,
      healPerTick: data.healPerTick ?? 0,
    });
  },

  clear: () =>
    set({
      active: false,
      liquidTileId: null,
      displayName: null,
      color: null,
      speedMultiplier: 1.0,
      damagePerTick: 0,
      healPerTick: 0,
    }),
}));

// Wire socket events at module level (same pattern as hazardStore, buffStore)
gameSocket.on('liquid:update', (data: LiquidUpdatePayload) => {
  useLiquidStore.getState().setLiquidState(data);
});

gameSocket.on('liquid:damage', (_data: LiquidDamagePayload) => {
  // Damage numbers handled in gameStore (same pattern as combat:damage)
  // This listener ensures the event is processed — actual floating numbers
  // are triggered from the gameStore handler below
});

gameSocket.on('liquid:heal', (_data: LiquidHealPayload) => {
  // Heal numbers handled in gameStore (same pattern as combat:damage)
});
