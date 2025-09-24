// src/components/Header.tsx
import React from 'react';
import { Play, Command } from 'lucide-react';
import { ProjectDropdown } from './ProjectDropdown';
import ArtifactToggle from './ArtifactToggle';
import { CommitPushButton } from './CommitPushButton';
import { GitSyncButton } from './GitSyncButton';
import { useAppState, useArtifactState } from '../hooks/useAppState';

interface HeaderProps {
  onQuickFileOpen: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onQuickFileOpen }) => {
  const { 
    currentProject, 
    showArtifacts,
    setShowArtifacts
  } = useAppState();
  
  const { artifacts } = useArtifactState();

  return (
    <header className="h-14 border-b border-gray-700 px-4 flex items-center bg-gray-900">
      {/* Left: Project selector */}
      <div className="flex items-center gap-4">
        <ProjectDropdown />
        
        {/* Quick File Open (Cmd+P) - only show if project with repo */}
        {currentProject?.hasRepository && (
          <button
            onClick={onQuickFileOpen}
            className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-md"
            title="Quick Open (⌘P)"
          >
            <Command size={16} />
          </button>
        )}
      </div>
      
      {/* Center: Project context indicator */}
      <div className="flex-1 flex justify-center">
        {currentProject && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span>Working in project:</span>
            <span className="text-blue-400 font-medium">{currentProject.name}</span>
            {currentProject.hasRepository && (
              <span className="px-2 py-1 bg-green-900/30 text-green-300 rounded text-xs">
                Repository
              </span>
            )}
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
            
            {/* Git sync button (pull/push) - NEW! */}
            {currentProject.hasRepository && (
              <GitSyncButton />
            )}
            
            {/* Git commit/push button */}
            <CommitPushButton />
          </>
        )}
        
        {/* Artifact Toggle - show when there are artifacts OR project selected */}
        {(artifacts.length > 0 || currentProject) && (
          <ArtifactToggle
            isOpen={showArtifacts}
            onClick={() => setShowArtifacts(!showArtifacts)}
            artifactCount={artifacts.length}
            hasGitRepos={currentProject?.hasRepository || false}
            isDark={true}
          />
        )}
      </div>
    </header>
  );
};
