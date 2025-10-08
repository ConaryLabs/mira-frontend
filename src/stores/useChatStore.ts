// src/stores/useChatStore.ts
// SCORCHED EARTH: Minimal, clean Artifact type - no backward compatibility bullshit

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
  
  // Actions
  addMessage: (message: ChatMessage) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  setMessages: (messages: ChatMessage[]) => void;
  clearMessages: () => void;
  setSessionId: (id: string) => void;
  setWaitingForResponse: (waiting: boolean) => void;
  startStreaming: () => void;
  appendStreamContent: (content: string) => void;
  endStreaming: () => void;
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
      
      // Message management
      addMessage: (message) => {
        set(state => ({
          messages: [...state.messages, message],
          isWaitingForResponse: message.role === 'assistant' ? false : state.isWaitingForResponse
        }));
      },
      
      updateMessage: (id, updates) => {
        set(state => ({
          messages: state.messages.map(msg => 
            msg.id === id ? { ...msg, ...updates } : msg
          )
        }));
      },
      
      setMessages: (messages) => set({ messages }),
      clearMessages: () => set({ messages: [] }),
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
    }),
    {
      name: 'mira-chat-storage',
      partialize: (state) => ({
        messages: state.messages,
        currentSessionId: state.currentSessionId,
      }),
    }
  )
);

export function useCurrentSession() {
  const messages = useChatStore(state => state.messages);
  const sessionId = useChatStore(state => state.currentSessionId);
  return { messages, sessionId };
}
