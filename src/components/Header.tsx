// src/components/Header.tsx
import React, { useState } from 'react';
import { ChevronDown, GitBranch, Play, Command, Archive } from 'lucide-react';
import { ProjectDropdown } from './ProjectDropdown';
import { QuickFileOpen } from './QuickFileOpen';
import { RunButton } from './RunButton';
import { CommitPushButton } from './CommitPushButton';
import { useAppState } from '../hooks/useAppState';

export const Header: React.FC = () => {
  const { currentProject, modifiedFiles, currentBranch } = useAppState();

  return (
    <header className="h-14 border-b border-slate-700 bg-slate-900 px-4 flex items-center">
      {/* Left: Project selector like Claude's model selector */}
      <div className="flex items-center gap-3">
        <ProjectDropdown />
        
        {/* Branch indicator (subtle, only when project exists) */}
        {currentProject && currentBranch && (
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <GitBranch size={12} />
            <span>{currentBranch}</span>
          </div>
        )}
      </div>
      
      {/* Center: Git status (subtle feedback) */}
      <div className="flex-1 flex justify-center">
        {modifiedFiles.length > 0 && (
          <div className="flex items-center gap-1 text-sm text-amber-400">
            <span>{modifiedFiles.length} file{modifiedFiles.length !== 1 ? 's' : ''} modified</span>
          </div>
        )}
      </div>
      
      {/* Right: The dev action buttons */}
      <div className="flex items-center gap-2">
        <QuickFileOpen />
        <RunButton />
        <CommitPushButton />
      </div>
    </header>
  );
};
