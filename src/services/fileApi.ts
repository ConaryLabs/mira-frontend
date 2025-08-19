// src/services/fileApi.ts
import { API_BASE_URL } from './config';

export interface FileContent {
  path: string;
  content: string;
  language?: string;
  encoding?: string;
}

export interface UpdateFileDto {
  content: string;
  commit_message?: string;
}

export const fileApi = {
  // Get file content from a git repo
  async getFileContent(
    projectId: string, 
    attachmentId: string, 
    filePath: string
  ): Promise<FileContent> {
    const response = await fetch(
      `${API_BASE_URL}/projects/${projectId}/git/${attachmentId}/files/${encodeURIComponent(filePath)}`
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch file content: ${response.statusText}`);
    }
    
    return response.json();
  },

  // Update file content in a git repo
  async updateFileContent(
    projectId: string,
    attachmentId: string,
    filePath: string,
    data: UpdateFileDto
  ): Promise<FileContent> {
    const response = await fetch(
      `${API_BASE_URL}/projects/${projectId}/git/files/${attachmentId}/content/${encodeURIComponent(filePath)}`,
      {
        method: 'POST',  // CHANGED from 'PUT' - backend expects POST
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to update file: ${response.statusText}`);
    }
    
    return response.json();
  },

  // Get file tree for a git repo
  async getFileTree(projectId: string, attachmentId: string) {
    const response = await fetch(
      `${API_BASE_URL}/projects/${projectId}/git/${attachmentId}/tree`
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch file tree: ${response.statusText}`);
    }
    
    return response.json();
  },

  // NOTE: createFile and deleteFile methods removed - backend doesn't support these operations
  // The UI should be updated to not offer these options
};
