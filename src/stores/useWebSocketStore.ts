// src/stores/useWebSocketStore.ts

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

interface WebSocketStore {
  // Connection state
  socket: WebSocket | null;
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'error';
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  reconnectDelay: number;
  
  // Message handling
  lastMessage: WebSocketMessage | null;
  messageQueue: WebSocketMessage[];
  listeners: Map<string, (message: WebSocketMessage) => void>;
  
  // Actions
  connect: () => void;
  disconnect: () => void;
  send: (message: any) => Promise<void>;
  subscribe: (id: string, callback: (message: WebSocketMessage) => void) => () => void;
  
  // Internal actions
  setConnectionState: (state: WebSocketStore['connectionState']) => void;
  handleMessage: (message: WebSocketMessage) => void;
  processMessageQueue: () => void;
  scheduleReconnect: () => void;
}

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3102/ws';

// Message types we explicitly handle (won't log as unhandled)
const KNOWN_MESSAGE_TYPES = new Set([
  'status',
  'connection_ready',
  'heartbeat',
  'response',
  'data',
  'error',
]);

const KNOWN_DATA_TYPES = new Set([
  'project_list',
  'document_list',
  'document_deleted',
  'document_processing_started',
  'document_processing_progress',
  'document_processed',
  'document_content',
  'memory_data',
]);

// Messages we don't need to log (too noisy)
const SILENT_TYPES = new Set([
  'heartbeat',
  'document_processing_progress', // Can spam during upload
]);

export const useWebSocketStore = create<WebSocketStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    socket: null,
    connectionState: 'disconnected',
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,
    reconnectDelay: 1000,
    lastMessage: null,
    messageQueue: [],
    listeners: new Map(),
    
    // Connection management
    connect: () => {
      const state = get();
      
      if (state.connectionState === 'connected' || state.connectionState === 'connecting') {
        return;
      }
      
      set({ connectionState: 'connecting' });
      console.log('[WS] Connecting to', WS_URL);
      
      const socket = new WebSocket(WS_URL);
      
      socket.onopen = () => {
        console.log('[WS] Connected successfully');
        set({ 
          socket, 
          connectionState: 'connected',
          reconnectAttempts: 0,
          reconnectDelay: 1000 
        });
        
        get().processMessageQueue();
      };
      
      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          get().handleMessage(message);
        } catch (error) {
          console.error('[WS] Failed to parse message:', error);
        }
      };
      
      socket.onerror = (error) => {
        console.error('[WS] Socket error:', error);
        set({ connectionState: 'error' });
      };
      
      socket.onclose = () => {
        console.log('[WS] Connection closed');
        set({ socket: null, connectionState: 'disconnected' });
        
        const { reconnectAttempts, maxReconnectAttempts } = get();
        if (reconnectAttempts < maxReconnectAttempts) {
          get().scheduleReconnect();
        }
      };
      
      set({ socket });
    },
    
    disconnect: () => {
      const { socket } = get();
      if (socket) {
        console.log('[WS] Disconnecting');
        socket.close();
        set({ socket: null, connectionState: 'disconnected' });
      }
    },
    
    send: async (message: any) => {
      const { socket, connectionState } = get();
      
      if (connectionState !== 'connected' || !socket) {
        set(state => ({ 
          messageQueue: [...state.messageQueue, message] 
        }));
        return;
      }
      
      try {
        const messageStr = JSON.stringify(message);
        socket.send(messageStr);
        
        // Only log sent messages if they're interesting
        if (message.type !== 'heartbeat' && message.method !== 'memory.get_recent') {
          console.log('[WS] Sent:', message.type, message.method || '');
        }
      } catch (error) {
        console.error('[WS] Failed to send message:', error);
        set(state => ({ 
          messageQueue: [...state.messageQueue, message] 
        }));
      }
    },
    
    subscribe: (id: string, callback: (message: WebSocketMessage) => void) => {
      const { listeners } = get();
      listeners.set(id, callback);
      
      return () => {
        const { listeners } = get();
        listeners.delete(id);
      };
    },
    
    setConnectionState: (connectionState) => {
      set({ connectionState });
    },
    
    handleMessage: (message: WebSocketMessage) => {
      // Update last message
      set({ lastMessage: message });
      
      // Smart logging - reduce noise
      const shouldLog = !SILENT_TYPES.has(message.type) && 
                        !SILENT_TYPES.has(message.data?.type);
      
      if (shouldLog) {
        if (message.type === 'status') {
          console.log('[WS] Status:', message.message);
        } else if (message.type === 'data') {
          const dataType = message.data?.type;
          if (dataType && KNOWN_DATA_TYPES.has(dataType)) {
            console.log(`[WS] Data: ${dataType}`);
          } else if (dataType) {
            console.warn(`[WS] Unknown data type: ${dataType}`);
          }
        } else if (message.type === 'error') {
          console.error('[WS] Error:', message.message);
        } else if (message.type === 'response') {
          // Don't log responses, they're handled by ChatArea
        } else if (!KNOWN_MESSAGE_TYPES.has(message.type)) {
          console.warn(`[WS] Unknown message type: ${message.type}`);
        }
      }
      
      // Notify all listeners
      const { listeners } = get();
      listeners.forEach(callback => {
        try {
          callback(message);
        } catch (error) {
          console.error('[WS] Listener error:', error);
        }
      });
    },
    
    processMessageQueue: () => {
      const { messageQueue, socket } = get();
      if (!socket || messageQueue.length === 0) return;
      
      console.log(`[WS] Processing ${messageQueue.length} queued messages`);
      const queue = [...messageQueue];
      set({ messageQueue: [] });
      
      queue.forEach(message => {
        get().send(message);
      });
    },
    
    scheduleReconnect: () => {
      const { reconnectDelay, reconnectAttempts } = get();
      const delay = Math.min(reconnectDelay * Math.pow(2, reconnectAttempts), 30000);
      
      console.log(`[WS] Reconnecting in ${delay}ms (attempt ${reconnectAttempts + 1})`);
      
      set(state => ({ 
        reconnectAttempts: state.reconnectAttempts + 1 
      }));
      
      setTimeout(() => {
        get().connect();
      }, delay);
    },
  }))
);

// Auto-connect on import
if (typeof window !== 'undefined') {
  setTimeout(() => {
    useWebSocketStore.getState().connect();
  }, 100);
}
