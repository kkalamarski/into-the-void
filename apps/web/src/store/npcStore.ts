import { create } from 'zustand';
import { gameSocket } from '../network/socket';

interface NpcInteraction {
  npcId: string;
  displayName: string;
  npcType: 'trader' | 'guard' | 'faction_rep' | 'ambient' | 'service';
  faction: 'verdant' | 'helix' | 'nexus' | 'neutral';
  description: string;
  dialogue: Array<{ text: string; condition?: string }>;
  color: number;
  // Type-specific fields (optional):
  inventory?: Array<{ itemId: string; buyPrice: number; sellPrice: number; stock: number }>;
  serviceType?: 'repair' | 'storage' | 'transport' | 'medical';
  title?: string;
  role?: string;
}

interface NpcState {
  interactingNpc: NpcInteraction | null;
  setInteractingNpc: (npc: NpcInteraction | null) => void;
  closeInteraction: () => void;
}

export const useNpcStore = create<NpcState>((set) => ({
  interactingNpc: null,
  setInteractingNpc: (npc) => set({ interactingNpc: npc }),
  closeInteraction: () => set({ interactingNpc: null }),
}));

// Listen for npc:interact:response - server sends NPC definition data when player interacts
gameSocket.on('npc:interact:response', (data) => {
  useNpcStore.getState().setInteractingNpc(data as NpcInteraction);
});
