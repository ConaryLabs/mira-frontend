// src/components/ToolResults/WebSearchResult.tsx
import React from 'react';
import { ExternalLink, Search, Globe } from 'lucide-react';

interface WebSearchResultProps {
  query: string;
  results: Array<{
    title: string;
    url: string;
    snippet: string;
    source?: string;
  }>;
  isDark?: boolean;
}

export const WebSearchResult: React.FC<WebSearchResultProps> = ({ 
  query, 
  results,
  isDark = false 
}) => {
  if (!results || results.length === 0) {
    return (
      <div className="my-3 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 text-sm font-semibold mb-2 text-gray-600 dark:text-gray-400">
          <Search className="w-4 h-4" />
          No search results found for "{query}"
        </div>
      </div>
    );
  }

  return (
    <div className="my-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
      <div className="flex items-center gap-2 text-sm font-semibold mb-3 text-blue-700 dark:text-blue-300">
        <Search className="w-4 h-4" />
        Web Search: "{query}"
        <span className="text-xs font-normal ml-auto">
          {results.length} result{results.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="space-y-2">
        {results.map((result, idx) => (
          <div 
            key={idx} 
            className="p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <a 
                  href={result.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline font-medium group"
                >
                  <span className="truncate">{result.title}</span>
                  <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
                {result.source && (
                  <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <Globe className="w-3 h-3" />
                    <span>{result.source}</span>
                  </div>
                )}
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
              {result.snippet}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
