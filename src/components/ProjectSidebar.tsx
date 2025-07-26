import React, { useState } from 'react';
import { FolderOpen, ChevronRight, Plus, Search, X } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  created_at?: string;
  updated_at?: string;
}

interface ProjectSidebarProps {
  projects: Project[];
  currentProjectId: string | null;
  onProjectSelect: (id: string) => void;
  onProjectCreate: (name: string) => void;
  isDark: boolean;
  isOpen?: boolean; // Controls visibility
  onClose?: () => void; // Closes sidebar (optional)
}

const ProjectSidebar: React.FC<ProjectSidebarProps> = ({
  projects,
  currentProjectId,
  onProjectSelect,
  onProjectCreate,
  isDark,
  isOpen = true,
  onClose,
}) => {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isLoading = false; // You can update with actual loading state if needed

  const handleCreate = () => {
    if (newName.trim() === '') return;
    onProjectCreate(newName.trim());
    setNewName('');
    setCreating(false);
  };

  return (
    <div
      className={`h-full w-72 flex flex-col border-r fixed z-40 top-0 left-0 bottom-0 transition-transform duration-300 ${
        isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
      }`}
      style={{ transform: isOpen ? 'translateX(0)' : 'translateX(-100%)' }}
    >
      <div className="flex items-center px-4 py-3 border-b justify-between" style={{ minHeight: 56 }}>
        <div className="flex items-center gap-2">
          <FolderOpen size={20} />
          <span className={`font-semibold text-lg tracking-tight ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
            Projects
          </span>
        </div>
        <div className="flex gap-1">
          {onClose && (
            <button
              className={`p-1.5 rounded hover:bg-purple-600/20 transition ${
                isDark ? 'text-gray-300' : 'text-gray-600'
              }`}
              title="Close sidebar"
              onClick={onClose}
              style={{ marginRight: 2 }}
            >
              <X size={18} />
            </button>
          )}
          <button
            className={`p-1.5 rounded hover:bg-purple-600/20 transition ${
              isDark ? 'text-gray-300' : 'text-gray-600'
            }`}
            title="New project"
            onClick={() => setCreating(true)}
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      <div className="p-2">
        <div className="relative">
          <input
            className={`w-full rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 ${
              isDark
                ? 'bg-gray-800 text-gray-200 placeholder-gray-400 focus:ring-purple-700'
                : 'bg-gray-100 text-gray-800 placeholder-gray-400 focus:ring-purple-400'
            }`}
            type="text"
            placeholder="Search projects"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <Search size={16}
            className="absolute left-2 top-2.5 text-gray-400 pointer-events-none"
          />
          {searchTerm && (
            <button
              className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600"
              onClick={() => setSearchTerm('')}
              tabIndex={-1}
              type="button"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {creating && (
        <div className="px-4 py-3 border-b border-dashed">
          <input
            className={`w-full rounded-md px-2 py-1 text-sm mb-2 ${
              isDark
                ? 'bg-gray-800 text-gray-200 placeholder-gray-400'
                : 'bg-gray-100 text-gray-800 placeholder-gray-400'
            }`}
            type="text"
            placeholder="New project name"
            value={newName}
            autoFocus
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleCreate();
              if (e.key === 'Escape') setCreating(false);
            }}
          />
          <div className="flex gap-2">
            <button
              className="px-3 py-1 text-sm rounded bg-purple-600 text-white hover:bg-purple-700"
              onClick={handleCreate}
            >
              Create
            </button>
            <button
              className="px-3 py-1 text-sm rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
              onClick={() => setCreating(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

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
          <div className="flex flex-col items-center py-12">
            <FolderOpen size={40} className={`mb-3 ${isDark ? "text-gray-700" : "text-gray-300"}`} />
            <p className={`text-base text-center mb-4 ${
              isDark ? 'text-gray-400' : 'text-gray-500'
            }`}>
              {searchTerm
                ? <>No projects found.<br /><span className="text-sm">Try a different search or create a new one!</span></>
                : <>No projects yet.<br /><span className="text-sm">Create your first project below.</span></>
              }
            </p>
            <button
              className="mt-2 px-4 py-2 font-semibold rounded-lg bg-purple-600 text-white shadow hover:bg-purple-700 transition"
              onClick={() => setCreating(true)}
            >
              <Plus size={16} className="inline mr-2 -mt-1" />
              New Project
            </button>
          </div>
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
  );
};

export default ProjectSidebar;
