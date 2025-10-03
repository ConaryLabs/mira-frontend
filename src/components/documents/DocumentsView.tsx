// src/components/documents/DocumentsView.tsx
import { useState } from 'react';
import { DocumentUpload } from './DocumentUpload';
import { DocumentList } from './DocumentList';
import { DocumentSearch } from './DocumentSearch';
import { FileText, Upload as UploadIcon, Search } from 'lucide-react';

interface DocumentsViewProps {
  projectId: string;
}

export function DocumentsView({ projectId }: DocumentsViewProps) {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUploadComplete = () => {
    // Force list refresh by changing key
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 text-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-blue-500" />
          <div>
            <h2 className="text-xl font-semibold text-gray-100">Document Processing</h2>
            <p className="text-sm text-gray-400">Upload, search, and manage your project documents</p>
          </div>
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full grid grid-cols-2 gap-6 p-6">
          {/* Left Column: Upload & List */}
          <div className="space-y-6 overflow-y-auto">
            {/* Upload Section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <UploadIcon className="w-5 h-5 text-blue-500" />
                <h3 className="text-lg font-semibold text-gray-200">Upload Documents</h3>
              </div>
              <DocumentUpload 
                projectId={projectId} 
                onUploadComplete={handleUploadComplete}
              />
            </div>

            {/* Document List Section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-blue-500" />
                <h3 className="text-lg font-semibold text-gray-200">Your Documents</h3>
              </div>
              <DocumentList key={refreshKey} projectId={projectId} />
            </div>
          </div>

          {/* Right Column: Search */}
          <div className="overflow-y-auto">
            <div className="flex items-center gap-2 mb-4">
              <Search className="w-5 h-5 text-blue-500" />
              <h3 className="text-lg font-semibold text-gray-200">Search Documents</h3>
            </div>
            <DocumentSearch projectId={projectId} />
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="px-6 py-3 border-t border-gray-800 bg-gray-850">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span>Supported formats: PDF, DOCX, TXT, MD</span>
            <span>•</span>
            <span>Max file size: 50MB</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Semantic search enabled</span>
          </div>
        </div>
      </div>
    </div>
  );
}
