import { io, Socket } from 'socket.io-client';
import {
  ClientEvents,
  ServerEvents,
  ConnectionState,
  Player,
} from '@into-the-void/shared-types';
import { useGameStore } from '../store/gameStore';

type ServerEventHandler<K extends keyof ServerEvents> = (data: ServerEvents[K]) => void;

type ServerEventHandlers = {
  [K in keyof ServerEvents]?: ServerEventHandler<K>[];
};

class GameSocket {
  private socket: Socket | null = null;
  private handlers: ServerEventHandlers = {};
  private connectionState: ConnectionState = 'disconnected';
  private onStateChange?: (state: ConnectionState) => void;
  private authTimeout?: ReturnType<typeof setTimeout>;
  private pingInterval?: ReturnType<typeof setInterval>;
  private latency = 0;

  connect(url: string): void {
    if (this.socket?.connected) return;

    this.setConnectionState('connecting');

    this.socket = io(url, {
      transports: ['websocket'],
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      if (this.socket?.recovered) {
        // Connection recovered - skip auth, restore state
        console.log('Connection recovered');
        this.setConnectionState('authenticated');
        this.startPingMonitoring();
      } else {
        // New connection - need to authenticate
        console.log('Connected - awaiting auth');
        this.setConnectionState('connected');
      }
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from game server');
      this.setConnectionState('disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.setConnectionState('error');
    });

    // Register event handlers
    this.socket.on('auth:success', (data) => {
      this.setConnectionState('authenticated');
      this.dispatch('zone:state', data);
    });

    this.socket.on('auth:error', (data) => {
      console.error('Auth error:', data.message);
      this.setConnectionState('error');
    });

    // Server events
    const serverEvents: (keyof ServerEvents)[] = [
      'zone:state',
      'zone:update',
      'zone:chunk',
      'entity:spawn',
      'entity:despawn',
      'entity:update',
      'entity:batch',
      'player:joined',
      'player:left',
      'player:moved',
      'player:xp',
      'player:level',
      'player:health',
      'player:regen',
      'combat:start',
      'combat:damage',
      'combat:result',
      'combat:end',
      'chat:message',
      'inventory:update',
      'storage:update',
      'stats:update',
      'player:death',
      'player:respawn',
      'error',
      'credits:update',
      'trade:result',
      'npc:interact:response',
      'ability:result',
      'ability:cooldown',
    ];

    for (const event of serverEvents) {
      this.socket.on(event, (data: unknown) => {
        this.dispatch(event, data as ServerEvents[typeof event]);
      });
    }
  }

  disconnect(): void {
    this.stopPingMonitoring();
    clearTimeout(this.authTimeout);
    this.socket?.disconnect();
    this.socket = null;
    this.setConnectionState('disconnected');
  }

  authenticate(token: string, characterId: string): Promise<Player> {
    return new Promise((resolve, reject) => {
      // Set 10 second timeout
      this.authTimeout = setTimeout(() => {
        reject(new Error('Authentication timeout'));
        this.setConnectionState('error');
      }, 10000);

      this.socket?.emit('auth', { token, characterId });

      // One-time listeners for auth response
      this.socket?.once('auth:success', (data: { player: Player }) => {
        clearTimeout(this.authTimeout);
        this.setConnectionState('authenticated');
        this.startPingMonitoring();
        resolve(data.player);
      });

      this.socket?.once('auth:error', (data: { code: string; message: string; action: string }) => {
        clearTimeout(this.authTimeout);
        this.setConnectionState('error');
        reject(new Error(data.message || 'Authentication failed'));
      });
    });
  }

  emit<K extends keyof ClientEvents>(event: K, data: ClientEvents[K]): void {
    if (!this.socket?.connected) {
      console.warn('Cannot emit: not connected');
      return;
    }
    this.socket.emit(event, data);
  }

  on<K extends keyof ServerEvents>(
    event: K,
    handler: ServerEventHandler<K>
  ): void {
    if (!this.handlers[event]) {
      this.handlers[event] = [] as ServerEventHandlers[K];
    }
    (this.handlers[event] as ServerEventHandler<K>[]).push(handler);
  }

  off<K extends keyof ServerEvents>(event: K, handler?: ServerEventHandler<K>): void {
    if (!handler) {
      delete this.handlers[event];
    } else {
      const list = this.handlers[event] as ServerEventHandler<K>[] | undefined;
      if (list) {
        this.handlers[event] = list.filter(h => h !== handler) as ServerEventHandlers[K];
      }
    }
  }

  private dispatch<K extends keyof ServerEvents>(event: K, data: ServerEvents[K]): void {
    const list = this.handlers[event] as ServerEventHandler<K>[] | undefined;
    if (list) {
      for (const handler of list) {
        handler(data);
      }
    }
  }

  onConnectionStateChange(callback: (state: ConnectionState) => void): void {
    this.onStateChange = callback;
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  getLatency(): number {
    return this.latency;
  }

  private startPingMonitoring(): void {
    // Clear any existing interval
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    this.pingInterval = setInterval(() => {
      if (this.socket?.connected) {
        const startTime = Date.now();
        this.socket.emit('ping', startTime, (responseTime: number) => {
          this.latency = Date.now() - responseTime;
          // Import and use gameStore
          const { setLatency } = useGameStore.getState();
          setLatency(this.latency);
        });
      }
    }, 5000); // Every 5 seconds
  }

  private stopPingMonitoring(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = undefined;
    }
  }

  private setConnectionState(state: ConnectionState): void {
    this.connectionState = state;
    this.onStateChange?.(state);
  }
}

// Singleton instance
export const gameSocket = new GameSocket();
