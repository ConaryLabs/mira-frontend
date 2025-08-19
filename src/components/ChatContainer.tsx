// src/components/ChatContainer.tsx
// Streaming chat UI with no mood/persona handling.
// - Streams chunks -> one growing assistant bubble
// - Finalizes on `complete`/`done`
// - Loads history on connect
// - Auto-scrolls
// - Keeps tool results/citations support

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useTheme } from '../hooks/useTheme';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import ProjectSidebar from './ProjectSidebar';
import SidebarToggle from './SidebarToggle';
import ArtifactViewer from './ArtifactViewer';
import ArtifactToggle from './ArtifactToggle';
import type { Message, ToolResult, Citation } from '../types/messages';
import type { WsServerMessage, WsToolResult, WsCitation } from '../types/websocket';
import { Sun, Moon, Cpu } from 'lucide-react';

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
  // --- PROJECT STATE ---
  const [projects, setProjects] = useState<Project[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

  // --- STATUS/UI STATE ---
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [statusTimer, setStatusTimer] = useState<NodeJS.Timeout | null>(null);
  const [toolsActive, setToolsActive] = useState(false);

  // --- TEMPORARY TOOL/CITATION STORAGE ---
  const pendingToolResults = useRef<ToolResult[]>([]);
  const pendingCitations = useRef<Citation[]>([]);

  const fetchProjects = () => {
    fetch('/api/projects')
      .then(res => res.json())
      .then(data => setProjects(data.projects || []))
      .catch(err => console.error('Failed to fetch projects:', err));
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleProjectCreate = (name: string) => {
    fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
      .then(res => res.json())
      .then(newProject => setProjects(prev => [...prev, newProject]))
      .catch(err => console.error('Failed to create project:', err));
  };

  const handleProjectSelect = (projectId: string) => {
    setCurrentProjectId(projectId);
    setIsSidebarOpen(false);
    setSelectedArtifactId(null);
    setShowArtifacts(false);
  };

  // --- ARTIFACT/CHAT STATE ---
  const [messages, setMessages] = useState<Message[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [historyOffset, setHistoryOffset] = useState(0);
  const [showArtifacts, setShowArtifacts] = useState(false);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [artifactCount, setArtifactCount] = useState(0);
  const [sessionArtifacts, setSessionArtifacts] = useState<SessionArtifact[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const currentStreamId = useRef<string>('');

  const { isDark, toggleTheme } = useTheme();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!isLoadingMore) scrollToBottom();
  }, [messages, isLoadingMore]);

  useEffect(() => {
    if (currentProjectId) {
      fetch(`/api/projects/${currentProjectId}/artifacts`)
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

  // WS handler (no mood/persona UI)
  const handleServerMessage = useCallback((msg: WsServerMessage | WsToolResult | WsCitation) => {
    switch (msg.type) {
      case 'chunk': {
        if (msg.content && msg.content.trim()) setIsThinking(false);
        setMessages(prev => {
          const firstMsg = prev[0];
          if (firstMsg && firstMsg.id === currentStreamId.current && firstMsg.isStreaming) {
            // append to existing streaming message
            return [
              { ...firstMsg, content: firstMsg.content + (msg.content || '') },
              ...prev.slice(1),
            ];
          } else {
            // start new streaming message
            const newMessage: Message = {
              id: Date.now().toString(),
              role: 'mira',
              content: msg.content || '',
              timestamp: new Date(),
              isStreaming: true,
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
        setToolsActive(false);
        pendingToolResults.current = [];
        pendingCitations.current = [];
        scrollToBottom();
        break;
      }

      case 'status': {
        const statusText = (msg as any).status_message || (msg as any).message || '';
        setStatusMessage(statusText);
        if (statusText.includes('tool:') || statusText.includes('Executed')) setToolsActive(true);
        if (statusTimer) clearTimeout(statusTimer);
        const timer = setTimeout(() => setStatusMessage(''), 5000);
        setStatusTimer(timer);
        break;
      }

      case 'tool_result': {
        const tr = msg as WsToolResult;
        if (tr.tool_type && tr.data) {
          const toolResult: ToolResult = { type: tr.tool_type as any, data: tr.data };
          pendingToolResults.current.push(toolResult);
        }
        break;
      }

      case 'citation': {
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
        // Ignored in UI (we can surface later if we want)
        break;
      }

      case 'done': {
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
        scrollToBottom();
        break;
      }

      case 'error': {
        setIsThinking(false);
        setToolsActive(false);
        setConnectionError((msg as any).message);
        setTimeout(() => setConnectionError(''), 5000);
        break;
      }
    }
  }, [statusTimer]);

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

  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current || isLoadingMore || !hasMoreHistory) return;
    const { scrollTop } = messagesContainerRef.current;
    if (scrollTop === 0) loadChatHistory(historyOffset);
  }, [historyOffset, isLoadingMore, hasMoreHistory, loadChatHistory]);

  const webSocketUrl = useMemo(() => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'ws://localhost:8080/ws/chat';
    }
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/ws/chat`;
  }, []);

  const { isConnected, send } = useWebSocket({
    url: webSocketUrl,
    onMessage: handleServerMessage,
    onConnect: () => { setConnectionError(''); loadChatHistory(); },
    onDisconnect: () => {},
    onError: () => {
      setConnectionError('Connection error occurred');
      setTimeout(() => setConnectionError(''), 5000);
    },
  });

  const handleSendMessage = useCallback((content: string) => {
    if (!content.trim()) return;
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
    send({ type: 'chat', content, project_id: currentProjectId });
  }, [send, currentProjectId]);

  useEffect(() => () => { if (statusTimer) clearTimeout(statusTimer); }, [statusTimer]);

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

        {/* Header */}
        <header className="relative z-10 flex items-center justify-between p-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-2xl font-light">Mira</h1>
          {toolsActive && (
            <div className="flex items-center gap-2 px-3 py-1 bg-purple-100 dark:bg-purple-900/30 rounded-full">
              <Cpu className="w-4 h-4 text-purple-600 dark:text-purple-400 animate-pulse" />
              <span className="text-sm text-purple-600 dark:text-purple-400">Tools Active</span>
            </div>
          )}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </header>

        {/* Messages */}
        <div
          ref={messagesContainerRef}
          className="relative flex-1 overflow-y-auto p-4 space-y-4"
          onScroll={handleScroll}
        >
          {isLoadingHistory ? (
            <div className="flex justify-center py-8">
              <div className="animate-pulse text-gray-500">Loading messages...</div>
            </div>
          ) : (
            <>
              {isLoadingMore && (
                <div className="flex justify-center py-2">
                  <div className="text-sm text-gray-500">Loading more...</div>
                </div>
              )}
              <div className="flex flex-col-reverse space-y-4 space-y-reverse">
                {isThinking && (
                  <div className="rounded-xl px-3 py-2 text-xs text-gray-500 dark:text-gray-400 bg-white/60 dark:bg-gray-800/60 w-max">
                    thinking…
                  </div>
                )}
                {messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isDark={isDark}
                    onArtifactClick={handleArtifactClick}
                  />
                ))}
              </div>
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Connection error */}
        {connectionError && (
          <div className="absolute top-16 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-red-500 text-white rounded-lg shadow-lg">
            {connectionError}
          </div>
        )}

        {/* Chat input */}
        <ChatInput onSend={handleSendMessage} disabled={!isConnected} isDark={isDark} />
      </div>

      {/* Artifact viewer */}
      {currentProjectId && artifactCount > 0 && (
        <>
          <ArtifactToggle
            isOpen={showArtifacts}
            onClick={() => setShowArtifacts(!showArtifacts)}
            isDark={isDark}
            artifactCount={artifactCount}
          />
          <ArtifactViewer
            projectId={currentProjectId}
            isDark={isDark}
            onClose={() => setShowArtifacts(false)}
            selectedArtifactId={selectedArtifactId || undefined}
            recentArtifacts={sessionArtifacts}
          />
        </>
      )}
    </div>
  );
};
