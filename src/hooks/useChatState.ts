// src/hooks/useChatState.ts

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useWebSocket } from './useWebSocket';
import { getWebSocketUrl, getAPIUrl, debugConfig } from '../services/config';
import type { 
  Message, 
  ToolResult, 
  Citation
} from '../types/messages';
import type { 
  WsServerMessage, 
  WsClientMessage,
  WsStreamChunk,
  WsStreamEnd,
  WsComplete,
  WsStatus,
  WsError,
  WsData,
  createChatMessage
} from '../types/websocket';

export interface ChatState {
  messages: Message[];
  isThinking: boolean;
  isLoadingHistory: boolean;
  isLoadingMore: boolean;
  hasMoreHistory: boolean;
  historyOffset: number;
  statusMessage: string;
  connectionError: string;
  isConnected: boolean;
  sessionId: string;
}

export interface ChatActions {
  handleSendMessage: (content: string) => void;
  addUserMessage: (content: string) => void;
  loadChatHistory: (offset?: number) => Promise<void>;
  setStatusMessage: (message: string) => void;
  setConnectionError: (error: string) => void;
  clearMessages: () => void;
  send: (message: WsClientMessage) => void;
}

export function useChatState() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [connectionError, setConnectionError] = useState<string>('');

  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [historyOffset, setHistoryOffset] = useState(0);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);

  const currentStreamId = useRef<string>('');
  const pendingToolResults = useRef<ToolResult[]>([]);
  const pendingCitations = useRef<Citation[]>([]);
  const statusTimer = useRef<NodeJS.Timeout>();

  const sessionId = useMemo(() => {
    const stored = localStorage.getItem('mira_session_id');
    if (stored) return stored;
    
    const newId = `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    localStorage.setItem('mira_session_id', newId);
    return newId;
  }, []);

  const handleServerMessage = useCallback((msg: WsServerMessage) => {
    console.log('[useChatState] Received WS message:', msg.type);
    
    switch (msg.type) {
      case 'stream_chunk': {
        const chunk = msg as WsStreamChunk;
        if (chunk.text && chunk.text.trim()) {
          setIsThinking(false);
        }
        
        setMessages(prev => {
          const firstMsg = prev[0];
          
          if (firstMsg && firstMsg.id === currentStreamId.current && firstMsg.isStreaming) {
            const updated = { 
              ...firstMsg, 
              content: firstMsg.content + (chunk.text || '')
            };
            return [updated, ...prev.slice(1)];
          } else {
            const newMessage: Message = {
              id: Date.now().toString(),
              role: 'mira',
              content: chunk.text || '',
              timestamp: new Date(),
              isStreaming: true,
              session_id: sessionId
            };
            currentStreamId.current = newMessage.id;
            pendingToolResults.current = [];
            pendingCitations.current = [];
            return [newMessage, ...prev];
          }
        });
        break;
      }

      case 'stream_end': {
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
        break;
      }

      case 'complete': {
        const completeMsg = msg as WsComplete;
        
        setMessages(prev => {
          const updated = [...prev];
          if (updated.length > 0) {
            updated[0] = {
              ...updated[0],
              isStreaming: false,
              mood: completeMsg.mood,
              salience: completeMsg.salience,
              tags: completeMsg.tags,
              toolResults: pendingToolResults.current.length ? [...pendingToolResults.current] : undefined,
              citations: pendingCitations.current.length ? [...pendingCitations.current] : undefined,
            } as Message;
          }
          return updated;
        });
        
        pendingToolResults.current = [];
        pendingCitations.current = [];
        setIsThinking(false);
        break;
      }

      case 'status': {
        const statusMsg = msg as WsStatus;
        const statusText = statusMsg.message || '';
        setStatusMessage(statusText);
        
        if (statusTimer.current) clearTimeout(statusTimer.current);
        const timer = setTimeout(() => setStatusMessage(''), 5000);
        statusTimer.current = timer;
        break;
      }

      case 'error': {
        const errorMsg = msg as WsError;
        setIsThinking(false);
        
        const errorText = errorMsg.message || 'An error occurred';
        setConnectionError(errorText);
        setTimeout(() => setConnectionError(''), 5000);
        break;
      }

      case 'done': {
        setIsThinking(false);
        
        setMessages(prev => {
          const updated = [...prev];
          if (updated.length > 0 && updated[0].isStreaming) {
            updated[0] = {
              ...updated[0],
              isStreaming: false,
              toolResults: pendingToolResults.current.length ? [...pendingToolResults.current] : undefined,
              citations: pendingCitations.current.length ? [...pendingCitations.current] : undefined,
            } as Message;
          }
          return updated;
        });
        
        pendingToolResults.current = [];
        pendingCitations.current = [];
        break;
      }

      case 'data': {
        const dataMsg = msg as WsData;
        console.log('[useChatState] Received data:', dataMsg.data);
        // Handle data responses (projects, etc) if needed
        break;
      }
    }
  }, [sessionId]);

  const { isConnected, send } = useWebSocket({
    url: getWebSocketUrl('/ws'),  // Use /ws not /ws/chat
    onMessage: handleServerMessage,
    onConnect: () => {
      console.log('[useChatState] WebSocket connected successfully');
      setConnectionError('');
    },
    onDisconnect: () => {
      console.log('[useChatState] WebSocket disconnected');
      setConnectionError('Connection lost. Reconnecting...');
    },
    onError: (error) => {
      console.error('[useChatState] WebSocket error:', error);
      setConnectionError('Connection failed. Please check your internet connection.');
    },
  });

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

  const handleSendMessage = useCallback((content: string) => {
    if (!content.trim()) {
      console.warn('[useChatState] Cannot send empty message');
      return;
    }
    
    if (!isConnected) {
      setConnectionError('Not connected to server. Please wait for reconnection.');
      return;
    }

    addUserMessage(content);
    setIsThinking(true);
    setConnectionError('');

    // Use the Chat message type (capital C)
    const wsMessage: WsClientMessage = {
      type: 'Chat',
      content: content.trim(),
      project_id: null,  // Add project support later
      metadata: {}
    };

    console.log('[useChatState] Sending message:', { type: wsMessage.type, length: content.length });
    send(wsMessage);
  }, [isConnected, send, addUserMessage]);

  const loadChatHistory = useCallback(async (offset = 0) => {
    console.log(`[useChatState] Loading chat history, offset: ${offset}`);
    
    if (offset === 0) setIsLoadingHistory(true); 
    else setIsLoadingMore(true);

    try {
      const url = getAPIUrl(`chat/history?limit=30&offset=${offset}&session_id=${sessionId}`);
      console.log(`[useChatState] Fetching history from: ${url}`);
      
      if (offset === 0) {
        debugConfig();
      }
      
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000)
      });
      
      if (res.ok) {
        const data = await res.json();
        const rawMessages = data.messages || data.history || [];
        console.log(`[useChatState] Loaded ${rawMessages.length} messages`);
        
        const formatted: Message[] = rawMessages.map((msg: any) => {
          const role = msg.role === 'user' || msg.sender === 'User' ? 'user' : 'mira';
          const ts = typeof msg.timestamp === 'number' 
            ? new Date(msg.timestamp * 1000)
            : new Date(msg.timestamp);
          
          return {
            id: msg.id || msg.message_id || `hist_${Date.now()}_${Math.random()}`,
            role,
            content: msg.content || msg.message || '',
            timestamp: ts,
            isStreaming: false,
            session_id: msg.session_id || sessionId,
            mood: msg.mood,
            salience: msg.salience,
            tags: msg.tags,
            toolResults: msg.tool_results,
            citations: msg.citations
          } as Message;
        });
        
        if (offset === 0) {
          setMessages(formatted.reverse());
          setHistoryOffset(formatted.length);
        } else {
          setMessages(prev => [...formatted.reverse(), ...prev]);
          setHistoryOffset(prev => prev + formatted.length);
        }
        
        setHasMoreHistory(formatted.length === 30);
      } else {
        const errorText = await res.text();
        console.error(`[useChatState] Failed to load chat history: ${res.status} - ${errorText}`);
        setConnectionError(`Failed to load history: ${res.status}`);
      }
    } catch (error) {
      console.error('[useChatState] Error loading chat history:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        setConnectionError('Request timeout. Please try again.');
      } else {
        setConnectionError('Failed to load chat history. Please check your connection.');
      }
    } finally {
      setIsLoadingHistory(false);
      setIsLoadingMore(false);
    }
  }, [sessionId]);

  const clearMessages = useCallback(() => {
    console.log('[useChatState] Clearing all messages');
    setMessages([]);
    setHistoryOffset(0);
    setHasMoreHistory(true);
    pendingToolResults.current = [];
    pendingCitations.current = [];
    currentStreamId.current = '';
  }, []);

  useEffect(() => {
    return () => {
      if (statusTimer.current) {
        clearTimeout(statusTimer.current);
      }
    };
  }, []);

  const state: ChatState = {
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
  };

  const actions: ChatActions = {
    handleSendMessage,
    addUserMessage,
    loadChatHistory,
    setStatusMessage,
    setConnectionError,
    clearMessages,
    send,
  };

  return { ...state, ...actions };
}
