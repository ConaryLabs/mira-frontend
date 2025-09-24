// src/stores/useChatStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Artifact type for error fixes
export interface Artifact {
  id: string;
  path: string;
  content: string;
  language?: string;
  changeType?: 'primary' | 'import' | 'type' | 'cascade';
  originalContent?: string; // For undo functionality
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  artifacts?: Artifact[]; // For error fixes
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
  
  // Streaming state
  isStreaming: boolean;
  streamingContent: string;
  streamingMessageId: string | null;
  
  // Actions
  addMessage: (message: ChatMessage) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  clearMessages: () => void;
  setSessionId: (id: string) => void;
  
  // Streaming actions
  startStreaming: () => void;
  appendStreamContent: (content: string) => void;
  endStreaming: () => void;
  
  // Artifact actions
  markArtifactApplied: (messageId: string, artifactId: string) => void;
  getArtifact: (messageId: string, artifactId: string) => Artifact | undefined;
  
  // Session management
  loadSession: (sessionId: string) => void;
  saveCurrentSession: () => void;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      // Initial state
      messages: [],
      currentSessionId: 'peter-eternal',
      isStreaming: false,
      streamingContent: '',
      streamingMessageId: null,
      
      // Message management
      addMessage: (message) => {
        set(state => ({
          messages: [...state.messages, message]
        }));
        get().saveCurrentSession();
      },
      
      updateMessage: (id, updates) => {
        set(state => ({
          messages: state.messages.map(msg => 
            msg.id === id ? { ...msg, ...updates } : msg
          )
        }));
        get().saveCurrentSession();
      },
      
      clearMessages: () => {
        set({ messages: [] });
        get().saveCurrentSession();
      },
      
      setSessionId: (id) => {
        set({ currentSessionId: id });
      },
      
      // Streaming management
      startStreaming: () => {
        const streamingMessageId = `assistant_${Date.now()}`;
        set({ 
          isStreaming: true, 
          streamingContent: '',
          streamingMessageId 
        });
      },
      
      appendStreamContent: (content) => {
        set(state => ({
          streamingContent: state.streamingContent + content
        }));
      },
      
      endStreaming: () => {
        const { streamingContent, streamingMessageId } = get();
        
        if (streamingContent && streamingMessageId) {
          get().addMessage({
            id: streamingMessageId,
            role: 'assistant',
            content: streamingContent,
            timestamp: Date.now()
          });
        }
        
        set({ 
          isStreaming: false, 
          streamingContent: '',
          streamingMessageId: null 
        });
      },
      
      // Artifact management
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
      
      // Session persistence
      loadSession: (sessionId) => {
        const stored = localStorage.getItem(`chat_session_${sessionId}`);
        if (stored) {
          try {
            const data = JSON.parse(stored);
            set({ 
              messages: data.messages || [],
              currentSessionId: sessionId 
            });
          } catch (error) {
            console.error('[Chat] Failed to load session:', error);
          }
        } else {
          set({ messages: [], currentSessionId: sessionId });
        }
      },
      
      saveCurrentSession: () => {
        const { currentSessionId, messages } = get();
        try {
          localStorage.setItem(
            `chat_session_${currentSessionId}`,
            JSON.stringify({ messages, timestamp: Date.now() })
          );
        } catch (error) {
          console.error('[Chat] Failed to save session:', error);
        }
      },
    }),
    {
      name: 'mira-chat-store',
      partialize: (state) => ({
        messages: state.messages.slice(-100), // Keep last 100 messages
        currentSessionId: state.currentSessionId,
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
