// mira-frontend/src/components/ChatInput.tsx
import React, { useState, useRef } from 'react';
import { Send } from 'lucide-react';
import clsx from 'clsx';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
  isDark: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled, isDark }) => {
  const [input, setInput] = useState('');
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

  return (
    <div className="relative z-10 p-4 border-t border-gray-700/50 dark:border-gray-700/50">
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
    </div>
  );
};
