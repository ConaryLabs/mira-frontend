// src/components/chat/ChatMessages.tsx
// PHASE 2: Extracted messages component (~120 lines)
// Responsibilities: Message list, loading states, scrolling

import React, { useRef, useEffect } from 'react';
import { MessageBubble } from '../MessageBubble';
import type { Message } from '../../types/messages';

interface ChatMessagesProps {
  messages: Message[];
  isThinking: boolean;
  isLoadingHistory: boolean;
  isLoadingMore: boolean;
  hasMoreHistory: boolean;
  isDark: boolean;
  onLoadMore: () => void;
  onArtifactClick: (artifactId: string) => void;
}

export const ChatMessages: React.FC<ChatMessagesProps> = ({
  messages,
  isThinking,
  isLoadingHistory,
  isLoadingMore,
  hasMoreHistory,
  isDark,
  onLoadMore,
  onArtifactClick
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (!isLoadingMore) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [messages, isLoadingMore]);

  return (
    <div className="flex-1 overflow-y-auto">
      {isLoadingHistory ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <span className="ml-2 text-gray-600 dark:text-gray-400">Loading chat history...</span>
        </div>
      ) : (
        <div className="space-y-4 p-4">
          {/* Load More Button */}
          {hasMoreHistory && messages.length > 0 && (
            <div className="text-center py-4">
              {isLoadingMore ? (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
              ) : (
                <button
                  onClick={onLoadMore}
                  className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                >
                  Load more messages
                </button>
              )}
            </div>
          )}
          
          {/* Messages (reversed to show newest first, but we reverse the array) */}
          {messages.slice().reverse().map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isDark={isDark}
              onArtifactClick={onArtifactClick}
            />
          ))}
          
          {/* Thinking indicator */}
          {isThinking && (
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-800 dark:bg-gray-600 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
              <div className="flex-1 max-w-[70%]">
                <div className="bg-gray-200 dark:bg-gray-700 rounded-2xl px-4 py-3">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      <div ref={messagesEndRef} />
    </div>
  );
};
