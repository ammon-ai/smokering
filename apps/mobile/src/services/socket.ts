import { io, Socket } from 'socket.io-client';
import Constants from 'expo-constants';
import { api } from './api';

const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:3001';

class SocketService {
  private socket: Socket | null = null;
  private currentCookId: string | null = null;
  private listeners: Map<string, Set<(data: unknown) => void>> = new Map();

  connect(): void {
    if (this.socket?.connected) return;

    const token = api.getAccessToken();
    if (!token) {
      console.log('No auth token, skipping socket connection');
      return;
    }

    this.socket = io(API_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('Socket connected');

      // Rejoin cook room if we were watching one
      if (this.currentCookId) {
        this.joinCook(this.currentCookId);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    // Handle real-time events
    this.socket.on('temp-update', (data) => {
      this.emit('temp-update', data);
    });

    this.socket.on('phase-update', (data) => {
      this.emit('phase-update', data);
    });

    this.socket.on('cook-completed', (data) => {
      this.emit('cook-completed', data);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.currentCookId = null;
  }

  joinCook(cookId: string): void {
    if (!this.socket?.connected) {
      this.currentCookId = cookId;
      this.connect();
      return;
    }

    if (this.currentCookId && this.currentCookId !== cookId) {
      this.socket.emit('leave-cook');
    }

    this.currentCookId = cookId;
    this.socket.emit('join-cook', cookId);
  }

  leaveCook(): void {
    if (this.socket?.connected && this.currentCookId) {
      this.socket.emit('leave-cook');
      this.currentCookId = null;
    }
  }

  // Notify other clients about temp log
  notifyTempLogged(cookId: string, reading: unknown): void {
    if (this.socket?.connected) {
      this.socket.emit('temp-logged', { cookId, reading });
    }
  }

  // Notify other clients about phase update
  notifyPhaseUpdated(cookId: string, phase: string): void {
    if (this.socket?.connected) {
      this.socket.emit('phase-updated', { cookId, phase });
    }
  }

  // Event subscription
  on(event: string, callback: (data: unknown) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  private emit(event: string, data: unknown): void {
    this.listeners.get(event)?.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in socket listener for ${event}:`, error);
      }
    });
  }
}

export const socketService = new SocketService();
