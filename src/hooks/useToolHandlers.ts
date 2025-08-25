// src/hooks/useToolHandlers.ts
// PHASE 2: Extracted tool handling and feature flag management (~150 lines)
// Responsibilities: Tool invocation, feature flags, tool execution tracking

import { useState, useCallback } from 'react';
import type { 
  WsClientMessage,
  MessageMetadata,
  FeatureFlags
} from '../types/websocket';

export interface ToolState {
  toolsActive: boolean;
  featureFlags: FeatureFlags;
  backendConfig: any;
}

export interface ToolActions {
  handleToolInvoke: (toolType: string, payload: any) => void;
  setFeatureFlags: (flags: FeatureFlags) => void;
  setBackendConfig: (config: any) => void;
}

export function useToolHandlers(
  sendMessage: (message: WsClientMessage) => void,
  sessionId: string,
  currentProjectId: string | null,
  onUserMessage: (content: string) => void
) {
  // Tool state
  const [toolsActive, setToolsActive] = useState(false);
  const [backendConfig, setBackendConfig] = useState<any>(null);
  
  // Feature flags state
  const [featureFlags, setFeatureFlags] = useState<FeatureFlags>({
    enable_chat_tools: true,
    enable_file_search: true,
    enable_image_generation: true,
    enable_web_search: true,
    enable_code_interpreter: true,
  });

  // Tool invocation handler
  const handleToolInvoke = useCallback((toolType: string, payload: any) => {
    if (!sendMessage) {
      console.error('Cannot invoke tool: no send function available');
      return;
    }

    let content = '';
    let toolMessage = '';

    switch (toolType) {
      case 'file_search': {
        const { query, file_extensions, max_results, include_content } = payload;
        toolMessage = `Search files for: "${query}"`;
        content = `/search ${query}`;
        
        if (file_extensions?.length) {
          content += ` --ext ${file_extensions.join(',')}`;
          toolMessage += ` (${file_extensions.join(', ')} files)`;
        }
        
        if (max_results && max_results !== 20) {
          content += ` --limit ${max_results}`;
        }
        
        if (!include_content) {
          content += ` --no-content`;
        }
        break;
      }
      
      case 'image_generation': {
        const { prompt, size, style, quality, n } = payload;
        toolMessage = `Generate ${n > 1 ? `${n} images` : 'image'}: "${prompt}"`;
        content = `/image ${prompt}`;
        
        if (size && size !== '1024x1024') {
          content += ` --size ${size}`;
          toolMessage += ` (${size})`;
        }
        
        if (style && style !== 'vivid') {
          content += ` --style ${style}`;
        }
        
        if (quality && quality !== 'standard') {
          content += ` --quality ${quality}`;
        }
        
        if (n && n > 1) {
          content += ` --count ${n}`;
        }
        break;
      }
      
      default:
        console.warn('[useToolHandlers] Unknown tool type:', toolType);
        return;
    }

    // Add user message showing the tool invocation
    onUserMessage(toolMessage);
    setToolsActive(true);

    // Send tool command to backend
    const metadata: MessageMetadata = {};
    const wsMessage: WsClientMessage = {
      type: 'chat',
      content: content.trim(),
      session_id: sessionId,
      project_id: currentProjectId,
      metadata
    };

    console.log(`[useToolHandlers] Sending ${toolType} tool message:`, wsMessage);
    sendMessage(wsMessage);
  }, [sendMessage, sessionId, currentProjectId, onUserMessage]);

  // Reset tools active state
  const resetToolsActive = useCallback(() => {
    setToolsActive(false);
  }, []);

  const state: ToolState = {
    toolsActive,
    featureFlags,
    backendConfig
  };

  const actions: ToolActions = {
    handleToolInvoke,
    setFeatureFlags,
    setBackendConfig
  };

  return { 
    ...state, 
    ...actions,
    resetToolsActive
  };
}

export interface ToolState {
  toolsActive: boolean;
  toolExecutions: ToolExecution[];
  featureFlags: FeatureFlags;
  backendConfig: any;
}

export interface ToolActions {
  handleToolInvoke: (toolType: string, payload: any) => void;
  setFeatureFlags: (flags: FeatureFlags) => void;
  setBackendConfig: (config: any) => void;
  handleToolCallStarted: (msg: WsToolCallStarted) => void;
  handleToolCallCompleted: (msg: WsToolCallCompleted) => void;
  handleToolCallFailed: (msg: WsToolCallFailed) => void;
  handleImageGenerated: (msg: WsImageGenerated) => void;
}

