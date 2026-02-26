import React, { useEffect, useState, useCallback } from 'react';
import { useAbilityStore } from '../../store/abilityStore';
import { AbilityRegistry } from '@into-the-void/game-logic';
import { gameSocket } from '../../network/socket';
import './CastBar.css';

export const CastBar: React.FC = () => {
  const activeCast = useAbilityStore((s) => s.activeCast);
  const [progress, setProgress] = useState(0);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!activeCast) {
      setProgress(0);
      setRemaining(0);
      return;
    }

    let rafId: number;
    const tick = () => {
      const now = Date.now();
      const elapsed = activeCast.castTimeMs - (activeCast.castEndsAt - now);
      const pct = Math.min(1, Math.max(0, elapsed / activeCast.castTimeMs));
      setProgress(pct);
      setRemaining(Math.max(0, (activeCast.castEndsAt - now) / 1000));
      if (pct < 1) {
        rafId = requestAnimationFrame(tick);
      }
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [activeCast]);

  const handleCancel = useCallback(() => {
    gameSocket.emit('cast:cancel', {});
  }, []);

  if (!activeCast) return null;

  const ability = AbilityRegistry.get(activeCast.abilityId);
  const name = ability?.displayName ?? activeCast.abilityId;

  return (
    <div className="cast-bar">
      <div className="cast-bar-label">
        <span>{name}</span>
        <span>{remaining.toFixed(1)}s</span>
      </div>
      <div className="cast-bar-track" onClick={handleCancel} title="Click to cancel">
        <div className="cast-bar-fill" style={{ width: `${progress * 100}%` }} />
      </div>
    </div>
  );
};
