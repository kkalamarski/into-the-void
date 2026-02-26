import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { useInventoryStore } from './inventoryStore';

const STORAGE_KEY = 'action_bar_assignments';
const ABILITY_ORDER_STORAGE_KEY = 'action_bar_ability_order';
const SECONDARY_ABILITY_ORDER_STORAGE_KEY = 'action_bar_secondary_ability_order';
const SLOT_COUNT = 8;

function loadFromStorage(): (string | null)[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return Array(SLOT_COUNT).fill(null);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return Array(SLOT_COUNT).fill(null);
    // Normalize to exactly 8 slots
    const normalized: (string | null)[] = Array(SLOT_COUNT).fill(null);
    for (let i = 0; i < SLOT_COUNT; i++) {
      const val = parsed[i];
      normalized[i] = typeof val === 'string' ? val : null;
    }
    return normalized;
  } catch {
    return Array(SLOT_COUNT).fill(null);
  }
}

function saveToStorage(slots: (string | null)[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slots));
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

function loadAbilityOrderFromStorage(): (string | null)[] {
  try {
    const raw = localStorage.getItem(ABILITY_ORDER_STORAGE_KEY);
    if (!raw) return Array(SLOT_COUNT).fill(null);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return Array(SLOT_COUNT).fill(null);
    // Normalize to exactly 8 slots
    const normalized: (string | null)[] = Array(SLOT_COUNT).fill(null);
    for (let i = 0; i < SLOT_COUNT; i++) {
      const val = parsed[i];
      normalized[i] = typeof val === 'string' ? val : null;
    }
    return normalized;
  } catch {
    return Array(SLOT_COUNT).fill(null);
  }
}

