// src/hooks/useWebSocket.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import type { WebSocketMessage, WebSocketHook } from '../types';

// Dynamic WebSocket URL based on environment
const getWebSocketUrl = () => {
  // Use environment variable if set
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }
  
  // Auto-detect based on current location
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  
  // For development, assume backend on :3001 (not 8080!)
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    return `ws://localhost:3001/ws`;
  }
  
  // For production, use same host with /ws path
  return `${protocol}//${host}/ws`;
};

export const useWebSocket = (): WebSocketHook => {
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [lastMessage, setLastMessage] = useState<any>(null);
  
  const ws = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectInterval = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const wsUrl = getWebSocketUrl();
    console.log('Connecting to WebSocket:', wsUrl);
    setConnectionState('connecting');
    
    try {
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('WebSocket connected');
        setConnectionState('connected');
        reconnectAttempts.current = 0;
        
        // Clear any existing reconnect timer
        if (reconnectInterval.current) {
          clearTimeout(reconnectInterval.current);
        }
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.current.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setConnectionState('disconnected');
        
        // Attempt to reconnect if it wasn't a manual close
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
          reconnectAttempts.current++;
          
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`);
          
          reconnectInterval.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionState('error');
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionState('error');
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectInterval.current) {
      clearTimeout(reconnectInterval.current);
    }
    
    if (ws.current) {
      ws.current.close(1000, 'Manual disconnect');
      ws.current = null;
    }
    
    setConnectionState('disconnected');
  }, []);

  const send = useCallback(async (message: WebSocketMessage): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket is not connected'));
        return;
      }

      try {
        const messageString = JSON.stringify(message);
        ws.current.send(messageString);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    connect();

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Heartbeat to keep connection alive
  useEffect(() => {
    if (connectionState === 'connected') {
      const heartbeat = setInterval(() => {
        send({ type: 'ping' }).catch(() => {
          // Ping failed, connection might be dead
          console.warn('Heartbeat failed');
        });
      }, 30000); // 30 seconds

      return () => clearInterval(heartbeat);
    }
  }, [connectionState, send]);

  return {
    send,
    lastMessage,
    connectionState,
    connect,
    disconnect
  };
};
