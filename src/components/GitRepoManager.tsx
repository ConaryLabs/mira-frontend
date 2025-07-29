// src/components/GitRepoManager.tsx
import React, { useState, useEffect } from 'react';
import { GitBranch, RefreshCw, Plus, ExternalLink, Check, AlertCircle } from 'lucide-react';
import { gitApi, GitRepoAttachment } from '../services/gitApi';

interface GitRepoManagerProps {
  projectId: string;
}

export const GitRepoManager: React.FC<GitRepoManagerProps> = ({ projectId }) => {
  const [repos, setRepos] = useState<GitRepoAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAttachForm, setShowAttachForm] = useState(false);
  const [repoUrl, setRepoUrl] = useState('');
  const [syncMessage, setSyncMessage] = useState('');
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRepos();
  }, [projectId]);

  const loadRepos = async () => {
    try {
      setLoading(true);
      const response = await gitApi.listRepos(projectId);
      setRepos(response.repos);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load repositories');
    } finally {
      setLoading(false);
    }
  };

  const handleAttachRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl.trim()) return;

    try {
      setLoading(true);
      setError(null);
      await gitApi.attachRepo(projectId, { repo_url: repoUrl });
      setRepoUrl('');
      setShowAttachForm(false);
      await loadRepos();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to attach repository');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncRepo = async (attachmentId: string) => {
    if (!syncMessage.trim()) {
      setError('Please provide a commit message');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await gitApi.syncRepo(projectId, attachmentId, { commit_message: syncMessage });
      setSyncMessage('');
      setSelectedRepo(null);
      await loadRepos();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to sync repository');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Imported':
        return <Check className="w-4 h-4 text-green-600" />;
      case 'Cloned':
        return <RefreshCw className="w-4 h-4 text-blue-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <GitBranch className="w-6 h-6" />
          Git Repositories
        </h2>
        <button
          onClick={() => setShowAttachForm(!showAttachForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Attach Repository
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {showAttachForm && (
        <form onSubmit={handleAttachRepo} className="mb-6 p-4 bg-gray-50 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Repository URL
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/username/repository.git"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Attaching...' : 'Attach'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAttachForm(false);
                setRepoUrl('');
              }}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading && !repos.length ? (
        <div className="text-center py-8 text-gray-500">Loading repositories...</div>
      ) : repos.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No repositories attached to this project yet.
        </div>
      ) : (
        <div className="space-y-4">
          {repos.map((repo) => (
            <div key={repo.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusIcon(repo.import_status)}
                    <h3 className="font-medium">{repo.repo_url.split('/').pop()?.replace('.git', '')}</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">{repo.repo_url}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>Status: {repo.import_status}</span>
                    {repo.last_sync_at && (
                      <span>Last synced: {new Date(repo.last_sync_at).toLocaleString()}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={repo.repo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-gray-600 hover:text-gray-800"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {selectedRepo === repo.id ? (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Commit Message
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={syncMessage}
                      onChange={(e) => setSyncMessage(e.target.value)}
                      placeholder="Update from Mira"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => handleSyncRepo(repo.id)}
                      disabled={loading}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {loading ? 'Syncing...' : 'Sync'}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedRepo(null);
                        setSyncMessage('');
                      }}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setSelectedRepo(repo.id)}
                  className="mt-3 text-sm text-blue-600 hover:text-blue-700"
                >
                  Sync Changes
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
