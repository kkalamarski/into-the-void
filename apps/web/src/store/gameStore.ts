import { create } from 'zustand';
import { Player, ConnectionState, ChatMessage, Entity, Creature, ZoneState, Position, PlayerPublic, isHubZone, TimingChallenge } from '@into-the-void/shared-types';
import type { Game } from '../game/Game';
import { gameSocket } from '../network/socket';
import { useEntityStore } from './entityStore';
import { useAlertStore } from './alertStore';
import { audioManager } from '../utils/audio';
import { useChatStore } from './chatStore';

export interface DiscoveredResource {
  entityId: string;
  rarity: 'rare' | 'epic';
  resourceType: 'mineral' | 'plant';
  zoneId: string;
  worldX: number;
  worldY: number;
  resourceId: string;
}

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

  // Death screen
  showDeathScreen: boolean;
  setShowDeathScreen: (show: boolean) => void;

  // Combat log
  showCombatLog: boolean;
  toggleCombatLog: () => void;

  // Abilities panel
  showAbilities: boolean;
  toggleAbilities: () => void;

  // Quest log
  isQuestLogOpen: boolean;
  toggleQuestLog: () => void;

  // Discovered resources (rare nodes)
  discoveredResources: DiscoveredResource[];
  setDiscoveredResources: (resources: DiscoveredResource[]) => void;
  addDiscoveredResource: (resource: DiscoveredResource) => void;
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

  // Death screen
  showDeathScreen: false,
  setShowDeathScreen: (show) => set({ showDeathScreen: show }),

  // Combat log
  showCombatLog: true, // Default visible
  toggleCombatLog: () => set((state) => ({ showCombatLog: !state.showCombatLog })),

  // Abilities panel
  showAbilities: false,
  toggleAbilities: () => set((state) => ({ showAbilities: !state.showAbilities })),

  // Quest log
  isQuestLogOpen: false,
  toggleQuestLog: () => set((state) => ({ isQuestLogOpen: !state.isQuestLogOpen })),

  // Discovered resources
  discoveredResources: [],
  setDiscoveredResources: (resources: DiscoveredResource[]) =>
    set({ discoveredResources: resources }),
  addDiscoveredResource: (resource: DiscoveredResource) =>
    set((state) => ({
      discoveredResources: [...state.discoveredResources, resource],
    })),
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
  // Clear entities on initial load OR when transitioning to/from hub zones.
  // Hub zones are instanced and separate from the world grid, so their entities
  // should not persist across transitions. For normal world zone transitions,
  // entities from adjacent zones must persist for cross-chunk visibility.
  const isInitialLoad = currentZoneId === null;
  const isHubTransition = isZoneTransition && (isHubZone(zoneId) || (currentZoneId && isHubZone(currentZoneId)));
  const shouldClearEntities = isInitialLoad || isHubTransition;

  // Populate entityStore for click-to-attack lookups
  // Clear on initial load or hub transitions, then add all zone entities
  if (shouldClearEntities) {
    useEntityStore.getState().clearEntities();
  }
  if (entities && entities.length > 0) {
    for (const entity of entities) {
      useEntityStore.getState().spawnEntity(entity);
    }
  }

  if (game) {
    const worldScene = game.getWorldScene();
    if (worldScene) {
      // Clear entities on initial load or hub transitions
      if (shouldClearEntities) {
        worldScene.clearEntities();
      }
      worldScene.clearOtherPlayers();

      // Spawn entities (spawnEntity checks for duplicates)
      for (const entity of entities) {
        worldScene.spawnEntity(entity, zoneId);
      }

      // Update entity collision positions for movement prediction
      worldScene.updateEntityCollisionPositions();

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
    worldScene.updateEntityCollisionPositions();
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
    worldScene.updateEntityCollisionPositions();
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
    // Update collision positions if entity moved
    if ('position' in changes) {
      worldScene.updateEntityCollisionPositions();
    }
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
    // Batch updates often contain position changes (creature movement)
    worldScene.updateEntityCollisionPositions();
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
    // Local player died - enter Emergency Lockdown Mode
    useGameStore.getState().setPlayer({
      ...currentPlayer,
      isDead: true,
      health: 0,
    });
    // Show death screen (replaces auto-respawn)
    useGameStore.getState().setShowDeathScreen(true);
    // Show lockdown message
    const chatMessage: ChatMessage = {
      id: Date.now().toString(),
      senderId: 'system',
      senderName: 'System',
      message: 'Emergency Lockdown Mode activated. Choose a recovery option.',
      channel: 'system',
      timestamp: Date.now(),
    };
    useChatStore.getState().addMessage(chatMessage);
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
gameSocket.on('player:respawn', ({ playerId, position, health, maxHealth }: { playerId: string; position: Position; health: number; maxHealth: number }) => {
  const currentPlayer = useGameStore.getState().player;
  const game = useGameStore.getState().game;
  const worldScene = game?.getWorldScene();

  if (currentPlayer && playerId === currentPlayer.id) {
    // Local player respawned - hide death screen
    useGameStore.getState().setShowDeathScreen(false);
    useGameStore.getState().setPlayer({
      ...currentPlayer,
      isDead: false,
      health: health,
      maxHealth: maxHealth,
      position,
    });
    // Show respawn message based on health restored
    const healthPercent = Math.round((health / maxHealth) * 100);
    const isFullHealth = healthPercent >= 100;
    const chatMessage: ChatMessage = {
      id: Date.now().toString(),
      senderId: 'system',
      senderName: 'System',
      message: isFullHealth
        ? 'Emergency extraction complete. You have been transported to your faction hub.'
        : `Suit rebooted. ${healthPercent}% integrity restored.`,
      channel: 'system',
      timestamp: Date.now(),
    };
    useChatStore.getState().addMessage(chatMessage);
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
      credits: 0,
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
  defenderPosition?: { x: number; y: number };
  damageType?: import('@into-the-void/shared-types').DamageType;
}) => {
  const game = useGameStore.getState().game;
  const worldScene = game?.getWorldScene();
  const currentPlayer = useGameStore.getState().player;

  if (!worldScene) return;

  // Play combat hit SFX (AUD-04 — overlapping playback for rapid hits)
  audioManager.playEffect('/assets/audio/sfx-combat-hit.mp3');

  // Determine if this is damage to the local player
  const isLocalPlayer = currentPlayer?.id === data.defenderId;

  // Show floating damage number (pass position and damageType as fallback/color hint)
  worldScene.showDamageNumber(data.defenderId, data.damage, isLocalPlayer, data.defenderPosition, data.damageType);

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
  console.log('[DEBUG] Server error:', { code, message });
  const chatMessage: ChatMessage = {
    id: Date.now().toString(),
    senderId: 'system',
    senderName: 'System',
    message: message,
    channel: 'system',
    timestamp: Date.now(),
  };
  useChatStore.getState().addMessage(chatMessage);
});

// Listen for credits updates (from trading)
gameSocket.on('credits:update', (data: { credits: number }) => {
  const state = useGameStore.getState();
  if (state.player) {
    useGameStore.setState({
      player: { ...state.player, credits: data.credits },
    });
  }
});

// Listen for XP updates
gameSocket.on('player:xp', (data: { playerId: string; xp: number; xpToNextLevel: number; level: number; leveledUp: boolean }) => {
  const state = useGameStore.getState();
  if (state.player && state.player.id === data.playerId) {
    useGameStore.setState({
      player: {
        ...state.player,
        xp: data.xp,
        xpToNextLevel: data.xpToNextLevel,
        level: data.level,
      },
    });

    // Show level up message in chat
    if (data.leveledUp) {
      const chatMessage: ChatMessage = {
        id: Date.now().toString(),
        senderId: 'system',
        senderName: 'System',
        message: `Level up! You are now level ${data.level}.`,
        channel: 'system',
        timestamp: Date.now(),
      };
      useChatStore.getState().addMessage(chatMessage);
    }
  }
});

// Listen for level updates (includes health changes)
gameSocket.on('player:level', (data: { playerId: string; level: number; health: number; maxHealth: number }) => {
  const state = useGameStore.getState();
  if (state.player && state.player.id === data.playerId) {
    useGameStore.setState({
      player: {
        ...state.player,
        level: data.level,
        health: data.health,
        maxHealth: data.maxHealth,
      },
    });
  }
});

// Listen for health updates (from equipment changes affecting durability)
gameSocket.on('player:health', (data: { playerId: string; health: number; maxHealth: number }) => {
  const state = useGameStore.getState();
  if (state.player && state.player.id === data.playerId) {
    useGameStore.setState({
      player: {
        ...state.player,
        health: data.health,
        maxHealth: data.maxHealth,
      },
    });
  }
});

// Listen for regeneration updates (health/energy regen when not in combat)
gameSocket.on('player:regen', (data: { playerId: string; health: number; maxHealth: number; energy: number; maxEnergy: number }) => {
  console.log('[gameStore] player:regen received', data);
  const state = useGameStore.getState();
  if (state.player && state.player.id === data.playerId) {
    useGameStore.setState({
      player: {
        ...state.player,
        health: data.health,
        maxHealth: data.maxHealth,
        energy: data.energy,
        maxEnergy: data.maxEnergy,
      },
    });
  }
});

// Handle gathering challenge (mini-game start)
gameSocket.on('gathering:challenge', (challenge: TimingChallenge) => {
  console.log('[DEBUG] Received gathering:challenge', challenge);
  const game = useGameStore.getState().game;
  const worldScene = game?.getWorldScene();
  if (worldScene) {
    worldScene.handleGatheringChallenge(challenge);
  }
});

// Handle gathering result (mini-game complete)
gameSocket.on('gathering:result', (result: {
  success: boolean;
  accuracy: string;
  yieldMultiplier: number;
  items: { itemId: string; quantity: number }[];
  proficiencyXP: number;
  proficiencyLevel: number;
  category: string;
  error?: string;
}) => {
  if (!result.success && result.error) {
    useAlertStore.getState().addAlert(result.error, 'error');
    return;
  }

  // Play gathering success SFX (AUD-04)
  audioManager.playEffect('/assets/audio/sfx-gathering.mp3');

  // Show accuracy feedback
  const accuracyMessages = {
    perfect: 'Perfect! +50% yield bonus!',
    good: 'Good timing!',
    poor: 'Poor timing. -50% yield.',
  };
  const message = accuracyMessages[result.accuracy as keyof typeof accuracyMessages] || 'Gathered!';
  const alertType = result.accuracy === 'perfect' ? 'info' : result.accuracy === 'good' ? 'info' : 'warning';

  useAlertStore.getState().addAlert(`${message} +${result.proficiencyXP} XP`, alertType);
});

