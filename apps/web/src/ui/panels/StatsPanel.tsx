import React, { useEffect } from 'react';
import { useStatsStore } from '../../store/statsStore';
import { useGameStore } from '../../store/gameStore';
import { useDraggablePanel } from '../../hooks/useDraggablePanel';
import { STAT_DISPLAY_ORDER } from '../constants';
import {
  GiHearts,
  GiShield,
  GiSwordWound,
  GiSpeedometer,
  GiBattery100,
  GiHealing,
  GiRadarSweep,
  GiMagicShield,
} from 'react-icons/gi';
import type { IconType } from 'react-icons';
import './StatsPanel.css';

const STAT_ICONS: Record<string, IconType> = {
  durability: GiHearts,
  toughness: GiShield,
  power: GiSwordWound,
  haste: GiSpeedometer,
  vigor: GiBattery100,
  recovery: GiHealing,
  perception: GiRadarSweep,
  resilience: GiMagicShield,
};

interface StatRowProps {
  statKey: string;
  label: string;
  base: number;
  equipment: number;
  total: number;
}

function StatRow({ statKey, label, base, equipment, total }: StatRowProps) {
  const Icon = STAT_ICONS[statKey] ?? GiHearts;
  return (
    <div className="stats-panel-row">
      <Icon className="stats-panel-icon" />
      <span className="stats-panel-label">{label}</span>
      <span className="stats-panel-total">{total}</span>
      <span className="stats-panel-breakdown">
        {equipment !== 0 ? `(${base} + ${equipment})` : `(${base})`}
      </span>
    </div>
  );
}

export const StatsPanel: React.FC = () => {
  const { stats } = useStatsStore();
  const { toggleStats } = useGameStore();
  const { position, isDragging, handleMouseDown } = useDraggablePanel();

  // Disable Phaser keyboard when panel is open
  useEffect(() => {
    const game = useGameStore.getState().game;
    const worldScene = game?.getWorldScene();
    if (worldScene) worldScene.setKeyboardEnabled(false);
    return () => {
      const game = useGameStore.getState().game;
      const worldScene = game?.getWorldScene();
      if (worldScene) worldScene.setKeyboardEnabled(true);
    };
  }, []);

  if (!stats) return null;

  return (
    <div
      className="stats-panel ui-panel"
      style={{ transform: `translateY(-50%) translate(${position.x}px, ${position.y}px)` }}
    >
      <div
        className="stats-panel-header"
        onMouseDown={handleMouseDown}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <span>Character Stats</span>
        <button className="close-btn" onClick={toggleStats}>&times;</button>
      </div>
      <div className="stats-panel-body">
        {STAT_DISPLAY_ORDER.map(({ key, label }) => (
          <StatRow
            key={key}
            statKey={key}
            label={label}
            base={stats.base[key]}
            equipment={stats.equipment[key]}
            total={stats.total[key]}
          />
        ))}
      </div>
    </div>
  );
};
