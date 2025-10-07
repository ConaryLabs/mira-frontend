// src/hooks/useMessageHandler.ts
// PHASE 1.3: Process create_artifact tool results from backend
// PERFORMANCE FIX: Filtered subscription for 'response' messages only

import { useEffect } from 'react';
import { useWebSocketStore } from '../stores/useWebSocketStore';
import { useChatStore } from '../stores/useChatStore';
import { useAppState } from '../stores/useAppState';
import type { Artifact } from '../types';

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
    
    // ===== PHASE 1.3: PROCESS ARTIFACTS =====
    // Handle artifacts if present
    if (artifacts && artifacts.length > 0) {
      console.log('[Handler] Processing artifacts from response:', artifacts.length);
      processArtifacts(artifacts);
    }
    // ===== END PHASE 1.3 =====
    
    // Handle data messages that contain artifacts
    handleDataMessage(message.data);
  }
  
  // ===== PHASE 1.3: NEW FUNCTION =====
  function processArtifacts(artifacts: any[]) {
    const { addArtifact, setShowArtifacts } = useAppState.getState();
    
    artifacts.forEach((artifact: any) => {
      // Skip if artifact is invalid
      if (!artifact || !artifact.content) {
        console.warn('[Handler] Skipping invalid artifact:', artifact);
        return;
      }
      
      // Infer language from path or explicit language field
      const language = artifact.language || inferLanguageFromPath(artifact.path || artifact.title || '');
      
      // Convert backend artifact format to frontend Artifact type
      const frontendArtifact: Artifact = {
        id: artifact.id || `artifact-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        title: artifact.title || artifact.path?.split('/').pop() || 'Untitled',
        content: artifact.content,
        type: detectArtifactType(artifact.path || artifact.title || '', artifact.change_type),
        language,
        path: artifact.path, // Optional: file path if this represents a file
        linkedFile: artifact.path, // Link to project file
        changeType: artifact.change_type || null, // For fix artifacts: primary, import, type, cascade
        created: Date.now(),
        modified: Date.now(),
      };
      
      console.log('[Handler] Adding artifact to state:', frontendArtifact.title, frontendArtifact.id);
      addArtifact(frontendArtifact);
    });
    
    // Auto-open artifacts panel
    setShowArtifacts(true);
  }
  
  function inferLanguageFromPath(path: string): string {
    if (!path) return 'plaintext';
    
    const ext = path.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'rs': return 'rust';
      case 'js': case 'jsx': return 'javascript';
      case 'ts': case 'tsx': return 'typescript';
      case 'py': return 'python';
      case 'go': return 'go';
      case 'java': return 'java';
      case 'cpp': case 'cc': case 'cxx': return 'cpp';
      case 'c': case 'h': return 'c';
      case 'html': return 'html';
      case 'css': return 'css';
      case 'json': return 'json';
      case 'yaml': case 'yml': return 'yaml';
      case 'toml': return 'toml';
      case 'md': return 'markdown';
      case 'sql': return 'sql';
      case 'sh': case 'bash': return 'shell';
      default: return 'plaintext';
    }
  }
  
  function detectArtifactType(path: string, changeType?: string): Artifact['type'] {
    // If there's a change_type, it's a fix artifact
    if (changeType) {
      return 'text/plain'; // Fixes use Monaco's auto-detection
    }
    
    // Otherwise, infer from extension
    if (!path) return 'text/plain';
    
    const ext = path.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'rs': return 'text/rust';
      case 'js': case 'jsx': return 'application/javascript';
      case 'ts': case 'tsx': return 'application/typescript';
      case 'py': return 'text/python';
      case 'html': return 'text/html';
      case 'css': return 'text/css';
      case 'json': return 'application/json';
      case 'md': return 'text/markdown';
      // Go and other languages use text/plain (Monaco will still syntax highlight via language field)
      default: return 'text/plain';
    }
  }
  // ===== END PHASE 1.3 =====
  
  function handleDataMessage(data: any) {
    if (!data) return;
    
    // REMOVED: file_content handling - now only in useWebSocketMessageHandler
    // This prevents duplicate artifact creation
    
    // Only handle artifact objects directly attached to chat responses
    // (arrays are now handled by processArtifacts above)
    if (data.artifact && !Array.isArray(data.artifact)) {
      const { addArtifact, setShowArtifacts } = useAppState.getState();
      addArtifact(data.artifact);
      setShowArtifacts(true);
    }
  }
};
