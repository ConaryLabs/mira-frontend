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
import { createGitCommand } from '../types/websocket';
import type { WsClientMessage } from '../types/websocket';

interface FileContent {
  path: string;
  content: string;
  language?: string;
  encoding?: string;
}

interface FileEditorProps {
  projectId: string;
  attachmentId: string;
  filePath: string;
  isDark?: boolean;
  onClose?: () => void;
  onSave?: (content: string) => void;
  send?: (message: WsClientMessage) => void;
  onGitResponse?: (handler: (data: any) => void) => void;
}

export const FileEditor: React.FC<FileEditorProps> = ({
  projectId,
  attachmentId,
  filePath,
  isDark = false,
  onClose,
  onSave,
  send,
  onGitResponse
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
    const handleGitData = (data: any) => {
      if (data.type === 'file_content') {
        setFileContent({
          path: data.path,
          content: data.content,
          language: getLanguageFromPath(data.path)
        });
        setEditedContent(data.content);
        setLoading(false);
      } else if (data.type === 'file_updated') {
        setFileContent(prev => prev ? { ...prev, content: editedContent } : null);
        setSaveStatus('saved');
        setSaving(false);
        onSave?.(editedContent);
        setTimeout(() => setShowSyncPrompt(true), 1000);
      } else if (data.type === 'repo_synced') {
        setShowSyncPrompt(false);
        setSyncMessage('');
        setSaving(false);
      } else if (data.type === 'error') {
        setError(data.message || 'An error occurred');
        setSaving(false);
        setLoading(false);
        setSaveStatus('idle');
      }
    };

    if (onGitResponse) {
      onGitResponse(handleGitData);
    }
  }, [onGitResponse, editedContent, onSave]);

  useEffect(() => {
    loadFile();
  }, [projectId, attachmentId, filePath, send]);

  useEffect(() => {
    if (fileContent && editedContent !== fileContent.content) {
      setIsDirty(true);
      setSaveStatus('idle');
    } else {
      setIsDirty(false);
    }
  }, [editedContent, fileContent]);

  const loadFile = () => {
    if (!send) {
      setError('WebSocket not connected');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    send(createGitCommand('git.file', {
      project_id: projectId,
      attachment_id: attachmentId,
      file_path: filePath
    }));
  };

  const handleSave = () => {
    if (!send) {
      setError('WebSocket not connected');
      return;
    }

    setSaving(true);
    setSaveStatus('saving');
    setError(null);
    
    send(createGitCommand('git.update_file', {
      project_id: projectId,
      attachment_id: attachmentId,
      file_path: filePath,
      content: editedContent,
      commit_message: `Update ${filePath}`
    }));
  };

  const handleSync = () => {
    if (!syncMessage.trim()) {
      setError('Please provide a commit message');
      return;
    }

    if (!send) {
      setError('WebSocket not connected');
      return;
    }

    setSaving(true);
    send(createGitCommand('git.sync', {
      project_id: projectId,
      attachment_id: attachmentId,
      message: syncMessage
    }));
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
            disabled={!isDirty || saving || !send}
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
                  disabled={saving || !syncMessage.trim() || !send}
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
