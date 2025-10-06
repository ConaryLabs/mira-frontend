// src/components/ChatInput.tsx
// FIXED: Chat works without project - project just adds context

import React, { useRef, KeyboardEvent, useCallback, useEffect } from 'react';
import { Send } from 'lucide-react';
import { useWebSocketStore } from '../stores/useWebSocketStore';
import { useAppState } from '../stores/useAppState';
import { useUIStore, useInputContent, useIsWaiting } from '../stores/useUIStore';
import { useChatMessaging } from '../hooks/useChatMessaging';

export const ChatInput: React.FC = () => {
  const content = useInputContent();
  const isWaiting = useIsWaiting();
  const setInputContent = useUIStore(state => state.setInputContent);
  const setWaiting = useUIStore(state => state.setWaitingForResponse);
  const clearInput = useUIStore(state => state.clearInput);
  
  const connectionState = useWebSocketStore(state => state.connectionState);
  const currentProject = useAppState(state => state.currentProject);
  
  const { handleSend: sendMessage } = useChatMessaging();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(async () => {
    if (!content.trim() || isWaiting || connectionState !== 'connected') return;
    
    setWaiting(true);
    await sendMessage(content);
    clearInput();
    setWaiting(false);
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [content, isWaiting, connectionState, sendMessage, clearInput, setWaiting]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputContent(e.target.value);
    
    // Auto-resize
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [setInputContent]);

  // Auto-focus when connected (removed project check)
  useEffect(() => {
    if (connectionState === 'connected' && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [connectionState]);

  // FIXED: Only disabled when disconnected or waiting, NOT when no project
  const isDisabled = connectionState !== 'connected' || isWaiting;

  return (
    <div className="flex gap-2 items-end w-full">
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={
            connectionState !== 'connected'
              ? "Connecting to Mira..."
              : currentProject
              ? `Chat with Mira about ${currentProject.name}... (Enter to send, Shift+Enter for new line)`
              : "Chat with Mira... (Enter to send, Shift+Enter for new line)"
          }
          disabled={isDisabled}
          className="w-full bg-slate-800 text-slate-100 placeholder-slate-400 rounded-lg px-4 py-2 resize-none border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed min-h-[42px] max-h-[200px]"
          rows={1}
        />
        {currentProject && (
          <div className="absolute bottom-full left-0 mb-1 text-xs text-slate-500">
            Context: {currentProject.name}
          </div>
        )}
      </div>
      
      <button
        onClick={handleSend}
        disabled={!content.trim() || isDisabled}
        className={`
          p-3 rounded-lg transition-colors flex-shrink-0
          ${!content.trim() || isDisabled
            ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
          }
        `}
        title="Send message (Enter)"
      >
        <Send className="w-5 h-5" />
      </button>
    </div>
  );
};
