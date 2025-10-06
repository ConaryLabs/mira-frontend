// src/App.tsx
import React, { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { ChatArea } from './components/ChatArea';
import { ArtifactPanel } from './components/ArtifactPanel';
import { QuickFileOpen, useQuickFileOpen } from './components/QuickFileOpen';
import { DocumentsView } from './components/documents';
import { useAppState } from './stores/useAppState';
import { useWebSocketStore } from './stores/useWebSocketStore';
import { useWebSocketMessageHandler } from './hooks/useWebSocketMessageHandler';
import { useMessageHandler } from './hooks/useMessageHandler';
import { useChatPersistence } from './hooks/useChatPersistence';
import { MessageSquare, FileText } from 'lucide-react';
import './App.css';

type Tab = 'chat' | 'documents';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('chat');
  const { showArtifacts, currentProject } = useAppState();
  const connect = useWebSocketStore(state => state.connect);
  const disconnect = useWebSocketStore(state => state.disconnect);
  const connectionState = useWebSocketStore(state => state.connectionState);
  
  // Initialize WebSocket connection
  useEffect(() => {
    connect();
    
    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);
  
  // Handle all WebSocket messages
  useWebSocketMessageHandler(); // Handles data messages (projects, files, git)
  useMessageHandler();           // Handles response messages (chat)
  useChatPersistence(connectionState); // Handles chat history loading from backend + localStorage
  
  // Quick file open handler
  const quickFileOpen = useQuickFileOpen();
  
  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'chat', label: 'Chat', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'documents', label: 'Documents', icon: <FileText className="w-4 h-4" /> },
  ];
  
  return (
    <div className="h-screen flex flex-col bg-slate-900 text-slate-100">
      <Header onQuickFileOpen={quickFileOpen.open} />
      
      {/* Tab Navigation */}
      <div className="border-b border-gray-800 bg-gray-900">
        <div className="flex items-center gap-1 px-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-3 border-b-2 transition-colors
                ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-400 bg-gray-800'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:bg-gray-800'
                }
              `}
            >
              {tab.icon}
              <span className="text-sm font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
      
      {/* Main content area - Centered chat that slides into 50/50 with artifacts */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'chat' && (
          <>
            {/* Chat Area - Centered when no artifacts, 50% when artifacts shown */}
            <div className={`
              flex overflow-hidden transition-all duration-300
              ${showArtifacts ? 'w-1/2' : 'flex-1'}
            `}>
              <div className={`
                flex flex-col w-full
                ${!showArtifacts ? 'max-w-4xl mx-auto' : ''}
              `}>
                <ChatArea />
              </div>
            </div>
            
            {/* Artifact Panel - Slides in from right */}
            {showArtifacts && (
              <div className="w-1/2 border-l border-slate-700">
                <ArtifactPanel />
              </div>
            )}
          </>
        )}
        
        {activeTab === 'documents' && currentProject && (
          <DocumentsView projectId={currentProject.id} />
        )}
        
        {activeTab === 'documents' && !currentProject && (
          <div className="flex-1 flex items-center justify-center bg-gray-900 text-gray-500">
            <div className="text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-700" />
              <p className="text-lg mb-2">No Project Selected</p>
              <p className="text-sm">Select a project to upload and search documents</p>
            </div>
          </div>
        )}
      </div>
      
      <QuickFileOpen
        isOpen={quickFileOpen.isOpen}
        onClose={quickFileOpen.close}
      />
    </div>
  );
}

export default App;
