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
        type: 'file_system',
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
        type: 'git',
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
        return 'bg-red-900/50 text-red-300 border-red-700';
      case 'import':
        return 'bg-yellow-900/50 text-yellow-300 border-yellow-700';
      case 'type':
        return 'bg-purple-900/50 text-purple-300 border-purple-700';
      case 'cascade':
        return 'bg-blue-900/50 text-blue-300 border-blue-700';
      default:
        return 'bg-gray-900/50 text-gray-300 border-gray-700';
    }
  };
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[80%]`}>
        <div className={`rounded-lg px-4 py-2 ${
          isUser 
            ? 'bg-blue-600 text-white' 
            : isSystem
            ? 'bg-yellow-900/20 text-yellow-200 border border-yellow-700/50'
            : 'bg-gray-800 text-gray-100'
        }`}>
          <ReactMarkdown
            components={{
              code(props) {
                const {node, className, children} = props;
                const inline = !!(props as any).inline;
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <SyntaxHighlighter
                    style={vscDarkPlus as any}
                    language={match[1]}
                    PreTag="div"
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code className="bg-gray-900 px-1 rounded">
                    {children}
                  </code>
                );
              }
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
        
        {message.artifacts && message.artifacts.length > 0 && (
          <div className="mt-3 bg-gray-900/50 rounded-lg border border-gray-700 p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-semibold text-blue-300">
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
