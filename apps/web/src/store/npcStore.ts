import { create } from 'zustand';
import { gameSocket } from '../network/socket';

interface QuestPreview {
  questId: string;
  displayName: string;
  description: string;
  objectives: Array<{ description: string; required: number }>;
  rewards: { credits?: number; xp?: number; items?: Array<{ itemId: string; quantity: number }> };
  minLevel?: number;
}

interface ActiveQuestInfo {
  questId: string;
  displayName: string;
  description: string;
  objectives: Array<{ description: string; current: number; required: number; complete: boolean }>;
}

interface ReadyQuestInfo {
  questId: string;
  displayName: string;
}

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
  // Quest-related fields (optional):
  availableQuests?: QuestPreview[];
  activeQuests?: ActiveQuestInfo[];
  readyQuests?: ReadyQuestInfo[];
}

interface NpcState {
  interactingNpc: NpcInteraction | null;
  showTrading: boolean;
  tradeError: string | null;
  setInteractingNpc: (npc: NpcInteraction | null) => void;
  closeInteraction: () => void;
  openTrading: () => void;
  closeTrading: () => void;
  setTradeError: (error: string | null) => void;
  acceptQuest: (questId: string) => void;
  completeQuestAtNpc: (questId: string) => void;
}

export const useNpcStore = create<NpcState>((set) => ({
  interactingNpc: null,
  showTrading: false,
  tradeError: null,
  setInteractingNpc: (npc) => set({ interactingNpc: npc }),
  closeInteraction: () => set({ interactingNpc: null, showTrading: false, tradeError: null }),
  openTrading: () => set({ showTrading: true, tradeError: null }),
  closeTrading: () => set({ showTrading: false, tradeError: null }),
  setTradeError: (error) => set({ tradeError: error }),
  acceptQuest: (questId: string) => {
    gameSocket.emit('quest:accept', { questId });
  },
  completeQuestAtNpc: (questId: string) => {
    gameSocket.emit('quest:complete', { questId });
  },
}));

// Listen for npc:interact:response - server sends NPC definition data when player interacts
gameSocket.on('npc:interact:response', (data) => {
  useNpcStore.getState().setInteractingNpc(data as NpcInteraction);
});

// Listen for trade:result - show errors from failed trade attempts
gameSocket.on('trade:result', (data: { success: boolean; error?: string }) => {
  if (!data.success && data.error) {
    useNpcStore.getState().setTradeError(data.error);
  } else {
    useNpcStore.getState().setTradeError(null);
  }
});
