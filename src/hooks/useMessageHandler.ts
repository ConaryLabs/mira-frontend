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
        console.log('📝 Stream chunk text:', JSON.stringify(message.text));
        
        setMessages(prev => {
          const lastMsg = prev[prev.length - 1];
          
          // Check if we have an active streaming message
          if (lastMsg && lastMsg.role === 'assistant' && lastMsg.streaming) {
            // Append to existing streaming message
            console.log('📎 Appending to existing streaming message. Current content length:', lastMsg.content.length);
            const newContent = lastMsg.content + (message.text || '');
            console.log('📎 New content will be:', JSON.stringify(newContent));
            return [
              ...prev.slice(0, -1),
              { ...lastMsg, content: newContent }
            ];
          } else {
            // Create new streaming message
            console.log('✨ Creating new streaming message with text:', JSON.stringify(message.text));
            const newMessage: Message = {
              id: message.id || `msg-${Date.now()}`,
              role: 'assistant',
              content: message.text || '',
              streaming: true,
              timestamp: Date.now()
            };
            return [...prev, newMessage];
          }
        });
        
        // Ensure streaming state is active
        setIsStreaming(true);
        break;
        
      case 'stream_end':
        // Backend sends this to end the stream
        console.log('🏁 Stream ended');
        
        setMessages(prev => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg && lastMsg.streaming) {
            console.log('✅ Finalizing streaming message');
            return [
              ...prev.slice(0, -1),
              { ...lastMsg, streaming: false }
            ];
          } else {
            console.warn('⚠️ Stream end but no streaming message found');
          }
          return prev;
        });
        
        setIsStreaming(false);
        break;
        
      case 'complete':
        // Backend uses 'complete' for final message metadata
        console.log('🎯 Complete message received:', message);
        
        setMessages(prev => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg && lastMsg.role === 'assistant') {
            // Complete the existing assistant message (streaming or not)
            console.log('✅ Completing assistant message');
            return [
              ...prev.slice(0, -1),
              { 
                ...lastMsg, 
                streaming: false,
                // Optionally add metadata from complete message
                metadata: {
                  mood: message.mood,
                  salience: message.salience,
                  tags: message.tags
                }
              }
            ];
          } else {
            // No assistant message to complete - this is the warning case
            console.warn('⚠️ Received complete without assistant message:', message);
          }
          return prev;
        });
        
        setIsStreaming(false);
        break;
        
      case 'connection_ready':
        // Backend connection ready
        console.log('🔗 Backend ready:', message);
        break;
        
      case 'status':
        // System status messages - parse if it's JSON heartbeat
        console.log('📊 Status:', message.message);
        
        // Don't show heartbeat messages in chat
        if (message.message && typeof message.message === 'string') {
          try {
            const parsed = JSON.parse(message.message);
            if (parsed.type === 'heartbeat') {
              // Ignore heartbeat - don't add to messages
              console.log('💓 Heartbeat filtered out');
              return;
            }
          } catch {
            // Not JSON, treat as regular status
          }
          
          // Filter out initial connection messages too
          if (message.message.includes('Connected to Mira') || 
              message.message.includes('Model:') ||
              message.message.includes('Tools:')) {
            console.log('🔇 Connection status filtered out');
            return;
          }
          
          // Add non-heartbeat status messages to chat
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
        console.error('❌ Backend error:', message.message || message.error || 'Unknown error');
        
        // Add error to chat
        setMessages(prev => [...prev, {
          id: `error-${Date.now()}`,
          role: 'system',
          content: `Error: ${message.message || message.error || 'Unknown error'}`,
          timestamp: Date.now()
        }]);
        
        setIsStreaming(false);
        break;
        
      case 'heartbeat':
        // Ignore standalone heartbeat messages
        break;
        
      default:
        console.log('❓ Unhandled message type:', message.type, message);
        break;
    }
  }, [setMessages, setIsStreaming]);

  const handleDataResponse = useCallback((data: any) => {
    switch (data.type) {
      case 'project_list':
        // Update project list in state
        console.log('📁 Projects loaded:', data.projects);
        break;
        
      case 'git_status':
        // Update git status
        console.log('🔄 Git status:', data);
        break;
        
      case 'repository_imported':
        // Show success message
        setMessages(prev => [...prev, {
          id: `sys-${Date.now()}`,
          role: 'system',
          content: `Repository imported successfully: ${data.name || 'Unknown'}`,
          timestamp: Date.now()
        }]);
        break;
        
      default:
        console.log('❓ Unhandled data type:', data.type, data);
        break;
    }
  }, [setMessages]);

  return { handleIncomingMessage };
};
