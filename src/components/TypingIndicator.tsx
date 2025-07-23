// mira-frontend/src/components/TypingIndicator.tsx
import React from 'react';

interface TypingIndicatorProps {
  visible: boolean;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ visible }) => {
  if (!visible) return null;

  return (
    <div className="absolute -bottom-1 -right-1">
      <div className="flex gap-1">
        <div 
          className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" 
          style={{ animationDelay: '0ms' }} 
        />
        <div 
          className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" 
          style={{ animationDelay: '150ms' }} 
        />
        <div 
          className="w-2 h-2 rounded-full bg-purple-600 animate-bounce" 
          style={{ animationDelay: '300ms' }} 
        />
      </div>
    </div>
  );
};
