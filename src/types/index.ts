// src/types/index.ts

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  streaming?: boolean;
  error?: boolean;
  mood?: string;
  isRoast?: boolean;
  isExcited?: boolean;
  artifacts?: string[];
  toolResults?: ToolResult[];
  
  // Rich metadata from backend structured responses
  metadata?: {
    // Analysis data from backend
    salience?: number;
    topics?: string[];
    mood?: string | null;
    contains_code?: boolean;
    programming_lang?: string | null;
    routed_to_heads?: string[];
    
    // Response metadata from backend
    response_id?: string;
    total_tokens?: number;
    latency_ms?: number;
    
    // UI-specific metadata (optional)
    intent?: string | null;
    summary?: string | null;
    relationship_impact?: string | null;
    intensity?: number | null;
    language?: string;
  };
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
  // 🚀 NEW: Add repository attachment info
  hasRepository?: boolean;
  repositoryUrl?: string;
}

export interface Artifact {
  id: string;
  title: string;
  type: 'text/markdown' | 'application/javascript' | 'application/typescript' | 'text/html' | 'text/css' | 'application/json' | 'text/python' | 'text/rust' | 'text/plain';
  content: string;
  language?: string;
  linkedFile?: string;
  created: number;
  modified: number;
}

// 🚀 NEW: File system response types
export interface FileSystemResponse {
  files?: FileNode[];
  content?: string;
  success?: boolean;
  error?: string;
}

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  size?: number;
  modified?: string;
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
    language?: string;
    project_context?: Project;
    repo_root?: string;
    has_repository?: boolean;
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

// ===================================
// 📄 DOCUMENT PROCESSING TYPES (NEW)
// ===================================

// Document command message
export interface DocumentCommand extends WebSocketMessage {
  type: 'document_command';
  method: 'documents.upload' | 'documents.search' | 'documents.retrieve' | 'documents.list' | 'documents.delete';
  params: DocumentParams;
}

// Union type for document params
export type DocumentParams = UploadParams | SearchParams | RetrieveParams | ListParams | DeleteParams;

// Upload params
export interface UploadParams {
  project_id: string;
  file_name: string;
  content: string; // base64 encoded
}

// Search params
export interface SearchParams {
  project_id: string;
  query: string;
  limit?: number;
}

// Retrieve params
export interface RetrieveParams {
  document_id: string;
}

// List params
export interface ListParams {
  project_id: string;
}

// Delete params
export interface DeleteParams {
  document_id: string;
}

// Progress update from backend
export interface DocumentProgress {
  type: 'document_processing_progress';
  file_name: string;
  progress: number; // 0.0 to 1.0
  status: 'starting' | 'processing' | 'completed' | 'failed';
  message?: string;
}

// Completed document response
export interface DocumentProcessed {
  type: 'document_processed';
  document: DocumentMetadata;
}

// Document list response
export interface DocumentList {
  type: 'document_list';
  documents: DocumentMetadata[];
}

// Document search results
export interface DocumentSearchResults {
  type: 'document_search_results';
  results: DocumentSearchResult[];
}

// Single search result
export interface DocumentSearchResult {
  document_id: string;
  file_name: string;
  chunk_index: number;
  content: string;
  score: number;
}

// Document metadata
export interface DocumentMetadata {
  id: string;
  file_name: string;
  file_type: string;
  size_bytes: number;
  word_count: number;
  chunk_count: number;
  created_at: string;
  metadata?: {
    title?: string;
    author?: string;
    page_count?: number;
    [key: string]: any;
  };
}

// ===================================
// END DOCUMENT TYPES
// ===================================

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
  send: (message: WebSocketMessage) => Promise<any>;
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
