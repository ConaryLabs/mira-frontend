// src/types/index.ts

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  streaming?: boolean;
  mood?: string;
  isRoast?: boolean;
  isExcited?: boolean;
  artifacts?: string[]; // Artifact IDs referenced in this message
  toolResults?: ToolResult[];
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  path?: string;
  gitUrl?: string;
  lastAccessed: number;
  created: number;
}

export interface Artifact {
  id: string;
  title: string;
  type: 'text/markdown' | 'application/javascript' | 'application/typescript' | 'text/html' | 'text/css' | 'application/json' | 'text/python' | 'text/rust' | 'text/plain';
  content: string;
  language?: string;
  linkedFile?: string; // Path to saved file
  created: number;
  modified: number;
}

export interface ToolResult {
  id: string;
  type: 'web_search' | 'code_execution' | 'file_operation' | 'git_operation' | 'code_analysis' | 'code_search' | 'repository_stats' | 'complexity_analysis';
  status: 'success' | 'error' | 'pending';
  data: any;
  timestamp: number;
}

// WebSocket message types
export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export interface ChatMessage extends WebSocketMessage {
  type: 'chat';
  content: string;
  project_id?: string;
  metadata?: {
    timestamp?: number;
    file_path?: string;
    attachment_id?: string;
    language?: string;
    project_context?: Project;
  };
}

export interface ProjectCommand extends WebSocketMessage {
  type: 'project_command';
  method: string;
  params: any;
}

export interface GitCommand extends WebSocketMessage {
  type: 'git_command';
  method: string;
  params: any;
}

export interface FileCommand extends WebSocketMessage {
  type: 'file_system_command';
  method: string;
  params: any;
}

export interface CodeIntelligenceCommand extends WebSocketMessage {
  type: 'code_intelligence';
  method: string;
  params: any;
}

// Git-related types
export interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  modified: string[];
  added: string[];
  deleted: string[];
  untracked: string[];
  staged: string[];
}

// Code intelligence types
export interface CodeElement {
  id: string;
  name: string;
  element_type: 'function' | 'struct' | 'enum' | 'module' | 'component' | 'hook';
  complexity: number;
  location: SourceLocation;
  documentation?: string;
  dependencies: string[];
  language: string;
}

export interface SourceLocation {
  file_path: string;
  start_line: number;
  end_line: number;
  start_column?: number;
  end_column?: number;
}

export interface ComplexityHotspot {
  element: CodeElement;
  score: number;
  issues: string[];
  suggestions: string[];
}

export interface RepositoryStats {
  total_files: number;
  total_functions: number;
  average_complexity: number;
  quality_score: number;
  language_breakdown: Record<string, number>;
  recent_changes: GitChange[];
}

export interface GitChange {
  file_path: string;
  change_type: 'added' | 'modified' | 'deleted';
  lines_added: number;
  lines_removed: number;
  timestamp: number;
}

// Hook return types
export interface WebSocketHook {
  send: (message: WebSocketMessage) => Promise<void>;
  lastMessage: any;
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'error';
  connect: () => void;
  disconnect: () => void;
}

export interface ArtifactHook {
  artifacts: Artifact[];
  activeArtifact: Artifact | null;
  showArtifacts: boolean;
  addArtifact: (artifact: Artifact) => void;
  setActiveArtifact: (id: string) => void;
  updateArtifact: (id: string, updates: Partial<Artifact>) => void;
  removeArtifact: (id: string) => void;
  closeArtifacts: () => void;
  saveArtifactToFile: (id: string, filename: string) => Promise<void>;
  copyArtifact: (id: string) => void;
}

// UI component props
export interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export interface InputProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  type?: string;
}

// API response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
