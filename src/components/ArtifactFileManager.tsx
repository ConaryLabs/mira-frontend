// src/components/ArtifactFileManager.tsx
import React, { useState } from 'react';
import { FileEditor } from './FileEditor';
import { GitFileBrowser } from './GitFileBrowser';
import { gitApi, GitRepoAttachment } from '../services/gitApi';
import { Code2, FolderOpen, X } from 'lucide-react';

interface ArtifactFileManagerProps {
  projectId: string;
  isDark?: boolean;
  onFileUpdate?: (filePath: string, content: string) => void;
  onEditingChange?: (isEditing: boolean) => void;
}

interface ActiveFile {
  attachmentId: string;
  repoName: string;
  filePath: string;
}

export const ArtifactFileManager: React.FC<ArtifactFileManagerProps> = ({
  projectId,
  isDark = false,
  onFileUpdate,
  onEditingChange,
}) => {
  const [repos, setRepos] = useState<GitRepoAttachment[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [activeFile, setActiveFile] = useState<ActiveFile | null>(null);

  React.useEffect(() => {
    loadRepos();
  }, [projectId]);

  const loadRepos = async () => {
    try {
      const response = await gitApi.listRepos(projectId);
      setRepos(response.repos.filter(r => r.import_status === 'Imported'));
      if (response.repos.length > 0 && !selectedRepo) {
        setSelectedRepo(response.repos[0].id);
      }
    } catch (error) {
      console.error('Failed to load repos:', error);
    }
  };

  const handleFileSelect = (filePath: string) => {
    if (!selectedRepo) return;
    
    const repo = repos.find(r => r.id === selectedRepo);
    if (!repo) return;

    setActiveFile({
      attachmentId: selectedRepo,
      repoName: repo.repo_url.split('/').pop()?.replace('.git', '') || 'repo',
      filePath,
    });
    onEditingChange?.(true);
  };

  const handleFileSave = (content: string) => {
    if (activeFile) {
      onFileUpdate?.(activeFile.filePath, content);
    }
  };

  // If there's an active file being edited, show the editor
  if (activeFile) {
    return (
      <div className="h-full flex flex-col">
        <div className={`px-4 py-2 border-b flex items-center justify-between ${
          isDark 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-gray-50 border-gray-200'
        }`}>
          <div className={`flex items-center gap-2 text-sm ${
            isDark ? 'text-gray-300' : 'text-gray-600'
          }`}>
            <Code2 className="w-4 h-4" />
            <span>{activeFile.repoName}</span>
            <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>/</span>
            <span className="font-medium">{activeFile.filePath}</span>
          </div>
          <button
            onClick={() => {
              setActiveFile(null);
              onEditingChange?.(false);
            }}
            className={`p-1 rounded ${
              isDark 
                ? 'hover:bg-gray-700 text-gray-400' 
                : 'hover:bg-gray-200 text-gray-500'
            }`}
            title="Close file"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <FileEditor
            projectId={projectId}
            attachmentId={activeFile.attachmentId}
            filePath={activeFile.filePath}
            isDark={isDark}
            onSave={handleFileSave}
            onClose={() => {
              setActiveFile(null);
              onEditingChange?.(false);
            }}
          />
        </div>
      </div>
    );
  }

  // Otherwise show the file browser
  return (
    <div className="h-full flex flex-col">
      {repos.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <FolderOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No repositories attached to this project</p>
            <p className="text-xs mt-1">Attach a repository to start editing files</p>
          </div>
        </div>
      ) : (
        <>
          <div className={`px-4 py-2 border-b ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
            <select
              value={selectedRepo || ''}
              onChange={(e) => setSelectedRepo(e.target.value)}
              className={`w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                isDark 
                  ? 'border-gray-600 bg-gray-800 text-gray-100' 
                  : 'border-gray-300 bg-white text-gray-900'
              }`}
            >
              {repos.map(repo => (
                <option key={repo.id} value={repo.id}>
                  {repo.repo_url.split('/').pop()?.replace('.git', '')}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 overflow-hidden">
            {selectedRepo && (
              <GitFileBrowser
                projectId={projectId}
                repoId={selectedRepo}
                isDark={isDark}
                onFileSelect={handleFileSelect}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
};
