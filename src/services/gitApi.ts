// src/services/gitApi.ts
import { API_BASE_URL } from './config';

export interface GitRepoAttachment {
  id: string;
  project_id: string;
  repo_url: string;
  local_path: string;
  import_status: 'Pending' | 'Cloned' | 'Imported';
  last_imported_at?: string;
  last_sync_at?: string;
}

export interface AttachRepoPayload {
  repo_url: string;
}

export interface SyncRepoPayload {
  commit_message: string;
}

export const gitApi = {
  // Attach a new repository to a project
  async attachRepo(projectId: string, payload: AttachRepoPayload) {
    const url = `${API_BASE_URL}/projects/${projectId}/git/attach`;
    console.log('Attaching repo to URL:', url);
    console.log('Payload:', payload);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(`Failed to attach repository: ${response.statusText}`);
    }

    return response.json();
  },

  // Get all repositories attached to a project
  async listRepos(projectId: string): Promise<{ repos: GitRepoAttachment[] }> {
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/git/repos`);

    if (!response.ok) {
      throw new Error(`Failed to fetch repositories: ${response.statusText}`);
    }

    return response.json();
  },

  // Sync changes back to the remote repository
  async syncRepo(projectId: string, attachmentId: string, payload: SyncRepoPayload) {
    const response = await fetch(
      `${API_BASE_URL}/projects/${projectId}/git/${attachmentId}/sync`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to sync repository: ${response.statusText}`);
    }

    return response.json();
  },

  // Get project details including attached repos
  // FIXED: Backend uses singular /api/project/:id, not /api/projects/:id/details
  async getProjectDetails(projectId: string) {
    const response = await fetch(`${API_BASE_URL}/project/${projectId}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch project details: ${response.statusText}`);
    }

    return response.json();
  },
};
