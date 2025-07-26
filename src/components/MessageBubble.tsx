// src/components/MessageBubble.tsx
import React from 'react';
import type { Message } from '../types/messages';
import { ArtifactReference } from './ArtifactReference';
import { CodeBlock } from './CodeBlock';
import clsx from 'clsx';

interface MessageBubbleProps {
  message: Message;
  isDark: boolean;
  onArtifactClick?: (artifactId: string) => void;
}

type ContentPart = 
  | { type: 'text'; content: string }
  | { type: 'code'; code: string; language?: string }
  | { type: 'artifact'; id: string; name: string; artifactType: string; language?: string };

// Helper to parse message content for artifacts and code blocks
const parseMessageContent = (content: string): ContentPart[] => {
  const parts: ContentPart[] = [];
  let remaining = content;
  
  // Pattern to match artifact references: {{artifact:id:name:type:language}}
  const artifactPattern = /\{\{artifact:([^:]+):([^:]+):([^:]+):?([^}]*)\}\}/;
  
  // Pattern to match code blocks with optional language
  const codeBlockPattern = /```(\w+)?\n([\s\S]*?)```/;
  
  // Pattern to match inline code
  const inlineCodePattern = /`([^`]+)`/;
  
  while (remaining) {
    // Find the next special element
    const artifactMatch = remaining.match(artifactPattern);
    const codeBlockMatch = remaining.match(codeBlockPattern);
    const inlineCodeMatch = remaining.match(inlineCodePattern);
    
    // Determine which comes first
    const artifactIndex = artifactMatch ? remaining.indexOf(artifactMatch[0]) : Infinity;
    const codeBlockIndex = codeBlockMatch ? remaining.indexOf(codeBlockMatch[0]) : Infinity;
    const inlineCodeIndex = inlineCodeMatch ? remaining.indexOf(inlineCodeMatch[0]) : Infinity;
    
    const nextIndex = Math.min(artifactIndex, codeBlockIndex, inlineCodeIndex);
    
    if (nextIndex === Infinity) {
      // No more special elements
      if (remaining) {
        parts.push({ type: 'text', content: remaining });
      }
      break;
    }
    
    // Add text before the special element
    if (nextIndex > 0) {
      parts.push({ type: 'text', content: remaining.slice(0, nextIndex) });
    }
    
    // Process the special element
    if (nextIndex === artifactIndex && artifactMatch) {
      parts.push({
        type: 'artifact',
        id: artifactMatch[1],
        name: artifactMatch[2],
        artifactType: artifactMatch[3],
        language: artifactMatch[4] || undefined
      });
      remaining = remaining.slice(artifactIndex + artifactMatch[0].length);
    } else if (nextIndex === codeBlockIndex && codeBlockMatch) {
      parts.push({
        type: 'code',
        code: codeBlockMatch[2].trim(),
        language: codeBlockMatch[1] || undefined
      });
      remaining = remaining.slice(codeBlockIndex + codeBlockMatch[0].length);
    } else if (nextIndex === inlineCodeIndex && inlineCodeMatch) {
      // For inline code, we'll just wrap it in a styled span
      parts.push({
        type: 'text',
        content: remaining.slice(0, inlineCodeIndex)
      });
      parts.push({
        type: 'text',
        content: `\`${inlineCodeMatch[1]}\``
      });
      remaining = remaining.slice(inlineCodeIndex + inlineCodeMatch[0].length);
    }
  }
  
  return parts.length > 0 ? parts : [{ type: 'text', content }];
};

// Helper to render inline code
const renderTextWithInlineCode = (text: string, isDark: boolean) => {
  const parts = text.split(/(`[^`]+`)/g);
  
  return parts.map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      const code = part.slice(1, -1);
      return (
        <code
          key={index}
          className={`
            px-1.5 py-0.5 rounded text-sm font-mono
            ${isDark 
              ? 'bg-gray-700 text-purple-300' 
              : 'bg-gray-200 text-purple-700'
            }
          `}
        >
          {code}
        </code>
      );
    }
    return <span key={index}>{part}</span>;
  });
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, 
  isDark,
  onArtifactClick 
}) => {
  const isUser = message.role === 'user';
  const contentParts = parseMessageContent(message.content);
  
  return (
    <div
      className={clsx(
        'flex animate-fade-in',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={clsx(
          'max-w-[70%] px-4 py-2 rounded-2xl relative',
          isUser
            ? isDark 
              ? 'bg-purple-600 text-white' 
              : 'bg-purple-500 text-white'
            : isDark
              ? 'bg-gray-800 text-gray-100'
              : 'bg-white text-gray-900 shadow-sm'
        )}
      >
        <div className="whitespace-pre-wrap">
          {contentParts.map((part, index) => {
            switch (part.type) {
              case 'text':
                return (
                  <span key={index}>
                    {renderTextWithInlineCode(part.content, isDark)}
                  </span>
                );
                
              case 'code':
                return (
                  <CodeBlock
                    key={index}
                    code={part.code}
                    language={part.language}
                    isDark={isDark}
                  />
                );
                
              case 'artifact':
                return onArtifactClick ? (
                  <ArtifactReference
                    key={index}
                    artifactId={part.id}
                    name={part.name}
                    type={part.artifactType as 'code' | 'document' | 'data'}
                    language={part.language}
                    onClick={onArtifactClick}
                    isDark={isDark}
                  />
                ) : null;
                
              default:
                return null;
            }
          })}
        </div>
      </div>
    </div>
  );
};
