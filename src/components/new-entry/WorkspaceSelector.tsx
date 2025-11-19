import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Building2 } from 'lucide-react';
import { useWorkspaces, Workspace } from '../../hooks/useWorkspace';

interface WorkspaceSelectorProps {
  selectedWorkspaceId?: string;
  onWorkspaceChange: (workspaceId: string, workspaceName: string) => void;
  className?: string;
  openUpward?: boolean;
}

export const WorkspaceSelector: React.FC<WorkspaceSelectorProps> = ({
  selectedWorkspaceId,
  onWorkspaceChange,
  className = '',
  openUpward = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { data: workspaces = [], isLoading } = useWorkspaces();

  // Get selected workspace
  const selectedWorkspace = workspaces.find(w => w.id === selectedWorkspaceId);
  const displayName = selectedWorkspace?.name || 'My Workspace';

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleWorkspaceSelect = (workspace: Workspace) => {
    onWorkspaceChange(workspace.id, workspace.name);
    setIsOpen(false);
  };

  if (isLoading) {
    return (
      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 ${className}`}>
        <Building2 className="w-3 h-3" />
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors cursor-pointer"
      >
        <Building2 className="w-3 h-3" />
        <span className="font-medium">{displayName}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className={`absolute right-0 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-[100] max-h-64 overflow-y-auto ${
          openUpward ? 'bottom-full mb-2' : 'top-full mt-2'
        }`}>
          {workspaces.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">No workspaces available</div>
          ) : (
            workspaces.map((workspace) => (
              <button
                key={workspace.id}
                onClick={() => handleWorkspaceSelect(workspace)}
                className={`w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors ${
                  workspace.id === selectedWorkspaceId ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium truncate ${
                      workspace.id === selectedWorkspaceId ? 'text-blue-700' : 'text-gray-900'
                    }`}>
                      {workspace.name}
                    </div>
                    {workspace.organization && (
                      <div className="text-xs text-gray-500 truncate">
                        {workspace.organization.name}
                      </div>
                    )}
                  </div>
                  {workspace.id === selectedWorkspaceId && (
                    <div className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};
