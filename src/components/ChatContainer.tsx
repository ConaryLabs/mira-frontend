// src/components/ChatContainer.tsx

import React, { useState, useEffect } from 'react';
import { useChatState } from '../hooks/useChatState';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { User, Bot, Moon, Sun, AlertCircle } from 'lucide-react';

export const ChatContainer: React.FC = () => {
  console.log('ChatContainer rendering...');
  
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  const chatState = useChatState();
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // Apply theme
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatState.messages]);

  // Tool handler (placeholder for now)
  const handleToolInvoke = (toolType: string, payload: any) => {
    console.log('Tool invoked:', toolType, payload);
    // TODO: Implement tool handling
    // For now, just send as a regular message
    if (toolType === 'web_search') {
      chatState.handleSendMessage(`Search the web for: ${payload.query}`);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Mira</h1>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                {chatState.isConnected ? (
                  <>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Connected</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                    <span>Connecting...</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <button
            onClick={() => setIsDark(!isDark)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {isDark ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-gray-600" />}
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          {chatState.messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="w-20 h-20 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center mb-6">
                <Bot className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                Welcome to Mira
              </h2>
              <p className="text-gray-600 dark:text-gray-400 max-w-md">
                I'm your AI assistant. Ask me anything or just say hello to get started!
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {/* Messages - newest first, then reversed for display */}
              {[...chatState.messages].reverse().map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isDark={isDark}
                  onArtifactClick={() => {}}
                />
              ))}
              
              {/* Thinking indicator */}
              {chatState.isThinking && (
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 shadow-sm">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Status/Error Messages */}
      {chatState.statusMessage && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border-t border-blue-200 dark:border-blue-800 px-4 py-2">
          <div className="max-w-5xl mx-auto text-sm text-blue-600 dark:text-blue-400">
            {chatState.statusMessage}
          </div>
        </div>
      )}
      
      {chatState.connectionError && (
        <div className="bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800 px-4 py-2">
          <div className="max-w-5xl mx-auto flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4" />
            {chatState.connectionError}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="max-w-5xl mx-auto p-4">
          <ChatInput
            onSend={chatState.handleSendMessage}
            onToolInvoke={handleToolInvoke}
            disabled={!chatState.isConnected || chatState.isThinking}
            isDark={isDark}
          />
        </div>
      </div>
    </div>
  );
};
