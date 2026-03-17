import React from 'react';
import { useGameStore } from '../../store/gameStore';
import './TimeIndicator.css';

/**
 * HUD time-of-day indicator showing the current day/night phase name.
 * Positioned near the minimap, displays a simple text label.
 * Uses static HUD text color — no per-phase color coding.
 */
export const TimeIndicator: React.FC = () => {
  const dayNightPhase = useGameStore((state) => state.dayNightPhase);

  return (
    <div className="time-indicator">
      <span className="time-label">{dayNightPhase}</span>
    </div>
  );
};
