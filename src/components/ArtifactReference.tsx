// src/components/ArtifactReference.tsx
// NEW FILE

import React from 'react';
import { FileCode, FileText, Database, ExternalLink } from 'lucide-react';

interface ArtifactReferenceProps {
  artifactId: string;
  name: string;
  type: 'code' | 'document' | 'data';
  language?: string;
  onClick: (artifactId: string) => void;
  isDark: boolean;
}

export const ArtifactReference: React.FC<ArtifactReferenceProps> = ({
  artifactId,
  name,
  type,
  language,
  onClick,
  isDark
}) => {
  const getIcon = () => {
    switch (type) {
      case 'code':
        return <FileCode size={16} />;
      case 'document':
        return <FileText size={16} />;
      case 'data':
        return <Database size={16} />;
      default:
        return <FileText size={16} />;
    }
  };

  const getTypeLabel = () => {
    if (type === 'code' && language) {
      return language.toUpperCase();
    }
    return type.toUpperCase();
  };

  return (
    <button
      onClick={() => onClick(artifactId)}
      className={`
        inline-flex items-center gap-2 px-3 py-2 my-2 rounded-lg
        border-2 transition-all duration-200
        ${isDark
          ? 'bg-gray-800/50 border-gray-700 hover:bg-gray-800 hover:border-gray-600 text-gray-200'
          : 'bg-gray-50 border-gray-300 hover:bg-white hover:border-gray-400 text-gray-800'
        }
        group
      `}
    >
      <div className={`
        p-1.5 rounded
        ${isDark 
          ? 'bg-gray-700 text-gray-400 group-hover:text-gray-300' 
          : 'bg-gray-200 text-gray-600 group-hover:text-gray-700'
        }
      `}>
        {getIcon()}
      </div>
      
      <div className="flex flex-col items-start">
        <span className="font-medium text-sm">{name}</span>
        <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
          {getTypeLabel()}
        </span>
      </div>
      
      <ExternalLink 
        size={14} 
        className={`
          ml-2 transition-opacity
          ${isDark ? 'text-gray-600' : 'text-gray-400'}
          opacity-0 group-hover:opacity-100
        `}
      />
    </button>
  );
};
