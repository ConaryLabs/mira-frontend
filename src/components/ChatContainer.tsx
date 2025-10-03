// src/components/ChatContainer.tsx

import React, { useState, useRef, useEffect } from 'react';
import { useChatStore } from '../stores/useChatStore';
import { useWebSocketStore } from '../stores/useWebSocketStore';
import { useAppState } from '../stores/useAppState';
import { useChatPersistence } from '../hooks/useChatPersistence';
import { useChatMessaging } from '../hooks/useChatMessaging';  // ADDED: Import the enhanced hook
import { ChatMessage } from './ChatMessage';
import { Send, AlertCircle, WifiOff, Wifi } from 'lucide-react';

export const ChatContainer: React.FC = () => {
  const { messages, addMessage, setMessages } = useChatStore();
  const { connectionState, subscribe } = useWebSocketStore();
  const { currentProject } = useAppState();
  const [input, setInput] = useState('');
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // CRITICAL: Initialize chat persistence to load history from backend
  useChatPersistence(connectionState);
  
  // CRITICAL: Use the enhanced messaging hook with full context
  const { handleSend: sendWithContext } = useChatMessaging();
  
  // Subscribe to responses to clear waiting state
  useEffect(() => {
    const unsubscribe = subscribe('chat-container', (message) => {
      if (message.type === 'response' || message.type === 'error') {
        setIsWaitingForResponse(false);
      }
    });
    return unsubscribe;
  }, [subscribe]);
  
  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isWaitingForResponse]);
  
  const handleSend = async () => {
    if (!input.trim() || connectionState !== 'connected') return;
    
    const userMessage = input.trim();
    setInput('');
    
    // Use the enhanced hook that includes ALL context
    await sendWithContext(userMessage, setIsWaitingForResponse);
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  // Connection status component
  const ConnectionStatus = () => {
    if (connectionState === 'connected') {
      return (
        <div className="flex items-center gap-2 text-green-500 text-sm">
          <Wifi className="w-4 h-4" />
          <span>Connected</span>
        </div>
      );
    }
    
    if (connectionState === 'connecting') {
      return (
        <div className="flex items-center gap-2 text-yellow-500 text-sm">
          <AlertCircle className="w-4 h-4 animate-pulse" />
          <span>Connecting...</span>
        </div>
      );
    }
    
    return (
      <div className="flex items-center gap-2 text-red-500 text-sm">
        <WifiOff className="w-4 h-4" />
        <span>Disconnected</span>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with connection status */}
      <div className="flex justify-between items-center p-4 border-b border-slate-700">
        <h2 className="text-lg font-semibold text-slate-200">
          {currentProject ? currentProject.name : 'Chat'}
        </h2>
        <ConnectionStatus />
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        {isWaitingForResponse && (
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <div className="animate-pulse">●</div>
            <span>Mira is thinking...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="p-4 border-t border-slate-700">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Message Mira..."
            className="flex-1 bg-slate-800 text-slate-100 rounded-lg px-4 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            disabled={connectionState !== 'connected'}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || connectionState !== 'connected'}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
