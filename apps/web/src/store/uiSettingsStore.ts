import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UiSettingsState {
  showSecondaryBar: boolean;
  setShowSecondaryBar: (v: boolean) => void;
}

export const useUiSettingsStore = create<UiSettingsState>()(
  persist(
    (set) => ({
      showSecondaryBar: true,
      setShowSecondaryBar: (v) => set({ showSecondaryBar: v }),
    }),
    {
      name: 'ui-settings',
      partialize: (state) => ({ showSecondaryBar: state.showSecondaryBar }),
    }
  )
);
