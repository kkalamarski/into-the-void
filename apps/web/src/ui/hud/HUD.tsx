import React from 'react';
import { useGameStore } from '../../store/gameStore';
import './HUD.css';

export const HUD: React.FC = () => {
  const { player, toggleInventory, toggleChat } = useGameStore();

  if (!player) return null;

  const healthPercent = (player.health / player.maxHealth) * 100;
  const energy = player.energy ?? 100;
  const maxEnergy = player.maxEnergy ?? 100;
  const energyPercent = (energy / maxEnergy) * 100;
  const xpPercent = (player.xp / player.xpToNextLevel) * 100;

  return (
    <div className="hud">
      <div className="hud-top-left">
        <div className="player-info">
          <div className="player-name">{player.name}</div>
          <div className="player-level">Lv. {player.level}</div>
        </div>
        <div className="health-bar">
          <div
            className="health-bar-fill"
            style={{ width: `${healthPercent}%` }}
          />
          <span className="health-text">
            {player.health} / {player.maxHealth}
          </span>
        </div>
        <div className="energy-bar">
          <div
            className="energy-bar-fill"
            style={{ width: `${energyPercent}%` }}
          />
          <span className="energy-text">
            {energy} / {maxEnergy}
          </span>
        </div>
        <div className="xp-bar">
          <div className="xp-bar-fill" style={{ width: `${xpPercent}%` }} />
          <span className="xp-text">
            {player.xp} / {player.xpToNextLevel} XP
          </span>
        </div>
      </div>

      <div className="hud-bottom">
        <div className="action-bar">
          <button className="action-btn" onClick={toggleInventory}>
            <span>I</span>
            <label>Inventory</label>
          </button>
          <button className="action-btn" onClick={toggleChat}>
            <span>C</span>
            <label>Chat</label>
          </button>
        </div>
      </div>

      <div className="hud-minimap">
        <div className="minimap-placeholder">
          <span>Zone: {player.position.zoneId}</span>
          <span>
            ({player.position.x}, {player.position.y})
          </span>
        </div>
      </div>
    </div>
  );
};
