// src/hooks/useWebSocketMessageHandler.ts
// Add file_content artifact creation to the global handler

import { useEffect } from 'react';
import { useAppState } from './useAppState';
import { useWebSocketStore } from '../stores/useWebSocketStore';
import { useArtifacts } from './useArtifacts'; // Import artifacts hook
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
    setShowFileExplorer
  } = useAppState();
  
  // Access artifact functions for file_content handling
  const { addArtifact } = useArtifacts();

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
        
      case 'response':
        if (message.data) {
          console.log('Handling response message:', message.data);
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
      // Map unsupported types to text/plain
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
      return; // Let memory data pass through to chat system
    }
    
    switch (data.type) {
      // NEW: Handle file_content to create artifacts
      case 'file_content':
        console.log('File content received, creating artifact:', {
          path: data.path,
          contentLength: data.content?.length || 0
        });
        
        if (data.content !== undefined) {
          const newArtifact = {
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
          addArtifact(newArtifact);
          console.log('Artifact created successfully');
        } else {
          console.warn('No content in file_content message');
        }
        break;
      
      case 'project_list':
        console.log('Project list received:', data.projects);
        if (data.projects && Array.isArray(data.projects)) {
          const processedProjects: Project[] = data.projects.map((project: any) => {
            console.log('Processing project:', {
              id: project.id,
              name: project.name,
              has_repository: project.has_repository,
              repository_url: project.repository_url,
              import_status: project.import_status
            });
            
            return {
              id: project.id,
              name: project.name,
              description: project.description,
              tags: project.tags || [],
              lastAccessed: project.last_accessed || Date.now(),
              created: project.created || Date.now(),
              hasRepository: Boolean(project.has_repository),
              repositoryUrl: project.repository_url,
            };
          });
          
          console.log('Setting processed projects:', processedProjects);
          setProjects(processedProjects);

          // CRITICAL: Update current project if it exists in the new list
          const { currentProject } = useAppState.getState();
          if (currentProject) {
            const updatedCurrentProject = processedProjects.find(p => p.id === currentProject.id);
            if (updatedCurrentProject) {
              console.log('Updating current project with latest data:', {
                old: { hasRepository: currentProject.hasRepository },
                new: { hasRepository: updatedCurrentProject.hasRepository }
              });
              setCurrentProject(updatedCurrentProject);
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
          
          // Update modified files list
          if (data.status.modified && Array.isArray(data.status.modified)) {
            // Clear existing and add new modified files
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
          
          // Update current project if it's the one being updated
          const { currentProject } = useAppState.getState();
          if (currentProject && currentProject.id === updatedProject.id) {
            setCurrentProject(updatedProject);
          }
          
          // Update projects list
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
