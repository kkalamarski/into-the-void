import { create } from 'zustand';
import { Player, ConnectionState, ChatMessage, Entity, Creature, ZoneState, Position, PlayerPublic } from '@into-the-void/shared-types';
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
  chunksLoading: number; // Count of chunks currently loading
  setChunksLoading: (count: number) => void;

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

  showEquipment: boolean;
  toggleEquipment: () => void;

  showStorage: boolean;
  toggleStorage: () => void;

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
  chunksLoading: 0,
  setChunksLoading: (count) => set({ chunksLoading: count }),

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

  showEquipment: false,
  toggleEquipment: () => set((state) => ({ showEquipment: !state.showEquipment })),

  showStorage: false,
  toggleStorage: () => set((state) => ({ showStorage: !state.showStorage })),

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
  const currentZoneId = useGameStore.getState().zoneId;
  const game = useGameStore.getState().game;

  // Detect zone transition
  const isZoneTransition = currentZoneId !== null && currentZoneId !== zoneId;

  // Store zone data and entities
  useGameStore.getState().setZoneState(data);

  // Update collision map for client-side prediction
  if (chunk?.collisions) {
    useGameStore.getState().setCollisionMap(chunk.collisions);

    // Also push to WorldScene immediately if available
    if (game) {
      const worldScene = game.getWorldScene();
      if (worldScene) {
        worldScene.setCollisionMap(chunk.collisions);
      }
    }
  }

  // On zone transition, reset prediction state
  if (isZoneTransition && game) {
    const worldScene = game.getWorldScene();
    if (worldScene) {
      const movementController = worldScene.getMovementController();
      if (movementController) {
        movementController.clearPendingInputs();
      }
      const pathfindingController = worldScene.getPathfindingController();
      if (pathfindingController) {
        pathfindingController.cancelPath();
      }
    }
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

  // Spawn initial entities and other players in world
  // IMPORTANT: Only clear entities on initial load. On zone transitions, entities from
  // adjacent zones (loaded via zone:chunk) must persist for cross-chunk visibility.
  // spawnEntity already checks for duplicates and filters by visibility distance.
  const isInitialLoad = currentZoneId === null;
  if (game) {
    const worldScene = game.getWorldScene();
    if (worldScene) {
      // Only clear on initial load - zone transitions keep adjacent zone entities
      if (isInitialLoad) {
        worldScene.clearEntities();
      }
      worldScene.clearOtherPlayers();

      // Spawn entities (spawnEntity checks for duplicates)
      for (const entity of entities) {
        worldScene.spawnEntity(entity, zoneId);
      }

      // Spawn other players (not ourselves)
      const currentPlayerId = currentPlayer?.id;
      for (const player of players) {
        if (player.id !== currentPlayerId) {
          worldScene.addPlayer(player);
        }
      }
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

// Handle entity spawn
gameSocket.on('entity:spawn', (entity: Entity) => {
  const game = useGameStore.getState().game;
  const worldScene = game?.getWorldScene();
  if (worldScene) {
    worldScene.spawnEntity(entity);
  }
  // Also add to entities array in store
  const entities = useGameStore.getState().entities;
  useGameStore.getState().setEntities([...entities, entity]);
});

// Handle entity despawn
gameSocket.on('entity:despawn', ({ entityId }: { entityId: string }) => {
  const game = useGameStore.getState().game;
  const worldScene = game?.getWorldScene();
  if (worldScene) {
    worldScene.despawnEntity(entityId);
  }
  // Remove from entities array
  const entities = useGameStore.getState().entities;
  useGameStore.getState().setEntities(entities.filter(e => e.id !== entityId));
});

// Handle entity update
gameSocket.on('entity:update', ({ entityId, changes }: { entityId: string; changes: Partial<Entity> }) => {
  const game = useGameStore.getState().game;
  const worldScene = game?.getWorldScene();
  if (worldScene) {
    worldScene.updateEntity(entityId, changes);
  }
  // Update entity in store
  const entities = useGameStore.getState().entities;
  useGameStore.getState().setEntities(
    entities.map(e => e.id === entityId ? { ...e, ...changes } : e)
  );
});

// Handle entity batch updates (AI creature movement)
// Forward to WorldScene for visual rendering — entityStore already handles its own batch wiring
gameSocket.on('entity:batch', ({ updates }: { updates: Array<{ entityId: string; changes: Partial<Entity> }> }) => {
  const game = useGameStore.getState().game;
  const worldScene = game?.getWorldScene();
  if (worldScene) {
    for (const { entityId, changes } of updates) {
      worldScene.updateEntity(entityId, changes);
    }
  }
});

// Handle player joined
gameSocket.on('player:joined', (player: PlayerPublic) => {
  const game = useGameStore.getState().game;
  const worldScene = game?.getWorldScene();
  const currentPlayer = useGameStore.getState().player;

  // Don't add ourselves
  if (currentPlayer && player.id === currentPlayer.id) return;

  if (worldScene) {
    worldScene.addPlayer(player);
  }
});

// Handle player left
gameSocket.on('player:left', ({ playerId }: { playerId: string }) => {
  const game = useGameStore.getState().game;
  const worldScene = game?.getWorldScene();
  if (worldScene) {
    worldScene.removePlayer(playerId);
  }
});

// Handle player death
gameSocket.on('player:death', ({ playerId, killerId, position }: { playerId: string; killerId: string; position: Position }) => {
  const currentPlayer = useGameStore.getState().player;
  const game = useGameStore.getState().game;
  const worldScene = game?.getWorldScene();

  if (currentPlayer && playerId === currentPlayer.id) {
    // Local player died
    useGameStore.getState().setPlayer({
      ...currentPlayer,
      isDead: true,
      health: 0,
    });
    // Show death message
    const chatMessage: ChatMessage = {
      id: Date.now().toString(),
      senderId: 'system',
      senderName: 'System',
      message: 'You have been killed. Respawning...',
      channel: 'system',
      timestamp: Date.now(),
    };
    useGameStore.getState().addChatMessage(chatMessage);
    // Disable movement in WorldScene
    if (worldScene) {
      worldScene.handlePlayerDeath();
    }
  } else if (worldScene) {
    // Another player died - remove their sprite
    worldScene.removePlayer(playerId);
  }
});

// Handle player respawn
gameSocket.on('player:respawn', ({ playerId, position }: { playerId: string; position: Position }) => {
  const currentPlayer = useGameStore.getState().player;
  const game = useGameStore.getState().game;
  const worldScene = game?.getWorldScene();

  if (currentPlayer && playerId === currentPlayer.id) {
    // Local player respawned
    useGameStore.getState().setPlayer({
      ...currentPlayer,
      isDead: false,
      health: currentPlayer.maxHealth,
      position,
    });
    // Show respawn message
    const chatMessage: ChatMessage = {
      id: Date.now().toString(),
      senderId: 'system',
      senderName: 'System',
      message: 'You have respawned at your faction hub.',
      channel: 'system',
      timestamp: Date.now(),
    };
    useGameStore.getState().addChatMessage(chatMessage);
    // Re-enable movement and update position
    if (worldScene) {
      worldScene.handlePlayerRespawn(position);
    }
  } else if (worldScene) {
    // Another player respawned - add them at new position
    // Note: Their full PlayerPublic will come via player:joined if they changed zones
    worldScene.addPlayer({
      id: playerId,
      name: 'Player', // Will be updated by zone:state
      faction: 'neutral',
      position,
      level: 1,
      inCombat: false,
    });
  }
});

// Handle combat damage - show floating damage numbers and update health
gameSocket.on('combat:damage', (data: {
  attackerId: string;
  defenderId: string;
  damage: number;
  defenderHealth: number;
  defenderMaxHealth: number;
  critical: boolean;
  killed: boolean;
}) => {
  const game = useGameStore.getState().game;
  const worldScene = game?.getWorldScene();
  const currentPlayer = useGameStore.getState().player;

  if (!worldScene) return;

  // Determine if this is damage to the local player
  const isLocalPlayer = currentPlayer?.id === data.defenderId;

  // Show floating damage number
  worldScene.showDamageNumber(data.defenderId, data.damage, isLocalPlayer);

  // Update local player health if they took damage
  if (isLocalPlayer && currentPlayer) {
    useGameStore.getState().setPlayer({
      ...currentPlayer,
      health: data.defenderHealth,
    });
  } else {
    // Update creature health bar in real-time (FEED-03)
    // Cast to Partial<Creature> since health/maxHealth are Creature-specific fields
    const creatureUpdate: Partial<Creature> = {
      health: data.defenderHealth,
      maxHealth: data.defenderMaxHealth,
    };
    worldScene.updateEntity(data.defenderId, creatureUpdate as Partial<Entity>);
  }
});

// Handle server errors (e.g., level-gated interaction rejection)
gameSocket.on('error', ({ code, message }: { code: string; message: string }) => {
  const chatMessage: ChatMessage = {
    id: Date.now().toString(),
    senderId: 'system',
    senderName: 'System',
    message: message,
    channel: 'system',
    timestamp: Date.now(),
  };
  useGameStore.getState().addChatMessage(chatMessage);
});
