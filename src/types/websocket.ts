// src/types/websocket.ts
export interface WsChunk {
  type: 'chunk';
  content: string;
  mood?: string;  // Only mood is visible, not persona
}

export interface WsAside {
  type: 'aside';
  emotional_cue: string;
  intensity?: number;
}

export interface WsArtifact {
  type: 'artifact';
  artifact: {
    id: string;
    name: string;
    content: string;
    artifact_type: 'code' | 'document' | 'data';
    language?: string;
  };
}

// REMOVED: WsPersonaUpdate - personas change invisibly
// REMOVED: WsMemoryStats - too mechanical for natural conversation

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

export type WsServerMessage = 
  | WsChunk 
  | WsAside 
  | WsArtifact
  | WsError 
  | WsDone;  // No PersonaUpdate or MemoryStats

export interface WsClientMessage {
  type: 'message' | 'typing';  // No switch_persona or get_memory_stats
  content?: string;
  persona?: string | null;  // DEPRECATED - will be ignored by backend
  active?: boolean;
  session_id?: string | null;
  project_id?: string | null;  // Added for project context
}
