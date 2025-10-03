// src/hooks/useChatPersistence.ts
// Backend-driven chat persistence only - no localStorage bullshit

import { useEffect, useCallback, useRef } from 'react';
import { useWebSocketStore } from '../stores/useWebSocketStore';
import { useChatStore } from '../stores/useChatStore';
import type { ChatMessage } from '../stores/useChatStore';

const ETERNAL_SESSION_ID = 'peter-eternal'; // Backend's default eternal session

export const useChatPersistence = (connectionState: string) => {
  const send = useWebSocketStore(state => state.send);
  const subscribe = useWebSocketStore(state => state.subscribe);
  const setMessages = useChatStore(state => state.setMessages);
  const hasLoadedHistory = useRef(false);

  const getSessionId = useCallback(() => {
    return ETERNAL_SESSION_ID;
  }, []);

  // Convert backend memory entries to frontend messages
  const convertMemoryToMessages = useCallback((memories: any[]): ChatMessage[] => {
    if (!Array.isArray(memories)) {
      console.warn('Expected array of memories, got:', typeof memories, memories);
      return [];
    }

    const validMessages: ChatMessage[] = [];
    
    for (const [index, memory] of memories.entries()) {
      if (!memory || !memory.content) continue;
      
      try {
        // Handle timestamp - backend may send as string or number
        let timestamp = Date.now();
        if (memory.timestamp) {
          if (typeof memory.timestamp === 'string') {
            timestamp = new Date(memory.timestamp).getTime();
          } else if (typeof memory.timestamp === 'number') {
            // Handle both milliseconds and seconds
            timestamp = memory.timestamp > 1e12 ? memory.timestamp : memory.timestamp * 1000;
          }
        }

        const message: ChatMessage = {
          id: memory.id?.toString() || `loaded-${index}-${timestamp}`,
          role: (memory.role as 'user' | 'assistant' | 'system') || 'user',
          content: memory.content || '',
          timestamp,
          metadata: {
            session_id: memory.session_id,
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
    
    // Sort by timestamp (oldest first) and deduplicate
    const sortedMessages = validMessages
      .sort((a, b) => a.timestamp - b.timestamp)
      .filter((message, index, array) => {
        // Remove duplicates based on content and timestamp
        return index === array.findIndex(m => 
          m.content === message.content && 
          Math.abs(m.timestamp - message.timestamp) < 1000 // Within 1 second
        );
      });

    console.log(`Converted ${memories.length} memories to ${sortedMessages.length} messages`);
    return sortedMessages;
  }, []);

  // Handle incoming memory data from backend
  const handleMemoryData = useCallback((data: any) => {
    console.log('[ChatPersistence] Processing memory data:', data);
    
    if (!data) return;
    
    // Handle memory stats response
    if (data.stats) {
      console.log('[ChatPersistence] Memory stats:', data.stats);
      return;
    }
    
    // Handle recent memories response
    if (data.memories) {
      const loadedMessages = convertMemoryToMessages(data.memories);
      console.log('[ChatPersistence] Loaded', loadedMessages.length, 'messages from backend');
      
      // Only set messages if we haven't loaded history yet
      if (!hasLoadedHistory.current) {
        setMessages(loadedMessages);
        hasLoadedHistory.current = true;
      } else {
        // Merge intelligently if we already have messages
        const currentMessages = useChatStore.getState().messages;
        const existingIds = new Set(currentMessages.map(m => m.id));
        const newMessages = loadedMessages.filter(m => !existingIds.has(m.id));
        
        if (newMessages.length > 0) {
          console.log(`[ChatPersistence] Adding ${newMessages.length} new historical messages`);
          const merged = [...newMessages, ...currentMessages].sort((a, b) => a.timestamp - b.timestamp);
          setMessages(merged);
        }
      }
      return;
    }
    
    // Handle success/status
    if (data.status === 'success') {
      console.log('[ChatPersistence] Memory command completed successfully');
      return;
    }
    
    console.log('[ChatPersistence] Unhandled memory data:', data);
  }, [convertMemoryToMessages, setMessages]);

  // Load chat history from backend - only once per connection
  const loadChatHistory = useCallback(async () => {
    if (connectionState !== 'connected' || hasLoadedHistory.current) return;

    const sessionId = getSessionId();
    
    try {
      console.log('[ChatPersistence] Loading chat history for session:', sessionId);
      
      await send({
        type: 'memory_command',
        method: 'memory.get_recent',
        params: {
          session_id: sessionId,
          count: 100
        }
      });
      
      console.log('[ChatPersistence] History request sent');
    } catch (error) {
      console.error('[ChatPersistence] Failed to load chat history:', error);
      hasLoadedHistory.current = true; // Don't retry on error
    }
  }, [connectionState, getSessionId, send]);

  // Subscribe to memory data messages
  useEffect(() => {
    const unsubscribe = subscribe('chat-persistence', (message) => {
      if (message.type === 'data' && message.data) {
        handleMemoryData(message.data);
      }
    });
    
    return unsubscribe;
  }, [subscribe, handleMemoryData]);

  // Subscribe to memory data messages
  useEffect(() => {
    const unsubscribe = subscribe('chat-persistence', (message) => {
      if (message.type === 'data' && message.data) {
        handleMemoryData(message.data);
      }
    });
    
    return unsubscribe;
  }, [subscribe, handleMemoryData]);

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
