// src/hooks/useMessageHandler.ts
// HARDENED: Always clears waiting flag, handles stream lifecycle

import { useEffect } from 'react';
import { useWebSocketStore } from '../stores/useWebSocketStore';
import { useChatStore, Artifact } from '../stores/useChatStore';
import { useAppState } from '../stores/useAppState';

export const useMessageHandler = () => {
  const subscribe = useWebSocketStore(state => state.subscribe);
  const { 
    addMessage, 
    addMessageWithDedup,
    startStreaming, 
    appendStreamContent, 
    endStreaming,
    setWaitingForResponse 
  } = useChatStore();

  // Main response handler
  useEffect(() => {
    const unsubscribe = subscribe(
      'chat-handler',
      (message) => {
        if (message.type === 'response') {
          handleChatResponse(message);
        } else if (message.type === 'data') {
          handleDataMessage(message);
        }
      },
      ['response', 'data']
    );
    return unsubscribe;
  }, [subscribe]);

  // Error handler - always clears waiting flag
  useEffect(() => {
    const unsubscribe = subscribe(
      'error-handler',
      (message) => {
        if (message.type === 'error') {
          console.error('[Handler] Error:', message.message);
          setWaitingForResponse(false); // CRITICAL: Clear flag on errors
          
          // TODO: Show toast notification when available
          // addToast({ type: 'error', message: message.message });
        }
      },
      ['error']
    );
    return unsubscribe;
  }, [subscribe, setWaitingForResponse]);

  function handleDataMessage(message: any) {
    const dataType = message.data?.type;
    const messageId = message.data?.message_id;
    
    // Check for duplicate using backend's message_id
    if (messageId) {
      const { processedMessageIds } = useChatStore.getState();
      if (processedMessageIds.has(messageId)) {
        console.warn('[Handler] Duplicate data message ignored:', messageId);
        return;
      }
      // Mark as processed for non-delta events
      if (dataType !== 'stream_delta' && dataType !== 'reasoning_delta') {
        useChatStore.setState(state => ({
          processedMessageIds: new Set(state.processedMessageIds).add(messageId)
        }));
      }
    }
    
    if (dataType === 'stream_delta') {
      // Streaming text chunk
      const content = message.data?.content;
      if (content) {
        appendStreamContent(content);
      }
    } else if (dataType === 'stream_done') {
      // Stream complete - ALWAYS clear waiting flag
      console.log('[Handler] Stream complete');
      endStreaming();
      setWaitingForResponse(false); // Explicit clear
    } else if (dataType === 'artifact_created' || dataType === 'tool_result') {
      // Artifact or tool result notification
      const artifact = message.data?.artifact;
      if (artifact) {
        console.log('[Handler] Artifact created:', artifact.path);
        processArtifacts([artifact]);
        return;
      }

      // If it's a tool_result, try to extract artifacts from common fields
      const maybeArtifacts = extractArtifactsFromToolEnvelope(message.data);
      if (maybeArtifacts.length) {
        processArtifacts(maybeArtifacts);
      }
    }
  }

  function handleChatResponse(message: any) {
    console.log('[Handler] Chat response received:', message);
    
    // Legacy streaming support (if backend sends this)
    if (message.streaming) {
      if (message.content) appendStreamContent(message.content);
      return;
    }
    
    // Legacy complete flag (if backend sends this)
    if (message.complete) {
      endStreaming();
      setWaitingForResponse(false); // Explicit clear
      return;
    }
    
    // Extract message_id from backend for deduplication
    const messageId = message.data?.message_id || message.message_id;
    
    // Regular message
    const content = message.data?.content || message.content || message.message || '';
    const artifacts = message.data?.artifacts || message.artifacts || [];
    
    const assistantMessage = {
      id: `assistant-${Date.now()}`,
      role: 'assistant' as const,
      content,
      timestamp: Date.now(),
      thinking: message.thinking,
      artifacts
    };
    
    console.log('[Handler] Adding message with content length:', content.length);
    
    // Use dedup if we have a message_id from backend
    if (messageId) {
      addMessageWithDedup(assistantMessage, messageId);
    } else {
      addMessage(assistantMessage);
    }
    
    setWaitingForResponse(false); // CRITICAL: Always clear on message completion
    
    // Preferred path: explicit artifacts array
    if (artifacts && artifacts.length > 0) {
      console.log('[Handler] Processing artifacts:', artifacts.length);
      processArtifacts(artifacts);
      return;
    }

    // Fallback: try to extract artifacts from tool envelopes embedded in response
    const maybeArtifacts = extractArtifactsFromToolEnvelope(message.data) || extractArtifactsFromToolEnvelope(message);
    if (maybeArtifacts && maybeArtifacts.length > 0) {
      console.log('[Handler] Extracted artifacts from tool envelope:', maybeArtifacts.length);
      processArtifacts(maybeArtifacts);
    }
  }
  
  function processArtifacts(artifacts: any[]) {
    const { addArtifact, setShowArtifacts } = useAppState.getState();
    
    artifacts.forEach((artifact: any) => {
      if (!artifact || !artifact.content) {
        console.warn('[Handler] Skipping invalid artifact:', artifact);
        return;
      }
      
      const path = artifact.path || artifact.title || 'untitled';
      const language = artifact.language || inferLanguage(path);
      
      const cleanArtifact: Artifact = {
        id: artifact.id || `artifact-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        path,
        content: artifact.content,
        language,
        changeType: artifact.change_type,
      };
      
      console.log('[Handler] Adding artifact:', cleanArtifact.path);
      addArtifact(cleanArtifact);
    });
    
    setShowArtifacts(true);
  }

  function extractArtifactsFromToolEnvelope(data: any): any[] {
    if (!data) return [];

    // Direct artifact(s)
    if (Array.isArray(data.artifacts)) return data.artifacts;
    if (data.artifact) return [data.artifact];

    // tool_result style
    if (data.type === 'tool_result' || data.tool_name || data.tool) {
      const candidates = [data.result, data.output, data.outputs, data.files, data.results, data.data];
      for (const c of candidates) {
        if (Array.isArray(c)) {
          const arts = c.filter((x: any) => x && x.content);
          if (arts.length) return arts;
        } else if (c && c.content) {
          return [c];
        }
      }
    }

    return [];
  }
  
  function inferLanguage(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase();
    const map: Record<string, string> = {
      rs: 'rust', js: 'javascript', jsx: 'javascript',
      ts: 'typescript', tsx: 'typescript', py: 'python',
      go: 'go', java: 'java', cpp: 'cpp', c: 'c',
      html: 'html', css: 'css', json: 'json',
      yaml: 'yaml', yml: 'yaml', toml: 'toml',
      md: 'markdown', sql: 'sql', sh: 'shell', bash: 'shell'
    };
    return map[ext || ''] || 'plaintext';
  }
};
