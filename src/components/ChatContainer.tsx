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
  const { lastMessage, connectionState, send } = useWebSocket();
  const { handleIncomingMessage } = useMessageHandler(setMessages, setIsWaitingForResponse);
  const { handleSend, addSystemMessage } = useChatMessaging(setMessages, setIsWaitingForResponse);
  
  // Chat persistence
  const { handleMemoryData } = useChatPersistence(setMessages, connectionState);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isWaitingForResponse]);

  // Handle incoming WebSocket messages - CLEAN APPROACH
  useEffect(() => {
    if (!lastMessage) return;

    console.log('ChatContainer processing message:', lastMessage.type);

    // Handle memory data (no type field in data)
    if (lastMessage.type === 'data' && lastMessage.data && !lastMessage.data.type) {
      console.log('📨 Memory data received in ChatContainer:', lastMessage.data);
      handleMemoryData(lastMessage.data);
      setIsLoadingHistory(false);
      return;
    }

    // Handle chat responses
    if (lastMessage.type === 'response' && lastMessage.data && lastMessage.data.content) {
      console.log('💬 Chat response received in ChatContainer');
      handleIncomingMessage(lastMessage);
      return;
    }

    // Let global handler deal with everything else (project commands, etc.)
    console.log('Letting global handler process:', lastMessage.type);
  }, [lastMessage, handleIncomingMessage, handleMemoryData]);

  // Load chat history when connected
  useEffect(() => {
    if (connectionState === 'connected' && isLoadingHistory) {
      console.log('Loading chat history...');
      
      const loadHistory = async () => {
        try {
          await send({
            type: 'memory_command',
            method: 'memory.get_recent',
            params: {
              session_id: 'peter-eternal',
              count: 50
            }
          });
        } catch (error) {
          console.error('Failed to load history:', error);
          setIsLoadingHistory(false);
        }
      };
      
      loadHistory();
    }
  }, [connectionState, isLoadingHistory, send]);

  // Timeout for loading state
  useEffect(() => {
    if (connectionState === 'connected') {
      const timeout = setTimeout(() => {
        if (isLoadingHistory) {
          console.log('History load timeout - starting fresh');
          setIsLoadingHistory(false);
        }
      }, 3000);
      
      return () => clearTimeout(timeout);
    }
  }, [connectionState, isLoadingHistory]);

  return (
    <div className="h-full flex flex-col max-w-3xl mx-auto w-full">
      {/* Connection status */}
      {connectionState !== 'connected' && (
        <div className="bg-yellow-900/50 border-b border-yellow-700/50 px-4 py-2 text-sm text-yellow-200">
          {connectionState === 'connecting' ? 'Connecting...' : 'Disconnected'}
        </div>
      )}
      
      {/* Messages area - FIXED SCROLLING */}
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
