// src/components/BranchSelector.tsx
import React, { useState, useEffect } from 'react';
import { GitBranch, Plus, Check, RefreshCw } from 'lucide-react';
import { createGitCommand } from '../types/websocket';
import type { WsClientMessage } from '../types/websocket';

interface GitBranchInfo {
  name: string;
  is_current: boolean;
  is_head?: boolean;
  commit_hash?: string;
  commit_message?: string;
}

interface BranchSelectorProps {
  projectId: string;
  attachmentId: string;
  onBranchChange?: (branchName: string) => void;
  isDark: boolean;
  send?: (message: WsClientMessage) => void;
  onGitResponse?: (handler: (data: any) => void) => void;
}

export function BranchSelector({ 
  projectId, 
  attachmentId, 
  onBranchChange, 
  isDark,
  send,
  onGitResponse
}: BranchSelectorProps) {
  const [branches, setBranches] = useState<GitBranchInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleGitData = (data: any) => {
      setIsLoading(false);
      
      if (data.type === 'branch_list') {
        setBranches(data.branches || []);
      } else if (data.type === 'branch_switched') {
        loadBranches();
        if (data.branch_name) {
          onBranchChange?.(data.branch_name);
        }
      } else if (data.type === 'branch_created') {
        setNewBranchName('');
        setIsCreating(false);
        loadBranches();
        if (data.branch_name) {
          onBranchChange?.(data.branch_name);
        }
      } else if (data.type === 'error') {
        setError(data.message || 'An error occurred');
      }
    };

    if (onGitResponse) {
      onGitResponse(handleGitData);
    }
  }, [onGitResponse, onBranchChange]);

  useEffect(() => {
    if (projectId && attachmentId && send) {
      loadBranches();
    }
  }, [projectId, attachmentId, send]);

  const loadBranches = () => {
    if (!send) {
      console.warn('Cannot load branches: WebSocket not connected');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    send(createGitCommand('git.branches', { 
      project_id: projectId,
      attachment_id: attachmentId
    }));
  };

  const switchBranch = (branchName: string) => {
    if (!send) {
      setError('WebSocket not connected');
      return;
    }
    
    setError(null);
    send(createGitCommand('git.switch_branch', {
      project_id: projectId,
      attachment_id: attachmentId,
      branch_name: branchName
    }));
  };

  const createBranch = () => {
    if (!newBranchName.trim() || !send) return;
    
    setError(null);
    send(createGitCommand('git.create_branch', {
      project_id: projectId,
      attachment_id: attachmentId,
      branch_name: newBranchName.trim()
    }));
  };

  const currentBranch = branches.find(b => b.is_current || b.is_head);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <GitBranch className="w-5 h-5" />
          <h3 className="font-medium">Git Branches</h3>
        </div>
        <button
          onClick={loadBranches}
          disabled={isLoading || !send}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          title="Refresh branches"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="p-2 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm rounded">
          {error}
        </div>
      )}

      {currentBranch && (
        <div className="p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg">
          <div className="flex items-center space-x-2">
            <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="font-medium text-green-800 dark:text-green-200">
              {currentBranch.name}
            </span>
            <span className="text-xs text-green-600 dark:text-green-400">(current)</span>
          </div>
          {currentBranch.commit_message && (
            <p className="mt-1 text-xs text-green-700 dark:text-green-300 truncate">
              {currentBranch.commit_message}
            </p>
          )}
        </div>
      )}

      <div className="space-y-1 max-h-60 overflow-y-auto">
        {branches
          .filter(branch => !branch.is_current && !branch.is_head)
          .map((branch) => (
            <button
              key={branch.name}
              onClick={() => switchBranch(branch.name)}
              disabled={!send}
              className="w-full text-left p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
            >
              <div className="flex items-center space-x-2">
                <GitBranch className="w-4 h-4 text-gray-400" />
                <span className="font-medium">{branch.name}</span>
              </div>
              {branch.commit_message && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate pl-6">
                  {branch.commit_message}
                </p>
              )}
            </button>
          ))}
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
        {isCreating ? (
          <div className="space-y-2">
            <input
              type="text"
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              placeholder="Enter branch name"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              autoFocus
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  createBranch();
                } else if (e.key === 'Escape') {
                  setIsCreating(false);
                  setNewBranchName('');
                }
              }}
            />
            <div className="flex space-x-2">
              <button
                onClick={createBranch}
                disabled={!newBranchName.trim() || !send}
                className="flex-1 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setNewBranchName('');
                }}
                className="flex-1 px-3 py-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded hover:bg-gray-400 dark:hover:bg-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsCreating(true)}
            disabled={!send}
            className="w-full flex items-center justify-center space-x-2 p-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>Create new branch</span>
          </button>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      )}
    </div>
  );
}
