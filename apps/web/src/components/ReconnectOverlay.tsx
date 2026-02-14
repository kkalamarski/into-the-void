import React, { useState, useEffect } from 'react';

interface ReconnectOverlayProps {
  /** Whether the overlay should be visible */
  visible: boolean;
  /** Optional reconnection attempt count */
  attemptCount?: number;
}

export function ReconnectOverlay({ visible, attemptCount }: ReconnectOverlayProps) {
  const [dots, setDots] = useState('.');

  useEffect(() => {
    if (!visible) {
      setDots('.');
      return;
    }

    const interval = setInterval(() => {
      setDots((prev) => {
        if (prev === '...') return '.';
        if (prev === '..') return '...';
        return '..';
      });
    }, 500);

    return () => clearInterval(interval);
  }, [visible]);

  if (!visible) {
    return null;
  }

  return (
    <div className="reconnect-overlay">
      <div className="reconnect-modal">
        <div className="reconnect-text">
          <span>Reconnecting</span>
          <span className="reconnect-dots">{dots}</span>
        </div>
        {attemptCount !== undefined && attemptCount > 0 && (
          <div className="reconnect-attempt">
            Attempt {attemptCount}
          </div>
        )}
      </div>
    </div>
  );
}
