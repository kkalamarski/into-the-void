import { create } from 'zustand';
import { gameSocket } from '../network/socket';
import { useAlertStore } from './alertStore';

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

export interface ExpeditionDestination {
  biome: string;
  displayName: string;
  tier: number;
  requiredLevel: number;
  locked: boolean;
}

export interface NpcInteraction {
  npcId: string;
  displayName: string;
  npcType: 'trader' | 'guard' | 'faction_rep' | 'ambient' | 'service';
  faction: 'verdant' | 'helix' | 'nexus' | 'neutral';
  description: string;
  dialogue: Array<{ text: string; condition?: string }>;
  color: number;
  // Type-specific fields (optional):
  inventory?: Array<{ itemId: string; buyPrice: number; sellPrice: number; stock: number }>;
  serviceType?: 'repair' | 'storage' | 'transport' | 'medical' | 'expedition';
  title?: string;
  role?: string;
  // Quest-related fields (optional):
  availableQuests?: QuestPreview[];
  activeQuests?: ActiveQuestInfo[];
  readyQuests?: ReadyQuestInfo[];
  // Expedition-related fields (optional):
  expeditionDestinations?: ExpeditionDestination[];
}

interface NpcState {
  interactingNpc: NpcInteraction | null;
  activeTab: 'dialogue' | 'trade' | 'quests' | 'expedition';
  tradeError: string | null;
  tradePending: boolean;
  questPending: boolean;
  expeditionPending: boolean;
  setInteractingNpc: (npc: NpcInteraction | null) => void;
  closeInteraction: () => void;
  setActiveTab: (tab: 'dialogue' | 'trade' | 'quests' | 'expedition') => void;
  setTradeError: (error: string | null) => void;
  setTradePending: (pending: boolean) => void;
  setQuestPending: (pending: boolean) => void;
  setExpeditionPending: (pending: boolean) => void;
  acceptQuest: (questId: string) => void;
  completeQuestAtNpc: (questId: string) => void;
  startExpedition: (biome: string) => void;
}

export const useNpcStore = create<NpcState>((set) => ({
  interactingNpc: null,
  activeTab: 'dialogue',
  tradeError: null,
  tradePending: false,
  questPending: false,
  expeditionPending: false,
  setInteractingNpc: (npc) => set({ interactingNpc: npc }),
  closeInteraction: () => set({
    interactingNpc: null,
    activeTab: 'dialogue',
    tradeError: null,
    tradePending: false,
    questPending: false,
    expeditionPending: false,
  }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setTradeError: (error) => set({ tradeError: error }),
  setTradePending: (pending) => set({ tradePending: pending }),
  setQuestPending: (pending) => set({ questPending: pending }),
  setExpeditionPending: (pending) => set({ expeditionPending: pending }),
  acceptQuest: (questId: string) => {
    set({ questPending: true });
    gameSocket.emit('quest:accept', { questId });
  },
  completeQuestAtNpc: (questId: string) => {
    set({ questPending: true });
    gameSocket.emit('quest:complete', { questId });
  },
  startExpedition: (biome: string) => {
    set({ expeditionPending: true });
    gameSocket.emit('expedition:start', { biome });
  },
}));

// Listen for npc:interact:response - server sends NPC definition data when player interacts
gameSocket.on('npc:interact:response', (data) => {
  useNpcStore.getState().setInteractingNpc(data as NpcInteraction);
});

// Listen for trade:result - route errors to alertStore and reset pending state
gameSocket.on('trade:result', (data: { success: boolean; error?: string }) => {
  if (!data.success && data.error) {
    useAlertStore.getState().addAlert(data.error, 'error');
  }
  useNpcStore.getState().setTradeError(null);
  useNpcStore.getState().setTradePending(false);
});

// Listen for quest:accepted - reset pending state on success
gameSocket.on('quest:accepted', () => {
  useNpcStore.getState().setQuestPending(false);
});

// Listen for quest:completed - reset pending state on success
gameSocket.on('quest:completed', () => {
  useNpcStore.getState().setQuestPending(false);
});

// Listen for quest:error - handle quest failures
gameSocket.on('quest:error', (data: { message: string }) => {
  useAlertStore.getState().addAlert(data.message, 'error');
  useNpcStore.getState().setQuestPending(false);
});

// Listen for expedition:complete - reset pending state and close modal on success
gameSocket.on('expedition:complete', () => {
  useNpcStore.getState().setExpeditionPending(false);
  useNpcStore.getState().closeInteraction();
});
