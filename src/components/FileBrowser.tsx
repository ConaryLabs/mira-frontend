// src/components/FileBrowser.tsx
import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, File, Folder } from 'lucide-react';
import { useWebSocketStore } from '../stores/useWebSocketStore';
import { useAppState } from '../hooks/useAppState';

interface FileNode {
  name: string;
  path: string;
  is_directory: boolean;
  children?: FileNode[];
}

export const FileBrowser: React.FC = () => {
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const send = useWebSocketStore(state => state.send);
  const lastMessage = useWebSocketStore(state => state.lastMessage);
  const { currentProject } = useAppState();

  // Load file tree when project changes
  useEffect(() => {
    if (currentProject) {
      loadFileTree();
    }
  }, [currentProject]);

  // Handle WebSocket responses
  useEffect(() => {
    if (!lastMessage) return;

    if (lastMessage.type === 'data' && lastMessage.data) {
      const data = lastMessage.data;
      
      if (data.type === 'file_tree') {
        console.log('📁 File tree received:', data.tree);
        setFileTree(data.tree || []);
      }
      
      if (data.type === 'file_content') {
        console.log('📄 File content received for:', data.path);
        setFileContent(data.content);
        setLoading(false);
      }
    }
  }, [lastMessage]);

  const loadFileTree = async () => {
    if (!currentProject) return;
    
    try {
      await send({
        type: 'git_command',
        method: 'git.tree',
        params: { project_id: currentProject.id }
      });
    } catch (error) {
      console.error('Failed to load file tree:', error);
    }
  };

  const toggleExpanded = (path: string) => {
    const newExpanded = new Set(expandedPaths);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedPaths(newExpanded);
  };

  const selectFile = async (path: string) => {
    if (!currentProject || selectedFile === path) return;
    
    setSelectedFile(path);
    setFileContent(null);
    setLoading(true);
    
    try {
      await send({
        type: 'git_command',
        method: 'git.file',
        params: { 
          project_id: currentProject.id,
          file_path: path 
        }
      });
    } catch (error) {
      console.error('Failed to load file:', error);
      setLoading(false);
    }
  };

  const renderFileNode = (node: FileNode, depth: number = 0): React.ReactNode => {
    const isExpanded = expandedPaths.has(node.path);
    const isSelected = selectedFile === node.path;
    
    return (
      <div key={node.path}>
        <div
          className={`flex items-center gap-1 py-1 px-2 hover:bg-gray-800 cursor-pointer text-sm ${
            isSelected ? 'bg-blue-900 text-blue-200' : 'text-gray-300'
          }`}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => {
            if (node.is_directory) {
              toggleExpanded(node.path);
            } else {
              selectFile(node.path);
            }
          }}
        >
          {node.is_directory ? (
            <>
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <Folder size={14} />
            </>
          ) : (
            <>
              <span className="w-3.5" />
              <File size={14} />
            </>
          )}
          <span className="ml-1">{node.name}</span>
        </div>
        
        {node.is_directory && isExpanded && node.children && (
          <div>
            {node.children.map(child => renderFileNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (!currentProject) {
    return (
      <div className="p-4 text-gray-500">
        No project selected
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-gray-700 p-2">
        <h3 className="text-sm font-medium">Files</h3>
      </div>
      
      <div className="flex-1 overflow-auto">
        {fileTree.length === 0 ? (
          <div className="p-4 text-gray-500 text-sm">
            No files available
          </div>
        ) : (
          <div className="py-1">
            {fileTree.map(node => renderFileNode(node))}
          </div>
        )}
      </div>
      
      {selectedFile && (
        <div className="border-t border-gray-700 p-2">
          <div className="text-xs text-gray-400 truncate">
            {selectedFile}
          </div>
        </div>
      )}
    </div>
  );
};
