// src/hooks/useMessageHandler.ts
// FIXED: Removed duplicate file_content handling (now only in useWebSocketMessageHandler)

import { useEffect } from 'react';
import { useWebSocketStore } from '../stores/useWebSocketStore';
import { useChatStore } from '../stores/useChatStore';
import { useAppState } from '../stores/useAppState';

export const useMessageHandler = () => {
  const subscribe = useWebSocketStore(state => state.subscribe);
  const { 
    addMessage, 
    startStreaming,
    appendStreamContent,
    endStreaming
  } = useChatStore();

  useEffect(() => {
    const unsubscribe = subscribe('chat-handler', (message) => {
      // Only handle 'response' type messages (chat responses from Claude)
      if (message.type === 'response') {
        handleChatResponse(message);
      }
    });

    return unsubscribe;
  }, [subscribe, addMessage, startStreaming, appendStreamContent, endStreaming]);

  function handleChatResponse(message: any) {
    console.log('[Handler] Chat response received');
    
    // Handle streaming content
    if (message.streaming) {
      if (message.content) {
        appendStreamContent(message.content);
      }
      return;
    }
    
    // Handle complete message
    if (message.complete) {
      endStreaming();
      return;
    }
    
    // Handle regular (non-streaming) response
    const assistantMessage = {
      id: `assistant-${Date.now()}`,
      role: 'assistant' as const,
      content: message.content || message.message || '',
      timestamp: Date.now(),
      thinking: message.thinking,
      artifacts: message.artifacts || []
    };
    
    addMessage(assistantMessage);
    
    // Handle artifacts if present
    if (message.artifacts && message.artifacts.length > 0) {
      console.log('[Handler] Response includes artifacts:', message.artifacts.length);
    }
    
    // Handle data messages that contain artifacts
    handleDataMessage(message.data);
  }
  
  function handleDataMessage(data: any) {
    if (!data) return;
    
    // REMOVED: file_content handling - now only in useWebSocketMessageHandler
    // This prevents duplicate artifact creation
    
    // Only handle artifact objects directly attached to chat responses
    if (data.artifact) {
      const { addArtifact, setShowArtifacts } = useAppState.getState();
      addArtifact(data.artifact);
      setShowArtifacts(true);
    }
  }
}
