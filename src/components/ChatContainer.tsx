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
    
    // Handle structured WebSocket messages
    if (typeof msg === 'object' && msg.type) {
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
          
        case 'persona_update':
          console.log('Persona updated:', msg);
          if (msg.mood) {
            setCurrentMood(msg.mood);
          }
          break;
          
        case 'error':
          console.error('Error from server:', msg.message);
          setConnectionError(msg.message);
          setTimeout(() => setConnectionError(''), 5000);
          break;
      }
    } else if (typeof msg === 'string') {
      // Fallback for plain text (shouldn't happen with updated backend)
      console.warn('Received plain text instead of structured message:', msg);
      setIsThinking(false);
      
      // Parse if it's in the old format
      const outputMatch = msg.match(/output:\s*(.*?)(?=\s*mood:|$)/s);
      const moodMatch = msg.match(/mood:\s*(.*?)$/);
      
      if (outputMatch || moodMatch) {
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
      } else {
        // Just display as-is
        const newId = Date.now().toString();
        setMessages(prev => [
          ...prev,
          {
            id: newId,
            role: 'mira',
            content: msg,
            mood: currentMood,
            timestamp: new Date(),
            isStreaming: false,
          }
        ]);
      }
    }
  }, [currentMood]);

  // Determine WebSocket URL based on current location
  const getWebSocketUrl = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/ws/chat`;
  };

  const { isConnected, send } = useWebSocket({
    url: getWebSocketUrl(),
    onMessage: handleServerMessage
  });

  const handleSendMessage = useCallback((content: string) => {
    if (!content.trim() || !isConnected) return;

    // Add user message to chat
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsThinking(true);

    // Send via WebSocket
    send({
      type: 'message',
      content,
    });
  }, [send, isConnected]);

  return (
    <div className="relative flex flex-col h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Mood background */}
      <MoodBackground mood={currentMood} />
      
      {/* Header */}
      <header className="relative z-10 flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
              M
            </div>
            {isThinking && (
              <TypingIndicator visible={true} />
            )}
          </div>
          <div>
            <h1 className="font-semibold">Mira</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
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
