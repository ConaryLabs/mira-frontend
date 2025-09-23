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
  const { getSessionId, handleMemoryData } = useChatPersistence(setMessages, connectionState);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isWaitingForResponse]);

  // Handle incoming WebSocket messages
  useEffect(() => {
    if (!lastMessage) return;

    try {
      // Check if it's memory data first (could be in response or data format)
      if (lastMessage.type === 'data' && lastMessage.data) {
        handleMemoryData(lastMessage.data);
        setIsLoadingHistory(false);
      } else if (lastMessage.type === 'response' && lastMessage.data) {
        // Memory commands might come back as response type
        const responseData = lastMessage.data;
        if (responseData.memories || responseData.stats || responseData.session_id) {
          console.log('Handling memory data from response:', responseData);
          handleMemoryData(responseData);
          setIsLoadingHistory(false);
        }
      }
      
      // Then handle as regular chat message
      handleIncomingMessage(lastMessage);
    } catch (error) {
      console.error('Error handling message:', error, lastMessage);
      setIsLoadingHistory(false); // Stop loading on error
    }
  }, [lastMessage, handleIncomingMessage, handleMemoryData]);

  // Stop showing loading state when connected (in case no history)
  useEffect(() => {
    if (connectionState === 'connected') {
      // Give it a moment to load history, then assume no history exists
      const timeout = setTimeout(() => {
        if (isLoadingHistory) {
          console.log('No history loaded after timeout - assuming empty conversation');
          setIsLoadingHistory(false);
        }
      }, 3000); // Increased timeout
      
      return () => clearTimeout(timeout);
    }
  }, [connectionState, isLoadingHistory]);

  // Add system message when project changes (but only after history loads)
  useEffect(() => {
    if (currentProject && !isLoadingHistory) {
      addSystemMessage(`Now working in project: ${currentProject.name}`);
    }
  }, [currentProject?.id, addSystemMessage, isLoadingHistory]);

  // Show loading state while fetching history
  if (isLoadingHistory && connectionState === 'connected') {
    return (
      <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full bg-slate-900">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
            <div className="text-slate-400 text-sm">Loading conversation...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full bg-slate-900">
      {/* Connection status */}
      {connectionState !== 'connected' && (
        <div className="bg-yellow-900/50 border-b border-yellow-700/50 px-4 py-2 text-sm text-yellow-200">
          {connectionState === 'connecting' ? 'Connecting...' : 'Disconnected'}
        </div>
      )}
      
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 bg-slate-900">
        <MessageList messages={messages} isWaitingForResponse={isWaitingForResponse} />
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input area */}
      <div className="border-t border-slate-700 px-4 py-4 bg-slate-900">
        <ChatInput 
          onSend={handleSend} 
          disabled={connectionState !== 'connected' || isWaitingForResponse}
          placeholder={
            currentProject 
              ? `Message Mira about ${currentProject.name}...`
              : "Message Mira..."
          }
        />
      </div>
    </div>
  );
};
