import React, { useEffect, useState } from 'react';
import { useCombatStore } from '../../store/combatStore';
import { useEntityStore } from '../../store/entityStore';
import { useStatsStore } from '../../store/statsStore';
import { gameSocket } from '../../network/socket';
import { Creature } from '@into-the-void/shared-types';
import { RARITY_COLORS } from '../constants';
import './TargetFrame.css';

// Map creature behavior to rarity tier for coloring (matches TargetHighlight)
const BEHAVIOR_TO_COLOR: Record<string, string> = {
  herbivore: RARITY_COLORS.common,    // gray
  omnivore: RARITY_COLORS.rare,       // blue
  predator: RARITY_COLORS.epic,       // purple
  maniac: RARITY_COLORS.legendary,    // gold
};

export const TargetFrame: React.FC = () => {
  const selectedTarget = useCombatStore((state) => state.selectedTarget);
  const entity = useEntityStore((state) =>
    selectedTarget ? state.entities.get(selectedTarget) : undefined
  );
  const stats = useStatsStore((state) => state.stats);
  const [damageFlash, setDamageFlash] = useState(false);

  // Listen for damage to target for flash effect
  useEffect(() => {
    const handleDamage = (data: { defenderId: string; damage: number }) => {
      if (data.defenderId === selectedTarget) {
        setDamageFlash(true);
        setTimeout(() => setDamageFlash(false), 200);
      }
    };

    gameSocket.on('combat:damage', handleDamage);
    return () => {
      gameSocket.off('combat:damage', handleDamage);
    };
  }, [selectedTarget]);

  // No target or not a creature
  if (!selectedTarget || !entity || entity.type !== 'creature') {
    return null;
  }

  const creature = entity as Creature;

  // Perception gating: show "???" if creature level exceeds perception * 3
  const perceptionThreshold = stats ? stats.total.perception * 3 : Infinity;
  const isGated = creature.level > perceptionThreshold;

  // Display values
  const displayName = isGated ? '???' : creature.name;
  const displayLevel = isGated ? '??' : creature.level.toString();
  const behaviorColor = BEHAVIOR_TO_COLOR[creature.behavior] ?? RARITY_COLORS.common;

  // Health bar percentage
  const healthPercent = Math.max(0, Math.min(100, (creature.health / creature.maxHealth) * 100));

  return (
    <div className={`target-frame ${damageFlash ? 'target-frame-flash' : ''}`}>
      <div className="target-frame-header" style={{ borderColor: behaviorColor }}>
        <span className="target-frame-level" style={{ backgroundColor: behaviorColor }}>
          {displayLevel}
        </span>
        <span className="target-frame-name" style={{ color: behaviorColor }}>
          {displayName}
        </span>
      </div>
      <div className="target-frame-health-container">
        <div
          className="target-frame-health-bar"
          style={{ width: `${healthPercent}%` }}
        />
        <span className="target-frame-health-text">
          {creature.health} / {creature.maxHealth}
        </span>
      </div>
    </div>
  );
};
