// src/hooks/useChatPersistence.ts
// Backend-driven chat persistence only - no localStorage bullshit

import { useEffect, useCallback, useRef } from 'react';
import { useWebSocketStore } from '../stores/useWebSocketStore';
import { useChatStore } from '../stores/useChatStore';
import { useArtifactStore } from '../stores/useArtifactStore';
import type { ChatMessage, Artifact } from '../stores/useChatStore';

const ETERNAL_SESSION_ID = 'peter-eternal'; // Backend's default eternal session

export const useChatPersistence = (connectionState: string) => {
  const send = useWebSocketStore(state => state.send);
  const subscribe = useWebSocketStore(state => state.subscribe);
  const setMessages = useChatStore(state => state.setMessages);
  const addArtifact = useArtifactStore(state => state.addArtifact);
  const openPanel = useArtifactStore(state => state.openPanel);
  const hasLoadedHistory = useRef(false);

  const getSessionId = useCallback(() => {
    return ETERNAL_SESSION_ID;
  }, []);

  // Convert backend memory entries to frontend messages
  const convertMemoryToMessages = useCallback((memories: any[]): ChatMessage[] => {
    // DEBUG: Check what roles we're getting from backend
    const roleCounts = memories.reduce((acc, m) => {
      acc[m.role] = (acc[m.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.log('[ChatPersistence] Role breakdown from backend:', roleCounts);
    console.log('[ChatPersistence] First 3 memories:', memories.slice(0, 3));
    
    if (!Array.isArray(memories)) {
      console.warn('Expected array of memories, got:', typeof memories, memories);
      return [];
    }

    const validMessages: ChatMessage[] = [];
    let artifactCount = 0;
    
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

        // Extract artifacts if present
        let artifacts: Artifact[] | undefined;
        
        // Check analysis.artifacts first (from backend structure)
        if (memory.analysis?.artifacts && Array.isArray(memory.analysis.artifacts)) {
          artifacts = memory.analysis.artifacts.map((art: any) => ({
            id: art.id || `artifact-${Date.now()}-${Math.random()}`,
            title: art.title || 'Untitled',
            content: art.content || '',
            language: art.language || 'text',
            path: art.path
          }));
          artifactCount += artifacts.length;
          
          // Add to artifact store
          artifacts.forEach(artifact => {
            addArtifact(artifact);
          });
        }
        // Fallback to direct artifacts field
        else if (memory.artifacts && Array.isArray(memory.artifacts)) {
          artifacts = memory.artifacts.map((art: any) => ({
            id: art.id || `artifact-${Date.now()}-${Math.random()}`,
            title: art.title || 'Untitled',
            content: art.content || '',
            language: art.language || 'text',
            path: art.path
          }));
          artifactCount += artifacts.length;
          
          // Add to artifact store
          artifacts.forEach(artifact => {
            addArtifact(artifact);
          });
        }

        const message: ChatMessage = {
          id: memory.id?.toString() || `loaded-${index}-${timestamp}`,
          role: (memory.role as 'user' | 'assistant' | 'system') || 'user',
          content: memory.content || '',
          timestamp,
          artifacts,
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
    
    if (artifactCount > 0) {
      console.log(`[ChatPersistence] Restored ${artifactCount} artifacts from chat history`);
      // Auto-open artifact panel if we restored artifacts
      openPanel();
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

    console.log(`[ChatPersistence] Converted ${memories.length} memories to ${sortedMessages.length} messages`);
    return sortedMessages;
  }, [addArtifact, openPanel]);

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
    
    // FIXED: Ignore document-related messages (handled by document components)
    const documentTypes = ['document_list', 'document_search_results', 'document_content'];
    if (data.type && documentTypes.includes(data.type)) {
      console.log(`[ChatPersistence] Ignoring document message: ${data.type}`);
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

  // Subscribe to memory data messages (FIXED: removed duplicate)
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
