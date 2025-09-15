// src/components/CommitHistory.tsx
import React, { useState, useEffect } from 'react';
import { GitCommit, Calendar, User, Hash, RefreshCw, ChevronRight } from 'lucide-react';
import { createGitCommand } from '../types/websocket';
import type { WsClientMessage } from '../types/websocket';

interface GitCommitInfo {
  hash: string;
  short_hash: string;
  message: string;
  author: string;
  author_email: string;
  timestamp: string;
  files_changed?: number;
  insertions?: number;
  deletions?: number;
}

interface CommitHistoryProps {
  projectId: string;
  attachmentId: string;
  onCommitSelect?: (commit: GitCommitInfo) => void;
  isDark: boolean;
  send?: (message: WsClientMessage) => void;
  onGitResponse?: (handler: (data: any) => void) => void;
}

export function CommitHistory({ 
  projectId, 
  attachmentId, 
  onCommitSelect, 
  isDark,
  send,
  onGitResponse
}: CommitHistoryProps) {
  const [commits, setCommits] = useState<GitCommitInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedCommit, setExpandedCommit] = useState<string | null>(null);
  const [limit, setLimit] = useState(20);

  useEffect(() => {
    const handleGitData = (data: any) => {
      setIsLoading(false);
      
      if (data.type === 'commit_history') {
        setCommits(data.commits || []);
      } else if (data.type === 'error') {
        setError(data.message || 'An error occurred');
      }
    };

    if (onGitResponse) {
      onGitResponse(handleGitData);
    }
  }, [onGitResponse]);

  useEffect(() => {
    if (projectId && attachmentId && send) {
      loadCommits();
    }
  }, [projectId, attachmentId, send]);

  const loadCommits = (newLimit?: number) => {
    if (!send) {
      console.warn('Cannot load commits: WebSocket not connected');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    const commitLimit = newLimit || limit;
    
    send(createGitCommand('git.commits', {
      project_id: projectId,
      attachment_id: attachmentId,
      limit: commitLimit
    }));
  };

  const loadMoreCommits = () => {
    const newLimit = limit + 20;
    setLimit(newLimit);
    loadCommits(newLimit);
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 168) {
      return `${Math.floor(diffInHours / 24)}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const toggleCommitExpansion = (hash: string) => {
    setExpandedCommit(expandedCommit === hash ? null : hash);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <GitCommit className="w-5 h-5" />
          <h3 className="font-medium">Commit History</h3>
        </div>
        <button
          onClick={() => loadCommits()}
          disabled={isLoading || !send}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          title="Refresh commits"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="p-2 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm rounded">
          {error}
        </div>
      )}

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {commits.map((commit, index) => (
          <div key={commit.hash} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div 
              className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
              onClick={() => toggleCommitExpansion(commit.hash)}
            >
              <div className="flex items-start space-x-3">
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full ${
                    index === 0 ? 'bg-green-500' : 'bg-gray-400 dark:bg-gray-600'
                  }`} />
                  {index < commits.length - 1 && (
                    <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mt-1" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-medium text-sm truncate">{commit.message}</span>
                    <ChevronRight className={`w-4 h-4 transition-transform ${
                      expandedCommit === commit.hash ? 'rotate-90' : ''
                    }`} />
                  </div>
                  
                  <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center space-x-1">
                      <User className="w-3 h-3" />
                      <span>{commit.author}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(commit.timestamp)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Hash className="w-3 h-3" />
                      <span className="font-mono">{commit.short_hash}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {expandedCommit === commit.hash && (
              <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-3">
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Full Hash:</span>
                    <code className="ml-2 font-mono text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded">
                      {commit.hash}
                    </code>
                  </div>
                  
                  <div>
                    <span className="font-medium">Author:</span>
                    <span className="ml-2">{commit.author} &lt;{commit.author_email}&gt;</span>
                  </div>
                  
                  <div>
                    <span className="font-medium">Date:</span>
                    <span className="ml-2">{new Date(commit.timestamp).toLocaleString()}</span>
                  </div>

                  {(commit.files_changed || commit.insertions || commit.deletions) && (
                    <div className="flex items-center space-x-4 pt-2 border-t border-gray-200 dark:border-gray-600">
                      {commit.files_changed && (
                        <span className="text-xs">
                          <strong>{commit.files_changed}</strong> files changed
                        </span>
                      )}
                      {commit.insertions && (
                        <span className="text-xs text-green-600 dark:text-green-400">
                          <strong>+{commit.insertions}</strong> insertions
                        </span>
                      )}
                      {commit.deletions && (
                        <span className="text-xs text-red-600 dark:text-red-400">
                          <strong>-{commit.deletions}</strong> deletions
                        </span>
                      )}
                    </div>
                  )}

                  {onCommitSelect && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCommitSelect(commit);
                      }}
                      className="mt-2 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                    >
                      View Files at This Commit
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {commits.length > 0 && commits.length === limit && (
        <button
          onClick={loadMoreCommits}
          disabled={isLoading || !send}
          className="w-full py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Loading...' : 'Load More Commits'}
        </button>
      )}

      {isLoading && commits.length === 0 && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      )}

      {!isLoading && commits.length === 0 && !error && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <GitCommit className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No commits found</p>
        </div>
      )}
    </div>
  );
}
