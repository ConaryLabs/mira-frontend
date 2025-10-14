// src/hooks/useMessageHandler.ts
// SCORCHED EARTH: Minimal artifact processing, no legacy fields

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
    // Subscribe to BOTH 'response' and 'data' messages
    const unsubscribe = subscribe(
      'chat-handler',
      (message) => {
        // Enhanced logging - dump the COMPLETE message
        console.log('[chat-handler] Inbound message:', {
          type: message.type,
          keys: Object.keys(message),
          dataKeys: message.data ? Object.keys(message.data) : [],
          fullMessage: JSON.parse(JSON.stringify(message)), // Deep clone for inspection
        });

        if (message.type === 'response') {
          handleChatResponse(message);
        } else if (message.type === 'data') {
          handleDataMessage(message);
        }
      },
      ['response', 'data'] // Listen to BOTH
    );
    return unsubscribe;
  }, [subscribe, addMessage, startStreaming, appendStreamContent, endStreaming, setWaitingForResponse]);

  function handleDataMessage(message: any) {
    const data = message.data;
    if (!data) return;

    const dataType = data.type;
    const messageId = data.message_id;

    console.log('[chat-handler] Data message:', { dataType, messageId });

    // Deduplication using backend's message_id
    if (messageId) {
      const { processedMessageIds } = useChatStore.getState();
      if (processedMessageIds.has(messageId)) {
        console.warn('[chat-handler] Duplicate data message ignored:', messageId);
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
      console.log('[chat-handler] Stream complete');
      endStreaming();
      setWaitingForResponse(false);
    } else if (dataType === 'artifact_created' || dataType === 'tool_result') {
      // Artifact or tool result notification
      const artifact = message.data?.artifact;
      if (artifact) {
        console.log('[chat-handler] Artifact created:', artifact.path);
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
    console.log('[chat-handler] Chat response:', {
      hasData: !!message.data,
      hasContent: !!(message.data?.content || message.content),
      hasArtifacts: !!(message.data?.artifacts || message.artifacts),
      artifactCount: (message.data?.artifacts || message.artifacts || []).length,
    });
    
    // Legacy streaming support (if backend sends this)
    if (message.streaming) {
      if (message.content) appendStreamContent(message.content);
      return;
    }
    
    if (message.complete) {
      endStreaming();
      return;
    }
    
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
    
    console.log('[chat-handler] Adding message:', {
      contentLength: content.length,
      artifactCount: artifacts.length,
    });
    
    addMessage(assistantMessage);
    
    if (artifacts && artifacts.length > 0) {
      console.log('[chat-handler] Processing', artifacts.length, 'artifacts from response');
      processArtifacts(artifacts);
    }
  }
  
  function processArtifacts(artifacts: any[]) {
    const { addArtifact, setShowArtifacts } = useAppState.getState();
    
    console.log('[chat-handler] processArtifacts called with:', artifacts);
    
    artifacts.forEach((artifact: any) => {
      if (!artifact || !artifact.content) {
        console.warn('[chat-handler] Skipping invalid artifact:', artifact);
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
      
      console.log('[chat-handler] Adding artifact:', cleanArtifact.path);
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
