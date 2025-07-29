// src/components/FileEditor.tsx
import React, { useState, useEffect } from 'react';
import { 
  Save, 
  X, 
  FileText, 
  AlertCircle,
  Loader2,
  Check,
  RefreshCw
} from 'lucide-react';
import { fileApi, FileContent } from '../services/fileApi';
import { gitApi } from '../services/gitApi';

interface FileEditorProps {
  projectId: string;
  attachmentId: string;
  filePath: string;
  isDark?: boolean;
  onClose?: () => void;
  onSave?: (content: string) => void;
}

export const FileEditor: React.FC<FileEditorProps> = ({
  projectId,
  attachmentId,
  filePath,
  isDark = false,
  onClose,
  onSave,
}) => {
  const [fileContent, setFileContent] = useState<FileContent | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [showSyncPrompt, setShowSyncPrompt] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  useEffect(() => {
    loadFile();
  }, [projectId, attachmentId, filePath]);

  useEffect(() => {
    if (fileContent && editedContent !== fileContent.content) {
      setIsDirty(true);
      setSaveStatus('idle');
    } else {
      setIsDirty(false);
    }
  }, [editedContent, fileContent]);

  const loadFile = async () => {
    try {
      setLoading(true);
      setError(null);
      const content = await fileApi.getFileContent(projectId, attachmentId, filePath);
      setFileContent(content);
      setEditedContent(content.content);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load file');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setSaveStatus('saving');
      setError(null);
      
      await fileApi.updateFileContent(projectId, attachmentId, filePath, {
        content: editedContent,
      });
      
      setFileContent({ ...fileContent!, content: editedContent });
      setSaveStatus('saved');
      onSave?.(editedContent);
      
      // Show sync prompt after successful save
      setTimeout(() => setShowSyncPrompt(true), 1000);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to save file');
      setSaveStatus('idle');
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    if (!syncMessage.trim()) {
      setError('Please provide a commit message');
      return;
    }

    try {
      setSaving(true);
      await gitApi.syncRepo(projectId, attachmentId, { 
        commit_message: syncMessage 
      });
      setShowSyncPrompt(false);
      setSyncMessage('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to sync changes');
    } finally {
      setSaving(false);
    }
  };

  const getLanguageFromPath = (path: string): string => {
    const ext = path.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      ts: 'typescript',
      tsx: 'typescript',
      js: 'javascript',
      jsx: 'javascript',
      py: 'python',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      go: 'go',
      rs: 'rust',
      md: 'markdown',
      json: 'json',
      yaml: 'yaml',
      yml: 'yaml',
      toml: 'toml',
      css: 'css',
      scss: 'scss',
      html: 'html',
      xml: 'xml',
    };
    return languageMap[ext || ''] || 'plaintext';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center gap-2">
          <FileText className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
          <span className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>{filePath}</span>
          {isDirty && (
            <span className={`text-xs px-2 py-0.5 rounded ${
              isDark ? 'text-orange-400 bg-orange-900/50' : 'text-orange-600 bg-orange-50'
            }`}>
              Modified
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className={`text-xs px-2 py-0.5 rounded flex items-center gap-1 ${
              isDark ? 'text-green-400 bg-green-900/50' : 'text-green-600 bg-green-50'
            }`}>
              <Check className="w-3 h-3" />
              Saved
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={!isDirty || saving}
            className={`px-3 py-1.5 text-sm rounded flex items-center gap-1 ${
              isDark 
                ? 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50' 
                : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50'
            } disabled:cursor-not-allowed`}
          >
            {saving ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Save className="w-3 h-3" />
            )}
            Save
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className={`p-1.5 rounded ${
                isDark 
                  ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-800' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className={`mx-4 mt-3 p-3 rounded-lg text-sm flex items-start gap-2 ${
          isDark 
            ? 'bg-red-900/20 border border-red-800 text-red-400' 
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <textarea
          value={editedContent}
          onChange={(e) => setEditedContent(e.target.value)}
          className={`w-full h-full p-4 font-mono text-sm resize-none focus:outline-none ${
            isDark 
              ? 'bg-gray-900 text-gray-100 placeholder-gray-500' 
              : 'bg-white text-gray-800 placeholder-gray-400'
          }`}
          spellCheck={false}
          placeholder="Enter your code here..."
        />
      </div>

      {/* Sync prompt */}
      {showSyncPrompt && (
        <div className={`border-t p-4 ${
          isDark 
            ? 'border-gray-700 bg-gray-800' 
            : 'border-gray-200 bg-gray-50'
        }`}>
          <div className="flex items-start gap-3">
            <RefreshCw className={`w-5 h-5 mt-0.5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
            <div className="flex-1">
              <p className={`text-sm mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Would you like to sync these changes to the Git repository?
              </p>
              <input
                type="text"
                value={syncMessage}
                onChange={(e) => setSyncMessage(e.target.value)}
                placeholder="Commit message (e.g., 'Update configuration')"
                className={`w-full px-3 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 mb-2 ${
                  isDark 
                    ? 'border-gray-600 bg-gray-700 text-gray-100 placeholder-gray-400' 
                    : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                }`}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSync}
                  disabled={saving || !syncMessage.trim()}
                  className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                >
                  {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                  Sync to Git
                </button>
                <button
                  onClick={() => {
                    setShowSyncPrompt(false);
                    setSyncMessage('');
                  }}
                  className={`px-3 py-1.5 text-sm rounded ${
                    isDark 
                      ? 'text-gray-300 hover:text-gray-100' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
