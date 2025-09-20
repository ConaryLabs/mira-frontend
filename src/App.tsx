// src/App.tsx
import React from 'react';
import { Header } from './components/Header';
import { ChatContainer } from './components/ChatContainer';
import { ArtifactPanel } from './components/ArtifactPanel';
import { useAppState } from './hooks/useAppState';
import { useWebSocketMessageHandler } from './hooks/useWebSocketMessageHandler';
import './App.css';

function App() {
  const { showArtifacts } = useAppState();
  
  // Handle all WebSocket messages globally
  useWebSocketMessageHandler();

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-900">
      {/* Claude-style header */}
      <Header />
      
      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat column - always visible, Claude-style max width */}
        <ChatContainer />
        
        {/* Artifacts panel - slides in when needed */}
        {showArtifacts && <ArtifactPanel />}
      </div>
    </div>
  );
}

export default App;