export function useToolHandlers(
  sendMessage: (message: WsClientMessage) => void,
  sessionId: string,
  currentProjectId: string | null,
  onUserMessage: (content: string) => void
) {
  // Tool state
  const [toolsActive, setToolsActive] = useState(false);
  const [toolExecutions, setToolExecutions] = useState<ToolExecution[]>([]);
  const [backendConfig, setBackendConfig] = useState<any>(null);
  
  // Feature flags state
  const [featureFlags, setFeatureFlags] = useState<FeatureFlags>({
    enable_chat_tools: true,
    enable_file_search: true,
    enable_image_generation: true,
    enable_web_search: true,
    enable_code_interpreter: true,
  });

  // Refs for pending tool operations
  const pendingToolExecutions = useRef<ToolExecution[]>([]);

  // Tool invocation handler
  const handleToolInvoke = useCallback((toolType: string, payload: any) => {
    if (!sendMessage) {
      console.error('Cannot invoke tool: no send function available');
      return;
    }

    let content = '';
    let toolMessage = '';

    switch (toolType) {
      case 'file_search': {
        const { query, file_extensions, max_results, include_content } = payload;
        toolMessage = `Search files for: "${query}"`;
        content = `/search ${query}`;
        
        if (file_extensions?.length) {
          content += ` --ext ${file_extensions.join(',')}`;
          toolMessage += ` (${file_extensions.join(', ')} files)`;
        }
        
        if (max_results && max_results !== 20) {
          content += ` --limit ${max_results}`;
        }
        
        if (!include_content) {
          content += ` --no-content`;
        }
        break;
      }
      
      case 'image_generation': {
        const { prompt, size, style, quality, n } = payload;
        toolMessage = `Generate ${n > 1 ? `${n} images` : 'image'}: "${prompt}"`;
        content = `/image ${prompt}`;
        
        if (size && size !== '1024x1024') {
          content += ` --size ${size}`;
          toolMessage += ` (${size})`;
        }
        
        if (style && style !== 'vivid') {
          content += ` --style ${style}`;
        }
        
        if (quality && quality !== 'standard') {
          content += ` --quality ${quality}`;
        }
        
        if (n && n > 1) {
          content += ` --count ${n}`;
        }
        break;
      }
      
      default:
        console.warn('[useToolHandlers] Unknown tool type:', toolType);
        return;
    }

    // Add user message showing the tool invocation
    onUserMessage(toolMessage);

    // Send tool command to backend
    const metadata: MessageMetadata = {};
    const wsMessage: WsClientMessage = {
      type: 'chat',
      content: content.trim(),
      session_id: sessionId,
      project_id: currentProjectId,
      metadata
    };

    console.log(`[useToolHandlers] Sending ${toolType} tool message:`, wsMessage);
    sendMessage(wsMessage);
  }, [sendMessage, sessionId, currentProjectId, onUserMessage]);

  // Tool event handlers
  const handleToolCallStarted = useCallback((msg: WsToolCallStarted) => {
    console.log('[useToolHandlers] Tool call started:', msg.tool_type);
    
    const execution: ToolExecution = {
      id: msg.tool_id,
      tool_type: normalizeToolType(msg.tool_type),
      tool_name: msg.tool_name,
      status: 'running',
      started_at: new Date(),
      parameters: msg.parameters,
    };
    
    setToolExecutions(prev => [...prev, execution]);
    pendingToolExecutions.current.push(execution);
    setToolsActive(true);
  }, []);

  const handleToolCallCompleted = useCallback((msg: WsToolCallCompleted) => {
    console.log('[useToolHandlers] Tool call completed:', msg.tool_type);
    
    setToolExecutions(prev => prev.map(exec => 
      exec.id === msg.tool_id 
        ? { ...exec, status: 'completed', completed_at: new Date(), result: msg.result }
        : exec
    ));
    
    pendingToolExecutions.current = pendingToolExecutions.current.map(exec =>
      exec.id === msg.tool_id
        ? { ...exec, status: 'completed', completed_at: new Date(), result: msg.result }
        : exec
    );
  }, []);

  const handleToolCallFailed = useCallback((msg: WsToolCallFailed) => {
    console.log('[useToolHandlers] Tool call failed:', msg.tool_type, msg.error);
    
    setToolExecutions(prev => prev.map(exec => 
      exec.id === msg.tool_id 
        ? { ...exec, status: 'failed', completed_at: new Date(), error: msg.error }
        : exec
    ));
    
    pendingToolExecutions.current = pendingToolExecutions.current.map(exec =>
      exec.id === msg.tool_id
        ? { ...exec, status: 'failed', completed_at: new Date(), error: msg.error }
        : exec
    );
  }, []);

  const handleImageGenerated = useCallback((msg: WsImageGenerated) => {
    console.log('[useToolHandlers] Image generated');
    // Image generation results are handled by the main message handler
    // This is mainly for tracking/logging purposes
  }, []);

  // Reset tools active state
  const resetToolsActive = useCallback(() => {
    setToolsActive(false);
  }, []);

  const state: ToolState = {
    toolsActive,
    toolExecutions,
    featureFlags,
    backendConfig
  };

  const actions: ToolActions = {
    handleToolInvoke,
    setFeatureFlags,
    setBackendConfig,
    handleToolCallStarted,
    handleToolCallCompleted,
    handleToolCallFailed,
    handleImageGenerated
  };

  return { 
    ...state, 
    ...actions,
    resetToolsActive
  };
}
