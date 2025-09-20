// src/components/ChatInput.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Mic, Square } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  isStreaming?: boolean;
  placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({ 
  onSend, 
  disabled = false, 
  isStreaming = false,
  placeholder = "Message Mira..." 
}) => {
  const [message, setMessage] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'inherit';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [message]);

  // Keep focus when not disabled
  useEffect(() => {
    if (!disabled && textareaRef.current) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        if (textareaRef.current && document.activeElement !== textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 100);
    }
  }, [disabled, isStreaming]);

  const handleSubmit = () => {
    if (!message.trim() || disabled) return;
    
    onSend(message.trim());
    setMessage('');
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'inherit';
    }
    
    // Keep focus after sending
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSubmit();
    }
    
    // Escape to stop streaming (future feature)
    if (e.key === 'Escape' && isStreaming) {
      // TODO: Implement stream interruption
      console.log('TODO: Stop streaming');
    }
  };

  const handleCompositionStart = () => setIsComposing(true);
  const handleCompositionEnd = () => setIsComposing(false);

  const handleStopStreaming = () => {
    // TODO: Implement stopping the stream
    console.log('TODO: Stop streaming');
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className={`relative flex items-end gap-2 p-3 border rounded-lg focus-within:border-blue-500 transition-colors ${
        isStreaming 
          ? 'border-blue-400 bg-slate-800/80' 
          : 'border-slate-600 bg-slate-800'
      }`}>
        {/* Attachment button (future feature) */}
        <button 
          type="button"
          className="flex-shrink-0 p-2 text-slate-400 hover:text-slate-300 rounded-md hover:bg-slate-700 transition-colors"
          title="Attach file"
        >
          <Paperclip size={18} />
        </button>

        {/* Text input */}
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className={`flex-1 min-h-[44px] max-h-[200px] px-0 py-2 bg-transparent border-0 outline-none resize-none transition-colors ${
            disabled 
              ? 'text-slate-500 placeholder-slate-600 cursor-not-allowed'
              : isStreaming
              ? 'text-slate-200 placeholder-slate-400'
              : 'text-slate-100 placeholder-slate-500'
          }`}
          style={{ lineHeight: '1.5' }}
        />

        {/* Voice input button (future feature) */}
        <button 
          type="button"
          className="flex-shrink-0 p-2 text-slate-400 hover:text-slate-300 rounded-md hover:bg-slate-700 transition-colors"
          title="Voice message"
        >
          <Mic size={18} />
        </button>

        {/* Send/Stop button */}
        {isStreaming ? (
          <button
            type="button"
            onClick={handleStopStreaming}
            className="flex-shrink-0 p-2 text-red-400 hover:text-red-300 bg-red-900/20 hover:bg-red-900/40 rounded-md transition-colors"
            title="Stop generating"
          >
            <Square size={18} />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!message.trim() || disabled}
            className={`flex-shrink-0 p-2 rounded-md transition-colors ${
              !message.trim() || disabled
                ? 'text-slate-500 cursor-not-allowed'
                : 'text-white bg-blue-600 hover:bg-blue-700'
            }`}
            title="Send message"
          >
            <Send size={18} />
          </button>
        )}
      </div>

      {/* Status/hints */}
      <div className="mt-2 text-xs text-slate-500 text-center">
        {isStreaming ? (
          <span className="text-blue-400">
            Mira is responding... Press Esc to interrupt
          </span>
        ) : (
          'Press Enter to send, Shift+Enter for new line'
        )}
      </div>
    </div>
  );
};
