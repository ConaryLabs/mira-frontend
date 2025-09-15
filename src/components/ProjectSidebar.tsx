import React, { useState, useEffect, useRef } from 'react';
import { 
  FolderOpen, 
  Plus, 
  MoreVertical, 
  Trash2, 
  Edit2, 
  GitBranch,
  X,
  Check,
  ChevronLeft
} from 'lucide-react';
import { ProjectGitSection } from './ProjectGitSection';
import { createProjectCommand } from '../types/websocket';
import type { WsClientMessage } from '../types/websocket';

interface Project {
  id: string;
  name: string;
  created_at?: string;
  updated_at?: string;
}

interface ProjectSidebarProps {
  projects: Project[];
  currentProjectId: string | null;
  onProjectSelect: (projectId: string) => void;
  onProjectCreate: (name: string) => void;
  isDark: boolean;
  isOpen: boolean;
  onClose: () => void;
  send?: (message: WsClientMessage) => void;
  onProjectResponse?: (handler: (data: any) => void) => void;
  onGitResponse?: (handler: (data: any) => void) => void;
}

const ProjectSidebar: React.FC<ProjectSidebarProps> = ({
  projects,
  currentProjectId,
  onProjectSelect,
  onProjectCreate,
  isDark,
  isOpen,
  onClose,
  send,
  onProjectResponse,
  onGitResponse
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleProjectData = (data: any) => {
      if (data.type === 'project_updated') {
        setEditingProjectId(null);
        setEditingName('');
      } else if (data.type === 'project_deleted') {
        if (currentProjectId === data.project_id) {
          onProjectSelect('');
        }
        setActiveMenu(null);
      }
    };

    if (onProjectResponse) {
      onProjectResponse(handleProjectData);
    }
  }, [onProjectResponse, currentProjectId, onProjectSelect]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;
    onProjectCreate(newProjectName);
    setNewProjectName('');
    setIsCreating(false);
  };

  const handleRenameProject = (projectId: string) => {
    if (!editingName.trim() || !send) return;

    send(createProjectCommand('project.update', {
      id: projectId,
      name: editingName
    }));
  };

  const handleDeleteProject = (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }

    if (!send) {
      console.warn('Cannot delete project: WebSocket not connected');
      return;
    }

    send(createProjectCommand('project.delete', {
      id: projectId
    }));
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-y-0 left-0 z-30 w-64 ${isDark ? 'bg-gray-800' : 'bg-white'} border-r ${isDark ? 'border-gray-700' : 'border-gray-200'} flex flex-col shadow-lg`}>
      <div className={`p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`font-semibold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>Projects</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCreating(true)}
              className={`p-1 hover:${isDark ? 'bg-gray-700' : 'bg-gray-200'} rounded transition-colors`}
              title="New Project"
            >
              <Plus className={`w-5 h-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
            </button>
            <button
              onClick={onClose}
              className={`p-1 hover:${isDark ? 'bg-gray-700' : 'bg-gray-200'} rounded transition-colors`}
              title="Close sidebar"
            >
              <ChevronLeft className={`w-5 h-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
            </button>
          </div>
        </div>

        {isCreating && (
          <div className="flex items-center gap-2 mb-3">
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateProject();
                if (e.key === 'Escape') {
                  setIsCreating(false);
                  setNewProjectName('');
                }
              }}
              placeholder="Project name"
              className={`flex-1 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                isDark 
                  ? 'border-gray-600 bg-gray-700 text-gray-100 placeholder-gray-400' 
                  : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
              }`}
              autoFocus
            />
            <button
              onClick={handleCreateProject}
              className="p-1 text-green-600 hover:bg-green-50 rounded"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setIsCreating(false);
                setNewProjectName('');
              }}
              className="p-1 text-gray-600 hover:bg-gray-200 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {projects.map((project) => (
          <div key={project.id}>
            <div
              className={`group relative flex items-center px-4 py-2 hover:${isDark ? 'bg-gray-700' : 'bg-gray-100'} cursor-pointer ${
                currentProjectId === project.id ? (isDark ? 'bg-gray-700' : 'bg-gray-100') : ''
              }`}
              onClick={() => onProjectSelect(project.id)}
            >
              <FolderOpen className={`w-4 h-4 mr-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              
              {editingProjectId === project.id ? (
                <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameProject(project.id);
                      if (e.key === 'Escape') {
                        setEditingProjectId(null);
                        setEditingName('');
                      }
                    }}
                    className={`flex-1 px-1 py-0 text-sm border ${isDark ? 'border-gray-600 bg-gray-800 text-gray-100' : 'border-gray-300'} rounded focus:outline-none focus:ring-1 focus:ring-blue-500`}
                    autoFocus
                  />
                  <button
                    onClick={() => handleRenameProject(project.id)}
                    className="p-0.5 text-green-600 hover:bg-green-50 rounded"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => {
                      setEditingProjectId(null);
                      setEditingName('');
                    }}
                    className={`p-0.5 ${isDark ? 'text-gray-400 hover:bg-gray-600' : 'text-gray-600 hover:bg-gray-200'} rounded`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <>
                  <span className={`text-sm ${isDark ? 'text-gray-200' : 'text-gray-700'} truncate flex-1`}>
                    {project.name}
                  </span>
                  <div 
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    ref={activeMenu === project.id ? menuRef : null}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenu(activeMenu === project.id ? null : project.id);
                      }}
                      className={`p-1 hover:${isDark ? 'bg-gray-600' : 'bg-gray-200'} rounded`}
                    >
                      <MoreVertical className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                    </button>
                    
                    {activeMenu === project.id && (
                      <div className={`absolute right-2 top-8 ${isDark ? 'bg-gray-700' : 'bg-white'} rounded-lg shadow-lg border ${isDark ? 'border-gray-600' : 'border-gray-200'} py-1 z-10 min-w-[120px]`}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingProjectId(project.id);
                            setEditingName(project.name);
                            setActiveMenu(null);
                          }}
                          className={`w-full px-3 py-1.5 text-sm text-left hover:${isDark ? 'bg-gray-600' : 'bg-gray-100'} flex items-center gap-2`}
                        >
                          <Edit2 className="w-3 h-3" />
                          Rename
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProject(project.id);
                          }}
                          className={`w-full px-3 py-1.5 text-sm text-left hover:${isDark ? 'bg-gray-600' : 'bg-gray-100'} text-red-600 flex items-center gap-2`}
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            
            {currentProjectId === project.id && (
              <div className="px-4 pb-2">
                <ProjectGitSection 
                  projectId={project.id}
                  isDark={isDark}
                  send={send}
                  onGitResponse={onGitResponse}
                  onFileRequest={(repoId, filePath) => {
                    console.log('File requested:', repoId, filePath);
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProjectSidebar;
