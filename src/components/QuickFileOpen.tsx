// src/components/QuickFileOpen.tsx
// Simplified version - only handles file tree, global handler creates artifacts

import React, { useState, useEffect, useRef } from 'react';
import { Command, File, Folder, Search, X } from 'lucide-react';
import clsx from 'clsx';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAppState } from '../hooks/useAppState';

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

  // Listen for git.tree responses only
  useEffect(() => {
    if (!lastMessage || lastMessage.type !== 'data') return;
    
    const data = lastMessage.data;
    
    // Only handle git.tree responses here
    if (data?.type === 'file_tree' && isOpen) {
      console.log('Git tree response received:', data);
      console.log('Raw tree structure:', JSON.stringify(data.tree?.slice(0, 3), null, 2)); // Show first 3 items
      
      if (data.tree && Array.isArray(data.tree)) {
        const flatFiles = flattenFiles(data.tree);
        console.log('Processed files:', flatFiles.length);
        console.log('First few processed files:', flatFiles.slice(0, 5).map(f => ({ name: f.name, path: f.path })));
        setFiles(flatFiles);
        setLoading(false);
      }
    }
    
    // NOTE: file_content is now handled by the global WebSocket handler
    // It will automatically create artifacts when files are opened
  }, [lastMessage, isOpen]);

  // Load files when modal opens
  useEffect(() => {
    console.log('QuickFileOpen: Modal state changed:', {
      isOpen,
      hasProject: !!currentProject,
      projectId: currentProject?.id
    });
    
    if (isOpen && currentProject) {
      loadProjectFiles();
    }
    
    if (isOpen && inputRef.current) {
      // Focus search input when modal opens
      setTimeout(() => inputRef.current?.focus(), 100);
    }
    
    if (!isOpen) {
      // Reset state when closing
      setQuery('');
      setSelectedIndex(0);
      setLoading(false);
    }
  }, [isOpen, currentProject]);

  const loadProjectFiles = async () => {
    if (!currentProject) {
      console.log('No current project for file loading');
      return;
    }

    console.log('Loading files for project:', currentProject.name);
    setLoading(true);
    
    try {
      await send({
        type: 'git_command',
        method: 'git.tree',
        params: { 
          project_id: currentProject.id,
          recursive: true 
        }
      });
    } catch (error) {
      console.error('Failed to load project files:', error);
      setLoading(false);
    }
  };

  const flattenFiles = (nodes: FileNode[], prefix: string = ''): FileNode[] => {
    const result: FileNode[] = [];
    
    for (const node of nodes) {
      // The backend already provides the correct full path in node.path
      const fullPath = node.path || node.name;
      
      // Determine if this is a file or directory
      const isDirectory = node.type === 'directory' || 
                         node.node_type === 'Directory' || 
                         (node.children && node.children.length > 0);
      
      if (!isDirectory) {
        // It's a file - use the backend-provided path directly
        result.push({
          name: node.name,
          path: fullPath,  // Use the backend-provided full path
          type: 'file'
        });
      }
      
      // Recursively process children
      if (node.children && node.children.length > 0) {
        result.push(...flattenFiles(node.children, fullPath));
      }
    }
    
    return result;
  };

  // Filter files based on search query
  useEffect(() => {
    console.log('Filtering files:', { 
      query, 
      totalFiles: files.length,
      queryLength: query.trim().length
    });
    
    if (!query.trim()) {
      console.log('No query, showing all files:', files.length);
      setFilteredFiles(files);
    } else {
      const filtered = files.filter(file => {
        const nameMatch = file.name.toLowerCase().includes(query.toLowerCase());
        const pathMatch = file.path.toLowerCase().includes(query.toLowerCase());
        return nameMatch || pathMatch;
      });
      console.log('Filtered results:', { 
        query, 
        original: files.length, 
        filtered: filtered.length,
        firstFewResults: filtered.slice(0, 3).map(f => f.name)
      });
      setFilteredFiles(filtered);
    }
    setSelectedIndex(0); // Reset selection when filtering
  }, [query, files]);

  const handleFileSelect = async (file: FileNode) => {
    console.log('File selected:', file.path);
    console.log('File name:', file.name);
    console.log('File type:', file.type);
    console.log('Full file object:', file);
    console.log('Project ID:', currentProject?.id);
    console.log('Requesting file content from backend...');
    
    try {
      const requestParams = {
        project_id: currentProject?.id,
        file_path: file.path
      };
      
      console.log('Sending request with params:', JSON.stringify(requestParams, null, 2));
      
      // Send git.file request - global handler will create the artifact
      await send({
        type: 'git_command',
        method: 'git.file',
        params: requestParams
      });
      
      console.log('File request sent - artifact will be created by global handler');
      
      // Close the modal immediately
      onClose();
      
    } catch (error) {
      console.error('Failed to request file:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          Math.min(prev + 1, filteredFiles.length - 1)
        );
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
        
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  };

  const handleClickOutside = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-20 z-50"
      onClick={handleClickOutside}
    >
      <div 
        ref={modalRef}
        className="bg-gray-800 rounded-lg border border-gray-600 w-full max-w-2xl mx-4 max-h-[60vh] flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-600">
          <Command size={16} className="text-gray-400" />
          <span className="text-sm text-gray-400">Quick File Open</span>
          
          {currentProject && (
            <span className="text-xs text-blue-400 bg-blue-400/10 px-2 py-1 rounded">
              {currentProject.name}
            </span>
          )}
          
          <button 
            onClick={onClose}
            className="ml-auto p-1 hover:bg-gray-700 rounded"
          >
            <X size={16} className="text-gray-400" />
          </button>
        </div>

        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-700">
          <Search size={16} className="text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search files..."
            className="flex-1 bg-transparent text-gray-100 placeholder-gray-400 outline-none"
          />
          
          {loading && (
            <div className="text-xs text-gray-400">Loading...</div>
          )}
        </div>

        {/* File List */}
        <div className="flex-1 overflow-y-auto">
          {!currentProject ? (
            <div className="p-8 text-center text-gray-400">
              <Folder size={32} className="mx-auto mb-2 opacity-50" />
              <p>No project selected</p>
              <p className="text-xs mt-1">Select a project first</p>
            </div>
          ) : loading ? (
            <div className="p-8 text-center text-gray-400">
              <div className="animate-spin w-6 h-6 border-2 border-gray-600 border-t-blue-400 rounded-full mx-auto mb-2"></div>
              <p>Loading files...</p>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <File size={32} className="mx-auto mb-2 opacity-50" />
              <p>{query ? 'No files match your search' : 'No files found'}</p>
              {query && (
                <p className="text-xs mt-1">Try a different search term</p>
              )}
            </div>
          ) : (
            <div className="py-2">
              {filteredFiles.map((file, index) => (
                <button
                  key={file.path}
                  onClick={() => handleFileSelect(file)}
                  className={clsx(
                    'w-full flex items-center gap-3 px-4 py-2 text-left text-sm hover:bg-gray-700',
                    index === selectedIndex && 'bg-blue-600/20 text-blue-200'
                  )}
                >
                  <File size={14} className="text-gray-400 flex-shrink-0" />
                  
                  <div className="flex-1 min-w-0">
                    <div className="text-gray-200 truncate">{file.name}</div>
                    <div className="text-xs text-gray-400 truncate">{file.path}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-gray-700 text-xs text-gray-400 flex justify-between">
          <span>
            {filteredFiles.length > 0 && `${filteredFiles.length} files`}
          </span>
          <span>
            ↑↓ navigate • Enter select • Esc close
          </span>
        </div>
      </div>
    </div>
  );
};

// Custom hook for QuickFileOpen functionality
export const useQuickFileOpen = () => {
  const [isOpen, setIsOpen] = useState(false);
  
  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);
  
  // Add global Cmd+P / Ctrl+P handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault();
        open();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  return { isOpen, open, close };
};
