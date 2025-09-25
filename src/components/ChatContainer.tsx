// src/components/ChatContainer.tsx

import React, { useState, useRef, useEffect } from 'react';
import { useChatStore } from '../stores/useChatStore';
import { useWebSocketStore } from '../stores/useWebSocketStore';
import { useAppState } from '../stores/useAppState';
import { ChatMessage } from './ChatMessage';
import { Send, AlertCircle, WifiOff, Wifi } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export const ChatContainer: React.FC = () => {
  const { messages, addMessage } = useChatStore();
  const { send, connectionState, subscribe } = useWebSocketStore();
  const { currentProject } = useAppState();
  const [input, setInput] = useState('');
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
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
    setIsWaitingForResponse(true);  // Start waiting
    
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
        text: 'Connection Error',
        className: 'text-red-500'
      }
    };
    
    const config = statusConfig[connectionState];
    
    if (connectionState === 'connected') return null;
    
    return (
      <div className={`flex items-center gap-2 px-4 py-2 bg-gray-800 border-b border-gray-700 ${config.className}`}>
        {config.icon}
        <span className="text-sm">{config.text}</span>
        {connectionState === 'disconnected' && (
          <button 
            onClick={() => useWebSocketStore.getState().connect()}
            className="ml-auto text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded"
          >
            Reconnect
          </button>
        )}
      </div>
    );
  };
  
  return (
    <div className="flex-1 flex flex-col h-full">
      <ConnectionStatus />
      
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !isWaitingForResponse && (
          <div className="text-center text-gray-500 mt-8">
            <p className="text-lg mb-2">Start a conversation</p>
            <p className="text-sm">
              {currentProject 
                ? `Working in: ${currentProject.name}`
                : 'No project selected'}
            </p>
          </div>
        )}
        
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        
        {/* Thinking indicator when waiting for response */}
        {isWaitingForResponse && (
          <div className="flex justify-start mb-4">
            <div className="max-w-[80%] bg-gray-800 text-gray-100 rounded-lg px-4 py-2">
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Mira is thinking</span>
                <div className="flex gap-1">
                  <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                  <span className="inline-block w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{animationDelay: '200ms'}}></span>
                  <span className="inline-block w-2 h-2 bg-blue-300 rounded-full animate-pulse" style={{animationDelay: '400ms'}}></span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input area */}
      <div className="border-t border-gray-700 p-4">
        <div className="flex gap-2 max-w-4xl mx-auto">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={
              connectionState === 'connected' 
                ? "Type a message... (Enter to send, Shift+Enter for new line)"
                : "Connection required to send messages..."
            }
            disabled={connectionState !== 'connected'}
            className="flex-1 bg-gray-800 text-gray-100 rounded-lg px-4 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            rows={3}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || connectionState !== 'connected'}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatContainer;
