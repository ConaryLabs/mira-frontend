// src/components/ChatMessages.tsx
// Move rendering + scroll logic for message list out of ChatContainer.tsx

import React, { useRef, useEffect, useCallback } from 'react';
import { MessageBubble } from './MessageBubble';
import type { Message } from '../types/messages';

interface ChatMessagesProps {
  messages: Message[];
  isLoadingHistory: boolean;
  isLoadingMore: boolean;
  hasMoreHistory: boolean;
  historyOffset: number;
  onLoadMore: (offset: number) => void;
  onArtifactClick?: (artifactId: string) => void;
  isDark: boolean;
}

export function ChatMessages({
  messages,
  isLoadingHistory,
  isLoadingMore,
  hasMoreHistory,
  historyOffset,
  onLoadMore,
  onArtifactClick,
  isDark,
}: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // FIXED: Improved scrollToBottom with timeout to ensure DOM updates
  const scrollToBottom = useCallback(() => {
    // Use timeout to ensure DOM has updated
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 50);
  }, []);

  // Auto-scroll when new messages arrive (but not when loading more history)
  useEffect(() => {
    if (!isLoadingMore) {
      scrollToBottom();
    }
  }, [messages, isLoadingMore, scrollToBottom]);

  // Handle scroll for loading more history
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current || isLoadingMore || !hasMoreHistory) return;
    const { scrollTop } = messagesContainerRef.current;
    if (scrollTop === 0) {
      onLoadMore(historyOffset);
    }
  }, [historyOffset, isLoadingMore, hasMoreHistory, onLoadMore]);

  if (isLoadingHistory) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div 
      ref={messagesContainerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto p-4 space-y-4"
    >
      {/* Load more indicator */}
      {isLoadingMore && hasMoreHistory && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-sm text-gray-500 mt-2">Loading more messages...</p>
        </div>
      )}

      {/* Messages list */}
      <div className="flex flex-col space-y-4">
        {messages.slice().reverse().map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            onArtifactClick={onArtifactClick}
            isDark={isDark}
          />
        ))}
      </div>

      {/* Scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  );
}
