import { create } from 'zustand';
import { Player, ConnectionState, ChatMessage, Entity, ZoneState, Position } from '@into-the-void/shared-types';
import { Game } from '../game/Game';
import { gameSocket } from '../network/socket';

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

  // World state
  zoneId: string | null;
  zoneState: ZoneState | null;
  entities: Entity[];
  collisionMap: boolean[][] | null;
  setZoneState: (state: ZoneState) => void;
  setEntities: (entities: Entity[]) => void;
  setCollisionMap: (map: boolean[][]) => void;

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

  // World state
  zoneId: null,
  zoneState: null,
  entities: [],
  collisionMap: null,
  setZoneState: (state) => set({ zoneId: state.zoneId, zoneState: state, entities: state.entities }),
  setEntities: (entities) => set({ entities }),
  setCollisionMap: (map) => set({ collisionMap: map }),

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

// Listen for initial game state from server
gameSocket.on('zone:state', (data: ZoneState) => {
  const { zoneId, entities, players, chunk } = data;

  // Store zone data and entities
  useGameStore.getState().setZoneState(data);

  // CRITICAL: Update collision map for client-side prediction
  if (chunk?.collisions) {
    useGameStore.getState().setCollisionMap(chunk.collisions);
  }

  // Find current player in the players list and update position if provided
  const currentPlayer = useGameStore.getState().player;
  if (currentPlayer) {
    const playerInZone = players.find(p => p.id === currentPlayer.id);
    if (playerInZone) {
      useGameStore.getState().setPlayer({
        ...currentPlayer,
        position: playerInZone.position,
      });
    }
  }

  // Update loading progress (zone data received)
  useGameStore.getState().setLoadingProgress(80);
});

// Handle movement updates from server
gameSocket.on('player:moved', (data: { playerId: string; position: Position; lastProcessedInput?: number }) => {
  const currentPlayer = useGameStore.getState().player;
  const game = useGameStore.getState().game;

  if (!currentPlayer || !game) return;

  const worldScene = game.getWorldScene();
  if (!worldScene) return;

  if (data.playerId === currentPlayer.id) {
    // Local player moved - reconcile with server
    const movementController = worldScene.getMovementController();
    if (movementController && data.lastProcessedInput !== undefined) {
      movementController.reconcile(data.position, data.lastProcessedInput);
    } else {
      // No sequence number (legacy) - just update position
      useGameStore.getState().setPlayer({
        ...currentPlayer,
        position: data.position,
      });
      worldScene.updateLocalPlayer(data.position);
    }
  } else {
    // Other player moved - tween their sprite
    worldScene.movePlayer(data.playerId, data.position);
  }
});
