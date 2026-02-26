import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CharacterState {
  selectedCharacterId: string | null;
  selectCharacter: (id: string) => void;
  clearSelection: () => void;
}

export const useCharacterStore = create<CharacterState>()(
  persist(
    (set) => ({
      selectedCharacterId: null,
      selectCharacter: (id) => set({ selectedCharacterId: id }),
      clearSelection: () => set({ selectedCharacterId: null }),
    }),
    {
      name: 'character-storage',
      partialize: (state) => ({
        selectedCharacterId: state.selectedCharacterId,
      }),
    }
  )
);
