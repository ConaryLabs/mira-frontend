import React, { useState, useEffect } from 'react';
import { 
  File, 
  Folder, 
  ChevronRight, 
  ChevronDown, 
  Code2,
  FileText,
  Image,
  GitBranch
} from 'lucide-react';
import { createGitCommand } from '../types/websocket';
import type { WsClientMessage } from '../types/websocket';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  expanded?: boolean;
}

interface GitFileBrowserProps {
  projectId: string;
  repoId: string;
  isDark?: boolean;
  onFileSelect: (filePath: string) => void;
  send?: (message: WsClientMessage) => void;
  onGitResponse?: (handler: (data: any) => void) => void;
}

export const GitFileBrowser: React.FC<GitFileBrowserProps> = ({ 
  projectId, 
  repoId,
  isDark = false,
  onFileSelect,
  send,
  onGitResponse
}) => {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  useEffect(() => {
    const handleGitData = (data: any) => {
      if (data.type === 'file_tree') {
        setFiles(data.tree || []);
        setLoading(false);
      }
    };

    if (onGitResponse) {
      onGitResponse(handleGitData);
    }
  }, [onGitResponse]);

  useEffect(() => {
    loadFiles();
  }, [repoId, projectId, send]);

  const loadFiles = () => {
    if (!send) {
      console.warn('Cannot load files: WebSocket not connected');
      setLoading(false);
      return;
    }
    setLoading(true);
    send(createGitCommand('git.tree', { 
      project_id: projectId,
      attachment_id: repoId
    }));
  };

  const toggleDirectory = (path: string) => {
    const updateExpanded = (nodes: FileNode[]): FileNode[] => {
      return nodes.map(node => {
        if (node.path === path) {
          return { ...node, expanded: !node.expanded };
        }
        if (node.children) {
          return { ...node, children: updateExpanded(node.children) };
        }
        return node;
      });
    };
    setFiles(updateExpanded(files));
  };

  const handleFileClick = (file: FileNode) => {
    if (file.type === 'directory') {
      toggleDirectory(file.path);
    } else {
      setSelectedFile(file.path);
      onFileSelect(file.path);
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['ts', 'tsx', 'js', 'jsx', 'py', 'java', 'cpp', 'c', 'go', 'rs'].includes(ext || '')) {
      return <Code2 className="w-4 h-4 text-blue-500" />;
    }
    if (['md', 'txt', 'json', 'yaml', 'yml', 'toml'].includes(ext || '')) {
      return <FileText className="w-4 h-4 text-gray-500" />;
    }
    if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext || '')) {
      return <Image className="w-4 h-4 text-green-500" />;
    }
    return <File className="w-4 h-4 text-gray-400" />;
  };

  const renderFileTree = (nodes: FileNode[], depth: number = 0) => {
    return nodes.map(node => (
      <div key={node.path}>
        <div
          className={`flex items-center gap-1 px-2 py-1 cursor-pointer transition-colors ${
            selectedFile === node.path 
              ? isDark 
                ? 'bg-blue-600 text-white' 
                : 'bg-blue-50 text-blue-700'
              : isDark
                ? 'hover:bg-gray-700 text-gray-200'
                : 'hover:bg-gray-100 text-gray-800'
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => handleFileClick(node)}
        >
          {node.type === 'directory' ? (
            <>
              {node.expanded ? (
                <ChevronDown className={`w-3 h-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              ) : (
                <ChevronRight className={`w-3 h-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              )}
              <Folder className="w-4 h-4 text-yellow-600" />
            </>
          ) : (
            <>
              <div className="w-3" />
              {getFileIcon(node.name)}
            </>
          )}
          <span className="text-sm truncate">{node.name}</span>
        </div>
        {node.type === 'directory' && node.expanded && node.children && (
          <div>{renderFileTree(node.children, depth + 1)}</div>
        )}
      </div>
    ));
  };

  if (loading) {
    return (
      <div className={`p-4 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
        Loading repository files...
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className={`h-full flex flex-col ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <div className={`sticky top-0 border-b px-3 py-2 ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
          <h3 className={`text-sm font-medium flex items-center gap-1 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
            <GitBranch className="w-4 h-4" />
            Repository Files
          </h3>
        </div>
        <div className="flex-1 flex items-center justify-center p-4 text-center">
          <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {!send ? (
              <>
                <p className="mb-2">WebSocket not connected.</p>
                <p className="text-xs">Please wait for connection to be established.</p>
              </>
            ) : (
              <>
                <p className="mb-2">No files loaded.</p>
                <p className="text-xs">Repository may be empty or still importing.</p>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full overflow-y-auto ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
      <div className={`sticky top-0 border-b px-3 py-2 ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
        <h3 className={`text-sm font-medium flex items-center gap-1 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
          <GitBranch className="w-4 h-4" />
          Repository Files
        </h3>
      </div>
      <div className="py-1">
        {renderFileTree(files)}
      </div>
    </div>
  );
};
