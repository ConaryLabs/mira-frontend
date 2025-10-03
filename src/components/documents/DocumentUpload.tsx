// src/components/documents/DocumentUpload.tsx
import { useState, useCallback, useEffect } from 'react';
import { useWebSocketStore } from '../../stores/useWebSocketStore';
import { Upload, CheckCircle, XCircle } from 'lucide-react';

interface DocumentUploadProps {
  projectId: string;
  onUploadComplete?: () => void;
}

export function DocumentUpload({ projectId, onUploadComplete }: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState('');
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const { send, subscribe } = useWebSocketStore();

  useEffect(() => {
    const unsubscribe = subscribe('doc-upload', (message) => {
      // Handle progress updates
      if (message.type === 'data' && message.data?.type === 'document_processing_progress') {
        setProgress(message.data.progress * 100);
        setStatus('uploading');
      }
      
      // Handle completion
      if (message.type === 'data' && message.data?.type === 'document_processed') {
        setStatus('success');
        setProgress(100);
        
        // Reset after 2 seconds
        setTimeout(() => {
          setUploading(false);
          setProgress(0);
          setFileName('');
          setStatus('idle');
          onUploadComplete?.();
        }, 2000);
      }
      
      // Handle errors
      if (message.type === 'error' && uploading) {
        setStatus('error');
        setErrorMessage(message.message || 'Upload failed');
        setUploading(false);
      }
    });
    
    return unsubscribe;
  }, [subscribe, onUploadComplete, uploading]);

  const validateFile = (file: File): string | null => {
    const validExtensions = ['.pdf', '.docx', '.doc', '.txt', '.md'];
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!validExtensions.includes(extension)) {
      return `Invalid file type. Accepted formats: ${validExtensions.join(', ')}`;
    }
    
    // 50MB max file size
    if (file.size > 50 * 1024 * 1024) {
      return 'File too large. Maximum size is 50MB';
    }
    
    return null;
  };

  const handleFileSelect = useCallback(async (file: File) => {
    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      setStatus('error');
      setErrorMessage(validationError);
      setTimeout(() => {
        setStatus('idle');
        setErrorMessage('');
      }, 3000);
      return;
    }
    
    setUploading(true);
    setProgress(0);
    setFileName(file.name);
    setStatus('uploading');
    setErrorMessage('');

    const reader = new FileReader();
    
    reader.onerror = () => {
      setStatus('error');
      setErrorMessage('Failed to read file');
      setUploading(false);
    };
    
    reader.onload = async (e) => {
      try {
        const result = e.target?.result?.toString();
        if (!result) {
          throw new Error('Failed to read file content');
        }
        
        // Extract base64 content (remove data:... prefix)
        const base64 = result.split(',')[1];
        
        if (!base64) {
          throw new Error('Invalid file content');
        }

        await send({
          type: 'document_command',
          method: 'documents.upload',
          params: {
            project_id: projectId,
            file_name: file.name,
            content: base64,
          },
        });
      } catch (error) {
        console.error('Upload error:', error);
        setStatus('error');
        setErrorMessage(error instanceof Error ? error.message : 'Upload failed');
        setUploading(false);
      }
    };
    
    reader.readAsDataURL(file);
  }, [projectId, send]);

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

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className={`p-6 border-2 border-dashed rounded-lg transition-colors ${
        status === 'success' 
          ? 'border-green-500 bg-green-50' 
          : status === 'error'
          ? 'border-red-500 bg-red-50'
          : uploading
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-600 hover:border-blue-500 bg-gray-800'
      }`}
    >
      <div className="flex flex-col items-center">
        {status === 'success' ? (
          <>
            <CheckCircle className="w-12 h-12 text-green-600 mb-4" />
            <p className="text-green-700 font-medium">Upload complete!</p>
          </>
        ) : status === 'error' ? (
          <>
            <XCircle className="w-12 h-12 text-red-600 mb-4" />
            <p className="text-red-700 font-medium">{errorMessage}</p>
          </>
        ) : (
          <>
            <Upload className="w-12 h-12 text-gray-400 mb-4" />
            
            <input
              type="file"
              accept=".pdf,.docx,.doc,.txt,.md"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              disabled={uploading}
              className="hidden"
              id="file-upload"
            />
            
            <label
              htmlFor="file-upload"
              className={`px-4 py-2 bg-blue-600 text-white rounded-md cursor-pointer hover:bg-blue-700 transition-colors ${
                uploading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {uploading ? 'Uploading...' : 'Choose Document'}
            </label>
            
            <p className="mt-2 text-sm text-gray-400">
              PDF, DOCX, TXT, or MD files (max 50MB)
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Or drag and drop a file here
            </p>
          </>
        )}
      </div>
      
      {uploading && status === 'uploading' && (
        <div className="mt-6">
          <div className="flex justify-between text-sm text-gray-300 mb-2">
            <span className="truncate max-w-[200px]">{fileName}</span>
            <span>{progress.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
