import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { useInventoryStore } from './inventoryStore';

const STORAGE_KEY = 'action_bar_assignments';
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

interface ActionBarState {
  slots: (string | null)[];
  assign: (slotIndex: number, instanceId: string) => void;
  unassign: (slotIndex: number) => void;
  invalidateOrphans: (activeInstanceIds: Set<string>) => void;
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
