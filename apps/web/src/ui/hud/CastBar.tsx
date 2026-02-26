import React, { useEffect, useRef, useCallback } from 'react';
import { useAbilityStore } from '../../store/abilityStore';
import { AbilityRegistry } from '@into-the-void/game-logic';
import { gameSocket } from '../../network/socket';
import './CastBar.css';

export const CastBar: React.FC = () => {
  const activeCast = useAbilityStore((s) => s.activeCast);
  const fillRef = useRef<HTMLDivElement>(null);
  const remainingRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!activeCast) return;

    let rafId: number;
    const tick = () => {
      const now = Date.now();
      const elapsed = activeCast.castTimeMs - (activeCast.castEndsAt - now);
      const pct = Math.min(1, Math.max(0, elapsed / activeCast.castTimeMs));
      const secs = Math.max(0, (activeCast.castEndsAt - now) / 1000);

      // Direct DOM updates — skip React render cycle entirely
      if (fillRef.current) fillRef.current.style.width = `${pct * 100}%`;
      if (remainingRef.current) remainingRef.current.textContent = `${secs.toFixed(1)}s`;

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
        <span ref={remainingRef}>0.0s</span>
      </div>
      <div className="cast-bar-track" onClick={handleCancel} title="Click to cancel">
        <div className="cast-bar-fill" ref={fillRef} style={{ width: '0%' }} />
      </div>
    </div>
  );
};
