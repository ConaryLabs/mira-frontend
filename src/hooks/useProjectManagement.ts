import { useState, useCallback, useEffect } from 'react';
import { createProjectCommand } from '../types/websocket';
import type { WsClientMessage } from '../types/websocket';

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
  handleProjectCreate: (name: string) => void;
  handleProjectSelect: (projectId: string) => void;
  setCurrentProjectId: (projectId: string | null) => void;
  loadProjects: () => void;
  handleProjectResponse: (data: any) => void;
}

export function useProjectManagement(send?: (message: WsClientMessage) => void) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);

  const handleProjectResponse = useCallback((data: any) => {
    if (data.type === 'project_list') {
      setProjects(data.projects || []);
      setIsLoadingProjects(false);
      
      if (data.projects?.length > 0 && !currentProjectId) {
        setCurrentProjectId(data.projects[0].id);
      }
    } else if (data.type === 'project_created') {
      const newProject = data.project;
      setProjects(prev => [...prev, newProject]);
      setCurrentProjectId(newProject.id);
    } else if (data.type === 'project_updated') {
      setProjects(prev => prev.map(p => 
        p.id === data.project.id ? data.project : p
      ));
    } else if (data.type === 'project_deleted') {
      setProjects(prev => prev.filter(p => p.id !== data.project_id));
      if (currentProjectId === data.project_id) {
        setCurrentProjectId(null);
      }
    }
  }, [currentProjectId]);

  const loadProjects = useCallback(() => {
    if (!send) {
      console.warn('Cannot load projects: WebSocket not connected');
      return;
    }
    setIsLoadingProjects(true);
    send(createProjectCommand('project.list', {}));
  }, [send]);

  const handleProjectCreate = useCallback((name: string) => {
    if (!send) {
      console.warn('Cannot create project: WebSocket not connected');
      return;
    }
    send(createProjectCommand('project.create', { 
      name,
      description: '',
      tags: []
    }));
  }, [send]);

  const handleProjectSelect = useCallback((projectId: string) => {
    setCurrentProjectId(projectId);
  }, []);

  useEffect(() => {
    if (send) {
      loadProjects();
    }
  }, [send]);

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
    handleProjectResponse,
  };

  return { ...state, ...actions };
}
