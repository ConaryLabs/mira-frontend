// src/components/ChatMessage.tsx

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ChatMessage as ChatMessageType, Artifact } from '../stores/useChatStore';
import { useWebSocketStore } from '../stores/useWebSocketStore';
import { useAppState } from '../hooks/useAppState';
import { Check, ChevronDown, ChevronRight, FileCode, AlertCircle } from 'lucide-react';

interface ChatMessageProps {
  message: ChatMessageType;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const [expandedArtifacts, setExpandedArtifacts] = useState<Set<string>>(new Set());
  const [appliedArtifacts, setAppliedArtifacts] = useState<Set<string>>(new Set());
  const { send } = useWebSocketStore();
  const { currentProject } = useAppState();
  
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
  
  const toggleArtifact = (artifactId: string) => {
    setExpandedArtifacts(prev => {
      const next = new Set(prev);
      if (next.has(artifactId)) {
        next.delete(artifactId);
      } else {
        next.add(artifactId);
      }
      return next;
    });
  };
  
  const getChangeTypeBadge = (changeType?: string) => {
    switch (changeType) {
      case 'primary':
        return 'bg-red-900 text-red-300 border-red-700';
      case 'import':
        return 'bg-yellow-900 text-yellow-300 border-yellow-700';
      case 'type':
        return 'bg-purple-900 text-purple-300 border-purple-700';
      case 'cascade':
        return 'bg-blue-900 text-blue-300 border-blue-700';
      default:
        return 'bg-gray-700 text-gray-300 border-gray-600';
    }
  };
  
  return (
    <div className={`mb-4 ${isUser ? 'ml-8' : 'mr-8'}`}>
      <div className={`rounded-lg p-4 ${
        isUser 
          ? 'bg-blue-900/20 border border-blue-800/50' 
          : isSystem
          ? 'bg-yellow-900/20 border border-yellow-800/50'
          : 'bg-gray-800/50 border border-gray-700/50'
      }`}>
        <div className="text-xs text-gray-500 mb-2">
          {message.role === 'user' ? 'You' : message.role === 'system' ? 'System' : 'Mira'}
        </div>
        
        <div className="prose prose-invert max-w-none">
          <ReactMarkdown
            components={{
              code(props) {
                const {children, className, ...rest} = props;
                const match = /language-(\w+)/.exec(className || '');
                const inline = !match;
                
                return !inline ? (
                  <SyntaxHighlighter
                    style={vscDarkPlus as any}
                    language={match[1]}
                    PreTag="div"
                    customStyle={{
                      margin: 0,
                      background: 'rgb(31 41 55)',
                      fontSize: '0.875rem',
                    }}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code className={className} {...rest}>
                    {children}
                  </code>
                );
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
        
        {/* Artifact Display for Error Fixes */}
        {message.artifacts && message.artifacts.length > 0 && (
          <div className="mt-4 p-3 bg-blue-900/20 rounded-lg border border-blue-800/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-blue-300">
                  {message.artifacts.length} file{message.artifacts.length > 1 ? 's' : ''} to fix
                </span>
              </div>
              {message.artifacts.length > 1 && (
                <button
                  onClick={handleApplyAll}
                  className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                >
                  Apply All Fixes
                </button>
              )}
            </div>
            
            {message.artifacts.map(artifact => {
              const isExpanded = expandedArtifacts.has(artifact.id);
              const isApplied = appliedArtifacts.has(artifact.id);
              
              return (
                <div key={artifact.id} className="mb-2 last:mb-0">
                  <div className="bg-gray-800 rounded">
                    <div className="flex items-center justify-between p-2 hover:bg-gray-700/50 transition-colors">
                      <button
                        onClick={() => toggleArtifact(artifact.id)}
                        className="flex items-center gap-2 flex-1 text-left"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        )}
                        <FileCode className="w-4 h-4 text-gray-400" />
                        <span className="font-mono text-sm text-gray-200">
                          {artifact.path}
                        </span>
                        {artifact.changeType && (
                          <span className={`text-xs px-2 py-0.5 rounded border ${getChangeTypeBadge(artifact.changeType)}`}>
                            {artifact.changeType}
                          </span>
                        )}
                      </button>
                      
                      <div className="flex items-center gap-2">
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
                            Apply Fix
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div className="border-t border-gray-700 p-2 max-h-96 overflow-y-auto">
                        <SyntaxHighlighter
                          style={vscDarkPlus as any}
                          language={artifact.language || 'text'}
                          showLineNumbers
                          customStyle={{
                            margin: 0,
                            fontSize: '0.875rem',
                            background: 'transparent',
                          }}
                        >
                          {artifact.content}
                        </SyntaxHighlighter>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        <div className="text-xs text-gray-500 mt-1">
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
