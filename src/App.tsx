// src/App.tsx
import React from 'react';
import { Header } from './components/Header';
import { ChatContainer } from './components/ChatContainer';
import { ArtifactPanel } from './components/ArtifactPanel';
import { FileBrowser } from './components/FileBrowser';
import { useAppState } from './hooks/useAppState';
import { useWebSocketMessageHandler } from './hooks/useWebSocketMessageHandler';
import './App.css';

function App() {
  const { showArtifacts, showFileExplorer } = useAppState();
  
  // Handle all WebSocket messages globally
  useWebSocketMessageHandler();

  return (
    <div className="h-screen flex flex-col bg-slate-900 text-slate-100">
      {/* Header with project controls */}
      <Header />
      
      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* File Explorer - left panel (when toggled) */}
        {showFileExplorer && (
          <div className="w-80 border-r border-gray-700 bg-gray-900">
            <FileBrowser />
          </div>
        )}
        
        {/* Chat column - center, always visible */}
        <div className="flex-1 flex">
          <ChatContainer />
          
          {/* Artifacts panel - right side (when artifacts exist) */}
          {showArtifacts && <ArtifactPanel />}
        </div>
      </div>
    </div>
  );
}

export default App;
