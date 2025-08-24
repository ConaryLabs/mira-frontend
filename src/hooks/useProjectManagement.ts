// src/hooks/useProjectManagement.ts
// Extract project CRUD and active project handling from ChatContainer.tsx

import { useState, useCallback, useEffect } from 'react';
import { projectApi } from '../services/projectApi';

interface Project {
  id: string;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProjectState {
  projects: Project[];
  currentProjectId: string | null;
  isLoadingProjects: boolean;
}

export interface ProjectActions {
  handleProjectCreate: (name: string, description?: string) => Promise<void>;
  handleProjectSelect: (projectId: string) => void;
  handleProjectDelete: (projectId: string) => Promise<void>;
  loadProjects: () => Promise<void>;
  setCurrentProjectId: (projectId: string | null) => void;
}

export function useProjectManagement() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);

  const loadProjects = useCallback(async () => {
    setIsLoadingProjects(true);
    try {
      const projectList = await projectApi.listProjects();
      setProjects(projectList);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setIsLoadingProjects(false);
    }
  }, []);

  const handleProjectCreate = useCallback(async (name: string, description?: string) => {
    try {
      const newProject = await projectApi.createProject({ name, description });
      setProjects(prev => [newProject, ...prev]);
      setCurrentProjectId(newProject.id);
    } catch (error) {
      console.error('Failed to create project:', error);
      throw error;
    }
  }, []);

  const handleProjectSelect = useCallback((projectId: string) => {
    setCurrentProjectId(projectId);
  }, []);

  const handleProjectDelete = useCallback(async (projectId: string) => {
    try {
      await projectApi.deleteProject(projectId);
      setProjects(prev => prev.filter(p => p.id !== projectId));
      if (currentProjectId === projectId) {
        setCurrentProjectId(null);
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
      throw error;
    }
  }, [currentProjectId]);

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const state: ProjectState = {
    projects,
    currentProjectId,
    isLoadingProjects,
  };

  const actions: ProjectActions = {
    handleProjectCreate,
    handleProjectSelect,
    handleProjectDelete,
    loadProjects,
    setCurrentProjectId,
  };

  return {
    state,
    actions,
    // Also expose individual state items for convenience
    ...state,
    ...actions,
  };
}
