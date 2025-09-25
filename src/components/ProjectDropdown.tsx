// src/components/ProjectDropdown.tsx

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus, Folder, GitBranch, Trash2, MoreHorizontal } from 'lucide-react';
import { useAppState } from '../stores/useAppState';
import { useWebSocketStore } from '../stores/useWebSocketStore';
import type { Project } from '../types';

export const ProjectDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [showAttachRepo, setShowAttachRepo] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isAttaching, setIsAttaching] = useState(false);
  const [projectMenuOpen, setProjectMenuOpen] = useState<string | null>(null);
  const [isDeletingProject, setIsDeletingProject] = useState<string | null>(null);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { currentProject, projects, setCurrentProject } = useAppState();
  const send = useWebSocketStore(state => state.send);
  const connectionState = useWebSocketStore(state => state.connectionState);

  // Debug project state changes
  useEffect(() => {
    console.log('ProjectDropdown: Projects updated', { 
      projectCount: projects.length, 
      currentProject: currentProject?.name,
      hasRepository: currentProject?.hasRepository,
      connectionState
    });
  }, [projects, currentProject, connectionState]);

  // Load projects when connected
  useEffect(() => {
    if (connectionState === 'connected') {
      console.log('Loading projects after connection established...');
      
      const loadProjects = async () => {
        try {
          console.log('Sending project.list request...');
          await send({
            type: 'project_command',
            method: 'project.list',
            params: {}
          });
          console.log('Project list request sent successfully');
        } catch (error) {
          console.error('Failed to load projects:', error);
        }
      };
      
      // Small delay to let connection settle
      const timer = setTimeout(() => {
        loadProjects();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [connectionState, send]);

  // Close dropdown and menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setProjectMenuOpen(null);
        // Reset input states when closing
        if (showNewProject) {
          setShowNewProject(false);
          setNewProjectName('');
        }
        if (showAttachRepo) {
          setShowAttachRepo(false);
          setRepoUrl('');
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, showNewProject, showAttachRepo]);

  const handleProjectSelect = (project: Project) => {
    console.log('Selecting project:', {
      id: project.id,
      name: project.name,
      hasRepository: project.hasRepository
    });
    
    // Set project locally - backend doesn't track active project
    setCurrentProject(project);
    setIsOpen(false);
    setProjectMenuOpen(null);
  };

  const handleExitProject = () => {
    console.log('Exiting project');
    setCurrentProject(null);
    setIsOpen(false);
  };

  const handleDeleteProject = async (project: Project, event: React.MouseEvent) => {
    event.stopPropagation();

    if (!confirm(`Delete project "${project.name}"?\n\nThis will permanently delete the project and all its data. This cannot be undone.`)) {
      return;
    }

    setIsDeletingProject(project.id);
    console.log('Deleting project:', project.name);

    try {
      await send({
        type: 'project_command',
        method: 'project.delete',
        params: { id: project.id }  // Backend expects 'id', not 'project_id'
      });

      console.log('Project deleted successfully');

      if (currentProject?.id === project.id) {
        setCurrentProject(null);
      }

      // Refresh project list after deletion
      setTimeout(async () => {
        try {
          await send({
            type: 'project_command',
            method: 'project.list',
            params: {}
          });
        } catch (error) {
          console.error('Failed to refresh projects after deletion:', error);
        }
      }, 500);

    } catch (error) {
      console.error('Failed to delete project:', error);
      alert('Failed to delete project. Please try again.');
    } finally {
      setIsDeletingProject(null);
      setProjectMenuOpen(null);
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    console.log('Creating project:', newProjectName);
    setIsCreating(true);
    
    try {
      await send({
        type: 'project_command',
        method: 'project.create',
        params: {
          name: newProjectName.trim(),
          description: '',
          tags: []
        }
      });
      
      console.log('Project created successfully');
      
      // Refresh project list
      setTimeout(async () => {
        try {
          await send({
            type: 'project_command',
            method: 'project.list',
            params: {}
          });
        } catch (error) {
          console.error('Failed to refresh project list:', error);
        }
      }, 500);
      
      setNewProjectName('');
      setShowNewProject(false);
    } catch (error) {
      console.error('Failed to create project:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleAttachRepository = async () => {
    if (!repoUrl.trim() || !currentProject) return;

    console.log('Starting repository import process for:', repoUrl);
    console.log('Current project:', currentProject.name, '(ID:', currentProject.id, ')');
    setIsAttaching(true);

    try {
      // Step 1: Attach the repository (creates attachment record in database)
      console.log('Step 1: Creating repository attachment...');
      await send({
        type: 'git_command',
        method: 'git.attach',
        params: {
          project_id: currentProject.id,
          repo_url: repoUrl.trim()
        }
      });
      console.log('Repository attachment created successfully');

      // Wait for database transaction to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 2: Clone the repository to local filesystem
      console.log('Step 2: Cloning repository...');
      await send({
        type: 'git_command',
        method: 'git.clone',
        params: {
          project_id: currentProject.id
        }
      });
      console.log('Repository cloned successfully');

      // Wait for cloning to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 3: Import and analyze the codebase
      console.log('Step 3: Importing and analyzing codebase...');
      await send({
        type: 'git_command',
        method: 'git.import',
        params: {
          project_id: currentProject.id
        }
      });
      console.log('Repository imported and analyzed successfully');

      // Refresh projects to update repository status
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      try {
        await send({
          type: 'project_command',
          method: 'project.list',
          params: {}
        });
        console.log('Project list refreshed');
        
        // Force update the current project to show it has a repository now
        const updatedProject = { ...currentProject, hasRepository: true };
        setCurrentProject(updatedProject);
      } catch (error) {
        console.error('Failed to refresh project list:', error);
      }
      
      setRepoUrl('');
      setShowAttachRepo(false);
      setIsOpen(false);
      
      alert('Repository imported successfully! The codebase has been analyzed and indexed.');
    } catch (error) {
      console.error('Failed to import repository:', error);
      alert('Failed to import repository. Please check the URL and try again.');
    } finally {
      setIsAttaching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (showNewProject) {
        handleCreateProject();
      } else if (showAttachRepo) {
        handleAttachRepository();
      }
    } else if (e.key === 'Escape') {
      setShowNewProject(false);
      setShowAttachRepo(false);
      setNewProjectName('');
      setRepoUrl('');
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-gray-800 text-sm font-medium text-gray-300"
      >
        <Folder size={16} />
        <span className="max-w-[150px] truncate">
          {currentProject?.name || 'No Project'}
        </span>
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-72 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
          {/* Current project section */}
          {currentProject && (
            <div className="border-b border-slate-700 p-2">
              <div className="text-xs text-slate-400 mb-1">Current Project</div>
              <div className="flex items-center p-2 bg-slate-700/50 rounded">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Folder size={16} className="text-blue-400 flex-shrink-0" />
                  {currentProject.hasRepository && (
                    <GitBranch size={14} className="text-green-400 flex-shrink-0" />
                  )}
                  <span className="font-medium truncate">{currentProject.name}</span>
                </div>
                
                {/* Project actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={handleExitProject}
                    className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-600"
                  >
                    Exit
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setProjectMenuOpen(projectMenuOpen === currentProject.id ? null : currentProject.id);
                    }}
                    className="p-1 hover:bg-slate-600 rounded text-slate-400 hover:text-white"
                  >
                    <MoreHorizontal size={14} />
                  </button>
                </div>

                {/* Current project menu */}
                {projectMenuOpen === currentProject.id && (
                  <div className="absolute right-4 top-full mt-1 w-32 bg-slate-900 border border-slate-600 rounded-md shadow-lg z-10">
                    <button
                      onClick={(e) => handleDeleteProject(currentProject, e)}
                      className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-slate-800 rounded-md flex items-center gap-2"
                      disabled={isDeletingProject === currentProject.id}
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Available projects */}
          <div className="p-2">
            <div className="text-xs text-slate-400 mb-2">
              {projects.length === 0 ? 'No projects available' : 'Available Projects'}
            </div>
            
            {projects.filter(p => p.id !== currentProject?.id).map((project) => (
              <div key={project.id} className="relative">
                <button
                  onClick={() => handleProjectSelect(project)}
                  className="w-full flex items-center gap-2 p-2 rounded hover:bg-slate-700 text-left group"
                  disabled={isDeletingProject === project.id}
                >
                  <Folder size={16} className="text-slate-400 flex-shrink-0" />
                  {project.hasRepository && (
                    <GitBranch size={14} className="text-green-400 flex-shrink-0" />
                  )}
                  <span className="flex-1 truncate">{project.name}</span>
                  
                  {/* Project menu button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setProjectMenuOpen(projectMenuOpen === project.id ? null : project.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-600 rounded"
                    disabled={isDeletingProject === project.id}
                  >
                    <MoreHorizontal size={14} />
                  </button>
                  
                  {isDeletingProject === project.id && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-400"></div>
                  )}
                </button>

                {/* Project dropdown menu */}
                {projectMenuOpen === project.id && (
                  <div className="absolute right-0 top-full mt-1 w-32 bg-slate-900 border border-slate-600 rounded-md shadow-lg z-10">
                    <button
                      onClick={(e) => handleDeleteProject(project, e)}
                      className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-slate-800 rounded-md flex items-center gap-2"
                      disabled={isDeletingProject === project.id}
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="border-t border-slate-700 p-2 space-y-2">
            {/* New project section */}
            {showNewProject ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Project name"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-sm focus:outline-none focus:border-blue-500"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateProject}
                    disabled={!newProjectName.trim() || isCreating}
                    className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm font-medium flex items-center justify-center gap-2"
                  >
                    {isCreating ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b border-white"></div>
                        Creating...
                      </>
                    ) : (
                      'Create'
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowNewProject(false);
                      setNewProjectName('');
                    }}
                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowNewProject(true)}
                className="w-full flex items-center gap-2 p-2 rounded hover:bg-slate-700 text-sm"
              >
                <Plus size={16} />
                New project
              </button>
            )}

            {/* Attach repository section - only show if project doesn't have a repo */}
            {currentProject && !currentProject.hasRepository && (
              <>
                {showAttachRepo ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder="Git repository URL"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-sm focus:outline-none focus:border-blue-500"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleAttachRepository}
                        disabled={!repoUrl.trim() || isAttaching}
                        className="flex-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm font-medium flex items-center justify-center gap-2"
                      >
                        {isAttaching ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b border-white"></div>
                            Importing...
                          </>
                        ) : (
                          'Import'
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setShowAttachRepo(false);
                          setRepoUrl('');
                        }}
                        className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAttachRepo(true)}
                    className="w-full flex items-center gap-2 p-2 rounded hover:bg-slate-700 text-sm"
                  >
                    <GitBranch size={16} />
                    Import Repository
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
