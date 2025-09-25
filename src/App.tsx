// src/App.tsx
import React, { useEffect } from 'react';
import { Header } from './components/Header';
import { ChatContainer } from './components/ChatContainer';
import { ArtifactPanel } from './components/ArtifactPanel';
import { QuickFileOpen, useQuickFileOpen } from './components/QuickFileOpen';
import { useAppState } from './hooks/useAppState';
import { useWebSocketStore } from './stores/useWebSocketStore';
import { useWebSocketMessageHandler } from './hooks/useWebSocketMessageHandler';
import './App.css';

function App() {
  const { showArtifacts } = useAppState();
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
  useWebSocketMessageHandler();
  
  // Quick file open handler
  const quickFileOpen = useQuickFileOpen();
  
  return (
    <div className="h-screen flex flex-col bg-slate-900 text-slate-100">
      <Header onQuickFileOpen={quickFileOpen.open} />
      
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex">
          <ChatContainer />
          {showArtifacts && <ArtifactPanel />}
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
