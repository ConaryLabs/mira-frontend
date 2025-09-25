// src/hooks/useChatPersistence.ts
import { useEffect, useCallback, useRef } from 'react';
import { useWebSocketStore } from '../stores/useWebSocketStore';
import type { Message } from '../types';

const ETERNAL_SESSION_ID = 'peter-eternal'; // The backend's default eternal session

export const useChatPersistence = (
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  connectionState: string
) => {
  const { send } = useWebSocket();
  const hasLoadedHistory = useRef(false); // 🚀 Prevent multiple history loads

  // Use the eternal session ID that matches backend
  const getSessionId = useCallback(() => {
    return ETERNAL_SESSION_ID;
  }, []);

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
        // 🚀 Better timestamp handling
        let timestamp = Date.now();
        if (memory.timestamp) {
          if (typeof memory.timestamp === 'string') {
            timestamp = new Date(memory.timestamp).getTime();
          } else if (typeof memory.timestamp === 'number') {
            // Handle both milliseconds and seconds
            timestamp = memory.timestamp > 1e12 ? memory.timestamp : memory.timestamp * 1000;
          }
        }

        const message: Message = {
          id: memory.id?.toString() || `loaded-${index}-${timestamp}`,
          role: (memory.role as 'user' | 'assistant' | 'system') || 'user',
          content: memory.content || '',
          timestamp,
          metadata: {
            salience: memory.salience,
            mood: memory.mood,
            intent: memory.intent,
            topics: memory.topics ? (typeof memory.topics === 'string' ? 
              JSON.parse(memory.topics) : memory.topics) : undefined,
            programming_lang: memory.programming_lang,
            contains_code: memory.contains_code,
          }
        };
        
        validMessages.push(message);
      } catch (error) {
        console.error('Error converting memory to message:', error, memory);
      }
    }
    
    // 🚀 Sort by timestamp (oldest first) and remove duplicates
    const sortedMessages = validMessages
      .sort((a, b) => a.timestamp - b.timestamp)
      .filter((message, index, array) => {
        // Remove duplicates based on content and timestamp
        return index === array.findIndex(m => 
          m.content === message.content && 
          Math.abs(m.timestamp - message.timestamp) < 1000 // Within 1 second
        );
      });

    console.log(`📚 Converted ${memories.length} memories to ${sortedMessages.length} messages`);
    return sortedMessages;
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
      
      // 🚀 CRITICAL FIX: Only set messages if we haven't loaded history yet
      if (!hasLoadedHistory.current) {
        setMessages(loadedMessages);
        hasLoadedHistory.current = true;
      } else {
        // If we already have messages, merge intelligently
        setMessages(currentMessages => {
          // Find messages that aren't already in current messages
          const existingIds = new Set(currentMessages.map(m => m.id));
          const newMessages = loadedMessages.filter(m => !existingIds.has(m.id));
          
          if (newMessages.length > 0) {
            console.log(`🔄 Adding ${newMessages.length} new historical messages`);
            return [...newMessages, ...currentMessages].sort((a, b) => a.timestamp - b.timestamp);
          }
          
          return currentMessages;
        });
      }
      return;
    }
    
    // Handle other memory responses
    if (data.status === 'success') {
      console.log('Memory command completed successfully');
      return;
    }
    
    console.log('Unhandled memory data:', data);
  }, [convertMemoryToMessages, setMessages]);

  // Load chat history from backend - only once per connection
  const loadChatHistory = useCallback(async () => {
    if (connectionState !== 'connected' || hasLoadedHistory.current) return;

    const sessionId = getSessionId();
    
    try {
      console.log('🔄 Loading chat history for session:', sessionId);
      
      // Load recent messages from backend
      const recentMessage = {
        type: 'memory_command',
        method: 'memory.get_recent',
        params: {
          session_id: sessionId,
          count: 100 // 🚀 Load more messages to avoid gaps
        }
      };
      
      console.log('Sending memory recent command:', recentMessage);
      await send(recentMessage);
    } catch (error) {
      console.error('Failed to load chat history:', error);
      hasLoadedHistory.current = true; // Don't retry
    }
  }, [connectionState, getSessionId, send]);

  // Load history when connected - but only once
  useEffect(() => {
    if (connectionState === 'connected' && !hasLoadedHistory.current) {
      // Small delay to let connection settle
      const timer = setTimeout(() => {
        loadChatHistory();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [connectionState, loadChatHistory]);

  // Reset history flag when disconnected
  useEffect(() => {
    if (connectionState === 'disconnected') {
      hasLoadedHistory.current = false;
    }
  }, [connectionState]);

  return {
    getSessionId,
    loadChatHistory,
    handleMemoryData,
  };
};
