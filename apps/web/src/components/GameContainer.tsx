import React, { useEffect, useRef, useState } from 'react';
import { Game } from '../game/Game';
import { GameUI } from '../ui/GameUI';
import { useGameStore } from '../store/gameStore';
import { ConnectionIndicator } from './ConnectionIndicator';
import { ReconnectOverlay } from './ReconnectOverlay';
import { gameSocket } from '../network/socket';
import { ChunkData, BiomeType, Entity } from '@into-the-void/shared-types';

const GameContainer: React.FC = () => {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [phaserReady, setPhaserReady] = useState(false);
  const previousZoneIdRef = useRef<string | null>(null);

  // Subscribe to zoneState from store - this contains zone:state event data
  const { connectionState, setGame, zoneState, player } = useGameStore();
  const chunksLoading = useGameStore((state) => state.chunksLoading);

  // Initialize Phaser game
  useEffect(() => {
    if (gameContainerRef.current && !gameRef.current) {
      const game = new Game(gameContainerRef.current);
      gameRef.current = game;
      setGame(game);

      // Wait for Phaser to be ready
      game.onReady(() => {
        setPhaserReady(true);
      });
    }

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy();
        gameRef.current = null;
        setPhaserReady(false);
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

  // Load zone data into WorldScene when Phaser is ready and zoneState exists
  // IMPORTANT: Only depends on zoneState.zoneId to prevent re-rendering tiles on every player movement
  const zoneId = zoneState?.zoneId;
  useEffect(() => {
    if (!phaserReady || !gameRef.current || !zoneState) return;

    const worldScene = gameRef.current.getWorldScene();
    if (!worldScene || !gameRef.current.isWorldSceneActive()) return;

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
      // ZONE TRANSITION: Just update chunks, don't re-render current zone
      console.log('[GameContainer] Zone transition to', zoneId);
      worldScene.onPlayerZoneChanged(zoneId!, biome);
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
    const { entities } = zoneState;
    if (entities && entities.length > 0) {
      worldScene.clearEntities();
      for (const entity of entities) {
        worldScene.spawnEntity(entity);
      }
    }

  }, [phaserReady, zoneId, player?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update player position in scene separately (runs on position changes)
  useEffect(() => {
    if (!phaserReady || !gameRef.current || !player?.position) return;

    const worldScene = gameRef.current.getWorldScene();
    if (!worldScene || !gameRef.current.isWorldSceneActive()) return;

    worldScene.updateLocalPlayer(player.position);
  }, [phaserReady, player?.position?.x, player?.position?.y]);

  return (
    <div className="app">
      <div ref={gameContainerRef} className="game-container" />
      <GameUI />

      {/* Always visible connection indicator */}
      <ConnectionIndicator />

      {/* Chunk loading indicator */}
      {chunksLoading > 0 && (
        <div className="chunk-loading-indicator">
          <div className="chunk-loading-spinner" />
          <span>Loading terrain...</span>
        </div>
      )}

      {/* Show reconnect overlay when disconnected (but not on error) */}
      {connectionState === 'disconnected' && <ReconnectOverlay visible={true} />}
    </div>
  );
};

export default GameContainer;
