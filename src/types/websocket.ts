// src/types/websocket.ts

export interface MessageMetadata {
  file_path?: string;
  attachment_id?: string;
  language?: string;
  [key: string]: any;
}

// Client message types
export interface WsChatMessage {
  type: 'chat';
  content: string;
  project_id: string | null;
  metadata?: MessageMetadata;
}

export interface WsCommandMessage {
  type: 'command';
  command: string;
  args?: any;
}

export interface WsStatusMessage {
  type: 'status';
  message: string;
}

export interface WsTypingMessage {
  type: 'typing';
  active: boolean;
}

export interface WsProjectCommand {
  type: 'project_command';
  method: string;
  params: any;
}

export interface WsGitCommand {
  type: 'git_command';
  method: string;
  params: any;
}

export interface WsMemoryCommand {
  type: 'memory_command';
  method: string;
  params: any;
}

export interface WsFileSystemCommand {
  type: 'file_system_command';
  method: string;
  params: any;
}

export interface WsFileTransferMessage {
  type: 'file_transfer';
  operation: string;
  data: any;
}

export type WsClientMessage =
  | WsChatMessage
  | WsCommandMessage
  | WsStatusMessage
  | WsTypingMessage
  | WsProjectCommand
  | WsGitCommand
  | WsMemoryCommand
  | WsFileSystemCommand
  | WsFileTransferMessage;

// Server message types
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
  detail?: string | null;
}

export interface WsError {
  type: 'error';
  message: string;
  code?: string;
}

export interface WsData {
  type: 'data';
  data: any;
  request_id?: string;
}

export interface WsConnectionReady {
  type: 'connection_ready';
}

export interface WsPong {
  type: 'pong';
}

export interface WsDone {
  type: 'done';
}

export type WsServerMessage =
  | WsStreamChunk
  | WsStreamEnd
  | WsComplete
  | WsStatus
  | WsError
  | WsData
  | WsConnectionReady
  | WsPong
  | WsDone;

// Helper functions
export function createChatMessage(
  content: string,
  sessionId: string,
  projectId: string | null,
  metadata?: MessageMetadata
): WsChatMessage {
  return {
    type: 'chat',
    content,
    project_id: projectId,
    metadata: metadata || {}
  };
}

export function createProjectCommand(method: string, params: any): WsProjectCommand {
  return {
    type: 'project_command',
    method,
    params
  };
}

export function createGitCommand(method: string, params: any): WsGitCommand {
  return {
    type: 'git_command',
    method,
    params
  };
}

export function createMemoryCommand(method: string, params: any): WsMemoryCommand {
  return {
    type: 'memory_command',
    method,
    params
  };
}

export function createFileSystemCommand(method: string, params: any): WsFileSystemCommand {
  return {
    type: 'file_system_command',
    method,
    params
  };
}

export function createStatusMessage(message: string): WsStatusMessage {
  return {
    type: 'status',
    message
  };
}

export interface FeatureFlags {
  enable_chat_tools: boolean;
  enable_file_search: boolean;
  enable_image_generation: boolean;
  enable_web_search: boolean;
  enable_code_interpreter: boolean;
}
