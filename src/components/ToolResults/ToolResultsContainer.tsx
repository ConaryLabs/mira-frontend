// src/components/ToolResults/ToolResultsContainer.tsx
import React from 'react';
import { WebSearchResult } from './WebSearchResult';
import { CodeInterpreterResult } from './CodeInterpreterResult';
import { FileSearchResult } from './FileSearchResult';
import { ImageGenerationResult } from './ImageGenerationResult';
import { CitationDisplay } from './CitationDisplay';

export interface ToolResult {
  type: 'web_search' | 'code_interpreter' | 'file_search' | 'image_generation';
  data: any;
}

export interface Citation {
  file_id: string;
  filename: string;
  url?: string;
  snippet?: string;
}

interface ToolResultsContainerProps {
  toolResults?: ToolResult[];
  citations?: Citation[];
  isDark?: boolean;
}

export const ToolResultsContainer: React.FC<ToolResultsContainerProps> = ({ 
  toolResults = [],
  citations = [],
  isDark = false 
}) => {
  if (toolResults.length === 0 && citations.length === 0) {
    return null;
  }

  const renderToolResult = (result: ToolResult, index: number) => {
    switch (result.type) {
      case 'web_search':
        return (
          <WebSearchResult
            key={`web-search-${index}`}
            query={result.data.query || ''}
            results={result.data.results || []}
            isDark={isDark}
          />
        );
      
      case 'code_interpreter':
        return (
          <CodeInterpreterResult
            key={`code-${index}`}
            code={result.data.code || ''}
            result={result.data.result || ''}
            files={result.data.files}
            isDark={isDark}
          />
        );
      
      case 'file_search':
        return (
          <FileSearchResult
            key={`file-search-${index}`}
            fileIds={result.data.file_ids || []}
            results={result.data.results || []}
            isDark={isDark}
          />
        );
      
      case 'image_generation':
        return (
          <ImageGenerationResult
            key={`image-${index}`}
            prompt={result.data.prompt || ''}
            imageUrl={result.data.image_url || ''}
            size={result.data.size}
            style={result.data.style}
            isDark={isDark}
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="tool-results-container">
      {/* Tool Results */}
      {toolResults.map((result, index) => renderToolResult(result, index))}
      
      {/* Citations at the end */}
      {citations.length > 0 && (
        <CitationDisplay citations={citations} isDark={isDark} />
      )}
    </div>
  );
};

// Export individual components for flexibility
export { WebSearchResult } from './WebSearchResult';
export { CodeInterpreterResult } from './CodeInterpreterResult';
export { FileSearchResult } from './FileSearchResult';
export { ImageGenerationResult } from './ImageGenerationResult';
export { CitationDisplay } from './CitationDisplay';
