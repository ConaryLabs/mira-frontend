// src/components/ChatContainer.tsx
import React, { useState, useRef, useEffect } from 'react';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAppState } from '../hooks/useAppState';
import type { Message } from '../types/messages';

export const ChatContainer: React.FC = () => {
  // Messages persist across EVERYTHING - never reset
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { currentProject } = useAppState();
  const { send, lastMessage, connectionState } = useWebSocket();
  const commands = useBackendCommands();

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle incoming messages
  useEffect(() => {
    if (lastMessage) {
      handleIncomingMessage(lastMessage);
    }
  }, [lastMessage]);

  const handleIncomingMessage = (message: any) => {
    // Handle different message types from backend
    switch (message.type) {
      case 'chunk':
        // Streaming chat response
        setMessages(prev => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg && lastMsg.role === 'assistant' && lastMsg.streaming) {
            return [
              ...prev.slice(0, -1),
              { ...lastMsg, content: lastMsg.content + message.content }
            ];
          } else {
            return [...prev, {
              id: message.id || `msg-${Date.now()}`,
              role: 'assistant',
              content: message.content,
              streaming: true,
              timestamp: Date.now()
            }];
          }
        });
        break;
        
      case 'complete':
        // Complete message
        setMessages(prev => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg && lastMsg.streaming) {
            return [
              ...prev.slice(0, -1),
              { 
                ...lastMsg, 
                content: message.content || lastMsg.content, 
                streaming: false,
                mood: message.mood,
                artifacts: message.artifacts,
                toolResults: message.tool_results
              }
            ];
          } else {
            return [...prev, {
              id: message.id || `msg-${Date.now()}`,
              role: 'assistant',
              content: message.content,
              streaming: false,
              timestamp: Date.now(),
              mood: message.mood,
              artifacts: message.artifacts,
              toolResults: message.tool_results
            }];
          }
        });
        setIsStreaming(false);
        break;
        
      case 'status':
        // System status messages
        setMessages(prev => [...prev, {
          id: `status-${Date.now()}`,
          role: 'system',
          content: message.message,
          timestamp: Date.now()
        }]);
        break;
        
      case 'data':
        // Handle data responses (project lists, git status, etc.)
        handleDataResponse(message.data);
        break;
    }
  };

  const handleDataResponse = (data: any) => {
    switch (data.type) {
      case 'project_list':
        // Update project list in state
        console.log('Projects loaded:', data.projects);
        break;
        
      case 'git_status':
        // Update git status
        console.log('Git status:', data);
        break;
        
      case 'repository_imported':
        // Show success message
        setMessages(prev => [...prev, {
          id: `sys-${Date.now()}`,
          role: 'system',
          content: `Repository imported successfully! Analyzed ${data.files_analyzed} files.`,
          timestamp: Date.now()
        }]);
        break;
        
      case 'search_results':
        // Display search results as tool result
        setMessages(prev => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg && lastMsg.role === 'assistant') {
            return [
              ...prev.slice(0, -1),
              {
                ...lastMsg,
                toolResults: [...(lastMsg.toolResults || []), {
                  id: `search-${Date.now()}`,
                  type: 'code_search',
                  status: 'success',
                  data: data.results,
                  timestamp: Date.now()
                }]
              }
            ];
          }
          return prev;
        });
        break;
    }
  };

  const handleSend = async (content: string) => {
    // Add user message immediately
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsStreaming(true);

    // Check if this looks like a natural language command
    try {
      await commands.handleNaturalLanguageCommand(content, currentProject?.id);
    } catch (error) {
      console.error('Command failed:', error);
      setIsStreaming(false);
    }
  };

  const addSystemMessage = (content: string) => {
    setMessages(prev => [...prev, {
      id: `sys-${Date.now()}`,
      role: 'system',
      content,
      timestamp: Date.now()
    }]);
  };

  // When project changes, add context but DON'T clear messages
  useEffect(() => {
    if (currentProject) {
      addSystemMessage(`Now working in project: ${currentProject.name}`);
    }
  }, [currentProject?.id]);

  return (
    <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full">
      {/* Connection status */}
      {connectionState !== 'connected' && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800 px-4 py-2 text-sm text-yellow-800 dark:text-yellow-200">
          {connectionState === 'connecting' ? 'Connecting...' : 'Disconnected'}
        </div>
      )}
      
      {/* Messages area - Claude-style scrolling */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <MessageList messages={messages} />
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input area - pinned to bottom like Claude */}
      <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-4">
        <ChatInput 
          onSend={handleSend} 
          disabled={connectionState !== 'connected' || isStreaming}
          placeholder={
            currentProject 
              ? `Message Mira about ${currentProject.name}...`
              : "Message Mira..."
          }
        />
      </div>
    </div>
  );
};
