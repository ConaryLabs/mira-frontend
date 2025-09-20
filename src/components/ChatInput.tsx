// src/components/ChatInput.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Mic } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({ 
  onSend, 
  disabled = false, 
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

  const handleSubmit = () => {
    if (!message.trim() || disabled) return;
    
    onSend(message.trim());
    setMessage('');
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'inherit';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleCompositionStart = () => setIsComposing(true);
  const handleCompositionEnd = () => setIsComposing(false);

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="relative flex items-end gap-2 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus-within:border-blue-500 dark:focus-within:border-blue-400">
        {/* Attachment button (future feature) */}
        <button 
          type="button"
          className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
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
          className="flex-1 min-h-[44px] max-h-[200px] px-0 py-2 text-gray-900 dark:text-gray-100 bg-transparent border-0 outline-none resize-none placeholder-gray-500 dark:placeholder-gray-400"
          style={{ lineHeight: '1.5' }}
        />

        {/* Voice input button (future feature) */}
        <button 
          type="button"
          className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
          title="Voice message"
        >
          <Mic size={18} />
        </button>

        {/* Send button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!message.trim() || disabled}
          className={`flex-shrink-0 p-2 rounded-md transition-colors ${
            !message.trim() || disabled
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-white bg-blue-600 hover:bg-blue-700'
          }`}
          title="Send message"
        >
          <Send size={18} />
        </button>
      </div>

      {/* Helpful hints */}
      <div className="mt-2 text-xs text-gray-500 text-center">
        Press Enter to send, Shift+Enter for new line
      </div>
    </div>
  );
};
