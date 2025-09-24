// src/hooks/useMessageHandler.ts

import { useEffect } from 'react';
import { useWebSocketStore } from '../stores/useWebSocketStore';
import { useChatStore } from '../stores/useChatStore';
import { useAppState } from './useAppState';

export function useMessageHandler() {
  const { subscribe } = useWebSocketStore();
  const { addMessage } = useChatStore();
  const { setProjects, setCurrentProject } = useAppState();
  
  useEffect(() => {
    const unsubscribe = subscribe('message-handler', (message) => {
      console.log('[Handler] Processing message:', message.type);
      
      // Log the full message for debugging
      if (message.type === 'data') {
        console.log('[Handler] Data message content:', message.data);
      }
      
      switch (message.type) {
        case 'response':
          handleChatResponse(message);
          break;
          
        case 'data':
          handleDataMessage(message);
          break;
          
        case 'status':
          handleStatusMessage(message);
          break;
          
        case 'error':
          handleErrorMessage(message);
          break;
          
        default:
          console.log('[Handler] Unhandled message type:', message.type, message);
      }
    });
    
    return unsubscribe;
  }, []);
  
  function handleChatResponse(message: any) {
    if (message.data?.artifacts && Array.isArray(message.data.artifacts)) {
      console.log('[Handler] Error fix response with', message.data.artifacts.length, 'artifacts');
      
      const artifacts = message.data.artifacts.map((artifact: any) => ({
        id: `artifact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        path: artifact.path,
        content: artifact.content,
        language: detectLanguage(artifact.path),
        changeType: artifact.change_type || 'primary',
        originalContent: artifact.original_content,
      }));
      
      addMessage({
        id: message.id || `msg_${Date.now()}`,
        role: 'assistant',
        content: message.data.output || message.data.content || 'Here are the fixes for your code:',
        artifacts,
        timestamp: Date.now(),
        metadata: {
          fix_type: message.data.fix_type,
          confidence: message.data.confidence,
        }
      });
    } else if (message.data?.content) {
      addMessage({
        id: message.id || `msg_${Date.now()}`,
        role: 'assistant',
        content: message.data.content,
        timestamp: Date.now(),
      });
    }
  }
  
  function handleDataMessage(message: any) {
    if (!message.data) return;
    
    const { data } = message;
    
    if (data.projects) {
      setProjects(data.projects);
    }
    
    if (data.project) {
      setCurrentProject(data.project);
    }
    
    // Handle file content from git.file command
    if (data.type === 'file_content' && data.content && data.path) {
      console.log('[Handler] Creating artifact for file:', data.path);
      
      // Determine the correct MIME type based on file extension
      const language = detectLanguage(data.path);
      const artifactType = getArtifactType(language);
      
      // Create an artifact from the file content
      const artifact = {
        id: `file_${Date.now()}`,
        title: data.path.split('/').pop() || 'untitled',
        content: data.content,
        type: artifactType,
        language: language,
        linkedFile: data.path,
        created: Date.now(),
        modified: Date.now()
      };
      
      // Add artifact and set it as active
      const { addArtifact, setShowArtifacts } = useAppState.getState();
      addArtifact(artifact);
      setShowArtifacts(true);
    }
    
    if (data.artifact) {
      const { addArtifact, setShowArtifacts } = useAppState.getState();
      addArtifact(data.artifact);
      setShowArtifacts(true);
    }
  }
  
  function handleStatusMessage(message: any) {
    console.log('[Handler] Status:', message.message);
  }
  
  function handleErrorMessage(message: any) {
    console.error('[Handler] Error:', message.error);
    
    addMessage({
      id: `error_${Date.now()}`,
      role: 'system',
      content: `⚠️ Error: ${message.error}`,
      timestamp: Date.now(),
    });
  }
  
  function detectLanguage(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      'rs': 'rust',
      'ts': 'typescript',
      'tsx': 'typescript',
      'js': 'javascript',
      'jsx': 'javascript',
      'py': 'python',
      'go': 'go',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'rb': 'ruby',
      'php': 'php',
      'md': 'markdown',
      'json': 'json',
      'yaml': 'yaml',
      'yml': 'yaml',
      'toml': 'toml',
    };
    
    return languageMap[ext || ''] || 'text';
  }
  
  function getArtifactType(language: string): "text/markdown" | "application/javascript" | "application/typescript" | "text/html" | "text/css" | "application/json" | "text/python" | "text/rust" | "text/plain" {
    const typeMap: Record<string, any> = {
      'rust': 'text/rust',
      'typescript': 'application/typescript',
      'javascript': 'application/javascript',
      'python': 'text/python',
      'markdown': 'text/markdown',
      'html': 'text/html',
      'css': 'text/css',
      'json': 'application/json',
    };
    
    return typeMap[language] || 'text/plain';
  }
}
