// src/hooks/useWebSocketMessageHandler.ts
// UPDATED: Set initial status='draft' and origin='llm' for artifacts

import { useEffect } from 'react';
import { useAppState } from '../stores/useAppState';
import { useWebSocketStore } from '../stores/useWebSocketStore';
import type { Artifact } from '../stores/useChatStore';

export const useWebSocketMessageHandler = () => {
  const subscribe = useWebSocketStore(state => state.subscribe);
  const send = useWebSocketStore(state => state.send);
  
  const { 
    setProjects,
    setCurrentProject, 
    updateGitStatus, 
    addModifiedFile,
    clearModifiedFiles,
    setShowFileExplorer,
    addArtifact
  } = useAppState();

  useEffect(() => {
    const unsubscribe = subscribe(
      'global-message-handler',
      (message) => {
        console.log('WebSocket message received:', message);
        handleMessage(message);
      },
      ['data', 'status', 'error']
    );

    return unsubscribe;
  }, [subscribe, setProjects, setCurrentProject, updateGitStatus, addModifiedFile, clearModifiedFiles, send, addArtifact]);

  const handleMessage = (message: any) => {
    if (!message || typeof message !== 'object') {
      console.warn('Received invalid message:', message);
      return;
    }

    switch (message.type) {
      case 'data':
        if (message.data) {
          console.log('Handling data message:', message.data);
          handleDataMessage(message.data);
        }
        break;
        
      case 'status':
        console.log('Status:', message.message);
        if (message.message && message.message.includes('deleted')) {
          console.log('Project deleted, refreshing list');
          send({
            type: 'project_command',
            method: 'project.list',
            params: {}
          });
        }
        break;
        
      case 'error':
        console.error('Backend error:', message.error || message.message || 'Unknown error');
        break;
        
      case 'heartbeat':
        // Ignore heartbeat messages
        break;
        
      default:
        console.log('Unhandled message type:', message.type);
        break;
    }
  };

  const detectLanguage = (filePath: string): string => {
    if (!filePath) return 'plaintext';
    
    const ext = filePath.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'rs': return 'rust';
      case 'js': case 'jsx': return 'javascript';
      case 'ts': case 'tsx': return 'typescript';
      case 'py': return 'python';
      case 'json': return 'json';
      case 'html': return 'html';
      case 'css': return 'css';
      case 'md': return 'markdown';
      case 'toml': return 'toml';
      case 'yaml': case 'yml': return 'yaml';
      case 'sh': case 'bash': return 'shell';
      case 'go': return 'go';
      case 'java': return 'java';
      case 'cpp': return 'cpp';
      case 'c': return 'c';
      case 'sql': return 'sql';
      default: return 'plaintext';
    }
  };

  const handleDataMessage = (data: any) => {
    const dtype = data?.type;
    if (!dtype) return;
    
    console.log('[WS-Global] Handling data type:', dtype);

    switch (dtype) {
      case 'artifact_created': {
        console.log('[WS-Global] Artifact created:', data.artifact);
        
        const artifactData = data.artifact;
        if (!artifactData || !artifactData.content) {
          console.warn('[WS-Global] artifact_created missing content:', data);
          return;
        }

        const path = artifactData.path || artifactData.title || 'untitled';
        const newArtifact: Artifact = {
          id: artifactData.id || `artifact-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          path,
          content: artifactData.content,
          language: artifactData.language || detectLanguage(path),
          changeType: artifactData.change_type,
          status: 'draft',  // NEW: Set initial status
          origin: 'llm',    // NEW: Mark as coming from LLM
          timestamp: Date.now()
        };

        addArtifact(newArtifact);
        return;
      }

      case 'file_content': {
        const rawPath = data.path || data.file_path || data.name || 'untitled';
        const path = String(rawPath).replace(/\/+/, '/').replace(/\/+/g, '/');
        const content = data.content ?? data.file_content ?? data.text ?? data.body ?? '// No content';

        const newArtifact: Artifact = {
          id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          path,
          content,
          language: detectLanguage(path),
          status: 'saved',  // Files from disk are already saved
          origin: 'user',   // User opened this file
          timestamp: Date.now()
        };

        console.log('[WS-Global] File content artifact:', newArtifact.path);
        addArtifact(newArtifact);
        setShowFileExplorer(true);
        return;
      }

      case 'projects': {
        console.log('Projects data received:', data.projects?.length || 0, 'projects');
        if (data.projects) {
          setProjects(data.projects);
        }
        return;
      }

      case 'project_list': {
        console.log('Processing project list:', data.projects?.length || 0, 'projects');
        if (data.projects && Array.isArray(data.projects)) {
          setProjects(data.projects);
          console.log('Projects updated in state');
        }
        return;
      }

      case 'project_created': {
        console.log('Project created:', data.project?.name);
        send({
          type: 'project_command',
          method: 'project.list',
          params: {}
        });
        return;
      }

      case 'local_directory_attached': {
        console.log('Local directory attached:', data.path);
        send({
          type: 'project_command',
          method: 'project.list',
          params: {}
        });
        return;
      }

      case 'git_status': {
        console.log('Git status update:', data.status);
        if (data.status === 'synced' || data.status === 'modified') {
          updateGitStatus(data.status);
          
          if (data.modified_files) {
            clearModifiedFiles();
            data.modified_files.forEach((file: string) => addModifiedFile(file));
          }
        }
        return;
      }

      default:
        console.log('[WS-Global] Unhandled data type:', dtype);
    }
  };
};
