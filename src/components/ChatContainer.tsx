// src/components/ChatContainer.tsx
import React, { useState, useRef, useEffect } from 'react';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAppState } from '../hooks/useAppState';
import { useMessageHandler } from '../hooks/useMessageHandler';
import { useChatMessaging } from '../hooks/useChatMessaging';
import type { Message } from '../types';

export const ChatContainer: React.FC = () => {
  // State management
  const [messages, setMessages] = useState<Message[]>([]);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Hooks for functionality
  const { currentProject } = useAppState();
  const { lastMessage, connectionState } = useWebSocket();
  const { handleIncomingMessage } = useMessageHandler(setMessages, setIsWaitingForResponse);
  const { handleSend, addSystemMessage } = useChatMessaging(setMessages, setIsWaitingForResponse);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isWaitingForResponse]);

  // Handle incoming WebSocket messages
  useEffect(() => {
    if (lastMessage) {
      handleIncomingMessage(lastMessage);
    }
  }, [lastMessage, handleIncomingMessage]);

  // Add system message when project changes
  useEffect(() => {
    if (currentProject) {
      addSystemMessage(`Now working in project: ${currentProject.name}`);
    }
  }, [currentProject?.id, addSystemMessage]);

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
