// src/components/Header.tsx
import React from 'react';
import { FileText, Play, GitBranch } from 'lucide-react';
import { ProjectDropdown } from './ProjectDropdown';
import { useAppState } from '../hooks/useAppState';

export const Header: React.FC = () => {
  const { currentProject, showFileExplorer, setShowFileExplorer } = useAppState();

  return (
    <header className="h-14 border-b border-gray-700 px-4 flex items-center bg-gray-900">
      {/* Left: Project selector */}
      <div className="flex items-center gap-4">
        <ProjectDropdown />
        
        {/* File explorer toggle - only show if project selected */}
        {currentProject && (
          <button
            onClick={() => setShowFileExplorer(!showFileExplorer)}
            className={`p-2 rounded-md transition-colors ${
              showFileExplorer 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            }`}
            title="Toggle file explorer"
          >
            <FileText size={16} />
          </button>
        )}
      </div>
      
      {/* Center: Project context indicator */}
      <div className="flex-1 flex justify-center">
        {currentProject && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span>Working in project:</span>
            <span className="text-blue-400 font-medium">{currentProject.name}</span>
          </div>
        )}
      </div>
      
      {/* Right: Action buttons */}
      <div className="flex items-center gap-2">
        {currentProject && (
          <>
            <button
              className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-md"
              title="Run project"
            >
              <Play size={16} />
            </button>
            
            <button
              className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-md"
              title="Git operations"
            >
              <GitBranch size={16} />
            </button>
          </>
        )}
      </div>
    </header>
  );
};
