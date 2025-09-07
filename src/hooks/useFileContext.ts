// src/hooks/useFileContext.ts  
// PHASE 2: Artifact and file management (~100 lines)
// Responsibilities: Artifacts, file context, session management

import { useState, useCallback } from 'react';
import { API_BASE_URL } from '../services/config';

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

  const loadArtifacts = useCallback(async (projectId: string) => {
    if (!projectId) {
      setArtifactCount(0);
      setShowArtifacts(false);
      setSessionArtifacts([]);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/artifacts`);
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
