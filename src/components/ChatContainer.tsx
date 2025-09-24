// src/components/ChatContainer.tsx

import React, { useState, useRef, useEffect } from 'react';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAppState } from '../hooks/useAppState';
import { useMessageHandler } from '../hooks/useMessageHandler';
import { useChatMessaging } from '../hooks/useChatMessaging';
import { useChatPersistence } from '../hooks/useChatPersistence';
import type { Message } from '../types';

export const ChatContainer: React.FC = () => {
  // State management
  const [messages, setMessages] = useState<Message[]>([]);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Hooks for functionality
  const { currentProject } = useAppState();
  const { lastMessage, connectionState } = useWebSocket();
  const { handleIncomingMessage } = useMessageHandler(setMessages, setIsWaitingForResponse);
  const { handleSend, addSystemMessage } = useChatMessaging(setMessages, setIsWaitingForResponse);
  
  // Chat persistence
  const { handleMemoryData } = useChatPersistence(setMessages, connectionState);

  // Scroll to bottom function
  const scrollToBottom = (immediate = false) => {
    if (!messagesEndRef.current) return;
    
    if (immediate) {
      messagesEndRef.current.scrollIntoView({ behavior: 'instant' });
    } else {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    // Use setTimeout to ensure DOM has updated
    const scrollTimeout = setTimeout(() => {
      scrollToBottom();
    }, 100);
    
    return () => clearTimeout(scrollTimeout);
  }, [messages, isWaitingForResponse]);

  // Immediate scroll to bottom when loading completes (page reload)
  useEffect(() => {
    if (messages.length > 0 && isLoadingHistory) {
      console.log('Messages loaded, stopping loading state');
      setIsLoadingHistory(false);
      
      // Immediate scroll to bottom for initial load
      setTimeout(() => {
        scrollToBottom(true);
      }, 200);
    }
  }, [messages.length, isLoadingHistory]);

  // Handle incoming WebSocket messages
  useEffect(() => {
    if (!lastMessage) return;

    console.log('ChatContainer processing message:', lastMessage.type);

    // Handle memory data (no type field in data)
    if (lastMessage.type === 'data' && lastMessage.data && !lastMessage.data.type) {
      console.log('Memory data received in ChatContainer:', lastMessage.data);
      handleMemoryData(lastMessage.data);
      return;
    }

    // Handle chat responses
    if (lastMessage.type === 'response' && lastMessage.data && lastMessage.data.content) {
      console.log('Chat response received in ChatContainer');
      handleIncomingMessage(lastMessage);
      return;
    }

    // Let global handler deal with everything else (project commands, etc.)
    console.log('Letting global handler process:', lastMessage.type);
  }, [lastMessage, handleIncomingMessage, handleMemoryData]);

  // Timeout for loading state - don't wait forever
  useEffect(() => {
    if (connectionState === 'connected' && isLoadingHistory) {
      const timeout = setTimeout(() => {
        console.log('History load timeout - starting fresh');
        setIsLoadingHistory(false);
      }, 5000); // 5 second timeout
      
      return () => clearTimeout(timeout);
    }
  }, [connectionState, isLoadingHistory]);

  // Reset loading state when connection changes
  useEffect(() => {
    if (connectionState === 'connected') {
      setIsLoadingHistory(true);
    } else if (connectionState === 'disconnected') {
      setIsLoadingHistory(false);
    }
  }, [connectionState]);

  return (
    <div className="h-full flex flex-col max-w-3xl mx-auto w-full">
      {/* Connection status */}
      {connectionState !== 'connected' && (
        <div className="bg-yellow-900/50 border-b border-yellow-700/50 px-4 py-2 text-sm text-yellow-200">
          {connectionState === 'connecting' ? 'Connecting...' : 'Disconnected'}
        </div>
      )}
      
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {isLoadingHistory ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex items-center gap-2 text-slate-400">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-400"></div>
              Loading chat history...
            </div>
          </div>
        ) : (
          <>
            {/* Show message count for debugging */}
            {messages.length > 0 && (
              <div className="text-xs text-gray-500 text-center mb-4 opacity-75">
                {messages.length} messages loaded
              </div>
            )}
            
            <MessageList 
              messages={messages} 
              isWaitingForResponse={isWaitingForResponse}
            />
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
      
      {/* Input area */}
      <div className="border-t border-slate-700 p-4">
        <ChatInput 
          onSend={handleSend} 
          disabled={isWaitingForResponse || connectionState !== 'connected'}
          placeholder={
            connectionState !== 'connected' 
              ? 'Connecting...' 
              : currentProject 
                ? `Message Mira (${currentProject.name})...`
                : 'Message Mira...'
          }
        />
      </div>
    </div>
  );
};
