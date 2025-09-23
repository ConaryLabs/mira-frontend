// src/components/QuickFileOpen.tsx
// Modern Cmd+P style file picker that opens files as artifacts

import React, { useState, useEffect, useRef } from 'react';
import { Command, File, Folder, Search, X } from 'lucide-react';
import clsx from 'clsx';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAppState } from '../hooks/useAppState';
import { useArtifacts } from '../hooks/useArtifacts';
import type { FileNode, FileSystemResponse } from '../types';

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
  const { send } = useWebSocket();
  const { currentProject } = useAppState();
  const { addArtifact } = useArtifacts();

  // Load files when modal opens
  useEffect(() => {
    if (isOpen && currentProject?.hasRepository) {
      loadProjectFiles();
      inputRef.current?.focus();
    } else {
      // Reset state when modal closes
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen, currentProject]);

  // Filter files based on query
  useEffect(() => {
    if (!query.trim()) {
      setFilteredFiles(files.slice(0, 50)); // Show first 50 files
    } else {
      const filtered = fuzzySearch(files, query.toLowerCase()).slice(0, 20);
      setFilteredFiles(filtered);
      setSelectedIndex(0);
    }
  }, [query, files]);

  const loadProjectFiles = async () => {
    if (!currentProject?.hasRepository) return;
    
    setLoading(true);
    try {
      // 🚀 Fixed: Use project_id instead of attachment_id
      const response = await send({
        type: 'file_system_command',
        method: 'file.list',
        params: {
          path: '.',
          recursive: true,
          project_id: currentProject.id  // Use project_id, let backend handle attachment lookup
        }
      }) as FileSystemResponse;

      if (response?.files) {
        const flatFiles = flattenFiles(response.files);
        setFiles(flatFiles);
      }
    } catch (error) {
      console.error('Failed to load files:', error);
    } finally {
      setLoading(false);
    }
  };

  // Flatten nested file tree into searchable array
  const flattenFiles = (nodes: FileNode[], prefix = ''): FileNode[] => {
    const result: FileNode[] = [];
    
    for (const node of nodes) {
      const fullPath = prefix ? `${prefix}/${node.name}` : node.name;
      
      if (node.type === 'file') {
        result.push({
          ...node,
          path: fullPath
        });
      } else if (node.children) {
        result.push(...flattenFiles(node.children, fullPath));
      }
    }
    
    return result;
  };

  // Fuzzy search implementation
  const fuzzySearch = (fileList: FileNode[], searchQuery: string): FileNode[] => {
    return fileList
      .map(file => {
        const fileName = file.name.toLowerCase();
        const filePath = file.path.toLowerCase();
        
        // Exact matches get highest priority
        if (fileName.includes(searchQuery) || filePath.includes(searchQuery)) {
          let score = 0;
          
          // Boost score for exact filename matches
          if (fileName === searchQuery) score += 100;
          else if (fileName.startsWith(searchQuery)) score += 50;
          else if (fileName.includes(searchQuery)) score += 25;
          
          // Boost for path matches
          if (filePath.includes(searchQuery)) score += 10;
          
          // Boost for common file types
          if (fileName.endsWith('.rs') || fileName.endsWith('.ts') || fileName.endsWith('.tsx')) {
            score += 5;
          }
          
          return { file, score };
        }
        return null;
      })
      .filter(Boolean)
      .sort((a, b) => b!.score - a!.score)
      .map(item => item!.file);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        onClose();
        break;
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredFiles.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredFiles[selectedIndex]) {
          handleFileSelect(filteredFiles[selectedIndex]);
        }
        break;
    }
  };

  const handleFileSelect = async (file: FileNode) => {
    try {
      // 🚀 Fixed: Use project_id instead of attachment_id
      const response = await send({
        type: 'file_system_command',
        method: 'file.read',
        params: {
          path: file.path,
          project_id: currentProject?.id  // Use project_id, let backend handle attachment lookup
        }
      }) as FileSystemResponse;

      if (response?.content) {
        // Detect file type
        const fileType = getFileType(file.name);
        
        // Create artifact from file content
        const artifact = {
          id: `artifact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title: file.name,
          content: response.content,
          type: fileType.mimeType,
          language: fileType.language,
          linkedFile: file.path,
          created: Date.now(),
          modified: Date.now()
        };

        addArtifact(artifact);
      }

      onClose();
    } catch (error) {
      console.error('Failed to load file:', error);
    }
  };

  const getFileType = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    
    switch (ext) {
      case 'rs':
        return { mimeType: 'text/rust' as const, language: 'rust' };
      case 'ts':
        return { mimeType: 'application/typescript' as const, language: 'typescript' };
      case 'tsx':
        return { mimeType: 'application/typescript' as const, language: 'typescript' };
      case 'js':
        return { mimeType: 'application/javascript' as const, language: 'javascript' };
      case 'jsx':
        return { mimeType: 'application/javascript' as const, language: 'javascript' };
      case 'md':
        return { mimeType: 'text/markdown' as const, language: 'markdown' };
      case 'json':
        return { mimeType: 'application/json' as const, language: 'json' };
      case 'html':
        return { mimeType: 'text/html' as const, language: 'html' };
      case 'css':
        return { mimeType: 'text/css' as const, language: 'css' };
      case 'py':
        return { mimeType: 'text/python' as const, language: 'python' };
      case 'toml':
        return { mimeType: 'text/plain' as const, language: 'toml' };
      case 'yml':
      case 'yaml':
        return { mimeType: 'text/plain' as const, language: 'yaml' };
      default:
        return { mimeType: 'text/plain' as const, language: 'plaintext' };
    }
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    
    // You could return different icons based on file type
    // For now, just use the generic file icon
    return <File size={16} className="text-gray-400" />;
  };

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

  // 🚀 Show different content if no repository
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
              This project doesn't have a repository attached. Import a repository to browse files.
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Got it
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
        className="w-full max-w-2xl bg-gray-900 rounded-xl shadow-2xl border border-gray-700"
      >
        {/* Search input */}
        <div className="flex items-center p-4 border-b border-gray-700">
          <Search size={20} className="text-gray-400 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search files... (use fuzzy search: 'mr' matches 'main.rs')"
            className="flex-1 bg-transparent text-white placeholder-gray-400 outline-none text-lg"
          />
          <button
            onClick={onClose}
            className="ml-3 p-1 text-gray-400 hover:text-gray-200 rounded"
          >
            <X size={20} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-400">
              Loading files...
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              {query ? 'No files match your search' : 'No files found'}
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
                      ? 'bg-blue-600/20 border-l-2 border-blue-500'
                      : 'hover:bg-gray-800'
                  )}
                >
                  <div className="mr-3">
                    {getFileIcon(file.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center">
                      <span className="text-white font-medium truncate">
                        {file.name}
                      </span>
                      {/* Highlight matching parts of the query */}
                      {query && (
                        <span className="ml-2 text-xs text-gray-400">
                          in {file.path}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-400 truncate">
                      {file.path}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {file.size && formatFileSize(file.size)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer with shortcuts */}
        <div className="flex items-center justify-between p-3 border-t border-gray-700 text-xs text-gray-400">
          <div className="flex items-center gap-4">
            <span>↑↓ navigate</span>
            <span>↵ open</span>
            <span>esc close</span>
          </div>
          <div className="flex items-center gap-2">
            <Command size={12} />
            <span>P</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Utility function to format file sizes
function formatFileSize(bytes: number): string {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round((bytes / Math.pow(1024, i)) * 10) / 10 + ' ' + sizes[i];
}

// Hook to handle global Cmd+P shortcut
export const useQuickFileOpen = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+P or Ctrl+P
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
    close: () => setIsOpen(false),
  };
};
