// src/components/ToolResults/FileSearchResult.tsx
import React from 'react';
import { FileSearch, FileText, ExternalLink } from 'lucide-react';

interface FileSearchResultProps {
  fileIds: string[];
  results: Array<{
    file_id: string;
    filename: string;
    url?: string;
    snippet?: string;
    score?: number;
  }>;
  isDark?: boolean;
}

export const FileSearchResult: React.FC<FileSearchResultProps> = ({ 
  fileIds, 
  results,
  isDark = false 
}) => {
  if (!results || results.length === 0) {
    return (
      <div className="my-3 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 text-sm font-semibold mb-2 text-gray-600 dark:text-gray-400">
          <FileSearch className="w-4 h-4" />
          No matching files found
        </div>
      </div>
    );
  }

  return (
    <div className="my-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
      <div className="flex items-center gap-2 text-sm font-semibold mb-3 text-green-700 dark:text-green-300">
        <FileSearch className="w-4 h-4" />
        File Search
        <span className="text-xs font-normal ml-auto">
          {results.length} match{results.length !== 1 ? 'es' : ''} in {fileIds.length} file{fileIds.length !== 1 ? 's' : ''}
        </span>
      </div>
      
      <div className="space-y-2">
        {results.map((result, idx) => (
          <div 
            key={idx}
            className="p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                {result.url ? (
                  <a 
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium flex items-center gap-1"
                  >
                    {result.filename}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {result.filename}
                  </span>
                )}
              </div>
              {result.score && (
                <span className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                  {(result.score * 100).toFixed(0)}% match
                </span>
              )}
            </div>
            
            {result.snippet && (
              <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-900 rounded">
                <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap font-mono">
                  {result.snippet}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
