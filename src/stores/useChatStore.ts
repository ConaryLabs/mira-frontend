// src/stores/useChatStore.ts
// HARDENED: Message deduplication for reconnect safety

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ===== MINIMAL UNIFIED ARTIFACT =====
export interface Artifact {
  id: string;
  title?: string;      // Display name (optional, path is fallback)
  path: string;        // File path - primary identifier
  content: string;     // File content
  language?: string;   // Syntax highlighting (inferred from path)
  changeType?: 'primary' | 'import' | 'type' | 'cascade';  // For error-to-fix workflow
  timestamp?: number;  // When artifact was created
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  artifacts?: Artifact[];  // Direct artifact array
  timestamp: number;
  metadata?: {
    session_id?: string;
    project_id?: string;
    file_path?: string;
    [key: string]: any;
  };
}

interface ChatStore {
  messages: ChatMessage[];
  currentSessionId: string;
  isWaitingForResponse: boolean;
  isStreaming: boolean;
  streamingContent: string;
  streamingMessageId: string | null;
  processedMessageIds: Set<string>; // NEW: Track processed messages for deduplication
  
  // Actions
  addMessage: (message: ChatMessage) => void;
  addMessageWithDedup: (message: ChatMessage, messageId?: string) => void; // NEW
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  setMessages: (messages: ChatMessage[]) => void;
  clearMessages: () => void;
  setSessionId: (id: string) => void;
  setWaitingForResponse: (waiting: boolean) => void;
  startStreaming: () => void;
  appendStreamContent: (content: string) => void;
  endStreaming: () => void;
  clearProcessedMessageIds: () => void; // NEW: For session resets
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      // Initial state
      messages: [],
      currentSessionId: 'peter-eternal',
      isWaitingForResponse: false,
      isStreaming: false,
      streamingContent: '',
      streamingMessageId: null,
      processedMessageIds: new Set<string>(),
      
      // Message management
      addMessage: (message) => {
        set(state => ({
          messages: [...state.messages, message],
          isWaitingForResponse: message.role === 'assistant' ? false : state.isWaitingForResponse
        }));
      },
      
      // NEW: Add message with deduplication
      addMessageWithDedup: (message, messageId) => {
        const effectiveId = messageId || message.id || `${message.role}-${message.timestamp}`;
        
        if (get().processedMessageIds.has(effectiveId)) {
          console.warn('[Chat] Duplicate message ignored:', effectiveId);
          return;
        }
        
        set(state => ({
          messages: [...state.messages, message],
          processedMessageIds: new Set(state.processedMessageIds).add(effectiveId),
          isWaitingForResponse: false,
        }));
        
        console.log('[Chat] Message added with dedup:', effectiveId);
      },
      
      updateMessage: (id, updates) => {
        set(state => ({
          messages: state.messages.map(msg => 
            msg.id === id ? { ...msg, ...updates } : msg
          )
        }));
      },
      
      setMessages: (messages) => set({ messages }),
      
      clearMessages: () => set({ 
        messages: [],
        processedMessageIds: new Set() // Clear dedup set too
      }),
      
      setSessionId: (id) => set({ currentSessionId: id }),
      
      setWaitingForResponse: (waiting) => set({ isWaitingForResponse: waiting }),
      
      // Streaming
      startStreaming: () => set({ 
        isStreaming: true, 
        streamingContent: '', 
        streamingMessageId: `stream-${Date.now()}` 
      }),
      
      appendStreamContent: (content) => set(state => ({ 
        streamingContent: state.streamingContent + content 
      })),
      
      endStreaming: () => {
        const { streamingContent, streamingMessageId } = get();
        if (streamingContent && streamingMessageId) {
          set(state => ({
            messages: [...state.messages, {
              id: streamingMessageId,
              role: 'assistant',
              content: streamingContent,
              timestamp: Date.now(),
            }],
            isStreaming: false,
            streamingContent: '',
            streamingMessageId: null,
            isWaitingForResponse: false,
          }));
        } else {
          set({ isStreaming: false, isWaitingForResponse: false });
        }
      },
      
      // NEW: Clear processed message IDs (for session resets)
      clearProcessedMessageIds: () => set({ processedMessageIds: new Set() }),
    }),
    {
      name: 'mira-chat-storage',
      partialize: (state) => ({
        messages: state.messages,
        currentSessionId: state.currentSessionId,
        // Don't persist processedMessageIds - it's per-session runtime state
      }),
    }
  )
);

export function useCurrentSession() {
  const messages = useChatStore(state => state.messages);
  const sessionId = useChatStore(state => state.currentSessionId);
  return { messages, sessionId };
}
