// mira-frontend/src/components/ChatContainer.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useTheme } from '../hooks/useTheme';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { MoodBackground } from './MoodBackground';
import { AsideOverlay } from './AsideOverlay';
import { TypingIndicator } from './TypingIndicator';
import type { Message, Aside } from '../types/messages';
import type { WsServerMessage } from '../types/websocket';
import { Sun, Moon } from 'lucide-react';

export const ChatContainer: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [asides, setAsides] = useState<Aside[]>([]);
  const [currentMood, setCurrentMood] = useState('present');
  const [isThinking, setIsThinking] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentStreamId = useRef<string>('');
  const asideTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());
  
  const { isDark, toggleTheme } = useTheme();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleServerMessage = useCallback((msg: WsServerMessage | string) => {
    console.log('Handling message:', msg);
    
    // If it's a string (shouldn't happen with Sprint 2 backend)
    if (typeof msg === 'string') {
      console.log('Received plain text:', msg);
      setIsThinking(false);
      
      // Try to parse the old format just in case
      const outputMatch = msg.match(/output:\s*(.*?)(?=\s*mood:|$)/s);
      const moodMatch = msg.match(/mood:\s*(.*?)$/);
      
      const content = outputMatch ? outputMatch[1].trim() : msg;
      const mood = moodMatch ? moodMatch[1].trim() : 'present';
      
      if (mood) {
        setCurrentMood(mood.split(',')[0].trim());
      }
      
      const newId = Date.now().toString();
      setMessages(prev => [
        ...prev,
        {
          id: newId,
          role: 'mira',
          content: content,
          mood: mood,
          timestamp: new Date(),
          isStreaming: false,
        }
      ]);
      return;
    }
    
    // Handle structured WebSocket messages
    switch (msg.type) {
      case 'chunk':
        console.log('Received chunk:', msg);
        setIsThinking(false);
        
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
          } else {
            // Start new streaming message
            const newId = Date.now().toString();
            currentStreamId.current = newId;
            return [
              ...prev,
              {
                id: newId,
                role: 'mira',
                content: msg.content,
                mood: msg.mood,
                timestamp: new Date(),
                isStreaming: true,
              }
            ];
          }
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
        
        // Clear any existing timer for this aside
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
        setMessages(prev => prev.map(msg => 
          msg.id === currentStreamId.current 
            ? { ...msg, isStreaming: false }
            : msg
        ));
        currentStreamId.current = '';
        break;
        
      case 'error':
        console.log('Received error:', msg);
        setIsThinking(false);
        setConnectionError(msg.message);
        setTimeout(() => setConnectionError(''), 5000);
        break;
        
      default:
        console.log('Unknown message type:', msg);
    }
  }, []);
      case 'chunk':
        setIsThinking(false);
        
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
          } else {
            // Start new streaming message
            const newId = Date.now().toString();
            currentStreamId.current = newId;
            return [
              ...prev,
              {
                id: newId,
                role: 'mira',
                content: msg.content,
                mood: msg.mood,
                timestamp: new Date(),
                isStreaming: true,
              }
            ];
          }
        });
        break;
        
      case 'aside':
        const aside: Aside = {
          id: Date.now().toString(),
          cue: msg.emotional_cue,
          intensity: msg.intensity || 0.5,
          timestamp: new Date(),
        };
        
        setAsides(prev => [...prev, aside]);
        
        // Clear any existing timer for this aside
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
        setMessages(prev => prev.map(msg => 
          msg.id === currentStreamId.current 
            ? { ...msg, isStreaming: false }
            : msg
        ));
        currentStreamId.current = '';
        break;
        
      case 'error':
        setIsThinking(false);
        setConnectionError(msg.message);
        setTimeout(() => setConnectionError(''), 5000);
        break;
    }
  }, []);

  // Determine WebSocket URL based on current location
  const getWebSocketUrl = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    
    // If we're on mira.conary.io, use the proper WebSocket path
    if (host.includes('mira.conary.io')) {
      return `${protocol}//${host}/ws/chat`;
    }
    
    // Otherwise use localhost for development
    return 'ws://localhost:8080/ws/chat';
  };

  const { isConnected, send } = useWebSocket({
    url: getWebSocketUrl(),
    onMessage: handleServerMessage,
    onConnect: () => setConnectionError(''),
    onError: () => setConnectionError('Lost connection. Trying again...'),
  });

  const handleSendMessage = (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsThinking(true);
    
    send({
      type: 'message',
      content: userMessage.content,
      persona: null,
    });
  };

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      asideTimers.current.forEach(timer => clearTimeout(timer));
      asideTimers.current.clear();
    };
  }, []);

  return (
    <div className={`flex flex-col h-screen transition-colors duration-300 ${
      isDark ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'
    }`}>
      <MoodBackground mood={currentMood} />
      
      {/* Header */}
      <header className="relative z-10 flex items-center justify-between p-4 border-b border-gray-700/50 dark:border-gray-700/50">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold">
              M
            </div>
            <TypingIndicator visible={isThinking} />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Mira</h1>
            <p className="text-xs opacity-70">
              {isConnected ? (isThinking ? '...' : 'here') : 'connecting...'}
            </p>
          </div>
        </div>
        
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-gray-800/50 dark:hover:bg-gray-800/50 hover:bg-gray-200/50 transition-colors"
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </header>
      
      {/* Messages */}
      <div className="relative flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} isDark={isDark} />
        ))}
        
        <AsideOverlay asides={asides} />
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Connection error */}
      {connectionError && (
        <div className="relative z-10 px-4 py-2 bg-red-900/20 border-t border-red-800/50">
          <p className="text-sm text-red-400 text-center">{connectionError}</p>
        </div>
      )}
      
      {/* Input */}
      <ChatInput 
        onSend={handleSendMessage}
        disabled={!isConnected}
        isDark={isDark}
      />
    </div>
  );
};
