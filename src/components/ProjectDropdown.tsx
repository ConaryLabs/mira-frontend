// src/components/ProjectDropdown.tsx
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus, Folder, GitBranch } from 'lucide-react';
import { useAppState } from '../hooks/useAppState';
import { useWebSocket } from '../hooks/useWebSocket';

export const ProjectDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [showAttachRepo, setShowAttachRepo] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isAttaching, setIsAttaching] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { currentProject, projects, setCurrentProject } = useAppState();
  const { send } = useWebSocket();

  // Debug effect to watch project changes
  useEffect(() => {
    console.log('🎯 ProjectDropdown: Projects updated', { 
      projectCount: projects.length, 
      currentProject: currentProject?.name 
    });
  }, [projects, currentProject]);

  // Load projects on mount
  useEffect(() => {
    const loadProjects = async () => {
      console.log('🔄 Loading projects on mount...');
      try {
        await send({
          type: 'project_command',
          method: 'project.list',
          params: {}
        });
      } catch (error) {
        console.error('❌ Failed to load projects:', error);
      }
    };
    
    loadProjects();
  }, []); // Run once on mount

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowNewProject(false);
        setShowAttachRepo(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleProjectSelect = async (project: any) => {
    console.log('🎯 Selecting project:', project.name);
    setCurrentProject(project);
    setIsOpen(false);
    
    // NOTE: No backend call needed - project selection is purely frontend state
    // The backend doesn't have a "set_active" concept for projects
    console.log('✅ Project set as current in frontend state');
  };

  const handleExitProject = () => {
    console.log('🚪 Exiting current project');
    setCurrentProject(null);
    setIsOpen(false);
    console.log('✅ Returned to general chat mode (no project)');
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim() || isCreating) return;
    
    setIsCreating(true);
    console.log('✨ Creating project:', newProjectName.trim());
    
    try {
      const message = {
        type: 'project_command',
        method: 'project.create',
        params: { 
          name: newProjectName.trim(),
          description: `Created on ${new Date().toLocaleDateString()}`
        }
      };
      
      console.log('📤 Sending project.create:', message);
      await send(message);
      
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

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button - styled like Claude's model selector */}
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
          {/* Exit project option (only show if a project is selected) */}
          {currentProject && (
            <>
              <button
                onClick={handleExitProject}
                className="w-full px-3 py-2 text-left hover:bg-gray-800 flex items-center gap-2 text-sm text-gray-300 border-b border-gray-700"
              >
                <span className="text-lg">←</span>
                <span>Exit Project (General Chat)</span>
              </button>
            </>
          )}

          {/* Project list */}
          <div className="max-h-64 overflow-y-auto">
            {projects.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-400">
                No projects yet
              </div>
            ) : (
              projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => handleProjectSelect(project)}
                  className="w-full px-3 py-2 text-left hover:bg-gray-800 flex items-center gap-2 text-gray-200"
                >
                  <Folder size={14} />
                  <span className="truncate">{project.name}</span>
                  {currentProject?.id === project.id && (
                    <span className="ml-auto text-blue-400">✓</span>
                  )}
                </button>
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
              
              {/* Attach repository option - only show if project is selected */}
              {currentProject && (
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
