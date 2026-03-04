import React from 'react';
import { GiRadiations } from 'react-icons/gi';
import { useHazardStore } from '../../store/hazardStore';
import './HazardIndicator.css';

export const HazardIndicator: React.FC = () => {
  const { active, displayName, color, protectionPercent, inGracePeriod, tier, stackCount } =
    useHazardStore();

  if (!active) return null;

  const indicatorClass = `hazard-indicator ${inGracePeriod ? 'entering' : 'active'}`;
  const hazardColor = color || '#ff0000';

  // Derive background from hazard color with transparency
  const bgStyle = {
    background: `rgba(${hexToRgb(hazardColor)}, 0.85)`,
    border: `2px solid ${hazardColor}`,
  };

  return (
    <>
      {/* Screen tint overlay */}
      <div
        className={`hazard-screen-tint ${inGracePeriod ? 'fading-in' : 'active'}`}
        style={{ backgroundColor: hazardColor }}
      />

      {/* HUD indicator panel */}
      <div className={indicatorClass} style={bgStyle}>
        <div className="hazard-header">
          <GiRadiations
            className={`hazard-icon${protectionPercent < 100 ? ' unprotected' : ''}`}
            style={{ color: '#fff' }}
          />
          <span className="hazard-label">{displayName || 'Unknown Hazard'}</span>
          {tier != null && tier >= 4 && stackCount > 0 && (
            <span className="hazard-stack-count">x{stackCount}</span>
          )}
        </div>
        <div className="hazard-protection-bar">
          <div
            className="hazard-protection-fill"
            style={{
              width: `${Math.min(protectionPercent, 100)}%`,
              backgroundColor: '#fff',
            }}
          />
        </div>
        <span className="hazard-protection-text">
          {protectionPercent}% Protected
        </span>
        {inGracePeriod && (
          <span className="hazard-grace-text">Entering hazard zone...</span>
        )}
      </div>
    </>
  );
};

/**
 * Convert hex color string to RGB values for rgba() usage.
 */
function hexToRgb(hex: string): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}
