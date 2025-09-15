// src/hooks/useToolHandlers.ts
// PHASE 2: Extracted tool handling and feature flag management (~100 lines)
// Responsibilities: Tool invocation, feature flags

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
