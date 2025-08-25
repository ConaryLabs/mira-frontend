// src/components/ChatContainer.tsx
// PHASE 2: Refactored ChatContainer - Main orchestration component (~150 lines)
// Responsibilities: Layout, component coordination, WebSocket connection
// State management extracted to custom hooks

import React from 'react';
import { useTheme } from '../hooks/useTheme';
import { useChatState } from '../hooks/useChatState';
import { useProjectManagement } from '../hooks/useProjectManagement';
import { useFileContext } from '../hooks/useFileContext';
import { useToolHandlers } from '../hooks/useToolHandlers';
import { ChatHeader } from './chat/ChatHeader';
import { ChatMessages } from './chat/ChatMessages';
import { ChatInput } from './ChatInput';
import ProjectSidebar from './ProjectSidebar';
import ArtifactViewer from './ArtifactViewer';

export const ChatContainer: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();
  
  // Extract all state management to custom hooks
  const chatState = useChatState();
  const projectState = useProjectManagement();
  const fileState = useFileContext();
  
  // Tool handlers need the chat send function
  const toolState = useToolHandlers(
    chatState.send, 
    chatState.sessionId, 
    projectState.currentProjectId,
    chatState.addUserMessage
  );

  // UI state (keep minimal local state)
  const [showSidebar, setShowSidebar] = React.useState(false);

  // Auto-load artifacts when project changes
  React.useEffect(() => {
    if (projectState.currentProjectId) {
      fileState.loadArtifacts(projectState.currentProjectId);
    } else {
      fileState.clearArtifacts();
    }
  }, [projectState.currentProjectId, fileState.loadArtifacts, fileState.clearArtifacts]);

  // Load initial chat history
  React.useEffect(() => {
    chatState.loadChatHistory();
  }, [chatState.loadChatHistory]);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Sidebar */}
      {showSidebar && (
        <div className="w-80 border-r border-gray-200 dark:border-gray-700 flex-shrink-0">
          <ProjectSidebar
            projects={projectState.projects}
            currentProjectId={projectState.currentProjectId}
            onProjectSelect={projectState.handleProjectSelect}
            onProjectCreate={projectState.handleProjectCreate}
            onClose={() => setShowSidebar(false)}
            isDark={isDark}
            isOpen={showSidebar}
          />
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative">
        {/* Header */}
        <ChatHeader
          isDark={isDark}
          isConnected={chatState.isConnected}
          toolsActive={toolState.toolsActive}
          statusMessage={chatState.statusMessage}
          currentProject={projectState.projects.find(p => p.id === projectState.currentProjectId)}
          artifactCount={fileState.artifactCount}
          showArtifacts={fileState.showArtifacts}
          onToggleSidebar={() => setShowSidebar(!showSidebar)}
          onToggleTheme={toggleTheme}
          onToggleArtifacts={() => fileState.setShowArtifacts(!fileState.showArtifacts)}
        />

        {/* Messages */}
        <ChatMessages
          messages={chatState.messages}
          isThinking={chatState.isThinking}
          isLoadingHistory={chatState.isLoadingHistory}
          isLoadingMore={chatState.isLoadingMore}
          hasMoreHistory={chatState.hasMoreHistory}
          isDark={isDark}
          onLoadMore={() => chatState.loadChatHistory(chatState.historyOffset)}
          onArtifactClick={fileState.handleArtifactClick}
        />

        {/* Connection error */}
        {chatState.connectionError && (
          <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-20">
            {chatState.connectionError}
          </div>
        )}

        {/* Chat Input */}
        <div className="border-t border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <ChatInput
            onSend={chatState.handleSendMessage}
            onToolInvoke={toolState.handleToolInvoke}
            disabled={!chatState.isConnected || chatState.isThinking}
            isDark={isDark}
            featureFlags={toolState.featureFlags}
          />
        </div>
      </div>

      {/* Artifact viewer overlay */}
      {fileState.showArtifacts && projectState.currentProjectId && (
        <ArtifactViewer
          onClose={() => fileState.setShowArtifacts(false)}
          selectedArtifactId={fileState.selectedArtifactId || undefined}
          recentArtifacts={fileState.sessionArtifacts}
          projectId={projectState.currentProjectId}
          isDark={isDark}
        />
      )}
    </div>
  );
};
