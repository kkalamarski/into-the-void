import { create } from 'zustand';
import { Player, ConnectionState, ChatMessage } from '@into-the-void/shared-types';
import { Game } from '../game/Game';

interface GameState {
  // Connection
  connectionState: ConnectionState;
  setConnectionState: (state: ConnectionState) => void;
  latency: number;
  setLatency: (latency: number) => void;

  // Loading
  loadingStage: 'idle' | 'connecting' | 'authenticating' | 'loading-world' | 'spawning' | 'ready';
  loadingProgress: number;
  setLoadingStage: (stage: GameState['loadingStage']) => void;
  setLoadingProgress: (progress: number) => void;

  // Game instance
  game: Game | null;
  setGame: (game: Game) => void;

  // Player
  player: Player | null;
  setPlayer: (player: Player | null) => void;

  // UI State
  showInventory: boolean;
  toggleInventory: () => void;

  showChat: boolean;
  toggleChat: () => void;

  // Chat
  chatMessages: ChatMessage[];
  addChatMessage: (message: ChatMessage) => void;
  clearChat: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  // Connection
  connectionState: 'disconnected',
  setConnectionState: (state) => set({ connectionState: state }),
  latency: 0,
  setLatency: (latency) => set({ latency }),

  // Loading
  loadingStage: 'idle',
  loadingProgress: 0,
  setLoadingStage: (stage) => set({ loadingStage: stage }),
  setLoadingProgress: (progress) => set({ loadingProgress: progress }),

  // Game instance
  game: null,
  setGame: (game) => set({ game }),

  // Player
  player: null,
  setPlayer: (player) => set({ player }),

  // UI State
  showInventory: false,
  toggleInventory: () => set((state) => ({ showInventory: !state.showInventory })),

  showChat: false,
  toggleChat: () => set((state) => ({ showChat: !state.showChat })),

  // Chat
  chatMessages: [],
  addChatMessage: (message) =>
    set((state) => ({
      chatMessages: [...state.chatMessages.slice(-99), message],
    })),
  clearChat: () => set({ chatMessages: [] }),
}));
