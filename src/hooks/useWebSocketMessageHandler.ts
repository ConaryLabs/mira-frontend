// src/hooks/useWebSocketMessageHandler.ts
// PERFORMANCE FIX: Filtered subscription for data/status/error messages only

import { useEffect } from 'react';
import { useAppState } from '../stores/useAppState';
import { useWebSocketStore } from '../stores/useWebSocketStore';
import type { Project, Artifact } from '../types';

// Type alias for allowed artifact types
type ArtifactType = Artifact['type'];

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
    // PERFORMANCE FIX: Only subscribe to data/status/error messages
    const unsubscribe = subscribe(
      'global-message-handler',
      (message) => {
        console.log('WebSocket message received:', message);
        handleMessage(message);
      },
      ['data', 'status', 'error'] // Filter: only receive these message types
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

  // Helper functions for artifact creation
  const getArtifactType = (filePath: string): ArtifactType => {
    if (!filePath) return 'text/plain';
    
    const ext = filePath.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'rs': return 'text/rust';
      case 'js': return 'application/javascript';
      case 'jsx': return 'application/javascript';
      case 'ts': return 'application/typescript';
      case 'tsx': return 'application/typescript';
      case 'py': return 'text/python';
      case 'json': return 'application/json';
      case 'html': return 'text/html';
      case 'css': return 'text/css';
      case 'md': return 'text/markdown';
      case 'toml': case 'yaml': case 'yml': case 'sh': case 'bash': case 'txt': case 'log':
        return 'text/plain';
      default: return 'text/plain';
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
      // Handle file_content to create artifacts
      case 'file_content':
        console.log('File content received, creating artifact:', {
          path: data.path,
          contentLength: data.content?.length || 0
        });
        
        if (data.content !== undefined) {
          const newArtifact: Artifact = {
            id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            title: data.path?.split('/').pop() || 'Unknown File',
            content: data.content || '// No content',
            type: getArtifactType(data.path || ''),
            language: detectLanguage(data.path || ''),
            linkedFile: data.path,
            created: Date.now(),
            modified: Date.now(),
          };
          
          console.log('Creating artifact from file:', newArtifact.title);
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

      // NEW: Handle project_list responses
      case 'project_list':
        console.log('Processing project list:', data.projects?.length || 0, 'projects');
        if (data.projects && Array.isArray(data.projects)) {
          setProjects(data.projects);
          console.log('Projects updated in state');
        }
        break;

      // NEW: Handle project_created responses
      case 'project_created':
        console.log('Project created:', data.project?.name);
        if (data.project) {
          // Add the new project to the list
          const currentProjects = useAppState.getState().projects;
          setProjects([...currentProjects, data.project]);
        }
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

      // FIXED: Document-related messages are handled by DocumentList/DocumentSearch components
      case 'document_list':
      case 'document_search_results':
      case 'document_content':
        // These are handled by document components via their own subscriptions
        console.log(`Document message (${data.type}) - handled by document components`);
        break;

      case 'project_updated':
        console.log('Project update notification:', data.project_id);
        if (data.project) {
          // Get current projects from store
          const currentProjects = useAppState.getState().projects;
          const updatedProjects = currentProjects.length 
            ? currentProjects.map((p: Project) =>
                p.id === data.project.id ? { ...p, ...data.project } : p
              )
            : [data.project];
          setProjects(updatedProjects);
        }
        break;

      default:
        console.log('Unhandled data message type:', data.type);
        break;
    }
  };
};
