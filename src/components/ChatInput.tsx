// src/components/ChatInput.tsx
import React, { useState, useRef, KeyboardEvent, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

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
  const [isProcessing, setIsProcessing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Keep focus in textarea after sending
  useEffect(() => {
    if (!isProcessing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isProcessing]);

  const handleSend = async () => {
    if (!content.trim() || disabled || isProcessing) return;
    
    const messageToSend = content.trim();
    setContent('');
    setIsProcessing(true);
    
    try {
      await onSend(messageToSend);
    } catch (error) {
      console.error('Failed to send message:', error);
      setContent(messageToSend);
    } finally {
      setIsProcessing(false);
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
    
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  };

  const isInputDisabled = disabled || isProcessing;

  return (
    <div className="relative">
      <div className="flex items-end space-x-3 bg-slate-800 rounded-lg border border-slate-600 p-3">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isInputDisabled}
          className="flex-1 bg-transparent text-slate-100 placeholder-slate-400 resize-none border-none outline-none min-h-[24px] max-h-[200px]"
          rows={1}
          autoFocus
        />
        
        <button
          onClick={handleSend}
          disabled={isInputDisabled || !content.trim()}
          className={`
            px-4 py-2 rounded-md font-medium transition-colors flex items-center gap-2
            ${isInputDisabled || !content.trim()
              ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
            }
          `}
        >
          {isProcessing && <Loader2 size={16} className="animate-spin" />}
          {isProcessing ? 'Sending...' : 'Send'}
        </button>
      </div>
      
      {isInputDisabled && !isProcessing && (
        <div className="absolute bottom-1 left-3 text-xs text-slate-400">
          Waiting for connection...
        </div>
      )}
    </div>
  );
};
