import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { gameSocket } from '../network/socket';
import { useInventoryStore } from './inventoryStore';
import { ItemRegistry } from '@into-the-void/items';
import { AbilityRegistry } from '@into-the-void/game-logic';
import type { AbilityDefinition } from '@into-the-void/shared-types';

interface ActiveCast {
  abilityId: string;
  targetEntityId?: string;
  castTimeMs: number;
  castEndsAt: number;
}

interface AbilityState {
  /** Cooldowns indexed by abilityId -> endsAt timestamp */
  cooldowns: Map<string, number>;
  /** Currently active cast (null if not casting) */
  activeCast: ActiveCast | null;
  /** Set cooldown for an ability */
  setCooldown: (abilityId: string, endsAt: number) => void;
  /** Check if ability is on cooldown */
  isOnCooldown: (abilityId: string) => boolean;
  /** Get remaining cooldown in ms (0 if not on cooldown) */
  getRemainingCooldown: (abilityId: string) => number;
  /** Clear expired cooldowns */
  clearExpiredCooldowns: () => void;
  /** Start a cast */
  startCast: (cast: ActiveCast) => void;
  /** Clear the active cast */
  clearCast: () => void;
  /** Check if currently casting */
  isCasting: () => boolean;
}

export const useAbilityStore = create<AbilityState>()(
  immer((set, get) => ({
    cooldowns: new Map(),
    activeCast: null,

    setCooldown: (abilityId: string, endsAt: number) =>
      set((state) => {
        state.cooldowns.set(abilityId, endsAt);
      }),

    isOnCooldown: (abilityId: string) => {
      const endsAt = get().cooldowns.get(abilityId);
      if (!endsAt) return false;
      return Date.now() < endsAt;
    },

    getRemainingCooldown: (abilityId: string) => {
      const endsAt = get().cooldowns.get(abilityId);
      if (!endsAt) return 0;
      return Math.max(0, endsAt - Date.now());
    },

    clearExpiredCooldowns: () =>
      set((state) => {
        const now = Date.now();
        for (const [id, endsAt] of state.cooldowns.entries()) {
          if (endsAt <= now) {
            state.cooldowns.delete(id);
          }
        }
      }),

    startCast: (cast: ActiveCast) =>
      set((state) => {
        state.activeCast = cast;
      }),

    clearCast: () =>
      set((state) => {
        state.activeCast = null;
      }),

    isCasting: () => get().activeCast !== null,
  }))
);

/**
 * Derive equipped abilities from current equipment.
 * This is a pure function, not stored in state to avoid stale data.
 * Also includes universal abilities (home_recall, basic_strike, gather).
 */
export function getEquippedAbilities(): AbilityDefinition[] {
  const inventory = useInventoryStore.getState().inventory;
  if (!inventory) return [];

  const abilityIds = new Set<string>();

  // Check equipped tool
  if (inventory.equipment.tool) {
    const toolDef = ItemRegistry.get(inventory.equipment.tool.itemId);
    if (toolDef?.grantedAbilities) {
      toolDef.grantedAbilities.forEach((id) => abilityIds.add(id));
    }
  }

  // Check equipped exosuit
  if (inventory.equipment.exosuit) {
    const suitDef = ItemRegistry.get(inventory.equipment.exosuit.itemId);
    if (suitDef?.grantedAbilities) {
      suitDef.grantedAbilities.forEach((id) => abilityIds.add(id));
    }
  }

  // Check equipped modules
  for (const mod of inventory.equipment.modules) {
    const modDef = ItemRegistry.get(mod.itemId);
    if (modDef?.grantedAbilities) {
      modDef.grantedAbilities.forEach((id) => abilityIds.add(id));
    }
  }

  // Inject universal abilities
  abilityIds.add('home_recall');
  abilityIds.add('basic_strike');
  abilityIds.add('gather');

  // Resolve ability definitions
  const abilities: AbilityDefinition[] = [];
  for (const id of abilityIds) {
    const ability = AbilityRegistry.get(id);
    if (ability) abilities.push(ability);
  }

  return abilities;
}

// Wire socket events at module level
gameSocket.on('ability:result', (data) => {
  if (data.success && data.cooldownEndsAt) {
    useAbilityStore.getState().setCooldown(data.abilityId, data.cooldownEndsAt);
  }
  // Clear cast on successful ability completion
  if (data.success) {
    useAbilityStore.getState().clearCast();
  }
  // Log errors so ability failures are visible in console
  if (!data.success && data.error) {
    console.warn(`[ABILITY] ${data.abilityId} failed: ${data.error}`);
  }
});

gameSocket.on('ability:cooldown', (data) => {
  useAbilityStore.getState().setCooldown(data.abilityId, data.cooldownEndsAt);
});

gameSocket.on('cast:start', (data) => {
  // Use client-side Date.now() to avoid server/client clock skew
  useAbilityStore.getState().startCast({
    abilityId: data.abilityId,
    targetEntityId: data.targetEntityId,
    castTimeMs: data.castTimeMs,
    castEndsAt: Date.now() + data.castTimeMs,
  });
});

gameSocket.on('cast:interrupt', () => {
  useAbilityStore.getState().clearCast();
});

// Periodically clean expired cooldowns (every second)
setInterval(() => {
  useAbilityStore.getState().clearExpiredCooldowns();
}, 1000);
