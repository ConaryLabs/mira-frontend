// src/components/ThinkingBubble.tsx
import React from 'react';
import clsx from 'clsx';

interface ThinkingBubbleProps {
  visible: boolean;
  isDark: boolean;
}

export const ThinkingBubble: React.FC<ThinkingBubbleProps> = ({ visible, isDark }) => {
  if (!visible) return null;

  return (
    <div className="flex justify-start animate-fade-in">
      <div
        className={clsx(
          'relative px-4 py-3 rounded-2xl shadow-lg',
          'bg-gradient-to-r',
          isDark
            ? 'from-purple-600/20 to-pink-600/20 backdrop-blur-md border border-purple-500/30'
            : 'from-purple-500/10 to-pink-500/10 backdrop-blur-md border border-purple-400/20'
        )}
      >
        <div className="flex items-center gap-2">
          {/* Animated brain/thought icon */}
          <div className="relative">
            <div className="absolute inset-0 bg-purple-500 rounded-full animate-ping opacity-20" />
            <svg
              className="w-5 h-5 text-purple-600 dark:text-purple-400 animate-pulse"
              fill="none"
              strokeWidth="2"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611l-3.98.793a3 3 0 01-2.31-.611l-2.31-1.539a3 3 0 00-3.07 0l-2.31 1.539a3 3 0 01-2.31.611l-3.98-.793c-1.717-.293-2.299-2.379-1.067-3.611L5 14.5"
              />
            </svg>
          </div>

          {/* Thinking text with animated dots */}
          <span className={clsx(
            'text-sm font-medium',
            isDark ? 'text-purple-300' : 'text-purple-700'
          )}>
            processing
          </span>

          {/* Fancy animated dots */}
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={clsx(
                  'w-1.5 h-1.5 rounded-full',
                  isDark ? 'bg-purple-400' : 'bg-purple-600'
                )}
                style={{
                  animation: 'bounce 1.4s infinite ease-in-out',
                  animationDelay: `${i * 0.16}s`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Subtle shimmer effect */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
          <div
            className={clsx(
              'absolute inset-0 opacity-30',
              'bg-gradient-to-r from-transparent via-white to-transparent',
              'animate-shimmer'
            )}
            style={{
              backgroundSize: '200% 100%',
              animation: 'shimmer 2s infinite',
            }}
          />
        </div>
      </div>
    </div>
  );
};
