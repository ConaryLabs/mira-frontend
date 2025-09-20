// src/hooks/useChatMessaging.ts
import { useCallback } from 'react';
import { useWebSocket } from './useWebSocket';
import { useAppState } from './useAppState';
import type { Message } from '../types';

export const useChatMessaging = (
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  setIsStreaming: React.Dispatch<React.SetStateAction<boolean>>
) => {
  const { send } = useWebSocket();
  const { currentProject } = useAppState();

  const handleSend = useCallback(async (content: string) => {
    // Add user message immediately
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsStreaming(true);

    // Send message in EXACT format backend expects (no extra fields!)
    const message = {
      type: 'chat',
      content,
      project_id: currentProject?.id || null,
      metadata: null
    };

    console.log('🚀 Sending message:', JSON.stringify(message));

    try {
      await send(message);
    } catch (error) {
      console.error('Send failed:', error);
      setIsStreaming(false);
    }
  }, [send, currentProject, setMessages, setIsStreaming]);

  const addSystemMessage = useCallback((content: string) => {
    setMessages(prev => [...prev, {
      id: `sys-${Date.now()}`,
      role: 'system',
      content,
      timestamp: Date.now()
    }]);
  }, [setMessages]);

  return { handleSend, addSystemMessage };
};
