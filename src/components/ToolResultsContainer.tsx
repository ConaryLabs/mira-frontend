// src/components/ToolResultsContainer.tsx
// Component for displaying tool results and citations in chat messages

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Search, Code, File, Image, ExternalLink } from 'lucide-react';
import type { ToolResult, Citation } from '../types/messages';

interface ToolResultsContainerProps {
  toolResults: ToolResult[];
  citations: Citation[];
  isDark: boolean;
}

export function ToolResultsContainer({ toolResults, citations, isDark }: ToolResultsContainerProps) {
  const [expandedResults, setExpandedResults] = useState<Set<number>>(new Set());
  const [showAllCitations, setShowAllCitations] = useState(false);

  const toggleResult = (index: number) => {
    const newExpanded = new Set(expandedResults);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedResults(newExpanded);
  };

  const getToolIcon = (type: string) => {
    switch (type) {
      case 'web_search':
        return <Search className="w-4 h-4" />;
      case 'code_interpreter':
        return <Code className="w-4 h-4" />;
      case 'file_search':
        return <File className="w-4 h-4" />;
      case 'image_generation':
        return <Image className="w-4 h-4" />;
      default:
        return <Code className="w-4 h-4" />;
    }
  };

  const getToolLabel = (type: string) => {
    switch (type) {
      case 'web_search':
        return 'Web Search';
      case 'code_interpreter':
        return 'Code Interpreter';
      case 'file_search':
        return 'File Search';
      case 'image_generation':
        return 'Image Generation';
      default:
        return 'Tool Result';
    }
  };

  const renderToolData = (data: any, type: string) => {
    if (!data) return null;

    switch (type) {
      case 'web_search':
        return (
          <div className="space-y-2">
            {data.results?.map((result: any, idx: number) => (
              <div key={idx} className="border border-gray-200 dark:border-gray-600 rounded p-2">
                <a 
                  href={result.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  {result.title}
                </a>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  {result.snippet}
                </p>
              </div>
            ))}
          </div>
        );
      
      case 'code_interpreter':
        return (
          <div className="space-y-2">
            {data.code && (
              <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-sm overflow-x-auto">
                <code>{data.code}</code>
              </pre>
            )}
            {data.output && (
              <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded text-sm">
                <strong>Output:</strong>
                <pre className="mt-1 whitespace-pre-wrap">{data.output}</pre>
              </div>
            )}
          </div>
        );
      
      case 'image_generation':
        return (
          <div className="space-y-2">
            {data.images?.map((image: any, idx: number) => (
              <div key={idx} className="border border-gray-200 dark:border-gray-600 rounded p-2">
                <img 
                  src={image.url} 
                  alt={image.description || 'Generated image'}
                  className="max-w-full h-auto rounded"
                />
                {image.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    {image.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        );
      
      default:
        return (
          <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-sm overflow-x-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        );
    }
  };

  if (toolResults.length === 0 && citations.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Tool Results */}
      {toolResults.length > 0 && (
        <div className="space-y-2">
          {toolResults.map((result, index) => (
            <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleResult(index)}
                className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  {getToolIcon(result.type)}
                  <span className="font-medium text-sm">{getToolLabel(result.type)}</span>
                </div>
                {expandedResults.has(index) ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
              
              {expandedResults.has(index) && (
                <div className="p-3 border-t border-gray-200 dark:border-gray-600">
                  {renderToolData(result.data, result.type)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Citations */}
      {citations.length > 0 && (
        <div className="border border-blue-200 dark:border-blue-700 rounded-lg overflow-hidden">
          <button
            onClick={() => setShowAllCitations(!showAllCitations)}
            className="w-full flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <ExternalLink className="w-4 h-4" />
              <span className="font-medium text-sm">
                Sources ({citations.length})
              </span>
            </div>
            {showAllCitations ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          
          {showAllCitations && (
            <div className="p-3 border-t border-blue-200 dark:border-blue-700">
              <div className="space-y-2">
                {citations.map((citation, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <span className="text-xs bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-1.5 py-0.5 rounded">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {citation.url ? (
                          <a 
                            href={citation.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            {citation.filename}
                          </a>
                        ) : (
                          citation.filename
                        )}
                      </div>
                      {citation.snippet && (
                        <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                          {citation.snippet}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
