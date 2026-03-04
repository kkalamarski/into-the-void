import { create } from 'zustand';
import { gameSocket } from '../network/socket';

interface HazardStore {
  /** Whether a hazard is currently active */
  active: boolean;
  /** Hazard type identifier (e.g., 'chemical', 'thermal') */
  hazardType: string | null;
  /** Display name (e.g., "Chemical Hazard") */
  displayName: string | null;
  /** Hex color for HUD rendering */
  color: string | null;
  /** Protection percentage 0-100 */
  protectionPercent: number;
  /** Biome tier */
  tier: number | null;
  /** Whether in 3-second grace period */
  inGracePeriod: boolean;
  /** Tier IV stack count */
  stackCount: number;
  /** Last damage received (for floating number display) */
  lastDamage: number | null;

  setHazardState: (data: {
    active: boolean;
    hazardType?: string;
    displayName?: string;
    color?: string;
    protectionPercent: number;
    tier?: number;
    inGracePeriod?: boolean;
    stackCount?: number;
  }) => void;

  setDamage: (damage: number) => void;

  clear: () => void;
}

export const useHazardStore = create<HazardStore>((set) => ({
  active: false,
  hazardType: null,
  displayName: null,
  color: null,
  protectionPercent: 0,
  tier: null,
  inGracePeriod: false,
  stackCount: 0,
  lastDamage: null,

  setHazardState: (data) =>
    set({
      active: data.active,
      hazardType: data.hazardType ?? null,
      displayName: data.displayName ?? null,
      color: data.color ?? null,
      protectionPercent: data.protectionPercent,
      tier: data.tier ?? null,
      inGracePeriod: data.inGracePeriod ?? false,
      stackCount: data.stackCount ?? 0,
    }),

  setDamage: (damage) => set({ lastDamage: damage }),

  clear: () =>
    set({
      active: false,
      hazardType: null,
      displayName: null,
      color: null,
      protectionPercent: 0,
      tier: null,
      inGracePeriod: false,
      stackCount: 0,
      lastDamage: null,
    }),
}));

// Wire socket events at module level (same pattern as shieldStore, buffStore)
gameSocket.on('hazard:update', (data) => {
  useHazardStore.getState().setHazardState(data);
});

gameSocket.on('hazard:damage', (data) => {
  useHazardStore.getState().setDamage(data.damage);
});

gameSocket.on('hazard:clear', () => {
  useHazardStore.getState().clear();
});

gameSocket.on('player:death', () => {
  useHazardStore.getState().clear();
});
