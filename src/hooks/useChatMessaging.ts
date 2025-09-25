// src/hooks/useChatMessaging.ts
// Enhanced with full file context integration

import { useCallback } from 'react';
import { useWebSocketStore } from '../stores/useWebSocketStore';
import { useAppState, useArtifactState } from './useAppState';
import type { Message } from '../types';

const ETERNAL_SESSION_ID = 'peter-eternal'; // Match backend default

export const useChatMessaging = (
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  setIsWaitingForResponse: React.Dispatch<React.SetStateAction<boolean>>
) => {
  const { send } = useWebSocket();
  const { currentProject, modifiedFiles, currentBranch } = useAppState();
  const { activeArtifact } = useArtifactState(); // KEY: Access active artifact

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
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsWaitingForResponse(true);

    // CRITICAL: Enhanced message with FULL context including active file
    const message = {
      type: 'chat',
      content,
      project_id: currentProject?.id || null,
      metadata: {
        session_id: getSessionId(),
        timestamp: Date.now(),
        
        // FILE CONTEXT - The missing piece that makes Mira see your files!
        file_path: activeArtifact?.linkedFile || null,
        file_content: activeArtifact?.content || null, 
        language: activeArtifact ? detectLanguage(activeArtifact.linkedFile, activeArtifact.type) : null,
        
        // Additional file context
        artifact_id: activeArtifact?.id || null,
        artifact_type: activeArtifact?.type || null,
        artifact_title: activeArtifact?.title || null,
        file_size: activeArtifact?.content?.length || 0,
        
        // Project context (enhanced)
        project_name: currentProject?.name || null,
        has_repository: currentProject?.hasRepository || false,
        repository_url: currentProject?.repositoryUrl || null,
        context_type: currentProject ? 'project' : 'general',
        
        // Git context
        repo_root: currentProject ? `./repos/${currentProject.id}` : null,
        branch: currentBranch || 'main',
        modified_files: modifiedFiles,
        modified_file_count: modifiedFiles.length,
        
        // Request enhanced processing from backend
        request_repo_context: currentProject?.hasRepository || false,
        request_code_analysis: activeArtifact?.content ? true : false,
      }
    };

    // Enhanced logging to show context being sent
    console.log('Sending ENHANCED message with full context:', {
      session: getSessionId(),
      project: currentProject?.name || 'none',
      hasRepo: currentProject?.hasRepository ? 'yes' : 'no',
      activeFile: activeArtifact?.linkedFile || activeArtifact?.title || 'none',
      fileSize: activeArtifact?.content?.length || 0,
      language: activeArtifact ? detectLanguage(activeArtifact.linkedFile, activeArtifact.type) : 'none',
      modifiedFiles: modifiedFiles.length,
      artifactId: activeArtifact?.id || 'none',
      // Don't log actual file content - too verbose, but confirm it exists
      hasFileContent: !!activeArtifact?.content
    });

    try {
      await send(message);
    } catch (error) {
      console.error('Send failed:', error);
      setIsWaitingForResponse(false);
    }
  }, [send, currentProject, activeArtifact, modifiedFiles, currentBranch, setMessages, setIsWaitingForResponse, getSessionId, detectLanguage]);

  const addSystemMessage = useCallback((content: string) => {
    setMessages(prev => [...prev, {
      id: `sys-${Date.now()}`,
      role: 'system',
      content,
      timestamp: Date.now()
    }]);
  }, [setMessages]);

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
