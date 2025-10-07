// src/components/Header.tsx
import React from 'react';
import { Play, Command, Folder, Settings } from 'lucide-react';
import ArtifactToggle from './ArtifactToggle';
import { CommitPushButton } from './CommitPushButton';
import { GitSyncButton } from './GitSyncButton';
import { useAppState, useArtifactState } from '../stores/useAppState';
import { useUIStore } from '../stores/useUIStore';

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
  const { setActiveTab } = useUIStore();
  
  return (
    <header className="h-14 border-b border-gray-700 px-4 flex items-center bg-gray-900">
      {/* Left: Project selector button */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setActiveTab('projects')}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-600 transition-colors"
          title="Open Projects"
        >
          <Folder size={16} className="text-slate-400" />
          <span className="text-sm text-slate-200">
            {currentProject?.name || 'No Project'}
          </span>
          <Settings size={14} className="text-slate-500" />
        </button>
        
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
            
            {/* Git sync button (pull/push) */}
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
