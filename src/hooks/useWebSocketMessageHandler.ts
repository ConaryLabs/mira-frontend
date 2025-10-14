// src/hooks/useWebSocketMessageHandler.ts
// SCORCHED EARTH: Import Artifact from useChatStore

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
        // Log EVERY inbound message with its type and keys
        console.log('[WS-Global] Inbound:', {
          type: message.type,
          keys: Object.keys(message),
          dataType: message.data?.type,
        });

        // Unified router: handle both data and response envelopes for non-chat payloads
        if (message.type === 'data') {
          if (message.data) handleDataMessage(message.data);
          return;
        }
        if (message.type === 'response') {
          // Only handle known non-chat responses here to avoid stepping on chat handler
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
          // Check if it's a project deletion confirmation
          if (message.message && message.message.includes('deleted')) {
            send({ type: 'project_command', method: 'project.list', params: {} });
          }
          return;
        }
        if (message.type === 'error') {
          // Surface errors in console
          console.error('[WS-Global] Backend error:', message.error || message.message || 'Unknown error');
          return;
        }
      },
      // IMPORTANT: listen for 'response' too so git.file → file_content responses open artifacts
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
    if (!dtype) {
      // No type field - likely memory payload handled elsewhere
      return;
    }
    
    console.log('[WS-Global] Handling data type:', dtype);

    switch (dtype) {
      // ========== NEW: ARTIFACT CREATED ==========
      case 'artifact_created': {
        console.log('[WS-Global] 🎨 artifact_created received:', data.artifact);
        
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

        console.log('[WS-Global] Adding artifact to viewer:', newArtifact.path);
        addArtifact(newArtifact);
        setShowArtifacts(true);
        return;
      }

      case 'file_content': {
        // Be permissive about field names coming back from backend
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

      case 'projects': {
        if (Array.isArray(data.projects)) setProjects(data.projects);
        return;
      }

      case 'project_list': {
        if (Array.isArray(data.projects)) setProjects(data.projects);
        return;
      }

      case 'project_created': {
        // Refresh projects
        send({ type: 'project_command', method: 'project.list', params: {} });
        return;
      }

      case 'local_directory_attached': {
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

      case 'file_tree': {
        // QuickFileOpen consumes these; nothing to do globally
        return;
      }

      // DOCUMENT PROCESSING MESSAGES - handled by DocumentUpload component
      case 'document_processing_started':
      case 'document_processing_progress':
      case 'document_processed':
      case 'document_list':
      case 'document_search_results':
      case 'document_content': {
        // handled by doc components
        return;
      }

      case 'project_updated': {
        send({ type: 'project_command', method: 'project.list', params: {} });
        return;
      }

      default:
        console.log('[WS-Global] Unhandled data type:', dtype);
        return;
    }
  };
};
