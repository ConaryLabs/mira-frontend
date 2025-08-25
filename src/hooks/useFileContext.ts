// src/hooks/useFileContext.ts  
// PHASE 2: Artifact and file management (~100 lines)
// Responsibilities: Artifacts, file context, session management

import { useState, useCallback } from 'react';

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
  loadArtifacts: (projectId: string) => Promise<void>;
  clearArtifacts: () => void;
}

export function useFileContext() {
  const [showArtifacts, setShowArtifacts] = useState(false);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [artifactCount, setArtifactCount] = useState(0);
  const [sessionArtifacts, setSessionArtifacts] = useState<SessionArtifact[]>([]);

  const handleArtifactClick = useCallback((artifactId: string) => {
    setSelectedArtifactId(artifactId);
    setShowArtifacts(true);
  }, []);

  const getBaseUrl = useCallback(() => {
    const hostname = window.location.hostname;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3001';
    }
    
    // For remote access, use the same protocol and host  
    const protocol = window.location.protocol;
    const port = window.location.port || (protocol === 'https:' ? '443' : '80');
    return `${protocol}//${hostname}:${port}`;
  }, []);

  const loadArtifacts = useCallback(async (projectId: string) => {
    if (!projectId) {
      setArtifactCount(0);
      setShowArtifacts(false);
      setSessionArtifacts([]);
      return;
    }

    try {
      const baseUrl = getBaseUrl();
      const response = await fetch(`${baseUrl}/projects/${projectId}/artifacts`);
      if (response.ok) {
        const data = await response.json();
        const artifacts = data.artifacts || [];
        setArtifactCount(artifacts.length);
        setSessionArtifacts(artifacts);
      } else {
        console.error('Failed to fetch artifacts:', response.statusText);
        setArtifactCount(0);
        setSessionArtifacts([]);
      }
    } catch (error) {
      console.error('Failed to fetch artifacts:', error);
      setArtifactCount(0);
      setSessionArtifacts([]);
    }
  }, []);

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
  };

  return { ...state, ...actions };
}
