// src/components/SidebarToggle.tsx
// NEW FILE

import React from 'react';
import { Menu, FolderOpen } from 'lucide-react';

interface SidebarToggleProps {
  onClick: () => void;
  isDark: boolean;
  hasActiveProject?: boolean;
}

export const SidebarToggle: React.FC<SidebarToggleProps> = ({ 
  onClick, 
  isDark,
  hasActiveProject = false
}) => {
  return (
    <button
      onClick={onClick}
      className={`
        p-2 rounded-lg transition-all duration-200
        ${isDark 
          ? 'hover:bg-gray-800 text-gray-400 hover:text-gray-200' 
          : 'hover:bg-gray-200 text-gray-600 hover:text-gray-900'
        }
        ${hasActiveProject ? 'ring-1 ring-purple-500/30' : ''}
      `}
      aria-label="Toggle projects sidebar"
    >
      {hasActiveProject ? <FolderOpen size={20} /> : <Menu size={20} />}
    </button>
  );
};
