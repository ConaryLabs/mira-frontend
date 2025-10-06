// src/components/ChatMessage.tsx
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
  
  const handleApplyAll = async () => {
    if (!message.artifacts) return;
    
    for (const artifact of message.artifacts) {
      if (!appliedArtifacts.has(artifact.id)) {
        await handleApplyArtifact(artifact);
      }
    }
  };
  
  const handleViewInArtifacts = (artifact: Artifact) => {
    console.log('[ChatMessage] Opening artifact in viewer:', artifact.id);
    
    const ext = artifact.path?.split('.').pop()?.toLowerCase();
    let type: 'application/javascript' | 'application/typescript' | 'text/html' | 'text/css' | 'application/json' | 'text/python' | 'text/rust' | 'text/plain' | 'text/markdown';
    let language: string;
    
    switch (ext) {
      case 'rs': type = 'text/rust'; language = 'rust'; break;
      case 'ts': case 'tsx': type = 'application/typescript'; language = 'typescript'; break;
      case 'js': case 'jsx': type = 'application/javascript'; language = 'javascript'; break;
      case 'py': type = 'text/python'; language = 'python'; break;
      case 'html': type = 'text/html'; language = 'html'; break;
      case 'css': type = 'text/css'; language = 'css'; break;
      case 'json': type = 'application/json'; language = 'json'; break;
      case 'md': type = 'text/markdown'; language = 'markdown'; break;
      default: type = 'text/plain'; language = 'plaintext';
    }
    
    const fullArtifact = {
      id: artifact.id,
      title: artifact.path?.split('/').pop() || 'Unknown File',
      content: artifact.content,
      type,
      language,
      linkedFile: artifact.path,
      created: Date.now(),
      modified: Date.now(),
    };
    
    addArtifact(fullArtifact);
    setActiveArtifact(artifact.id);
    setShowArtifacts(true);
  };
  
  const getChangeTypeBadge = (changeType?: string) => {
    switch (changeType) {
      case 'primary': return 'bg-red-900 text-red-300 border-red-700';
      case 'import': return 'bg-yellow-900 text-yellow-300 border-yellow-700';
      case 'type': return 'bg-purple-900 text-purple-300 border-purple-700';
      case 'cascade': return 'bg-blue-900 text-blue-300 border-blue-700';
      default: return 'bg-gray-700 text-gray-300 border-gray-600';
    }
  };
  
  // USER MESSAGE STYLE - Compact box on the right like Claude.ai
  if (isUser) {
    return (
      <div className="flex justify-end mb-6">
        <div className="max-w-[80%] bg-slate-700/40 rounded-2xl px-5 py-3 border border-slate-600/50">
          <div className="flex items-start gap-3">
            <div className="flex-1 text-slate-100 whitespace-pre-wrap break-words">
              {message.content}
            </div>
            <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <User size={14} className="text-white" />
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // SYSTEM MESSAGE STYLE
  if (isSystem) {
    return (
      <div className="mb-4">
        <div className="bg-yellow-900/20 border border-yellow-800/50 rounded-lg p-3 text-sm text-yellow-300 italic">
          {message.content}
        </div>
      </div>
    );
  }
  
  // ASSISTANT MESSAGE STYLE - Full width, open layout like Claude.ai
  return (
    <div className="mb-6">
      <div className="flex items-start gap-3">
        {/* Mira Avatar */}
        <div className="w-7 h-7 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
          <Bot size={14} className="text-white" />
        </div>
        
        {/* Message Content */}
        <div className="flex-1 min-w-0">
          <div className="prose prose-invert prose-slate max-w-none">
            <ReactMarkdown
              components={{
                code(props) {
                  const {children, className, ...rest} = props;
                  const match = /language-(\w+)/.exec(className || '');
                  const inline = !match;
                  
                  return !inline ? (
                    <div className="my-4 rounded-lg overflow-hidden border border-slate-700">
                      <SyntaxHighlighter
                        style={vscDarkPlus as any}
                        language={match[1]}
                        PreTag="div"
                        customStyle={{
                          margin: 0,
                          background: 'rgb(15 23 42)',
                          fontSize: '0.875rem',
                          padding: '1rem',
                        }}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    </div>
                  ) : (
                    <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm text-pink-400" {...rest}>
                      {children}
                    </code>
                  );
                },
                p: ({children}) => <p className="mb-4 last:mb-0 text-slate-200 leading-relaxed">{children}</p>,
                ul: ({children}) => <ul className="mb-4 space-y-1 text-slate-200">{children}</ul>,
                ol: ({children}) => <ol className="mb-4 space-y-1 text-slate-200">{children}</ol>,
                li: ({children}) => <li className="ml-4">{children}</li>,
                blockquote: ({children}) => (
                  <blockquote className="border-l-4 border-slate-600 pl-4 my-4 text-slate-400 italic">
                    {children}
                  </blockquote>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
          
          {/* Artifacts Section - Claude.ai style */}
          {message.artifacts && message.artifacts.length > 0 && (
            <div className="mt-4 space-y-2">
              {message.artifacts.map((artifact) => {
                const isApplied = appliedArtifacts.has(artifact.id);
                
                return (
                  <div
                    key={artifact.id}
                    onClick={() => handleViewInArtifacts(artifact)}
                    className="group cursor-pointer bg-slate-800/40 hover:bg-slate-800/60 border border-slate-700 hover:border-slate-600 rounded-lg p-3 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-blue-600/20 border border-blue-600/50 rounded flex items-center justify-center flex-shrink-0">
                        <FileCode className="w-4 h-4 text-blue-400" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm text-slate-200 truncate">
                            {artifact.path}
                          </span>
                          {artifact.changeType && (
                            <span className={`text-xs px-2 py-0.5 rounded border flex-shrink-0 ${getChangeTypeBadge(artifact.changeType)}`}>
                              {artifact.changeType}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">
                          Click to view in Artifact Viewer
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        {isApplied ? (
                          <>
                            <button
                              onClick={() => handleUndoArtifact(artifact)}
                              className="text-xs px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-md transition-colors"
                            >
                              Undo
                            </button>
                            <Check className="w-4 h-4 text-green-400" />
                          </>
                        ) : (
                          <button
                            onClick={() => handleApplyArtifact(artifact)}
                            className="text-xs px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
                          >
                            Apply
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {message.artifacts.length > 1 && (
                <button
                  onClick={handleApplyAll}
                  className="w-full mt-2 text-sm px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Apply All {message.artifacts.length} Files
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
