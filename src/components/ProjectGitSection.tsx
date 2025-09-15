import React, { useState, useEffect } from 'react';
import { GitBranch, Plus, RefreshCw, Check, Clock } from 'lucide-react';
import { createGitCommand } from '../types/websocket';
import type { WsClientMessage } from '../types/websocket';

interface GitRepoAttachment {
  id: string;
  project_id: string;
  repo_url: string;
  local_path: string;
  import_status: 'Pending' | 'Cloned' | 'Imported';
  last_imported_at?: string;
  last_sync_at?: string;
}

interface ProjectGitSectionProps {
  projectId: string;
  onFileRequest?: (repoId: string, filePath: string) => void;
  isDark?: boolean;
  send?: (message: WsClientMessage) => void;
  onGitResponse?: (data: any) => void;
}

export const ProjectGitSection: React.FC<ProjectGitSectionProps> = ({ 
  projectId,
  onFileRequest,
  isDark,
  send,
  onGitResponse
}) => {
  const [repos, setRepos] = useState<GitRepoAttachment[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleGitData = (data: any) => {
      if (data.type === 'repo_list') {
        setRepos(data.repos || []);
        
        if (data.repos?.every((r: GitRepoAttachment) => r.import_status === 'Imported')) {
          if (pollInterval) {
            clearInterval(pollInterval);
            setPollInterval(null);
          }
        }
      } else if (data.type === 'repo_attached') {
        loadRepos();
        startPolling();
      }
    };

    if (onGitResponse) {
      onGitResponse(handleGitData);
    }

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [pollInterval, onGitResponse]);

  useEffect(() => {
    loadRepos();
  }, [projectId, send]);

  const loadRepos = () => {
    if (!send) {
      console.warn('Cannot load repos: WebSocket not connected');
      return;
    }
    send(createGitCommand('git.list_repos', { project_id: projectId }));
  };

  const startPolling = () => {
    if (pollInterval) {
      clearInterval(pollInterval);
    }

    const interval = setInterval(() => {
      loadRepos();
    }, 3000);
    
    setPollInterval(interval);
  };

  const handleAttach = (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl.trim() || !send) return;

    setLoading(true);
    send(createGitCommand('git.attach', { 
      project_id: projectId,
      repo_url: repoUrl 
    }));
    
    setRepoUrl('');
    setShowAddForm(false);
    setLoading(false);
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
              disabled={loading || !send}
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
