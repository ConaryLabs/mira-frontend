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

    // Enhanced message with full project and repository context
    const message = {
      type: 'chat',
      content,
      project_id: currentProject?.id || null,
      metadata: {
        session_id: getSessionId(),
        timestamp: Date.now(),
        // Enhanced project context
        project_name: currentProject?.name || null,
        has_repository: currentProject ? true : false,
        context_type: currentProject ? 'project' : 'general',
        // Repository context (you'll need to get this from your app state)
        repo_root: currentProject ? `./repos/${currentProject.id}` : null, // Approximate
        branch: 'main', // You'll need to get actual branch from git state
        // Add a context flag that tells Mira to look for attached repositories
        request_repo_context: currentProject ? true : false
      }
    };

    console.log('Sending enhanced message with project context:', {
      session: getSessionId(),
      project: currentProject?.name || 'none',
      hasRepo: currentProject ? 'yes' : 'no',
      message: JSON.stringify(message, null, 2)
    });

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

  // Add a helper to notify when project context changes
  const addProjectContextMessage = useCallback((projectName: string) => {
    addSystemMessage(`Now working in project: ${projectName}`);
  }, [addSystemMessage]);

  return { handleSend, addSystemMessage, addProjectContextMessage };
};
