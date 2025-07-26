// src/components/CodeBlock.tsx
// NEW FILE

import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CodeBlockProps {
  code: string;
  language?: string;
  isDark: boolean;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ code, language, isDark }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div className={`relative group my-2 rounded-lg overflow-hidden ${
      isDark ? 'bg-gray-900' : 'bg-gray-100'
    }`}>
      {/* Language label */}
      {language && (
        <div className={`px-4 py-2 text-xs font-medium ${
          isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-200 text-gray-600'
        }`}>
          {language}
        </div>
      )}
      
      {/* Code content */}
      <div className="relative">
        <pre className={`p-4 overflow-x-auto text-sm ${
          isDark ? 'text-gray-300' : 'text-gray-800'
        }`}>
          <code className="font-mono">{code}</code>
        </pre>
        
        {/* Copy button */}
        <button
          onClick={copyToClipboard}
          className={`
            absolute top-2 right-2 p-2 rounded-md
            opacity-0 group-hover:opacity-100 transition-opacity
            ${isDark 
              ? 'bg-gray-800 hover:bg-gray-700 text-gray-400' 
              : 'bg-gray-200 hover:bg-gray-300 text-gray-600'
            }
          `}
          title="Copy code"
        >
          {copied ? (
            <Check size={16} className="text-green-500" />
          ) : (
            <Copy size={16} />
          )}
        </button>
      </div>
    </div>
  );
};
