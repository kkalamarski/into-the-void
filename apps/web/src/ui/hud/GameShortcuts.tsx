import React from 'react';
import { useGameStore } from '../../store/gameStore';
import './GameShortcuts.css';

export const GameShortcuts: React.FC = () => {
  const {
    toggleInventory,
    toggleEquipment,
    toggleAbilities,
    toggleQuestLog,
    toggleChat,
  } = useGameStore();

  return (
    <div className="game-shortcuts">
      <button className="game-shortcut-btn" onClick={toggleInventory} title="Inventory (I)">
        <span>I</span>
        <label>Inv</label>
      </button>
      <button className="game-shortcut-btn" onClick={toggleEquipment} title="Equipment (E)">
        <span>E</span>
        <label>Equip</label>
      </button>
      <button className="game-shortcut-btn" onClick={toggleAbilities} title="Abilities (K)">
        <span>K</span>
        <label>Skill</label>
      </button>
      <button className="game-shortcut-btn" onClick={toggleQuestLog} title="Quests (Q)">
        <span>Q</span>
        <label>Quest</label>
      </button>
      <button className="game-shortcut-btn" onClick={toggleChat} title="Chat (C)">
        <span>C</span>
        <label>Chat</label>
      </button>
    </div>
  );
};
