import React from 'react';
import { GiWaterSplash } from 'react-icons/gi';
import { useLiquidStore } from '../../store/liquidStore';
import './LiquidIndicator.css';

/**
 * HUD indicator for active liquid effects.
 * Shows when the player is standing in a liquid tile.
 * Displays liquid name, speed reduction, and damage/heal info.
 */
export const LiquidIndicator: React.FC = () => {
  const { active, displayName, color, speedMultiplier, damagePerTick, healPerTick } =
    useLiquidStore();

  if (!active) return null;

  // Convert hex number color to CSS hex string
  const colorHex = color != null
    ? `#${color.toString(16).padStart(6, '0')}`
    : '#4488cc';

  const bgStyle = {
    background: `rgba(${hexNumToRgb(color ?? 0x4488cc)}, 0.85)`,
    border: `2px solid ${colorHex}`,
  };

  const speedPercent = Math.round(speedMultiplier * 100);

  return (
    <div className="liquid-indicator" style={bgStyle}>
      <div className="liquid-header">
        <GiWaterSplash className="liquid-icon" style={{ color: '#fff' }} />
        <span className="liquid-label">{displayName || 'Liquid'}</span>
      </div>
      <div className="liquid-effects">
        <span className="liquid-speed">Speed: {speedPercent}%</span>
        {damagePerTick > 0 && (
          <span className="liquid-damage">-{damagePerTick} HP/tick</span>
        )}
        {healPerTick > 0 && (
          <span className="liquid-heal">+{healPerTick} HP/tick</span>
        )}
      </div>
    </div>
  );
};

/**
 * Convert hex number to RGB values for rgba() usage.
 */
function hexNumToRgb(hex: number): string {
  const r = (hex >> 16) & 0xff;
  const g = (hex >> 8) & 0xff;
  const b = hex & 0xff;
  return `${r}, ${g}, ${b}`;
}
