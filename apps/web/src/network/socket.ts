import { io, Socket } from 'socket.io-client';
import {
  ClientEvents,
  ServerEvents,
  ConnectionState,
  AuthRequest,
} from '@into-the-void/shared-types';

type ServerEventHandlers = {
  [K in keyof ServerEvents]?: (data: ServerEvents[K]) => void;
};

class GameSocket {
  private socket: Socket | null = null;
  private handlers: ServerEventHandlers = {};
  private connectionState: ConnectionState = 'disconnected';
  private onStateChange?: (state: ConnectionState) => void;

  connect(url: string): void {
    if (this.socket?.connected) return;

    this.setConnectionState('connecting');

    this.socket = io(url, {
      transports: ['websocket'],
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      console.log('Connected to game server');
      this.setConnectionState('connected');
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
      this.handlers['zone:state']?.(data);
    });

    this.socket.on('auth:error', (data) => {
      console.error('Auth error:', data.error);
      this.setConnectionState('error');
    });

    // Server events
    const serverEvents: (keyof ServerEvents)[] = [
      'zone:state',
      'zone:update',
      'entity:spawn',
      'entity:despawn',
      'entity:update',
      'player:joined',
      'player:left',
      'player:moved',
      'combat:start',
      'combat:result',
      'combat:end',
      'chat:message',
      'inventory:update',
      'error',
    ];

    for (const event of serverEvents) {
      this.socket.on(event, (data: ServerEvents[typeof event]) => {
        this.handlers[event]?.(data);
      });
    }
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.setConnectionState('disconnected');
  }

  authenticate(token: string, characterId: string): void {
    this.emit('auth', { token, characterId });
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
    handler: (data: ServerEvents[K]) => void
  ): void {
    this.handlers[event] = handler as ServerEventHandlers[K];
  }

  off<K extends keyof ServerEvents>(event: K): void {
    delete this.handlers[event];
  }

  onConnectionStateChange(callback: (state: ConnectionState) => void): void {
    this.onStateChange = callback;
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  private setConnectionState(state: ConnectionState): void {
    this.connectionState = state;
    this.onStateChange?.(state);
  }
}

// Singleton instance
export const gameSocket = new GameSocket();
