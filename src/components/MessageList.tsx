// src/components/MessageList.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { ArrowDown } from 'lucide-react';
import { useChatStore } from '../stores/useChatStore';
import { ChatMessage } from './ChatMessage';
import { ThinkingIndicator } from './ThinkingIndicator';

export const MessageList: React.FC = () => {
  const messages = useChatStore(state => state.messages);
  const isWaitingForResponse = useChatStore(state => state.isWaitingForResponse);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const lastMessageCountRef = useRef(0);

  // Track when user scrolls away from bottom
  const handleAtBottomStateChange = useCallback((bottom: boolean) => {
    setAtBottom(bottom);
    setShowScrollButton(!bottom);
  }, []);

  // Smooth scroll to bottom
  const scrollToBottom = useCallback(() => {
    virtuosoRef.current?.scrollToIndex({
      index: 'LAST',
      behavior: 'smooth',
      align: 'end'
    });
  }, []);

  // CRITICAL: Auto-scroll when messages change
  useEffect(() => {
    const messageCountChanged = messages.length !== lastMessageCountRef.current;
    lastMessageCountRef.current = messages.length;

    if (messageCountChanged) {
      setTimeout(() => {
        scrollToBottom();
      }, 50);
    }
  }, [messages.length, scrollToBottom]);

  // CRITICAL: Auto-scroll when waiting state changes to true (thinking indicator appears)
  useEffect(() => {
    if (isWaitingForResponse) {
      setTimeout(() => {
        scrollToBottom();
      }, 100); // Slightly longer delay to let Footer render
    }
  }, [isWaitingForResponse, scrollToBottom]);

  // CRITICAL: Initial scroll to bottom on mount
  useEffect(() => {
    if (messages.length > 0 && virtuosoRef.current) {
      // Longer delay for initial render
      setTimeout(() => {
        virtuosoRef.current?.scrollToIndex({
          index: 'LAST',
          behavior: 'auto',
          align: 'end'
        });
      }, 200);
    }
  }, []); // Only run on mount

  if (messages.length === 0 && !isWaitingForResponse) {
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
        followOutput={false}
        initialTopMostItemIndex={messages.length > 0 ? messages.length - 1 : 0}
        alignToBottom
        atBottomStateChange={handleAtBottomStateChange}
        atBottomThreshold={50}
        components={{
          Footer: () => {
            // Render thinking indicator AS PART OF THE LIST, not overlapping
            if (!isWaitingForResponse) return null;
            return (
              <div className="px-4 py-4">
                <ThinkingIndicator />
              </div>
            );
          }
        }}
      />
      
      {/* Scroll to bottom button - only show when scrolled up AND not waiting */}
      {showScrollButton && !isWaitingForResponse && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-6 right-6 z-10 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          title="Scroll to bottom"
          aria-label="Scroll to bottom"
        >
          <ArrowDown size={20} />
        </button>
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
