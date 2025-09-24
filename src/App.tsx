// src/App.tsx

import React from 'react';
import { Header } from './components/Header';
import { ChatContainer } from './components/ChatContainer';
import { ArtifactPanel } from './components/ArtifactPanel';
import { QuickFileOpen, useQuickFileOpen } from './components/QuickFileOpen';
import { useAppState } from './hooks/useAppState';
import { useWebSocketMessageHandler } from './hooks/useWebSocketMessageHandler';
import './App.css';

function App() {
  const { showArtifacts } = useAppState();
  
  // Handle all WebSocket messages globally
  useWebSocketMessageHandler();
  
  // Global Cmd+P handler for quick file open
  const quickFileOpen = useQuickFileOpen();

  return (
    <div className="h-screen flex flex-col bg-slate-900 text-slate-100">
      {/* Header with project controls - pass the quickFileOpen function */}
      <Header onQuickFileOpen={quickFileOpen.open} />
      
      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat column - center, always visible */}
        <div className="flex-1 flex">
          <ChatContainer />
          
          {/* Artifacts panel - right side (when artifacts exist) */}
          {showArtifacts && <ArtifactPanel />}
        </div>
      </div>

      {/* Global QuickFileOpen modal (Cmd+P) */}
      <QuickFileOpen
        isOpen={quickFileOpen.isOpen}
        onClose={quickFileOpen.close}
      />
    </div>
  );
}

export default App;
