// src/components/ArtifactViewer.tsx
import React, { useState, useEffect } from 'react';
import { X, FileText, Code, Database, Clock, GitBranch } from 'lucide-react';
import { ArtifactFileManager } from './ArtifactFileManager';

interface Artifact {
  id: string;
  name: string;
  content: string;
  artifact_type: 'code' | 'document' | 'data';
  language?: string;
  created_at: string;
  updated_at: string;
}

interface ArtifactViewerProps {
  projectId: string;
  isDark: boolean;
  onClose: () => void;
  selectedArtifactId?: string;
  recentArtifacts?: Artifact[];
  isExpanded?: boolean;
}

const ArtifactViewer: React.FC<ArtifactViewerProps> = ({
  projectId,
  isDark,
  onClose,
  selectedArtifactId,
  recentArtifacts = [],
  isExpanded = false
}) => {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'artifacts' | 'files'>('artifacts');
  const [isEditingFile, setIsEditingFile] = useState(false);

  useEffect(() => {
    fetchArtifacts();
  }, [projectId]);

  useEffect(() => {
    if (selectedArtifactId && artifacts.length > 0) {
      const artifact = artifacts.find(a => a.id === selectedArtifactId) || 
                      recentArtifacts.find(a => a.id === selectedArtifactId);
      if (artifact) {
        setSelectedArtifact(artifact);
        setActiveTab('artifacts');
      }
    }
  }, [selectedArtifactId, artifacts, recentArtifacts]);

  const fetchArtifacts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}/artifacts`);
      const data = await response.json();
      
      // Merge recent artifacts with fetched ones
      const allArtifacts = [...recentArtifacts];
      data.artifacts?.forEach((artifact: Artifact) => {
        if (!allArtifacts.find(a => a.id === artifact.id)) {
          allArtifacts.push(artifact);
        }
      });
      
      setArtifacts(allArtifacts);
    } catch (error) {
      console.error('Failed to fetch artifacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getArtifactIcon = (type: string) => {
    switch (type) {
      case 'code':
        return <Code className="w-4 h-4" />;
      case 'document':
        return <FileText className="w-4 h-4" />;
      case 'data':
        return <Database className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getLanguageLabel = (language?: string) => {
    if (!language) return '';
    const labels: Record<string, string> = {
      javascript: 'JS',
      typescript: 'TS',
      python: 'PY',
      java: 'JAVA',
      cpp: 'C++',
      go: 'GO',
      rust: 'RS',
      markdown: 'MD',
    };
    return labels[language] || language.toUpperCase();
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <div className={`${isEditingFile ? 'w-[800px]' : 'w-96'} h-full ${isDark ? 'bg-gray-800' : 'bg-white'} border-l ${isDark ? 'border-gray-700' : 'border-gray-200'} flex flex-col transition-all duration-300`}>
      {/* Header */}
      <div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
        <h2 className="font-semibold">Project Resources</h2>
        <button
          onClick={onClose}
          className={`p-1 rounded hover:${isDark ? 'bg-gray-700' : 'bg-gray-100'} transition-colors`}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className={`flex border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
        <button
          onClick={() => setActiveTab('artifacts')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'artifacts'
              ? isDark
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-blue-600 border-b-2 border-blue-600'
              : isDark
              ? 'text-gray-400 hover:text-gray-300'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <FileText className="w-4 h-4" />
            Artifacts
          </div>
        </button>
        <button
          onClick={() => setActiveTab('files')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'files'
              ? isDark
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-blue-600 border-b-2 border-blue-600'
              : isDark
              ? 'text-gray-400 hover:text-gray-300'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <GitBranch className="w-4 h-4" />
            Git Files
          </div>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'artifacts' ? (
          <>
            {/* Artifact List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-gray-500">Loading artifacts...</div>
              ) : artifacts.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No artifacts yet. They'll appear here as we work together.
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {artifacts.map((artifact) => (
                    <button
                      key={artifact.id}
                      onClick={() => setSelectedArtifact(artifact)}
                      className={`w-full p-3 text-left hover:${isDark ? 'bg-gray-700' : 'bg-gray-50'} transition-colors ${
                        selectedArtifact?.id === artifact.id ? (isDark ? 'bg-gray-700' : 'bg-gray-50') : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          {getArtifactIcon(artifact.artifact_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm truncate">{artifact.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            {artifact.language && (
                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                              }`}>
                                {getLanguageLabel(artifact.language)}
                              </span>
                            )}
                            <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'} flex items-center gap-1`}>
                              <Clock className="w-3 h-3" />
                              {formatTimestamp(artifact.updated_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Artifact Preview */}
            {selectedArtifact && (
              <div className={`border-t ${isDark ? 'border-gray-700' : 'border-gray-200'} flex flex-col h-1/2`}>
                <div className={`p-3 flex items-center justify-between ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <h3 className="font-medium text-sm">{selectedArtifact.name}</h3>
                  <button
                    onClick={() => setSelectedArtifact(null)}
                    className={`p-1 rounded hover:${isDark ? 'bg-gray-600' : 'bg-gray-200'} transition-colors`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className={`flex-1 overflow-y-auto p-3 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
                  <pre className={`text-xs font-mono whitespace-pre-wrap ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {selectedArtifact.content}
                  </pre>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 overflow-hidden">
            <ArtifactFileManager 
              projectId={projectId}
              isDark={isDark}
              onFileUpdate={(filePath, content) => {
                console.log(`File ${filePath} updated with new content`);
                // You could create an artifact from the edited file here if needed
              }}
              onEditingChange={(editing) => setIsEditingFile(editing)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ArtifactViewer;
