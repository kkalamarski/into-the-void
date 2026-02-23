import { create } from 'zustand';
import { gameSocket } from '../network/socket';
import { QuestProgressPayload } from '@into-the-void/shared-types';
import { playQuestCompleteSound } from '../utils/audio';

/**
 * Completed quest metadata for history tracking
 */
export interface CompletedQuest {
  questId: string;
  displayName: string;
  completedAt: number;
}

/**
 * Quest completion reward for modal display
 */
export interface QuestReward {
  questId: string;
  displayName: string;
  rewards: {
    credits?: number;
    xp?: number;
    items?: { itemId: string; quantity: number }[];
  };
}

interface QuestState {
  /** Active quests being tracked */
  activeQuests: QuestProgressPayload[];

  /** Completed quests history */
  completedQuests: CompletedQuest[];

  /** Quest IDs being tracked in HUD (persisted to localStorage) */
  trackedQuests: Set<string>;

  /** Completion rewards queue for modal display (max 3, auto-dismiss after 5s each) */
  completedRewards: QuestReward[];

  /** Add new active quest */
  addActiveQuest: (quest: QuestProgressPayload) => void;

  /** Update existing quest progress */
  updateQuestProgress: (data: QuestProgressPayload) => void;

  /** Remove active quest by ID */
  removeActiveQuest: (questId: string) => void;

  /** Add completed quest to history */
  addCompletedQuest: (questId: string, displayName: string) => void;

  /** Toggle quest tracking in HUD (saves to localStorage) */
  toggleTracked: (questId: string) => void;

  /** Add completion reward to queue (max 3, auto-dismiss after 5s) */
  addCompletedReward: (reward: QuestReward) => void;

  /** Remove specific completion reward from queue */
  removeCompletedReward: (questId: string) => void;
}

// Load tracked quest IDs from localStorage
function loadTrackedQuests(): Set<string> {
  try {
    const stored = localStorage.getItem('quest-tracked');
    if (stored) {
      return new Set(JSON.parse(stored));
    }
  } catch (error) {
    console.error('[questStore] Failed to load tracked quests:', error);
  }
  return new Set();
}

// Save tracked quest IDs to localStorage
function saveTrackedQuests(trackedQuests: Set<string>): void {
  try {
    localStorage.setItem('quest-tracked', JSON.stringify([...trackedQuests]));
  } catch (error) {
    console.error('[questStore] Failed to save tracked quests:', error);
  }
}

export const useQuestStore = create<QuestState>((set, get) => ({
  activeQuests: [],
  completedQuests: [],
  trackedQuests: loadTrackedQuests(),
  completedRewards: [],

  addActiveQuest: (quest) =>
    set((state) => ({
      activeQuests: [...state.activeQuests, quest],
    })),

  updateQuestProgress: (data) =>
    set((state) => ({
      activeQuests: state.activeQuests.map((q) =>
        q.questId === data.questId ? data : q
      ),
    })),

  removeActiveQuest: (questId) =>
    set((state) => ({
      activeQuests: state.activeQuests.filter((q) => q.questId !== questId),
    })),

  addCompletedQuest: (questId, displayName) =>
    set((state) => ({
      completedQuests: [
        ...state.completedQuests,
        { questId, displayName, completedAt: Date.now() },
      ],
    })),

  toggleTracked: (questId) =>
    set((state) => {
      const newTracked = new Set(state.trackedQuests);
      if (newTracked.has(questId)) {
        newTracked.delete(questId);
      } else {
        newTracked.add(questId);
      }
      saveTrackedQuests(newTracked);
      return { trackedQuests: newTracked };
    }),

  addCompletedReward: (reward) => {
    set((state) => ({
      // Keep max 3 active banners (slice last 2, add new = 3)
      completedRewards: [...state.completedRewards.slice(-2), reward],
    }));

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      get().removeCompletedReward(reward.questId);
    }, 5000);
  },

  removeCompletedReward: (questId) => {
    set((state) => ({
      completedRewards: state.completedRewards.filter((r) => r.questId !== questId),
    }));
  },
}));

// Wire socket events at module level
gameSocket.on('quest:progress', (data: QuestProgressPayload) => {
  const store = useQuestStore.getState();
  const exists = store.activeQuests.some((q) => q.questId === data.questId);
  if (exists) {
    store.updateQuestProgress(data);
  } else {
    store.addActiveQuest(data);
  }
});

gameSocket.on(
  'quest:completed',
  (data: {
    questId: string;
    displayName: string;
    rewards: {
      credits?: number;
      xp?: number;
      items?: { itemId: string; quantity: number }[];
    };
  }) => {
    const store = useQuestStore.getState();
    store.removeActiveQuest(data.questId);
    store.addCompletedQuest(data.questId, data.displayName);
    store.addCompletedReward(data);

    // Play audio cue after state update
    playQuestCompleteSound();
  }
);

gameSocket.on('quest:abandoned', (data: { questId: string }) => {
  useQuestStore.getState().removeActiveQuest(data.questId);
});
