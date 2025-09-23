// src/hooks/useWebSocketMessageHandler.ts
import { useEffect } from 'react';
import { useAppState } from './useAppState';
import { useWebSocket } from './useWebSocket';
import type { Project } from '../types';

export const useWebSocketMessageHandler = () => {
  const { lastMessage, send } = useWebSocket();
  const { 
    setProjects,
    setCurrentProject, 
    updateGitStatus, 
    addModifiedFile,
    clearModifiedFiles,
    setShowFileExplorer
  } = useAppState();

  useEffect(() => {
    if (!lastMessage) return;

    console.log('🔍 WebSocket message received:', lastMessage);
    handleMessage(lastMessage);
  }, [lastMessage, setProjects, setCurrentProject, updateGitStatus, addModifiedFile, clearModifiedFiles, send]);

  const handleMessage = (message: any) => {
    if (!message || typeof message !== 'object') {
      console.warn('Received invalid message:', message);
      return;
    }

    switch (message.type) {
      case 'data':
        if (message.data) {
          console.log('📦 Handling data message:', message.data);
          handleDataMessage(message.data);
        }
        break;
        
      case 'response':
        if (message.data) {
          console.log('📡 Handling response message:', message.data);
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
        console.log('🤷 Unhandled message type:', message.type);
        break;
    }
  };

  const handleDataMessage = (data: any) => {
    console.log('🎯 Processing data message type:', data.type);
    
    if (!data.type) {
      console.log('💭 No type field - letting chat system handle memory data');
      return; // Let memory data pass through to chat system
    }
    
    switch (data.type) {
      case 'project_list':
        console.log('📋 Project list received:', data.projects);
        if (data.projects && Array.isArray(data.projects)) {
          // 🚀 FIXED: Process projects with repository status and debug logging
          const processedProjects: Project[] = data.projects.map((project: any) => {
            console.log('🔍 Processing project:', {
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
              // 🔥 KEY FIX: Use the repository info from backend
              hasRepository: Boolean(project.has_repository),
              repositoryUrl: project.repository_url,
            };
          });
          
          console.log('📊 Setting processed projects:', processedProjects);
          setProjects(processedProjects);

          // 🚀 CRITICAL FIX: Update current project if it has new repository status
          const { currentProject } = useAppState.getState();
          if (currentProject) {
            const updatedCurrentProject = processedProjects.find(p => p.id === currentProject.id);
            if (updatedCurrentProject && updatedCurrentProject.hasRepository !== currentProject.hasRepository) {
              console.log('🔄 Updating current project repository status:', {
                projectId: currentProject.id,
                oldStatus: currentProject.hasRepository,
                newStatus: updatedCurrentProject.hasRepository
              });
              setCurrentProject(updatedCurrentProject);
            }
          }
        }
        break;

      case 'project_created':
        console.log('✨ New project created:', data.project);
        if (data.project) {
          // Add new project to existing list
          setProjects((prev: Project[]) => [...prev, {
            id: data.project.id,
            name: data.project.name,
            description: data.project.description,
            tags: data.project.tags || [],
            lastAccessed: data.project.last_accessed || Date.now(),
            created: data.project.created || Date.now(),
            hasRepository: Boolean(data.project.has_repository),
            repositoryUrl: data.project.repository_url,
          }]);
          
          // Set as current project
          setCurrentProject({
            id: data.project.id,
            name: data.project.name,
            description: data.project.description,
            tags: data.project.tags || [],
            lastAccessed: data.project.last_accessed || Date.now(),
            created: data.project.created || Date.now(),
            hasRepository: Boolean(data.project.has_repository),
            repositoryUrl: data.project.repository_url,
          });
        }
        break;

      case 'project_updated':
        console.log('📝 Project updated:', data.project);
        if (data.project) {
          // Update project in list
          setProjects((prev: Project[]) => prev.map((p: Project) => 
            p.id === data.project.id 
              ? {
                  ...p,
                  name: data.project.name || p.name,
                  description: data.project.description || p.description,
                  tags: data.project.tags || p.tags,
                  hasRepository: data.project.has_repository !== undefined 
                    ? Boolean(data.project.has_repository)
                    : p.hasRepository,
                  repositoryUrl: data.project.repository_url || p.repositoryUrl,
                }
              : p
          ));

          // 🚀 Update current project if it's the one that was updated
          const { currentProject } = useAppState.getState();
          if (currentProject && currentProject.id === data.project.id) {
            setCurrentProject({
              ...currentProject,
              name: data.project.name || currentProject.name,
              description: data.project.description || currentProject.description,
              tags: data.project.tags || currentProject.tags,
              hasRepository: data.project.has_repository !== undefined 
                ? Boolean(data.project.has_repository)
                : currentProject.hasRepository,
              repositoryUrl: data.project.repository_url || currentProject.repositoryUrl,
            });
          }
        }
        break;

      case 'git_status':
        console.log('🌿 Git status received:', data);
        updateGitStatus({
          branch: data.branch,
          ahead: data.ahead || 0,
          behind: data.behind || 0,
          modified: data.modified || [],
          added: data.added || [],
          deleted: data.deleted || [],
          untracked: data.untracked || [],
          staged: data.staged || []
        });
        
        // Update modified files for UI
        clearModifiedFiles();
        if (data.modified) {
          data.modified.forEach((file: string) => addModifiedFile(file));
        }
        if (data.added) {
          data.added.forEach((file: string) => addModifiedFile(file));
        }

        // 🚀 NEW: This suggests repository is working, refresh project list
        console.log('🔄 Git status received, refreshing project list to check repository status...');
        setTimeout(() => {
          refreshProjectList();
        }, 500);
        break;

      case 'file_tree':
        console.log('🌳 File tree received:', data.tree);
        // This will be handled by FileBrowser component directly
        break;

      case 'file_content':
        console.log('📄 File content received for:', data.path);
        // This will be handled by file components directly
        break;

      default:
        // 🚀 Check for success responses that might indicate project changes
        if (data.status === 'success' || data.message?.includes('success')) {
          console.log('✅ Got success response, might need to refresh project list:', data);
          
          // If it's a git-related success, refresh project list
          if (data.message?.includes('clone') || 
              data.message?.includes('import') || 
              data.message?.includes('attach')) {
            console.log('🔄 Git operation succeeded, refreshing project list...');
            setTimeout(() => {
              refreshProjectList();
            }, 1000);
          }
        } else {
          console.log('🤷 Unhandled data message type:', data.type || 'undefined');
        }
        break;
    }
  };

  // Helper function to refresh project list
  const refreshProjectList = async () => {
    try {
      console.log('🔄 Refreshing project list...');
      await send({
        type: 'project_command',
        method: 'project.list',
        params: {}
      });
    } catch (error) {
      console.error('❌ Failed to refresh project list:', error);
    }
  };

  return { handleMessage };
};
