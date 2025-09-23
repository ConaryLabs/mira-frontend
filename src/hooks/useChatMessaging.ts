// src/hooks/useChatMessaging.ts
import { useCallback } from 'react';
import { useWebSocket } from './useWebSocket';
import { useAppState, useArtifactState } from './useAppState';
import type { Message } from '../types';

const ETERNAL_SESSION_ID = 'peter-eternal'; // Match backend default

export const useChatMessaging = (
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  setIsWaitingForResponse: React.Dispatch<React.SetStateAction<boolean>>
) => {
  const { send } = useWebSocket();
  const { currentProject, modifiedFiles, currentBranch } = useAppState();
  const { activeArtifact } = useArtifactState(); // This is the KEY addition

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

    // 🔥 CRITICAL: Enhanced message with FULL context
    const message = {
      type: 'chat',
      content,
      project_id: currentProject?.id || null,
      metadata: {
        session_id: getSessionId(),
        timestamp: Date.now(),
        
        // 🚀 FILE CONTEXT - This is what makes Mira actually intelligent!
        file_path: activeArtifact?.linkedFile || activeArtifact?.title,
        file_content: activeArtifact?.content,
        language: activeArtifact ? detectLanguage(activeArtifact.linkedFile, activeArtifact.type) : null,
        
        // Additional file context that backend can use
        artifact_id: activeArtifact?.id,
        artifact_type: activeArtifact?.type,
        file_size: activeArtifact?.content?.length || 0,
        
        // Project context (already exists but enhanced)
        project_name: currentProject?.name || null,
        has_repository: currentProject ? true : false,
        context_type: currentProject ? 'project' : 'general',
        
        // Git context
        repo_root: currentProject ? `./repos/${currentProject.id}` : null,
        branch: currentBranch || 'main',
        modified_files: modifiedFiles,
        modified_file_count: modifiedFiles.length,
        
        // Request enhanced processing from backend
        request_repo_context: currentProject ? true : false,
        request_code_analysis: activeArtifact?.content ? true : false,
      }
    };

    console.log('🚀 Sending ENHANCED message with full context:', {
      session: getSessionId(),
      project: currentProject?.name || 'none',
      hasRepo: currentProject ? 'yes' : 'no',
      activeFile: activeArtifact?.linkedFile || activeArtifact?.title || 'none',
      fileSize: activeArtifact?.content?.length || 0,
      language: activeArtifact ? detectLanguage(activeArtifact.linkedFile, activeArtifact.type) : 'none',
      modifiedFiles: modifiedFiles.length,
      // Don't log file content - too verbose
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

  // Add a helper to notify when project context changes
  const addProjectContextMessage = useCallback((projectName: string) => {
    addSystemMessage(`Now working in project: ${projectName}`);
  }, [addSystemMessage]);

  // 🚀 NEW: Add file context message when switching files
  const addFileContextMessage = useCallback((fileName: string) => {
    addSystemMessage(`Now viewing: ${fileName}`);
  }, [addSystemMessage]);

  return { 
    handleSend, 
    addSystemMessage, 
    addProjectContextMessage,
    addFileContextMessage  // Export this for use when switching artifacts
  };
};
