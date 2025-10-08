// src/components/ProjectsView.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { 
  Plus, Folder, Github, Trash2, 
  Clock, Tag, GitBranch, X, Check, FolderOpen,
  FileText, Upload as UploadIcon, Search as SearchIcon,
  Download, Calendar, CheckCircle, XCircle, Sparkles
} from 'lucide-react';
import { useAppState } from '../stores/useAppState';
import { useWebSocketStore } from '../stores/useWebSocketStore';
import type { Project, DocumentMetadata, DocumentSearchResult } from '../types';

export const ProjectsView: React.FC = () => {
  const { projects, currentProject, setCurrentProject } = useAppState();
  const { send, subscribe } = useWebSocketStore();
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  
  // Local directory attachment
  const [showAttachLocal, setShowAttachLocal] = useState<string | null>(null);
  const [localDirectoryPath, setLocalDirectoryPath] = useState('');
  const [attaching, setAttaching] = useState(false);
  
  // Documents modal state
  const [showDocuments, setShowDocuments] = useState(false);
  const [documentsTab, setDocumentsTab] = useState<'upload' | 'list' | 'search'>('upload');
  
  // Document upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadError, setUploadError] = useState('');
  
  // Document list state
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [deletingDoc, setDeletingDoc] = useState<string | null>(null);
  const [docRefreshKey, setDocRefreshKey] = useState(0);
  
  // Document search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DocumentSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  // ===== PROJECT HANDLERS =====
  
  const handleCreate = async () => {
    if (!newProjectName.trim()) return;
    
    setCreating(true);
    try {
      await send({
        type: 'project_command',
        method: 'project.create',
        params: { 
          name: newProjectName.trim(),
          description: newProjectDescription.trim() || undefined
        }
      });
      
      setNewProjectName('');
      setNewProjectDescription('');
      setShowCreateForm(false);
    } catch (error) {
      console.error('Create failed:', error);
    } finally {
      setCreating(false);
    }
  };
  
  const handleDelete = async (projectId: string) => {
    setDeleting(projectId);
    try {
      await send({
        type: 'project_command',
        method: 'project.delete',
        params: { id: projectId }
      });
      setConfirmDelete(null);
    } catch (error) {
      console.error('Delete failed:', error);
    } finally {
      setDeleting(null);
    }
  };
  
  const handleSelectProject = (project: Project) => {
    setCurrentProject(project);
  };
  
  const handleAttachLocal = async () => {
    if (!localDirectoryPath.trim() || !showAttachLocal) return;
    
    setAttaching(true);
    try {
      await send({
        type: 'project_command',
        method: 'project.attach_local',
        params: {
          project_id: showAttachLocal,
          directory_path: localDirectoryPath.trim()
        }
      });
      
      setLocalDirectoryPath('');
      setShowAttachLocal(null);
      
      setTimeout(async () => {
        await send({
          type: 'project_command',
          method: 'project.list',
          params: {}
        });
      }, 100);
    } catch (error) {
      console.error('Attach local directory failed:', error);
      alert('Failed to attach directory. Please check the path and try again.');
    } finally {
      setAttaching(false);
    }
  };
  
  // ===== DOCUMENT UPLOAD HANDLERS =====
  
  useEffect(() => {
    const unsubscribe = subscribe('doc-upload', (message) => {
      if (message.type === 'data' && message.data?.type === 'document_processing_progress') {
        setUploadProgress(message.data.progress * 100);
        setUploadStatus('uploading');
      }
      
      if (message.type === 'data' && message.data?.type === 'document_processed') {
        setUploadStatus('success');
        setUploadProgress(100);
        
        setTimeout(() => {
          setUploading(false);
          setUploadProgress(0);
          setUploadFileName('');
          setUploadStatus('idle');
          setDocRefreshKey(prev => prev + 1);
        }, 2000);
      }
      
      if (message.type === 'error' && uploading) {
        setUploadStatus('error');
        setUploadError(message.message || 'Upload failed');
        setUploading(false);
      }
    });
    
    return unsubscribe;
  }, [subscribe, uploading]);
  
  const validateFile = (file: File): string | null => {
    const validExtensions = ['.pdf', '.docx', '.doc', '.txt', '.md'];
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!validExtensions.includes(extension)) {
      return `Invalid file type. Accepted formats: ${validExtensions.join(', ')}`;
    }
    
    if (file.size > 50 * 1024 * 1024) {
      return 'File too large. Maximum size is 50MB';
    }
    
    return null;
  };
  
  const handleFileSelect = useCallback(async (file: File) => {
    if (!currentProject) return;
    
    const validationError = validateFile(file);
    if (validationError) {
      setUploadStatus('error');
      setUploadError(validationError);
      setTimeout(() => {
        setUploadStatus('idle');
        setUploadError('');
      }, 3000);
      return;
    }
    
    setUploading(true);
    setUploadProgress(0);
    setUploadFileName(file.name);
    setUploadStatus('uploading');
    setUploadError('');

    const reader = new FileReader();
    
    reader.onerror = () => {
      setUploadStatus('error');
      setUploadError('Failed to read file');
      setUploading(false);
    };
    
    reader.onload = async (e) => {
      try {
        const result = e.target?.result?.toString();
        if (!result) {
          throw new Error('Failed to read file content');
        }
        
        const base64 = result.split(',')[1];
        
        if (!base64) {
          throw new Error('Invalid file content');
        }

        await send({
          type: 'document_command',
          method: 'documents.upload',
          params: {
            project_id: currentProject.id,
            file_name: file.name,
            content: base64,
          },
        });
      } catch (error) {
        console.error('Upload error:', error);
        setUploadStatus('error');
        setUploadError(error instanceof Error ? error.message : 'Upload failed');
        setUploading(false);
      }
    };
    
    reader.readAsDataURL(file);
  }, [currentProject, send]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer.files;
    if (files.length > 0 && !uploading) {
      handleFileSelect(files[0]);
    }
  }, [uploading, handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);
  
  // ===== DOCUMENT LIST HANDLERS =====
  
  useEffect(() => {
    if (!showDocuments || !currentProject || documentsTab !== 'list') return;
    
    setLoadingDocs(true);
    
    send({
      type: 'document_command',
      method: 'documents.list',
      params: { project_id: currentProject.id },
    });

    const unsubscribe = subscribe('doc-list', (message) => {
      if (message.type === 'data' && message.data?.type === 'document_list') {
        setDocuments(message.data.documents || []);
        setLoadingDocs(false);
      }
    });
    
    return unsubscribe;
  }, [currentProject, send, subscribe, showDocuments, documentsTab, docRefreshKey]);

  const handleDeleteDoc = useCallback(async (documentId: string, fileName: string) => {
    if (!currentProject) return;
    if (!confirm(`Delete "${fileName}"? This will remove the document and all its chunks.`)) {
      return;
    }
    
    setDeletingDoc(documentId);
    
    try {
      await send({
        type: 'document_command',
        method: 'documents.delete',
        params: { document_id: documentId },
      });
      
      await send({
        type: 'document_command',
        method: 'documents.list',
        params: { project_id: currentProject.id },
      });
    } catch (error) {
      console.error('Delete failed:', error);
    } finally {
      setDeletingDoc(null);
    }
  }, [currentProject, send]);

  const handleDownloadDoc = useCallback(async (documentId: string, fileName: string) => {
    try {
      await send({
        type: 'document_command',
        method: 'documents.retrieve',
        params: { document_id: documentId },
      });
      
      const unsubscribe = subscribe('doc-download', (message) => {
        if (message.type === 'data' && message.data?.type === 'document_content') {
          const content = atob(message.data.content);
          const bytes = new Uint8Array(content.length);
          for (let i = 0; i < content.length; i++) {
            bytes[i] = content.charCodeAt(i);
          }
          
          const blob = new Blob([bytes]);
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          
          unsubscribe();
        }
      });
    } catch (error) {
      console.error('Download failed:', error);
    }
  }, [send, subscribe]);
  
  // ===== DOCUMENT SEARCH HANDLERS =====
  
  useEffect(() => {
    const unsubscribe = subscribe('doc-search', (message) => {
      if (message.type === 'data' && message.data?.type === 'document_search_results') {
        setSearchResults(message.data.results || []);
        setSearching(false);
        setHasSearched(true);
      }
      
      if (message.type === 'error' && searching) {
        console.error('Search error:', message.message);
        setSearching(false);
        setHasSearched(true);
      }
    });
    
    return unsubscribe;
  }, [subscribe, searching]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || !currentProject) return;
    
    setSearching(true);
    setHasSearched(false);
    
    try {
      await send({
        type: 'document_command',
        method: 'documents.search',
        params: {
          project_id: currentProject.id,
          query: searchQuery.trim(),
          limit: 10,
        },
      });
    } catch (error) {
      console.error('Search failed:', error);
      setSearching(false);
      setHasSearched(true);
    }
  }, [currentProject, searchQuery, send]);

  const handleSearchKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !searching && searchQuery.trim()) {
      handleSearch();
    }
  }, [handleSearch, searching, searchQuery]);
  
  // ===== UTILITY FUNCTIONS =====
  
  const formatDate = (timestamp: string | number) => {
    const date = typeof timestamp === 'string' 
      ? new Date(timestamp)
      : new Date(timestamp * 1000);
    
    if (isNaN(date.getTime())) {
      console.warn('Invalid date:', timestamp);
      return 'Invalid date';
    }
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };
  
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const color = ext === 'pdf' ? 'text-red-400' 
      : ext === 'docx' || ext === 'doc' ? 'text-blue-400'
      : ext === 'md' ? 'text-purple-400'
      : 'text-gray-400';
    
    return <FileText className={`w-5 h-5 ${color}`} />;
  };

  const getScoreColor = (score: number): string => {
    if (score >= 0.8) return 'text-green-400';
    if (score >= 0.6) return 'text-blue-400';
    if (score >= 0.4) return 'text-yellow-400';
    return 'text-gray-400';
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 0.8) return 'Excellent match';
    if (score >= 0.6) return 'Good match';
    if (score >= 0.4) return 'Fair match';
    return 'Weak match';
  };

  const highlightQuery = (content: string, query: string): React.ReactNode => {
    const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    
    if (terms.length === 0) {
      return content;
    }

    const parts: { text: string; highlight: boolean }[] = [];
    let lastIndex = 0;
    const lowerContent = content.toLowerCase();

    for (const term of terms) {
      let index = lowerContent.indexOf(term, lastIndex);
      while (index !== -1) {
        if (index > lastIndex) {
          parts.push({ text: content.slice(lastIndex, index), highlight: false });
        }
        parts.push({ text: content.slice(index, index + term.length), highlight: true });
        lastIndex = index + term.length;
        index = lowerContent.indexOf(term, lastIndex);
      }
    }

    if (lastIndex < content.length) {
      parts.push({ text: content.slice(lastIndex), highlight: false });
    }

    return (
      <>
        {parts.map((part, i) => 
          part.highlight ? (
            <mark key={i} className="bg-yellow-400/30 text-slate-100 px-0.5 rounded">
              {part.text}
            </mark>
          ) : (
            <span key={i}>{part.text}</span>
          )
        )}
      </>
    );
  };
  
  return (
    <div className="flex-1 flex flex-col bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-slate-700">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Projects</h1>
          <p className="text-sm text-slate-400 mt-1">
            {projects.length} {projects.length === 1 ? 'project' : 'projects'}
          </p>
        </div>
        
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
        >
          <Plus size={18} />
          New Project
        </button>
      </div>
      
      {/* Create Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-slate-100 mb-4">Create New Project</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="My Awesome Project"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && newProjectName.trim()) {
                      e.preventDefault();
                      handleCreate();
                    }
                    if (e.key === 'Escape') {
                      setShowCreateForm(false);
                    }
                  }}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  placeholder="What's this project about?"
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleCreate}
                  disabled={!newProjectName.trim() || creating}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors"
                >
                  {creating ? 'Creating...' : 'Create Project'}
                </button>
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewProjectName('');
                    setNewProjectDescription('');
                  }}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-red-400 mb-4">Delete Project?</h2>
            <p className="text-slate-300 mb-6">
              This will permanently delete the project. This action cannot be undone.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={deleting === confirmDelete}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors"
              >
                {deleting === confirmDelete ? 'Deleting...' : 'Delete'}
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Attach Local Directory Modal */}
      {showAttachLocal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-slate-100 mb-4">Attach Local Directory</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Directory Path *
                </label>
                <input
                  type="text"
                  value={localDirectoryPath}
                  onChange={(e) => setLocalDirectoryPath(e.target.value)}
                  placeholder="/absolute/path/to/your/project"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono text-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && localDirectoryPath.trim()) {
                      e.preventDefault();
                      handleAttachLocal();
                    }
                    if (e.key === 'Escape') {
                      setShowAttachLocal(null);
                      setLocalDirectoryPath('');
                    }
                  }}
                />
                <p className="text-xs text-slate-500 mt-2">
                  Enter the absolute path to your project directory
                </p>
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleAttachLocal}
                  disabled={!localDirectoryPath.trim() || attaching}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors"
                >
                  {attaching ? 'Attaching...' : 'Attach Directory'}
                </button>
                <button
                  onClick={() => {
                    setShowAttachLocal(null);
                    setLocalDirectoryPath('');
                  }}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Documents Modal */}
      {showDocuments && currentProject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg border border-slate-700 w-full max-w-6xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-blue-500" />
                <div>
                  <h2 className="text-xl font-bold text-slate-100">Documents - {currentProject.name}</h2>
                  <p className="text-sm text-slate-400">Upload, search, and manage project documents</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowDocuments(false);
                  setDocumentsTab('upload');
                  setSearchQuery('');
                  setSearchResults([]);
                  setHasSearched(false);
                }}
                className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-700 rounded transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Tabs */}
            <div className="flex gap-2 px-6 pt-4 border-b border-slate-700">
              <button
                onClick={() => setDocumentsTab('upload')}
                className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                  documentsTab === 'upload'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <UploadIcon size={16} />
                  Upload
                </div>
              </button>
              <button
                onClick={() => setDocumentsTab('list')}
                className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                  documentsTab === 'list'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText size={16} />
                  Documents
                </div>
              </button>
              <button
                onClick={() => setDocumentsTab('search')}
                className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                  documentsTab === 'search'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <SearchIcon size={16} />
                  Search
                </div>
              </button>
            </div>
            
            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Upload Tab */}
              {documentsTab === 'upload' && (
                <div className="max-w-2xl mx-auto">
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    className={`p-8 border-2 border-dashed rounded-lg transition-colors ${
                      uploadStatus === 'success' 
                        ? 'border-green-500 bg-green-500/10' 
                        : uploadStatus === 'error'
                        ? 'border-red-500 bg-red-500/10'
                        : uploading
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-slate-600 hover:border-blue-500 bg-slate-800/50'
                    }`}
                  >
                    <div className="flex flex-col items-center">
                      {uploadStatus === 'success' ? (
                        <>
                          <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
                          <p className="text-green-400 font-medium text-lg">Upload complete!</p>
                        </>
                      ) : uploadStatus === 'error' ? (
                        <>
                          <XCircle className="w-16 h-16 text-red-500 mb-4" />
                          <p className="text-red-400 font-medium text-lg">{uploadError}</p>
                        </>
                      ) : (
                        <>
                          <UploadIcon className="w-16 h-16 text-slate-400 mb-6" />
                          
                          <input
                            type="file"
                            accept=".pdf,.docx,.doc,.txt,.md"
                            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                            disabled={uploading}
                            className="hidden"
                            id="file-upload-modal"
                          />
                          
                          <label
                            htmlFor="file-upload-modal"
                            className={`px-6 py-3 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors font-medium ${
                              uploading ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                          >
                            {uploading ? 'Uploading...' : 'Choose Document'}
                          </label>
                          
                          <p className="mt-4 text-sm text-slate-400">
                            PDF, DOCX, TXT, or MD files (max 50MB)
                          </p>
                          <p className="text-xs text-slate-500 mt-2">
                            Or drag and drop a file here
                          </p>
                        </>
                      )}
                    </div>
                    
                    {uploading && uploadStatus === 'uploading' && (
                      <div className="mt-8">
                        <div className="flex justify-between text-sm text-slate-300 mb-2">
                          <span className="truncate max-w-[300px]">{uploadFileName}</span>
                          <span>{uploadProgress.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                    <h3 className="text-sm font-medium text-slate-300 mb-2">Supported Formats</h3>
                    <ul className="text-xs text-slate-400 space-y-1">
                      <li>• PDF documents (.pdf)</li>
                      <li>• Microsoft Word (.docx, .doc)</li>
                      <li>• Plain text (.txt)</li>
                      <li>• Markdown (.md)</li>
                    </ul>
                  </div>
                </div>
              )}
              
              {/* List Tab */}
              {documentsTab === 'list' && (
                <div className="max-w-4xl mx-auto">
                  {loadingDocs ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : documents.length === 0 ? (
                    <div className="text-center py-12 bg-slate-800/50 rounded-lg border border-slate-700">
                      <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                      <p className="text-slate-400 text-lg mb-2">No documents uploaded yet</p>
                      <p className="text-slate-500 text-sm">Switch to the Upload tab to add documents</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {documents.map((doc) => (
                        <div 
                          key={doc.id} 
                          className="p-4 border border-slate-700 rounded-lg hover:bg-slate-800/50 transition-colors bg-slate-800/30"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              {getFileIcon(doc.file_name)}
                              
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-slate-100 truncate" title={doc.file_name}>
                                  {doc.file_name}
                                </div>
                                
                                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                                  <span>{formatSize(doc.size_bytes)}</span>
                                  
                                  {doc.word_count != null && (
                                    <>
                                      <span>•</span>
                                      <span>{doc.word_count.toLocaleString()} words</span>
                                    </>
                                  )}
                                  
                                  {doc.chunk_count != null && (
                                    <>
                                      <span>•</span>
                                      <span>{doc.chunk_count} chunks</span>
                                    </>
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-1 text-xs text-slate-600 mt-1">
                                  <Calendar className="w-3 h-3" />
                                  <span>{formatDate(doc.created_at)}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2 ml-4">
                              <button
                                onClick={() => handleDownloadDoc(doc.id, doc.file_name)}
                                className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded transition-colors"
                                title="Download document"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                              
                              <button
                                onClick={() => handleDeleteDoc(doc.id, doc.file_name)}
                                disabled={deletingDoc === doc.id}
                                className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded transition-colors disabled:opacity-50"
                                title="Delete document"
                              >
                                {deletingDoc === doc.id ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {/* Search Tab */}
              {documentsTab === 'search' && (
                <div className="max-w-4xl mx-auto">
                  <div className="flex gap-2 mb-6">
                    <div className="flex-1 relative">
                      <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyPress={handleSearchKeyPress}
                        placeholder="Search across all documents..."
                        className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                        disabled={searching}
                      />
                    </div>
                    <button
                      onClick={handleSearch}
                      disabled={searching || !searchQuery.trim()}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-medium"
                    >
                      {searching ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Searching...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Search
                        </>
                      )}
                    </button>
                  </div>

                  {hasSearched && !searching && (
                    <div className="text-sm text-slate-400 mb-4">
                      Found {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'} 
                      {searchResults.length > 0 && ' (semantic search)'}
                    </div>
                  )}

                  <div className="space-y-3">
                    {!hasSearched && !searching && (
                      <div className="text-center py-12 bg-slate-800/50 rounded-lg border border-slate-700">
                        <Sparkles className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                        <p className="text-slate-400 text-lg mb-2">Semantic search across your documents</p>
                        <p className="text-slate-500 text-sm">
                          Try searching for concepts, not just keywords
                        </p>
                      </div>
                    )}

                    {hasSearched && !searching && searchResults.length === 0 && searchQuery && (
                      <div className="text-center py-12 bg-slate-800/50 rounded-lg border border-slate-700">
                        <SearchIcon className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                        <p className="text-slate-400 text-lg mb-2">No results found for "{searchQuery}"</p>
                        <p className="text-slate-500 text-sm">
                          Try different keywords or upload more documents
                        </p>
                      </div>
                    )}

                    {searching && (
                      <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                    )}

                    {searchResults.map((result, i) => (
                      <div 
                        key={`${result.document_id}-${result.chunk_index}-${i}`}
                        className="p-4 border border-slate-700 rounded-lg hover:bg-slate-800/50 transition-colors bg-slate-800/30"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />
                            <span className="font-medium text-sm text-blue-400 truncate" title={result.file_name}>
                              {result.file_name}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-3 text-xs text-slate-500 ml-4">
                            <span className={`font-medium ${getScoreColor(result.score)}`}>
                              {(result.score * 100).toFixed(0)}%
                            </span>
                            <span className="text-slate-600">•</span>
                            <span>Chunk {result.chunk_index + 1}</span>
                          </div>
                        </div>

                        <div className="mb-3">
                          <div className="flex items-center gap-2 text-xs">
                            <div className="flex-1 bg-slate-700 rounded-full h-1">
                              <div
                                className={`h-1 rounded-full transition-all ${
                                  result.score >= 0.8 ? 'bg-green-500' :
                                  result.score >= 0.6 ? 'bg-blue-500' :
                                  result.score >= 0.4 ? 'bg-yellow-500' :
                                  'bg-slate-500'
                                }`}
                                style={{ width: `${result.score * 100}%` }}
                              />
                            </div>
                            <span className={`${getScoreColor(result.score)} font-medium`}>
                              {getScoreLabel(result.score)}
                            </span>
                          </div>
                        </div>

                        <div className="text-sm text-slate-300 leading-relaxed">
                          {highlightQuery(result.content, searchQuery)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="px-6 py-3 border-t border-slate-700 bg-slate-850">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-4">
                  <span>Supported: PDF, DOCX, TXT, MD</span>
                  <span>•</span>
                  <span>Max: 50MB</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Semantic search enabled</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Project Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <Folder size={64} className="mb-4 text-slate-600" />
            <h3 className="text-xl font-medium mb-2">No projects yet</h3>
            <p className="text-sm mb-6">Create your first project to get started</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
            >
              <Plus size={18} />
              Create Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => handleSelectProject(project)}
                className={`
                  relative p-6 rounded-lg border-2 transition-all cursor-pointer
                  ${currentProject?.id === project.id
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-slate-700 bg-slate-800 hover:border-slate-600 hover:bg-slate-800/80'
                  }
                `}
              >
                {currentProject?.id === project.id && (
                  <div className="absolute top-4 right-4">
                    <div className="flex items-center gap-1 px-2 py-1 bg-blue-600 rounded text-xs font-medium text-white">
                      <Check size={12} />
                      Active
                    </div>
                  </div>
                )}
                
                <div className="flex items-start gap-3 mb-4">
                  <div className={`
                    p-2 rounded-lg
                    ${currentProject?.id === project.id ? 'bg-blue-600' : 'bg-slate-700'}
                  `}>
                    <Folder size={20} className="text-slate-100" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-slate-100 truncate">
                      {project.name}
                    </h3>
                    {project.has_repository && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-green-400">
                        <GitBranch size={12} />
                        Repository attached
                      </div>
                    )}
                  </div>
                </div>
                
                {project.description && (
                  <p className="text-sm text-slate-400 mb-4 line-clamp-2">
                    {project.description}
                  </p>
                )}
                
                <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
                  <div className="flex items-center gap-1">
                    <Clock size={12} />
                    {formatDate(project.created_at)}
                  </div>
                  {project.tags && project.tags.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Tag size={12} />
                      {project.tags.length}
                    </div>
                  )}
                </div>
                
                {project.tags && project.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {project.tags.slice(0, 3).map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded"
                      >
                        {tag}
                      </span>
                    ))}
                    {project.tags.length > 3 && (
                      <span className="px-2 py-1 text-slate-500 text-xs">
                        +{project.tags.length - 3} more
                      </span>
                    )}
                  </div>
                )}
                
                {currentProject?.id === project.id && (
                  <div className="space-y-2">
                    {!project.has_repository && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowAttachLocal(project.id);
                        }}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded transition-colors text-sm"
                      >
                        <Folder size={14} />
                        Attach Local Directory
                      </button>
                    )}
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDocuments(true);
                      }}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors text-sm text-white font-medium"
                    >
                      <FileText size={14} />
                      Documents
                    </button>
                  </div>
                )}
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDelete(project.id);
                  }}
                  className="absolute bottom-4 right-4 p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded transition-colors"
                  title="Delete project"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
