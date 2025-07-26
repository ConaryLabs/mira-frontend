// src/components/ProjectSidebar.tsx
// NEW FILE

import React, { useState, useEffect } from 'react';
import { FolderOpen, Plus, X, ChevronRight, Search } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  artifact_count?: number;
}

interface ProjectSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentProjectId: string | null;
  onProjectSelect: (projectId: string) => void;
  isDark: boolean;
}

export const ProjectSidebar: React.FC<ProjectSidebarProps> = ({
  isOpen,
  onClose,
  currentProjectId,
  onProjectSelect,
  isDark
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Fetch projects on mount
  useEffect(() => {
    if (isOpen) {
      fetchProjects();
    }
  }, [isOpen]);

  const fetchProjects = async () => {
    try {
      const response = await fetch('http://localhost:8080/projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createProject = async () => {
    if (!newProjectName.trim()) return;

    try {
      const response = await fetch('http://localhost:8080/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProjectName.trim() })
      });

      if (response.ok) {
        const newProject = await response.json();
        setProjects([newProject, ...projects]);
        setNewProjectName('');
        setIsCreating(false);
        onProjectSelect(newProject.id);
      }
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className={`
        fixed left-0 top-0 h-full w-72 z-50
        transform transition-transform duration-200 ease-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        ${isDark ? 'bg-gray-900 border-r border-gray-800' : 'bg-gray-50 border-r border-gray-200'}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
            Projects
          </h2>
          <button
            onClick={onClose}
            className={`p-1 rounded-md transition-colors ${
              isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-200'
            }`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search projects..."
              className={`
                w-full pl-9 pr-3 py-2 rounded-lg text-sm
                ${isDark 
                  ? 'bg-gray-800 text-gray-100 placeholder-gray-500' 
                  : 'bg-white text-gray-900 placeholder-gray-400'
                }
                focus:outline-none focus:ring-2 focus:ring-purple-500
              `}
            />
          </div>
        </div>

        {/* New Project Button */}
        <div className="px-4 pb-4">
          {isCreating ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && createProject()}
                placeholder="Project name..."
                autoFocus
                className={`
                  flex-1 px-3 py-2 rounded-lg text-sm
                  ${isDark 
                    ? 'bg-gray-800 text-gray-100 placeholder-gray-500' 
                    : 'bg-white text-gray-900 placeholder-gray-400'
                  }
                  focus:outline-none focus:ring-2 focus:ring-purple-500
                `}
              />
              <button
                onClick={createProject}
                className="px-3 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setNewProjectName('');
                }}
                className={`px-3 py-2 rounded-lg text-sm ${
                  isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsCreating(true)}
              className={`
                w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm
                ${isDark 
                  ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }
              `}
            >
              <Plus size={16} />
              New Project
            </button>
          )}
        </div>

        {/* Projects List */}
        <div className="flex-1 overflow-y-auto px-4">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className={`h-12 rounded-lg animate-pulse ${
                    isDark ? 'bg-gray-800' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          ) : filteredProjects.length === 0 ? (
            <p className={`text-sm text-center py-8 ${
              isDark ? 'text-gray-500' : 'text-gray-400'
            }`}>
              {searchTerm ? 'No projects found' : 'No projects yet'}
            </p>
          ) : (
            <div className="space-y-1">
              {filteredProjects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => onProjectSelect(project.id)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm
                    transition-colors group
                    ${currentProjectId === project.id
                      ? isDark 
                        ? 'bg-purple-600/20 text-purple-400' 
                        : 'bg-purple-100 text-purple-700'
                      : isDark
                        ? 'hover:bg-gray-800 text-gray-300'
                        : 'hover:bg-gray-100 text-gray-700'
                    }
                  `}
                >
                  <FolderOpen size={16} className="flex-shrink-0" />
                  <span className="flex-1 text-left truncate">{project.name}</span>
                  <ChevronRight 
                    size={14} 
                    className={`
                      transition-opacity
                      ${currentProjectId === project.id 
                        ? 'opacity-100' 
                        : 'opacity-0 group-hover:opacity-50'
                      }
                    `}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
