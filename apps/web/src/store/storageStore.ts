import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { PersonalStorage } from '@into-the-void/shared-types';
import { gameSocket } from '../network/socket';

interface StorageState {
  storage: PersonalStorage | null;
  setStorage: (s: PersonalStorage) => void;
  clearStorage: () => void;
}

export const useStorageStore = create<StorageState>()(
  immer((set) => ({
    storage: null,
    setStorage: (s) =>
      set((state) => {
        state.storage = s;
      }),
    clearStorage: () =>
      set((state) => {
        state.storage = null;
      }),
  }))
);

// Wire socket event at module level: update storage state on server push
gameSocket.on('storage:update', (storage: PersonalStorage) => {
  useStorageStore.getState().setStorage(storage);
});
