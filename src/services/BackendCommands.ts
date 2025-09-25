// src/services/BackendCommands.ts
import { useWebSocketStore } from '../stores/useWebSocketStore';

export class BackendCommands {
  constructor(private send: (message: any) => Promise<void>) {}

  // ==================== PROJECT COMMANDS ====================
  
  async listProjects() {
    return this.send({
      type: 'project_command',
      method: 'project.list',
      params: {}
    });
  }

  async createProject(name: string, description?: string, tags?: string[]) {
    return this.send({
      type: 'project_command',
      method: 'project.create',
      params: { name, description, tags }
    });
  }

  async setActiveProject(projectId: string) {
    return this.send({
      type: 'project_command',
      method: 'project.set_active',
      params: { project_id: projectId }
    });
  }

  async updateProject(projectId: string, updates: any) {
    return this.send({
      type: 'project_command',
      method: 'project.update',
      params: { project_id: projectId, ...updates }
    });
  }

  async deleteProject(projectId: string) {
    return this.send({
      type: 'project_command',
      method: 'project.delete',
      params: { project_id: projectId }
    });
  }

  // ==================== GIT COMMANDS ====================

  async importRepository(projectId: string, gitUrl?: string, localPath?: string) {
    return this.send({
      type: 'git_command',
      method: 'git.import',
      params: { project_id: projectId, git_url: gitUrl, local_path: localPath }
    });
  }

  async gitSync(projectId: string, message?: string) {
    return this.send({
      type: 'git_command',
      method: 'git.sync',
      params: { project_id: projectId, message }
    });
  }

  async gitStatus(projectId: string) {
    return this.send({
      type: 'git_command',
      method: 'git.status',
      params: { project_id: projectId }
    });
  }

  async gitCommit(projectId: string, message: string, files?: string[]) {
    return this.send({
      type: 'git_command',
      method: 'git.commit',
      params: { project_id: projectId, message, files }
    });
  }

  async gitPush(projectId: string, branch?: string) {
    return this.send({
      type: 'git_command',
      method: 'git.push',
      params: { project_id: projectId, branch }
    });
  }

  async gitPull(projectId: string, branch?: string) {
    return this.send({
      type: 'git_command',
      method: 'git.pull',
      params: { project_id: projectId, branch }
    });
  }

  async gitBranch(projectId: string, branchName?: string) {
    return this.send({
      type: 'git_command',
      method: 'git.branch',
      params: { project_id: projectId, branch_name: branchName }
    });
  }

  async gitCheckout(projectId: string, branch: string) {
    return this.send({
      type: 'git_command',
      method: 'git.checkout',
      params: { project_id: projectId, branch }
    });
  }

  async gitReset(projectId: string, mode: 'soft' | 'mixed' | 'hard' = 'mixed') {
    return this.send({
      type: 'git_command',
      method: 'git.reset',
      params: { project_id: projectId, mode }
    });
  }

  // ==================== FILE SYSTEM COMMANDS ====================

  async saveFile(path: string, content: string) {
    return this.send({
      type: 'file_system_command',
      method: 'file.save',
      params: { path, content }
    });
  }

  async readFile(path: string) {
    return this.send({
      type: 'file_system_command',
      method: 'file.read',
      params: { path }
    });
  }

  async listFiles(path: string) {
    return this.send({
      type: 'file_system_command',
      method: 'file.list',
      params: { path }
    });
  }

  async deleteFile(path: string) {
    return this.send({
      type: 'file_system_command',
      method: 'file.delete',
      params: { path }
    });
  }

  async createDirectory(path: string) {
    return this.send({
      type: 'file_system_command',
      method: 'directory.create',
      params: { path }
    });
  }

  async searchFiles(query: string, projectId?: string) {
    return this.send({
      type: 'file_system_command',
      method: 'file.search',
      params: { query, project_id: projectId }
    });
  }

  // ==================== CODE INTELLIGENCE COMMANDS ====================

