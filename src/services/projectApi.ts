// src/services/projectApi.ts
import { API_BASE_URL } from './config';

// Define the Project interface here if not defined elsewhere
export interface Project {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateProjectDto {
  name: string;
  description?: string;
}

export interface UpdateProjectDto {
  name?: string;
  description?: string;
}

export const projectApi = {
  // List all projects
  async listProjects(): Promise<Project[]> {
    const response = await fetch(`${API_BASE_URL}/projects`);
    if (!response.ok) {
      throw new Error('Failed to fetch projects');
    }
    return response.json();
  },

  // Get a single project
  // FIXED: Backend uses singular /api/project/:id for getting a single project
  async getProject(projectId: string): Promise<Project> {
    const response = await fetch(`${API_BASE_URL}/project/${projectId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch project');
    }
    return response.json();
  },

  // Create a new project
  async createProject(data: CreateProjectDto): Promise<Project> {
    const response = await fetch(`${API_BASE_URL}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to create project');
    }
    return response.json();
  },

  // Update a project
  async updateProject(projectId: string, data: UpdateProjectDto): Promise<Project> {
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update project');
    }
    return response.json();
  },

  // Delete a project
  async deleteProject(projectId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete project');
    }
  },

  // Get project details with attached repos
  // FIXED: Backend uses singular /api/project/:id, not /api/projects/:id/details
  async getProjectDetails(projectId: string) {
    const response = await fetch(`${API_BASE_URL}/project/${projectId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch project details');
    }
    return response.json();
  },
};
