// src/hooks/useChatState.ts
// PHASE 2: Extracted chat state management (~200 lines)
// Responsibilities: Messages, WebSocket handling, history loading

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useWebSocket } from './useWebSocket';
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
            page_number: cit.page_number,
            line_number: cit.line_number,
            confidence_score: cit.confidence_score,
            source_type: cit.source_type
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

  // WebSocket connection
  const { isConnected, send } = useWebSocket({
    url: 'ws://localhost:3001/ws',
    onMessage: handleServerMessage,
    onConnect: () => console.log('[useChatState] WebSocket connected'),
    onDisconnect: () => console.log('[useChatState] WebSocket disconnected'),
    onError: (error) => console.error('[useChatState] WebSocket error:', error),
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

  // Message sending
  const handleSendMessage = useCallback((content: string) => {
    if (!content.trim() || !isConnected) return;

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

    send(wsMessage);
  }, [isConnected, sessionId, send, addUserMessage]);

  // History loading
  const loadChatHistory = useCallback(async (offset = 0) => {
    if (offset === 0) setIsLoadingHistory(true); 
    else setIsLoadingMore(true);

    try {
      const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:3001' 
        : '';
        
      const res = await fetch(`${baseUrl}/chat/history?limit=30&offset=${offset}&session_id=${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        const rawMessages = data.messages || data.history || [];
        
        const formatted: Message[] = rawMessages.map((msg: any) => {
          const role = msg.role === 'user' || msg.sender === 'User' ? 'user' : 'mira';
          const ts = typeof msg.timestamp === 'number' 
            ? new Date(msg.timestamp * 1000) 
            : new Date(msg.timestamp);

          return {
            id: msg.id || Date.now().toString(),
            role,
            content: msg.content || '',
            timestamp: ts,
            mood: msg.mood,
            salience: msg.salience,
            tags: msg.tags,
            session_id: msg.session_id || sessionId,
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
          };
        });

        if (offset === 0) {
          setMessages(formatted.reverse());
          setHistoryOffset(formatted.length);
        } else {
          setMessages(prev => [...formatted.reverse(), ...prev]);
          setHistoryOffset(prev => prev + formatted.length);
        }
        
        setHasMoreHistory(formatted.length === 30);
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    } finally {
      setIsLoadingHistory(false);
      setIsLoadingMore(false);
    }
  }, [sessionId]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setHistoryOffset(0);
    setHasMoreHistory(true);
  }, []);

  // Cleanup
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
    sessionId
  };

  const actions: ChatActions = {
    handleSendMessage,
    addUserMessage,
    loadChatHistory,
    setStatusMessage,
    setConnectionError,
    clearMessages,
    send
  };

  return { ...state, ...actions };
}
