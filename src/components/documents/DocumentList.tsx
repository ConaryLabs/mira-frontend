// src/components/documents/DocumentList.tsx
import { useState, useEffect, useCallback } from 'react';
import { useWebSocketStore } from '../../stores/useWebSocketStore';
import { FileText, Trash2, Download, Calendar } from 'lucide-react';
import type { DocumentMetadata } from '../../types';

interface DocumentListProps {
  projectId: string;
}

export function DocumentList({ projectId }: DocumentListProps) {
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const { send, subscribe } = useWebSocketStore();

  // Load documents on mount and when projectId changes
  useEffect(() => {
    setLoading(true);
    
    send({
      type: 'document_command',
      method: 'documents.list',
      params: { project_id: projectId },
    });

    const unsubscribe = subscribe('doc-list', (message) => {
      if (message.type === 'data' && message.data?.type === 'document_list') {
        setDocuments(message.data.documents || []);
        setLoading(false);
      }
    });
    
    return unsubscribe;
  }, [projectId, send, subscribe]);

  const handleDelete = useCallback(async (documentId: string, fileName: string) => {
    if (!confirm(`Delete "${fileName}"? This will remove the document and all its chunks.`)) {
      return;
    }
    
    setDeleting(documentId);
    
    try {
      await send({
        type: 'document_command',
        method: 'documents.delete',
        params: { document_id: documentId },
      });
      
      // Refresh list after delete
      await send({
        type: 'document_command',
        method: 'documents.list',
        params: { project_id: projectId },
      });
    } catch (error) {
      console.error('Delete failed:', error);
    } finally {
      setDeleting(null);
    }
  }, [projectId, send]);

  const handleDownload = useCallback(async (documentId: string, fileName: string) => {
    try {
      await send({
        type: 'document_command',
        method: 'documents.retrieve',
        params: { document_id: documentId },
      });
      
      // Subscribe to the response
      const unsubscribe = subscribe('doc-download', (message) => {
        if (message.type === 'data' && message.data?.type === 'document_content') {
          // Decode base64 and trigger download
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

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (timestamp: string | number): string => {
    // Handle unix timestamp (number) or ISO string
    const date = typeof timestamp === 'number' 
      ? new Date(timestamp * 1000) // Unix timestamp in seconds
      : new Date(timestamp);
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const color = ext === 'pdf' ? 'text-red-600' 
      : ext === 'docx' || ext === 'doc' ? 'text-blue-600'
      : ext === 'md' ? 'text-purple-600'
      : 'text-gray-600';
    
    return <FileText className={`w-5 h-5 ${color} mt-1 flex-shrink-0`} />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
        <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400 text-sm">No documents uploaded yet</p>
        <p className="text-gray-500 text-xs mt-1">Upload a document above to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[600px] overflow-y-auto">
      {documents.map((doc) => (
        <div 
          key={doc.id} 
          className="p-4 border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors bg-gray-850"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {getFileIcon(doc.file_name)}
              
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-200 truncate" title={doc.file_name}>
                  {doc.file_name}
                </div>
                
                <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                  <span>{formatSize(doc.size_bytes)}</span>
                  
                  {/* Only show word count if available */}
                  {doc.word_count != null && (
                    <>
                      <span>•</span>
                      <span>{doc.word_count.toLocaleString()} words</span>
                    </>
                  )}
                  
                  {/* Only show chunk count if available */}
                  {doc.chunk_count != null && (
                    <>
                      <span>•</span>
                      <span>{doc.chunk_count} chunks</span>
                    </>
                  )}
                </div>
                
                <div className="flex items-center gap-1 text-xs text-gray-600 mt-1">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(doc.created_at)}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 ml-4">
              <button
                onClick={() => handleDownload(doc.id, doc.file_name)}
                className="p-2 text-gray-400 hover:text-blue-500 hover:bg-gray-700 rounded transition-colors"
                title="Download document"
              >
                <Download className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => handleDelete(doc.id, doc.file_name)}
                disabled={deleting === doc.id}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
                title="Delete document"
              >
                {deleting === doc.id ? (
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
  );
}
