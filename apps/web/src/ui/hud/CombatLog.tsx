import React, { useEffect, useRef } from 'react';
import { useCombatLogStore, formatCombatTimestamp } from '../../store/combatLogStore';
import './CombatLog.css';

export const CombatLog: React.FC = () => {
  const { entries, visible } = useCombatLogStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new entries arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries.length]);

  if (!visible) {
    return null;
  }

  return (
    <div className="combat-log">
      <div className="combat-log-header">
        <span className="combat-log-title">Combat Log</span>
        <span className="combat-log-hint">[L] to toggle</span>
      </div>
      <div className="combat-log-entries" ref={scrollRef}>
        {entries.length === 0 ? (
          <div className="combat-log-empty">No combat activity</div>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              className={`combat-log-entry combat-log-entry-${entry.type}`}
            >
              <span className="combat-log-timestamp">
                {formatCombatTimestamp(entry.timestamp)}
              </span>
              {entry.type === 'dealt' ? (
                <span className="combat-log-message">
                  Hit <span className="combat-log-target">{entry.targetName}</span>
                  {' '}for{' '}
                  <span className={`combat-log-damage ${entry.critical ? 'combat-log-critical' : ''}`}>
                    {entry.damage}
                  </span>
                  {' '}damage
                  {entry.killed && <span className="combat-log-killed"> (killed)</span>}
                </span>
              ) : (
                <span className="combat-log-message">
                  <span className="combat-log-target">{entry.targetName}</span>
                  {' '}hit you for{' '}
                  <span className={`combat-log-damage ${entry.critical ? 'combat-log-critical' : ''}`}>
                    {entry.damage}
                  </span>
                  {' '}damage
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
