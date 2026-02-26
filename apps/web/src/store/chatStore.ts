import { create } from 'zustand';
import { ChatMessage } from '@into-the-void/shared-types';
import { gameSocket } from '../network/socket';

export const CHAT_CHANNELS = ['local', 'zone', 'faction', 'global', 'whisper'] as const;
export type ChatTab = (typeof CHAT_CHANNELS)[number];

export const CHANNEL_CONFIG: Record<ChatTab, { label: string; color: string }> = {
  local: { label: 'Local', color: '#cccccc' },
  zone: { label: 'Zone', color: '#e0e0e0' },
  faction: { label: 'Faction', color: '#7b68ee' },
  global: { label: 'Global', color: '#99ccff' },
  whisper: { label: 'Whisper', color: '#ff99cc' },
};

interface ChatState {
  // Per-channel message arrays (keyed by ChatTab)
  messages: Record<ChatTab, ChatMessage[]>;

  // Active channel tab
  activeChannel: ChatTab;

  // Unread counts per channel
  unreadCounts: Record<ChatTab, number>;

  // Whisper target (character name for whisper channel)
  whisperTarget: string;

  // Actions
  addMessage: (message: ChatMessage) => void;
  switchChannel: (channel: ChatTab) => void;
  setWhisperTarget: (name: string) => void;
  sendMessage: (text: string) => void;
  clearAll: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: {
    local: [],
    zone: [],
    faction: [],
    global: [],
    whisper: [],
  },
  activeChannel: 'zone',
  unreadCounts: { local: 0, zone: 0, faction: 0, global: 0, whisper: 0 },
  whisperTarget: '',

  addMessage: (message) => {
    const { activeChannel } = get();

    set((state) => {
      // Determine which channels this message belongs to
      const targetChannels: ChatTab[] = [];

      if (message.channel === 'system') {
        // System messages appear in every channel tab
        targetChannels.push(...CHAT_CHANNELS);
      } else if (CHAT_CHANNELS.includes(message.channel as ChatTab)) {
        targetChannels.push(message.channel as ChatTab);
      }

      if (targetChannels.length === 0) return state;

      const newMessages = { ...state.messages };
      const newUnread = { ...state.unreadCounts };

      for (const ch of targetChannels) {
        // Append message, cap at 100 per channel
        newMessages[ch] = [...state.messages[ch].slice(-99), message];

        // Increment unread for non-active channels
        if (ch !== activeChannel) {
          newUnread[ch] = state.unreadCounts[ch] + 1;
        }
      }

      return { messages: newMessages, unreadCounts: newUnread };
    });
  },

  switchChannel: (channel) =>
    set((state) => ({
      activeChannel: channel,
      unreadCounts: { ...state.unreadCounts, [channel]: 0 },
    })),

  setWhisperTarget: (name) => set({ whisperTarget: name }),

  sendMessage: (text) => {
    const { activeChannel, whisperTarget } = get();
    const trimmed = text.trim();
    if (!trimmed) return;

    gameSocket.emit('chat:send', {
      message: trimmed,
      channel: activeChannel,
      ...(activeChannel === 'whisper' && whisperTarget ? { targetId: whisperTarget } : {}),
    });
  },

  clearAll: () =>
    set({
      messages: { local: [], zone: [], faction: [], global: [], whisper: [] },
      unreadCounts: { local: 0, zone: 0, faction: 0, global: 0, whisper: 0 },
    }),
}));

// Wire chat:message socket event to chatStore
// Follows established pattern: module-level registration in store files
gameSocket.on('chat:message', (message: ChatMessage) => {
  useChatStore.getState().addMessage(message);
});

export function formatChatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}
