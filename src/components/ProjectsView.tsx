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
  const { projects, currentProject, setCurrentProject, setProjects } = useAppState();
  const { send, subscribe } = useWebSocketStore();
  
  // Project state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  
  // Local directory attachment state
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
  
  // Load projects on mount
  useEffect(() => {
    console.log('ProjectsView: Loading projects from backend');
    
    send({
      type: 'project_command',
      method: 'project.list',
      params: {}
    });

    const unsubscribe = subscribe('projects-initial-load', (message) => {
      if (message.type === 'data' && message.data?.type === 'project_list') {
        console.log('ProjectsView: Received projects from backend:', message.data.projects?.length || 0);
        setProjects(message.data.projects || []);
      }
    });

    return unsubscribe;
  }, [send, subscribe, setProjects]);
  
  // Project handlers
  
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
      
      setTimeout(() => {
        send({
          type: 'project_command',
          method: 'project.list',
          params: {}
        });
      }, 100);
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
      
      if (currentProject?.id === projectId) {
        setCurrentProject(null);
      }
      
      setTimeout(() => {
        send({
          type: 'project_command',
          method: 'project.list',
          params: {}
        });
      }, 100);
    } catch (error) {
      console.error('Delete failed:', error);
    } finally {
      setDeleting(null);
      setConfirmDelete(null);
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
      
      setShowAttachLocal(null);
      setLocalDirectoryPath('');
      
      setTimeout(() => {
        send({
          type: 'project_command',
          method: 'project.list',
          params: {}
        });
      }, 100);
    } catch (error) {
      console.error('Attach failed:', error);
    } finally {
      setAttaching(false);
    }
  };
  
  // Document upload handlers
  
  useEffect(() => {
    const unsubscribe = subscribe('doc-upload', (message) => {
      if (message.type === 'data' && message.data?.type === 'upload_progress') {
        setUploadProgress(message.data.progress || 0);
      }
      
      if (message.type === 'data' && message.data?.type === 'document_uploaded') {
        setUploadStatus('success');
        setUploading(false);
        setDocRefreshKey(prev => prev + 1);
        
        setTimeout(() => {
          setUploadStatus('idle');
          setUploadFileName('');
          setUploadProgress(0);
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

  const handleFileSelect = useCallback((file: File) => {
    if (!currentProject) return;
    
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadStatus('error');
      setUploadError('File size exceeds 50MB limit');
      return;
    }
    
    const validTypes = ['.pdf', '.docx', '.doc', '.txt', '.md'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!validTypes.includes(ext)) {
      setUploadStatus('error');
      setUploadError('Unsupported file type. Use PDF, DOCX, TXT, or MD');
      return;
    }
    
    setUploadFileName(file.name);
    setUploadStatus('uploading');
    setUploading(true);
    setUploadProgress(0);
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const base64 = (e.target?.result as string).split(',')[1];
        
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
        setUploadStatus('error');
        setUploadError(error instanceof Error ? error.message : 'Upload failed');
        setUploading(false);
      }
    };
    
    reader.onerror = () => {
      setUploadStatus('error');
      setUploadError('Failed to read file');
      setUploading(false);
    };
    
    reader.readAsDataURL(file);
  }, [currentProject, send]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);
  
  // Document list handlers
  
  useEffect(() => {
    if (documentsTab === 'list' && currentProject) {
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
    }
  }, [documentsTab, currentProject, send, subscribe, docRefreshKey]);

  const handleDocumentDelete = useCallback(async (documentId: string, fileName: string) => {
    if (!confirm(`Delete "${fileName}"? This cannot be undone.`)) return;
    
    setDeletingDoc(documentId);
    
    try {
      await send({
        type: 'document_command',
        method: 'documents.delete',
        params: { document_id: documentId },
      });
      
      setDocRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Delete failed:', error);
    } finally {
      setDeletingDoc(null);
    }
  }, [send]);

  const handleDocumentDownload = useCallback(async (documentId: string, fileName: string) => {
    try {
      await send({
        type: 'document_command',
        method: 'documents.download',
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
  
  // Document search handlers
  
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
  
  // Utility functions
  
  const formatDate = (timestamp: string | number) => {
    const date = typeof timestamp === 'string' 
      ? new Date(parseInt(timestamp) * 1000) 
      : new Date(timestamp * 1000);
    return date.toLocaleDateString();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-400';
    if (score >= 0.6) return 'text-blue-400';
    if (score >= 0.4) return 'text-yellow-400';
    return 'text-slate-400';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 0.8) return 'Excellent match';
    if (score >= 0.6) return 'Good match';
    if (score >= 0.4) return 'Fair match';
    return 'Weak match';
  };

  const highlightQuery = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() 
        ? <span key={i} className="bg-yellow-500/30 text-yellow-200 font-semibold">{part}</span>
        : part
    );
  };
  
  // Render
  
  return (
    <div className="flex-1 flex flex-col bg-slate-900 text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <Folder className="w-6 h-6 text-blue-500" />
          <h1 className="text-xl font-bold">Projects</h1>
          <span className="text-sm text-slate-400">({projects.length})</span>
        </div>
        
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-medium"
        >
          <Plus size={18} />
          New Project
        </button>
      </div>
      
      {/* Create Project Modal */}
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
                      setNewProjectName('');
                      setNewProjectDescription('');
                    }
                  }}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Description
                </label>
                <textarea
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  placeholder="What's this project about?"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                  rows={3}
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleCreate}
                  disabled={!newProjectName.trim() || creating}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg text-white font-medium transition-colors"
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
      
      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-slate-100 mb-4">Delete Project?</h2>
            <p className="text-slate-300 mb-6">
              This will permanently delete the project and all its data. This action cannot be undone.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={deleting === confirmDelete}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg text-white font-medium transition-colors"
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
                  Directory Path
                </label>
                <input
                  type="text"
                  value={localDirectoryPath}
                  onChange={(e) => setLocalDirectoryPath(e.target.value)}
                  placeholder="/path/to/your/project"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && localDirectoryPath.trim()) {
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
                  Must be an absolute path on the server filesystem
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleAttachLocal}
                  disabled={!localDirectoryPath.trim() || attaching}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg text-white font-medium transition-colors"
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
                  Manage
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
                <div>
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    className={`
                      border-2 border-dashed rounded-lg p-12 text-center transition-colors
                      ${uploading ? 'border-blue-500 bg-blue-500/5' : 'border-slate-600 hover:border-slate-500'}
                    `}
                  >
                    {uploadStatus === 'idle' && (
                      <>
                        <UploadIcon className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-slate-100 mb-2">
                          Drop file here or click to browse
                        </h3>
                        <p className="text-sm text-slate-400 mb-4">
                          PDF, DOCX, TXT, MD • Max 50MB
                        </p>
                        <input
                          type="file"
                          id="file-input"
                          accept=".pdf,.docx,.doc,.txt,.md"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileSelect(file);
                          }}
                          className="hidden"
                        />
                        <label
                          htmlFor="file-input"
                          className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium cursor-pointer transition-colors"
                        >
                          Choose File
                        </label>
                      </>
                    )}
                    
                    {uploadStatus === 'uploading' && (
                      <div className="space-y-4">
                        <Sparkles className="w-16 h-16 text-blue-500 mx-auto animate-pulse" />
                        <h3 className="text-lg font-semibold text-slate-100">
                          Processing {uploadFileName}
                        </h3>
                        <div className="max-w-md mx-auto">
                          <div className="w-full bg-slate-700 rounded-full h-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                          <p className="text-sm text-slate-400 mt-2">{uploadProgress}%</p>
                        </div>
                      </div>
                    )}
                    
                    {uploadStatus === 'success' && (
                      <>
                        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-slate-100 mb-2">
                          Upload Complete
                        </h3>
                        <p className="text-sm text-slate-400">
                          {uploadFileName} has been processed and indexed
                        </p>
                      </>
                    )}
                    
                    {uploadStatus === 'error' && (
                      <>
                        <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-slate-100 mb-2">
                          Upload Failed
                        </h3>
                        <p className="text-sm text-red-400 mb-4">{uploadError}</p>
                        <button
                          onClick={() => {
                            setUploadStatus('idle');
                            setUploadError('');
                          }}
                          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 font-medium transition-colors"
                        >
                          Try Again
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
              
              {/* List Tab */}
              {documentsTab === 'list' && (
                <div>
                  {loadingDocs ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-slate-400">Loading documents...</div>
                    </div>
                  ) : documents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                      <FileText className="w-16 h-16 mb-4 text-slate-600" />
                      <p>No documents yet</p>
                      <p className="text-sm">Upload a document to get started</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-start justify-between p-4 bg-slate-700/50 rounded-lg border border-slate-600 hover:border-slate-500 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <FileText className="w-5 h-5 text-blue-400 flex-shrink-0" />
                              <h3 className="font-medium text-slate-100 truncate">
                                {doc.file_name}
                              </h3>
                            </div>
                            
                            <div className="flex items-center gap-4 text-xs text-slate-400">
                              <span>{formatFileSize(doc.size_bytes)}</span>
                              <span>•</span>
                              <span>{doc.word_count} words</span>
                              <span>•</span>
                              <span>{doc.chunk_count} chunks</span>
                              <span>•</span>
                              <div className="flex items-center gap-1">
                                <Calendar size={12} />
                                {formatDate(doc.created_at)}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 ml-4">
                            <button
                              onClick={() => handleDocumentDownload(doc.id, doc.file_name)}
                              className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded transition-colors"
                              title="Download"
                            >
                              <Download size={16} />
                            </button>
                            <button
                              onClick={() => handleDocumentDelete(doc.id, doc.file_name)}
                              disabled={deletingDoc === doc.id}
                              className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded transition-colors disabled:opacity-50"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {/* Search Tab */}
              {documentsTab === 'search' && (
                <div>
                  <div className="flex gap-2 mb-6">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={handleSearchKeyPress}
                      placeholder="Search documents..."
                      className="flex-1 px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      onClick={handleSearch}
                      disabled={!searchQuery.trim() || searching}
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg text-white font-medium transition-colors"
                    >
                      {searching ? 'Searching...' : 'Search'}
                    </button>
                  </div>
                  
                  {hasSearched && (
                    <div>
                      {searchResults.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                          <SearchIcon className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                          <p>No results found</p>
                          <p className="text-sm">Try different search terms</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {searchResults.map((result, idx) => (
                            <div
                              key={idx}
                              className="p-4 bg-slate-700/50 rounded-lg border border-slate-600"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <h4 className="font-medium text-slate-100 mb-1">
                                    {result.document_name}
                                  </h4>
                                  <p className="text-xs text-slate-400">
                                    Chunk {result.chunk_index + 1}
                                  </p>
                                </div>
                                
                                <div className="flex items-center gap-3 ml-4">
                                  <div className="flex items-center gap-2">
                                    <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full ${
                                          result.score >= 0.8 ? 'bg-green-500' :
                                          result.score >= 0.6 ? 'bg-blue-500' :
                                          result.score >= 0.4 ? 'bg-yellow-500' :
                                          'bg-slate-500'
                                        }`}
                                        style={{ width: `${result.score * 100}%` }}
                                      />
                                    </div>
                                    <span className={`${getScoreColor(result.score)} font-medium text-sm`}>
                                      {getScoreLabel(result.score)}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="text-sm text-slate-300 leading-relaxed">
                                {highlightQuery(result.content, searchQuery)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
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
                    ? 'border-blue-500 bg-slate-800'
                    : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                  }
                `}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-slate-100 flex-1 pr-2">
                    {project.name}
                  </h3>
                  {project.has_repository && (
                    <Github size={18} className="text-slate-400 flex-shrink-0" />
                  )}
                </div>
                
                {project.description && (
                  <p className="text-sm text-slate-400 mb-4 line-clamp-2">
                    {project.description}
                  </p>
                )}
                
                <div className="flex items-center gap-3 text-xs text-slate-500 mb-4">
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
