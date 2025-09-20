// src/hooks/useMessageHandler.ts
import { useCallback } from 'react';
import type { Message } from '../types';

export const useMessageHandler = (
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  setIsStreaming: React.Dispatch<React.SetStateAction<boolean>>
) => {
  
  const handleIncomingMessage = useCallback((message: any) => {
    // Guard against undefined messages
    if (!message || typeof message !== 'object') {
      console.warn('Received invalid message:', message);
      return;
    }

    // Debug: log all incoming messages to understand the flow
    console.log('📨 Incoming message:', message.type, message);

    // Handle different message types from backend
    switch (message.type) {
      case 'stream_chunk':
        // Backend uses 'stream_chunk' with 'text' field (not 'content')
        console.log('📝 Stream chunk text:', message.text);
        setMessages(prev => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg && lastMsg.role === 'assistant' && lastMsg.streaming) {
            return [
              ...prev.slice(0, -1),
              { ...lastMsg, content: lastMsg.content + (message.text || '') }
            ];
          } else {
            return [...prev, {
              id: message.id || `msg-${Date.now()}`,
              role: 'assistant',
              content: message.text || '',
              streaming: true,
              timestamp: Date.now()
            }];
          }
        });
        break;
        
      case 'stream_end':
        // Backend sends this to end the stream
        console.log('🏁 Stream ended');
        setMessages(prev => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg && lastMsg.streaming) {
            return [
              ...prev.slice(0, -1),
              { ...lastMsg, streaming: false }
            ];
          }
          return prev;
        });
        setIsStreaming(false);
        break;
        
      case 'complete':
        // Backend uses 'complete' for final message metadata
        setMessages(prev => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg && lastMsg.streaming) {
            // Complete the existing streaming message
            return [
              ...prev.slice(0, -1),
              { 
                ...lastMsg, 
                streaming: false
              }
            ];
          } else {
            // If there's no streaming message, don't add a placeholder
            console.log('Received complete without streaming message:', message);
          }
          return prev;
        });
        setIsStreaming(false);
        break;
        
      case 'connection_ready':
        // Backend connection ready
        console.log('Backend ready:', message);
        break;
        
      case 'status':
        // System status messages
        if (message.message && typeof message.message === 'string') {
          setMessages(prev => [...prev, {
            id: `status-${Date.now()}`,
            role: 'system',
            content: message.message,
            timestamp: Date.now()
          }]);
        }
        break;
        
      case 'data':
        // Handle data responses (project lists, git status, etc.)
        if (message.data) {
          handleDataResponse(message.data);
        }
        break;
        
      case 'error':
        // Handle backend errors
        console.error('Backend error:', message.message || message.error || 'Unknown error');
        setIsStreaming(false);
        break;
        
      case 'heartbeat':
        // Ignore heartbeat messages
        break;
        
      default:
        console.log('Unhandled message type:', message.type, message);
        break;
    }
  }, [setMessages, setIsStreaming]);

  const handleDataResponse = useCallback((data: any) => {
    switch (data.type) {
      case 'project_list':
        // Update project list in state
        console.log('Projects loaded:', data.projects);
        break;
        
      case 'git_status':
        // Update git status
        console.log('Git status:', data);
        break;
        
      case 'repository_imported':
        // Show success message
        setMessages(prev => [...prev, {
          id: `sys-${Date.now()}`,
          role: 'system',
          content: `Repository imported successfully! Analyzed ${data.files_analyzed} files.`,
          timestamp: Date.now()
        }]);
        break;
        
      case 'search_results':
        // Display search results as tool result
        setMessages(prev => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg && lastMsg.role === 'assistant') {
            return [
              ...prev.slice(0, -1),
              {
                ...lastMsg,
                toolResults: [...(lastMsg.toolResults || []), {
                  id: `search-${Date.now()}`,
                  type: 'code_search',
                  status: 'success',
                  data: data.results,
                  timestamp: Date.now()
                }]
              }
            ];
          }
          return prev;
        });
        break;
    }
  }, [setMessages]);

  return { handleIncomingMessage };
};
