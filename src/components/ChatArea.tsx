// src/components/ChatArea.tsx
// Main chat layout container - zero props, all store-based

import React from 'react';
import { ConnectionBanner } from './ConnectionBanner';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';

export const ChatArea: React.FC = () => {
  return (
    <div className="flex flex-col h-full">
      <ConnectionBanner />
      <div className="flex-1 overflow-hidden">
        <MessageList />
      </div>
      <div className="border-t border-slate-700 p-4">
        <ChatInput />
      </div>
    </div>
  );
};
