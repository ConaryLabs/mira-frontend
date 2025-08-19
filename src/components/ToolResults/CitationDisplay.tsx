// src/components/ToolResults/CitationDisplay.tsx
import React from 'react';
import { BookOpen, ExternalLink, FileText } from 'lucide-react';

interface Citation {
  file_id: string;
  filename: string;
  url?: string;
  snippet?: string;
}

interface CitationDisplayProps {
  citations: Citation[];
  isDark?: boolean;
}

export const CitationDisplay: React.FC<CitationDisplayProps> = ({ 
  citations,
  isDark = false 
}) => {
  if (!citations || citations.length === 0) return null;

  return (
    <div className="my-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
      <div className="flex items-center gap-2 text-sm font-semibold mb-2 text-amber-700 dark:text-amber-300">
        <BookOpen className="w-4 h-4" />
        Sources & Citations
        <span className="text-xs font-normal ml-auto">
          {citations.length} reference{citations.length !== 1 ? 's' : ''}
        </span>
      </div>
      
      <div className="space-y-1.5">
        {citations.map((citation, idx) => (
          <div 
            key={`${citation.file_id}-${idx}`}
            className="flex items-start gap-2 p-2 bg-white dark:bg-gray-800 rounded text-sm"
          >
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400 mt-0.5">
              [{idx + 1}]
            </span>
            <div className="flex-1">
              <div className="flex items-center gap-1">
                <FileText className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                {citation.url ? (
                  <a 
                    href={citation.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    {citation.filename}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="text-gray-700 dark:text-gray-300">
                    {citation.filename}
                  </span>
                )}
              </div>
              {citation.snippet && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                  {citation.snippet}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
