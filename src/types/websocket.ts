export interface WsChunk {
  type: 'chunk';
  content: string;
  persona: string;
  mood?: string;
}

export interface WsAside {
  type: 'aside';
  emotional_cue: string;
  intensity?: number;
}

export interface WsPersonaUpdate {
  type: 'persona_update';
  persona: string;
  mood?: string;
  transition_note?: string;
}

export interface WsMemoryStats {
  type: 'memory_stats';
  total_memories: number;
  high_salience_count: number;
  avg_salience: number;
  mood_distribution: Record<string, number>;
}

export interface WsError {
  type: 'error';
  message: string;
  code?: string;
}

export interface WsDone {
  type: 'done';
}

export type WsServerMessage = 
  | WsChunk 
  | WsAside 
  | WsPersonaUpdate 
  | WsMemoryStats 
  | WsError 
  | WsDone;

export interface WsClientMessage {
  type: 'message' | 'typing' | 'switch_persona' | 'get_memory_stats';
  content?: string;
  persona?: string | null;
  active?: boolean;
  smooth_transition?: boolean;
  session_id?: string | null;
}
