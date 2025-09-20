// src/services/WebSocketSingleton.ts
import type { WebSocketMessage } from '../types';

// Dynamic WebSocket URL based on environment
const getWebSocketUrl = () => {
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }
  
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    return `ws://localhost:3001/ws`;
  }
  
  return `${protocol}//${host}/ws`;
};

class WebSocketSingleton {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private messageListeners: ((message: any) => void)[] = [];
  private connectionStateListeners: ((state: 'connecting' | 'connected' | 'disconnected' | 'error') => void)[] = [];
  private currentState: 'connecting' | 'connected' | 'disconnected' | 'error' = 'disconnected';

  constructor() {
    this.connect();
  }

  private connect() {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }

    this.isConnecting = true;
    const wsUrl = getWebSocketUrl();
    console.log('🔌 Singleton connecting to:', wsUrl);
    this.updateState('connecting');
    
    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('✅ Singleton connected');
        this.updateState('connected');
        this.reconnectAttempts = 0;
        this.isConnecting = false;
        
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.messageListeners.forEach(listener => listener(data));
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('❌ Singleton closed:', event.code, event.reason);
        this.updateState('disconnected');
        this.isConnecting = false;
        
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
          this.reconnectAttempts++;
          
          console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
          
          this.reconnectTimer = setTimeout(() => {
            this.connect();
          }, delay);
        }
      };

      this.ws.onerror = (error) => {
        console.error('❌ Singleton error:', error);
        this.updateState('error');
        this.isConnecting = false;
      };

    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      this.updateState('error');
      this.isConnecting = false;
    }
  }

  private updateState(state: 'connecting' | 'connected' | 'disconnected' | 'error') {
    this.currentState = state;
    this.connectionStateListeners.forEach(listener => listener(state));
  }

  public send(message: WebSocketMessage): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket is not connected'));
        return;
      }

      try {
        const messageString = JSON.stringify(message);
        this.ws.send(messageString);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  public addMessageListener(listener: (message: any) => void) {
    this.messageListeners.push(listener);
  }

  public removeMessageListener(listener: (message: any) => void) {
    this.messageListeners = this.messageListeners.filter(l => l !== listener);
  }

  public addConnectionStateListener(listener: (state: 'connecting' | 'connected' | 'disconnected' | 'error') => void) {
    this.connectionStateListeners.push(listener);
    // Immediately call with current state
    listener(this.currentState);
  }

  public removeConnectionStateListener(listener: (state: 'connecting' | 'connected' | 'disconnected' | 'error') => void) {
    this.connectionStateListeners = this.connectionStateListeners.filter(l => l !== listener);
  }

  public getConnectionState() {
    return this.currentState;
  }

  public disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }
    
    this.updateState('disconnected');
  }
}

// Create singleton instance
export const webSocketSingleton = new WebSocketSingleton();
