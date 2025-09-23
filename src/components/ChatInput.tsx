// src/components/ChatInput.tsx
import React, { useState, useRef, KeyboardEvent, useEffect } from 'react';
import { Send } from 'lucide-react';

interface ChatInputProps {
  onSend: (content: string) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({ 
  onSend, 
  disabled = false, 
  placeholder = "Message Mira..." 
}) => {
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Keep focus in textarea
  useEffect(() => {
    if (!disabled && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [disabled]);

  const handleSend = async () => {
    if (!content.trim() || disabled) return;
    
    const messageToSend = content.trim();
    setContent(''); // Clear immediately for better UX
    
    try {
      await onSend(messageToSend);
    } catch (error) {
      console.error('Failed to send message:', error);
      // Restore content on error
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
    
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
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
            px-4 py-2 rounded-md font-medium transition-colors flex items-center gap-2
            ${canSend
              ? 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
              : 'bg-slate-600 text-slate-400 cursor-not-allowed'
            }
          `}
        >
          <Send size={16} />
          Send
        </button>
      </div>
      
      {/* No status text needed - ThinkingIndicator handles all feedback */}
    </div>
  );
};
