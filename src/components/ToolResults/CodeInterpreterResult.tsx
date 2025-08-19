// src/components/ToolResults/CodeInterpreterResult.tsx
import React, { useState } from 'react';
import { Code, Terminal, FileText, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';

interface CodeInterpreterResultProps {
  code: string;
  result: string;
  files?: Array<{
    name: string;
    content: string;
    type: string;
  }>;
  isDark?: boolean;
}

export const CodeInterpreterResult: React.FC<CodeInterpreterResultProps> = ({ 
  code, 
  result, 
  files,
  isDark = false 
}) => {
  const [isCodeExpanded, setIsCodeExpanded] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedResult, setCopiedResult] = useState(false);

  const copyToClipboard = (text: string, setCopied: (val: boolean) => void) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="my-3 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
      <div className="flex items-center gap-2 text-sm font-semibold mb-3 text-purple-700 dark:text-purple-300">
        <Terminal className="w-4 h-4" />
        Code Interpreter
      </div>
      
      {/* Code Section */}
      <div className="mb-3">
        <button
          onClick={() => setIsCodeExpanded(!isCodeExpanded)}
          className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors mb-2"
        >
          <Code className="w-4 h-4" />
          Code
          {isCodeExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
        
        {isCodeExpanded && (
          <div className="relative group">
            <button
              onClick={() => copyToClipboard(code, setCopiedCode)}
              className="absolute top-2 right-2 p-1.5 bg-white dark:bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              title="Copy code"
            >
              {copiedCode ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              )}
            </button>
            <pre className="p-3 bg-gray-900 text-gray-100 rounded overflow-x-auto text-sm font-mono">
              <code>{code}</code>
            </pre>
          </div>
        )}
      </div>

      {/* Result Section */}
      <div className="mb-3">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <Terminal className="w-4 h-4" />
          Output
        </div>
        <div className="relative group">
          <button
            onClick={() => copyToClipboard(result, setCopiedResult)}
            className="absolute top-2 right-2 p-1.5 bg-white dark:bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity"
            title="Copy output"
          >
            {copiedResult ? (
              <Check className="w-4 h-4 text-green-600" />
            ) : (
              <Copy className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            )}
          </button>
          <pre className="p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 overflow-x-auto text-sm">
            {result}
          </pre>
        </div>
      </div>

      {/* Files Section */}
      {files && files.length > 0 && (
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <FileText className="w-4 h-4" />
            Generated Files ({files.length})
          </div>
          <div className="space-y-2">
            {files.map((file, idx) => (
              <div 
                key={idx}
                className="p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {file.name}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {file.type}
                  </span>
                </div>
                {file.content && (
                  <pre className="mt-2 p-2 bg-gray-50 dark:bg-gray-900 rounded text-xs overflow-x-auto">
                    {file.content.substring(0, 200)}
                    {file.content.length > 200 && '...'}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
