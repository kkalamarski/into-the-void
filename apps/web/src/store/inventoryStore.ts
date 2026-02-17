import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { Inventory } from '@into-the-void/shared-types';
import { gameSocket } from '../network/socket';

interface InventoryState {
  inventory: Inventory | null;
  pendingReorder: boolean;
  setInventory: (inv: Inventory) => void;
  clearInventory: () => void;
  setPendingReorder: (pending: boolean) => void;
}

export const useInventoryStore = create<InventoryState>()(
  immer((set) => ({
    inventory: null,
    pendingReorder: false,

    setInventory: (inv: Inventory) =>
      set((state) => {
        state.inventory = inv;
        state.pendingReorder = false;
      }),

    clearInventory: () =>
      set((state) => {
        state.inventory = null;
      }),

    setPendingReorder: (pending: boolean) =>
      set((state) => {
        state.pendingReorder = pending;
      }),
  }))
);

// Wire socket event: update inventory state on server push
gameSocket.on('inventory:update', (inventory: Inventory) => {
  useInventoryStore.getState().setInventory(inventory);
});
