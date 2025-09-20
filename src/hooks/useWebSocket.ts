// src/hooks/useWebSocket.ts
import { useState, useEffect, useCallback } from 'react';
import { webSocketSingleton } from '../services/WebSocketSingleton';
import type { WebSocketMessage, WebSocketHook } from '../types';

export const useWebSocket = (): WebSocketHook => {
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [lastMessage, setLastMessage] = useState<any>(null);

  // Set up listeners on mount
  useEffect(() => {
    const messageListener = (message: any) => {
      setLastMessage(message);
    };

    const stateListener = (state: 'connecting' | 'connected' | 'disconnected' | 'error') => {
      setConnectionState(state);
    };

    webSocketSingleton.addMessageListener(messageListener);
    webSocketSingleton.addConnectionStateListener(stateListener);

    // Cleanup on unmount
    return () => {
      webSocketSingleton.removeMessageListener(messageListener);
      webSocketSingleton.removeConnectionStateListener(stateListener);
    };
  }, []);

  const send = useCallback(async (message: WebSocketMessage): Promise<void> => {
    return webSocketSingleton.send(message);
  }, []);

  const connect = useCallback(() => {
    // Singleton handles connection automatically
    console.log('Connection managed by singleton');
  }, []);

  const disconnect = useCallback(() => {
    webSocketSingleton.disconnect();
  }, []);

  return {
    send,
    lastMessage,
    connectionState,
    connect,
    disconnect
  };
};
