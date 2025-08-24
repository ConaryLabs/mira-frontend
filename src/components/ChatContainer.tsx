// src/components/ChatContainer.tsx
// PHASE 1: Enhanced ChatContainer with new WebSocket event handlers
// Key additions:
// 1. Handles new tool event types (tool_call_started, tool_call_completed, etc.)
// 2. Session ID management for thread continuity
// 3. Enhanced metadata capture (mood, salience, tags, previous_response_id)
// 4. Feature flag support from backend status messages
// 5. Tool type mapping for backend compatibility

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useTheme } from '../hooks/useTheme';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import ProjectSidebar from './ProjectSidebar';
import SidebarToggle from './SidebarToggle';
import ArtifactViewer from './ArtifactViewer';
import ArtifactToggle from './ArtifactToggle';
import type { Message, ToolResult, Citation, ToolExecution, AppConfig } from '../types/messages';
import type { 
  WsServerMessage, 
  WsToolResult, 
  WsCitation, 
  WsToolCallStarted, 
  WsToolCallCompleted, 
  WsToolCallFailed, 
  WsImageGenerated,
  WsComplete,
  WsStatus,
  FeatureFlags
} from '../types/websocket';
import { normalizeToolType } from '../types/websocket';
import { Sun, Moon, Cpu, Settings } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  created_at?: string;
  updated_at?: string;
}

interface SessionArtifact {
  id: string;
  name: string;
  content: string;
  artifact_type: 'code' | 'document' | 'data';
  language?: string;
  created_at: string;
  updated_at: string;
}

