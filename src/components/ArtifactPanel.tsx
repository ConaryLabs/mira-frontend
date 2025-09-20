// src/components/ArtifactPanel.tsx
import React, { useState } from 'react';
import { X, Copy, Download, Save, FileText, Code } from 'lucide-react';
import { useArtifacts } from '../hooks/useArtifacts';
import { MonacoEditor } from './MonacoEditor';

export const ArtifactPanel: React.FC = () => {
  const { 
    artifacts, 
    activeArtifact, 
    setActiveArtifact, 
    closeArtifacts,
    saveArtifactToFile,
    copyArtifact
  } = useArtifacts();
  
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  if (!activeArtifact) return null;

  const handleSaveToFile = async () => {
    const filename = prompt('Save as:', activeArtifact.title || 'untitled');
    if (filename) {
      await saveArtifactToFile(activeArtifact.id, filename);
    }
  };

  const getLanguageFromType = (type: string): string => {
    switch (type) {
      case 'text/markdown': return 'markdown';
      case 'application/javascript': return 'javascript';
      case 'application/typescript': return 'typescript';
      case 'text/html': return 'html';
      case 'text/css': return 'css';
      case 'application/json': return 'json';
      case 'text/python': return 'python';
      case 'text/rust': return 'rust';
      default: return 'plaintext';
    }
  };

  const getIconForType = (type: string) => {
    if (type.includes('code') || type.includes('javascript') || type.includes('typescript')) {
      return <Code size={16} />;
    }
    return <FileText size={16} />;
  };

  return (
    <div className="w-[40%] min-w-[400px] border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex flex-col">
      {/* Header with tabs - like Claude */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        {/* Tabs */}
        <div className="flex items-center overflow-x-auto">
          {artifacts.map((artifact) => (
            <button
              key={artifact.id}
              onClick={() => setActiveArtifact(artifact.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm border-b-2 whitespace-nowrap ${
                artifact.id === activeArtifact.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              {getIconForType(artifact.type)}
              <span className="max-w-[120px] truncate">
                {artifact.title || 'Untitled'}
              </span>
            </button>
          ))}
        </div>
        
        {/* Action bar */}
        <div className="h-10 px-3 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>{activeArtifact.linkedFile || 'Unsaved'}</span>
            {activeArtifact.linkedFile && (
              <span className="px-1 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
                Saved
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            <button
              onClick={() => copyArtifact(activeArtifact.id)}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
              title="Copy"
            >
              <Copy size={14} />
            </button>
            
            <button
              onClick={handleSaveToFile}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
              title="Save to file"
            >
              <Save size={14} />
            </button>
            
            <button
              onClick={closeArtifacts}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded ml-2"
              title="Close"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </div>
      
      {/* Content area */}
      <div className="flex-1 overflow-hidden">
        {activeArtifact.type === 'text/html' ? (
          // HTML preview
          <iframe
            srcDoc={activeArtifact.content}
            className="w-full h-full border-0"
            title="HTML Preview"
          />
        ) : (
          // Code editor
          <MonacoEditor
            value={activeArtifact.content}
            language={getLanguageFromType(activeArtifact.type)}
            onChange={(value) => {
              // Update artifact content as user types
              // This would integrate with your artifact state management
            }}
            options={{
              readOnly: false,
              minimap: { enabled: false },
              lineNumbers: 'on',
              fontSize: 14,
              fontFamily: 'JetBrains Mono, Consolas, monospace',
              theme: 'vs-dark', // TODO: respect system theme
            }}
          />
        )}
      </div>
    </div>
  );
};
