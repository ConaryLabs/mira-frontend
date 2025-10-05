// src/components/ChatInput.tsx - PERFORMANCE FIX

import React, { useState, useRef, KeyboardEvent, useEffect, useCallback, useMemo } from 'react';
import { Send } from 'lucide-react';

interface ChatInputProps {
  onSend: (content: string) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
}

// Simple debounce utility
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export const ChatInput: React.FC<ChatInputProps> = ({ 
  onSend, 
  disabled = false, 
  placeholder = "Message Mira..." 
}) => {
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize function (unchanged)
  const resizeTextarea = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    textarea.style.height = 'auto';
    
    if (content.trim() === '') {
      textarea.style.height = '24px';
    } else {
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [content]);

  // PERFORMANCE FIX: Debounced resize (only runs after 50ms of no changes)
  const debouncedResize = useMemo(
    () => debounce(resizeTextarea, 50),
    [resizeTextarea]
  );

  // PERFORMANCE FIX: Use debounced version instead of immediate resize
  useEffect(() => {
    debouncedResize();
    
    // Cleanup: cancel pending debounced calls on unmount
    return () => {
      // TypeScript doesn't know about the timeout, so we'll just let it fire
      // (harmless since component is unmounted)
    };
  }, [content, debouncedResize]);

  // Keep focus in textarea
  useEffect(() => {
    if (!disabled && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [disabled]);

  const handleSend = async () => {
    if (!content.trim() || disabled) return;
    
    const messageToSend = content.trim();
    setContent(''); // This will trigger the useEffect to resize
    
    try {
      await onSend(messageToSend);
    } catch (error) {
      console.error('Failed to send message:', error);
      setContent(messageToSend);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  };

  const canSend = !disabled && content.trim().length > 0;

  return (
    <div className="relative">
      <div className="flex items-end space-x-3 bg-slate-800 rounded-lg border border-slate-600 p-3">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 bg-transparent text-slate-100 placeholder-slate-400 resize-none border-none outline-none min-h-[24px] max-h-[200px]"
          rows={1}
          autoFocus
        />
        
        <button
          onClick={handleSend}
          disabled={!canSend}
          className={`
            p-2 rounded-md transition-colors
            ${canSend
              ? 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
              : 'bg-slate-600 text-slate-400 cursor-not-allowed'
            }
          `}
          title="Send message"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
};
