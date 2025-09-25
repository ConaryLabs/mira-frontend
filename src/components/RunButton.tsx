// src/components/RunButton.tsx
import React from 'react';
import { Play } from 'lucide-react';
import { useAppState } from '../stores/useAppState';

export const RunButton: React.FC = () => {
  const { currentProject } = useAppState();

  const handleClick = () => {
    if (!currentProject) {
      alert('No project selected');
      return;
    }
    
    // TODO: Implement run functionality
    console.log('Run button clicked - TODO');
  };

  return (
    <button
      onClick={handleClick}
      disabled={!currentProject}
      className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
      title="Run project"
    >
      <Play size={16} />
    </button>
  );
};
