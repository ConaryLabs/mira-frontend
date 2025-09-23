// src/components/ProjectDropdown.tsx - With Project Delete Functionality
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus, Folder, GitBranch, Trash2, MoreHorizontal } from 'lucide-react';
import { useAppState } from '../hooks/useAppState';
import { useWebSocket } from '../hooks/useWebSocket';
import type { Project } from '../types';

export const ProjectDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [showAttachRepo, setShowAttachRepo] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isAttaching, setIsAttaching] = useState(false);
  const [hasLoadedProjects, setHasLoadedProjects] = useState(false);
  const [projectMenuOpen, setProjectMenuOpen] = useState<string | null>(null); // Track which project menu is open
  const [isDeletingProject, setIsDeletingProject] = useState<string | null>(null); // Track deletion state
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { currentProject, projects, setCurrentProject } = useAppState();
  const { send, connectionState } = useWebSocket();

  // Debug effect to watch project changes
  useEffect(() => {
    console.log('🎯 ProjectDropdown: Projects updated', { 
      projectCount: projects.length, 
      currentProject: currentProject?.name,
      hasRepository: currentProject?.hasRepository,
      connectionState,
      hasLoadedProjects
    });
  }, [projects, currentProject, connectionState, hasLoadedProjects]);

  // Force project load when connected
  useEffect(() => {
    if (connectionState === 'connected' && !hasLoadedProjects) {
      console.log('🔄 Loading projects after connection established...');
      
      const loadProjects = async () => {
        try {
          console.log('📤 Sending project.list request...');
          await send({
            type: 'project_command',
            method: 'project.list',
            params: {}
          });
          console.log('✅ Project list request sent successfully');
          setHasLoadedProjects(true);
        } catch (error) {
          console.error('❌ Failed to load projects:', error);
        }
      };
      
      const timer = setTimeout(() => {
        loadProjects();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [connectionState, hasLoadedProjects, send]);

  // Reset project load flag when disconnected
  useEffect(() => {
    if (connectionState === 'disconnected') {
      setHasLoadedProjects(false);
    }
  }, [connectionState]);

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
    console.log('🔄 Selecting project:', {
      id: project.id,
      name: project.name,
      hasRepository: project.hasRepository,
      repositoryUrl: project.repositoryUrl
    });
    setCurrentProject(project);
    setIsOpen(false);
    setProjectMenuOpen(null);
  };

  const handleExitProject = () => {
    console.log('🔄 Exiting project');
    setCurrentProject(null);
    setIsOpen(false);
  };

  const handleDeleteProject = async (project: Project, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent project selection

    // Confirm deletion
    if (!confirm(`Delete project "${project.name}"?\n\nThis will permanently delete the project and all its data. This cannot be undone.`)) {
      return;
    }

    setIsDeletingProject(project.id);
    console.log('🗑️ Deleting project:', project.name);

    try {
      await send({
        type: 'project_command',
        method: 'project.delete',
        params: { id: project.id }
      });

      console.log('✅ Project deleted successfully');

      // If we just deleted the current project, exit it
      if (currentProject?.id === project.id) {
        setCurrentProject(null);
      }

      // Refresh project list
      setTimeout(async () => {
        try {
          await send({
            type: 'project_command',
            method: 'project.list',
            params: {}
          });
        } catch (error) {
          console.error('❌ Failed to refresh projects after deletion:', error);
        }
      }, 500);

    } catch (error) {
      console.error('❌ Failed to delete project:', error);
      alert('Failed to delete project. Please try again.');
    } finally {
      setIsDeletingProject(null);
      setProjectMenuOpen(null);
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim() || isCreating) return;
    
    setIsCreating(true);
    console.log('📁 Creating project:', newProjectName.trim());
    
    try {
      const createMessage = {
        type: 'project_command',
        method: 'project.create',
        params: { 
          name: newProjectName.trim(),
          description: '',
          tags: []
        }
      };
      
      console.log('📤 Sending project.create:', createMessage);
      await send(createMessage);
      
      console.log('✅ Project create command sent successfully');
      
      setNewProjectName('');
      setShowNewProject(false);
      setIsOpen(false);
    } catch (error) {
      console.error('❌ Failed to create project:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleAttachRepository = async () => {
    if (!repoUrl.trim() || !currentProject || isAttaching) return;
    
    setIsAttaching(true);
    console.log('🔗 Attaching repository:', repoUrl.trim(), 'to project:', currentProject.id);
    
    try {
      // Step 1: Attach the repository (creates attachment record)
      const attachMessage = {
        type: 'git_command',
        method: 'git.attach',
        params: { 
          project_id: currentProject.id,
          repo_url: repoUrl.trim()
        }
      };
      
      console.log('📤 Sending git.attach:', attachMessage);
      await send(attachMessage);
      console.log('✅ Repository attached');
      
      // Step 2: Clone the repository locally
      const cloneMessage = {
        type: 'git_command',
        method: 'git.clone',
        params: { project_id: currentProject.id }
      };
      
      console.log('📤 Sending git.clone:', cloneMessage);
      await send(cloneMessage);
      console.log('✅ Repository cloned');
      
      // Step 3: Import and analyze the codebase
      const importMessage = {
        type: 'git_command', 
        method: 'git.import',
        params: { project_id: currentProject.id }
      };
      
      console.log('📤 Sending git.import:', importMessage);
      await send(importMessage);
      console.log('✅ Repository imported and analyzed');
      
      console.log('🎉 Repository fully attached, cloned, and analyzed!');
      
      // Enhanced refresh logic
      console.log('🔄 Reloading projects to update repository status...');
      
      setTimeout(async () => {
        try {
          // Refresh project list
          await send({
            type: 'project_command',
            method: 'project.list',
            params: {}
          });
          
          // Force current project refresh by clearing and letting list handler set it
          const tempProjectId = currentProject.id;
          setCurrentProject(null);
          
          // Give the project list time to update, then restore current project
          setTimeout(() => {
            const updatedProjects = useAppState.getState().projects;
            const updatedCurrentProject = updatedProjects.find(p => p.id === tempProjectId);
            if (updatedCurrentProject) {
              console.log('🔄 Restoring current project with updated status:', {
                hasRepository: updatedCurrentProject.hasRepository,
                repositoryUrl: updatedCurrentProject.repositoryUrl
              });
              setCurrentProject(updatedCurrentProject);
            }
          }, 500);
          
        } catch (error) {
          console.error('❌ Failed to refresh project list:', error);
        }
      }, 2000);
      
      setRepoUrl('');
      setShowAttachRepo(false);
      setIsOpen(false);
    } catch (error) {
      console.error('❌ Failed to attach repository:', error);
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

  // Manual refresh for debugging
  const handleManualRefresh = async () => {
    console.log('🔄 Manual project refresh requested...');
    try {
      setHasLoadedProjects(false);
      await send({
        type: 'project_command',
        method: 'project.list',
        params: {}
      });
      console.log('✅ Manual refresh sent');
    } catch (error) {
      console.error('❌ Manual refresh failed:', error);
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

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-gray-900 border border-gray-700 rounded-lg shadow-lg z-50">
          {/* Exit project option */}
          {currentProject && (
            <button
              onClick={handleExitProject}
              className="w-full px-3 py-2 text-left hover:bg-gray-800 flex items-center gap-2 text-sm text-gray-300 border-b border-gray-700"
            >
              <span className="text-lg">←</span>
              <span>Exit Project (General Chat)</span>
            </button>
          )}

          {/* Debug refresh button */}
          {process.env.NODE_ENV === 'development' && (
            <button
              onClick={handleManualRefresh}
              className="w-full px-3 py-2 text-left hover:bg-gray-800 flex items-center gap-2 text-sm text-yellow-300 border-b border-gray-700"
            >
              <span>🔄</span>
              <span>Debug: Reload Projects</span>
            </button>
          )}

          {/* Project list */}
          <div className="max-h-64 overflow-y-auto">
            {connectionState !== 'connected' ? (
              <div className="px-3 py-2 text-sm text-gray-400">
                Connecting...
              </div>
            ) : !hasLoadedProjects ? (
              <div className="px-3 py-2 text-sm text-gray-400">
                Loading projects...
              </div>
            ) : projects.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-400">
                No projects yet
              </div>
            ) : (
              projects.map((project) => (
                <div key={project.id} className="relative group">
                  <button
                    onClick={() => handleProjectSelect(project)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-800 flex items-center gap-2 text-gray-200"
                  >
                    <Folder size={14} />
                    <span className="truncate flex-1">{project.name}</span>
                    
                    {/* Repository indicator */}
                    {project.hasRepository && (
                      <div title="Has repository">
                        <GitBranch size={12} className="text-green-400" />
                      </div>
                    )}
                    
                    {/* Current project indicator */}
                    {currentProject?.id === project.id && (
                      <span className="text-blue-400 text-xs">✓</span>
                    )}
                  </button>

                  {/* Project menu button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setProjectMenuOpen(projectMenuOpen === project.id ? null : project.id);
                    }}
                    className="absolute right-1 top-1 bottom-1 w-6 opacity-0 group-hover:opacity-100 hover:bg-gray-700 rounded flex items-center justify-center transition-opacity"
                  >
                    <MoreHorizontal size={12} />
                  </button>

                  {/* Project menu */}
                  {projectMenuOpen === project.id && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-gray-800 border border-gray-600 rounded-md shadow-lg z-50">
                      <button
                        onClick={(e) => handleDeleteProject(project, e)}
                        disabled={isDeletingProject === project.id}
                        className="w-full px-3 py-2 text-left hover:bg-gray-700 flex items-center gap-2 text-sm text-red-400 disabled:opacity-50"
                      >
                        <Trash2 size={12} />
                        <span>{isDeletingProject === project.id ? 'Deleting...' : 'Delete Project'}</span>
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-gray-700" />

          {/* Create new project section */}
          {showNewProject ? (
            <div className="p-3">
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Project name..."
                className="w-full px-3 py-2 text-sm border border-gray-600 rounded-md bg-gray-800 text-gray-100 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                autoFocus
                disabled={isCreating}
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleCreateProject}
                  disabled={!newProjectName.trim() || isCreating}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating ? 'Creating...' : 'Create'}
                </button>
                <button
                  onClick={() => {
                    setShowNewProject(false);
                    setNewProjectName('');
                  }}
                  className="px-3 py-1 text-sm text-gray-400 hover:text-gray-200"
                  disabled={isCreating}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : showAttachRepo ? (
            <div className="p-3">
              <input
                type="text"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="https://github.com/username/repo.git"
                className="w-full px-3 py-2 text-sm border border-gray-600 rounded-md bg-gray-800 text-gray-100 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                autoFocus
                disabled={isAttaching}
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleAttachRepository}
                  disabled={!repoUrl.trim() || isAttaching}
                  className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAttaching ? 'Processing...' : 'Attach, Clone & Analyze'}
                </button>
                <button
                  onClick={() => {
                    setShowAttachRepo(false);
                    setRepoUrl('');
                  }}
                  className="px-3 py-1 text-sm text-gray-400 hover:text-gray-200"
                  disabled={isAttaching}
                >
                  Cancel
                </button>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                This will clone and analyze the repository for code intelligence
              </div>
            </div>
          ) : (
            <div>
              <button
                onClick={() => setShowNewProject(true)}
                className="w-full px-3 py-2 text-left hover:bg-gray-800 flex items-center gap-2 text-sm text-gray-400"
              >
                <Plus size={14} />
                New project
              </button>
              
              {/* Attach repository option */}
              {currentProject && !currentProject.hasRepository && (
                <button
                  onClick={() => setShowAttachRepo(true)}
                  className="w-full px-3 py-2 text-left hover:bg-gray-800 flex items-center gap-2 text-sm text-gray-400"
                >
                  <GitBranch size={14} />
                  Attach Repository
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
