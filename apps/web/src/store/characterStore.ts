import { create } from 'zustand';

interface CharacterState {
  selectedCharacterId: string | null;
  selectCharacter: (id: string) => void;
  clearSelection: () => void;
}

export const useCharacterStore = create<CharacterState>((set) => ({
  selectedCharacterId: null,
  selectCharacter: (id) => set({ selectedCharacterId: id }),
  clearSelection: () => set({ selectedCharacterId: null }),
}));
