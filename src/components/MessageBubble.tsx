// src/components/MessageBubble.tsx
import React from 'react';
import { User, Bot } from 'lucide-react';
import type { Message } from '../types/messages';
import { ToolResultsContainer, ToolResult, Citation } from './ToolResults/ToolResultsContainer';
import clsx from 'clsx';

interface MessageBubbleProps {
  message: Message;
  getMoodColor: (mood: string) => string;
  isDark?: boolean;
  onArtifactClick?: (artifactId: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, 
  getMoodColor,
  isDark = false,
  onArtifactClick
}) => {
  const isUser = message.role === 'user';
  
  // Parse tool results and citations if they exist
  const toolResults: ToolResult[] = message.toolResults || [];
  const citations: Citation[] = message.citations || [];

  // Function to render message content with inline citations
  const renderContentWithCitations = (content: string) => {
    if (!citations || citations.length === 0) {
      return <div className="whitespace-pre-wrap">{content}</div>;
    }

    // Simple citation replacement - look for [1], [2], etc.
    let processedContent = content;
    const citationElements: JSX.Element[] = [];
    
    citations.forEach((citation, idx) => {
      const citationNum = idx + 1;
      const citationPattern = new RegExp(`\\[${citationNum}\\]`, 'g');
      
      if (processedContent.match(citationPattern)) {
        processedContent = processedContent.replace(citationPattern, `§CITE${citationNum}§`);
        citationElements[citationNum] = (
          <sup className="text-blue-600 dark:text-blue-400 hover:underline cursor-help ml-0.5" title={citation.filename}>
            [{citationNum}]
          </sup>
        );
      }
    });

    // Split content and insert citation elements
    const parts = processedContent.split(/§CITE(\d+)§/);
    const elements: JSX.Element[] = [];
    
    parts.forEach((part, idx) => {
      if (idx % 2 === 0) {
        // Text content
        elements.push(<span key={`text-${idx}`}>{part}</span>);
      } else {
        // Citation number
        const citationNum = parseInt(part);
        elements.push(
          <span key={`cite-${idx}`}>
            {citationElements[citationNum]}
          </span>
        );
      }
    });

    return <div className="whitespace-pre-wrap">{elements}</div>;
  };

  return (
    <div className={clsx(
      'flex gap-3 animate-fade-in',
      isUser ? 'flex-row-reverse' : 'flex-row'
    )}>
      {/* Avatar */}
      <div className={clsx(
        'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
        isUser 
          ? 'bg-gray-600 dark:bg-gray-400' 
          : `bg-gradient-to-br ${getMoodColor(message.mood || 'present')}`
      )}>
        {isUser ? (
          <User className="w-5 h-5 text-white" />
        ) : (
          <Bot className="w-5 h-5 text-white" />
        )}
      </div>

      {/* Message Content */}
      <div className={clsx(
        'flex-1 max-w-[70%]',
        isUser ? 'items-end' : 'items-start'
      )}>
        <div className={clsx(
          'rounded-2xl px-4 py-3 shadow-sm',
          isUser 
            ? 'bg-gray-600 dark:bg-gray-400 text-white' 
            : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100',
          !isUser && message.mood && `border-l-4 ${getMoodColor(message.mood)}`
        )}>
          {/* Main message content */}
          <div className={clsx(
            'text-sm leading-relaxed',
            message.isStreaming && 'animate-pulse'
          )}>
            {renderContentWithCitations(message.content)}
          </div>

          {/* Mood indicator for Mira */}
          {!isUser && message.mood && !message.isStreaming && (
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 italic">
              Mood: {message.mood}
            </div>
          )}

          {/* Tags if present */}
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

          {/* Salience indicator */}
          {message.salience && message.salience > 5 && (
            <div className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              ⚡ High importance
            </div>
          )}
        </div>

        {/* Tool Results - displayed below the message */}
        {!isUser && (toolResults.length > 0 || citations.length > 0) && (
          <div className="mt-2">
            <ToolResultsContainer
              toolResults={toolResults}
              citations={citations}
              isDark={isDark}
            />
          </div>
        )}

        {/* Timestamp */}
        <div className={clsx(
          'text-xs text-gray-500 dark:text-gray-400 mt-1',
          isUser ? 'text-right' : 'text-left'
        )}>
          {new Date(message.timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </div>

        {/* Artifact reference if present */}
        {message.artifactId && onArtifactClick && (
          <button
            onClick={() => onArtifactClick(message.artifactId!)}
            className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            View Artifact
          </button>
        )}
      </div>
    </div>
  );
};
