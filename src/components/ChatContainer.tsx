// src/components/ChatContainer.tsx
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useTheme } from '../hooks/useTheme';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { MoodBackground } from './MoodBackground';
import { ThinkingBubble } from './ThinkingBubble';
import { ProjectSidebar } from './ProjectSidebar';
import { SidebarToggle } from './SidebarToggle';
import { ArtifactViewer } from './ArtifactViewer';
import { ArtifactToggle } from './ArtifactToggle';
import type { Message, Aside } from '../types/messages';
import type { WsServerMessage } from '../types/websocket';
import { Sun, Moon } from 'lucide-react';

// Track artifacts from current session
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMood, setCurrentMood] = useState('present');
  const [isThinking, setIsThinking] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [historyOffset, setHistoryOffset] = useState(0);
  
  // New state for projects and artifacts
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
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
    // Only auto-scroll if not loading more history
    if (!isLoadingMore) {
      scrollToBottom();
    }
  }, [messages, isLoadingMore]);

  // Fetch artifact count when project changes
  useEffect(() => {
    if (currentProjectId) {
      fetch(`http://localhost:8080/projects/${currentProjectId}/artifacts`)
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

  // Get mood color for the avatar border
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

  const handleProjectSelect = (projectId: string) => {
    setCurrentProjectId(projectId);
    setIsSidebarOpen(false);
    setSelectedArtifactId(null);
    setShowArtifacts(false);
    // Optionally clear messages or load project-specific history
  };

  const handleArtifactClick = (artifactId: string) => {
    setSelectedArtifactId(artifactId);
    setShowArtifacts(true);
  };

  const handleServerMessage = useCallback((msg: WsServerMessage) => {
    console.log('Handling message:', msg);
    
    switch (msg.type) {
      case 'chunk':
        console.log('Received chunk:', msg);
        
        // Only hide thinking bubble if we have actual content
        if (msg.content && msg.content.trim()) {
          setIsThinking(false);
        }
        
        if (msg.mood) {
          setCurrentMood(msg.mood);
        }
        
        setMessages(prev => {
          const firstMsg = prev[0];
          
          if (firstMsg && firstMsg.id === currentStreamId.current && firstMsg.isStreaming) {
            // Update the existing streaming message
            return [
              {
                ...firstMsg,
                content: firstMsg.content + msg.content,
                mood: msg.mood || firstMsg.mood,
              },
              ...prev.slice(1)
            ];
          } else if (msg.content && msg.content.trim()) {
            // Start new streaming message at the beginning
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
        console.log('Received aside:', msg);
        // Add aside as a special message type in the chat
        const asideMessage: Message = {
          id: Date.now().toString(),
          role: 'aside',  // Now properly typed
          content: msg.emotional_cue,
          mood: currentMood,
          timestamp: new Date(),
          isStreaming: false,
          intensity: msg.intensity,
        };
        
        // Add to messages array so it appears inline
        setMessages(prev => [asideMessage, ...prev]);
        break;

      case 'artifact':
        // Handle artifact creation messages from backend
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
        console.log('Stream done');
        // Mark the current streaming message as complete
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
        console.error('Error from server:', msg.message);
        setConnectionError(msg.message || 'An error occurred');
        setIsThinking(false);
        // Clear error after 5 seconds
        setTimeout(() => setConnectionError(''), 5000);
        break;

      default:
        console.warn('Unknown message type:', msg);
    }
  }, [currentMood]);

  // Load chat history
  const loadChatHistory = useCallback(async (offset = 0) => {
    if (offset === 0) {
      setIsLoadingHistory(true);
    } else {
      setIsLoadingMore(true);
    }
    
    try {
      const response = await fetch(`/chat/history?limit=30&offset=${offset}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
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
          
          // Set mood from last assistant message
          const lastMiraMsg = formattedMessages.filter(m => m.role === 'mira').pop();
          if (lastMiraMsg?.mood) {
            setCurrentMood(lastMiraMsg.mood);
          }
        } else {
          // Append older messages to the end
          setMessages(prev => [...prev, ...formattedMessages]);
        }
        
        // If we got fewer messages than requested, there are no more
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

  // Handle scroll for lazy loading
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current || isLoadingMore || !hasMoreHistory) return;
    
    const { scrollTop } = messagesContainerRef.current;
    
    // Load more when scrolled to top
    if (scrollTop === 0) {
      loadChatHistory(historyOffset);
    }
  }, [historyOffset, isLoadingMore, hasMoreHistory, loadChatHistory]);

  // Memoize WebSocket URL to prevent reconnection loops
  const webSocketUrl = useMemo(() => {
    // For development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'ws://localhost:8080/ws/chat';
    }
    
    // For production
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/ws/chat`;
  }, []);

  const { isConnected, send } = useWebSocket({
    url: webSocketUrl,
    onMessage: handleServerMessage,
    onConnect: () => {
      console.log('Chat connected to WebSocket');
      setConnectionError('');
      // Request chat history after connecting
      loadChatHistory();
    },
    onDisconnect: () => {
      console.log('Chat disconnected from WebSocket');
    },
    onError: (error) => {
      console.error('WebSocket error in chat:', error);
      setConnectionError('Connection error occurred');
      setTimeout(() => setConnectionError(''), 5000);
    }
  });

  const handleSendMessage = useCallback((content: string) => {
    if (!content.trim()) return;

    // Add user message to chat (prepend to beginning)
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    
    setMessages(prev => [userMessage, ...prev]);
    setIsThinking(true);
    setConnectionError(''); // Clear any existing errors

    // Send via WebSocket with project context
    send({
      type: 'message',
      content,
      project_id: currentProjectId,
    });
  }, [send, currentProjectId]);

  return (
    <div className="relative flex flex-col h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Mood background */}
      <MoodBackground mood={currentMood} />
      
      {/* Project Sidebar */}
      <ProjectSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        currentProjectId={currentProjectId}
        onProjectSelect={handleProjectSelect}
        isDark={isDark}
      />
      
      {/* Main chat area - adjust width when artifacts are shown */}
      <div className={`
        flex-1 flex flex-col relative
        ${showArtifacts && currentProjectId ? 'mr-[600px]' : ''}
      `}>
        {/* Header - with mood color border instead of text */}
        <header className="relative z-10 flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 backdrop-blur-sm bg-white/50 dark:bg-gray-900/50">
          <div className="flex items-center gap-3">
            {/* Add toggle button */}
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
        
        {/* Messages */}
        <div 
          ref={messagesContainerRef}
          className="relative flex-1 overflow-y-auto p-4 space-y-4"
          onScroll={handleScroll}
        >
          {/* Loading more indicator */}
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
                  // Render aside inline with special styling
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
                  // Regular message bubble with artifact support
                  <MessageBubble 
                    key={message.id} 
                    message={message} 
                    isDark={isDark}
                    onArtifactClick={currentProjectId ? handleArtifactClick : undefined}
                  />
                )
              ))}
              
              {/* Fancy thinking bubble */}
              {isThinking && (
                <ThinkingBubble visible={isThinking} isDark={isDark} />
              )}
            </>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        {/* Artifact toggle - positioned above the input */}
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
        
        {/* Connection error */}
        {connectionError && (
          <div className="relative z-10 px-4 py-2 bg-red-500/10 border-t border-red-500/20">
            <p className="text-sm text-red-600 dark:text-red-400 text-center">{connectionError}</p>
          </div>
        )}
        
        {/* Input */}
        <ChatInput 
          onSend={handleSendMessage}
          disabled={false} // Always allow sending - will queue if disconnected
          isDark={isDark}
        />
      </div>
      
      {/* Artifact viewer - slides in from right */}
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
