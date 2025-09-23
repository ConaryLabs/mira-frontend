// src/hooks/useWebSocketMessageHandler.ts
import { useEffect } from 'react';
import { useAppState } from './useAppState';
import { useWebSocket } from './useWebSocket';

export const useWebSocketMessageHandler = () => {
  const { lastMessage, send } = useWebSocket();
  const { 
    setProjects,        // 🚀 FIXED: Use setProjects, not addProject
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
  }, [lastMessage]);

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
          // 🚀 FIXED: Process projects with repository status
          const processedProjects = data.projects.map((project: any) => ({
            id: project.id,
            name: project.name,
            description: project.description,
            tags: project.tags || [],
            lastAccessed: project.last_accessed || Date.now(),
            created: project.created || Date.now(),
            // 🔥 KEY FIX: Use the repository info from backend
            hasRepository: project.has_repository || false,
            repositoryUrl: project.repository_url,
          }));
          
          console.log('📊 Setting processed projects:', processedProjects);
          setProjects(processedProjects); // Use setProjects, not forEach
        }
        break;

      case 'project_created':
        console.log('✨ New project created:', data.project);
        if (data.project) {
          // Add new project to existing list
          setProjects(prev => [...prev, {
            id: data.project.id,
            name: data.project.name,
            description: data.project.description,
            tags: data.project.tags || [],
            lastAccessed: data.project.last_accessed || Date.now(),
            created: data.project.created || Date.now(),
            hasRepository: data.project.has_repository || false,
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
            hasRepository: data.project.has_repository || false,
            repositoryUrl: data.project.repository_url,
          });
        }
        break;

      case 'project_updated':
        console.log('📝 Project updated:', data.project);
        if (data.project) {
          // Update project in list
          setProjects(prev => prev.map(p => 
            p.id === data.project.id 
              ? {
                  ...p,
                  name: data.project.name || p.name,
                  description: data.project.description || p.description,
                  tags: data.project.tags || p.tags,
                  hasRepository: data.project.has_repository !== undefined 
                    ? data.project.has_repository 
                    : p.hasRepository,
                  repositoryUrl: data.project.repository_url || p.repositoryUrl,
                }
              : p
          ));
        }
        break;

      case 'git_status':
        console.log('🔧 Git status update:', data);
        updateGitStatus(data);
        
        if (data.modified) {
          clearModifiedFiles();
          data.modified.forEach((file: string) => {
            addModifiedFile(file);
          });
        }
        break;

      case 'file_tree':
        console.log('📁 File tree received:', data);
        // Handle file tree - this could indicate repository is working
        break;

      case 'file_content':
        console.log('📄 File content received:', data);
        // Handle file content
        break;

      default:
        // Check for success responses that might indicate project changes
        if (data.status === 'success' && !data.type) {
          console.log('🔄 Got success response, refreshing project list...');
          refreshProjectList();
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
};
