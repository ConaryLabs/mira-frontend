// src/hooks/useWebSocketMessageHandler.ts
// Global message handler - handles non-chat messages (projects, files, git, etc.)

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
    setShowArtifacts,
    addArtifact
  } = useAppState();

  useEffect(() => {
    const unsubscribe = subscribe(
      'global-message-handler',
      (message) => {
        console.log('[WS-Global] Inbound:', {
          type: message.type,
          dataType: message.data?.type,
        });

        if (message.type === 'data') {
          if (message.data) handleDataMessage(message.data);
          return;
        }
        if (message.type === 'response') {
          // Only handle known non-chat responses to avoid stepping on chat handler
          const dt = message.data?.type;
          if (dt && (
            dt === 'file_content' ||
            dt === 'project_list' ||
            dt === 'projects' ||
            dt === 'git_status' ||
            dt === 'file_tree' ||
            dt === 'local_directory_attached' ||
            dt === 'project_updated'
          )) {
            handleDataMessage(message.data);
            return;
          }
        }
        if (message.type === 'status') {
          if (message.message && message.message.includes('deleted')) {
            send({ type: 'project_command', method: 'project.list', params: {} });
          }
          return;
        }
        if (message.type === 'error') {
          console.error('[WS-Global] Backend error:', message.error || message.message || 'Unknown error');
          return;
        }
      },
      ['data', 'status', 'error', 'response']
    );

    return unsubscribe;
  }, [subscribe, setProjects, setCurrentProject, updateGitStatus, addModifiedFile, clearModifiedFiles, send, addArtifact, setShowArtifacts]);

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
        };

        addArtifact(newArtifact);
        setShowArtifacts(true);
        return;
      }

      case 'file_content': {
        const rawPath = data.path || data.file_path || data.name || 'untitled';
        const path = String(rawPath).replace(/\/+/, '/').replace(/\/+/g, '/');
        const content = data.content ?? data.file_content ?? data.text ?? data.body ?? data.value;
        if (typeof content === 'undefined') {
          console.warn('[WS-Global] file_content received without content field', data);
          return;
        }

        const newArtifact: Artifact = {
          id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          path,
          content,
          language: detectLanguage(path),
        };

        addArtifact(newArtifact);
        setShowArtifacts(true);
        return;
      }

      case 'projects':
      case 'project_list': {
        if (Array.isArray(data.projects)) setProjects(data.projects);
        return;
      }

      case 'project_created':
      case 'local_directory_attached':
      case 'project_updated': {
        send({ type: 'project_command', method: 'project.list', params: {} });
        return;
      }

      case 'git_status': {
        if (data.status === 'synced' || data.status === 'modified') {
          updateGitStatus(data.status);
          if (data.modified_files) {
            clearModifiedFiles();
            data.modified_files.forEach((file: string) => addModifiedFile(file));
          }
        }
        return;
      }

      case 'file_tree':
      case 'document_processing_started':
      case 'document_processing_progress':
      case 'document_processed':
      case 'document_list':
      case 'document_search_results':
      case 'document_content': {
        // Handled by other components
        return;
      }

      default:
        console.log('[WS-Global] Unhandled data type:', dtype);
        return;
    }
  };
};
