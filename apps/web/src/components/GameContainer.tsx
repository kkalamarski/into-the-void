import React, { useEffect, useRef } from 'react';
import { Game } from '../game/Game';
import { GameUI } from '../ui/GameUI';
import { useGameStore } from '../store/gameStore';
import { ConnectionIndicator } from './ConnectionIndicator';
import { ReconnectOverlay } from './ReconnectOverlay';
import { gameSocket } from '../network/socket';
import { ChunkData, BiomeType } from '@into-the-void/shared-types';
import { WorldScene } from '../game/scenes/WorldScene';

const GameContainer: React.FC = () => {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);
  const { connectionState, setGame } = useGameStore();

  useEffect(() => {
    if (gameContainerRef.current && !gameRef.current) {
      const game = new Game(gameContainerRef.current);
      gameRef.current = game;
      setGame(game);
    }

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy();
        gameRef.current = null;
      }
    };
  }, [setGame]);

  // Set up chunk loading infrastructure
  useEffect(() => {
    if (!gameRef.current) return;

    // Get WorldScene reference
    const worldScene = gameRef.current.getScene('WorldScene') as WorldScene | undefined;
    if (!worldScene) return;

    // Set up chunk request handler
    worldScene.setChunkRequestHandler((zoneId: string) => {
      // Request chunk from server via socket
      // TODO: Server needs to implement:
      // - 'zone:request' handler to receive { zoneId: string }
      // - 'zone:chunk' emitter to send { chunk: ChunkData, biome: BiomeType }
      // For now, only initial zone from zone:state is rendered.
      gameSocket.emit('zone:request', { zoneId });
    });

    // Listen for chunk responses
    const handleChunkResponse = (data: { chunk: ChunkData; biome: BiomeType }) => {
      if (worldScene) {
        worldScene.receiveChunkData(data.chunk, data.biome);
      }
    };

    gameSocket.on('zone:chunk', handleChunkResponse);

    return () => {
      gameSocket.off('zone:chunk');
    };
  }, []);

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
