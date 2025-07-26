import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useTheme } from '../hooks/useTheme';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { MoodBackground } from './MoodBackground';
import { ThinkingBubble } from './ThinkingBubble';
import ProjectSidebar from './ProjectSidebar';
import SidebarToggle from './SidebarToggle';
import ArtifactViewer from './ArtifactViewer';
import ArtifactToggle from './ArtifactToggle';
import type { Message, Aside } from '../types/messages';
import type { WsServerMessage } from '../types/websocket';
import { Sun, Moon } from 'lucide-react';

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // COLLAPSED by default!
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

  const fetchProjects = () => {
    fetch('/api/projects')
      .then(res => res.json())
      .then(data => {
        console.log('Fetched projects:', data);
        setProjects(data.projects || []);
      })
      .catch(err => {
        console.error('Failed to fetch projects:', err);
      });
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleProjectCreate = (name: string) => {
    fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
      .then(res => res.json())
      .then(newProject => {
        setProjects(prev => [...prev, newProject]);
      })
      .catch(err => {
        console.error('Failed to create project:', err);
      });
  };

  const handleProjectSelect = (projectId: string) => {
    setCurrentProjectId(projectId);
    setIsSidebarOpen(false);
    setSelectedArtifactId(null);
    setShowArtifacts(false);
  };

  // --- ARTIFACT/CHAT STATE ---
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMood, setCurrentMood] = useState('present');
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
    if (!isLoadingMore) {
      scrollToBottom();
    }
  }, [messages, isLoadingMore]);

  useEffect(() => {
    if (currentProjectId) {
      fetch(`/api/projects/${currentProjectId}/artifacts`)
        .then(res => res.json())
        .then(data => {
          setArtifactCount(data.artifacts?.length || 0);
        })
        .catch(err => console.error('Failed to fetch artifacts:', err));
    } else {
      setArtifactCount(0);
      setShowArtifacts(false);
    }
  }, [currentProjectId]);

  const getMoodColor = (mood: string) => {
    const moodColors: Record<string, string> = {
      playful: 'border-purple-500',
      caring: 'border-blue-500',
      sassy: 'border-rose-500',
      melancholy: 'border-indigo-600',
      fierce: 'border-red-600',
      intense: 'border-violet-700',
      present: 'border-gray-400',
      thinking: 'border-purple-400',
    };
    return moodColors[mood] || moodColors.present;
  };

  const handleArtifactClick = (artifactId: string) => {
    setSelectedArtifactId(artifactId);
    setShowArtifacts(true);
  };

  const handleServerMessage = useCallback((msg: WsServerMessage) => {
    switch (msg.type) {
      case 'chunk':
        if (msg.content && msg.content.trim()) setIsThinking(false);
        if (msg.mood) setCurrentMood(msg.mood);
        setMessages(prev => {
          const firstMsg = prev[0];
          if (firstMsg && firstMsg.id === currentStreamId.current && firstMsg.isStreaming) {
            return [
              {
                ...firstMsg,
                content: firstMsg.content + msg.content,
                mood: msg.mood || firstMsg.mood,
              },
              ...prev.slice(1)
            ];
          } else if (msg.content && msg.content.trim()) {
            const newId = Date.now().toString();
            currentStreamId.current = newId;
            return [
              {
                id: newId,
                role: 'mira' as const,
                content: msg.content,
                mood: msg.mood || currentMood,
                timestamp: new Date(),
                isStreaming: true,
              },
              ...prev
            ];
          }
          return prev;
        });
        break;
      case 'aside':
        const asideMessage: Message = {
          id: Date.now().toString(),
          role: 'aside',
          content: msg.emotional_cue,
          mood: currentMood,
          timestamp: new Date(),
          isStreaming: false,
          intensity: msg.intensity,
        };
        setMessages(prev => [asideMessage, ...prev]);
        break;
      case 'artifact':
        if (msg.artifact) {
          const newArtifact: SessionArtifact = {
            id: msg.artifact.id,
            name: msg.artifact.name,
            content: msg.artifact.content,
            artifact_type: msg.artifact.artifact_type,
            language: msg.artifact.language,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          setSessionArtifacts(prev => [...prev, newArtifact]);
        }
        break;
      case 'done':
        const streamId = currentStreamId.current;
        currentStreamId.current = '';
        setMessages(prev =>
          prev.map(msg =>
            msg.id === streamId ? { ...msg, isStreaming: false } : msg
          )
        );
        setIsThinking(false);
        break;
      case 'error':
        setConnectionError(msg.message || 'An error occurred');
        setIsThinking(false);
        setTimeout(() => setConnectionError(''), 5000);
        break;
      default:
        console.warn('Unknown message type:', msg);
    }
  }, [currentMood]);

  const loadChatHistory = useCallback(async (offset = 0) => {
    if (offset === 0) setIsLoadingHistory(true);
    else setIsLoadingMore(true);
    try {
      const response = await fetch(`/api/chat/history?limit=30&offset=${offset}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        const data = await response.json();
        console.log("Chat history data:", data); // Debug
        const formattedMessages: Message[] = data.messages.map((msg: any) => ({
          id: msg.id || Date.now().toString() + Math.random(),
          role: msg.role === 'assistant' ? 'mira' : msg.role,
          content: msg.content,
          mood: msg.tags?.[0] || 'present',
          timestamp: new Date(msg.timestamp),
          isStreaming: false,
        }));
        if (offset === 0) {
          setMessages(formattedMessages);
          const lastMiraMsg = formattedMessages.filter(m => m.role === 'mira').pop();
          if (lastMiraMsg?.mood) setCurrentMood(lastMiraMsg.mood);
        } else {
          setMessages(prev => [...prev, ...formattedMessages]);
        }
        setHasMoreHistory(formattedMessages.length === 30);
        setHistoryOffset(offset + formattedMessages.length);
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    } finally {
      setIsLoadingHistory(false);
      setIsLoadingMore(false);
    }
  }, []);

  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current || isLoadingMore || !hasMoreHistory) return;
    const { scrollTop } = messagesContainerRef.current;
    if (scrollTop === 0) {
      loadChatHistory(historyOffset);
    }
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
    onConnect: () => {
      setConnectionError('');
      loadChatHistory();
    },
    onDisconnect: () => {},
    onError: (error) => {
      setConnectionError('Connection error occurred');
      setTimeout(() => setConnectionError(''), 5000);
    }
  });

  const handleSendMessage = useCallback((content: string) => {
    if (!content.trim()) return;
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [userMessage, ...prev]);
    setIsThinking(true);
    setConnectionError('');
    send({
      type: 'message',
      content,
      project_id: currentProjectId,
    });
  }, [send, currentProjectId]);

  // Debug: Always log sidebar state!
  console.log("Rendering ProjectSidebar with isOpen:", isSidebarOpen, "projects:", projects);

  return (
    <div className="relative flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Sidebar overlays (fixed), rest is chat area. */}
      <ProjectSidebar
        projects={projects}
        currentProjectId={currentProjectId}
        onProjectSelect={handleProjectSelect}
        onProjectCreate={handleProjectCreate}
        isDark={isDark}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main chat area: Always rendered, never covered by sidebar */}
      <div className="flex-1 flex flex-col relative min-w-0">
        {/* Mood background */}
        <MoodBackground mood={currentMood} />

        {/* Header (Mira bar): Always shows */}
        <header className="relative z-10 flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 backdrop-blur-sm bg-white/50 dark:bg-gray-900/50">
          <div className="flex items-center gap-3">
            <SidebarToggle 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              isDark={isDark}
              hasActiveProject={!!currentProjectId}
            />
            <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold shadow-lg border-2 transition-colors duration-500 ${getMoodColor(isThinking ? 'thinking' : currentMood)}`}>
              M
            </div>
            <div>
              <h1 className="font-semibold">Mira</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isConnected ? 'online' : 'connecting...'}
              </p>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </header>

        <div 
          ref={messagesContainerRef}
          className="relative flex-1 overflow-y-auto p-4 space-y-4"
          onScroll={handleScroll}
        >
          {isLoadingMore && (
            <div className="text-center py-2 text-gray-400 dark:text-gray-600">
              <p className="text-sm animate-pulse">Loading more messages...</p>
            </div>
          )}
          {isLoadingHistory ? (
            <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-600">
              <p className="text-center">
                Loading our conversation...<br />
                <span className="text-sm animate-pulse">Remembering everything 💭</span>
              </p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-600">
              <p className="text-center text-sm">
                {/* No prompt - just empty state */}
              </p>
            </div>
          ) : (
            <>
              {[...messages].reverse().map((message) => (
                message.role === 'aside' ? (
                  <div key={message.id} className="flex justify-center my-3 px-4">
                    <div 
                      className={`
                        max-w-md text-sm italic text-center
                        animate-in fade-in duration-700
                        ${isDark 
                          ? 'text-white/40 hover:text-white/50' 
                          : 'text-gray-600/60 hover:text-gray-600/70'
                        }
                        transition-colors duration-300
                      `}
                      style={{
                        fontSize: message.intensity 
                          ? `${0.8 + (message.intensity * 0.2)}rem` 
                          : '0.875rem'
                      }}
                    >
                      {message.content}
                    </div>
                  </div>
                ) : (
                  <MessageBubble 
                    key={message.id} 
                    message={message} 
                    isDark={isDark}
                    onArtifactClick={currentProjectId ? handleArtifactClick : undefined}
                  />
                )
              ))}
              {isThinking && (
                <ThinkingBubble visible={isThinking} isDark={isDark} />
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
        {currentProjectId && (
          <div className="absolute bottom-20 right-4 z-20">
            <ArtifactToggle
              isOpen={showArtifacts}
              onClick={() => setShowArtifacts(!showArtifacts)}
              artifactCount={artifactCount}
              isDark={isDark}
            />
          </div>
        )}
        {connectionError && (
          <div className="relative z-10 px-4 py-2 bg-red-500/10 border-t border-red-500/20">
            <p className="text-sm text-red-600 dark:text-red-400 text-center">{connectionError}</p>
          </div>
        )}
        <ChatInput 
          onSend={handleSendMessage}
          disabled={false}
          isDark={isDark}
        />
      </div>
      {showArtifacts && currentProjectId && (
        <ArtifactViewer
          projectId={currentProjectId}
          isDark={isDark}
          onClose={() => {
            setShowArtifacts(false);
            setSelectedArtifactId(null);
          }}
          selectedArtifactId={selectedArtifactId || undefined}
          recentArtifacts={sessionArtifacts}
        />
      )}
    </div>
  );
};
