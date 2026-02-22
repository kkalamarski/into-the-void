import React from 'react';
import { useAlertStore } from '../store/alertStore';
import './AlertNotification.css';

export const AlertNotification: React.FC = () => {
  const alerts = useAlertStore((state) => state.alerts);

  if (alerts.length === 0) return null;

  return (
    <div className="alert-notification-container">
      {alerts.map((alert) => (
        <div key={alert.id} className={`alert-notification alert-${alert.type}`}>
          {alert.message}
        </div>
      ))}
    </div>
  );
};
