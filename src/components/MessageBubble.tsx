// src/components/MessageBubble.tsx
// Cleaned up version removing artifact UI per Phase 2 of guide

import React from 'react';
import { User, Bot } from 'lucide-react';
import clsx from 'clsx';
import type { Message } from '../types/messages';
import { ToolResultsContainer } from './ToolResultsContainer';

interface MessageBubbleProps {
  message: Message;
  onArtifactClick?: (artifactId: string) => void; // Keep for backwards compatibility but won't be used
  isDark: boolean;
}

export function MessageBubble({ message, isDark }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const toolResults = message.toolResults || [];
  const citations = message.citations || [];

  // Enhanced content rendering with citation support
  const renderContentWithCitations = (content: string) => {
    if (!citations.length) {
      return content;
    }

    // Simple citation rendering - replace [n] with clickable citations
    let processedContent = content;
    citations.forEach((citation, index) => {
      const citationMark = `[${index + 1}]`;
      if (processedContent.includes(citationMark)) {
        processedContent = processedContent.replace(
          citationMark,
          `<sup class="citation-link text-blue-600 dark:text-blue-400 cursor-pointer" data-citation="${index}">[${index + 1}]</sup>`
        );
      }
    });

    return (
      <div
        dangerouslySetInnerHTML={{ __html: processedContent }}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (target.classList.contains('citation-link')) {
            const citationIndex = parseInt(target.getAttribute('data-citation') || '0');
            const citation = citations[citationIndex];
            if (citation?.url) {
              window.open(citation.url, '_blank');
            }
          }
        }}
      />
    );
  };

  return (
    <div className={clsx(
      'flex space-x-3 py-3',
      isUser ? 'flex-row-reverse' : 'flex-row'
    )}>
      {/* Avatar */}
      <div className={clsx(
        'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
        isUser ? 'bg-gray-600 dark:bg-gray-400' : 'bg-gray-800 dark:bg-gray-600'
      )}>
        {isUser ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
      </div>

      {/* Message Content */}
      <div className={clsx('flex-1 max-w-[70%]', isUser ? 'items-end' : 'items-start')}>
        <div className={clsx(
          'rounded-2xl px-4 py-3 shadow-sm',
          isUser
            ? 'bg-gray-600 dark:bg-gray-400 text-white'
            : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
        )}>
          <div className={clsx('text-sm leading-relaxed', message.isStreaming && 'animate-pulse')}>
            {renderContentWithCitations(message.content)}
          </div>

          {/* Tags */}
          {message.tags && message.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {message.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Salience indicator (optional, lightweight) */}
          {message.salience && message.salience > 5 && (
            <div className="mt-1 text-xs text-amber-600 dark:text-amber-400">⚡ High importance</div>
          )}
        </div>

        {/* Tool Results / Citations */}
        {!isUser && (toolResults.length > 0 || citations.length > 0) && (
          <div className="mt-2">
            <ToolResultsContainer toolResults={toolResults} citations={citations} isDark={isDark} />
          </div>
        )}

        {/* Timestamp */}
        <div className={clsx('text-xs text-gray-500 dark:text-gray-400 mt-1', isUser ? 'text-right' : 'text-left')}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>

        {/* REMOVED: Artifact reference UI as per Phase 2 cleanup */}
      </div>
    </div>
  );
}
