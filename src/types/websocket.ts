// src/types/websocket.ts

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
}

export interface WsStatus {
  type: 'status';
  // backend can send either message or status_message; support both
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

export interface WsTypingAck {
  type: 'typing_ack';
}

// Tool-related message types
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

// Union of all server messages we handle
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
  | WsCitation;

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
}

// Enhanced client message; backend treats 'persona' as deprecated/ignored
export interface WsClientMessage {
  type: 'message' | 'typing' | 'chat';
  content?: string;
  persona?: string | null;     // deprecated
  active?: boolean;
  session_id?: string | null;
  project_id?: string | null;
  metadata?: MessageMetadata;
}
