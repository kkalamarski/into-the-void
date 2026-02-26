import React, { useEffect, useRef, useState } from 'react';
import { Game } from '../game/Game';
import { GameUI } from '../ui/GameUI';
import { useGameStore } from '../store/gameStore';
import { useEntityStore } from '../store/entityStore';
import { ConnectionIndicator } from './ConnectionIndicator';
import { ReconnectOverlay } from './ReconnectOverlay';
import { gameSocket } from '../network/socket';
import { audioManager } from '../utils/audio';
import { ChunkData, BiomeType, Entity } from '@into-the-void/shared-types';

const GameContainer: React.FC = () => {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [phaserReady, setPhaserReady] = useState(false);
  const previousZoneIdRef = useRef<string | null>(null);

  // Subscribe to zoneState from store - this contains zone:state event data
  const { connectionState, setGame, zoneState, player } = useGameStore();
  const chunksLoading = useGameStore((state) => state.chunksLoading);

  // Track when WorldScene is actually active (not just Phaser booted)
  const [worldSceneReady, setWorldSceneReady] = useState(false);

  // Initialize Phaser game
  useEffect(() => {
    if (gameContainerRef.current && !gameRef.current) {
      const game = new Game(gameContainerRef.current);
      gameRef.current = game;
      setGame(game);

      // Wait for Phaser to be ready, then poll for WorldScene active
      game.onReady(() => {
        setPhaserReady(true);
        // Poll for WorldScene to become active (it starts after PreloadScene)
        const checkWorldScene = () => {
          if (game.isWorldSceneActive()) {
            setWorldSceneReady(true);
          } else {
            setTimeout(checkWorldScene, 50);
          }
        };
        checkWorldScene();
      });
    }

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy();
        gameRef.current = null;
        setPhaserReady(false);
        setWorldSceneReady(false);
      }
    };
  }, [setGame]);

  // Set up zone:chunk listener EARLY - before any chunk requests are made
  // This must be registered before loadZoneFromState triggers requests
  useEffect(() => {
    const handleChunkData = (data: { zoneId: string; chunk: ChunkData; biome: BiomeType; entities?: Entity[] }) => {
      console.log('[GameContainer] Received zone:chunk for', data.zoneId);
      const worldScene = gameRef.current?.getWorldScene();
      if (worldScene) {
        worldScene.receiveChunkData(data.chunk, data.biome);

        // Spawn entities from adjacent chunks with zone tracking for cleanup
        // Client filters by visibility, zone tracking enables memory cleanup on unload
        if (data.entities) {
          data.entities.forEach(entity => {
            // Add to entityStore for click-to-attack lookups
            useEntityStore.getState().spawnEntity(entity);
            worldScene.spawnEntity(entity, data.zoneId);
          });
        }
      }
    };

    gameSocket.on('zone:chunk', handleChunkData);

    return () => {
      gameSocket.off('zone:chunk');
    };
  }, []); // No dependencies - set up immediately and persist

  // Handle disconnect and reconnection
  const previousConnectionStateRef = useRef<string>(connectionState);
  useEffect(() => {
    const worldScene = gameRef.current?.getWorldScene();
    const prevState = previousConnectionStateRef.current;
    previousConnectionStateRef.current = connectionState;

    if (connectionState === 'disconnected') {
      // Clear ChunkManager state on disconnect to prevent stale loading entries
      worldScene?.getChunkManager()?.clear();
    } else if (connectionState === 'authenticated' && prevState === 'disconnected') {
      // Reconnected - reload chunks for current zone
      // Socket.IO recovery skips zone:state, so we need to manually reload
      console.log('[GameContainer] Reconnected - reloading chunks');
      const currentZoneId = player?.position?.zoneId;
      if (worldScene && currentZoneId && zoneState?.chunk) {
        // Reload the current zone from cached state
        worldScene.loadZoneFromState(zoneState.chunk, zoneState.biome);
        // ChunkManager will request adjacent chunks automatically
      }
    }
  }, [connectionState, player?.position?.zoneId, zoneState]);

  // Load zone data into WorldScene when WorldScene is ready and zoneState exists
  // IMPORTANT: Only depends on zoneState.zoneId to prevent re-rendering tiles on every player movement
  const zoneId = zoneState?.zoneId;
  useEffect(() => {
    if (!worldSceneReady || !gameRef.current || !zoneState) return;

    const worldScene = gameRef.current.getWorldScene();
    if (!worldScene) return;

    // zoneState contains the zone:state event data with tiles
    const { chunk, biome, players } = zoneState;

    // Determine if this is initial load or zone transition
    const isInitialLoad = previousZoneIdRef.current === null;
    const isZoneTransition = previousZoneIdRef.current !== null && previousZoneIdRef.current !== zoneId;

    // Update previous zone ref
    previousZoneIdRef.current = zoneId ?? null;

    // Set up chunk request handler (only needs to be done once, but harmless to repeat)
    worldScene.setChunkRequestHandler((requestZoneId: string) => {
      console.log('[GameContainer] Emitting zone:request for', requestZoneId);
      gameSocket.emit('zone:request', { zoneId: requestZoneId });
    });

    if (isInitialLoad) {
      // INITIAL LOAD: Pass full tile data from zone:state to WorldScene
      console.log('[GameContainer] Initial load for zone', zoneId);
      if (chunk && chunk.tiles && chunk.tiles.length > 0) {
        worldScene.loadZoneFromState(chunk, biome);
      }
    } else if (isZoneTransition) {
      // ZONE TRANSITION: Notify WorldScene of zone change
      console.log('[GameContainer] Zone transition to', zoneId);
      worldScene.onPlayerZoneChanged(zoneId!, biome);

      // For teleportation (hub transitions), fullZoneReset clears all chunks.
      // Re-load the zone data from the zone:state event so tiles render.
      if (chunk && chunk.tiles && chunk.tiles.length > 0) {
        worldScene.loadZoneFromState(chunk, biome);
      }

      // Reposition player sprite to new zone coordinates
      const playerPos = useGameStore.getState().player?.position;
      if (playerPos) {
        worldScene.updateLocalPlayer(playerPos);
      }

      // Progress and dismiss loading screen after tiles have rendered
      if (useGameStore.getState().isTeleporting) {
        useGameStore.getState().setLoadingProgress(90);
        setTimeout(() => {
          useGameStore.getState().setLoadingProgress(100);
          useGameStore.getState().setLoadingStage('ready');
          useGameStore.getState().setIsTeleporting(false);
        }, 600);
      }
    }

    // CRITICAL: Set collision map for pathfinding and movement validation
    if (chunk && chunk.collisions) {
      worldScene.setCollisionMap(chunk.collisions);
    }

    // Spawn other players from zone state (handles race condition when zone:state
    // arrives before Phaser is ready - gameStore handler may have missed them)
    if (players && players.length > 0) {
      const currentPlayerId = player?.id;
      worldScene.clearOtherPlayers();
      for (const p of players) {
        if (p.id !== currentPlayerId) {
          worldScene.addPlayer(p);
        }
      }
    }

    // Spawn entities from zone state (handles race condition when zone:state
    // arrives before Phaser is ready - gameStore handler may have missed them)
    // IMPORTANT: Only clear entities on initial load. On zone transitions, entities from
    // adjacent zones (loaded via zone:chunk) must persist - spawnEntity already checks for
    // duplicates and filters by visibility distance
    const { entities } = zoneState;
    if (entities && entities.length > 0) {
      if (isInitialLoad) {
        worldScene.clearEntities();
      }
      for (const entity of entities) {
        worldScene.spawnEntity(entity, zoneId);
      }
    }

  }, [worldSceneReady, zoneId, player?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Audio: First-gesture gate — initializes AudioContext on first click or keydown (AUD-02)
  useEffect(() => {
    const handleFirstGesture = async () => {
      await audioManager.init();
      // Remove both listeners (whichever fired first)
      document.removeEventListener('click', handleFirstGesture);
      document.removeEventListener('keydown', handleFirstGesture);
    };

    document.addEventListener('click', handleFirstGesture, { once: true });
    document.addEventListener('keydown', handleFirstGesture, { once: true });

    return () => {
      document.removeEventListener('click', handleFirstGesture);
      document.removeEventListener('keydown', handleFirstGesture);
    };
  }, []);

  // Audio: Tab visibility — pause music on blur, resume on focus (AUD-04)
  useEffect(() => {
    const handleVisibility = () => {
      audioManager.handleVisibilityChange(document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Initial player spawn only - position updates handled by MovementController
  const playerSpawnedRef = useRef(false);
  useEffect(() => {
    if (!worldSceneReady || !gameRef.current || !player?.position) return;
    if (playerSpawnedRef.current) return; // Only run once

    const worldScene = gameRef.current.getWorldScene();
    if (!worldScene) return;

    worldScene.updateLocalPlayer(player.position);
    playerSpawnedRef.current = true;
  }, [worldSceneReady, player?.position?.x, player?.position?.y]);

  return (
    <div className="app">
      <div ref={gameContainerRef} className="game-container" />
      <GameUI />

      {/* Always visible connection indicator */}
      <ConnectionIndicator />

      {/* Chunk loading indicator - always in DOM for CSS opacity transitions */}
      <div className={`chunk-loading-indicator ${chunksLoading > 0 ? 'visible' : ''}`}>
        <div className="chunk-loading-spinner" />
        <span>Loading terrain...</span>
      </div>

      {/* Show reconnect overlay when disconnected (but not on error) */}
      {connectionState === 'disconnected' && <ReconnectOverlay visible={true} />}
    </div>
  );
};

export default GameContainer;
