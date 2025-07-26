// src/components/ArtifactViewer.tsx
// NEW FILE

import React, { useState, useEffect } from 'react';
import { FileCode, FileText, Copy, Check, X, Save, Menu, ChevronDown } from 'lucide-react';

interface Artifact {
  id: string;
  name: string;
  content: string;
  artifact_type: 'code' | 'document' | 'data';
  language?: string;
  created_at: string;
  updated_at: string;
  version?: number;
}

interface ArtifactVersion {
  version: number;
  created_at: string;
  content: string;
}

interface ArtifactViewerProps {
  projectId: string;
  isDark: boolean;
  onClose: () => void;
  selectedArtifactId?: string;
  recentArtifacts?: Artifact[]; // From the current chat session
}

export const ArtifactViewer: React.FC<ArtifactViewerProps> = ({
  projectId,
  isDark,
  onClose,
  selectedArtifactId,
  recentArtifacts = []
}) => {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showArtifactMenu, setShowArtifactMenu] = useState(false);
  const [showVersionMenu, setShowVersionMenu] = useState(false);
  const [versions, setVersions] = useState<ArtifactVersion[]>([]);
  const [currentVersion, setCurrentVersion] = useState<number | null>(null);

  useEffect(() => {
    fetchArtifacts();
  }, [projectId]);

  useEffect(() => {
    // If a specific artifact is requested, select it
    if (selectedArtifactId) {
      // First check recent artifacts (from current session)
      const recentArtifact = recentArtifacts.find(a => a.id === selectedArtifactId);
      if (recentArtifact) {
        setSelectedArtifact(recentArtifact);
        fetchVersions(recentArtifact.id);
      } else {
        // Then check project artifacts
        const artifact = artifacts.find(a => a.id === selectedArtifactId);
        if (artifact) {
          setSelectedArtifact(artifact);
          fetchVersions(artifact.id);
        }
      }
    }
  }, [selectedArtifactId, artifacts, recentArtifacts]);

  const fetchArtifacts = async () => {
    try {
      const response = await fetch(`http://localhost:8080/projects/${projectId}/artifacts`);
      if (response.ok) {
        const data = await response.json();
        setArtifacts(data.artifacts || []);
      }
    } catch (error) {
      console.error('Failed to fetch artifacts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchVersions = async (artifactId: string) => {
    try {
      const response = await fetch(`http://localhost:8080/artifacts/${artifactId}/versions`);
      if (response.ok) {
        const data = await response.json();
        setVersions(data.versions || []);
        setCurrentVersion(data.versions?.[0]?.version || null);
      }
    } catch (error) {
      console.error('Failed to fetch versions:', error);
      // Create a default version if none exist
      setVersions([{
        version: 1,
        created_at: new Date().toISOString(),
        content: selectedArtifact?.content || ''
      }]);
      setCurrentVersion(1);
    }
  };

  const copyToClipboard = async () => {
    if (!selectedArtifact) return;
    
    try {
      await navigator.clipboard.writeText(selectedArtifact.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const saveToProject = async () => {
    if (!selectedArtifact || saving) return;

    setSaving(true);
    try {
      // Check if this artifact already exists in the project
      const existingArtifact = artifacts.find(a => a.name === selectedArtifact.name);
      
      if (existingArtifact) {
        // Update existing artifact (create new version)
        const response = await fetch(`http://localhost:8080/projects/${projectId}/artifacts/${existingArtifact.id}/versions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: selectedArtifact.content
          })
        });

        if (response.ok) {
          setSaved(true);
          fetchVersions(existingArtifact.id);
          setTimeout(() => setSaved(false), 2000);
        }
      } else {
        // Create new artifact in project
        const response = await fetch(`http://localhost:8080/projects/${projectId}/artifacts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: selectedArtifact.name,
            content: selectedArtifact.content,
            artifact_type: selectedArtifact.artifact_type,
            language: selectedArtifact.language
          })
        });

        if (response.ok) {
          const newArtifact = await response.json();
          setArtifacts([...artifacts, newArtifact]);
          setSaved(true);
          fetchVersions(newArtifact.id);
          setTimeout(() => setSaved(false), 2000);
        }
      }
    } catch (error) {
      console.error('Failed to save artifact:', error);
    } finally {
      setSaving(false);
    }
  };

  const loadVersion = async (version: number) => {
    const versionData = versions.find(v => v.version === version);
    if (versionData && selectedArtifact) {
      setSelectedArtifact({
        ...selectedArtifact,
        content: versionData.content,
        version: version
      });
      setCurrentVersion(version);
      setShowVersionMenu(false);
    }
  };

  const getLanguageLabel = (artifact: Artifact) => {
    if (artifact.artifact_type === 'code' && artifact.language) {
      return artifact.language;
    }
    return artifact.artifact_type;
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'code':
        return <FileCode size={16} />;
      case 'document':
        return <FileText size={16} />;
      default:
        return <FileText size={16} />;
    }
  };

  // Combine recent artifacts with project artifacts for the menu
  const allArtifacts = [...recentArtifacts, ...artifacts];
  const uniqueArtifacts = Array.from(new Map(allArtifacts.map(a => [a.id, a])).values());

  if (!selectedArtifact && !isLoading) {
    return null;
  }

  return (
    <div className={`
      fixed right-0 top-0 bottom-0 w-[600px] z-40
      flex flex-col shadow-xl
      ${isDark 
        ? 'bg-gray-900 border-l border-gray-800' 
        : 'bg-white border-l border-gray-200'
      }
    `}>
      {/* Header */}
      <div className={`
        flex items-center justify-between px-4 py-3 border-b
        ${isDark ? 'border-gray-800' : 'border-gray-200'}
      `}>
        <div className="flex items-center gap-3">
          {/* Hamburger menu */}
          <div className="relative">
            <button
              onClick={() => setShowArtifactMenu(!showArtifactMenu)}
              className={`
                p-1.5 rounded-md transition-colors
                ${isDark 
                  ? 'hover:bg-gray-800 text-gray-400' 
                  : 'hover:bg-gray-100 text-gray-600'
                }
              `}
              title="All artifacts"
            >
              <Menu size={20} />
            </button>

            {/* Artifact dropdown menu */}
            {showArtifactMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowArtifactMenu(false)}
                />
                <div className={`
                  absolute left-0 top-10 w-64 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto
                  ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}
                `}>
                  <div className="p-2">
                    <div className={`px-3 py-2 text-xs font-medium ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      Recent Artifacts
                    </div>
                    {uniqueArtifacts.map((artifact) => (
                      <button
                        key={artifact.id}
                        onClick={() => {
                          setSelectedArtifact(artifact);
                          fetchVersions(artifact.id);
                          setShowArtifactMenu(false);
                        }}
                        className={`
                          w-full flex items-center gap-2 px-3 py-2 rounded text-sm
                          transition-colors text-left
                          ${selectedArtifact?.id === artifact.id
                            ? isDark 
                              ? 'bg-purple-600/20 text-purple-400' 
                              : 'bg-purple-100 text-purple-700'
                            : isDark
                              ? 'hover:bg-gray-700 text-gray-300'
                              : 'hover:bg-gray-50 text-gray-700'
                          }
                        `}
                      >
                        {getIcon(artifact.artifact_type)}
                        <span className="flex-1 truncate">{artifact.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {selectedArtifact && (
            <>
              {getIcon(selectedArtifact.artifact_type)}
              <h4 className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                {selectedArtifact.name}
              </h4>
              <span className={`text-xs px-2 py-0.5 rounded ${
                isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-200 text-gray-600'
              }`}>
                {getLanguageLabel(selectedArtifact)}
              </span>
            </>
          )}
        </div>

        {/* Version selector */}
        {selectedArtifact && versions.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowVersionMenu(!showVersionMenu)}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-md text-sm
                ${isDark 
                  ? 'hover:bg-gray-800 text-gray-300' 
                  : 'hover:bg-gray-100 text-gray-700'
                }
              `}
            >
              <span className="font-medium">
                {currentVersion === versions[0]?.version ? 'Latest' : `Version ${currentVersion}`}
              </span>
              <ChevronDown size={14} />
            </button>

            {/* Version dropdown */}
            {showVersionMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowVersionMenu(false)}
                />
                <div className={`
                  absolute right-0 top-10 w-48 rounded-lg shadow-lg z-50
                  ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}
                `}>
                  <div className="p-2">
                    {versions.map((version, index) => (
                      <button
                        key={version.version}
                        onClick={() => loadVersion(version.version)}
                        className={`
                          w-full flex items-center justify-between px-3 py-2 rounded text-sm
                          transition-colors
                          ${currentVersion === version.version
                            ? isDark 
                              ? 'bg-purple-600/20 text-purple-400' 
                              : 'bg-purple-100 text-purple-700'
                            : isDark
                              ? 'hover:bg-gray-700 text-gray-300'
                              : 'hover:bg-gray-50 text-gray-700'
                          }
                        `}
                      >
                        <span>Version {version.version}</span>
                        {index === 0 && (
                          <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            Latest
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
        
        <div className="flex items-center gap-2">
          {/* Copy button */}
          <button
            onClick={copyToClipboard}
            className={`
              px-3 py-1.5 rounded-md text-sm font-medium transition-colors
              flex items-center gap-2
              ${isDark 
                ? 'hover:bg-gray-800 text-gray-400' 
                : 'hover:bg-gray-100 text-gray-600'
              }
            `}
            title="Copy to clipboard"
          >
            {copied ? (
              <>
                <Check size={16} className="text-green-500" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy size={16} />
                <span>Copy</span>
              </>
            )}
          </button>

          {/* Save button */}
          <button
            onClick={saveToProject}
            disabled={saving}
            className={`
              px-3 py-1.5 rounded-md text-sm font-medium transition-colors
              flex items-center gap-2
              ${saved
                ? 'bg-green-600 text-white'
                : isDark 
                  ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              }
              ${saving ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            title="Save to project"
          >
            {saved ? (
              <>
                <Check size={16} />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Save</span>
              </>
            )}
          </button>
          
          {/* Close button */}
          <button
            onClick={onClose}
            className={`
              p-1.5 rounded-md transition-colors
              ${isDark 
                ? 'hover:bg-gray-800 text-gray-400' 
                : 'hover:bg-gray-100 text-gray-600'
              }
            `}
            title="Close"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Content */}
      {selectedArtifact && (
        <div className="flex-1 overflow-auto p-6">
          <pre className={`
            text-sm font-mono whitespace-pre-wrap
            ${isDark ? 'text-gray-300' : 'text-gray-700'}
          `}>
            {selectedArtifact.content}
          </pre>
        </div>
      )}
    </div>
  );
};