function saveAbilityOrderToStorage(order: (string | null)[]): void {
  try {
    localStorage.setItem(ABILITY_ORDER_STORAGE_KEY, JSON.stringify(order));
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

function loadSecondaryAbilityOrderFromStorage(): (string | null)[] {
  try {
    const raw = localStorage.getItem(SECONDARY_ABILITY_ORDER_STORAGE_KEY);
    if (!raw) return Array(SLOT_COUNT).fill(null);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return Array(SLOT_COUNT).fill(null);
    // Normalize to exactly 8 slots
    const normalized: (string | null)[] = Array(SLOT_COUNT).fill(null);
    for (let i = 0; i < SLOT_COUNT; i++) {
      const val = parsed[i];
      normalized[i] = typeof val === 'string' ? val : null;
    }
    return normalized;
  } catch {
    return Array(SLOT_COUNT).fill(null);
  }
}

function saveSecondaryAbilityOrderToStorage(order: (string | null)[]): void {
  try {
    localStorage.setItem(SECONDARY_ABILITY_ORDER_STORAGE_KEY, JSON.stringify(order));
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

interface ActionBarState {
  slots: (string | null)[];
  assign: (slotIndex: number, instanceId: string) => void;
  unassign: (slotIndex: number) => void;
  invalidateOrphans: (activeInstanceIds: Set<string>) => void;

  // Ability ordering for drag-to-rearrange (primary bar - keys 1-8)
  abilityOrder: (string | null)[];
  setAbilityOrder: (order: (string | null)[]) => void;
  swapAbilitySlots: (fromIndex: number, toIndex: number) => void;
  assignAbility: (slotIndex: number, abilityId: string) => void;
  removeAbilityFromSlot: (slotIndex: number) => void;

  // Secondary bar (Shift+1-8)
  secondaryAbilityOrder: (string | null)[];
  setSecondaryAbilityOrder: (order: (string | null)[]) => void;
  swapSecondaryAbilitySlots: (fromIndex: number, toIndex: number) => void;
  assignSecondaryAbility: (slotIndex: number, abilityId: string) => void;
  removeSecondaryAbilityFromSlot: (slotIndex: number) => void;
}

export const useActionBarStore = create<ActionBarState>()(
  immer((set) => ({
    slots: loadFromStorage(),

    assign: (slotIndex: number, instanceId: string) =>
      set((state) => {
        if (slotIndex < 0 || slotIndex >= SLOT_COUNT) return;
        state.slots[slotIndex] = instanceId;
        saveToStorage(state.slots as (string | null)[]);
      }),

    unassign: (slotIndex: number) =>
      set((state) => {
        if (slotIndex < 0 || slotIndex >= SLOT_COUNT) return;
        state.slots[slotIndex] = null;
        saveToStorage(state.slots as (string | null)[]);
      }),

    invalidateOrphans: (activeInstanceIds: Set<string>) =>
      set((state) => {
        let changed = false;
        for (let i = 0; i < SLOT_COUNT; i++) {
          const id = state.slots[i];
          if (id !== null && !activeInstanceIds.has(id)) {
            state.slots[i] = null;
            changed = true;
          }
        }
        if (changed) {
          saveToStorage(state.slots as (string | null)[]);
        }
      }),

    // Ability ordering state and actions (primary bar)
    abilityOrder: loadAbilityOrderFromStorage(),

    setAbilityOrder: (order: (string | null)[]) =>
      set((state) => {
        state.abilityOrder = order;
        saveAbilityOrderToStorage(order);
      }),

    swapAbilitySlots: (fromIndex: number, toIndex: number) =>
      set((state) => {
        if (fromIndex < 0 || fromIndex >= SLOT_COUNT) return;
        if (toIndex < 0 || toIndex >= SLOT_COUNT) return;
        if (fromIndex === toIndex) return;

        // Swap slot contents
        const temp = state.abilityOrder[fromIndex];
        state.abilityOrder[fromIndex] = state.abilityOrder[toIndex];
        state.abilityOrder[toIndex] = temp;

        saveAbilityOrderToStorage(state.abilityOrder as (string | null)[]);
      }),

    assignAbility: (slotIndex: number, abilityId: string) =>
      set((state) => {
        if (slotIndex < 0 || slotIndex >= SLOT_COUNT) return;
        state.abilityOrder[slotIndex] = abilityId;
        saveAbilityOrderToStorage(state.abilityOrder as (string | null)[]);
      }),

    removeAbilityFromSlot: (slotIndex: number) =>
      set((state) => {
        if (slotIndex < 0 || slotIndex >= SLOT_COUNT) return;
        state.abilityOrder[slotIndex] = null;
        saveAbilityOrderToStorage(state.abilityOrder as (string | null)[]);
      }),

    // Secondary bar state and actions (Shift+1-8)
    secondaryAbilityOrder: loadSecondaryAbilityOrderFromStorage(),

    setSecondaryAbilityOrder: (order: (string | null)[]) =>
      set((state) => {
        state.secondaryAbilityOrder = order;
        saveSecondaryAbilityOrderToStorage(order);
      }),

    swapSecondaryAbilitySlots: (fromIndex: number, toIndex: number) =>
      set((state) => {
        if (fromIndex < 0 || fromIndex >= SLOT_COUNT) return;
        if (toIndex < 0 || toIndex >= SLOT_COUNT) return;
        if (fromIndex === toIndex) return;

        // Swap slot contents
        const temp = state.secondaryAbilityOrder[fromIndex];
        state.secondaryAbilityOrder[fromIndex] = state.secondaryAbilityOrder[toIndex];
        state.secondaryAbilityOrder[toIndex] = temp;

        saveSecondaryAbilityOrderToStorage(state.secondaryAbilityOrder as (string | null)[]);
      }),

    assignSecondaryAbility: (slotIndex: number, abilityId: string) =>
      set((state) => {
        if (slotIndex < 0 || slotIndex >= SLOT_COUNT) return;
        state.secondaryAbilityOrder[slotIndex] = abilityId;
        saveSecondaryAbilityOrderToStorage(state.secondaryAbilityOrder as (string | null)[]);
      }),

    removeSecondaryAbilityFromSlot: (slotIndex: number) =>
      set((state) => {
        if (slotIndex < 0 || slotIndex >= SLOT_COUNT) return;
        state.secondaryAbilityOrder[slotIndex] = null;
        saveSecondaryAbilityOrderToStorage(state.secondaryAbilityOrder as (string | null)[]);
      }),
  }))
);

// Wire orphan invalidation at MODULE LEVEL via useInventoryStore.subscribe.
// This ensures stale references are cleared on every inventory:update
// regardless of component mount state.
useInventoryStore.subscribe((inventoryState) => {
  const inv = inventoryState.inventory;
  if (!inv) return;
  const activeIds = new Set(inv.items.map((item) => item.instanceId));
  useActionBarStore.getState().invalidateOrphans(activeIds);
});
