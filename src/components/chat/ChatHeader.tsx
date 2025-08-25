// src/components/chat/ChatHeader.tsx
// PHASE 2: Extracted chat header component (~80 lines)
// Responsibilities: Header UI, status indicators, controls

import React from 'react';
import { Sun, Moon, Cpu, Settings } from 'lucide-react';
import SidebarToggle from '../SidebarToggle';
import ArtifactToggle from '../ArtifactToggle';

interface Project {
  id: string;
  name: string;
}

interface ChatHeaderProps {
  isDark: boolean;
  isConnected: boolean;
  toolsActive: boolean;
  statusMessage: string;
  currentProject?: Project;
  artifactCount: number;
  showArtifacts: boolean;
  onToggleSidebar: () => void;
  onToggleTheme: () => void;
  onToggleArtifacts: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  isDark,
  isConnected,
  toolsActive,
  statusMessage,
  currentProject,
  artifactCount,
  showArtifacts,
  onToggleSidebar,
  onToggleTheme,
  onToggleArtifacts
}) => {
  return (
    <div className="border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <SidebarToggle 
          onClick={onToggleSidebar} 
          isDark={isDark}
        />
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <span className="font-semibold">Mira</span>
          {currentProject && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              • {currentProject.name}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Connection Status */}
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        
        {/* Tools Active Indicator */}
        {toolsActive && (
          <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-full">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <span className="text-xs text-blue-700 dark:text-blue-300">Tools Running</span>
          </div>
        )}

        {/* Status Message */}
        {statusMessage && (
          <div className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-300 max-w-48 truncate">
            {statusMessage}
          </div>
        )}

        {/* Artifact Toggle */}
        {currentProject && artifactCount > 0 && (
          <ArtifactToggle 
            artifactCount={artifactCount}
            onClick={onToggleArtifacts}
            isDark={isDark}
            isOpen={showArtifacts}
          />
        )}

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Settings (placeholder) */}
        <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
