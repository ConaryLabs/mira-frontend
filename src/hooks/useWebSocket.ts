// src/hooks/useWebSocket.ts
// CRITICAL FIX - Stops the connection/disconnection loop
// Problem: useEffect was running multiple times causing repeated connections
// Solution: Properly manage connection lifecycle with stable dependencies

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
  
  // CRITICAL: Track if we've initialized to prevent multiple connections
  const hasInitialized = useRef(false);

  const getReconnectDelay = useCallback(() => {
    const delay = Math.min(
      reconnectDelay * Math.pow(reconnectDecay, reconnectAttempts.current),
      maxReconnectDelay
    );
    return delay;
  }, [reconnectDelay, maxReconnectDelay, reconnectDecay]);

  const processMessageQueue = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN && messageQueue.current.length > 0) {
      console.log(`[WS] Processing ${messageQueue.current.length} queued messages`);
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
    if (heartbeatTimeout.current) clearTimeout(heartbeatTimeout.current);
    const sendHeartbeat = () => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        console.log('[WS] Heartbeat check');
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
      // Remove all event handlers before closing
      ws.current.onopen = null;
      ws.current.onclose = null;
      ws.current.onerror = null;
      ws.current.onmessage = null;
      
      if (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING) {
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
    
    if (!shouldReconnect.current) {
      console.log('[WS] Should not reconnect, skipping...');
      return;
    }
    
    // Check if already connected
    if (ws.current && (ws.current.readyState === WebSocket.CONNECTING || ws.current.readyState === WebSocket.OPEN)) {
      console.log('[WS] Already connected or connecting');
      return;
    }

    isConnecting.current = true;
    clearTimeouts();

    try {
      console.log(`[WS] Attempting connection to ${url}`);
      const newWs = new WebSocket(url);
      
      // Store reference immediately to prevent duplicate connections
      ws.current = newWs;

      connectTimeout.current = setTimeout(() => {
        if (newWs.readyState === WebSocket.CONNECTING) {
          console.log('[WS] Connection timeout, closing...');
          newWs.close();
          isConnecting.current = false;
          ws.current = null;
        }
      }, connectionTimeout);

      newWs.onopen = () => {
        console.log('[WS] Connected successfully');
        clearTimeout(connectTimeout.current!);
        setIsConnected(true);
        isConnecting.current = false;
        reconnectAttempts.current = 0;
        startHeartbeat();
        processMessageQueue();
        onConnect?.();
      };

      newWs.onmessage = (event) => {
        try {
          const message: WsServerMessage = JSON.parse(event.data);
          
          // Enhanced logging
          const messageInfo = {
            type: message.type,
            hasContent: 'content' in message ? !!(message as any).content : false,
            contentLength: 'content' in message ? (message as any).content?.length : 0,
            fullMessage: message
          };
          
          console.log('[WS] Message received:', messageInfo);
          
          // Log chunk content preview
          if (message.type === 'chunk') {
            const chunk = message as any;
            console.log(`[WS] Chunk content preview: "${chunk.content?.substring(0, 50)}..."`);
          }
          
          onMessage(message);
        } catch (error) {
          console.error('[WS] Failed to parse message:', error);
          console.error('[WS] Raw data:', event.data);
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
        
        // Only reconnect on abnormal closure
        if (shouldReconnect.current && event.code !== 1000 && event.code !== 1001) {
          const delay = getReconnectDelay();
          console.log(`[WS] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current + 1})`);
          reconnectTimeout.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        }
      };

    } catch (error) {
      console.error('[WS] Failed to create WebSocket:', error);
      ws.current = null;
      setIsConnected(false);
      isConnecting.current = false;
      
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
      console.log(`[WS] → ${message.type}`, message);
      ws.current.send(JSON.stringify(message));
    } else {
      console.warn(`[WS] Not connected, queueing ${message.type} message`);
      messageQueue.current.push(message);
      if (!isConnected && !isConnecting.current && shouldReconnect.current) {
        connect();
      }
    }
  }, [isConnected, connect]);

  // CRITICAL FIX: Only connect once on mount, not on every render
  useEffect(() => {
    // Only initialize once
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      shouldReconnect.current = true;
      connect();
    }
    
    // Cleanup on unmount only
    return () => {
      if (hasInitialized.current) {
        hasInitialized.current = false;
        shouldReconnect.current = false;
        disconnect();
      }
    };
  }, []); // CRITICAL: Empty dependency array - only run once!

  return { 
    isConnected, 
    send, 
    disconnect,
    reconnect: () => {
      shouldReconnect.current = true;
      reconnectAttempts.current = 0;
      if (ws.current?.readyState !== WebSocket.OPEN && !isConnecting.current) {
        connect();
      }
    }
  };
}
