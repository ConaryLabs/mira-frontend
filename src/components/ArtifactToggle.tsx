// src/components/ArtifactToggle.tsx
// NEW FILE

import React from 'react';
import { FileCode, ChevronUp } from 'lucide-react';

interface ArtifactToggleProps {
  isOpen: boolean;
  onClick: () => void;
  artifactCount: number;
  isDark: boolean;
}

const ArtifactToggle: React.FC<ArtifactToggleProps> = ({
  isOpen,
  onClick,
  artifactCount,
  isDark
}) => {
  if (artifactCount === 0) return null;

  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-full text-sm
        transition-all duration-200
        ${isDark 
          ? 'bg-gray-800/80 hover:bg-gray-700/80 text-gray-300' 
          : 'bg-white/80 hover:bg-gray-100/80 text-gray-700 shadow-sm'
        }
        backdrop-blur-sm
      `}
    >
      <FileCode size={16} />
      <span>{artifactCount} artifact{artifactCount !== 1 ? 's' : ''}</span>
      <ChevronUp 
        size={14} 
        className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
      />
    </button>
  );
};

export default ArtifactToggle;
