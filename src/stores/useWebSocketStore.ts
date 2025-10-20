// src/stores/useWebSocketStore.ts
// Updated to recognize operation events from backend

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

interface Subscriber {
  callback: (message: WebSocketMessage) => void;
  messageTypes?: string[];
}

interface WebSocketStore {
  socket: WebSocket | null;
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'error';
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  reconnectDelay: number;
  lastMessage: WebSocketMessage | null;
  messageQueue: WebSocketMessage[];
  listeners: Map<string, Subscriber>;
  
  connect: () => void;
  disconnect: () => void;
  send: (message: any) => Promise<void>;
  subscribe: (
    id: string, 
    callback: (message: WebSocketMessage) => void,
    messageTypes?: string[]
  ) => () => void;
  
  setConnectionState: (state: WebSocketStore['connectionState']) => void;
  handleMessage: (message: WebSocketMessage) => void;
  processMessageQueue: () => void;
  scheduleReconnect: () => void;
}

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001/ws';

// Message types we explicitly handle
const KNOWN_MESSAGE_TYPES = new Set([
  'status',
  'connection_ready',
  'heartbeat',
  'response',
  'data',
  'error',
  // Operation engine events
  'operation.started',
  'operation.streaming',
  'operation.delegated',
  'operation.artifact_preview',
  'operation.artifact_completed',
  'operation.completed',
  'operation.failed',
  'operation.status_changed',
]);

const KNOWN_DATA_TYPES = new Set([
  'project_list',
  'projects',
  'project_updated',
  'document_list',
  'document_deleted',
  'document_processing_started',
  'document_processing_progress',
  'document_processed',
  'document_content',
  'memory_data',
  'local_directory_attached',
  'git_status',
  'file_tree',
  'file_content',
  'stream_delta',
  'reasoning_delta',
  'stream_done',
  'artifact_created',
  'tool_result',
  // Operation engine events (sent as dataType in data envelope)
  'operation.started',
  'operation.streaming',
  'operation.delegated',
  'operation.artifact_preview',
  'operation.artifact_completed',
  'operation.completed',
  'operation.failed',
  'operation.status_changed',
]);

// Messages we don't need to log (too noisy)
const SILENT_TYPES = new Set([
  'heartbeat',
  'document_processing_progress',
  'stream_delta',
  'reasoning_delta',
  'operation.streaming', // Don't log every token
]);

export const useWebSocketStore = create<WebSocketStore>()(
  subscribeWithSelector((set, get) => ({
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
    
    subscribe: (
      id: string, 
      callback: (message: WebSocketMessage) => void,
      messageTypes?: string[]
    ) => {
      const { listeners } = get();
      listeners.set(id, { callback, messageTypes });
      
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
    
    handleMessage: (message: WebSocketMessage) => {
      set({ lastMessage: message });
      
      // Smart logging - don't log noisy messages
      const dataType = message.dataType || message.data?.type;
      const shouldLog = !SILENT_TYPES.has(message.type) && 
                        !SILENT_TYPES.has(dataType);
      
      if (shouldLog) {
        if (message.type === 'status') {
          console.log('[WS] Status:', message.message);
        } else if (message.type === 'data') {
          // Check if this is an operation event
          if (dataType?.startsWith('operation.')) {
            if (dataType === 'operation.started') {
              console.log('[WS] Operation started:', message.operation_id);
            } else if (dataType === 'operation.completed') {
              console.log('[WS] Operation completed:', message.operation_id);
            } else if (dataType === 'operation.failed') {
              console.error('[WS] Operation failed:', message.operation_id, message.error);
            } else if (dataType === 'operation.artifact_completed') {
              console.log('[WS] Artifact completed:', message.artifact?.path);
            } else if (dataType === 'operation.delegated') {
              console.log('[WS] Delegated to:', message.delegated_to);
            }
          } else if (dataType && KNOWN_DATA_TYPES.has(dataType)) {
            console.log(`[WS] Data: ${dataType}`);
          } else if (dataType) {
            console.warn(`[WS] Unknown data type: ${dataType}`);
          }
        } else if (message.type === 'error') {
          console.error('[WS] Error:', message.message);
        } else if (!KNOWN_MESSAGE_TYPES.has(message.type)) {
          console.warn(`[WS] Unknown message type: ${message.type}`);
        }
      }
      
      // Notify filtered listeners
      const { listeners } = get();
      
      listeners.forEach((subscriber, id) => {
        const { callback, messageTypes } = subscriber;
        
        // If no filter specified, or message type matches filter
        if (!messageTypes || messageTypes.includes(message.type)) {
          try {
            callback(message);
          } catch (error) {
            console.error(`[WS] Listener error (${id}):`, error);
          }
        }
      });
    },
    
    processMessageQueue: () => {
      const { messageQueue } = get();
      
      if (messageQueue.length > 0) {
        console.log(`[WS] Processing ${messageQueue.length} queued messages`);
        
        messageQueue.forEach(msg => {
          get().send(msg);
        });
        
        set({ messageQueue: [] });
      }
    },
    
    scheduleReconnect: () => {
      const { reconnectAttempts, reconnectDelay, maxReconnectAttempts } = get();
      
      if (reconnectAttempts >= maxReconnectAttempts) {
        console.error('[WS] Max reconnection attempts reached');
        return;
      }
      
      const delay = Math.min(reconnectDelay * Math.pow(2, reconnectAttempts), 30000);
      console.log(`[WS] Reconnecting in ${delay}ms (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`);
      
      set({ reconnectAttempts: reconnectAttempts + 1 });
      
      setTimeout(() => {
        const { connectionState } = get();
        if (connectionState === 'disconnected') {
          get().connect();
        }
      }, delay);
    },
  }))
);

// Auto-connect on store initialization
setTimeout(() => {
  useWebSocketStore.getState().connect();
}, 100);
