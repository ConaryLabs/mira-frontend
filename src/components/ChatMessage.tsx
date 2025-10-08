// src/components/ChatMessage.tsx
// FIXED: Use batch write_files for Apply All to prevent message loss

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ChatMessage as ChatMessageType, Artifact } from '../stores/useChatStore';
import { useWebSocketStore } from '../stores/useWebSocketStore';
import { useAppState } from '../stores/useAppState';
import { Check, FileCode, AlertCircle, User, Bot } from 'lucide-react';

interface ChatMessageProps {
  message: ChatMessageType;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const [appliedArtifacts, setAppliedArtifacts] = useState<Set<string>>(new Set());
  const [isApplyingAll, setIsApplyingAll] = useState(false);
  const { send } = useWebSocketStore();
  const { currentProject, setShowArtifacts, addArtifact, setActiveArtifact } = useAppState();
  
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  
  const handleApplyArtifact = async (artifact: Artifact) => {
    if (!currentProject) {
      console.error('[ChatMessage] No project selected');
      return;
    }
    
    console.log('[ChatMessage] Applying fix to:', artifact.path);
    
    try {
      await send({
        type: 'file_system_command',
        method: 'files.write',
        params: {
          project_id: currentProject.id,
          path: artifact.path,
          content: artifact.content,
        }
      });
      
      // Wait a bit for backend to process before marking as applied
      await new Promise(resolve => setTimeout(resolve, 100));
      
      setAppliedArtifacts(prev => new Set(prev).add(artifact.id));
      console.log('[ChatMessage] Fix applied successfully');
    } catch (error) {
      console.error('[ChatMessage] Failed to apply fix:', error);
    }
  };
  
  const handleUndoArtifact = async (artifact: Artifact) => {
    if (!currentProject) return;
    
    console.log('[ChatMessage] Restoring file from git:', artifact.path);
    
    try {
      await send({
        type: 'git_command',
        method: 'git.restore',
        params: {
          project_id: currentProject.id,
          file_path: artifact.path,
        }
      });
      
      setAppliedArtifacts(prev => {
        const next = new Set(prev);
        next.delete(artifact.id);
        return next;
      });
      
      console.log('[ChatMessage] File restored');
    } catch (error) {
      console.error('[ChatMessage] Failed to restore file:', error);
    }
  };
  
  // FIXED: Use batch write_files for Apply All
  const handleApplyAll = async () => {
    if (!message.artifacts || !currentProject) return;
    
    setIsApplyingAll(true);
    console.log('[ChatMessage] Applying all artifacts via batch write_files');
    
    try {
      // Filter to only unapplied artifacts
      const artifactsToApply = message.artifacts.filter(a => !appliedArtifacts.has(a.id));
      
      if (artifactsToApply.length === 0) {
        console.log('[ChatMessage] No artifacts to apply');
        setIsApplyingAll(false);
        return;
      }
      
      // Use Phase 3 batch write_files tool for efficiency
      // This sends all files in a single WebSocket message
      await send({
        type: 'file_system_command',
        method: 'write_files',
        params: {
          project_id: currentProject.id,
          files: artifactsToApply.map(artifact => ({
            path: artifact.path,
            content: artifact.content
          }))
        }
      });
      
      // Wait for backend to process
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Mark all as applied
      setAppliedArtifacts(prev => {
        const next = new Set(prev);
        artifactsToApply.forEach(a => next.add(a.id));
        return next;
      });
      
      console.log(`[ChatMessage] Applied ${artifactsToApply.length} artifacts successfully`);
    } catch (error) {
      console.error('[ChatMessage] Failed to apply all artifacts:', error);
    } finally {
      setIsApplyingAll(false);
    }
  };
  
  const handleViewInArtifacts = (artifact: Artifact) => {
    console.log('[ChatMessage] Opening artifact in viewer:', artifact.id);
    
    // No conversion needed anymore - Artifact is unified!
    addArtifact(artifact);
    setActiveArtifact(artifact.id);
    setShowArtifacts(true);
  };
  
