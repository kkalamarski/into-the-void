import React, { useEffect, useRef } from 'react';
import { Game } from '../game/Game';
import { GameUI } from '../ui/GameUI';
import { useGameStore } from '../store/gameStore';

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

  return (
    <div className="app">
      <div ref={gameContainerRef} className="game-container" />
      <GameUI />
      {connectionState === 'connecting' && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
          <p>Connecting to server...</p>
        </div>
      )}
    </div>
  );
};

export default GameContainer;
