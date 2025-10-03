// src/App.tsx
import React, { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { ChatContainer } from './components/ChatContainer';
import { ArtifactPanel } from './components/ArtifactPanel';
import { QuickFileOpen, useQuickFileOpen } from './components/QuickFileOpen';
import { DocumentsView } from './components/documents';
import { useAppState } from './stores/useAppState';
import { useWebSocketStore } from './stores/useWebSocketStore';
import { useWebSocketMessageHandler } from './hooks/useWebSocketMessageHandler';
import { useMessageHandler } from './hooks/useMessageHandler';
import { MessageSquare, FileText } from 'lucide-react';
import './App.css';

type Tab = 'chat' | 'documents';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('chat');
  const { showArtifacts, currentProject } = useAppState();
  const connect = useWebSocketStore(state => state.connect);
  const disconnect = useWebSocketStore(state => state.disconnect);
  
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
      
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex">
          {/* Tab Content */}
          {activeTab === 'chat' && <ChatContainer />}
          
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
          
          {/* Artifact Panel - only show on chat tab */}
          {activeTab === 'chat' && showArtifacts && <ArtifactPanel />}
        </div>
      </div>
      
      <QuickFileOpen
        isOpen={quickFileOpen.isOpen}
        onClose={quickFileOpen.close}
      />
    </div>
  );
}

export default App;
