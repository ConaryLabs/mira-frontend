// src/components/ArtifactPanel.tsx
// FIXED: Proper height constraints for Monaco editor

import React, { useState, useCallback } from 'react';
import { X, Copy, Save, FileText, Code } from 'lucide-react';
import { useArtifacts } from '../hooks/useArtifacts';
import { MonacoEditor } from './MonacoEditor';

export const ArtifactPanel: React.FC = () => {
  const { 
    artifacts, 
    activeArtifact, 
    setActiveArtifact, 
    closeArtifacts,
    saveArtifactToFile,
    copyArtifact,
    updateArtifact,
    removeArtifact
  } = useArtifacts();
  
  const handleContentChange = useCallback((newContent: string | undefined) => {
    if (activeArtifact && newContent !== undefined) {
      updateArtifact(activeArtifact.id, { content: newContent });
    }
  }, [activeArtifact, updateArtifact]);

  const handleSaveToFile = async () => {
    if (!activeArtifact) return;
    const filename = prompt('Save as:', activeArtifact.path);
    if (filename) {
      await saveArtifactToFile(activeArtifact.id, filename);
    }
  };

  const getDisplayName = (path: string): string => {
    return path.split('/').pop() || path;
  };

  const getIcon = (language?: string) => {
    if (language && ['javascript', 'typescript', 'rust', 'python', 'json'].includes(language)) {
      return <Code size={16} />;
    }
    return <FileText size={16} />;
  };

  if (artifacts.length === 0) {
    return (
      <div className="h-full w-full border-l border-gray-700 bg-gray-900 flex flex-col">
        <div className="flex-1 flex items-center justify-center p-8 text-center">
          <div className="text-gray-400">
            <FileText size={48} className="mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No Artifacts Yet</h3>
            <p className="text-sm">
              Ask Mira to create code or documents and they'll appear here for editing.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!activeArtifact) return null;

  return (
    <div className="h-full w-full border-l border-gray-700 bg-gray-900 flex flex-col">
      {/* Header with tabs - FIXED HEIGHT */}
      <div className="flex-shrink-0 border-b border-gray-700">
        <div className="flex items-center overflow-x-auto">
          {artifacts.map((artifact) => (
            <div
              key={artifact.id}
              className={`flex items-center gap-2 px-3 py-2 text-sm border-b-2 whitespace-nowrap transition-colors ${
                artifact.id === activeArtifact.id
                  ? 'border-blue-500 text-blue-400 bg-blue-900/20'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              }`}
            >
              <button
                onClick={() => setActiveArtifact(artifact.id)}
                className="flex items-center gap-2"
              >
                {getIcon(artifact.language)}
                <span className="max-w-[120px] truncate">
                  {getDisplayName(artifact.path)}
                </span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeArtifact(artifact.id);
                }}
                className="ml-1 p-0.5 hover:text-red-400 hover:bg-gray-700 rounded transition-colors"
                title="Close"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
        
        {/* Action bar - FIXED HEIGHT */}
        <div className="h-10 px-3 flex items-center justify-between border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="truncate max-w-[300px]">{activeArtifact.path}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => copyArtifact(activeArtifact.id)}
              className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded transition-colors"
              title="Copy to clipboard"
            >
              <Copy size={16} />
            </button>
            <button
              onClick={handleSaveToFile}
              className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded transition-colors"
              title="Save as..."
            >
              <Save size={16} />
            </button>
            <button
              onClick={closeArtifacts}
              className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded transition-colors"
              title="Close panel"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
      
      {/* Editor - TAKES REMAINING HEIGHT */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <MonacoEditor
          value={activeArtifact.content}
          language={activeArtifact.language || 'plaintext'}
          onChange={handleContentChange}
          options={{ readOnly: false }}
        />
      </div>
    </div>
  );
};