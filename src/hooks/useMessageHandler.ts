// src/hooks/useMessageHandler.ts
// FIXED: Properly handle operation events and artifacts from backend
// Flow: operation.started → streaming → artifact_preview → artifact_completed → completed

import { useEffect } from 'react';
import { useWebSocketStore } from '../stores/useWebSocketStore';
import { useChatStore, type ChatMessage, type Artifact } from '../stores/useChatStore';
import { useAppState } from '../stores/useAppState';

export function useMessageHandler() {
  const subscribe = useWebSocketStore((state) => state.subscribe);
  const addMessage = useChatStore((state) => state.addMessage);
  const startStreaming = useChatStore((state) => state.startStreaming);
  const appendStreamContent = useChatStore((state) => state.appendStreamContent);
  const endStreaming = useChatStore((state) => state.endStreaming);
  const setWaitingForResponse = useChatStore((state) => state.setWaitingForResponse);

  useEffect(() => {
    const unsubscribe = subscribe(
      'chat-handler',
      (message) => {
        // Check message type - operation events come as top-level types
        if (message.type.startsWith('operation.')) {
          handleOperationEvent(message, message.type);
        } else if (message.type === 'response') {
          handleLegacyResponse(message);
        } else if (message.type === 'data') {
          // Could also have operation events wrapped in data envelope
          const eventType = message.dataType || message.data?.type;
          
          if (eventType?.startsWith('operation.')) {
            handleOperationEvent(message, eventType);
          } else {
            handleDataMessage(message);
          }
        }
      },
      [
        'response', 
        'data',
        'operation.started',
        'operation.streaming',
        'operation.delegated',
        'operation.artifact_preview',
        'operation.artifact_completed',
        'operation.completed',
        'operation.failed'
      ]
    );
    
    return unsubscribe;
  }, [subscribe]);

  // Handle new operation engine events
  function handleOperationEvent(message: any, eventType: string) {
    // Extract data - could be at message.data or message top-level
    const data = message.data || message;
    
    console.log('[chat-handler] Operation event:', eventType, 'operation_id:', data.operation_id);

    switch (eventType) {
      case 'operation.started':
        // Operation started - begin streaming mode
        console.log('[chat-handler] Starting streaming');
        startStreaming();
        setWaitingForResponse(true);
        break;

      case 'operation.streaming':
        // GPT-5 text streaming chunk
        const content = data.content;
        if (content) {
          appendStreamContent(content);
        }
        break;

      case 'operation.delegated':
        // Delegated to DeepSeek - could show status indicator
        console.log('[chat-handler] Delegated to:', data.delegated_to, data.reason);
        break;

      case 'operation.artifact_preview':
        // Artifact preview available (truncated)
        console.log('[chat-handler] Artifact preview:', data.path, `(${data.preview?.length || 0} chars)`);
        // Optional: Could show loading indicator with filename
        break;

      case 'operation.artifact_completed':
        // Full artifact completed - add it immediately to the artifact panel
        const artifact = data.artifact;
        if (artifact) {
          console.log('[chat-handler] Artifact completed:', artifact.path);
          processArtifact(artifact);
        }
        break;

      case 'operation.completed':
        // Operation fully completed - finalize message with all artifacts
        console.log('[chat-handler] Operation completed');
        endStreaming();
        setWaitingForResponse(false);
        
        // Get all artifacts from the completed event
        const allArtifacts = data.artifacts || [];
        const result = data.result || '';
        
        console.log('[chat-handler] Finalizing with', allArtifacts.length, 'artifact(s)');
        
        // Only create message if there's content or artifacts
        if (result || allArtifacts.length > 0) {
          const assistantMessage: ChatMessage = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: result,
            timestamp: Date.now(),
            artifacts: allArtifacts.map((art: any) => ({
              id: art.id || `artifact-${Date.now()}-${Math.random().toString(36).slice(2)}`,
              path: art.path || 'untitled',
              content: art.content,
              language: art.language || inferLanguage(art.path || ''),
              changeType: art.kind
            }))
          };
          
          addMessage(assistantMessage);
        }
        break;

      case 'operation.failed':
        // Operation failed
        console.error('[chat-handler] Operation failed:', data.error);
        endStreaming();
        setWaitingForResponse(false);
        
        const errorMessage: ChatMessage = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: `Error: ${data.error || 'Unknown error'}`,
          timestamp: Date.now()
        };
        addMessage(errorMessage);
        break;

      default:
        console.log('[chat-handler] Unhandled operation event:', eventType);
    }
  }

  // Process a single artifact - add to artifact panel immediately
  function processArtifact(artifact: any) {
    if (!artifact || !artifact.content) {
      console.warn('[chat-handler] Skipping invalid artifact:', artifact);
      return;
    }

    const { addArtifact, setShowArtifacts } = useAppState.getState();
    
    // Backend sends: { id, path, content, language, kind }
    const path = artifact.path || artifact.title || 'untitled';
    const language = artifact.language || inferLanguage(path);
    
    const cleanArtifact: Artifact = {
      id: artifact.id || `artifact-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      path,
      content: artifact.content,
      language,
      changeType: artifact.kind, // Backend sends 'kind', we store as 'changeType'
      timestamp: Date.now()
    };
    
    console.log('[chat-handler] Adding artifact to panel:', cleanArtifact.path, `(${cleanArtifact.content.length} chars)`);
    addArtifact(cleanArtifact);
    
    // Open artifact panel automatically
    setShowArtifacts(true);
  }

  // Handle legacy response format (for backwards compatibility)
  function handleLegacyResponse(message: any) {
    console.log('[chat-handler] Legacy response:', message);
    
    if (message.streaming) {
      if (message.chunk) {
        appendStreamContent(message.chunk);
      }
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
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content,
        timestamp: Date.now(),
        artifacts: artifacts.map((art: any) => ({
          id: art.id || `artifact-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          path: art.path || art.file_path || art.title || 'untitled',
          content: art.content,
          language: art.language || inferLanguage(art.path || art.file_path || ''),
          changeType: art.kind || art.changeType
        }))
      };
      
      addMessage(assistantMessage);
      
      if (artifacts.length > 0) {
        // Add all artifacts to the panel
        artifacts.forEach((art: any) => processArtifact(art));
      }
    }
    
    setWaitingForResponse(false);
  }

  // Handle other data messages (documents, projects, etc)
  function handleDataMessage(message: any) {
    const dataType = message.dataType || message.data?.type;
    
    // These are handled by other hooks, just log for debugging
    console.log('[chat-handler] Data message:', dataType);
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
}
