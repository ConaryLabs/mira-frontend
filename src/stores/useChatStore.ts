// src/stores/useChatStore.ts
// Chat store with localStorage persistence + backend sync

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Artifact type for error fixes
export interface Artifact {
  id: string;
  path: string;
  content: string;
  language?: string;
  changeType?: 'primary' | 'import' | 'type' | 'cascade';
  originalContent?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  artifacts?: Artifact[];
  timestamp: number;
  metadata?: {
    session_id?: string;
    project_id?: string;
    file_path?: string;
    [key: string]: any;
  };
}

interface ChatStore {
  // Messages
  messages: ChatMessage[];
  currentSessionId: string;
  
  // Response waiting state (for non-streaming batch responses)
  isWaitingForResponse: boolean;
  
  // Streaming state (for progressive streaming - currently unused)
  isStreaming: boolean;
  streamingContent: string;
  streamingMessageId: string | null;
  
  // Actions
  addMessage: (message: ChatMessage) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  setMessages: (messages: ChatMessage[]) => void;
  clearMessages: () => void;
  setSessionId: (id: string) => void;
  
  // Waiting state actions
  setWaitingForResponse: (waiting: boolean) => void;
  
  // Streaming actions (for future use)
  startStreaming: () => void;
  appendStreamContent: (content: string) => void;
  endStreaming: () => void;
  
  // Artifact actions
  markArtifactApplied: (messageId: string, artifactId: string) => void;
  getArtifact: (messageId: string, artifactId: string) => Artifact | undefined;
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
          // Clear waiting state when assistant responds
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
      
      setMessages: (messages) => {
        set({ messages });
      },
      
      clearMessages: () => {
        set({ messages: [], isWaitingForResponse: false });
      },
      
      setSessionId: (id) => {
        set({ currentSessionId: id });
      },
      
      // Waiting state
      setWaitingForResponse: (waiting) => {
        set({ isWaitingForResponse: waiting });
      },
      
      // Streaming (for future progressive streaming)
      startStreaming: () => {
        const messageId = `streaming-${Date.now()}`;
        set({
          isStreaming: true,
          streamingContent: '',
          streamingMessageId: messageId,
          isWaitingForResponse: false, // Streaming replaces waiting
        });
        
        // Add placeholder message
        get().addMessage({
          id: messageId,
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
        });
      },
      
      appendStreamContent: (content) => {
        set(state => ({
          streamingContent: state.streamingContent + content,
        }));
        
        const { streamingMessageId, streamingContent } = get();
        if (streamingMessageId) {
          get().updateMessage(streamingMessageId, {
            content: streamingContent + content,
          });
        }
      },
      
      endStreaming: () => {
        set({
          isStreaming: false,
          streamingContent: '',
          streamingMessageId: null,
        });
      },
      
      // Artifact operations
      markArtifactApplied: (messageId, artifactId) => {
        set(state => ({
          messages: state.messages.map(msg => {
            if (msg.id === messageId && msg.artifacts) {
              return {
                ...msg,
                artifacts: msg.artifacts.map(artifact =>
                  artifact.id === artifactId
                    ? { ...artifact, applied: true } as any
                    : artifact
                )
              };
            }
            return msg;
          })
        }));
      },
      
      getArtifact: (messageId, artifactId) => {
        const message = get().messages.find(m => m.id === messageId);
        return message?.artifacts?.find(a => a.id === artifactId);
      },
    }),
    {
      name: 'mira-chat-storage', // localStorage key
      partialize: (state) => ({
        messages: state.messages,
        currentSessionId: state.currentSessionId,
        // Don't persist streaming or waiting state
      }),
    }
  )
);

// Helper hook for current session messages
export function useCurrentSession() {
  const messages = useChatStore(state => state.messages);
  const sessionId = useChatStore(state => state.currentSessionId);
  
  return {
    messages,
    sessionId,
  };
}
