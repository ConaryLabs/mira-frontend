// src/hooks/useWebSocketMessageHandler.ts
// SCORCHED EARTH: Import Artifact from useChatStore

import { useEffect } from 'react';
import { useAppState } from '../stores/useAppState';
import { useWebSocketStore } from '../stores/useWebSocketStore';
import type { Artifact } from '../stores/useChatStore';  // ← Fixed import

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
        // Check if it's a project deletion confirmation
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
      case 'sh': return 'shell';
      default: return 'plaintext';
    }
  };

  const handleDataMessage = (data: any) => {
    console.log('Processing data message type:', data.type);
    
    if (!data.type) {
      console.log('No type field - letting chat system handle memory data');
      return;
    }
    
    switch (data.type) {
      case 'file_content':
        console.log('File content received, creating artifact:', {
          path: data.path,
          contentLength: data.content?.length || 0
        });
        
        if (data.content !== undefined) {
          const newArtifact: Artifact = {
            id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            path: data.path || 'untitled',
            content: data.content || '// No content',
            language: detectLanguage(data.path || ''),
          };
          
          console.log('Creating artifact from file:', newArtifact.path);
          addArtifact(newArtifact);
          setShowFileExplorer(true);
        }
        break;

      case 'projects':
        console.log('Projects data received:', data.projects?.length || 0, 'projects');
        if (data.projects) {
          setProjects(data.projects);
        }
        break;

      case 'project_list':
        console.log('Processing project list:', data.projects?.length || 0, 'projects');
        if (data.projects && Array.isArray(data.projects)) {
          setProjects(data.projects);
          console.log('Projects updated in state');
        }
        break;

      case 'project_created':
        console.log('Project created:', data.project?.name);
        // Refresh project list to get the new project
        send({
          type: 'project_command',
          method: 'project.list',
          params: {}
        });
        break;

      case 'local_directory_attached':
        // ← ADDED: Handle local directory attachment
        console.log('Local directory attached:', data.path);
        // Refresh project list to show updated attachment info
        send({
          type: 'project_command',
          method: 'project.list',
          params: {}
        });
        break;

      case 'git_status':
        console.log('Git status update:', data.status);
        if (data.status === 'synced' || data.status === 'modified') {
          updateGitStatus(data.status);
          
          if (data.modified_files) {
            clearModifiedFiles();
            data.modified_files.forEach((file: string) => addModifiedFile(file));
          }
        }
        break;

      case 'file_tree':
        console.log('File tree received:', data.tree?.length || 0, 'items');
        break;

      case 'document_list':
      case 'document_search_results':
      case 'document_content':
        console.log(`Document message (${data.type}) - handled by document components`);
        break;

      case 'project_updated':
        console.log('Project update notification:', data.project_id);
        // Refresh project list to get updated data
        send({
          type: 'project_command',
          method: 'project.list',
          params: {}
        });
        break;

      default:
        console.log('Unhandled data message type:', data.type);
        break;
    }
  };
};
