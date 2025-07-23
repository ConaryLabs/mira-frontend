// mira-frontend/src/hooks/useWebSocket.ts
import { useRef, useCallback, useEffect, useState } from 'react';
import type { WsServerMessage, WsClientMessage } from '../types/websocket';

interface UseWebSocketOptions {
  url: string;
  onMessage: (message: WsServerMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  reconnectDelay?: number;
  maxReconnectDelay?: number;
  reconnectDecay?: number;
}

export function useWebSocket({
  url,
  onMessage,
  onConnect,
  onDisconnect,
  onError,
  reconnectDelay = 1000,
  maxReconnectDelay = 30000,
  reconnectDecay = 1.5
}: UseWebSocketOptions) {
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout>();
  const reconnectAttempts = useRef(0);
  const [isConnected, setIsConnected] = useState(false);
  const shouldReconnect = useRef(true);
  const mounted = useRef(false);

  const getReconnectDelay = useCallback(() => {
    const delay = Math.min(
      reconnectDelay * Math.pow(reconnectDecay, reconnectAttempts.current),
      maxReconnectDelay
    );
    return delay;
  }, [reconnectDelay, maxReconnectDelay, reconnectDecay]);

  const disconnect = useCallback(() => {
    shouldReconnect.current = false;
    
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = undefined;
    }
    
    if (ws.current && ws.current.readyState !== WebSocket.CLOSED) {
      ws.current.close(1000, 'User disconnect');
    }
    
    ws.current = null;
    setIsConnected(false);
  }, []);

  const connect = useCallback(() => {
    // Don't connect if not mounted or shouldn't reconnect
    if (!mounted.current || !shouldReconnect.current) {
      return;
    }

    // Don't create a new connection if one already exists
    if (ws.current && (ws.current.readyState === WebSocket.CONNECTING || 
                       ws.current.readyState === WebSocket.OPEN)) {
      return;
    }

    try {
      console.log(`Attempting WebSocket connection to ${url}`);
      
      ws.current = new WebSocket(url);

      ws.current.onopen = () => {
        if (!mounted.current) {
          ws.current?.close();
          return;
        }
        
        console.log('WebSocket connected');
        setIsConnected(true);
        reconnectAttempts.current = 0;
        onConnect?.();
      };

      ws.current.onmessage = (event) => {
        if (!mounted.current) return;
        
        try {
          const message: WsServerMessage = JSON.parse(event.data);
          onMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        onError?.(error);
      };

      ws.current.onclose = (event) => {
        console.log('WebSocket closed', event.code, event.reason);
        setIsConnected(false);
        onDisconnect?.();
        
        ws.current = null;

        // Only reconnect if we should and it wasn't a normal closure
        if (mounted.current && shouldReconnect.current && event.code !== 1000) {
          const delay = getReconnectDelay();
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current + 1})`);
          
          reconnectTimeout.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        }
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      setIsConnected(false);
      
      // Retry connection after delay
      if (mounted.current && shouldReconnect.current) {
        const delay = getReconnectDelay();
        reconnectTimeout.current = setTimeout(() => {
          reconnectAttempts.current++;
          connect();
        }, delay);
      }
    }
  }, [url, onMessage, onConnect, onDisconnect, onError, getReconnectDelay]);

  const send = useCallback((message: WsClientMessage) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    shouldReconnect.current = true;
    
    // Small delay to ensure component is fully mounted
    const connectTimeout = setTimeout(() => {
      if (mounted.current) {
        connect();
      }
    }, 100);
    
    return () => {
      mounted.current = false;
      clearTimeout(connectTimeout);
      disconnect();
    };
  }, []); // Empty deps to prevent reconnecting on every render

  // Handle URL changes
  useEffect(() => {
    if (mounted.current && ws.current) {
      // If URL changed, disconnect and reconnect
      disconnect();
      setTimeout(() => {
        if (mounted.current) {
          shouldReconnect.current = true;
          connect();
        }
      }, 100);
    }
  }, [url]);

  return { isConnected, send, disconnect };
}
