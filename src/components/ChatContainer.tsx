// src/components/ChatContainer.tsx

import React, { useState, useRef, useEffect } from 'react';
import { useChatStore } from '../stores/useChatStore';
import { useWebSocketStore } from '../stores/useWebSocketStore';
import { useAppState } from '../stores/useAppState';
import { useChatPersistence } from '../hooks/useChatPersistence';
import { ChatMessage } from './ChatMessage';
import { Send, AlertCircle, WifiOff, Wifi } from 'lucide-react';

export const ChatContainer: React.FC = () => {
  const { messages, addMessage } = useChatStore();
  const { send, connectionState, subscribe } = useWebSocketStore();
  const { currentProject } = useAppState();
  const [input, setInput] = useState('');
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // CRITICAL: Initialize chat persistence to load history from backend
  useChatPersistence(connectionState);
  
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
    setIsWaitingForResponse(true);
    
    // Add user message to chat
    addMessage({
      id: `user_${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: Date.now()
    });
    
    // Build metadata for context
    const metadata: any = {
      session_id: 'peter-eternal',
    };
    
    // Add project context
    if (currentProject) {
      metadata.project_name = currentProject.name;
      metadata.has_repository = currentProject.hasRepository;
    }
    
    // Send message via WebSocket
    await send({
      type: 'chat',
      content: userMessage,
      project_id: currentProject?.id,
      metadata
    });
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  // Connection status component
  const ConnectionStatus = () => {
    const statusConfig = {
      'connected': {
        icon: <Wifi className="w-4 h-4" />,
        text: 'Connected',
        className: 'text-green-500'
      },
      'connecting': {
        icon: <AlertCircle className="w-4 h-4 animate-pulse" />,
        text: 'Connecting...',
        className: 'text-yellow-500'
      },
      'disconnected': {
        icon: <WifiOff className="w-4 h-4" />,
        text: 'Disconnected',
        className: 'text-red-500'
      },
      'error': {
        icon: <AlertCircle className="w-4 h-4" />,
        text: 'Error',
        className: 'text-red-500'
      }
    };
    
    const config = statusConfig[connectionState as keyof typeof statusConfig] || statusConfig.disconnected;
    
    return (
      <div className={`flex items-center gap-2 text-sm ${config.className}`}>
        {config.icon}
        <span>{config.text}</span>
      </div>
    );
  };
  
  return (
    <div className="flex-1 flex flex-col bg-slate-900 overflow-hidden">
      {/* Chat header with connection status */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900">
        <h2 className="text-lg font-semibold">Chat</h2>
        <ConnectionStatus />
      </div>
      
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>Start a conversation with Mira</p>
          </div>
        )}
        
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        
        {isWaitingForResponse && (
          <div className="flex items-center gap-3 text-gray-400">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-sm">Mira is thinking...</span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input area */}
      <div className="border-t border-gray-800 bg-gray-900 p-4">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Message Mira..."
            disabled={connectionState !== 'connected'}
            className="flex-1 bg-gray-800 text-gray-100 rounded-lg px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            rows={3}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || connectionState !== 'connected'}
            className="px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        
        {connectionState !== 'connected' && (
          <p className="text-sm text-red-400 mt-2">
            Cannot send messages while disconnected
          </p>
        )}
      </div>
    </div>
  );
};
