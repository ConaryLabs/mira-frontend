// src/hooks/useWebSocket.ts
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
  const isConnecting = useRef(false);
  const messageQueue = useRef<WsClientMessage[]>([]);

  const getReconnectDelay = useCallback(() => {
    const delay = Math.min(
      reconnectDelay * Math.pow(reconnectDecay, reconnectAttempts.current),
      maxReconnectDelay
    );
    return delay;
  }, [reconnectDelay, maxReconnectDelay, reconnectDecay]);

  const processMessageQueue = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN && messageQueue.current.length > 0) {
      const messages = [...messageQueue.current];
      messageQueue.current = [];
      messages.forEach(msg => {
        ws.current?.send(JSON.stringify(msg));
      });
    }
  }, []);

  const disconnect = useCallback(() => {
    shouldReconnect.current = false;
    isConnecting.current = false;
    
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = undefined;
    }
    
    if (ws.current) {
      // Remove event handlers before closing to prevent reconnection
      ws.current.onopen = null;
      ws.current.onclose = null;
      ws.current.onerror = null;
      ws.current.onmessage = null;
      
      if (ws.current.readyState === WebSocket.OPEN || 
          ws.current.readyState === WebSocket.CONNECTING) {
        ws.current.close(1000, 'User disconnect');
      }
      
      ws.current = null;
    }
    
    setIsConnected(false);
  }, []);

  const connect = useCallback(() => {
    // Prevent multiple simultaneous connection attempts
    if (isConnecting.current) {
      console.log('Already connecting, skipping...');
      return;
    }

    // Don't connect if we shouldn't reconnect
    if (!shouldReconnect.current) {
      console.log('Should not reconnect, skipping...');
      return;
    }

    // Don't create a new connection if one already exists and is healthy
    if (ws.current && (ws.current.readyState === WebSocket.CONNECTING || 
                       ws.current.readyState === WebSocket.OPEN)) {
      console.log('WebSocket already connected or connecting');
      return;
    }

    isConnecting.current = true;

    try {
      console.log(`Attempting WebSocket connection to ${url}`);
      
      const newWs = new WebSocket(url);

      newWs.onopen = () => {
        console.log('WebSocket connected');
        ws.current = newWs;
        setIsConnected(true);
        isConnecting.current = false;
        reconnectAttempts.current = 0;
        
        // Process any queued messages
        processMessageQueue();
        
        // No ping/pong since backend doesn't support it yet
        
        onConnect?.();
      };

      newWs.onmessage = (event) => {
        try {
          const message: WsServerMessage = JSON.parse(event.data);
          onMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      newWs.onerror = (error) => {
        console.error('WebSocket error:', error);
        isConnecting.current = false;
        onError?.(error);
      };

      newWs.onclose = (event) => {
        console.log('WebSocket closed', event.code, event.reason);
        
        ws.current = null;
        setIsConnected(false);
        isConnecting.current = false;
        onDisconnect?.();

        // Only reconnect if:
        // 1. We should reconnect
        // 2. It wasn't a normal closure (1000)
        // 3. It wasn't a going away closure (1001) 
        if (shouldReconnect.current && 
            event.code !== 1000 && 
            event.code !== 1001) {
          const delay = getReconnectDelay();
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current + 1})`);
          
          reconnectTimeout.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      setIsConnected(false);
      isConnecting.current = false;
      
      // Retry connection after delay
      if (shouldReconnect.current) {
        const delay = getReconnectDelay();
        reconnectTimeout.current = setTimeout(() => {
          reconnectAttempts.current++;
          connect();
        }, delay);
      }
    }
  }, [url, onMessage, onConnect, onDisconnect, onError, getReconnectDelay, processMessageQueue]);

  const send = useCallback((message: WsClientMessage) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, queueing message');
      messageQueue.current.push(message);
      
      // Try to reconnect if disconnected
      if (!isConnected && !isConnecting.current && shouldReconnect.current) {
        connect();
      }
    }
  }, [isConnected, connect]);

  // Initial connection
  useEffect(() => {
    shouldReconnect.current = true;
    connect();
    
    return () => {
      shouldReconnect.current = false;
      disconnect();
    };
  }, [url]); // Only reconnect if URL actually changes

  return { isConnected, send, disconnect };
}
