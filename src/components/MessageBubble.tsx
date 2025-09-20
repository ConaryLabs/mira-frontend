// src/components/MessageBubble.tsx
import React from 'react';
import { User, Bot, Copy, ThumbsUp, ThumbsDown, Settings } from 'lucide-react';
import type { Message } from '../types';

interface MessageBubbleProps {
  message: Message;
  isLast?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isLast }) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
  };

  const getAvatar = () => {
    switch (message.role) {
      case 'user':
        return (
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
            <User size={16} className="text-white" />
          </div>
        );
      case 'assistant':
        return (
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
            <Bot size={16} className="text-white" />
          </div>
        );
      case 'system':
        return (
          <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center flex-shrink-0">
            <Settings size={16} className="text-white" />
          </div>
        );
      default:
        return null;
    }
  };

  const formatContent = (content: string) => {
    // Basic markdown-like formatting
    return content
      .split('\n')
      .map((line, index) => (
        <p key={index} className={index > 0 ? 'mt-2' : ''}>
          {line}
        </p>
      ));
  };

  const getMessageStyle = () => {
    switch (message.role) {
      case 'user':
        return 'ml-12'; // Indent user messages
      case 'system':
        return 'bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 text-sm text-gray-600 dark:text-gray-400 italic';
      default:
        return '';
    }
  };

  if (message.role === 'system') {
    return (
      <div className="bg-slate-800/50 rounded-lg p-3 text-sm text-slate-400 italic">
        {formatContent(message.content)}
      </div>
    );
  }

  return (
    <div className={`flex gap-3 group ${getMessageStyle()}`}>
      {/* Avatar */}
      {message.role !== 'user' && getAvatar()}
      
      {/* Message content */}
      <div className="flex-1 min-w-0">
        {/* Header with role and timestamp */}
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm text-slate-100">
            {message.role === 'user' ? 'You' : 'Mira'}
          </span>
          <span className="text-xs text-slate-500">
            {new Date(message.timestamp).toLocaleTimeString()}
          </span>
          {message.streaming && (
            <span className="text-xs text-blue-400">
              typing...
            </span>
          )}
        </div>

        {/* Message body */}
        <div className="prose prose-sm max-w-none text-slate-200">
          {formatContent(message.content)}
        </div>

        {/* Tool results */}
        {message.toolResults && message.toolResults.length > 0 && (
          <div className="mt-4 space-y-2">
            {message.toolResults.map((result) => (
              <div key={result.id} className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    {result.type.replace('_', ' ').toUpperCase()}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    result.status === 'success' 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                      : result.status === 'error'
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                      : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                  }`}>
                    {result.status}
                  </span>
                </div>
                <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}

        {/* Action buttons (only for assistant messages) */}
        {message.role === 'assistant' && !message.streaming && (
          <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleCopy}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
              title="Copy message"
            >
              <Copy size={14} />
            </button>
            <button
              className="p-1.5 text-gray-400 hover:text-green-600 dark:hover:text-green-400 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
              title="Good response"
            >
              <ThumbsUp size={14} />
            </button>
            <button
              className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
              title="Poor response"
            >
              <ThumbsDown size={14} />
            </button>
          </div>
        )}
      </div>

      {/* User avatar on the right */}
      {message.role === 'user' && (
        <div className="flex-shrink-0">
          {getAvatar()}
        </div>
      )}
    </div>
  );
};
