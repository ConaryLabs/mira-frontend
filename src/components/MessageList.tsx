// src/components/MessageList.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { ArrowDown } from 'lucide-react';
import { useChatStore, ChatMessage as StoreChatMessage } from '../stores/useChatStore';
import { ChatMessage } from './ChatMessage';
import { ThinkingIndicator } from './ThinkingIndicator';

const EmptyState: React.FC = () => (
  <div className="flex items-center justify-center h-full text-gray-500">
    <div className="text-center">
      <p className="text-lg mb-2">No messages yet</p>
      <p className="text-sm">Start a conversation to see messages here</p>
    </div>
  </div>
);

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
        itemContent={(index, message: StoreChatMessage) => (
          <div className="px-4 py-2">
            {/* FIX: message is now explicitly typed as StoreChatMessage from useChatStore */}
            <ChatMessage message={message} />
          </div>
        )}
        followOutput={false}
        initialTopMostItemIndex={messages.length > 0 ? messages.length - 1 : 0}
        atBottomStateChange={handleAtBottomStateChange}
        atBottomThreshold={50}
        alignToBottom
      />
      
      {/* Scroll to bottom button */}
      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 right-4 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-all"
          aria-label="Scroll to bottom"
        >
          <ArrowDown className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

export default MessageList;
