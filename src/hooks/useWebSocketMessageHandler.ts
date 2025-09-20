// src/hooks/useWebSocketMessageHandler.ts
import { useEffect } from 'react';
import { useAppState } from './useAppState';
import { useWebSocket } from './useWebSocket';

export const useWebSocketMessageHandler = () => {
  const { lastMessage } = useWebSocket();
  const { 
    addProject, 
    setCurrentProject, 
    updateGitStatus, 
    addModifiedFile,
    clearModifiedFiles 
  } = useAppState();

  useEffect(() => {
    if (!lastMessage) return;

    handleMessage(lastMessage);
  }, [lastMessage]);

  const handleMessage = (message: any) => {
    switch (message.type) {
      case 'data':
        handleDataMessage(message.data);
        break;
        
      case 'status':
        console.log('Status:', message.message);
        break;
        
      case 'error':
        console.error('Backend error:', message.error);
        break;
        
      default:
        // Other message types handled by ChatContainer
        break;
    }
  };

  const handleDataMessage = (data: any) => {
    switch (data.type) {
      case 'project_list':
        // Update projects in state
        if (data.projects) {
          data.projects.forEach((project: any) => {
            addProject(project);
          });
        }
        break;

      case 'project_created':
        // Add new project to state
        if (data.project) {
          addProject(data.project);
          setCurrentProject(data.project);
        }
        break;

      case 'project_updated':
        // Update existing project
        console.log('Project updated:', data.project);
        break;

      case 'git_status':
        // Update git status in state
        updateGitStatus(data);
        
        // Update modified files list
        if (data.modified) {
          clearModifiedFiles();
          data.modified.forEach((file: string) => {
            addModifiedFile(file);
          });
        }
        break;

      case 'repository_imported':
        console.log('Repository imported:', data);
        // Refresh git status after import
        break;

      case 'git_sync_complete':
        console.log('Git sync complete:', data);
        clearModifiedFiles();
        break;

      case 'file_saved':
        console.log('File saved:', data.path);
        addModifiedFile(data.path);
        break;

      case 'search_results':
        console.log('Search results:', data.results);
        break;

      case 'complexity_hotspots':
        console.log('Complexity hotspots:', data.hotspots);
        break;

      case 'repository_stats':
        console.log('Repository stats:', data.stats);
        break;

      case 'supported_languages':
        console.log('Supported languages:', data.languages);
        break;

      default:
        console.log('Unhandled data message:', data);
        break;
    }
  };
};
