// src/components/QuickFileOpen.tsx

import React, { useState, useEffect, useRef } from 'react';
import { Command, File, Folder, Search, X } from 'lucide-react';
import clsx from 'clsx';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAppState } from '../hooks/useAppState';
import { useArtifacts } from '../hooks/useArtifacts';

interface FileNode {
  name: string;
  path: string;
  type?: 'file' | 'directory';
  node_type?: 'File' | 'Directory';
  children?: FileNode[];
}

interface QuickFileOpenProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickFileOpen: React.FC<QuickFileOpenProps> = ({
  isOpen,
  onClose,
}) => {
  const [query, setQuery] = useState('');
  const [files, setFiles] = useState<FileNode[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<FileNode[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const { send, lastMessage } = useWebSocket();
  const { currentProject } = useAppState();
  const { addArtifact } = useArtifacts();

  // Listen for git.tree responses only
  useEffect(() => {
    if (!lastMessage || lastMessage.type !== 'data') return;
    
    const data = lastMessage.data;
    
    // Only handle git.tree responses here
    if (data?.type === 'file_tree' && isOpen) {
      console.log('Git tree response received:', data);
      if (data.tree && Array.isArray(data.tree)) {
        const flatFiles = flattenFiles(data.tree);
        console.log('Processed files:', flatFiles.length);
        setFiles(flatFiles);
        setLoading(false);
      }
    }
    
    // Remove ALL file_content handling from here
    // Let the global handler create artifacts
  }, [lastMessage, isOpen]);

  // Load files when modal opens
  useEffect(() => {
    console.log('QuickFileOpen: Modal state changed:', {
      isOpen,
      hasProject: !!currentProject,
      projectId: currentProject?.id,
      projectName: currentProject?.name,
      hasRepository: currentProject?.hasRepository,
      repositoryUrl: currentProject?.repositoryUrl
    });

    if (isOpen && currentProject?.hasRepository) {
      loadProjectFiles();
      inputRef.current?.focus();
    } else {
      setQuery('');
      setSelectedIndex(0);
      setFiles([]);
    }
  }, [isOpen, currentProject]);

  // Filter files based on query
  useEffect(() => {
    if (!query.trim()) {
      setFilteredFiles(files.slice(0, 50));
    } else {
      const filtered = fuzzySearch(files, query.toLowerCase()).slice(0, 20);
      setFilteredFiles(filtered);
      setSelectedIndex(0);
    }
  }, [query, files]);

  const loadProjectFiles = async () => {
    if (!currentProject?.hasRepository) {
      console.log('No repository attached to current project');
      return;
    }
    
    console.log('Loading git tree for project:', currentProject.id);
    setLoading(true);
    
    try {
      await send({
        type: 'git_command',
        method: 'git.tree',
        params: {
          project_id: currentProject.id
        }
      });
    } catch (error) {
      console.error('Failed to load git tree:', error);
      setLoading(false);
    }
  };

  // Flatten nested file tree into searchable array
  const flattenFiles = (nodes: FileNode[]): FileNode[] => {
    const result: FileNode[] = [];
    
    const addNode = (node: FileNode) => {
      const isFile = node.type === 'file' || 
                     node.node_type === 'File' || 
                     (!node.children || node.children.length === 0);
      
      if (isFile) {
        result.push({
          name: node.name,
          path: node.path,
          type: 'file'
        });
      }
      
      if (node.children && node.children.length > 0) {
        node.children.forEach(addNode);
      }
    };
    
    nodes.forEach(addNode);
    return result;
  };

  // Simple fuzzy search
  const fuzzySearch = (items: FileNode[], query: string): FileNode[] => {
    if (!query.trim()) return items;
    
    return items
      .filter(item => {
        const fileName = item.name.toLowerCase();
        const filePath = item.path.toLowerCase();
        
        if (fileName.includes(query) || filePath.includes(query)) {
          return true;
        }
        
        let queryIndex = 0;
        for (let i = 0; i < fileName.length && queryIndex < query.length; i++) {
          if (fileName[i] === query[queryIndex]) {
            queryIndex++;
          }
        }
        return queryIndex === query.length;
      })
      .sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        
        if (aName.includes(query) && !bName.includes(query)) return -1;
        if (!aName.includes(query) && bName.includes(query)) return 1;
        
        const aDepth = a.path.split('/').length;
        const bDepth = b.path.split('/').length;
        
        return aDepth - bDepth;
      });
  };

  // Handle file selection
  const handleFileSelect = async (file: FileNode) => {
    try {
      console.log('Loading file content:', file.path);
      
      await send({
        type: 'git_command',
        method: 'git.file',
        params: {
          project_id: currentProject?.id,
          file_path: file.path
        }
      });
      
      // Close modal immediately - global handler will create artifact
      onClose();
    } catch (error) {
      console.error('Failed to request file:', file.path, error);
    }
  };

  // Get file icon without emojis
  const getFileIcon = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    
    switch (ext) {
      case 'rs': return 'RS';
      case 'ts': case 'tsx': return 'TS';
      case 'js': case 'jsx': return 'JS';
      case 'md': return 'MD';
      case 'json': return 'JSON';
      case 'html': return 'HTML';
      case 'css': return 'CSS';
      case 'py': return 'PY';
      case 'toml': case 'yml': case 'yaml': return 'CFG';
      default: return 'FILE';
    }
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(i => Math.min(i + 1, filteredFiles.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(i => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredFiles[selectedIndex]) {
            handleFileSelect(filteredFiles[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredFiles, onClose]);

  // Handle clicking outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Show different content if no repository
  if (!currentProject?.hasRepository) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-20">
        <div 
          ref={modalRef}
          className="w-full max-w-md bg-gray-900 rounded-xl shadow-2xl border border-gray-700 p-6"
        >
          <div className="text-center">
            <File size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No Repository</h3>
            <p className="text-gray-400 text-sm mb-4">
              This project doesn't have a repository attached. Attach a repository to browse files.
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-20">
      <div 
        ref={modalRef}
        className="w-full max-w-2xl bg-gray-900 rounded-xl shadow-2xl border border-gray-700 flex flex-col max-h-[70vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Search size={20} className="text-gray-400" />
            <span className="font-medium text-white">Quick Open</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-md text-gray-400 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search input */}
        <div className="p-4 border-b border-gray-700">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search files..."
            className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* File list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3 text-gray-400">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-400"></div>
                Loading files...
              </div>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-gray-400">
              {query ? 'No files match your search' : files.length === 0 ? 'No files found in repository' : 'Start typing to search files...'}
            </div>
          ) : (
            <div className="py-2">
              {filteredFiles.map((file, index) => (
                <button
                  key={file.path}
                  onClick={() => handleFileSelect(file)}
                  className={clsx(
                    'w-full flex items-center px-4 py-3 text-left transition-colors',
                    index === selectedIndex
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-gray-800 text-gray-200'
                  )}
                >
                  <span className="text-xs px-2 py-1 bg-gray-700 rounded font-mono mr-3">{getFileIcon(file.name)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{file.name}</div>
                    <div className="text-sm opacity-60 truncate">{file.path}</div>
                  </div>
                  <File size={16} className="opacity-40 ml-2" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-gray-800 border-t border-gray-700 text-xs text-gray-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Command size={12} />
            <span>Quick Open</span>
          </div>
          <div className="flex items-center gap-4">
            <span>↑↓ navigate</span>
            <span>↵ open</span>
            <span>esc close</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Hook for global Cmd+P handler
export const useQuickFileOpen = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false)
  };
};
