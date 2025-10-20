// src/hooks/useMessageHandler.ts
// Updated to handle operation events from backend streaming

import { useEffect } from 'react';
import { useWebSocketStore } from '../stores/useWebSocketStore';
import { useChatStore, Artifact } from '../stores/useChatStore';
import { useAppState } from '../stores/useAppState';

export const useMessageHandler = () => {
  const subscribe = useWebSocketStore(state => state.subscribe);
  const { 
    addMessage, 
    startStreaming, 
    appendStreamContent, 
    endStreaming,
    setWaitingForResponse 
  } = useChatStore();

  useEffect(() => {
    // Subscribe to data and response messages
    const unsubscribe = subscribe(
      'chat-handler',
      (message) => {
        console.log('[chat-handler] Message received:', {
          type: message.type,
          dataType: message.dataType,
          hasData: !!message.data,
          keys: Object.keys(message)
        });

        if (message.type === 'response') {
          handleLegacyResponse(message);
        } else if (message.type === 'data') {
          // Check if this is an operation event wrapped in data envelope
          const eventType = message.dataType || message.data?.type;
          
          if (eventType?.startsWith('operation.')) {
            handleOperationEvent(message, eventType);
          } else {
            handleDataMessage(message);
          }
        }
      },
      ['response', 'data']
    );
    
    return unsubscribe;
  }, [subscribe, addMessage, startStreaming, appendStreamContent, endStreaming, setWaitingForResponse]);

  // Handle new operation engine events (wrapped in data envelope)
  function handleOperationEvent(message: any, eventType: string) {
    console.log('[chat-handler] Operation event:', eventType);
    
    // Data might be at top level or nested in message.data
    const data = message.data || message;

    switch (eventType) {
      case 'operation.started':
        // Operation started - begin streaming mode
        startStreaming();
        break;

      case 'operation.streaming':
        // GPT-5 text streaming chunk
        const content = data.content || message.content;
        if (content) {
          appendStreamContent(content);
        }
        break;

      case 'operation.delegated':
        // Delegated to DeepSeek - could show status indicator
        console.log('[chat-handler] Delegated to:', data.delegated_to || message.delegated_to, 
                    data.reason || message.reason);
        break;

      case 'operation.artifact_preview':
        // Artifact preview available (optional - could show loading state)
        console.log('[chat-handler] Artifact preview:', data.path || message.path);
        break;

      case 'operation.artifact_completed':
        // DeepSeek artifact completed - add it immediately
        const artifact = data.artifact || message.artifact;
        if (artifact) {
          console.log('[chat-handler] Artifact completed:', artifact.path);
          processArtifacts([artifact]);
        }
        break;

      case 'operation.completed':
        // Operation fully completed
        endStreaming();
        setWaitingForResponse(false);
        console.log('[chat-handler] Operation completed');
        break;

      case 'operation.failed':
        // Operation failed
        endStreaming();
        setWaitingForResponse(false);
        const error = data.error || message.error;
        console.error('[chat-handler] Operation failed:', error);
        
        // Add error message to chat
        addMessage({
          id: `error-${Date.now()}`,
          role: 'assistant' as const,
          content: `⚠️ Operation failed: ${error}`,
          timestamp: Date.now()
        });
        break;

      case 'operation.status_changed':
        // Status changed (e.g., "generating" -> "delegating")
        console.log('[chat-handler] Status:', 
                    data.old_status || message.old_status, '->', 
                    data.new_status || message.new_status);
        break;
    }
  }

  // Handle legacy data messages (for backwards compatibility)
  function handleDataMessage(message: any) {
    const data = message.data;
    if (!data) return;

    const dataType = data.type;
    console.log('[chat-handler] Data message:', dataType);

    if (dataType === 'stream_delta') {
      // Legacy streaming text chunk
      if (data.content) {
        appendStreamContent(data.content);
      }
    } else if (dataType === 'stream_done') {
      // Legacy stream complete
      endStreaming();
      setWaitingForResponse(false);
    } else if (dataType === 'artifact_created' || dataType === 'tool_result') {
      // Legacy artifact notification
      const artifact = data.artifact;
      if (artifact) {
        processArtifacts([artifact]);
      }
    }
  }

  // Handle legacy response messages (for backwards compatibility)
  function handleLegacyResponse(message: any) {
    console.log('[chat-handler] Legacy response received');
    
    // Legacy streaming support
    if (message.streaming) {
      if (message.content) appendStreamContent(message.content);
      return;
    }
    
    if (message.complete) {
      endStreaming();
      setWaitingForResponse(false);
      return;
    }
    
    // Full response with content
    const content = message.data?.content || message.content || message.message || '';
    const artifacts = message.data?.artifacts || message.artifacts || [];
    
    if (content || artifacts.length > 0) {
      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant' as const,
        content,
        timestamp: Date.now(),
        thinking: message.thinking,
        artifacts
      };
      
      addMessage(assistantMessage);
      
      if (artifacts.length > 0) {
        processArtifacts(artifacts);
      }
    }
    
    setWaitingForResponse(false);
  }
  
  // Process and add artifacts to the artifact panel
  function processArtifacts(artifacts: any[]) {
    const { addArtifact, setShowArtifacts } = useAppState.getState();
    
    console.log('[chat-handler] Processing', artifacts.length, 'artifact(s)');
    
    artifacts.forEach((artifact: any) => {
      if (!artifact || !artifact.content) {
        console.warn('[chat-handler] Skipping invalid artifact:', artifact);
        return;
      }
      
      const path = artifact.path || artifact.file_path || artifact.title || 'untitled';
      const language = artifact.language || inferLanguage(path);
      
      const cleanArtifact: Artifact = {
        id: artifact.id || `artifact-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        path,
        content: artifact.content,
        language,
        changeType: artifact.change_type,
      };
      
      console.log('[chat-handler] Adding artifact:', cleanArtifact.path);
      addArtifact(cleanArtifact);
    });
    
    setShowArtifacts(true);
  }
  
  // Infer programming language from file path
  function inferLanguage(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      rs: 'rust', 
      js: 'javascript', 
      jsx: 'javascript',
      ts: 'typescript', 
      tsx: 'typescript', 
      py: 'python',
      go: 'go', 
      java: 'java', 
      cpp: 'cpp', 
      c: 'c',
      html: 'html', 
      css: 'css', 
      json: 'json',
      yaml: 'yaml', 
      yml: 'yaml', 
      toml: 'toml',
      md: 'markdown', 
      sql: 'sql', 
      sh: 'shell', 
      bash: 'shell'
    };
    return languageMap[ext || ''] || 'plaintext';
  }
};
