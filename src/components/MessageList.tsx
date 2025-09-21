// src/components/MessageList.tsx
import React from 'react';
import { MessageBubble } from './MessageBubble';
import { ThinkingIndicator } from './ThinkingIndicator';
import type { Message } from '../types';

interface MessageListProps {
  messages: Message[];
  isWaitingForResponse?: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({ messages, isWaitingForResponse = false }) => {
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <span className="text-2xl">🧠</span>
          </div>
          <h2 className="text-xl font-semibold text-slate-100 mb-2">
            Hey there! I'm Mira
          </h2>
          <p className="text-slate-400 leading-relaxed">
            I'm your AI development assistant with a personality. I can help you write code, 
            manage projects, understand complex systems, and maybe roast your commit messages 
            along the way.
          </p>
          <p className="text-sm text-slate-500 mt-3">
            Start by telling me what you're working on, or just say hi!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {messages.map((message, index) => (
        <MessageBubble 
          key={message.id} 
          message={message}
          isLast={index === messages.length - 1}
        />
      ))}
      
      {/* Show thinking indicator when waiting for response */}
      {isWaitingForResponse && (
        <ThinkingIndicator />
      )}
    </div>
  );
};
