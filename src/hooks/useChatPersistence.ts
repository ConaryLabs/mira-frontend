// src/hooks/useChatPersistence.ts
import { useEffect, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';
import type { Message } from '../types';

const SESSION_STORAGE_KEY = 'mira_session_id';
const ETERNAL_SESSION_ID = 'peter-eternal'; // The backend's default eternal session

export const useChatPersistence = (
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  connectionState: string
) => {
  const { send } = useWebSocket();

  // Use the eternal session ID that matches backend
  const getSessionId = useCallback(() => {
    // Always use the eternal session for now
    // Later you could implement multiple conversations by checking localStorage
    return ETERNAL_SESSION_ID;
  }, []);

  // Load chat history from backend
  const loadChatHistory = useCallback(async () => {
    if (connectionState !== 'connected') return;

    const sessionId = getSessionId();
    
    try {
      console.log('Loading chat history for session:', sessionId);
      
      // First try to get memory stats to see if there's any data
      const statsMessage = {
        type: 'memory_command',
        method: 'memory.get_stats',
        params: {
          session_id: sessionId
        }
      };
      
      console.log('Sending memory stats command:', statsMessage);
      await send(statsMessage);
      
      // Then request recent messages from backend
      const recentMessage = {
        type: 'memory_command',
        method: 'memory.get_recent',
        params: {
          session_id: sessionId,
          count: 50 // Load last 50 messages
        }
      };
      
      console.log('Sending memory recent command:', recentMessage);
      await send(recentMessage);
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  }, [connectionState, getSessionId, send]);

  // Convert backend memory entries to frontend messages
  const convertMemoryToMessages = useCallback((memories: any[]): Message[] => {
    if (!Array.isArray(memories)) {
      console.warn('Expected array of memories, got:', typeof memories, memories);
      return [];
    }

    const validMessages: Message[] = [];
    
    for (const [index, memory] of memories.entries()) {
      if (!memory || !memory.content) continue;
      
      try {
        const message: Message = {
          id: memory.id?.toString() || `loaded-${index}`,
          role: (memory.role as 'user' | 'assistant' | 'system') || 'user',
          content: memory.content || '',
          timestamp: new Date(memory.timestamp || Date.now()).getTime(),
          metadata: {
            salience: memory.salience,
            mood: memory.mood,
            intent: memory.intent,
            topics: memory.topics ? (typeof memory.topics === 'string' ? JSON.parse(memory.topics) : memory.topics) : undefined,
            programming_lang: memory.programming_lang,
            contains_code: memory.contains_code,
          }
        };
        
        validMessages.push(message);
      } catch (error) {
        console.error('Error converting memory to message:', error, memory);
      }
    }
    
    // Backend returns newest first, we want oldest first
    return validMessages.reverse();
  }, []);

  // Handle incoming memory data
  const handleMemoryData = useCallback((data: any) => {
    console.log('Processing memory data:', data);
    
    if (!data) return;
    
    // Handle memory stats response
    if (data.stats) {
      console.log('Memory stats for session:', data.session_id, data.stats);
      return;
    }
    
    // Check for recent memories response
    if (data.memories) {
      const loadedMessages = convertMemoryToMessages(data.memories);
      console.log('Loaded', loadedMessages.length, 'previous messages');
      setMessages(loadedMessages);
      return;
    }
    
    // Handle other memory responses
    if (data.status === 'success') {
      console.log('Memory command completed successfully');
      return;
    }
    
    console.log('Unhandled memory data:', data);
  }, [convertMemoryToMessages, setMessages]);

  // Load history when connected
  useEffect(() => {
    if (connectionState === 'connected') {
      loadChatHistory();
    }
  }, [connectionState, loadChatHistory]);

  return {
    getSessionId,
    loadChatHistory,
    handleMemoryData,
  };
};
