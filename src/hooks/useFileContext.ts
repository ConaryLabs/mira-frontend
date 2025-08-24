// src/hooks/useFileContext.ts
// Extract artifact/file state management from ChatContainer.tsx

import { useState, useCallback, useEffect } from 'react';

interface SessionArtifact {
  id: string;
  name: string;
  content: string;
  artifact_type: 'code' | 'document' | 'data';
  language?: string;
  created_at: string;
  updated_at: string;
}

interface FileContext {
  file_path?: string;
  project_id?: string;
  attachment_id?: string;
  language?: string;
}

export interface FileContextState {
  showArtifacts: boolean;
  selectedArtifactId: string | null;
  artifactCount: number;
  sessionArtifacts: SessionArtifact[];
  currentFile: FileContext | null;
}

export interface FileContextActions {
  handleArtifactClick: (artifactId: string) => void;
  setShowArtifacts: (show: boolean) => void;
  setSelectedArtifactId: (id: string | null) => void;
  setCurrentFile: (file: FileContext | null) => void;
  loadArtifacts: (projectId: string) => Promise<void>;
  clearArtifacts: () => void;
}

export function useFileContext() {
  const [showArtifacts, setShowArtifacts] = useState(false);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [artifactCount, setArtifactCount] = useState(0);
  const [sessionArtifacts, setSessionArtifacts] = useState<SessionArtifact[]>([]);
  const [currentFile, setCurrentFile] = useState<FileContext | null>(null);

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
      const response = await fetch(`/api/projects/${projectId}/artifacts`);
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
    setCurrentFile(null);
  }, []);

  const state: FileContextState = {
    showArtifacts,
    selectedArtifactId,
    artifactCount,
    sessionArtifacts,
    currentFile,
  };

  const actions: FileContextActions = {
    handleArtifactClick,
    setShowArtifacts,
    setSelectedArtifactId,
    setCurrentFile,
    loadArtifacts,
    clearArtifacts,
  };

  return {
    state,
    actions,
    // Also expose individual state items for convenience
    ...state,
    ...actions,
  };
}
