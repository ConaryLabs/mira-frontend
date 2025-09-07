// src/hooks/useChatState.ts
// PHASE 2: Extracted chat state management (~200 lines)
// Responsibilities: Messages, WebSocket handling, history loading

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useWebSocket } from './useWebSocket';
import { getWebSocketUrl, getAPIUrl, debugConfig } from '../services/config';
import { normalizeToolType } from '../types/websocket';
import type { 
  Message, 
  ToolResult, 
  Citation
} from '../types/messages';
import type { 
  WsServerMessage, 
  WsToolResult, 
  WsCitation, 
  WsComplete,
  WsStatus,
  WsClientMessage,
  MessageMetadata
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
  // Core message state
  const [messages, setMessages] = useState<Message[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [connectionError, setConnectionError] = useState<string>('');

  // History loading state
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [historyOffset, setHistoryOffset] = useState(0);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);

  // Refs for streaming management
  const currentStreamId = useRef<string>('');
  const pendingToolResults = useRef<ToolResult[]>([]);
  const pendingCitations = useRef<Citation[]>([]);
  const statusTimer = useRef<NodeJS.Timeout>();

  // Session management
  const sessionId = useMemo(() => {
    const stored = localStorage.getItem('mira_session_id');
    if (stored) return stored;
    
    const newId = `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    localStorage.setItem('mira_session_id', newId);
    return newId;
  }, []);

  // WebSocket message handler
  const handleServerMessage = useCallback((msg: WsServerMessage) => {
    console.log('[useChatState] Received WS message:', msg.type);
    
    switch (msg.type) {
      case 'chunk': {
        if ((msg as any).content && (msg as any).content.trim()) {
          setIsThinking(false);
        }
        
        setMessages(prev => {
          const firstMsg = prev[0];
          
          if (firstMsg && firstMsg.id === currentStreamId.current && firstMsg.isStreaming) {
            // Append to existing streaming message
            const updated = { 
              ...firstMsg, 
              content: firstMsg.content + ((msg as any).content || ''),
              mood: firstMsg.mood || (msg as any).mood
            };
            return [updated, ...prev.slice(1)];
          } else {
            // Start new streaming message
            const newMessage: Message = {
              id: Date.now().toString(),
              role: 'mira',
              content: (msg as any).content || '',
              timestamp: new Date(),
              isStreaming: true,
              mood: (msg as any).mood,
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

      case 'complete': {
        const completeMsg = msg as WsComplete;
        
        setMessages(prev => {
          const updated = [...prev];
          if (updated.length > 0 && updated[0].isStreaming) {
            updated[0] = {
              ...updated[0],
              isStreaming: false,
              mood: updated[0].mood || completeMsg.mood,
              salience: completeMsg.salience,
              tags: completeMsg.tags,
              previous_response_id: completeMsg.previous_response_id,
              thread_id: completeMsg.thread_id,
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

      case 'status': {
        const statusMsg = msg as WsStatus;
        const statusText = statusMsg.status_message || statusMsg.message || '';
        setStatusMessage(statusText);
        
        if (statusTimer.current) clearTimeout(statusTimer.current);
        const timer = setTimeout(() => setStatusMessage(''), 5000);
        statusTimer.current = timer;
        break;
      }

      case 'tool_result': {
        const tr = msg as WsToolResult;
        if (tr.tool_type && tr.data) {
          const toolResult: ToolResult = { 
            type: normalizeToolType(tr.tool_type) as any, 
            data: tr.data,
            tool_id: tr.tool_id,
            tool_name: tr.tool_name,
            status: tr.status || 'success',
            error: tr.error,
            metadata: tr.metadata
          };
          pendingToolResults.current.push(toolResult);
        }
        break;
      }

      case 'citation': {
        const cit = msg as WsCitation;
        if (cit.file_id && cit.filename) {
          const citation: Citation = {
            file_id: cit.file_id, 
            filename: cit.filename, 
            url: cit.url, 
            snippet: cit.snippet,
            page_number: (cit as any).page_number,
            line_number: (cit as any).line_number,
            confidence_score: (cit as any).confidence_score,
            source_type: (cit as any).source_type
          };
          pendingCitations.current.push(citation);
        }
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

      case 'error': {
        const errorMsg = msg as any;
        setIsThinking(false);
        
        let errorText = errorMsg.message || 'An error occurred';
        if (errorMsg.tool_type) {
          errorText = `${normalizeToolType(errorMsg.tool_type)} error: ${errorText}`;
        }
        
        setConnectionError(errorText);
        setTimeout(() => setConnectionError(''), 5000);
        break;
      }
    }
  }, [sessionId]);

  // WebSocket connection - use dynamic URL based on environment
  const { isConnected, send } = useWebSocket({
    url: getWebSocketUrl('/ws/chat'),  // Use proper path and dynamic URL
    onMessage: handleServerMessage,
    onConnect: () => {
      console.log('[useChatState] WebSocket connected successfully');
      setConnectionError(''); // Clear connection errors on successful connect
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

  // Add user message to chat (for tool invocations)
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

  // Message sending with better error handling
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

    const metadata: MessageMetadata = {};
    const wsMessage: WsClientMessage = {
      type: 'chat',
      content: content.trim(),
      session_id: sessionId,
      metadata
    };

    console.log('[useChatState] Sending message:', { type: wsMessage.type, length: content.length, sessionId });
    send(wsMessage);
  }, [isConnected, sessionId, send, addUserMessage]);

  // History loading with better error handling
  const loadChatHistory = useCallback(async (offset = 0) => {
    console.log(`[useChatState] Loading chat history, offset: ${offset}`);
    
    if (offset === 0) setIsLoadingHistory(true); 
    else setIsLoadingMore(true);

    try {
      // FIXED: Use getAPIUrl helper to avoid double /api
      const url = getAPIUrl(`chat/history?limit=30&offset=${offset}&session_id=${sessionId}`);
      console.log(`[useChatState] Fetching history from: ${url}`);
      
      // Debug config on first load
      if (offset === 0) {
        debugConfig();
      }
      
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(10000)
      });
      
      if (res.ok) {
        const data = await res.json();
        const rawMessages = data.messages || data.history || [];
        console.log(`[useChatState] Loaded ${rawMessages.length} messages`);
        
        const formatted: Message[] = rawMessages.map((msg: any) => {
          const role = msg.role === 'user' || msg.sender === 'User' ? 'user' : 'mira';
          const ts = typeof msg.timestamp === 'number' 
            ? new Date(msg.timestamp * 1000)  // Unix timestamp
            : new Date(msg.timestamp);       // ISO string
          
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
            previous_response_id: msg.previous_response_id,
            thread_id: msg.thread_id,
            toolResults: msg.tool_results?.map((tr: any) => ({
              type: normalizeToolType(tr.tool_type || tr.type),
              data: tr.data,
              tool_id: tr.tool_id,
              tool_name: tr.tool_name,
              status: tr.status || 'success',
              error: tr.error,
              metadata: tr.metadata
            })),
            citations: msg.citations?.map((cit: any) => ({
              file_id: cit.file_id,
              filename: cit.filename,
              url: cit.url,
              snippet: cit.snippet,
              page_number: cit.page_number,
              line_number: cit.line_number,
              confidence_score: cit.confidence_score,
              source_type: cit.source_type
            }))
          } as Message;
        });
        
        if (offset === 0) {
          setMessages(formatted.reverse());
          setHistoryOffset(formatted.length);
        } else {
          // FIXED: Prepend older messages to the beginning of the array
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

  // Cleanup timer on unmount
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
