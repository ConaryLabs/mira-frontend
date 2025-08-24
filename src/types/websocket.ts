// src/types/websocket.ts
// PHASE 1: Extended WebSocket message types for backend parity
// Added new tool event types and enhanced metadata support

// ===== Server → Client =====

export interface WsHello {
  type: 'hello';
  ts: string;
  server: string;
}

export interface WsReady {
  type: 'ready';
}

export interface WsHeartbeat {
  type: 'heartbeat';
  ts: string;
}

export interface WsChunk {
  type: 'chunk';
  content: string;
  // backend may include mood on first chunk, otherwise omitted
  mood?: string;
}

export interface WsComplete {
  type: 'complete';
  mood?: string;
  salience?: number;   // f32 backend → number here
  tags?: string[];
  // NEW: Enhanced metadata support
  previous_response_id?: string;
  thread_id?: string;
  tool_ids?: string[];
}

export interface WsStatus {
  type: 'status';
  // backend can send either message or status_message; support both
  message?: string;
  status_message?: string;
  // NEW: Enhanced status with configuration flags
  config?: {
    model?: string;
    enable_chat_tools?: boolean;
    enable_file_search?: boolean;
    enable_image_generation?: boolean;
    enable_web_search?: boolean;
    enable_code_interpreter?: boolean;
  };
}

export interface WsAside {
  type: 'aside';
  emotional_cue: string;
  intensity?: number;
}

export interface WsError {
  type: 'error';
  message: string;
  code?: string;
  // NEW: Tool-specific error context
  tool_type?: string;
  tool_id?: string;
}

export interface WsDone {
  type: 'done';
}

export interface WsTypingAck {
  type: 'typing_ack';
}

// NEW: Tool event types from backend ToolEvent enum
export interface WsToolCallStarted {
  type: 'tool_call_started';
  tool_id: string;
  tool_type: string;
  tool_name?: string;
  parameters?: any;
  status?: string;
}

export interface WsToolCallCompleted {
  type: 'tool_call_completed';
  tool_id: string;
  tool_type: string;
  tool_name?: string;
  result?: any;
  status?: string;
}

export interface WsToolCallFailed {
  type: 'tool_call_failed';
  tool_id: string;
  tool_type: string;
  tool_name?: string;
  error: string;
  code?: string;
}

export interface WsImageGenerated {
  type: 'image_generated';
  tool_id?: string;
  prompt: string;
  image_url: string;
  image_urls?: string[]; // Support for multiple images
  style?: string;
  size?: string;
  quality?: string;
  metadata?: {
    generation_time_ms?: number;
    model?: string;
    revised_prompt?: string;
  };
}

// Enhanced tool result with more metadata
export interface WsToolResult {
  type: 'tool_result';
  tool_id?: string;
  tool_type: string;
  tool_name?: string;
  data: any;
  status?: 'success' | 'error' | 'partial';
  error?: string;
  metadata?: {
    execution_time_ms?: number;
    tokens_used?: number;
    files_processed?: number;
  };
}

export interface WsCitation {
  type: 'citation';
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

// Union of all server messages we handle (EXTENDED)
export type WsServerMessage =
  | WsHello
  | WsReady
  | WsHeartbeat
  | WsChunk
  | WsComplete
  | WsStatus
  | WsAside
  | WsError
  | WsDone
  | WsTypingAck
  | WsToolResult
  | WsCitation
  | WsToolCallStarted
  | WsToolCallCompleted
  | WsToolCallFailed
  | WsImageGenerated;

// ===== Client → Server =====

export interface MessageSelection {
  start_line: number;
  end_line: number;
  text?: string;
}

export interface MessageMetadata {
  file_path?: string;
  repo_id?: string;
  attachment_id?: string;
  language?: string;
  selection?: MessageSelection;
  // NEW: Tool invocation metadata
  tool_request?: {
    tool_type: string;
    parameters: any;
  };
}

// Enhanced client message with session support
export interface WsClientMessage {
  type: 'message' | 'typing' | 'chat' | 'command';
  content?: string;
  persona?: string | null;     // deprecated
  active?: boolean;
  session_id?: string | null;  // REQUIRED for thread continuity
  project_id?: string | null;
  metadata?: MessageMetadata;
  // NEW: Previous response linking for conversation continuity
  previous_response_id?: string | null;
  thread_id?: string | null;
}

// NEW: Tool type mappings for backend compatibility
export const TOOL_TYPE_MAPPING: Record<string, string> = {
  // Backend → Frontend mappings
  'web_search_preview': 'web_search',
  'code_interpreter': 'code_interpreter',
  'file_search': 'file_search',
  'image_generation': 'image_generation',
  // Add more mappings as needed
};

// NEW: Helper function to normalize tool types
export const normalizeToolType = (backendType: string): string => {
  return TOOL_TYPE_MAPPING[backendType] || backendType;
};

// NEW: Tool status types
export type ToolStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

// NEW: Feature flag configuration interface
export interface FeatureFlags {
  enable_chat_tools: boolean;
  enable_file_search: boolean;
  enable_image_generation: boolean;
  enable_web_search: boolean;
  enable_code_interpreter: boolean;
}
