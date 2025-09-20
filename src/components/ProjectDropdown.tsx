// src/components/ProjectDropdown.tsx
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus, Folder, GitBranch } from 'lucide-react';
import { useAppState } from '../hooks/useAppState';
import { useWebSocket } from '../hooks/useWebSocket';
import { useBackendCommands } from '../services/BackendCommands';

export const ProjectDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { currentProject, projects, setCurrentProject } = useAppState();
  const { send } = useWebSocket();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowNewProject(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleProjectSelect = async (project: any) => {
    setCurrentProject(project);
    setIsOpen(false);
    
    // Tell backend about project change
    await send({
      type: 'project_command',
      method: 'project.set_active',
      params: { project_id: project.id }
    });
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    
    try {
      await send({
        type: 'project_command',
        method: 'project.create',
        params: { 
          name: newProjectName.trim(),
          description: `Created on ${new Date().toLocaleDateString()}`
        }
      });
      
      setNewProjectName('');
      setShowNewProject(false);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateProject();
    } else if (e.key === 'Escape') {
      setShowNewProject(false);
      setNewProjectName('');
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button - styled like Claude's model selector */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        <Folder size={16} />
        <span className="max-w-[150px] truncate">
          {currentProject?.name || 'No Project'}
        </span>
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
          <div className="p-2">
            {/* Current project indicator */}
            {currentProject && (
              <div className="px-3 py-2 mb-2 bg-blue-50 dark:bg-blue-900/30 rounded-md">
                <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                  <Folder size={14} />
                  <span className="font-medium">{currentProject.name}</span>
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  Current project
                </div>
              </div>
            )}

            {/* Project list */}
            <div className="max-h-48 overflow-y-auto">
              {projects.length === 0 && !showNewProject && (
                <div className="px-3 py-4 text-sm text-gray-500 text-center">
                  No projects yet
                </div>
              )}
              
              {projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => handleProjectSelect(project)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left hover:bg-gray-100 dark:hover:bg-gray-700 ${
                    currentProject?.id === project.id 
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <Folder size={16} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{project.name}</div>
                    {project.description && (
                      <div className="text-xs text-gray-500 truncate">
                        {project.description}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* New project input */}
            {showNewProject ? (
              <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Project name..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleCreateProject}
                    disabled={!newProjectName.trim()}
                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => setShowNewProject(false)}
                    className="px-3 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              /* Create new project button */
              <button
                onClick={() => setShowNewProject(true)}
                className="w-full flex items-center gap-2 px-3 py-2 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              >
                <Plus size={16} />
                <span>New Project</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
