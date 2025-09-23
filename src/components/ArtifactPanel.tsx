// src/components/ArtifactPanel.tsx
import React, { useState, useCallback } from 'react';
import { X, Copy, Save, FileText, Code, Eye, Edit3 } from 'lucide-react';
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
    updateArtifact  // This should exist in the hook
  } = useArtifacts();
  
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  
  // Handle content changes from Monaco Editor
  const handleContentChange = useCallback((newContent: string | undefined) => {
    if (activeArtifact && newContent !== undefined) {
      updateArtifact(activeArtifact.id, { 
        content: newContent,
        modified: Date.now()
      });
    }
  }, [activeArtifact, updateArtifact]);

  const handleSaveToFile = async () => {
    if (!activeArtifact) return;
    
    const filename = prompt('Save as:', activeArtifact.linkedFile || activeArtifact.title || 'untitled');
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

  // If no artifacts exist, show a helpful message
  if (artifacts.length === 0) {
    return (
      <div className="w-[40%] min-w-[400px] border-l border-gray-700 bg-gray-900 flex flex-col">
        <div className="flex-1 flex items-center justify-center p-8 text-center">
          <div className="text-gray-400">
            <FileText size={48} className="mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No Artifacts Yet</h3>
            <p className="text-sm">
              Ask Mira to create some code, documents, or other content and they'll appear here for editing.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!activeArtifact) return null;

  const currentLanguage = getLanguageFromType(activeArtifact.type);
  const isPreviewable = activeArtifact.type === 'text/html' || activeArtifact.type === 'text/markdown';

  return (
    <div className="w-[40%] min-w-[400px] border-l border-gray-700 bg-gray-900 flex flex-col">
      {/* Header with tabs */}
      <div className="border-b border-gray-700">
        {/* Tabs */}
        <div className="flex items-center overflow-x-auto">
          {artifacts.map((artifact) => (
            <button
              key={artifact.id}
              onClick={() => setActiveArtifact(artifact.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm border-b-2 whitespace-nowrap transition-colors ${
                artifact.id === activeArtifact.id
                  ? 'border-blue-500 text-blue-400 bg-blue-900/20'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              }`}
            >
              {getIconForType(artifact.type)}
              <span className="max-w-[120px] truncate">
                {artifact.title || 'Untitled'}
              </span>
              {/* Show unsaved indicator */}
              {artifact.linkedFile ? null : (
                <span className="w-2 h-2 bg-orange-400 rounded-full" title="Unsaved" />
              )}
            </button>
          ))}
        </div>
        
        {/* Action bar */}
        <div className="h-10 px-3 flex items-center justify-between border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>{activeArtifact.linkedFile || 'Unsaved'}</span>
              {activeArtifact.linkedFile && (
                <span className="px-1 py-0.5 bg-green-900/30 text-green-300 rounded text-xs">
                  Saved
                </span>
              )}
            </div>
            
            {/* View mode toggle for previewable files */}
            {isPreviewable && (
              <div className="flex items-center ml-4">
                <button
                  onClick={() => setViewMode('edit')}
                  className={`px-2 py-1 text-xs rounded-l ${
                    viewMode === 'edit' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <Edit3 size={12} className="inline mr-1" />
                  Edit
                </button>
                <button
                  onClick={() => setViewMode('preview')}
                  className={`px-2 py-1 text-xs rounded-r ${
                    viewMode === 'preview' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <Eye size={12} className="inline mr-1" />
                  Preview
                </button>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            <button
              onClick={() => copyArtifact(activeArtifact.id)}
              className="p-1.5 hover:bg-gray-800 rounded text-gray-400 hover:text-gray-200"
              title="Copy content"
            >
              <Copy size={14} />
            </button>
            
            <button
              onClick={handleSaveToFile}
              className="p-1.5 hover:bg-gray-800 rounded text-gray-400 hover:text-gray-200"
              title="Save to file"
            >
              <Save size={14} />
            </button>
            
            <button
              onClick={closeArtifacts}
              className="p-1.5 hover:bg-gray-800 rounded text-gray-400 hover:text-gray-200 ml-2"
              title="Close panel"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </div>
      
      {/* Content area */}
      <div className="flex-1 overflow-hidden">
        {activeArtifact.type === 'text/html' && viewMode === 'preview' ? (
          // HTML preview
          <iframe
            srcDoc={activeArtifact.content}
            className="w-full h-full border-0 bg-white"
            title="HTML Preview"
          />
        ) : (
          // Code editor - this is where the magic happens! 🚀
          <MonacoEditor
            value={activeArtifact.content}
            language={currentLanguage}
            onChange={handleContentChange}  // 🔥 This is the KEY change!
            options={{
              readOnly: false,
              minimap: { enabled: false },
              lineNumbers: 'on',
              fontSize: 14,
              fontFamily: 'JetBrains Mono, Consolas, "Courier New", monospace',
              theme: 'vs-dark',
              wordWrap: 'on',
              automaticLayout: true,
              scrollBeyondLastLine: false,
              renderWhitespace: 'selection',
              bracketPairColorization: { enabled: true },
            }}
          />
        )}
      </div>
      
      {/* Status bar */}
      <div className="h-6 px-3 border-t border-gray-700 flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <span>{currentLanguage}</span>
          <span>Lines: {activeArtifact.content.split('\n').length}</span>
          <span>Chars: {activeArtifact.content.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <span>Modified: {new Date(activeArtifact.modified).toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
};
