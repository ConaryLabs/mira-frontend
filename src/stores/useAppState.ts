// src/stores/useAppState.ts
// PHASE 1.3: Added appliedFiles tracking for artifact workflow

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Project, Artifact, Message } from '../types';

interface AppState {
  // UI State
  showArtifacts: boolean;
  showFileExplorer: boolean;
  quickOpenVisible: boolean;
  
  // Project State
  currentProject: Project | null;
  projects: Project[];
  
  // Git State
  modifiedFiles: string[];
  currentBranch: string;
  gitStatus: any;
  
  // Artifacts
  artifacts: Artifact[];
  activeArtifactId: string | null;
  // ===== PHASE 1.3: NEW =====
  appliedFiles: Set<string>; // Track which artifacts have been applied to disk
  // ===== END PHASE 1.3 =====
  
  // Code Intelligence
  codeAnalysis: any;
  complexityHotspots: any[];
  
  // Memory & Context
  relevantMemories: any[];
  recentTopics: string[];
  
  // Personality
  currentPersona: 'default' | 'professional' | 'chaos';
  mood: 'playful' | 'focused' | 'frustrated' | null;
  
  // Actions
  setShowArtifacts: (show: boolean) => void;
  setShowFileExplorer: (show: boolean) => void;
  setCurrentProject: (project: Project | null) => void;
  addProject: (project: Project) => void;
  setProjects: (projects: Project[] | ((prev: Project[]) => Project[])) => void;
  updateGitStatus: (status: any) => void;
  addModifiedFile: (file: string) => void;
  removeModifiedFile: (file: string) => void;
  clearModifiedFiles: () => void;
  addArtifact: (artifact: Artifact) => void;
  setActiveArtifact: (id: string | null) => void;
  updateArtifact: (id: string, updates: Partial<Artifact>) => void;
  removeArtifact: (id: string) => void;
  // ===== PHASE 1.3: NEW =====
  markArtifactApplied: (id: string) => void;
  markArtifactUnapplied: (id: string) => void;
  isArtifactApplied: (id: string) => boolean;
  // ===== END PHASE 1.3 =====
  setPersona: (persona: 'default' | 'professional' | 'chaos') => void;
  setMood: (mood: 'playful' | 'focused' | 'frustrated' | null) => void;
}

export const useAppState = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      showArtifacts: false,
      showFileExplorer: false,
      quickOpenVisible: false,
      currentProject: null,
      projects: [],
      modifiedFiles: [],
      currentBranch: 'main',
      gitStatus: null,
      artifacts: [],
      activeArtifactId: null,
      // ===== PHASE 1.3: NEW =====
      appliedFiles: new Set<string>(),
      // ===== END PHASE 1.3 =====
      codeAnalysis: null,
      complexityHotspots: [],
      relevantMemories: [],
      recentTopics: [],
      currentPersona: 'default',
      mood: null,

      // Actions
      setShowArtifacts: (show) => set({ showArtifacts: show }),
      setShowFileExplorer: (show) => set({ showFileExplorer: show }),
      
      setCurrentProject: (project) => {
        set({ currentProject: project });
        // Clear git state when switching projects
        if (project) {
          set({ modifiedFiles: [], currentBranch: 'main' });
        }
      },
      
      addProject: (project) => set((state) => ({
        projects: [...state.projects, project]
      })),
      
      setProjects: (projectsOrUpdater) => {
        if (typeof projectsOrUpdater === 'function') {
          set((state) => ({ projects: projectsOrUpdater(state.projects) }));
        } else {
          set({ projects: projectsOrUpdater });
        }
      },
      
      updateGitStatus: (status) => set({ gitStatus: status }),
      
      addModifiedFile: (file) => set((state) => ({
        modifiedFiles: state.modifiedFiles.includes(file) 
          ? state.modifiedFiles 
          : [...state.modifiedFiles, file]
      })),
      
      removeModifiedFile: (file) => set((state) => ({
        modifiedFiles: state.modifiedFiles.filter(f => f !== file)
      })),
      
      clearModifiedFiles: () => set({ modifiedFiles: [] }),
      
      addArtifact: (artifact) => set((state) => ({
        artifacts: [...state.artifacts, artifact],
        activeArtifactId: artifact.id,
        showArtifacts: true
      })),
      
      setActiveArtifact: (id) => set({ activeArtifactId: id }),
      
      updateArtifact: (id, updates) => set((state) => ({
        artifacts: state.artifacts.map(a => 
          a.id === id ? { ...a, ...updates } : a
        )
      })),
      
      removeArtifact: (id) => set((state) => {
        const newArtifacts = state.artifacts.filter(a => a.id !== id);
        return {
          artifacts: newArtifacts,
          activeArtifactId: state.activeArtifactId === id 
            ? (newArtifacts[0]?.id || null)
            : state.activeArtifactId,
          showArtifacts: newArtifacts.length > 0
        };
      }),
      
      // ===== PHASE 1.3: NEW ACTIONS =====
      markArtifactApplied: (id) => set((state) => ({
        appliedFiles: new Set(state.appliedFiles).add(id)
      })),
      
      markArtifactUnapplied: (id) => set((state) => {
        const newApplied = new Set(state.appliedFiles);
        newApplied.delete(id);
        return { appliedFiles: newApplied };
      }),
      
      isArtifactApplied: (id) => {
        return get().appliedFiles.has(id);
      },
      // ===== END PHASE 1.3 =====
      
      setPersona: (persona) => set({ currentPersona: persona }),
      setMood: (mood) => set({ mood }),
    }),
    {
      name: 'mira-app-state',
      // Only persist certain parts of state
      partialize: (state) => ({
        currentProject: state.currentProject,
        projects: state.projects,
        currentPersona: state.currentPersona,
        // Don't persist UI state or temporary data
      }),
    }
  )
);

// Convenience hooks for specific parts of state
export const useProjectState = () => {
  const { currentProject, projects, modifiedFiles, currentBranch } = useAppState();
  return { currentProject, projects, modifiedFiles, currentBranch };
};

export const useArtifactState = () => {
  const { 
    artifacts, 
    activeArtifactId, 
    showArtifacts,
    appliedFiles, // Include appliedFiles
    addArtifact,
    setActiveArtifact,
    updateArtifact,
    removeArtifact,
    markArtifactApplied,
    markArtifactUnapplied,
    isArtifactApplied,
  } = useAppState();
  
  const activeArtifact = artifacts.find(a => a.id === activeArtifactId) || null;
  
  return {
    artifacts,
    activeArtifact,
    showArtifacts,
    appliedFiles,
    addArtifact,
    setActiveArtifact,
    updateArtifact,
    removeArtifact,
    markArtifactApplied,
    markArtifactUnapplied,
    isArtifactApplied,
  };
};

export const usePersonalityState = () => {
  const { currentPersona, mood, setPersona, setMood } = useAppState();
  return { currentPersona, mood, setPersona, setMood };
};
