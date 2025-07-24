// src/components/ChatContainer.tsx
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useTheme } from '../hooks/useTheme';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { MoodBackground } from './MoodBackground';
import { AsideOverlay } from './AsideOverlay';
import { ThinkingBubble } from './ThinkingBubble';
import type { Message, Aside } from '../types/messages';
import type { WsServerMessage } from '../types/websocket';
import { Sun, Moon } from 'lucide-react';

export const ChatContainer: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [asides, setAsides] = useState<Aside[]>([]);
  const [currentMood, setCurrentMood] = useState('present');
  const [isThinking, setIsThinking] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [historyOffset, setHistoryOffset] = useState(0);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const currentStreamId = useRef<string>('');
  const asideTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());
  
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
          const lastMsg = prev[prev.length - 1];
          
          if (lastMsg && lastMsg.id === currentStreamId.current && lastMsg.isStreaming) {
            // Append to existing streaming message
            return [
              ...prev.slice(0, -1),
              {
                ...lastMsg,
                content: lastMsg.content + msg.content,
                mood: msg.mood || lastMsg.mood,
              }
            ];
          } else if (msg.content && msg.content.trim()) {
            // Only start new streaming message if we have content
            const newId = Date.now().toString();
            currentStreamId.current = newId;
            return [
              ...prev,
              {
                id: newId,
                role: 'mira' as const,
                content: msg.content,
                mood: msg.mood || currentMood,
                timestamp: new Date(),
                isStreaming: true,
              }
            ];
          }
          return prev;
        });
        break;

      case 'aside':
        console.log('Received aside:', msg);
        const aside: Aside = {
          id: Date.now().toString(),
          cue: msg.emotional_cue,
          intensity: msg.intensity || 0.5,
          timestamp: new Date(),
        };
        
        setAsides(prev => [...prev, aside]);
        
        // Clear existing timer for this aside if any
        const existingTimer = asideTimers.current.get(aside.id);
        if (existingTimer) {
          clearTimeout(existingTimer);
        }
        
        // Remove aside after 4 seconds
        const timer = setTimeout(() => {
          setAsides(prev => prev.filter(a => a.id !== aside.id));
          asideTimers.current.delete(aside.id);
        }, 4000);
        
        asideTimers.current.set(aside.id, timer);
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

      case 'persona_update':
        console.log('Persona updated:', msg);
        if (msg.mood) {
          setCurrentMood(msg.mood);
        }
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
      // FIXED: Changed from '/api/chat/history' to '/chat/history'
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
          // Prepend older messages
          setMessages(prev => [...formattedMessages, ...prev]);
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

    // Add user message to chat
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsThinking(true);
    setConnectionError(''); // Clear any existing errors

    // Send via WebSocket (will queue if not connected)
    send({
      type: 'message',
      content,
    });
  }, [send]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      asideTimers.current.forEach(timer => clearTimeout(timer));
      asideTimers.current.clear();
    };
  }, []);

  return (
    <div className="relative flex flex-col h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Mood background */}
      <MoodBackground mood={currentMood} />
      
      {/* Header - with mood color border instead of text */}
      <header className="relative z-10 flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 backdrop-blur-sm bg-white/50 dark:bg-gray-900/50">
        <div className="flex items-center gap-3">
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
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} isDark={isDark} />
            ))}
            
            {/* Fancy thinking bubble */}
            {isThinking && (
              <ThinkingBubble visible={isThinking} isDark={isDark} />
            )}
          </>
        )}
        
        {/* Asides overlay in the center of the chat */}
        {asides.length > 0 && (
          <div className="fixed inset-x-0 top-1/3 pointer-events-none z-20">
            <AsideOverlay asides={asides} />
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
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
  );
};
