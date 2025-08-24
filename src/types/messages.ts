// src/types/messages.ts
// PHASE 1: Enhanced message types with metadata and tool support

// Enhanced tool result types with metadata
export interface ToolResult {
  type: 'web_search' | 'code_interpreter' | 'file_search' | 'image_generation';
  data: any;
  // NEW: Enhanced metadata support
  tool_id?: string;
  tool_name?: string;
  status?: 'success' | 'error' | 'partial';
  error?: string;
  metadata?: {
    execution_time_ms?: number;
    tokens_used?: number;
    files_processed?: number;
    image_count?: number;
    search_results_count?: number;
  };
}

// Enhanced citation with additional metadata
export interface Citation {
  file_id: string;
  filename: string;
  url?: string;
  snippet?: string;
  // NEW: Enhanced citation metadata
  page_number?: number;
  line_number?: number;
  confidence_score?: number;
  source_type?: 'file' | 'web' | 'database';
}

// NEW: Tool execution state for UI
export interface ToolExecution {
  id: string;
  tool_type: string;
  tool_name?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  started_at: Date;
  completed_at?: Date;
  parameters?: any;
  result?: any;
  error?: string;
}

// Enhanced message interface with all new metadata fields
export interface Message {
  id: string;
  role: 'user' | 'mira' | 'system';
  content: string;
  timestamp: Date;
  mood?: string;
  isStreaming?: boolean;
  artifactId?: string;
  tags?: string[];
  salience?: number;
  toolResults?: ToolResult[];
  citations?: Citation[];
  // NEW: Thread and session tracking
  session_id?: string;
  thread_id?: string;
  previous_response_id?: string;
  response_id?: string;
  // NEW: Tool execution tracking
  tool_executions?: ToolExecution[];
  // NEW: Enhanced metadata
  metadata?: {
    tokens_used?: number;
    generation_time_ms?: number;
    model?: string;
    temperature?: number;
    max_tokens?: number;
    tool_count?: number;
    error_count?: number;
  };
}

// Aside type for emotional cues
export interface Aside {
  id: string;
  cue: string;
  intensity: number;
  timestamp: Date;
}

// Enhanced session info with more tracking
export interface SessionInfo {
  id: string;
  userId?: string;
  startedAt: Date;
  messageCount: number;
  // NEW: Enhanced session tracking
  threadIds?: string[];
  totalTokensUsed?: number;
  toolsUsed?: string[];
  lastActivity?: Date;
  metadata?: {
    project_id?: string;
    feature_flags?: Record<string, boolean>;
    user_preferences?: Record<string, any>;
  };
}

// NEW: Tool configuration interface
export interface ToolConfig {
  type: string;
  enabled: boolean;
  settings?: {
    // File search specific
    max_results?: number;
    file_extensions?: string[];
    search_mode?: 'semantic' | 'keyword' | 'hybrid';
    
    // Image generation specific
    default_style?: string;
    default_size?: string;
    default_quality?: string;
    max_images?: number;
    
    // Web search specific
    max_search_results?: number;
    safe_search?: boolean;
    
    // Code interpreter specific
    timeout_seconds?: number;
    max_execution_time?: number;
  };
}

// NEW: Application state interface for feature flags
export interface AppConfig {
  features: {
    enable_chat_tools: boolean;
    enable_file_search: boolean;
    enable_image_generation: boolean;
    enable_web_search: boolean;
    enable_code_interpreter: boolean;
  };
  tools: ToolConfig[];
  ui: {
    theme: 'light' | 'dark' | 'auto';
    show_tool_details: boolean;
    show_metadata: boolean;
    auto_scroll: boolean;
    compact_mode: boolean;
  };
}

// NEW: History message format for loading chat history
export interface HistoryMessage extends Omit<Message, 'timestamp' | 'isStreaming'> {
  timestamp: string; // ISO string from API
  isStreaming: false; // History messages are never streaming
}

// NEW: Chat history response format
export interface ChatHistoryResponse {
  messages: HistoryMessage[];
  has_more: boolean;
  cursor?: string;
  total_count?: number;
}

// NEW: Tool invocation request (for UI → Backend)
export interface ToolInvocationRequest {
  tool_type: string;
  parameters: any;
  session_id?: string;
  project_id?: string;
  metadata?: {
    user_preferences?: any;
    context?: string;
  };
}

// NEW: Tool execution progress (for live updates)
export interface ToolProgress {
  tool_id: string;
  tool_type: string;
  stage: string;
  progress: number; // 0-100
  message?: string;
  eta_seconds?: number;
}