export const ChatContainer: React.FC = () => {
  // Existing state
  const [messages, setMessages] = useState<Message[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [toolsActive, setToolsActive] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [historyOffset, setHistoryOffset] = useState(0);
  const [showArtifacts, setShowArtifacts] = useState(false);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [artifactCount, setArtifactCount] = useState(0);
  const [sessionArtifacts, setSessionArtifacts] = useState<SessionArtifact[]>([]);

  // NEW: Phase 1 state additions
  const [sessionId, setSessionId] = useState<string>(() => 
    `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  );
  const [featureFlags, setFeatureFlags] = useState<FeatureFlags>({
    enable_chat_tools: true,
    enable_file_search: true,
    enable_image_generation: true,
    enable_web_search: true,
    enable_code_interpreter: true,
  });
  const [toolExecutions, setToolExecutions] = useState<ToolExecution[]>([]);
  const [backendConfig, setBackendConfig] = useState<any>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const currentStreamId = useRef<string>('');
  const statusTimer = useRef<NodeJS.Timeout>();
  const pendingToolResults = useRef<ToolResult[]>([]);
  const pendingCitations = useRef<Citation[]>([]);
  const pendingToolExecutions = useRef<ToolExecution[]>([]);

  const { isDark, toggleTheme } = useTheme();

  // Enhanced scrollToBottom with timeout to ensure DOM updates
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 50);
  };

  useEffect(() => {
    if (!isLoadingMore) scrollToBottom();
  }, [messages, isLoadingMore]);

  useEffect(() => {
    if (currentProjectId) {
      // Use correct port for backend API
      const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:3001' 
        : '';
        
      fetch(`${baseUrl}/projects/${currentProjectId}/artifacts`)
        .then(res => res.json())
        .then(data => setArtifactCount(data.artifacts?.length || 0))
        .catch(err => console.error('Failed to fetch artifacts:', err));
    } else {
      setArtifactCount(0);
      setShowArtifacts(false);
    }
  }, [currentProjectId]);

  const handleArtifactClick = (artifactId: string) => {
    setSelectedArtifactId(artifactId);
    setShowArtifacts(true);
  };

  // ENHANCED: WebSocket message handler with all new event types
  const handleServerMessage = useCallback((msg: WsServerMessage) => {
    console.log('[ChatContainer] Received WS message:', msg.type, msg);
    
    switch (msg.type) {
      case 'chunk': {
        console.log('[ChatContainer] Processing chunk:', (msg as any).content);
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
              // Capture mood if present on first chunk
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
              session_id: sessionId,
              tool_executions: [...pendingToolExecutions.current]
            };
            currentStreamId.current = newMessage.id;
            pendingToolResults.current = [];
            pendingCitations.current = [];
            return [newMessage, ...prev];
          }
        });
        scrollToBottom();
        break;
      }

      case 'complete': {
        console.log('[ChatContainer] Complete message received');
        const completeMsg = msg as WsComplete;
        
        setMessages(prev => {
          const updated = [...prev];
          if (updated.length > 0 && updated[0].isStreaming) {
            // Enhanced complete message with all new metadata
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
              tool_executions: pendingToolExecutions.current.length ? [...pendingToolExecutions.current] : undefined,
            } as Message;
          }
          return updated;
        });
        
        setToolsActive(false);
        pendingToolResults.current = [];
        pendingCitations.current = [];
        pendingToolExecutions.current = [];
        scrollToBottom();
        break;
      }

      case 'status': {
        console.log('[ChatContainer] Status message received');
        const statusMsg = msg as WsStatus;
        const statusText = statusMsg.status_message || statusMsg.message || '';
        
        // Parse backend configuration if present
        if (statusMsg.config) {
          setBackendConfig(statusMsg.config);
          setFeatureFlags({
            enable_chat_tools: statusMsg.config.enable_chat_tools ?? true,
            enable_file_search: statusMsg.config.enable_file_search ?? true,
            enable_image_generation: statusMsg.config.enable_image_generation ?? true,
            enable_web_search: statusMsg.config.enable_web_search ?? true,
            enable_code_interpreter: statusMsg.config.enable_code_interpreter ?? true,
          });
        }
        
        setStatusMessage(statusText);
        if (statusText.includes('tool:') || statusText.includes('Executed')) {
          setToolsActive(true);
        }
        
        if (statusTimer.current) clearTimeout(statusTimer.current);
        const timer = setTimeout(() => setStatusMessage(''), 5000);
        statusTimer.current = timer;
        break;
      }

      // NEW: Tool event handlers
      case 'tool_call_started': {
        console.log('[ChatContainer] Tool call started');
        const toolMsg = msg as WsToolCallStarted;
        
        const execution: ToolExecution = {
          id: toolMsg.tool_id,
          tool_type: normalizeToolType(toolMsg.tool_type),
          tool_name: toolMsg.tool_name,
          status: 'running',
          started_at: new Date(),
          parameters: toolMsg.parameters,
        };
        
        setToolExecutions(prev => [...prev, execution]);
        pendingToolExecutions.current.push(execution);
        setToolsActive(true);
        setStatusMessage(`Running ${execution.tool_type}...`);
        break;
      }

      case 'tool_call_completed': {
        console.log('[ChatContainer] Tool call completed');
        const toolMsg = msg as WsToolCallCompleted;
        
        // Update tool execution status
        setToolExecutions(prev => prev.map(exec => 
          exec.id === toolMsg.tool_id 
            ? { ...exec, status: 'completed', completed_at: new Date(), result: toolMsg.result }
            : exec
        ));
        
        // Update pending executions
        pendingToolExecutions.current = pendingToolExecutions.current.map(exec =>
          exec.id === toolMsg.tool_id 
            ? { ...exec, status: 'completed', completed_at: new Date(), result: toolMsg.result }
            : exec
        );
        
        setStatusMessage(`${normalizeToolType(toolMsg.tool_type)} completed`);
        break;
      }

      case 'tool_call_failed': {
        console.log('[ChatContainer] Tool call failed');
        const toolMsg = msg as WsToolCallFailed;
        
        // Update tool execution status
        setToolExecutions(prev => prev.map(exec => 
          exec.id === toolMsg.tool_id 
            ? { ...exec, status: 'failed', completed_at: new Date(), error: toolMsg.error }
            : exec
        ));
        
        // Update pending executions
        pendingToolExecutions.current = pendingToolExecutions.current.map(exec =>
          exec.id === toolMsg.tool_id 
            ? { ...exec, status: 'failed', completed_at: new Date(), error: toolMsg.error }
            : exec
        );
        
        setStatusMessage(`${normalizeToolType(toolMsg.tool_type)} failed: ${toolMsg.error}`);
        setConnectionError(`Tool error: ${toolMsg.error}`);
        setTimeout(() => setConnectionError(''), 5000);
        break;
      }

      case 'image_generated': {
        console.log('[ChatContainer] Image generated');
        const imageMsg = msg as WsImageGenerated;
        
        // Convert image_generated event to tool_result for UI consistency
        const toolResult: ToolResult = {
          type: 'image_generation',
          tool_id: imageMsg.tool_id,
          data: {
            prompt: imageMsg.prompt,
            imageUrl: imageMsg.image_url,
            imageUrls: imageMsg.image_urls || [imageMsg.image_url],
            style: imageMsg.style,
            size: imageMsg.size,
            quality: imageMsg.quality,
            metadata: imageMsg.metadata
          },
          status: 'success',
          metadata: {
            execution_time_ms: imageMsg.metadata?.generation_time_ms,
            image_count: imageMsg.image_urls?.length || 1
          }
        };
        
        pendingToolResults.current.push(toolResult);
        setStatusMessage('Image generated successfully');
        break;
      }

      case 'tool_result': {
        console.log('[ChatContainer] Tool result received');
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
        console.log('[ChatContainer] Citation received');
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

      case 'aside': {
        console.log('[ChatContainer] Aside received (ignored in UI)');
        break;
      }

      case 'done': {
        console.log('[ChatContainer] Done message received');
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
              tool_executions: pendingToolExecutions.current.length ? [...pendingToolExecutions.current] : undefined,
            } as Message;
          }
          return updated;
        });
        
        pendingToolResults.current = [];
        pendingCitations.current = [];
        pendingToolExecutions.current = [];
        scrollToBottom();
        break;
      }

      case 'error': {
        console.log('[ChatContainer] Error message received');
        const errorMsg = msg as any;
        
        setIsThinking(false);
        setToolsActive(false);
        
        // Enhanced error handling with tool context
        let errorText = errorMsg.message || 'An error occurred';
        if (errorMsg.tool_type) {
          errorText = `${normalizeToolType(errorMsg.tool_type)} error: ${errorText}`;
        }
        
        setConnectionError(errorText);
        setTimeout(() => setConnectionError(''), 5000);
        break;
      }

      // Handle any other message types gracefully
      default: {
        console.log('[ChatContainer] Unhandled message type:', (msg as any).type);
        break;
      }
    }
  }, [sessionId]);

  // ENHANCED: Load chat history with new metadata fields
  const loadChatHistory = useCallback(async (offset = 0) => {
    if (offset === 0) setIsLoadingHistory(true); 
    else setIsLoadingMore(true);

    try {
      // Use correct port for backend API
      const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:3001' 
        : '';
        
      const res = await fetch(`${baseUrl}/chat/history?limit=30&offset=${offset}&session_id=${sessionId}`);
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
            // Enhanced metadata from backend
            mood: msg.mood,
            salience: msg.salience,
            tags: msg.tags,
            session_id: msg.session_id || sessionId,
            thread_id: msg.thread_id,
            previous_response_id: msg.previous_response_id,
            response_id: msg.response_id,
            toolResults: msg.tool_results,
            citations: msg.citations,
            tool_executions: msg.tool_executions,
            metadata: msg.metadata
          } as Message;
        });
        
        if (offset === 0) setMessages(formatted); 
        else setMessages(prev => [...prev, ...formatted]);
        
        setHasMoreHistory(formatted.length === 30);
        setHistoryOffset(offset + formatted.length);
      }
    } catch (e) {
      console.error('Failed to load chat history:', e);
    } finally {
      setIsLoadingHistory(false);
      setIsLoadingMore(false);
    }
  }, [sessionId]);

  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current || isLoadingMore || !hasMoreHistory) return;
    const { scrollTop } = messagesContainerRef.current;
    if (scrollTop === 0) loadChatHistory(historyOffset);
  }, [historyOffset, isLoadingMore, hasMoreHistory, loadChatHistory]);

  const webSocketUrl = useMemo(() => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'ws://localhost:3001/ws/chat';  // Backend runs on 3001, not 8080
    }
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/ws/chat`;
  }, []);

  const { isConnected, send } = useWebSocket({
    url: webSocketUrl,
    onMessage: handleServerMessage,
    onConnect: () => { 
      setConnectionError(''); 
      loadChatHistory(); 
    },
    onDisconnect: () => {},
    onError: () => {
      setConnectionError('Connection error occurred');
      setTimeout(() => setConnectionError(''), 5000);
    },
  });

  // ENHANCED: Send message with session tracking
  const handleSendMessage = useCallback((content: string) => {
    if (!content.trim()) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
      isStreaming: false,
      session_id: sessionId,
    };
    
    setMessages(prev => [userMessage, ...prev]);
    setIsThinking(true);
    setConnectionError('');
    
    // Enhanced message with session tracking and metadata
    send({ 
      type: 'chat', 
      content, 
      project_id: currentProjectId,
      session_id: sessionId,
      // Include previous response ID if available for thread continuity
      previous_response_id: messages.length > 0 ? messages[0].response_id : null,
    });
  }, [send, currentProjectId, sessionId, messages]);

  // Project management functions
  const handleProjectCreate = useCallback(async (name: string) => {
    try {
      // Use correct port for backend API
      const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:3001' 
        : '';
        
      const res = await fetch(`${baseUrl}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      if (res.ok) {
        const project = await res.json();
        setProjects(prev => [...prev, project]);
        setCurrentProjectId(project.id);
      }
    } catch (e) {
      console.error('Failed to create project:', e);
    }
  }, []);

  const handleProjectSelect = useCallback((projectId: string) => {
    setCurrentProjectId(projectId);
    setMessages([]);
    loadChatHistory();
  }, [loadChatHistory]);

  // Load projects on mount
  useEffect(() => {
    // Use correct port for backend API
    const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
      ? 'http://localhost:3001' 
      : '';
      
    fetch(`${baseUrl}/projects`)
      .then(res => res.json())
      .then(data => {
        setProjects(data.projects || []);
        if (data.projects?.length > 0 && !currentProjectId) {
          setCurrentProjectId(data.projects[0].id);
        }
      })
      .catch(err => console.error('Failed to load projects:', err));
  }, [currentProjectId]);

  // Cleanup timer on unmount
  useEffect(() => () => { 
    if (statusTimer.current) clearTimeout(statusTimer.current); 
  }, []);

  return (
    <div className={`relative flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 ${isDark ? 'dark-scrollbar' : 'light-scrollbar'}`}>
      {/* Sidebar overlays */}
      <ProjectSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        projects={projects}
        onProjectCreate={handleProjectCreate}
        onProjectSelect={handleProjectSelect}
        currentProjectId={currentProjectId}
        isDark={isDark}
      />
      <SidebarToggle onClick={() => setIsSidebarOpen(!isSidebarOpen)} isDark={isDark} />

      {/* Main chat area */}
      <div className="relative flex-1 flex flex-col">
        {/* Status message bar */}
        {statusMessage && (
          <div className={`absolute top-4 left-1/2 transform -translate-x-1/2 z-20 px-4 py-2 rounded-lg shadow-lg animate-slide-down ${
            toolsActive ? 'bg-purple-500 text-white' : 'bg-blue-500 text-white'
          }`}>
            <div className="flex items-center gap-2">
              {toolsActive && <Cpu className="w-4 h-4 animate-pulse" />}
              {statusMessage}
            </div>
          </div>
        )}

        {/* Enhanced header with feature flag indicator */}
        <header className="relative z-10 flex items-center justify-between p-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-2xl font-light">Mira</h1>
          
          <div className="flex items-center gap-3">
            {/* Feature flags indicator */}
            <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">
              <Settings className="w-3 h-3" />
              <span title={`Tools: ${Object.values(featureFlags).filter(Boolean).length}/5 enabled`}>
                {Object.values(featureFlags).filter(Boolean).length}/5
              </span>
            </div>

            {/* Active tool executions counter */}
            {toolExecutions.filter(t => t.status === 'running').length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                <Cpu className="w-4 h-4 text-purple-600 dark:text-purple-400 animate-pulse" />
                <span className="text-sm text-purple-600 dark:text-purple-400">
                  {toolExecutions.filter(t => t.status === 'running').length} tools active
                </span>
              </div>
            )}

            {/* Artifact toggle */}
            <ArtifactToggle 
              isOpen={showArtifacts}
              onClick={() => setShowArtifacts(!showArtifacts)}
              artifactCount={artifactCount}
              isDark={isDark}
            />

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </header>

        {/* Messages container */}
        <div
          ref={messagesContainerRef}
          className="relative flex-1 overflow-y-auto p-4"
          onScroll={handleScroll}
        >
          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="flex flex-col-reverse gap-4">
              {/* Messages */}
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isDark={isDark}
                  onArtifactClick={handleArtifactClick}
                />
              ))}
              
              {/* Load more history */}
              {hasMoreHistory && messages.length > 0 && (
                <div className="text-center py-4">
                  {isLoadingMore ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                  ) : (
                    <button
                      onClick={() => loadChatHistory(historyOffset)}
                      className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                    >
                      Load more messages
                    </button>
                  )}
                </div>
              )}
              
              {/* Thinking indicator */}
              {isThinking && (
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-800 dark:bg-gray-600 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <div className="flex-1 max-w-[70%]">
                    <div className="bg-gray-200 dark:bg-gray-700 rounded-2xl px-4 py-3">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Connection error */}
        {connectionError && (
          <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-20">
            {connectionError}
          </div>
        )}

        {/* Chat Input */}
        <div className="border-t border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <ChatInput
            onSend={handleSendMessage}
            disabled={!isConnected || isThinking}
            isDark={isDark}
          />
        </div>
      </div>

      {/* Artifact viewer overlay */}
      {showArtifacts && currentProjectId && (
        <ArtifactViewer
          onClose={() => setShowArtifacts(false)}
          selectedArtifactId={selectedArtifactId || undefined}
          recentArtifacts={sessionArtifacts}
          projectId={currentProjectId}
          isDark={isDark}
        />
      )}
    </div>
  );
};
