// mira-frontend/src/components/MessageBubble.tsx
import React from 'react';
import type { Message } from '../types/messages';
import clsx from 'clsx';

interface MessageBubbleProps {
  message: Message;
  isDark: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isDark }) => {
  const isUser = message.role === 'user';
  
  return (
    <div
      className={clsx(
        'flex animate-fade-in',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={clsx(
          'max-w-[70%] px-4 py-2 rounded-2xl relative',
          isUser
            ? isDark 
              ? 'bg-purple-600 text-white' 
              : 'bg-purple-500 text-white'
            : isDark
              ? 'bg-gray-800 text-gray-100'
              : 'bg-white text-gray-900 shadow-sm'
        )}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        {/* Removed the streaming cursor entirely - Mira doesn't need a cursor! */}
      </div>
    </div>
  );
};
