import { create } from 'zustand';

export type AlertType = 'info' | 'warning' | 'error';

interface Alert {
  id: string;
  message: string;
  type: AlertType;
  timestamp: number;
}

interface AlertState {
  alerts: Alert[];
  addAlert: (message: string, type?: AlertType) => void;
  removeAlert: (id: string) => void;
  clearAlerts: () => void;
}

const ALERT_DURATION = 5000; // 5 seconds per ERR-02

export const useAlertStore = create<AlertState>((set, get) => ({
  alerts: [],

  addAlert: (message, type = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const alert: Alert = {
      id,
      message,
      type,
      timestamp: Date.now(),
    };

    set((state) => ({
      alerts: [...state.alerts.slice(-4), alert], // Keep max 5 alerts
    }));

    // Auto-remove after duration
    setTimeout(() => {
      get().removeAlert(id);
    }, ALERT_DURATION);
  },

  removeAlert: (id) => {
    set((state) => ({
      alerts: state.alerts.filter((a) => a.id !== id),
    }));
  },

  clearAlerts: () => {
    set({ alerts: [] });
  },
}));
