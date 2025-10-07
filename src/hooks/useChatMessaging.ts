// src/hooks/useChatMessaging.ts
// Enhanced with waiting state for batch responses

import { useCallback } from 'react';
import { useWebSocketStore } from '../stores/useWebSocketStore';
import { useChatStore } from '../stores/useChatStore';
import { useAppState, useArtifactState } from '../stores/useAppState';

const ETERNAL_SESSION_ID = 'peter-eternal'; // Match backend default

export const useChatMessaging = () => {
  const send = useWebSocketStore(state => state.send);
  const addMessage = useChatStore(state => state.addMessage);
  const setWaitingForResponse = useChatStore(state => state.setWaitingForResponse);
  const { currentProject, modifiedFiles, currentBranch } = useAppState();
  const { activeArtifact } = useArtifactState();

  // Use the eternal session ID that matches backend
  const getSessionId = useCallback(() => {
    return ETERNAL_SESSION_ID;
  }, []);

  // Helper to detect language from file path or artifact type
  const detectLanguage = useCallback((filePath?: string, artifactType?: string) => {
    if (filePath) {
      const ext = filePath.split('.').pop()?.toLowerCase();
      switch (ext) {
        case 'rs': return 'rust';
        case 'ts': case 'tsx': return 'typescript';
        case 'js': case 'jsx': return 'javascript';
        case 'py': return 'python';
        case 'go': return 'go';
        case 'md': return 'markdown';
        case 'html': return 'html';
        case 'css': return 'css';
        case 'json': return 'json';
        case 'toml': return 'toml';
        case 'yaml': case 'yml': return 'yaml';
        case 'sh': case 'bash': return 'shell';
        default: return 'plaintext';
      }
    }
    
    if (artifactType) {
      switch (artifactType) {
        case 'text/rust': return 'rust';
        case 'application/typescript': return 'typescript';
        case 'application/javascript': return 'javascript';
        case 'text/python': return 'python';
        case 'text/markdown': return 'markdown';
        case 'text/html': return 'html';
        case 'text/css': return 'css';
        case 'application/json': return 'json';
        default: return 'plaintext';
      }
    }
    
    return 'plaintext';
  }, []);

  const handleSend = useCallback(async (content: string) => {
    // Add user message immediately
    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user' as const,
      content,
      timestamp: Date.now()
    };
    
    addMessage(userMessage);
    
    // Set waiting state BEFORE sending
    setWaitingForResponse(true);

    // Build message with full context
    const message = {
      type: 'chat',
      content,
      project_id: currentProject?.id || null,
      metadata: {
        session_id: getSessionId(),
        timestamp: Date.now(),
        
        // FILE CONTEXT
        file_path: activeArtifact?.linkedFile || null,
        file_content: activeArtifact?.content || null, 
        language: activeArtifact ? detectLanguage(activeArtifact.linkedFile, activeArtifact.type) : null,
        
        // PROJECT CONTEXT
        has_repository: currentProject?.hasRepository || false,
        current_branch: currentBranch || 'main',
        modified_files_count: modifiedFiles.length,
      }
    };

    console.log('[useChatMessaging] Sending message with context:', {
      hasProject: !!currentProject,
      projectHasRepo: currentProject?.hasRepository ? 'yes' : 'no',
      activeFile: activeArtifact?.linkedFile || activeArtifact?.title || 'none',
      fileSize: activeArtifact?.content?.length || 0,
      language: activeArtifact ? detectLanguage(activeArtifact.linkedFile, activeArtifact.type) : 'none',
      modifiedFiles: modifiedFiles.length,
      artifactId: activeArtifact?.id || 'none',
    });

    try {
      await send(message);
    } catch (error) {
      console.error('[useChatMessaging] Send failed:', error);
      // Clear waiting state on error
      setWaitingForResponse(false);
    }
  }, [send, currentProject, activeArtifact, modifiedFiles, currentBranch, addMessage, setWaitingForResponse, getSessionId, detectLanguage]);

  const addSystemMessage = useCallback((content: string) => {
    addMessage({
      id: `sys-${Date.now()}`,
      role: 'system' as const,
      content,
      timestamp: Date.now()
    });
  }, [addMessage]);

  // Add helper to notify when project context changes
  const addProjectContextMessage = useCallback((projectName: string) => {
    addSystemMessage(`Now working in project: ${projectName}`);
  }, [addSystemMessage]);

  // Add file context message when switching files
  const addFileContextMessage = useCallback((fileName: string) => {
    addSystemMessage(`Now viewing: ${fileName}`);
  }, [addSystemMessage]);

  return { 
    handleSend, 
    addSystemMessage, 
    addProjectContextMessage,
    addFileContextMessage
  };
};
