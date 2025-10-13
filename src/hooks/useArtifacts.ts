// src/hooks/useArtifacts.ts
// SCORCHED EARTH: Minimal artifact operations, no legacy cruft

import { useCallback } from 'react';
import { useAppState, useArtifactState } from '../stores/useAppState';
import { useWebSocketStore } from '../stores/useWebSocketStore';
import type { Artifact } from '../stores/useChatStore';

export interface ArtifactHook {
  artifacts: Artifact[];
  activeArtifact: Artifact | null;
  showArtifacts: boolean;
  addArtifact: (artifact: Artifact) => void;
  setActiveArtifact: (id: string | null) => void;
  updateArtifact: (id: string, updates: Partial<Artifact>) => void;
  removeArtifact: (id: string) => void;
  closeArtifacts: () => void;
  saveArtifactToFile: (id: string, filename: string) => Promise<void>;
  saveArtifact: (id: string) => Promise<void>;
  copyArtifact: (id: string) => void;
}

function normalizePath(input: string): string {
  // Convert backslashes to forward slashes, collapse multiple slashes, trim leading ./
  return String(input)
    .replace(/\\/g, '/')
    .replace(/\/{2,}/g, '/')
    .replace(/^\.\/+/, '');
}

export const useArtifacts = (): ArtifactHook => {
  const {
    artifacts,
    activeArtifact,
    showArtifacts,
    addArtifact,
    setActiveArtifact,
    updateArtifact,
    removeArtifact
  } = useArtifactState();
  
  const { setShowArtifacts, currentProject } = useAppState();
  const send = useWebSocketStore(state => state.send);
  
  const closeArtifacts = useCallback(() => {
    setShowArtifacts(false);
  }, [setShowArtifacts]);
  
  const saveArtifactToFile = useCallback(async (id: string, filename: string) => {
    const artifact = artifacts.find(a => a.id === id);
    if (!artifact) return;
    
    if (!currentProject) {
      console.error('Cannot save artifact: no current project');
      return;
    }
    
    const path = normalizePath(filename);

    try {
      await send({
        type: 'file_system_command',
        method: 'files.write',
        params: {
          project_id: currentProject.id,
          path,
          content: artifact.content
        }
      });
      
      // Update path to new filename
      updateArtifact(id, { path });
      console.log(`Saved artifact to ${path}`);
    } catch (error) {
      console.error('Failed to save artifact:', error);
    }
  }, [artifacts, currentProject, send, updateArtifact]);

  // Save to the artifact's existing path without prompting
  const saveArtifact = useCallback(async (id: string) => {
    const artifact = artifacts.find(a => a.id === id);
    if (!artifact) return;

    if (!currentProject) {
      console.error('Cannot save artifact: no current project');
      return;
    }

    const path = normalizePath(artifact.path);

    try {
      await send({
        type: 'file_system_command',
        method: 'files.write',
        params: {
          project_id: currentProject.id,
          path,
          content: artifact.content
        }
      });
      updateArtifact(id, { path });
      console.log(`Saved artifact to ${path}`);
    } catch (error) {
      console.error('Failed to save artifact:', error);
    }
  }, [artifacts, currentProject, send, updateArtifact]);
  
  const copyArtifact = useCallback((id: string) => {
    const artifact = artifacts.find(a => a.id === id);
    if (!artifact) return;
    
    navigator.clipboard.writeText(artifact.content).then(() => {
      console.log('Artifact copied to clipboard');
    }).catch((error) => {
      console.error('Failed to copy artifact:', error);
    });
  }, [artifacts]);
  
  return {
    artifacts,
    activeArtifact,
    showArtifacts,
    addArtifact,
    setActiveArtifact,
    updateArtifact,
    removeArtifact,
    closeArtifacts,
    saveArtifactToFile,
    saveArtifact,
    copyArtifact
  };
};
