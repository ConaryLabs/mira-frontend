// src/hooks/useMessageHandler.ts
// SCORCHED EARTH: Minimal artifact processing, no legacy fields

import { useEffect } from 'react';
import { useWebSocketStore } from '../stores/useWebSocketStore';
import { useChatStore, Artifact } from '../stores/useChatStore';
import { useAppState } from '../stores/useAppState';

export const useMessageHandler = () => {
  const subscribe = useWebSocketStore(state => state.subscribe);
  const { addMessage, startStreaming, appendStreamContent, endStreaming } = useChatStore();

  useEffect(() => {
    const unsubscribe = subscribe(
      'chat-handler',
      (message) => {
        if (message.type === 'response') {
          handleChatResponse(message);
        }
      },
      ['response']
    );
    return unsubscribe;
  }, [subscribe, addMessage, startStreaming, appendStreamContent, endStreaming]);

  function handleChatResponse(message: any) {
    console.log('[Handler] Chat response received:', message);
    
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
    
    console.log('[Handler] Adding message with content length:', content.length);
    addMessage(assistantMessage);
    
    if (artifacts && artifacts.length > 0) {
      console.log('[Handler] Processing artifacts:', artifacts.length);
      processArtifacts(artifacts);
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
