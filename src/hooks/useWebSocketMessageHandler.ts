// src/hooks/useWebSocketMessageHandler.ts
// FIXED: Set active artifact after creation + proper artifact state management

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
    const unsubscribe = subscribe('global-message-handler', (message) => {
      console.log('WebSocket message received:', message);
      handleMessage(message);
    });

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
            modified: Date.now()
          };
          
          console.log('Creating artifact:', newArtifact.title, newArtifact.type);
          
          // CRITICAL FIX: addArtifact already sets it active and shows panel
          // but we call it explicitly anyway to ensure context sharing works
          addArtifact(newArtifact);
          
          console.log('Artifact created and activated:', newArtifact.id);
        } else {
          console.warn('Received file_content without content');
        }
        break;

      case 'projects_list':
        console.log('Projects list received:', data.projects);
        if (data.projects && Array.isArray(data.projects)) {
          const formattedProjects: Project[] = data.projects.map((p: any) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            tags: p.tags || [],
            lastAccessed: p.last_accessed || Date.now(),
            created: p.created || Date.now(),
            hasRepository: Boolean(p.has_repository),
            repositoryUrl: p.repository_url,
          }));
          setProjects(formattedProjects);
          
          if (data.active_project_id) {
            const activeProject = formattedProjects.find(p => p.id === data.active_project_id);
            if (activeProject) {
              setCurrentProject(activeProject);
            }
          }
        }
        break;

      case 'file_tree':
      case 'tree':
        console.log('File tree received - handled by QuickFileOpen');
        // QuickFileOpen component handles this
        break;

      case 'git_status':
        console.log('Git status received:', data.status);
        if (data.status) {
          updateGitStatus(data.status);
          
          if (data.status.modified && Array.isArray(data.status.modified)) {
            clearModifiedFiles();
            data.status.modified.forEach((file: string) => {
              addModifiedFile(file);
            });
          }
        }
        break;

      case 'project_updated':
        console.log('Project updated:', data.project);
        if (data.project) {
          const updatedProject: Project = {
            id: data.project.id,
            name: data.project.name,
            description: data.project.description,
            tags: data.project.tags || [],
            lastAccessed: Date.now(),
            created: data.project.created || Date.now(),
            hasRepository: Boolean(data.project.has_repository),
            repositoryUrl: data.project.repository_url,
          };
          
          const { currentProject } = useAppState.getState();
          if (currentProject && currentProject.id === updatedProject.id) {
            setCurrentProject(updatedProject);
          }
          
          const { projects } = useAppState.getState();
          const updatedProjects = projects.map(p => 
            p.id === updatedProject.id ? updatedProject : p
          );
          setProjects(updatedProjects);
        }
        break;

      default:
        console.log('Unhandled data message type:', data.type);
        break;
    }
  };
};
