// src/components/ChatInput.tsx
// PHASE 2: Enhanced ChatInput with tool invocation buttons
// Key additions:
// 1. File Search and Image Generation buttons
// 2. Tool modals for user input
// 3. Proper WebSocket message construction for tool invocation
// 4. Feature flag support to show/hide tool buttons

import React, { useState, useRef } from 'react';
import { Send, Search, Image, File, Code } from 'lucide-react';
import clsx from 'clsx';
import { FileSearchModal } from './modals/FileSearchModal';
import { ImageGenerationModal } from './modals/ImageGenerationModal';

interface ChatInputProps {
  onSend: (message: string) => void;
  onToolInvoke: (toolType: string, payload: any) => void;
  disabled: boolean;
  isDark: boolean;
  featureFlags?: {
    enable_chat_tools?: boolean;
    enable_file_search?: boolean;
    enable_image_generation?: boolean;
    enable_web_search?: boolean;
    enable_code_interpreter?: boolean;
  };
}

export const ChatInput: React.FC<ChatInputProps> = ({ 
  onSend, 
  onToolInvoke,
  disabled, 
  isDark,
  featureFlags = {}
}) => {
  const [input, setInput] = useState('');
  const [showFileSearchModal, setShowFileSearchModal] = useState(false);
  const [showImageGenModal, setShowImageGenModal] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    if (!input.trim() || disabled) return;
    
    onSend(input);
    setInput('');
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Tool invocation handlers
  const handleFileSearch = (query: string, filters?: any) => {
    onToolInvoke('file_search', { query, ...filters });
    setShowFileSearchModal(false);
  };

  const handleImageGeneration = (prompt: string, options?: any) => {
    onToolInvoke('image_generation', { prompt, ...options });
    setShowImageGenModal(false);
  };

  // Check if tools are available
  const toolsEnabled = featureFlags.enable_chat_tools ?? true;
  const fileSearchEnabled = toolsEnabled && (featureFlags.enable_file_search ?? true);
  const imageGenEnabled = toolsEnabled && (featureFlags.enable_image_generation ?? true);
  const webSearchEnabled = toolsEnabled && (featureFlags.enable_web_search ?? true);
  const codeInterpreterEnabled = toolsEnabled && (featureFlags.enable_code_interpreter ?? true);

  return (
    <div className="relative z-10 p-4 border-t border-gray-700/50 dark:border-gray-700/50">
      {/* Tool buttons row (if any tools are enabled) */}
      {toolsEnabled && (fileSearchEnabled || imageGenEnabled || webSearchEnabled || codeInterpreterEnabled) && (
        <div className="flex gap-2 mb-2 flex-wrap">
          {fileSearchEnabled && (
            <button
              onClick={() => setShowFileSearchModal(true)}
              disabled={disabled}
              className={clsx(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors',
                disabled
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : isDark
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              )}
              title="Search files in project"
            >
              <File size={16} />
              Search Files
            </button>
          )}
          
          {imageGenEnabled && (
            <button
              onClick={() => setShowImageGenModal(true)}
              disabled={disabled}
              className={clsx(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors',
                disabled
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : isDark
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              )}
              title="Generate image"
            >
              <Image size={16} />
              Generate Image
            </button>
          )}

          {webSearchEnabled && (
            <button
              onClick={() => onSend('/web_search ')}
              disabled={disabled}
              className={clsx(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors',
                disabled
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : isDark
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              )}
              title="Search the web"
            >
              <Search size={16} />
              Web Search
            </button>
          )}

          {codeInterpreterEnabled && (
            <button
              onClick={() => onSend('/code ')}
              disabled={disabled}
              className={clsx(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors',
                disabled
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : isDark
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              )}
              title="Run code"
            >
              <Code size={16} />
              Code Interpreter
            </button>
          )}
        </div>
      )}

      {/* Main input row */}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={disabled ? "Waiting for connection..." : "Say something..."}
          disabled={disabled}
          className={clsx(
            'flex-1 px-4 py-2 rounded-lg transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-purple-500',
            isDark
              ? 'bg-gray-800 text-gray-100 placeholder-gray-500'
              : 'bg-white text-gray-900 placeholder-gray-400 shadow-sm'
          )}
        />
        <button
          onClick={handleSubmit}
          disabled={disabled || !input.trim()}
          className={clsx(
            'p-2 rounded-lg transition-all',
            disabled || !input.trim()
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-purple-600 hover:bg-purple-700 text-white'
          )}
        >
          <Send size={20} />
        </button>
      </div>

      {/* Tool Modals */}
      {showFileSearchModal && (
        <FileSearchModal
          onSubmit={handleFileSearch}
          onClose={() => setShowFileSearchModal(false)}
          isDark={isDark}
        />
      )}

      {showImageGenModal && (
        <ImageGenerationModal
          onSubmit={handleImageGeneration}
          onClose={() => setShowImageGenModal(false)}
          isDark={isDark}
        />
      )}
    </div>
  );
};
