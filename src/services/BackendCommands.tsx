// src/services/BackendCommands.tsx

import { useWebSocketStore } from '../stores/useWebSocketStore';
import { useAppState } from '../hooks/useAppState';

/**
 * Backend command service using Zustand WebSocket store
 * Replaces the old singleton pattern
 */
export class BackendCommands {
  private send: (message: any) => Promise<void>;
  
  constructor() {
    // Get send function from store
    this.send = useWebSocketStore.getState().send;
  }
  
  // Project commands
  async createProject(name: string, description?: string, tags?: string[]) {
    return this.send({
      type: 'project',
      method: 'project.create',
      params: { name, description, tags }
    });
  }
  
  async updateProject(id: string, updates: any) {
    return this.send({
      type: 'project',
      method: 'project.update',
      params: { id, ...updates }
    });
  }
  
  async deleteProject(id: string) {
    return this.send({
      type: 'project',
      method: 'project.delete',
      params: { id }
    });
  }
  
  async listProjects() {
    return this.send({
      type: 'project',
      method: 'project.list',
      params: {}
    });
  }
  
  // Git commands
  async gitImport(projectId: string, repoUrl: string) {
    return this.send({
      type: 'git',
      method: 'git.import',
      params: { project_id: projectId, repo_url: repoUrl }
    });
  }
  
  async gitStatus(projectId: string) {
    return this.send({
      type: 'git',
      method: 'git.status',
      params: { project_id: projectId }
    });
  }
  
  async gitCommit(projectId: string, message: string, files?: string[]) {
    return this.send({
      type: 'git',
      method: 'git.commit',
      params: { 
        project_id: projectId, 
        message,
        files: files || []
      }
    });
  }
  
  async gitPush(projectId: string, branch?: string) {
    return this.send({
      type: 'git',
      method: 'git.push',
      params: { 
        project_id: projectId,
        branch: branch || 'main'
      }
    });
  }
  
  async gitPull(projectId: string, branch?: string) {
    return this.send({
      type: 'git',
      method: 'git.pull',
      params: { 
        project_id: projectId,
        branch: branch || 'main'
      }
    });
  }
  
  async gitRestore(projectId: string, filePath: string) {
    return this.send({
      type: 'git',
      method: 'git.restore',
      params: { 
        project_id: projectId,
        file_path: filePath
      }
    });
  }
  
  async gitSync(projectId: string) {
    const { currentProject } = useAppState.getState();
    if (!currentProject) throw new Error('No project selected');
    
    // Get status first
    await this.gitStatus(projectId);
    
    // Add all changes
    await this.send({
      type: 'git',
      method: 'git.add',
      params: { 
        project_id: projectId,
        files: ['.']
      }
    });
    
    // Commit with timestamp
    const message = `Update: ${new Date().toLocaleString()}`;
    await this.gitCommit(projectId, message);
    
    // Push changes
    await this.gitPush(projectId);
  }
  
  // File system commands
  async writeFile(projectId: string, path: string, content: string) {
    return this.send({
      type: 'file_system',
      method: 'files.write',
      params: {
        project_id: projectId,
        path,
        content
      }
    });
  }
  
  async readFile(projectId: string, path: string) {
    return this.send({
      type: 'file_system',
      method: 'files.read',
      params: {
        project_id: projectId,
        path
      }
    });
  }
  
  async listFiles(projectId: string, path?: string) {
    return this.send({
      type: 'file_system',
      method: 'files.list',
      params: {
        project_id: projectId,
        path: path || '/'
      }
    });
  }
  
  async deleteFile(projectId: string, path: string) {
    return this.send({
      type: 'file_system',
      method: 'files.delete',
      params: {
        project_id: projectId,
        path
      }
    });
  }
  
  async createDirectory(projectId: string, path: string) {
    return this.send({
      type: 'file_system',
      method: 'files.mkdir',
      params: {
        project_id: projectId,
        path
      }
    });
  }
  
  // Code intelligence commands
  async searchCode(projectId: string, pattern: string, limit: number = 10) {
    return this.send({
      type: 'code_intelligence',
      method: 'code.search',
      params: {
        project_id: projectId,
        pattern,
        limit
      }
    });
  }
  
  async analyzeCode(projectId: string, filePath: string) {
    return this.send({
      type: 'code_intelligence',
      method: 'code.analyze',
      params: {
        project_id: projectId,
        file_path: filePath
      }
    });
  }
  
  // Memory commands
  async searchMemory(sessionId: string, query: string, limit: number = 10) {
    return this.send({
      type: 'memory',
      method: 'memory.search',
      params: {
        session_id: sessionId,
        query,
        limit
      }
    });
  }
  
  async getMemoryStats(sessionId: string) {
    return this.send({
      type: 'memory',
      method: 'memory.stats',
      params: {
        session_id: sessionId
      }
    });
  }
  
  // Run command (for the run button)
  async runProject(projectId: string, command?: string) {
    const { currentProject } = useAppState.getState();
    
    // Determine command based on project type
    if (!command) {
      if (currentProject?.tags?.includes('rust')) {
        command = 'cargo run';
      } else if (currentProject?.tags?.includes('node') || currentProject?.tags?.includes('typescript')) {
        command = 'npm run dev';
      } else if (currentProject?.tags?.includes('python')) {
        command = 'python main.py';
      } else {
        command = 'make run';
      }
    }
    
    return this.send({
      type: 'project',
      method: 'project.run',
      params: {
        project_id: projectId,
        command
      }
    });
  }
}

// Export singleton instance
export const backendCommands = new BackendCommands();
