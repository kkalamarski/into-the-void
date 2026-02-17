import React from 'react';
import { useGameStore } from '../store/gameStore';
import { HUD } from './hud/HUD';
import { ChatPanel } from './panels/ChatPanel';
import { InventoryPanel } from './panels/InventoryPanel';
import './GameUI.css';

export const GameUI: React.FC = () => {
  const { showChat, showInventory, player } = useGameStore();

  if (!player) {
    // Show login/character select UI
    return (
      <div className="game-ui">
        <div className="main-menu">
          <h1>Into the Void</h1>
          <p>Press any key to continue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="game-ui">
      <HUD />
      {showChat && <ChatPanel />}
      {showInventory && <InventoryPanel />}
      <div className="minimap-border" />
    </div>
  );
};
