import React from 'react';
import { useGameStore } from '../store/gameStore';
import { ConnectionState } from '@into-the-void/shared-types';
import '../styles/loading.css';

const getStatusColor = (state: ConnectionState, latency: number): string => {
  switch (state) {
    case 'authenticated':
      return latency < 100 ? '#44cc44' : latency < 200 ? '#ffcc00' : '#ff8800';
    case 'connected':
    case 'connecting':
      return '#ffcc00'; // Yellow for pending
    case 'disconnected':
    case 'error':
      return '#ff4444'; // Red for problems
    default:
      return '#666666';
  }
};

const getLatencyBars = (latency: number): number => {
  if (latency < 50) return 4; // Excellent
  if (latency < 100) return 3; // Good
  if (latency < 200) return 2; // Fair
  return 1; // Poor
};

const getStatusText = (state: ConnectionState): string | null => {
  switch (state) {
    case 'connecting':
      return 'Connecting...';
    case 'connected':
      return 'Authenticating...';
    case 'disconnected':
      return 'Disconnected';
    case 'error':
      return 'Connection Error';
    default:
      return null;
  }
};

export const ConnectionIndicator: React.FC = () => {
  const connectionState = useGameStore((state) => state.connectionState);
  const latency = useGameStore((state) => state.latency);

  const statusColor = getStatusColor(connectionState, latency);
  const statusText = getStatusText(connectionState);
  const isAuthenticated = connectionState === 'authenticated';
  const filledBars = getLatencyBars(latency);

  return (
    <div className="connection-indicator">
      <div
        className="connection-dot"
        style={{ backgroundColor: statusColor }}
      />

      {isAuthenticated ? (
        <>
          <div className="connection-latency-bars">
            {[1, 2, 3, 4].map((barIndex) => (
              <div
                key={barIndex}
                className={`connection-latency-bar ${
                  barIndex <= filledBars ? 'active' : 'inactive'
                }`}
                style={{
                  backgroundColor:
                    barIndex <= filledBars ? statusColor : undefined,
                }}
              />
            ))}
          </div>
          <div className="connection-latency-ms">{latency}ms</div>
        </>
      ) : (
        statusText && <div className="connection-status-text">{statusText}</div>
      )}
    </div>
  );
};
