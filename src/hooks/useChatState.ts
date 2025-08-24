// src/hooks/useChatState.ts
// Extract message/chat-related state and functions from ChatContainer.tsx

import { useState, useRef, useCallback } from 'react';
import type { Message, ToolResult, Citation } from '../types/messages';
import type { WsServerMessage, WsToolResult, WsCitation } from '../types/websocket';

export interface ChatState {
  messages: Message[];
  isThinking: boolean;
  isLoadingHistory: boolean;
  isLoadingMore: boolean;
  hasMoreHistory: boolean;
  historyOffset: number;
  toolsActive: boolean;
  statusMessage: string;
  connectionError: string;
}

export interface ChatActions {
  handleServerMessage: (msg: WsServerMessage | WsToolResult | WsCitation) => void;
  handleSendMessage: (content: string, projectId?: string | null, fileContext?: any) => void;
  loadChatHistory: (offset?: number) => Promise<void>;
  setStatusMessage: (message: string) => void;
  setConnectionError: (error: string) => void;
  clearMessages: () => void;
  setSendFunction: (sendFn: (message: any) => void) => void;
}

export function useChatState() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [historyOffset, setHistoryOffset] = useState(0);
  const [toolsActive, setToolsActive] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [connectionError, setConnectionError] = useState('');
  const [sendFunction, setSendFunction] = useState<((message: any) => void) | null>(null);

  // Refs for managing streaming state
  const currentStreamId = useRef<string>('');
  const pendingToolResults = useRef<ToolResult[]>([]);
  const pendingCitations = useRef<Citation[]>([]);
  const statusTimer = useRef<NodeJS.Timeout | null>(null);

  const handleServerMessage = useCallback((msg: WsServerMessage | WsToolResult | WsCitation) => {
    console.log('[useChatState] Received WS message:', msg.type, msg);
    
    switch (msg.type) {
      case 'chunk': {
        console.log('[useChatState] Processing chunk:', (msg as any).content);
        if ((msg as any).content && (msg as any).content.trim()) {
          setIsThinking(false);
        }
        
        setMessages(prev => {
          const firstMsg = prev[0];
          console.log('[useChatState] Current first message:', firstMsg);
          
          if (firstMsg && firstMsg.id === currentStreamId.current && firstMsg.isStreaming) {
            // Append to existing streaming message
            const updated = { 
              ...firstMsg, 
              content: firstMsg.content + ((msg as any).content || '') 
            };
            console.log('[useChatState] Appending to stream, new content length:', updated.content.length);
            return [updated, ...prev.slice(1)];
          } else {
            // Start new streaming message
            const newMessage: Message = {
              id: Date.now().toString(),
              role: 'mira',
              content: (msg as any).content || '',
              timestamp: new Date(),
              isStreaming: true,
            };
            currentStreamId.current = newMessage.id;
            pendingToolResults.current = [];
            pendingCitations.current = [];
            console.log('[useChatState] Starting new stream with ID:', newMessage.id);
            return [newMessage, ...prev];
          }
        });
        break;
      }

      case 'complete': {
        console.log('[useChatState] Complete message received');
        setMessages(prev => {
          const updated = [...prev];
          if (updated.length > 0 && updated[0].isStreaming) {
            console.log('[useChatState] Finalizing streaming message');
            updated[0] = {
              ...updated[0],
              isStreaming: false,
              toolResults: pendingToolResults.current.length ? [...pendingToolResults.current] : undefined,
              citations: pendingCitations.current.length ? [...pendingCitations.current] : undefined,
            } as Message;
          }
          return updated;
        });
        setToolsActive(false);
        pendingToolResults.current = [];
        pendingCitations.current = [];
        break;
      }

      case 'status': {
        console.log('[useChatState] Status message received');
        const statusText = (msg as any).status_message || (msg as any).message || '';
        setStatusMessage(statusText);
        if (statusText.includes('tool:') || statusText.includes('Executed')) setToolsActive(true);
        if (statusTimer.current) clearTimeout(statusTimer.current);
        const timer = setTimeout(() => setStatusMessage(''), 5000);
        statusTimer.current = timer;
        break;
      }

      case 'tool_result': {
        console.log('[useChatState] Tool result received');
        const tr = msg as WsToolResult;
        if (tr.tool_type && tr.data) {
          const toolResult: ToolResult = { type: tr.tool_type as any, data: tr.data };
          pendingToolResults.current.push(toolResult);
        }
        break;
      }

      case 'citation': {
        console.log('[useChatState] Citation received');
        const cit = msg as WsCitation;
        if (cit.file_id && cit.filename) {
          const citation: Citation = {
            file_id: cit.file_id, filename: cit.filename, url: cit.url, snippet: cit.snippet,
          };
          pendingCitations.current.push(citation);
        }
        break;
      }

      case 'aside': {
        console.log('[useChatState] Aside received (ignored in UI)');
        break;
      }

      case 'done': {
        console.log('[useChatState] Done message received');
        setIsThinking(false);
        setToolsActive(false);
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
        console.log('[useChatState] Error message received');
        setIsThinking(false);
        setToolsActive(false);
        setConnectionError((msg as any).message);
        setTimeout(() => setConnectionError(''), 5000);
        break;
      }
    }
  }, []);

  const loadChatHistory = useCallback(async (offset = 0) => {
    if (offset === 0) setIsLoadingHistory(true); else setIsLoadingMore(true);

    try {
      const res = await fetch(`/api/chat/history?limit=30&offset=${offset}`);
      if (res.ok) {
        const data = await res.json();
        const rawMessages = data.messages || data.history || [];
        const formatted: Message[] = rawMessages.map((msg: any) => {
          const role = msg.role === 'user' || msg.sender === 'User' ? 'user' : 'mira';
          const ts = typeof msg.timestamp === 'number' ? new Date(msg.timestamp * 1000) : new Date(msg.timestamp);
          return {
            id: msg.id || `${Date.now()}-${Math.random()}`,
            role,
            content: msg.content,
            timestamp: ts,
            isStreaming: false,
            toolResults: msg.tool_results,
            citations: msg.citations,
            tags: msg.tags,
            salience: msg.salience,
          } as Message;
        });
        if (offset === 0) setMessages(formatted); else setMessages(prev => [...prev, ...formatted]);
        setHasMoreHistory(formatted.length === 30);
        setHistoryOffset(offset + formatted.length);
      }
    } catch (e) {
      console.error('Failed to load chat history:', e);
    } finally {
      setIsLoadingHistory(false);
      setIsLoadingMore(false);
    }
  }, []);

  const handleSendMessage = useCallback((content: string, projectId?: string | null, fileContext?: any) => {
    if (!content.trim() || !sendFunction) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
      isStreaming: false,
    };
    setMessages(prev => [userMessage, ...prev]);
    setIsThinking(true);
    setConnectionError('');

    // Include file context if available
    const message: any = { 
      type: 'chat', 
      content, 
      project_id: projectId 
    };
    
    if (fileContext) {
      message.metadata = fileContext;
    }
    
    sendFunction(message);
  }, [sendFunction]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setHistoryOffset(0);
    setHasMoreHistory(true);
  }, []);

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    if (statusTimer.current) {
      clearTimeout(statusTimer.current);
    }
  }, []);

  const state: ChatState = {
    messages,
    isThinking,
    isLoadingHistory,
    isLoadingMore,
    hasMoreHistory,
    historyOffset,
    toolsActive,
    statusMessage,
    connectionError,
  };

  const actions: ChatActions = {
    handleServerMessage,
    handleSendMessage,
    loadChatHistory,
    setStatusMessage,
    setConnectionError,
    clearMessages,
    setSendFunction,
  };

  return {
    state,
    actions,
    cleanup,
    // Also expose individual state items for convenience
    ...state,
    ...actions,
  };
}
