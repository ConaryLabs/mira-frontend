// src/types/websocket.ts

// ===== Server → Client =====

export interface WsConnectionReady {
  type: 'connection_ready';
}

export interface WsStreamChunk {
  type: 'stream_chunk';
  text: string;
}

export interface WsStreamEnd {
  type: 'stream_end';
}

export interface WsComplete {
  type: 'complete';
  mood?: string;
  salience?: number;
  tags?: string[];
}

export interface WsStatus {
  type: 'status';
  message: string;
  detail?: string;
}

export interface WsError {
  type: 'error';
  message: string;
  code: string;
}

export interface WsPong {
  type: 'pong';
}

export interface WsDone {
  type: 'done';
}

export interface WsData {
  type: 'data';
  data: any;
  request_id?: string;
}

// Tool-related messages
export interface WsToolResult {
  type: 'tool_result';
  tool_id?: string;
  tool_type: string;
  tool_name?: string;
  data: any;
  status?: 'success' | 'error' | 'partial';
  error?: string;
}

export interface WsImageGenerated {
  type: 'image_generated';
  tool_id?: string;
  prompt: string;
  image_url: string;
  image_urls?: string[];
}

// Union of all server messages
export type WsServerMessage =
  | WsConnectionReady
  | WsStreamChunk
  | WsStreamEnd
  | WsComplete
  | WsStatus
  | WsError
  | WsPong
  | WsDone
  | WsData
  | WsToolResult
  | WsImageGenerated;

// ===== Client → Server =====

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

// Client message types matching your backend's WsClientMessage enum
export interface WsChatMessage {
  type: 'Chat';
  content: string;
  project_id: string | null;
  metadata?: MessageMetadata;
}

export interface WsCommandMessage {
  type: 'Command';
  command: string;
  args?: any;
}

export interface WsProjectCommand {
  type: 'ProjectCommand';
  method: string;
  params: any;
}

export interface WsGitCommand {
  type: 'GitCommand';
  method: string;
  params: any;
}

export interface WsMemoryCommand {
  type: 'MemoryCommand';
  method: string;
  params: any;
}

export interface WsFileSystemCommand {
  type: 'FileSystemCommand';
  method: string;
  params: any;
}

export interface WsFileTransfer {
  type: 'FileTransfer';
  operation: string;
  data: any;
}

export interface WsStatusMessage {
  type: 'Status';
  message: string;
}

export interface WsTypingMessage {
  type: 'Typing';
  active: boolean;
}

// Union type for all client messages
export type WsClientMessage =
  | WsChatMessage
  | WsCommandMessage
  | WsProjectCommand
  | WsGitCommand
  | WsMemoryCommand
  | WsFileSystemCommand
  | WsFileTransfer
  | WsStatusMessage
  | WsTypingMessage;

// Helper functions to create properly formatted messages
export function createChatMessage(
  content: string,
  projectId: string | null = null,
  metadata?: MessageMetadata
): WsChatMessage {
  return {
    type: 'Chat',
    content,
    project_id: projectId,
    metadata
  };
}

export function createProjectCommand(method: string, params: any): WsProjectCommand {
  return {
    type: 'ProjectCommand',
    method,
    params
  };
}

export function createGitCommand(method: string, params: any): WsGitCommand {
  return {
    type: 'GitCommand',
    method,
    params
  };
}

export function createMemoryCommand(method: string, params: any): WsMemoryCommand {
  return {
    type: 'MemoryCommand',
    method,
    params
  };
}

export function createFileSystemCommand(method: string, params: any): WsFileSystemCommand {
  return {
    type: 'FileSystemCommand',
    method,
    params
  };
}

export function createStatusMessage(message: string): WsStatusMessage {
  return {
    type: 'Status',
    message
  };
}

// Feature flags
export interface FeatureFlags {
  enable_chat_tools: boolean;
  enable_file_search: boolean;
  enable_image_generation: boolean;
  enable_web_search: boolean;
  enable_code_interpreter: boolean;
}
