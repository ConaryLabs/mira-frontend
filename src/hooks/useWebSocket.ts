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
  heartbeatInterval?: number;
  connectionTimeout?: number;
}

export function useWebSocket({
  url,
  onMessage,
  onConnect,
  onDisconnect,
  onError,
  reconnectDelay = 1000,
  maxReconnectDelay = 30000,
  reconnectDecay = 1.5,
  heartbeatInterval = 30000,
  connectionTimeout = 10000
}: UseWebSocketOptions) {
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout>();
  const heartbeatTimeout = useRef<NodeJS.Timeout>();
  const connectTimeout = useRef<NodeJS.Timeout>();
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
      console.log(`Processing ${messageQueue.current.length} queued messages`);
      const messages = [...messageQueue.current];
      messageQueue.current = [];
      messages.forEach(msg => {
        ws.current?.send(JSON.stringify(msg));
      });
    }
  }, []);

  const clearTimeouts = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = undefined;
    }
    if (heartbeatTimeout.current) {
      clearTimeout(heartbeatTimeout.current);
      heartbeatTimeout.current = undefined;
    }
    if (connectTimeout.current) {
      clearTimeout(connectTimeout.current);
      connectTimeout.current = undefined;
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    // Clear any existing heartbeat
    if (heartbeatTimeout.current) {
      clearTimeout(heartbeatTimeout.current);
    }

    const sendHeartbeat = () => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        console.log('[WS] Heartbeat check');
        // The backend sends pings, we just need to be ready for them
        heartbeatTimeout.current = setTimeout(sendHeartbeat, heartbeatInterval);
      }
    };

    heartbeatTimeout.current = setTimeout(sendHeartbeat, heartbeatInterval);
  }, [heartbeatInterval]);

  const disconnect = useCallback(() => {
    console.log('[WS] Disconnecting...');
    shouldReconnect.current = false;
    isConnecting.current = false;
    
    clearTimeouts();
    
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
    messageQueue.current = [];
  }, [clearTimeouts]);

  const connect = useCallback(() => {
    // Prevent multiple simultaneous connection attempts
    if (isConnecting.current) {
      console.log('[WS] Already connecting, skipping...');
      return;
    }

    // Don't connect if we shouldn't reconnect
    if (!shouldReconnect.current) {
      console.log('[WS] Should not reconnect, skipping...');
      return;
    }

    // Don't create a new connection if one already exists and is healthy
    if (ws.current && (ws.current.readyState === WebSocket.CONNECTING || 
                       ws.current.readyState === WebSocket.OPEN)) {
      console.log('[WS] Already connected or connecting');
      return;
    }

    isConnecting.current = true;
    clearTimeouts();

    try {
      console.log(`[WS] Attempting connection to ${url}`);
      
      const newWs = new WebSocket(url);

      // Set connection timeout
      connectTimeout.current = setTimeout(() => {
        if (newWs.readyState === WebSocket.CONNECTING) {
          console.log('[WS] Connection timeout, closing...');
          newWs.close();
          isConnecting.current = false;
        }
      }, connectionTimeout);

      newWs.onopen = () => {
        console.log('[WS] Connected successfully');
        clearTimeout(connectTimeout.current!);
        
        ws.current = newWs;
        setIsConnected(true);
        isConnecting.current = false;
        reconnectAttempts.current = 0;
        
        // Start heartbeat monitoring
        startHeartbeat();
        
        // Process any queued messages
        processMessageQueue();
        
        onConnect?.();
      };

      newWs.onmessage = (event) => {
        try {
          const message: WsServerMessage = JSON.parse(event.data);
          onMessage(message);
        } catch (error) {
          console.error('[WS] Failed to parse message:', error);
        }
      };

      newWs.onerror = (error) => {
        console.error('[WS] Error:', error);
        clearTimeout(connectTimeout.current!);
        isConnecting.current = false;
        onError?.(error);
      };

      newWs.onclose = (event) => {
        console.log(`[WS] Closed - Code: ${event.code}, Reason: ${event.reason}`);
        clearTimeout(connectTimeout.current!);
        
        ws.current = null;
        setIsConnected(false);
        isConnecting.current = false;
        clearTimeouts();
        
        onDisconnect?.();

        // Only reconnect if:
        // 1. We should reconnect
        // 2. It wasn't a normal closure (1000)
        // 3. It wasn't a going away closure (1001) 
        if (shouldReconnect.current && 
            event.code !== 1000 && 
            event.code !== 1001) {
          const delay = getReconnectDelay();
          console.log(`[WS] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current + 1})`);
          
          reconnectTimeout.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        }
      };

      // Handle ping/pong if needed
      newWs.addEventListener('ping', () => {
        console.log('[WS] Received ping from server');
      });

    } catch (error) {
      console.error('[WS] Failed to create WebSocket:', error);
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
  }, [url, onMessage, onConnect, onDisconnect, onError, getReconnectDelay, processMessageQueue, clearTimeouts, startHeartbeat, connectionTimeout]);

  const send = useCallback((message: WsClientMessage) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      console.log(`[WS] Sending ${message.type} message`);
      ws.current.send(JSON.stringify(message));
    } else {
      console.warn(`[WS] Not connected, queueing ${message.type} message`);
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

  return { 
    isConnected, 
    send, 
    disconnect,
    reconnect: () => {
      shouldReconnect.current = true;
      reconnectAttempts.current = 0;
      connect();
    }
  };
}
