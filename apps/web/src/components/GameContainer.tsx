import React, { useEffect, useRef, useState } from 'react';
import { Game } from '../game/Game';
import { GameUI } from '../ui/GameUI';
import { useGameStore } from '../store/gameStore';
import { ConnectionIndicator } from './ConnectionIndicator';
import { ReconnectOverlay } from './ReconnectOverlay';
import { gameSocket } from '../network/socket';
import { ChunkData, BiomeType } from '@into-the-void/shared-types';

const GameContainer: React.FC = () => {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [phaserReady, setPhaserReady] = useState(false);

  // Subscribe to zoneState from store - this contains zone:state event data
  const { connectionState, setGame, zoneState, player } = useGameStore();

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

  // Load zone data into WorldScene when Phaser is ready and zoneState exists
  useEffect(() => {
    if (!phaserReady || !gameRef.current || !zoneState) return;

    const worldScene = gameRef.current.getWorldScene();
    if (!worldScene || !gameRef.current.isWorldSceneActive()) return;

    // zoneState contains the zone:state event data with tiles
    const { chunk, biome } = zoneState;

    // CRITICAL: Pass tile data from zone:state to WorldScene
    // This is the key link that connects socket data to Phaser rendering
    if (chunk && chunk.tiles && chunk.tiles.length > 0) {
      worldScene.loadZoneFromState(chunk, biome);
    }

    // Update player position in scene
    if (player?.position) {
      worldScene.updateLocalPlayer(player.position);
    }

    // Set up chunk request handler for adjacent chunks
    worldScene.setChunkRequestHandler((requestZoneId: string) => {
      gameSocket.emit('zone:request', { zoneId: requestZoneId });
    });

  }, [phaserReady, zoneState, player]);

  // Listen for additional chunk data from server (for adjacent chunks)
  useEffect(() => {
    if (!phaserReady || !gameRef.current) return;

    const handleChunkData = (data: { chunk: ChunkData; biome: BiomeType }) => {
      const worldScene = gameRef.current?.getWorldScene();
      if (worldScene) {
        worldScene.receiveChunkData(data.chunk, data.biome);
      }
    };

    gameSocket.on('zone:chunk', handleChunkData);

    return () => {
      gameSocket.off('zone:chunk');
    };
  }, [phaserReady]);

  return (
    <div className="app">
      <div ref={gameContainerRef} className="game-container" />
      <GameUI />

      {/* Always visible connection indicator */}
      <ConnectionIndicator />

      {/* Show reconnect overlay when disconnected (but not on error) */}
      {connectionState === 'disconnected' && <ReconnectOverlay visible={true} />}
    </div>
  );
};

export default GameContainer;
