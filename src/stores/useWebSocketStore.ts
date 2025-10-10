// src/stores/useWebSocketStore.ts - PERFORMANCE FIX

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

// NEW: Subscriber with optional message type filter
interface Subscriber {
  callback: (message: WebSocketMessage) => void;
  messageTypes?: string[]; // If undefined, receives all messages
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
  listeners: Map<string, Subscriber>; // CHANGED: Now stores Subscriber objects
  
  // Actions
  connect: () => void;
  disconnect: () => void;
  send: (message: any) => Promise<void>;
  subscribe: (
    id: string, 
    callback: (message: WebSocketMessage) => void,
    messageTypes?: string[] // NEW: Optional message type filter
  ) => () => void;
  
  // Internal actions
  setConnectionState: (state: WebSocketStore['connectionState']) => void;
  handleMessage: (message: WebSocketMessage) => void;
  processMessageQueue: () => void;
  scheduleReconnect: () => void;
}

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001/ws';

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
  'local_directory_attached',  // ← ADDED: Recognize local directory attachments
]);

// Messages we don't need to log (too noisy)
const SILENT_TYPES = new Set([
  'heartbeat',
  'document_processing_progress',
]);

export const useWebSocketStore = create<WebSocketStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    socket: null,
    connectionState: 'disconnected',
    reconnectAttempts: 0,
    maxReconnectAttempts: 10,
    reconnectDelay: 1000,
    lastMessage: null,
    messageQueue: [],
    listeners: new Map(),
    
    connect: () => {
      const { socket, connectionState } = get();
      
      if (socket?.readyState === WebSocket.OPEN || connectionState === 'connecting') {
        return;
      }
      
      set({ connectionState: 'connecting' });
      
      try {
        const ws = new WebSocket(WS_URL);
        
        ws.onopen = () => {
          console.log('[WS] Connected');
          set({ 
            connectionState: 'connected', 
            reconnectAttempts: 0,
            socket: ws 
          });
          
          // Process queued messages
          get().processMessageQueue();
        };
        
        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            get().handleMessage(message);
          } catch (error) {
            console.error('[WS] Failed to parse message:', error);
          }
        };
        
        ws.onerror = (error) => {
          console.error('[WS] Error:', error);
          set({ connectionState: 'error' });
        };
        
        ws.onclose = () => {
          console.log('[WS] Disconnected');
          set({ connectionState: 'disconnected', socket: null });
          
          const { reconnectAttempts, maxReconnectAttempts } = get();
          if (reconnectAttempts < maxReconnectAttempts) {
            get().scheduleReconnect();
          }
        };
        
        set({ socket: ws });
      } catch (error) {
        console.error('[WS] Connection failed:', error);
        set({ connectionState: 'error' });
      }
    },
    
    disconnect: () => {
      const { socket } = get();
      if (socket) {
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
    
    // NEW: Enhanced subscribe with message type filtering
    subscribe: (
      id: string, 
      callback: (message: WebSocketMessage) => void,
      messageTypes?: string[]
    ) => {
      const { listeners } = get();
      listeners.set(id, { callback, messageTypes });
      
      // Debug log for subscriptions
      if (messageTypes) {
        console.log(`[WS] Subscribed: ${id} → [${messageTypes.join(', ')}]`);
      } else {
        console.log(`[WS] Subscribed: ${id} → [all messages]`);
      }
      
      return () => {
        const { listeners } = get();
        listeners.delete(id);
        console.log(`[WS] Unsubscribed: ${id}`);
      };
    },
    
    setConnectionState: (connectionState) => {
      set({ connectionState });
    },
    
    // PERFORMANCE FIX: Only notify listeners that care about this message type
    handleMessage: (message: WebSocketMessage) => {
      set({ lastMessage: message });
      
      // Smart logging
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
          // Don't log responses
        } else if (!KNOWN_MESSAGE_TYPES.has(message.type)) {
          console.warn(`[WS] Unknown message type: ${message.type}`);
        }
      }
      
      // NEW: Filtered notification - only call listeners that care
      const { listeners } = get();
      let notifiedCount = 0;
      
      listeners.forEach((subscriber, id) => {
        const { callback, messageTypes } = subscriber;
        
        // If no filter specified, or message type matches filter
        if (!messageTypes || messageTypes.includes(message.type)) {
          try {
            callback(message);
            notifiedCount++;
          } catch (error) {
            console.error(`[WS] Listener error (${id}):`, error);
          }
        }
      });
      
      // Debug: Log notification efficiency (only if interesting)
      if (shouldLog && listeners.size > 0) {
        console.log(`[WS] Notified ${notifiedCount}/${listeners.size} listeners for ${message.type}`);
      }
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
