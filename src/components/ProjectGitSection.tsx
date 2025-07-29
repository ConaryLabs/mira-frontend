// src/components/ProjectGitSection.tsx
import React, { useState, useEffect } from 'react';
import { GitBranch, Plus, RefreshCw, Check, Clock } from 'lucide-react';
import { gitApi, GitRepoAttachment } from '../services/gitApi';

interface ProjectGitSectionProps {
  projectId: string;
  onFileRequest?: (repoId: string, filePath: string) => void;
  isDark?: boolean;
}

export const ProjectGitSection: React.FC<ProjectGitSectionProps> = ({ 
  projectId,
  onFileRequest,
  isDark 
}) => {
  const [repos, setRepos] = useState<GitRepoAttachment[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRepos();
  }, [projectId]);

  const loadRepos = async () => {
    try {
      const response = await gitApi.listRepos(projectId);
      setRepos(response.repos);
    } catch (error) {
      console.error('Failed to load repos:', error);
    }
  };

  const handleAttach = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl.trim()) return;

    try {
      setLoading(true);
      await gitApi.attachRepo(projectId, { repo_url: repoUrl });
      setRepoUrl('');
      setShowAddForm(false);
      
      // Poll for status updates
      const pollInterval = setInterval(async () => {
        const response = await gitApi.listRepos(projectId);
        setRepos(response.repos);
        
        // Stop polling when all repos are imported
        if (response.repos.every(r => r.import_status === 'Imported')) {
          clearInterval(pollInterval);
        }
      }, 3000);
      
      // Initial load
      await loadRepos();
    } catch (error) {
      console.error('Failed to attach repo:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Imported':
        return <Check className="w-3 h-3 text-green-600" />;
      case 'Cloned':
      case 'Pending':
        return <Clock className="w-3 h-3 text-yellow-600 animate-pulse" />;
      default:
        return null;
    }
  };

  return (
    <div className="border-t border-gray-200 pt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700 flex items-center gap-1">
          <GitBranch className="w-4 h-4" />
          Git Repositories
        </h3>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            Add
          </button>
        )}
      </div>

      {showAddForm && (
        <form onSubmit={handleAttach} className="mb-3">
          <input
            type="url"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/user/repo.git"
            className={`w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${
              isDark 
                ? 'border-gray-600 bg-gray-700 text-gray-100 placeholder-gray-400' 
                : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
            }`}
            autoFocus
            required
          />
          <div className="flex gap-2 mt-2">
            <button
              type="submit"
              disabled={loading}
              className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Attaching...' : 'Attach'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setRepoUrl('');
              }}
              className="text-xs px-3 py-1 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {repos.map((repo) => (
          <div key={repo.id} className="text-sm text-gray-600">
            <div className="flex items-center gap-2">
              {getStatusIcon(repo.import_status)}
              <span className="truncate">
                {repo.repo_url.split('/').pop()?.replace('.git', '')}
              </span>
            </div>
            {repo.import_status === 'Pending' && (
              <span className="text-xs text-gray-500 ml-5">Cloning...</span>
            )}
            {repo.import_status === 'Cloned' && (
              <span className="text-xs text-gray-500 ml-5">Importing files...</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
