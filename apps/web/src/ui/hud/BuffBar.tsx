import React, { useState, useEffect } from 'react';
import { useBuffStore, ClientBuff } from '../../store/buffStore';
import './BuffBar.css';

/**
 * Individual buff icon with duration countdown and tooltip.
 */
function BuffIcon({ buff }: { buff: ClientBuff }) {
  const [remaining, setRemaining] = useState(0);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    const update = () => {
      const ms = Math.max(0, buff.expiresAt - Date.now());
      setRemaining(ms);
    };

    update();
    const interval = setInterval(update, 100);
    return () => clearInterval(interval);
  }, [buff.expiresAt]);

  const seconds = Math.ceil(remaining / 1000);
  const isExpiring = seconds <= 3 && seconds > 0;

  // Convert hex color to CSS color string
  const bgColor = `#${buff.iconColor.toString(16).padStart(6, '0')}`;

  // Format stat name for display (e.g., 'toughness' -> 'Toughness')
  const statName = buff.stat.charAt(0).toUpperCase() + buff.stat.slice(1);

  return (
    <div
      className={`buff-icon ${isExpiring ? 'expiring' : ''}`}
      style={{ backgroundColor: bgColor }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span className="buff-duration">{seconds}s</span>
      {showTooltip && (
        <div className="buff-tooltip">
          <div className="buff-tooltip-name">{buff.displayName}</div>
          <div className={`buff-tooltip-stat ${buff.amount < 0 ? 'negative' : ''}`}>
            {statName} {buff.amount >= 0 ? '+' : ''}{buff.amount}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Bar displaying all active buffs below the health/energy bars.
 */
export const BuffBar: React.FC = () => {
  const buffs = useBuffStore((state) => state.getBuffs());

  if (buffs.length === 0) {
    return null;
  }

  return (
    <div className="buff-bar">
      {buffs.map((buff) => (
        <BuffIcon key={buff.id} buff={buff} />
      ))}
    </div>
  );
};
