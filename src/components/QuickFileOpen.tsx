// src/components/QuickFileOpen.tsx
import React from 'react';
import { Command } from 'lucide-react';

export const QuickFileOpen: React.FC = () => {
  const handleClick = () => {
    // TODO: Implement quick file open dialog (Cmd+P)
    console.log('Quick file open - TODO');
  };

  return (
    <button
      onClick={handleClick}
      className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
      title="Quick Open (Cmd+P)"
    >
      <Command size={16} />
    </button>
  );
};
