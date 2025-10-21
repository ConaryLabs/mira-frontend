// src/hooks/useMessageHandler.ts
// DUAL PROTOCOL: Supports both Operation Engine AND Regular Chat flows

import { useEffect } from 'react';
import { useWebSocketStore } from '../stores/useWebSocketStore';
import { useChatStore, type ChatMessage, type Artifact } from '../stores/useChatStore';
import { useAppState } from '../stores/useAppState';

export function useMessageHandler() {
  const subscribe = useWebSocketStore((state) => state.subscribe);
  const { 
    addMessage, 
    startStreaming, 
    appendStreamContent, 
    clearStreaming,
    setWaitingForResponse 
  } = useChatStore();
  
  let waitingTimeout: NodeJS.Timeout | null = null;

  useEffect(() => {
    const unsubscribe = subscribe(
      'chat-handler',
      (message) => {
        try {
          // Handle top-level operation events
          if (message.type.startsWith('operation.')) {
            handleOperationEvent(message, message.type);
            return;
          }
          
          // Handle data-wrapped events
          if (message.type === 'data') {
            const eventType = message.dataType || message.data?.type;
            
            if (eventType?.startsWith('operation.')) {
              // Operation Engine flow
              handleOperationEvent(message.data || message, eventType);
            } else if (eventType === 'status' || eventType === 'stream' || eventType === 'chat_complete') {
              // Regular chat flow
              handleRegularChatEvent(message.data || message, eventType);
            }
            return;
          }
          
          // Handle top-level regular chat events
          if (message.type === 'status' || message.type === 'stream' || message.type === 'chat_complete') {
            handleRegularChatEvent(message, message.type);
          }
        } catch (error) {
          console.error('[chat-handler] Error handling message:', error);
          setWaitingForResponse(false);
          if (waitingTimeout) clearTimeout(waitingTimeout);
        }
      },
      ['response', 'data', 'status', 'stream', 'chat_complete']
    );
    
    return () => {
      unsubscribe();
      if (waitingTimeout) clearTimeout(waitingTimeout);
    };
  }, [subscribe]);

  // ========== REGULAR CHAT FLOW ==========
  function handleRegularChatEvent(data: any, eventType: string) {
    console.log('[chat-handler] Regular chat event:', eventType);

    switch (eventType) {
      case 'status':
        if (data.status === 'thinking') {
          console.log('[chat-handler] Starting regular chat streaming');
          startStreaming();
          setWaitingForResponse(true);
          
          // Safety timeout
          if (waitingTimeout) clearTimeout(waitingTimeout);
          waitingTimeout = setTimeout(() => {
            console.warn('[chat-handler] TIMEOUT: No chunks received');
            setWaitingForResponse(false);
          }, 30000);
        }
        break;

      case 'stream':
        const delta = data.delta || data.content;
        if (delta) {
          console.log('[chat-handler] Stream chunk:', delta.length, 'chars');
          
          // Clear waiting on first chunk
          setWaitingForResponse(false);
          if (waitingTimeout) {
            clearTimeout(waitingTimeout);
            waitingTimeout = null;
          }
          
          appendStreamContent(delta);
        }
        break;

      case 'chat_complete':
        console.log('[chat-handler] Regular chat completed');
        setWaitingForResponse(false);
        if (waitingTimeout) {
          clearTimeout(waitingTimeout);
          waitingTimeout = null;
        }
        
        clearStreaming();
        
        // Add final message
        const content = data.content || data.result || '';
        const artifacts = data.artifacts || [];
        
        if (content || artifacts.length > 0) {
          const assistantMessage: ChatMessage = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content,
            timestamp: Date.now(),
            artifacts: artifacts.map((art: any) => ({
              id: art.id || `artifact-${Date.now()}-${Math.random().toString(36).slice(2)}`,
              path: art.path || 'untitled',
              content: art.content,
              language: art.language || inferLanguage(art.path || ''),
              changeType: art.kind
            }))
          };
          
          addMessage(assistantMessage);
          artifacts.forEach((art: any) => processArtifact(art));
        }
        break;
    }
  }

  // ========== OPERATION ENGINE FLOW ==========
  function handleOperationEvent(data: any, eventType: string) {
    console.log('[chat-handler] Operation event:', eventType);

    switch (eventType) {
      case 'operation.started':
        console.log('[chat-handler] Starting operation streaming');
        startStreaming();
        setWaitingForResponse(true);
        
        if (waitingTimeout) clearTimeout(waitingTimeout);
        waitingTimeout = setTimeout(() => {
          console.warn('[chat-handler] TIMEOUT: No chunks received');
          setWaitingForResponse(false);
        }, 30000);
        break;

      case 'operation.streaming':
        const content = data.content;
        if (content) {
          console.log('[chat-handler] Operation chunk:', content.length, 'chars');
          
          setWaitingForResponse(false);
          if (waitingTimeout) {
            clearTimeout(waitingTimeout);
            waitingTimeout = null;
          }
          
          appendStreamContent(content);
        }
        break;

      case 'operation.artifact_preview':
        console.log('[chat-handler] Artifact preview:', data.path);
        break;

      case 'operation.artifact_completed':
        const artifact = data.artifact;
        if (artifact) {
          console.log('[chat-handler] Artifact completed:', artifact.path);
          processArtifact(artifact);
        }
        break;

      case 'operation.completed':
        console.log('[chat-handler] Operation completed');
        setWaitingForResponse(false);
        if (waitingTimeout) {
          clearTimeout(waitingTimeout);
          waitingTimeout = null;
        }
        
        clearStreaming();
        
        const artifacts = data.artifacts || [];
        const result = data.result || '';
        
        if (result || artifacts.length > 0) {
          const assistantMessage: ChatMessage = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: result,
            timestamp: Date.now(),
            artifacts: artifacts.map((art: any) => ({
              id: art.id || `artifact-${Date.now()}-${Math.random().toString(36).slice(2)}`,
              path: art.path || 'untitled',
              content: art.content,
              language: art.language || inferLanguage(art.path || ''),
              changeType: art.kind
            }))
          };
          
          addMessage(assistantMessage);
          artifacts.forEach((art: any) => processArtifact(art));
        }
        break;

      case 'operation.failed':
        console.error('[chat-handler] Operation failed:', data.error);
        setWaitingForResponse(false);
        if (waitingTimeout) {
          clearTimeout(waitingTimeout);
          waitingTimeout = null;
        }
        
        clearStreaming();
        
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

  function processArtifact(art: any) {
    const { addArtifact, setShowArtifacts } = useAppState.getState();
    
    if (!art || !art.content) {
      console.warn('[chat-handler] Skipping invalid artifact:', art);
      return;
    }
    
    addArtifact({
      id: art.id || `artifact-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      path: art.path || 'untitled',
      content: art.content,
      language: art.language || inferLanguage(art.path || ''),
      changeType: art.kind
    });
    
    setShowArtifacts(true);
  }

  function inferLanguage(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase();
    const map: Record<string, string> = {
      rs: 'rust', js: 'javascript', jsx: 'javascript',
      ts: 'typescript', tsx: 'typescript', py: 'python',
      go: 'go', java: 'java', cpp: 'cpp', c: 'c',
      html: 'html', css: 'css', json: 'json',
      yaml: 'yaml', yml: 'yaml', md: 'markdown', 
      sql: 'sql', sh: 'shell', bash: 'shell', toml: 'toml'
    };
    return map[ext || ''] || 'plaintext';
  }
}
