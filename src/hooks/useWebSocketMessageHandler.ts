// src/hooks/useWebSocketMessageHandler.ts
import { useEffect } from 'react';
import { useAppState } from './useAppState';
import { useWebSocket } from './useWebSocket';

export const useWebSocketMessageHandler = () => {
  const { lastMessage, send } = useWebSocket();
  const { 
    addProject, 
    setCurrentProject, 
    updateGitStatus, 
    addModifiedFile,
    clearModifiedFiles,
    setShowFileExplorer
  } = useAppState();

  useEffect(() => {
    if (!lastMessage) return;

    console.log('🔍 WebSocket message received:', lastMessage); // Debug log
    handleMessage(lastMessage);
  }, [lastMessage]);

  const handleMessage = (message: any) => {
    // Guard against undefined messages
    if (!message || typeof message !== 'object') {
      console.warn('Received invalid message:', message);
      return;
    }

    switch (message.type) {
      case 'data':
        if (message.data) {
          console.log('📦 Handling data message:', message.data); // Debug log
          handleDataMessage(message.data);
        }
        break;
        
      case 'response':
        if (message.data) {
          console.log('📡 Handling response message:', message.data); // Debug log
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
    console.log('🎯 Processing data message type:', data.type); // Debug log
    
    // Only handle project-specific data that has a type field
    if (!data.type) {
      console.log('💭 No type field - letting chat system handle memory data');
      return; // Let memory data pass through to chat system
    }
    
    switch (data.type) {
      case 'project_list':
        console.log('📋 Updating project list:', data.projects);
        if (data.projects) {
          // Clear existing projects and add new ones (full sync)
          data.projects.forEach((project: any) => {
            addProject(project);
          });
        }
        break;

      case 'project_created':
        console.log('✨ New project created:', data.project);
        if (data.project) {
          addProject(data.project);
          setCurrentProject(data.project);
          console.log('✅ Project added to state and set as current');
        }
        break;

      case 'project_updated':
        console.log('📝 Project updated:', data.project);
        // TODO: Update existing project in state
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

      case 'memory_stats':
        console.log('🧠 Memory stats:', data);
        // Handle memory statistics
        break;

      case 'memory_recent':
        console.log('🕒 Recent memories:', data);
        // Handle recent memories
        break;

      case 'repo_attached':
        console.log('🔗 Repository attached:', data);
        // Repository attachment successful - could trigger a project context refresh
        break;

      case 'file_tree':
        console.log('📁 File tree received:', data);
        // File tree data for the FileBrowser component
        break;

      case 'file_content':
        console.log('📄 File content received:', data);
        // File content data for the FileBrowser component
        break;

      default:
        // Check if this is a success response to project.create
        if (data.status === 'success' && !data.type) {
          console.log('🔄 Got success response, refreshing project list...');
          // Refresh the project list to get the new project
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

// Export a debug helper to manually check state
export const debugProjectState = () => {
  const state = useAppState.getState();
  console.log('🔍 Current project state:', {
    currentProject: state.currentProject,
    projects: state.projects,
    projectCount: state.projects.length
  });
};
