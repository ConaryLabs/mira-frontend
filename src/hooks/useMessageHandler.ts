// src/hooks/useMessageHandler.ts
// PERFORMANCE FIX: Filtered subscription for 'response' messages only

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
    // PERFORMANCE FIX: Only subscribe to 'response' type messages
    const unsubscribe = subscribe(
      'chat-handler',
      (message) => {
        // Only handle 'response' type messages (chat responses from Claude)
        if (message.type === 'response') {
          handleChatResponse(message);
        }
      },
      ['response'] // Filter: only receive response messages
    );

    return unsubscribe;
  }, [subscribe, addMessage, startStreaming, appendStreamContent, endStreaming]);

  function handleChatResponse(message: any) {
    console.log('[Handler] Chat response received:', message);
    
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
    
    // FIXED: Read content from message.data.content (backend structure)
    const content = message.data?.content || message.content || message.message || '';
    const artifacts = message.data?.artifacts || message.artifacts || [];
    
    // Handle regular (non-streaming) response
    const assistantMessage = {
      id: `assistant-${Date.now()}`,
      role: 'assistant' as const,
      content,
      timestamp: Date.now(),
      thinking: message.thinking,
      artifacts
    };
    
    console.log('[Handler] Adding message with content length:', content.length);
    addMessage(assistantMessage);
    
    // Handle artifacts if present
    if (artifacts.length > 0) {
      console.log('[Handler] Response includes artifacts:', artifacts.length);
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
