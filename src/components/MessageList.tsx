// src/components/MessageList.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { ArrowDown } from 'lucide-react';
import { useChatStore } from '../stores/useChatStore';
import { ChatMessage } from './ChatMessage';
import { ThinkingIndicator } from './ThinkingIndicator';

export const MessageList: React.FC = () => {
  const messages = useChatStore(state => state.messages);
  const isStreaming = useChatStore(state => state.isStreaming);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const hasScrolledToBottom = useRef(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [atBottom, setAtBottom] = useState(true);

  // Initial scroll to bottom after messages load
  useEffect(() => {
    if (messages.length > 0 && !hasScrolledToBottom.current && virtuosoRef.current) {
      setTimeout(() => {
        virtuosoRef.current?.scrollToIndex({
          index: messages.length - 1,
          behavior: 'auto',
          align: 'end'
        });
        hasScrolledToBottom.current = true;
      }, 100);
    }
  }, [messages.length]);

  // Track when user scrolls away from bottom
  const handleAtBottomStateChange = useCallback((bottom: boolean) => {
    setAtBottom(bottom);
    setShowScrollButton(!bottom);
  }, []);

  // Smooth scroll to bottom
  const scrollToBottom = useCallback(() => {
    virtuosoRef.current?.scrollToIndex({
      index: messages.length - 1,
      behavior: 'smooth',
      align: 'end'
    });
  }, [messages.length]);

  // Auto-scroll when streaming and already at bottom
  useEffect(() => {
    if (isStreaming && atBottom) {
      scrollToBottom();
    }
  }, [isStreaming, atBottom, scrollToBottom, messages.length]);

  if (messages.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="h-full relative">
      <Virtuoso
        ref={virtuosoRef}
        data={messages}
        overscan={200}
        itemContent={(index, message) => (
          <div className="px-4 py-2">
            <ChatMessage message={message} />
          </div>
        )}
        followOutput={false} // Disable auto-follow, we'll handle it manually
        initialTopMostItemIndex={messages.length - 1}
        alignToBottom
        atBottomStateChange={handleAtBottomStateChange}
        atBottomThreshold={50} // Consider "at bottom" when within 50px
      />
      
      {/* Scroll to bottom button */}
      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-20 right-6 z-10 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          title="Scroll to bottom"
          aria-label="Scroll to bottom"
        >
          <ArrowDown size={20} />
        </button>
      )}
      
      {isStreaming && (
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 pointer-events-none">
          <ThinkingIndicator />
        </div>
      )}
    </div>
  );
};

const EmptyState: React.FC = () => (
  <div className="flex items-center justify-center h-full">
    <div className="text-center text-slate-500 text-sm">
      No messages yet. Start a conversation with Mira.
    </div>
  </div>
);
