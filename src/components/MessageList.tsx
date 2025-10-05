// src/components/MessageList.tsx
// PERFORMANCE FIX: Virtualized message list with react-virtuoso

import React, { useEffect, useRef } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { useChatStore } from '../stores/useChatStore';
import { MessageBubble } from './MessageBubble';
import { ThinkingIndicator } from './ThinkingIndicator';

export const MessageList: React.FC = () => {
  const messages = useChatStore(state => state.messages);
  const isStreaming = useChatStore(state => state.isStreaming);
  const virtuosoRef = useRef<VirtuosoHandle>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (virtuosoRef.current && messages.length > 0) {
      virtuosoRef.current.scrollToIndex({
        index: messages.length - 1,
        behavior: 'smooth',
      });
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
          <div className="px-4 py-3">
            <MessageBubble 
              message={message}
              isLast={index === messages.length - 1}
            />
          </div>
        )}
        followOutput="auto"
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
