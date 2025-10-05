// src/components/ChatInput.tsx
// PERFORMANCE FIX: Uses UIStore, no parent re-renders

import React, { useRef, KeyboardEvent, useCallback, useEffect } from 'react';
import { Send, AlertCircle } from 'lucide-react';
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

  // Auto-focus when project selected and connected
  useEffect(() => {
    if (currentProject && connectionState === 'connected' && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [currentProject, connectionState]);

  const isDisabled = connectionState !== 'connected' || !currentProject || isWaiting;

  return (
    <div className="flex gap-2 items-end">
      {!currentProject ? (
        <div className="flex-1 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-yellow-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>Select or create a project to start chatting</span>
        </div>
      ) : (
        <>
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={
                connectionState !== 'connected'
                  ? "Connecting to Mira..."
                  : "Message Mira... (Enter to send, Shift+Enter for new line)"
              }
              disabled={isDisabled}
              className="w-full bg-slate-800 text-slate-100 placeholder-slate-400 rounded-lg px-4 py-2 resize-none border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed min-h-[42px] max-h-[200px]"
              rows={1}
            />
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
        </>
      )}
    </div>
  );
};
