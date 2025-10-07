// src/types/index.ts
// PHASE 1.3: Added path and changeType to Artifact for fix workflows

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
  // Repository attachment info
  hasRepository?: boolean;
  repositoryUrl?: string;
}

// ===== PHASE 1.3: UPDATED ARTIFACT TYPE =====
export interface Artifact {
  id: string;
  title: string;
  type: 'text/markdown' | 'application/javascript' | 'application/typescript' | 'text/html' | 'text/css' | 'application/json' | 'text/python' | 'text/rust' | 'text/plain';
  content: string;
  language?: string;
  linkedFile?: string;
  created: number;
  modified: number;
  // NEW: For error-to-fix workflow
  path?: string;  // File path in project
  changeType?: 'primary' | 'import' | 'type' | 'cascade' | null;  // Type of change for fixes
}
// ===== END PHASE 1.3 =====

// Document types (for document processing feature)
export interface DocumentMetadata {
  id: string;
  file_name: string;  // Backend uses snake_case
  filename: string;   // Alias for compatibility
  file_type: string;
  size_bytes: number;
  file_size: number;  // Alias for compatibility
  chunk_count: number;
  word_count?: number;
  created_at: string;
  uploaded_at: string;  // Alias for compatibility
  project_id?: string;
}

export interface DocumentSearchResult {
  chunk_id: string;
  chunk_index: number;  // Numeric index for display
  document_id: string;
  file_name: string;  // Backend uses snake_case
  filename: string;   // Alias for compatibility
  content: string;
  score: number;
  page_number?: number;
}

// File system response types
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

// Artifact hooks type
export interface ArtifactHook {
  artifacts: Artifact[];
  activeArtifact: Artifact | null;
  showArtifacts: boolean;
  addArtifact: (artifact: Artifact) => void;
  setActiveArtifact: (id: string | null) => void;
  updateArtifact: (id: string, updates: Partial<Artifact>) => void;
  removeArtifact: (id: string) => void;
  closeArtifacts: () => void;
  saveArtifactToFile: (id: string, filename: string) => Promise<void>;
  copyArtifact: (id: string) => void;
}
