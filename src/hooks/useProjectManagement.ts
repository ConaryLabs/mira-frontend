// src/hooks/useProjectManagement.ts
// PHASE 2: Project CRUD and management (~80 lines)
// Responsibilities: Project loading, creation, selection

import { useState, useCallback, useEffect } from 'react';

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
  handleProjectCreate: (name: string) => Promise<void>;
  handleProjectSelect: (projectId: string) => void;
  setCurrentProjectId: (projectId: string | null) => void;
  loadProjects: () => Promise<void>;
}

export function useProjectManagement() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);

  const getBaseUrl = useCallback(() => {
    const hostname = window.location.hostname;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3001';
    }
    
    // For remote access, use the same protocol and host
    const protocol = window.location.protocol;
    const port = window.location.port || (protocol === 'https:' ? '443' : '80');
    return `${protocol}//${hostname}:${port}`;
  }, [getBaseUrl]);

  const loadProjects = useCallback(async () => {
    setIsLoadingProjects(true);
    try {
      const baseUrl = getBaseUrl();
      const res = await fetch(`${baseUrl}/projects`);
      if (res.ok) {
        const data = await res.json();
        const projectList = data.projects || [];
        setProjects(projectList);
        
        // Auto-select first project if none selected
        if (projectList.length > 0 && !currentProjectId) {
          setCurrentProjectId(projectList[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setIsLoadingProjects(false);
    }
  }, [getBaseUrl]);

  const handleProjectCreate = useCallback(async (name: string) => {
    try {
      const baseUrl = getBaseUrl();
      const response = await fetch(`${baseUrl}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      
      if (response.ok) {
        const newProject = await response.json();
        setProjects(prev => [...prev, newProject]);
        setCurrentProjectId(newProject.id);
      }
    } catch (error) {
      console.error('Failed to create project:', error);
      throw error;
    }
  }, []);

  const handleProjectSelect = useCallback((projectId: string) => {
    setCurrentProjectId(projectId);
  }, []);

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
    setCurrentProjectId,
    loadProjects,
  };

  return { ...state, ...actions };
}
