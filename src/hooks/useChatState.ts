// src/hooks/useChatState.ts

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useWebSocket } from './useWebSocket';
import { getWebSocketUrl } from '../services/config';
import type { Message } from '../types/messages';
import type { WsServerMessage, WsClientMessage, WsChatMessage } from '../types/websocket';

export function useChatState() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [connectionError, setConnectionError] = useState<string>('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [historyOffset, setHistoryOffset] = useState(0);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);

  // Track current streaming message
  const currentStreamId = useRef<string>('');
  const statusTimer = useRef<NodeJS.Timeout>();

  // Session ID management - memoized to prevent recreation
  const sessionId = useMemo(() => {
    const stored = localStorage.getItem('mira_session_id');
    if (stored) return stored;
    
    const newId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('mira_session_id', newId);
    return newId;
  }, []);

  // Handle incoming WebSocket messages
  const handleServerMessage = useCallback((msg: WsServerMessage) => {
    console.log('[useChatState] Received message:', msg.type);
    
    switch (msg.type) {
      case 'stream_chunk': {
        const chunk = msg as any;
        if (chunk.text && chunk.text.trim()) {
          setIsThinking(false); // Stop thinking animation once text starts
          
          setMessages(prev => {
            // Check if we're already streaming
            const firstMsg = prev[0];
            
            if (firstMsg && firstMsg.id === currentStreamId.current && firstMsg.isStreaming) {
              // Append to existing streaming message
              const updated = { 
                ...firstMsg, 
                content: firstMsg.content + (chunk.text || '')
              };
              return [updated, ...prev.slice(1)];
            } else {
              // Start new streaming message
              const newMessage: Message = {
                id: Date.now().toString(),
                role: 'mira',
                content: chunk.text || '',
                timestamp: new Date(),
                isStreaming: true,
                session_id: sessionId
              };
              currentStreamId.current = newMessage.id;
              return [newMessage, ...prev];
            }
          });
        }
        break;
      }

      case 'stream_end': {
        console.log('[useChatState] Stream ended');
        setMessages(prev => {
          const updated = [...prev];
          if (updated.length > 0 && updated[0].isStreaming) {
            updated[0] = {
              ...updated[0],
              isStreaming: false
            } as Message;
          }
          return updated;
        });
        currentStreamId.current = '';
        break;
      }

      case 'complete': {
        const completeMsg = msg as any;
        console.log('[useChatState] Complete with metadata:', {
          mood: completeMsg.mood,
          salience: completeMsg.salience,
          tags: completeMsg.tags
        });
        
        setMessages(prev => {
          const updated = [...prev];
          if (updated.length > 0) {
            updated[0] = {
              ...updated[0],
              isStreaming: false,
              mood: completeMsg.mood,
              salience: completeMsg.salience,
              tags: completeMsg.tags,
            } as Message;
          }
          return updated;
        });
        
        setIsThinking(false);
        currentStreamId.current = '';
        break;
      }

      case 'done': {
        console.log('[useChatState] Done (tool path)');
        setIsThinking(false);
        setMessages(prev => {
          const updated = [...prev];
          if (updated.length > 0 && updated[0].isStreaming) {
            updated[0] = {
              ...updated[0],
              isStreaming: false,
            } as Message;
          }
          return updated;
        });
        currentStreamId.current = '';
        break;
      }

      case 'status': {
        const statusMsg = msg as any;
        const statusText = statusMsg.message || '';
        if (statusText && statusText !== 'ping' && statusText !== 'pong') {
          setStatusMessage(statusText);
          
          // Clear status after 5 seconds
          if (statusTimer.current) clearTimeout(statusTimer.current);
          statusTimer.current = setTimeout(() => setStatusMessage(''), 5000);
        }
        break;
      }

      case 'error': {
        const errorMsg = msg as any;
        setIsThinking(false);
        
        const errorText = errorMsg.message || 'An error occurred';
        console.error('[useChatState] Error:', errorText);
        setConnectionError(errorText);
        
        // Clear error after 5 seconds
        setTimeout(() => setConnectionError(''), 5000);
        break;
      }

      case 'connection_ready': {
        console.log('[useChatState] Connection ready');
        setConnectionError('');
        break;
      }

      case 'data': {
        const dataMsg = msg as any;
        console.log('[useChatState] Received data:', dataMsg.data);
        // Handle data responses if needed (projects, etc)
        break;
      }

      default:
        console.log('[useChatState] Unknown message type:', msg.type);
    }
  }, [sessionId]);

  // Create WebSocket connection with memoized URL
  const wsUrl = useMemo(() => getWebSocketUrl('/ws'), []);
  
  const { isConnected, send } = useWebSocket({
    url: wsUrl,
    onMessage: handleServerMessage,
    onConnect: () => {
      console.log('[useChatState] WebSocket connected');
      setConnectionError('');
    },
    onDisconnect: () => {
      console.log('[useChatState] WebSocket disconnected');
      setConnectionError('Connection lost. Reconnecting...');
    },
    onError: (error) => {
      console.error('[useChatState] WebSocket error:', error);
      setConnectionError('Connection failed.');
    },
  });

  // Add user message to chat
  const addUserMessage = useCallback((content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
      session_id: sessionId,
    };
    setMessages(prev => [userMessage, ...prev]);
  }, [sessionId]);

  // Send message through WebSocket
  const handleSendMessage = useCallback((content: string) => {
    if (!content.trim()) {
      console.warn('[useChatState] Cannot send empty message');
      return;
    }
    
    if (!isConnected) {
      setConnectionError('Not connected. Please wait...');
      return;
    }

    // Add user message to UI
    addUserMessage(content);
    setIsThinking(true);
    setConnectionError('');
    currentStreamId.current = ''; // Reset stream ID

    // Create WebSocket message with lowercase type and correct fields
    const wsMessage: WsChatMessage = {
      type: 'chat',  // lowercase 'chat' as backend expects
      content: content.trim(),
      project_id: null,  // correct field name
      metadata: {}  // optional metadata
    };
    
    console.log('[useChatState] Sending message:', wsMessage);
    send(wsMessage as WsClientMessage);
  }, [isConnected, send, addUserMessage]);

  // Load chat history (disabled for now)
  const loadChatHistory = useCallback(async (offset = 0) => {
    console.log('Loading chat history disabled for now');
    // Add back later when stable
  }, []);

  // Clear all messages
  const clearMessages = useCallback(() => {
    setMessages([]);
    setHistoryOffset(0);
    setHasMoreHistory(true);
    currentStreamId.current = '';
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (statusTimer.current) {
        clearTimeout(statusTimer.current);
      }
    };
  }, []);

  return {
    // State
    messages,
    isThinking,
    isLoadingHistory,
    isLoadingMore,
    hasMoreHistory,
    historyOffset,
    statusMessage,
    connectionError,
    isConnected,
    sessionId,
    // Actions
    handleSendMessage,
    addUserMessage,
    loadChatHistory,
    setStatusMessage,
    setConnectionError,
    clearMessages,
    send,
  };
}
