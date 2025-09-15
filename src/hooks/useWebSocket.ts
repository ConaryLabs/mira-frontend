// src/hooks/useWebSocket.ts

import { useRef, useCallback, useEffect, useState } from 'react';
import type { WsServerMessage, WsClientMessage, createStatusMessage } from '../types/websocket';

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
        try {
          ws.current?.send(JSON.stringify(msg));
        } catch (error) {
          console.error('[WS] Failed to send queued message:', error);
        }
      });
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    if (heartbeatTimeout.current) clearTimeout(heartbeatTimeout.current);
    
    heartbeatTimeout.current = setTimeout(() => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        try {
          // Send ping as Status message for your backend
          const pingMessage: WsClientMessage = {
            type: 'Status',
            message: 'ping'
          };
          ws.current.send(JSON.stringify(pingMessage));
          console.log('[WS] Ping sent');
          startHeartbeat();
        } catch (error) {
          console.error('[WS] Heartbeat failed:', error);
        }
      }
    }, heartbeatInterval);
  }, [heartbeatInterval]);

  const clearTimeouts = useCallback(() => {
    if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
    if (heartbeatTimeout.current) clearTimeout(heartbeatTimeout.current);
    if (connectTimeout.current) clearTimeout(connectTimeout.current);
  }, []);

  const attemptReconnect = useCallback(() => {
    if (!shouldReconnect.current || isConnecting.current) return;

    const delay = getReconnectDelay();
    console.log(`[WS] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current + 1})`);
    
    reconnectTimeout.current = setTimeout(() => {
      if (shouldReconnect.current) {
        reconnectAttempts.current++;
        connect();
      }
    }, delay);
  }, [getReconnectDelay]);

  const connect = useCallback(() => {
    if (isConnecting.current || (ws.current && ws.current.readyState === WebSocket.OPEN)) {
      return;
    }

    isConnecting.current = true;
    console.log('[WS] Connecting to:', url);

    connectTimeout.current = setTimeout(() => {
      if (ws.current && ws.current.readyState === WebSocket.CONNECTING) {
        console.log('[WS] Connection timeout');
        ws.current.close();
        isConnecting.current = false;
        attemptReconnect();
      }
    }, connectionTimeout);

    try {
      const newWs = new WebSocket(url);
      ws.current = newWs;

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
          
          // Log received messages
          console.log('[WS] Message received:', {
            type: message.type,
            timestamp: new Date().toISOString()
          });
          
          // Log specific message details
          switch (message.type) {
            case 'stream_chunk':
              const chunk = message as any;
              console.log(`[WS] Stream chunk: "${chunk.text?.substring(0, 50)}..."`);
              break;
            case 'stream_end':
              console.log('[WS] Stream ended');
              break;
            case 'complete':
              console.log('[WS] Complete with metadata:', {
                mood: (message as any).mood,
                salience: (message as any).salience,
                tags: (message as any).tags
              });
              break;
            case 'pong':
              console.log('[WS] Pong received');
              return; // Don't forward pong to message handler
            case 'connection_ready':
              console.log('[WS] Connection ready received');
              break;
          }
          
          onMessage(message);
        } catch (error) {
          console.error('[WS] Failed to parse message:', error);
          console.error('[WS] Raw data:', event.data);
        }
      };

      newWs.onerror = (error) => {
        console.error('[WS] Connection error:', error);
        clearTimeout(connectTimeout.current!);
        isConnecting.current = false;
        onError?.(error);
      };

      newWs.onclose = (event) => {
        console.log(`[WS] Connection closed - Code: ${event.code}, Reason: ${event.reason}`);
        clearTimeout(connectTimeout.current!);
        ws.current = null;
        setIsConnected(false);
        isConnecting.current = false;
        clearTimeouts();
        onDisconnect?.();
        
        if (shouldReconnect.current && event.code !== 1000 && event.code !== 1001) {
          attemptReconnect();
        }
      };

    } catch (error) {
      console.error('[WS] Failed to create WebSocket:', error);
      isConnecting.current = false;
      attemptReconnect();
    }
  }, [url, onMessage, onConnect, onDisconnect, onError, connectionTimeout, startHeartbeat, processMessageQueue, attemptReconnect, clearTimeouts]);

  const send = useCallback((message: WsClientMessage) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      try {
        console.log('[WS] Sending message:', {
          type: message.type,
          hasContent: 'content' in message && !!message.content,
          contentLength: 'content' in message ? (message as any).content?.length : undefined
        });
        
        ws.current.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error('[WS] Failed to send message:', error);
        messageQueue.current.push(message);
        return false;
      }
    } else {
      console.log('[WS] WebSocket not ready, queueing message');
      messageQueue.current.push(message);
      return false;
    }
  }, []);

  const disconnect = useCallback(() => {
    console.log('[WS] Manual disconnect requested');
    shouldReconnect.current = false;
    clearTimeouts();
    
    if (ws.current) {
      ws.current.close(1000, 'Manual disconnect');
      ws.current = null;
    }
    
    setIsConnected(false);
    messageQueue.current = [];
  }, [clearTimeouts]);

  const reconnect = useCallback(() => {
    console.log('[WS] Manual reconnect requested');
    disconnect();
    shouldReconnect.current = true;
    reconnectAttempts.current = 0;
    
    setTimeout(() => {
      connect();
    }, 100);
  }, [disconnect, connect]);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    
    console.log('[WS] Initializing WebSocket connection');
    shouldReconnect.current = true;
    connect();

    return () => {
      console.log('[WS] Cleaning up WebSocket');
      shouldReconnect.current = false;
      clearTimeouts();
      
      if (ws.current) {
        ws.current.close(1000, 'Component unmounting');
        ws.current = null;
      }
      
      setIsConnected(false);
      messageQueue.current = [];
    };
  }, [connect, clearTimeouts]);

  useEffect(() => {
    return () => {
      shouldReconnect.current = false;
    };
  }, []);

  return {
    isConnected,
    send,
    disconnect,
    reconnect,
    connectionState: ws.current?.readyState,
    reconnectAttempts: reconnectAttempts.current,
    queuedMessages: messageQueue.current.length
  };
}
