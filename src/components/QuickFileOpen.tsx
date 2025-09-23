// src/components/QuickFileOpen.tsx - FIXED to use Git API
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
    console.log('🔍 QuickFileOpen: Modal state changed:', {
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
    if (!currentProject) {
      console.log('❌ No current project for file loading');
      return;
    }
    
    if (!currentProject.hasRepository) {
      console.log('❌ Current project has no repository:', {
        projectId: currentProject.id,
        projectName: currentProject.name,
        hasRepository: currentProject.hasRepository,
        repositoryUrl: currentProject.repositoryUrl
      });
      return;
    }
    
    console.log('✅ Loading files for project with repository:', {
      projectId: currentProject.id,
      hasRepository: currentProject.hasRepository,
      repositoryUrl: currentProject.repositoryUrl
    });
    
    setLoading(true);
    try {
      // 🚀 CRITICAL FIX: Use git.tree instead of file_system_command
      console.log('📤 Requesting git.tree for project:', currentProject.id);
      const response = await send({
        type: 'git_command',
        method: 'git.tree',
        params: {
          project_id: currentProject.id
        }
      });

      console.log('📁 Git tree response:', response);
      
      // 🚀 FIX: Handle git tree response structure
      if (response && typeof response === 'object') {
        // The git.tree response should have a 'tree' field
        if ('tree' in response && Array.isArray(response.tree)) {
          const flatFiles = flattenFiles(response.tree as FileNode[]);
          console.log('📂 Processed files:', flatFiles.length);
          setFiles(flatFiles);
        } else if (Array.isArray(response)) {
          // Sometimes the response might be the array directly
          const flatFiles = flattenFiles(response as FileNode[]);
          console.log('📂 Processed files (direct array):', flatFiles.length);
          setFiles(flatFiles);
        } else {
          console.log('❌ No tree data in git response:', response);
        }
      } else {
        console.log('❌ Invalid git tree response format:', response);
      }
    } catch (error) {
      console.error('❌ Failed to load git tree:', error);
    } finally {
      setLoading(false);
    }
  };

  // Flatten nested file tree into searchable array
  const flattenFiles = (nodes: FileNode[], prefix = ''): FileNode[] => {
    const result: FileNode[] = [];
    
    for (const node of nodes) {
      const fullPath = prefix ? `${prefix}/${node.name}` : node.name;
      
      // 🚀 FIX: Handle different file node formats from backend safely
      const isFile = node.type === 'file' || 
                     (node as any).node_type === 'File' || 
                     (!(node as any).is_directory && !node.children);
      
      if (isFile) {
        result.push({
          ...node,
          path: fullPath,
          type: 'file'
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
      console.log('📄 Loading file via git.file:', file.path);
      
      // 🚀 CRITICAL FIX: Use git.file instead of file_system_command
      const response = await send({
        type: 'git_command',
        method: 'git.file',
        params: {
          project_id: currentProject?.id,
          file_path: file.path
        }
      });

      console.log('📄 Git file response:', response);
      
      // 🚀 FIX: Handle git file response structure
      if (response && typeof response === 'object') {
        let content = '';
        
        // The git.file response should have a 'content' field
        if ('content' in response && typeof response.content === 'string') {
          content = response.content;
        } else {
          console.log('❌ No content in git file response');
          return;
        }

        if (content) {
          // Detect file type
          const fileType = getFileType(file.name);
          
          // Create artifact from file content
          const artifact = {
            id: `artifact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: file.name,
            content: content,
            type: fileType.mimeType,
            language: fileType.language,
            linkedFile: file.path,
            created: Date.now(),
            modified: Date.now()
          };

          console.log('✅ Created artifact from git file:', {
            title: artifact.title,
            type: artifact.type,
            language: artifact.language,
            size: artifact.content.length
          });

          addArtifact(artifact);
        } else {
          console.log('❌ No content in git file response');
        }
      } else {
        console.log('❌ Invalid git file response format');
      }

      onClose();
    } catch (error) {
      console.error('❌ Failed to load git file:', error);
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
    
    switch (ext) {
      case 'rs': return '🦀';
      case 'ts': case 'tsx': return '🔷';
      case 'js': case 'jsx': return '📜';
      case 'md': return '📝';
      case 'json': return '{}';
      case 'html': return '🌐';
      case 'css': return '🎨';
      case 'py': return '🐍';
      case 'toml': case 'yml': case 'yaml': return '⚙️';
      default: return '📄';
    }
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
              This project doesn't have a repository attached. Import a repository to browse files.
            </p>
            {/* Debug info for development */}
            {process.env.NODE_ENV === 'development' && (
              <div className="text-xs text-gray-500 bg-gray-800 p-2 rounded mb-4">
                Debug: hasRepo={String(currentProject?.hasRepository)} | 
                url={currentProject?.repositoryUrl || 'none'}
              </div>
            )}
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
          {/* Debug info for development */}
          {process.env.NODE_ENV === 'development' && (
            <div className="text-xs text-gray-500 mx-2">
              {files.length} files
            </div>
          )}
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
              <div className="animate-spin rounded-full h-6 h-6 border-b-2 border-gray-400 mx-auto mb-2"></div>
              Loading repository files...
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
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
                  <span className="text-lg mr-3">{getFileIcon(file.name)}</span>
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
            <span>↑↓ to navigate</span>
            <span>↵ to open</span>
            <span>esc to close</span>
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
