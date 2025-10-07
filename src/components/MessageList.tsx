// src/components/MessageList.tsx
import React, { useEffect, useRef } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { useChatStore } from '../stores/useChatStore';
import { ChatMessage } from './ChatMessage';
import { ThinkingIndicator } from './ThinkingIndicator';

export const MessageList: React.FC = () => {
  const messages = useChatStore(state => state.messages);
  const isStreaming = useChatStore(state => state.isStreaming);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const hasScrolledToBottom = useRef(false);

  // Initial scroll to bottom after messages load
  useEffect(() => {
    if (messages.length > 0 && !hasScrolledToBottom.current && virtuosoRef.current) {
      // Small delay to let virtuoso render
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
        followOutput="smooth" // Let Virtuoso handle auto-scroll natively
        initialTopMostItemIndex={messages.length - 1}
        alignToBottom
      />
      
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
