// src/hooks/useChatMessaging.ts
import { useCallback } from 'react';
import { useWebSocket } from './useWebSocket';
import { useAppState } from './useAppState';
import type { Message } from '../types';

const ETERNAL_SESSION_ID = 'peter-eternal'; // Match backend default

export const useChatMessaging = (
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  setIsWaitingForResponse: React.Dispatch<React.SetStateAction<boolean>>
) => {
  const { send } = useWebSocket();
  const { currentProject } = useAppState();

  // Use the eternal session ID that matches backend
  const getSessionId = useCallback(() => {
    return ETERNAL_SESSION_ID;
  }, []);

  const handleSend = useCallback(async (content: string) => {
    // Add user message immediately
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsWaitingForResponse(true);

    // Send message - the backend already uses peter-eternal as default
    const message = {
      type: 'chat',
      content,
      project_id: currentProject?.id || null,
      metadata: {
        session_id: getSessionId(), // This should be peter-eternal
        timestamp: Date.now(),
      }
    };

    console.log('Sending message with session:', getSessionId(), JSON.stringify(message));

    try {
      await send(message);
    } catch (error) {
      console.error('Send failed:', error);
      setIsWaitingForResponse(false);
    }
  }, [send, currentProject, setMessages, setIsWaitingForResponse, getSessionId]);

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
