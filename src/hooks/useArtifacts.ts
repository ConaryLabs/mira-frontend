// src/hooks/useArtifacts.ts
import { useCallback } from 'react';
import { useAppState, useArtifactState } from './useAppState';
import { useWebSocketStore } from '../stores/useWebSocketStore';
import type { Artifact, ArtifactHook } from '../types';

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
  
  const { setShowArtifacts } = useAppState();
  const { send } = useWebSocket();

  const closeArtifacts = useCallback(() => {
    setShowArtifacts(false);
  }, [setShowArtifacts]);

  const saveArtifactToFile = useCallback(async (id: string, filename: string) => {
    const artifact = artifacts.find(a => a.id === id);
    if (!artifact) return;

    try {
      await send({
        type: 'file_system_command',
        method: 'file.save',
        params: {
          path: filename,
          content: artifact.content
        }
      });

      // Update artifact to show it's linked to a file
      updateArtifact(id, { linkedFile: filename });
      
      // TODO: Mark file as modified for git tracking
      console.log(`Saved artifact to ${filename}`);
    } catch (error) {
      console.error('Failed to save artifact:', error);
    }
  }, [artifacts, send, updateArtifact]);

  const copyArtifact = useCallback((id: string) => {
    const artifact = artifacts.find(a => a.id === id);
    if (!artifact) return;

    navigator.clipboard.writeText(artifact.content).then(() => {
      console.log('Artifact copied to clipboard');
    }).catch((error) => {
      console.error('Failed to copy artifact:', error);
    });
  }, [artifacts]);

  const createArtifact = useCallback((
    title: string, 
    content: string, 
    type: Artifact['type'],
    language?: string
  ) => {
    const artifact: Artifact = {
      id: `artifact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      content,
      type,
      language,
      created: Date.now(),
      modified: Date.now()
    };

    addArtifact(artifact);
    return artifact;
  }, [addArtifact]);

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
    copyArtifact
  };
};
