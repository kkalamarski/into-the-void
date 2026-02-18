import React, { useEffect } from 'react';
import { useStatsStore } from '../store/statsStore';
import { STAT_DISPLAY_ORDER } from '../ui/constants';
import './LevelUpNotification.css';

export const LevelUpNotification: React.FC = () => {
  const { levelUpDeltas, clearLevelUpDeltas } = useStatsStore();

  useEffect(() => {
    if (!levelUpDeltas) return;
    const timer = setTimeout(() => clearLevelUpDeltas(), 3000);
    return () => clearTimeout(timer);
  }, [levelUpDeltas, clearLevelUpDeltas]);

  if (!levelUpDeltas) return null;

  return (
    <div className="levelup-overlay">
      <div className="levelup-notification">
        <div className="levelup-title">Level Up!</div>
        <div className="levelup-deltas">
          {STAT_DISPLAY_ORDER
            .filter(({ key }) => levelUpDeltas[key] !== undefined)
            .map(({ key, label }) => (
              <span key={key} className="levelup-delta">
                +{levelUpDeltas[key]} {label}
              </span>
            ))}
        </div>
      </div>
    </div>
  );
};
