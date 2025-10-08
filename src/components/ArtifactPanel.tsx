// src/components/ArtifactPanel.tsx
// FIXED: Proper markdown rendering + Monaco for code files

import React, { useState, useCallback } from 'react';
import { X, Copy, Save, FileText, Code, BookOpen } from 'lucide-react';
import { useArtifacts } from '../hooks/useArtifacts';
import { MonacoEditor } from './MonacoEditor';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

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
  
  const [viewMode, setViewMode] = useState<'editor' | 'preview'>('editor');
  
  const handleContentChange = useCallback((newContent: string | undefined) => {
    if (activeArtifact && newContent !== undefined) {
      updateArtifact(activeArtifact.id, { content: newContent });
    }
  }, [activeArtifact, updateArtifact]);

  const handleSaveToFile = async () => {
    if (!activeArtifact) return;
    
    // Use artifact's path as default, or generate one from title
    const defaultPath = activeArtifact.path || activeArtifact.title;
    const filename = prompt('Save as:', defaultPath);
    
    if (filename) {
      // If the user provides a relative path, ensure it doesn't dump to root
      const savePath = filename.startsWith('/') ? filename : `./${filename}`;
      await saveArtifactToFile(activeArtifact.id, savePath);
    }
  };

  const getDisplayName = (path: string): string => {
    return path.split('/').pop() || path;
  };

  const getIcon = (language?: string) => {
    if (language === 'markdown') return <BookOpen size={16} />;
    if (language && ['javascript', 'typescript', 'rust', 'python'].includes(language)) {
      return <Code size={16} />;
    }
    return <FileText size={16} />;
  };

  // Determine if we should show markdown preview
  const isMarkdown = activeArtifact?.language === 'markdown';
  const canPreview = isMarkdown;

  if (artifacts.length === 0) {
    return (
      <div className="flex-none w-1/2 min-w-[600px] border-l border-gray-700 bg-gray-900 flex flex-col">
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
    <div className="flex-none w-1/2 min-w-[600px] border-l border-gray-700 bg-gray-900 flex flex-col">
      {/* Header with tabs */}
      <div className="border-b border-gray-700">
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
        
        {/* Action bar */}
        <div className="h-10 px-3 flex items-center justify-between border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>{activeArtifact.path}</span>
            </div>
            
            {/* View mode toggle for markdown */}
            {canPreview && (
              <div className="flex items-center gap-1 bg-gray-800 rounded p-0.5">
                <button
                  onClick={() => setViewMode('editor')}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    viewMode === 'editor'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  Edit
                </button>
                <button
                  onClick={() => setViewMode('preview')}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    viewMode === 'preview'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  Preview
                </button>
              </div>
            )}
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
      
      {/* Content area - Editor or Preview */}
      <div className="flex-1 overflow-auto">
        {isMarkdown && viewMode === 'preview' ? (
          <div className="p-6 prose prose-invert prose-slate max-w-none">
            <ReactMarkdown
              components={{
                code(props) {
                  const { node, inline, className, children, ...rest } = props as any;
                  const match = /language-(\w+)/.exec(className || '');
                  return !(inline as boolean) && match ? (
                    <SyntaxHighlighter
                      style={vscDarkPlus as any}
                      language={match[1]}
                      PreTag="div"
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={className} {...rest}>
                      {children}
                    </code>
                  );
                }
              }}
            >
              {activeArtifact.content}
            </ReactMarkdown>
          </div>
        ) : (
          <MonacoEditor
            value={activeArtifact.content}
            language={activeArtifact.language || 'plaintext'}
            onChange={handleContentChange}
            options={{ 
              readOnly: false,
              wordWrap: isMarkdown ? 'on' : 'off',
              lineNumbers: isMarkdown ? 'off' : 'on',
            }}
          />
        )}
      </div>
    </div>
  );
};
