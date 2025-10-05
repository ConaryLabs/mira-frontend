// src/components/ConnectionBanner.tsx
import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { useWebSocketStore } from '../stores/useWebSocketStore';

export const ConnectionBanner: React.FC = () => {
  const connectionState = useWebSocketStore(state => state.connectionState);

  if (connectionState === 'connected') return null;

  return (
    <div className={`
      flex items-center gap-2 px-4 py-2 text-sm font-medium
      ${connectionState === 'connecting' 
        ? 'bg-yellow-500/10 text-yellow-400' 
        : 'bg-red-500/10 text-red-400'}
    `}>
      {connectionState === 'connecting' ? (
        <>
          <Wifi className="w-4 h-4 animate-pulse" />
          <span>Connecting to Mira...</span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4" />
          <span>Disconnected from Mira</span>
        </>
      )}
    </div>
  );
};
