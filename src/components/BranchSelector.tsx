// src/components/BranchSelector.tsx
// Git branch management component for Phase 3

import React, { useState, useEffect } from 'react';
import { GitBranch, Plus, Check, RefreshCw } from 'lucide-react';
import { API_BASE_URL } from '../services/config';

interface GitBranch {
  name: string;
  is_current: boolean;
  commit_hash?: string;
  commit_message?: string;
}

interface BranchSelectorProps {
  projectId: string;
  attachmentId: string;
  onBranchChange?: (branchName: string) => void;
  isDark: boolean;
}

export function BranchSelector({ projectId, attachmentId, onBranchChange, isDark }: BranchSelectorProps) {
  const [branches, setBranches] = useState<GitBranch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadBranches = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/git/branches/${attachmentId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch branches: ${response.statusText}`);
      }
      const data = await response.json();
      setBranches(data.branches || []);
    } catch (err) {
      console.error('Failed to load branches:', err);
      setError(err instanceof Error ? err.message : 'Failed to load branches');
    } finally {
      setIsLoading(false);
    }
  };

  const switchBranch = async (branchName: string) => {
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/git/branch/${attachmentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ branch_name: branchName }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to switch branch: ${response.statusText}`);
      }
      
      // Reload branches to update current status
      await loadBranches();
      onBranchChange?.(branchName);
    } catch (err) {
      console.error('Failed to switch branch:', err);
      setError(err instanceof Error ? err.message : 'Failed to switch branch');
    }
  };

  const createBranch = async () => {
    if (!newBranchName.trim()) return;
    
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/git/branch/${attachmentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          branch_name: newBranchName.trim(),
          create_new: true 
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create branch: ${response.statusText}`);
      }
      
      setNewBranchName('');
      setIsCreating(false);
      await loadBranches();
      onBranchChange?.(newBranchName.trim());
    } catch (err) {
      console.error('Failed to create branch:', err);
      setError(err instanceof Error ? err.message : 'Failed to create branch');
    }
  };

  useEffect(() => {
    if (projectId && attachmentId) {
      loadBranches();
    }
  }, [projectId, attachmentId]);

  const currentBranch = branches.find(b => b.is_current);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <GitBranch className="w-5 h-5" />
          <h3 className="font-medium">Git Branches</h3>
        </div>
        <button
          onClick={loadBranches}
          disabled={isLoading}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          title="Refresh branches"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className="p-2 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm rounded">
          {error}
        </div>
      )}

      {/* Current branch */}
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

      {/* Branch list */}
      <div className="space-y-1 max-h-60 overflow-y-auto">
        {branches
          .filter(branch => !branch.is_current)
          .map((branch) => (
            <button
              key={branch.name}
              onClick={() => switchBranch(branch.name)}
              className="w-full text-left p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-colors"
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

      {/* Create new branch */}
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
                disabled={!newBranchName.trim()}
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
            className="w-full flex items-center justify-center space-x-2 p-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create new branch</span>
          </button>
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      )}
    </div>
  );
}
