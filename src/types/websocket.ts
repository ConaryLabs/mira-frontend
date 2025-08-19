// src/types/websocket.ts
export interface WsChunk {
  type: 'chunk';
  content: string;
  mood?: string;  // Only mood is visible, not persona
}

export interface WsComplete {
  type: 'complete';
  mood?: string;
  salience?: number;
  tags?: string[];
}

export interface WsStatus {
  type: 'status';
  message?: string;
  status_message?: string;
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
}

export interface WsDone {
  type: 'done';
}

export interface WsPing {
  type: 'ping';
}

export interface WsPong {
  type: 'pong';
}

// Tool-related message types (Phase 4)
export interface WsToolResult {
  type: 'tool_result';
  tool_type: string;
  data: any;
}

export interface WsCitation {
  type: 'citation';
  file_id: string;
  filename: string;
  url?: string;
  snippet?: string;
}

// REMOVED WsArtifact - backend never sends this
export type WsServerMessage = 
  | WsChunk 
  | WsComplete    // ADDED - for metadata
  | WsStatus      // ADDED - for status updates
  | WsAside 
  | WsError 
  | WsDone
  | WsToolResult  // ADDED - for tool results
  | WsCitation;   // ADDED - for citations

// Enhanced client message with metadata support
export interface MessageMetadata {
  file_path?: string;
  repo_id?: string;
  attachment_id?: string;
  language?: string;
  selection?: {
    start_line: number;
    end_line: number;
    text?: string;
  };
}

export interface WsClientMessage {
  type: 'message' | 'typing' | 'chat';  // Added 'chat' for enhanced messages
  content?: string;
  persona?: string | null;  // DEPRECATED - will be ignored by backend
  active?: boolean;
  session_id?: string | null;
  project_id?: string | null;  // Added for project context
  metadata?: MessageMetadata;  // ADDED - for file context
}