  // message.artifacts is already Artifact[] from the store
  const messageArtifacts = message.artifacts || [];
  
  const isArtifactApplied = (id: string) => appliedArtifacts.has(id);
  
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} mb-4`}>
      {/* Avatar */}
      <div className="flex-shrink-0">
        {isUser ? (
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
        )}
      </div>
      
      {/* Message Content */}
      <div className={`flex-1 ${isUser ? 'flex justify-end' : ''}`}>
        <div className={`max-w-[85%] ${isUser ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-100'} rounded-lg p-4`}>
          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown
              components={{
                code: ({ node, inline, className, children, ...rest }: any) => {
                  const match = /language-(\w+)/.exec(className || '');
                  return !inline && match ? (
                    <SyntaxHighlighter
                      style={vscDarkPlus as any}
                      language={match[1]}
                      PreTag="div"
                      {...rest}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={className} {...rest}>
                      {children}
                    </code>
                  );
                },
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="list-disc pl-5 mb-2">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-5 mb-2">{children}</ol>,
                li: ({ children }) => <li className="mb-1">{children}</li>,
                h1: ({ children }) => <h1 className="text-xl font-bold mb-2">{children}</h1>,
                h2: ({ children }) => <h2 className="text-lg font-bold mb-2">{children}</h2>,
                h3: ({ children }) => <h3 className="text-base font-bold mb-1">{children}</h3>,
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
          
          {/* Artifacts Section */}
          {messageArtifacts.length > 0 && (
            <div className="mt-4 space-y-2 border-t border-gray-700 pt-3">
              <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                <FileCode className="w-4 h-4" />
                <span>{messageArtifacts.length} file{messageArtifacts.length !== 1 ? 's' : ''} modified</span>
              </div>
              
              {messageArtifacts.map((artifact) => {
                const isApplied = isArtifactApplied(artifact.id);
                const isPrimary = artifact.changeType === 'primary';
                
                return (
                  <div
                    key={artifact.id}
                    className={`
                      p-3 rounded-lg border transition-colors
                      ${isPrimary 
                        ? 'bg-blue-900/20 border-blue-700' 
                        : 'bg-gray-800/50 border-gray-700'
                      }
                    `}
                  >
                    <div className="flex items-start justify-between gap-3">
                      {/* File Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <FileCode className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="text-sm font-mono text-gray-300 truncate">
                            {artifact.path || 'Untitled'}
                          </span>
                          {isPrimary && (
                            <span className="px-2 py-0.5 text-xs bg-blue-700 text-blue-100 rounded">
                              Primary Fix
                            </span>
                          )}
                          {artifact.changeType && !isPrimary && (
                            <span className="px-2 py-0.5 text-xs bg-gray-700 text-gray-300 rounded capitalize">
                              {artifact.changeType}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {artifact.language || 'unknown'} • {artifact.content.split('\n').length} lines
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleViewInArtifacts(artifact)}
                          className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
                        >
                          View
                        </button>
                        
                        {isApplied ? (
                          <>
                            <span className="text-xs text-green-400 flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              Applied
                            </span>
                            <button
                              onClick={() => handleUndoArtifact(artifact)}
                              className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
                            >
                              Undo
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleApplyArtifact(artifact)}
                            className="px-3 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition-colors flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" />
                            Apply
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {/* Apply All Button - FIXED with batch write */}
              {messageArtifacts.length > 1 && messageArtifacts.some(a => a?.changeType) && (
                <button
                  onClick={handleApplyAll}
                  disabled={isApplyingAll || messageArtifacts.every(a => isArtifactApplied(a.id))}
                  className="w-full mt-2 px-4 py-2 text-sm bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded transition-colors flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  {isApplyingAll 
                    ? 'Applying...' 
                    : `Apply All ${messageArtifacts.filter(a => a?.changeType && !isArtifactApplied(a.id)).length} Files`
                  }
                </button>
              )}
            </div>
          )}
          
          {/* Timestamp */}
          <div className="mt-2 text-xs text-gray-500">
            {new Date(message.timestamp).toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