  async searchCode(pattern: string, limit: number = 10) {
    return this.send({
      type: 'code_intelligence',
      method: 'code.search',
      params: { pattern, limit }
    });
  }

  async getComplexityHotspots(limit: number = 5) {
    return this.send({
      type: 'code_intelligence',
      method: 'code.complexity_hotspots',
      params: { limit }
    });
  }

  async getRepositoryStats(attachmentId?: string) {
    return this.send({
      type: 'code_intelligence',
      method: 'code.repo_stats',
      params: { attachment_id: attachmentId }
    });
  }

  async getCodeElementsByType(elementType: string, limit: number = 10) {
    return this.send({
      type: 'code_intelligence',
      method: 'code.elements_by_type',
      params: { element_type: elementType, limit }
    });
  }

  async getSupportedLanguages() {
    return this.send({
      type: 'code_intelligence',
      method: 'code.supported_languages',
      params: {}
    });
  }

  async deleteRepositoryData(projectId: string) {
    return this.send({
      type: 'code_intelligence',
      method: 'code.delete_repository_data',
      params: { project_id: projectId }
    });
  }

  // ==================== MEMORY COMMANDS ====================

  async searchMemory(query: string, limit: number = 10) {
    return this.send({
      type: 'memory_command',
      method: 'memory.search',
      params: { query, limit }
    });
  }

  async getRecentMemories(limit: number = 10) {
    return this.send({
      type: 'memory_command',
      method: 'memory.recent',
      params: { limit }
    });
  }

  async getMemoryStats() {
    return this.send({
      type: 'memory_command',
      method: 'memory.stats',
      params: {}
    });
  }

  async deleteMemory(memoryId: string) {
    return this.send({
      type: 'memory_command',
      method: 'memory.delete',
      params: { memory_id: memoryId }
    });
  }

  // ==================== CHAT & MESSAGING ====================

  async sendChat(content: string, projectId?: string, metadata?: any) {
    return this.send({
      type: 'chat',
      content,
      project_id: projectId,
      metadata: metadata || {}
    });
  }

  async sendStatus(message: string) {
    return this.send({
      type: 'status',
      message
    });
  }

  // ==================== UTILITY COMMANDS ====================

  async ping() {
    return this.send({
      type: 'ping'
    });
  }

  // ==================== NATURAL LANGUAGE HELPERS ====================
  // These parse natural language and send appropriate commands

  async handleNaturalLanguageCommand(input: string, projectId?: string) {
    const lower = input.toLowerCase().trim();

    // Git operations
    if (lower.match(/^(commit|git commit)/)) {
      const message = input.replace(/^(commit|git commit)\s*/i, '') || 'Quick update';
      return this.gitCommit(projectId!, message);
    }

    if (lower.match(/^(push|git push)/)) {
      return this.gitPush(projectId!);
    }

    if (lower.match(/^(pull|git pull)/)) {
      return this.gitPull(projectId!);
    }

    if (lower.match(/^(git )?status/)) {
      return this.gitStatus(projectId!);
    }

    // File operations
    if (lower.startsWith('save ')) {
      const filename = input.replace(/^save\s+/i, '');
      // This would need artifact content from context
      console.log('TODO: Save current artifact as', filename);
      return;
    }

    if (lower.startsWith('create ') && lower.includes('file')) {
      const filename = input.replace(/^create\s+file\s+/i, '');
      return this.saveFile(filename, '// New file\n');
    }

    if (lower.startsWith('search ')) {
      const query = input.replace(/^search\s+/i, '');
      return this.searchCode(query);
    }

    // Project operations
    if (lower.startsWith('import ') && (lower.includes('repo') || lower.includes('git'))) {
      const url = input.replace(/^import\s+(repo|repository|git)\s+/i, '');
      return this.importRepository(projectId!, url);
    }

    // Default to chat
    return this.sendChat(input, projectId);
  }
}

// Hook to use backend commands
export const useBackendCommands = () => {
  const { send } = useWebSocket();
  return new BackendCommands(send);
};
