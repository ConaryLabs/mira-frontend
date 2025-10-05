// src/components/ChatContainer.tsx - PERFORMANCE FIX

import React, { useState, useRef, useEffect } from 'react';
import { useChatStore } from '../stores/useChatStore';
import { useWebSocketStore } from '../stores/useWebSocketStore';
import { useAppState } from '../stores/useAppState';
import { useChatPersistence } from '../hooks/useChatPersistence';
import { useChatMessaging } from '../hooks/useChatMessaging';
import { ChatMessage } from './ChatMessage';
import { Send, AlertCircle, WifiOff, Wifi } from 'lucide-react';

export const ChatContainer: React.FC = () => {
  const { messages, addMessage, setMessages } = useChatStore();
  const { connectionState, subscribe } = useWebSocketStore();
  const { currentProject, showArtifacts } = useAppState();
  const [input, setInput] = useState('');
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  useChatPersistence(connectionState);
  const { handleSend: sendWithContext } = useChatMessaging();
  
  // PERFORMANCE FIX: Filter subscription to only 'response' and 'error' types
  useEffect(() => {
    const unsubscribe = subscribe(
      'chat-container', 
      (message) => {
        if (message.type === 'response' || message.type === 'error') {
          setIsWaitingForResponse(false);
        }
      },
      ['response', 'error'] // NEW: Only listen to these message types
    );
    return unsubscribe;
  }, [subscribe]);
  
  // PERFORMANCE FIX: Changed 'smooth' to 'auto' for instant scroll
  // This prevents animation thrashing during rapid updates/streaming
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [messages, isWaitingForResponse]);
  
  const handleSend = async () => {
    if (!input.trim() || connectionState !== 'connected') return;
    
    const userMessage = input.trim();
    setInput('');
    
    await sendWithContext(userMessage, setIsWaitingForResponse);
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* Connection Status Banner */}
      {connectionState !== 'connected' && (
        <div className={`
          px-4 py-2 text-sm flex items-center gap-2
          ${connectionState === 'connecting' ? 'bg-yellow-500/10 text-yellow-400' : ''}
          ${connectionState === 'disconnected' ? 'bg-red-500/10 text-red-400' : ''}
          ${connectionState === 'error' ? 'bg-red-500/10 text-red-400' : ''}
        `}>
          {connectionState === 'connecting' && (
            <>
              <Wifi className="w-4 h-4 animate-pulse" />
              <span>Connecting to Mira...</span>
            </>
          )}
          {(connectionState === 'disconnected' || connectionState === 'error') && (
            <>
              <WifiOff className="w-4 h-4" />
              <span>Disconnected from Mira</span>
            </>
          )}
        </div>
      )}
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-400">
            <div className="text-center">
              <p className="text-lg mb-2">No messages yet</p>
              <p className="text-sm">Start a conversation with Mira</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            {isWaitingForResponse && (
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span>Mira is thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
      
      {/* Input Area */}
      <div className="border-t border-slate-700 p-4">
        {!currentProject ? (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-yellow-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>Select a project to start chatting</span>
          </div>
        ) : (
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Message Mira..."
              disabled={connectionState !== 'connected'}
              className="flex-1 bg-slate-800 text-slate-100 rounded-lg px-4 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              rows={1}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || connectionState !== 'connected'}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
