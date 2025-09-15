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
  reconnectDelay = 5000,
  maxReconnectDelay = 60000,
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
  
  // Store callbacks in refs to avoid dependency issues
  const onMessageRef = useRef(onMessage);
  const onConnectRef = useRef(onConnect);
  const onDisconnectRef = useRef(onDisconnect);
  const onErrorRef = useRef(onError);
  
  // Update refs when props change
  useEffect(() => {
    onMessageRef.current = onMessage;
    onConnectRef.current = onConnect;
    onDisconnectRef.current = onDisconnect;
    onErrorRef.current = onError;
  }, [onMessage, onConnect, onDisconnect, onError]);

  const clearTimeouts = useCallback(() => {
    if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
    if (heartbeatTimeout.current) clearTimeout(heartbeatTimeout.current);
    if (connectTimeout.current) clearTimeout(connectTimeout.current);
  }, []);

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
          const pingMessage: WsClientMessage = {
            type: 'status',
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

  const getReconnectDelay = useCallback(() => {
    const delay = Math.min(
      reconnectDelay * Math.pow(reconnectDecay, reconnectAttempts.current),
      maxReconnectDelay
    );
    return delay;
  }, [reconnectDelay, maxReconnectDelay, reconnectDecay]);

  // Create stable connect function that doesn't depend on callbacks
  const connectStable = useCallback(() => {
    if (isConnecting.current || (ws.current && ws.current.readyState === WebSocket.OPEN)) {
      console.log('[WS] Already connected or connecting, skipping');
      return;
    }

    isConnecting.current = true;
    console.log('[WS] Connecting to:', url);

    connectTimeout.current = setTimeout(() => {
      if (ws.current && ws.current.readyState === WebSocket.CONNECTING) {
        console.log('[WS] Connection timeout');
        ws.current.close();
        isConnecting.current = false;
        // Trigger reconnect
        if (shouldReconnect.current) {
          const delay = getReconnectDelay();
          console.log(`[WS] Reconnecting in ${delay}ms`);
          reconnectTimeout.current = setTimeout(() => {
            reconnectAttempts.current++;
            connectStable();
          }, delay);
        }
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
        
        // Delay heartbeat start
        setTimeout(() => startHeartbeat(), 2000);
        processMessageQueue();
        onConnectRef.current?.();
      };

      newWs.onmessage = (event) => {
        try {
          const message: WsServerMessage = JSON.parse(event.data);
          
          console.log('[WS] Message received:', {
            type: message.type,
            timestamp: new Date().toISOString()
          });
          
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
              return;
            case 'connection_ready':
              console.log('[WS] Connection ready received');
              break;
          }
          
          onMessageRef.current(message);
        } catch (error) {
          console.error('[WS] Failed to parse message:', error);
          console.error('[WS] Raw data:', event.data);
        }
      };

      newWs.onerror = (error) => {
        console.error('[WS] Connection error:', error);
        clearTimeout(connectTimeout.current!);
        isConnecting.current = false;
        onErrorRef.current?.(error);
      };

      newWs.onclose = (event) => {
        console.log(`[WS] Connection closed - Code: ${event.code}, Reason: ${event.reason}`);
        clearTimeout(connectTimeout.current!);
        ws.current = null;
        setIsConnected(false);
        isConnecting.current = false;
        clearTimeouts();
        onDisconnectRef.current?.();
        
        if (shouldReconnect.current && event.code !== 1000 && event.code !== 1001) {
          const delay = getReconnectDelay();
          console.log(`[WS] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current + 1})`);
          reconnectTimeout.current = setTimeout(() => {
            reconnectAttempts.current++;
            connectStable();
          }, delay);
        }
      };

    } catch (error) {
      console.error('[WS] Failed to create WebSocket:', error);
      isConnecting.current = false;
      
      if (shouldReconnect.current) {
        const delay = getReconnectDelay();
        reconnectTimeout.current = setTimeout(() => {
          reconnectAttempts.current++;
          connectStable();
        }, delay);
      }
    }
  }, [url, connectionTimeout, startHeartbeat, processMessageQueue, clearTimeouts, getReconnectDelay]);

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
      connectStable();
    }, 100);
  }, [disconnect, connectStable]);

  // Main initialization effect - empty deps array!
  useEffect(() => {
    // Use a mounting flag to prevent double init
    let mounted = true;
    
    console.log('[WS] Initializing WebSocket connection');
    shouldReconnect.current = true;
    
    // Small delay to ensure everything is ready
    const initTimer = setTimeout(() => {
      if (mounted) {
        connectStable();
      }
    }, 100);

    return () => {
      mounted = false;
      clearTimeout(initTimer);
      console.log('[WS] Component unmounting - cleaning up');
      shouldReconnect.current = false;
      clearTimeouts();
      
      if (ws.current) {
        ws.current.close(1000, 'Component unmounting');
        ws.current = null;
      }
      
      setIsConnected(false);
      messageQueue.current = [];
    };
  }, []); // EMPTY DEPS - only run once!

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
