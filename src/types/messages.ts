// src/types/messages.ts

// Tool result types
export interface ToolResult {
  type: 'web_search' | 'code_interpreter' | 'file_search' | 'image_generation';
  data: any;
}

export interface Citation {
  file_id: string;
  filename: string;
  url?: string;
  snippet?: string;
}

// Main message interface
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
  toolResults?: ToolResult[];  // Added for Phase 4
  citations?: Citation[];       // Added for Phase 4
}

// Aside type for emotional cues
export interface Aside {
  id: string;
  cue: string;
  intensity: number;
  timestamp: Date;
}

// Session info
export interface SessionInfo {
  id: string;
  userId?: string;
  startedAt: Date;
  messageCount: number;
}
