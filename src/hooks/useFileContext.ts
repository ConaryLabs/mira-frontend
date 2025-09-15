import { useState, useCallback } from 'react';
import { createProjectCommand } from '../types/websocket';
import type { WsClientMessage } from '../types/websocket';

interface SessionArtifact {
  id: string;
  name: string;
  content: string;
  artifact_type: 'code' | 'document' | 'data';
  language?: string;
  size?: number;
  created_at: string;
  updated_at: string;
}

export interface FileContextState {
  showArtifacts: boolean;
  selectedArtifactId: string | null;
  artifactCount: number;
  sessionArtifacts: SessionArtifact[];
}

export interface FileContextActions {
  handleArtifactClick: (artifactId: string) => void;
  setShowArtifacts: (show: boolean) => void;
  setSelectedArtifactId: (id: string | null) => void;
  loadArtifacts: (projectId: string) => void;
  clearArtifacts: () => void;
  handleArtifactResponse: (data: any) => void;
}

export function useFileContext(send?: (message: WsClientMessage) => void) {
  const [showArtifacts, setShowArtifacts] = useState(false);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [artifactCount, setArtifactCount] = useState(0);
  const [sessionArtifacts, setSessionArtifacts] = useState<SessionArtifact[]>([]);

  const handleArtifactResponse = useCallback((data: any) => {
    if (data.type === 'artifact_list') {
      const artifacts = data.artifacts || [];
      setArtifactCount(artifacts.length);
      setSessionArtifacts(artifacts);
    } else if (data.type === 'artifact_created') {
      setSessionArtifacts(prev => [...prev, data.artifact]);
      setArtifactCount(prev => prev + 1);
    } else if (data.type === 'artifact_updated') {
      setSessionArtifacts(prev => prev.map(a => 
        a.id === data.artifact.id ? data.artifact : a
      ));
    } else if (data.type === 'artifact_deleted') {
      setSessionArtifacts(prev => prev.filter(a => a.id !== data.artifact_id));
      setArtifactCount(prev => Math.max(0, prev - 1));
      if (selectedArtifactId === data.artifact_id) {
        setSelectedArtifactId(null);
      }
    }
  }, [selectedArtifactId]);

  const handleArtifactClick = useCallback((artifactId: string) => {
    setSelectedArtifactId(artifactId);
    setShowArtifacts(true);
  }, []);

  const loadArtifacts = useCallback((projectId: string) => {
    if (!projectId) {
      clearArtifacts();
      return;
    }

    if (!send) {
      console.warn('Cannot load artifacts: WebSocket not connected');
      return;
    }

    send(createProjectCommand('artifact.list', { project_id: projectId }));
  }, [send]);

  const clearArtifacts = useCallback(() => {
    setArtifactCount(0);
    setShowArtifacts(false);
    setSessionArtifacts([]);
    setSelectedArtifactId(null);
  }, []);

  const state: FileContextState = {
    showArtifacts,
    selectedArtifactId,
    artifactCount,
    sessionArtifacts,
  };

  const actions: FileContextActions = {
    handleArtifactClick,
    setShowArtifacts,
    setSelectedArtifactId,
    loadArtifacts,
    clearArtifacts,
    handleArtifactResponse,
  };

  return { ...state, ...actions };
}
