import React, { useState } from 'react';
import { 
  X, 
  Settings, 
  Info, 
  Archive, 
  Shield, 
  Users, 
  Eye, 
  Edit, 
  UserCheck,
  Globe,
  Bell,
  ChevronRight,
  AlertTriangle,
  Trash2
} from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import NetworkPolicySettings from './network-policy-settings';

interface WorkspaceSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  workspace: {
    id: string;
    name: string;
    description?: string;
    organization?: {
      id: string;
      name: string;
      logo?: string;
    } | string;
    category?: string;
    isPersonal?: boolean;
  };
  userRole: 'OWNER' | 'admin' | 'editor' | 'viewer';
  onWorkspaceUpdate?: (data: any) => Promise<void>;
  onArchiveWorkspace?: () => Promise<void>;
}

interface PermissionConfig {
  role: string;
  permissions: {
    canEdit: boolean;
    canComment: boolean;
    canInvite: boolean;
    canManageSettings: boolean;
  };
}

export function WorkspaceSettingsPanel({ 
  isOpen, 
  onClose, 
  workspace, 
  userRole,
  onWorkspaceUpdate,
  onArchiveWorkspace 
}: WorkspaceSettingsPanelProps) {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [workspaceInfo, setWorkspaceInfo] = useState({
    name: workspace.name,
    description: workspace.description || '',
    organization: typeof workspace.organization === 'object' && workspace.organization 
      ? workspace.organization.name 
      : workspace.organization || '',
    category: workspace.category || ''
  });

  // Category options matching workspace creation
  const categoryOptions = ['Finance', 'Marketing', 'IT', 'HR', 'Operations', 'Innovation', 'Design', 'Development', 'Education', 'Customer Service', 'Writing'];
  
  // Determine workspace type
  const workspaceType = workspace.isPersonal ? 'Personal' : 'Team';
  const [permissions, setPermissions] = useState<PermissionConfig[]>([
    {
      role: 'admin',
      permissions: {
        canEdit: true,
        canComment: true,
        canInvite: true,
        canManageSettings: true
      }
    },
    {
      role: 'editor',
      permissions: {
        canEdit: true,
        canComment: true,
        canInvite: true,
        canManageSettings: false
      }
    },
    {
      role: 'viewer',
      permissions: {
        canEdit: false,
        canComment: true,
        canInvite: false,
        canManageSettings: false
      }
    }
  ]);

  const isAdmin = userRole === 'OWNER' || userRole === 'admin';

  const handleSaveWorkspaceInfo = async () => {
    // Only include organization in update if it's a team workspace
    const updateData = {
      name: workspaceInfo.name,
      description: workspaceInfo.description,
      category: workspaceInfo.category,
      ...(workspaceType === 'Team' && { organization: workspaceInfo.organization })
    };
    
    setIsLoading(true);
    try {
      await onWorkspaceUpdate?.(updateData);
      setActiveSection(null);
    } catch (error) {
      console.error('Update failed:', error);
      // Error handling is done in the parent component
    } finally {
      setIsLoading(false);
    }
  };

  const handlePermissionChange = (roleIndex: number, permission: string, value: boolean) => {
    setPermissions(prev => prev.map((config, index) => 
      index === roleIndex 
        ? { 
            ...config, 
            permissions: { ...config.permissions, [permission]: value } 
          }
        : config
    ));
  };

  const renderWorkspaceInformation = () => (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Info className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h4 className="text-lg font-semibold text-gray-900">Workspace Information</h4>
            <p className="text-sm text-gray-500">Update your workspace details and settings</p>
          </div>
        </div>
        
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Workspace Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={workspaceInfo.name}
              onChange={(e) => setWorkspaceInfo(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              disabled={!isAdmin}
              placeholder="Enter workspace name"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Workspace Category <span className="text-gray-400 text-xs">(Optional)</span>
            </label>
            <select
              value={workspaceInfo.category}
              onChange={(e) => setWorkspaceInfo(prev => ({ ...prev, category: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              disabled={!isAdmin}
            >
              <option value="">No category</option>
              {categoryOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description <span className="text-gray-400 text-xs">(Optional)</span>
            </label>
            <textarea
              value={workspaceInfo.description}
              onChange={(e) => setWorkspaceInfo(prev => ({ ...prev, description: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
              disabled={!isAdmin}
              placeholder="Describe what this workspace is for..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Workspace Type
            </label>
            <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700">
              {workspaceType}
            </div>
            <p className="text-xs text-gray-500 mt-1">Workspace type cannot be changed after creation</p>
          </div>
          
          {workspaceType === 'Team' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Organization <span className="text-gray-400 text-xs">(Optional)</span>
              </label>
              <input
                type="text"
                value={workspaceInfo.organization}
                onChange={(e) => setWorkspaceInfo(prev => ({ ...prev, organization: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                disabled={!isAdmin}
                placeholder="Organization or company name"
              />
            </div>
          )}

          {isAdmin && (
            <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
              <Button 
                variant="outline" 
                onClick={() => setActiveSection(null)}
                className="px-4 py-2"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveWorkspaceInfo}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderArchiveWorkspace = () => (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-orange-100 rounded-lg">
            <Archive className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <h4 className="text-lg font-semibold text-gray-900">Archive Workspace</h4>
            <p className="text-sm text-gray-500">Permanently archive this workspace</p>
          </div>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-5">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h5 className="font-semibold text-red-900 mb-2">Warning: This action cannot be undone</h5>
              <p className="text-sm text-red-700 mb-3">
                Archiving this workspace will have the following effects:
              </p>
              <ul className="text-sm text-red-700 space-y-2">
                <li className="flex items-start space-x-2">
                  <div className="h-1.5 w-1.5 bg-red-600 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Hide the workspace from active workspace listings</span>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="h-1.5 w-1.5 bg-red-600 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Move it to the archived workspaces section</span>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="h-1.5 w-1.5 bg-red-600 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Prevent new activities and edits</span>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="h-1.5 w-1.5 bg-red-600 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Preserve all existing content for future reference</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
          <Button 
            variant="outline" 
            onClick={() => setActiveSection(null)}
            className="px-4 py-2"
          >
            Cancel
          </Button>
          
          {!showArchiveConfirm ? (
            <Button 
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white"
              onClick={() => setShowArchiveConfirm(true)}
            >
              <Archive className="h-4 w-4 mr-2" />
              Archive Workspace
            </Button>
          ) : (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-red-700 font-medium">Are you sure?</span>
              <Button 
                variant="outline"
                size="sm"
                onClick={() => setShowArchiveConfirm(false)}
                className="px-2 py-1"
              >
                Cancel
              </Button>
              <Button 
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm"
                disabled={isLoading}
                onClick={async () => {
                  setIsLoading(true);
                  try {
                    await onArchiveWorkspace?.();
                    onClose();
                  } catch (error) {
                    console.error('Archive failed:', error);
                    // Error handling is done in the parent component
                  } finally {
                    setIsLoading(false);
                    setShowArchiveConfirm(false);
                  }
                }}
              >
                {isLoading ? 'Archiving...' : 'Yes, Archive'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderManagePermissions = () => (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Shield className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h4 className="text-lg font-semibold text-gray-900">Manage Permissions</h4>
            <p className="text-sm text-gray-500">Configure what each role can do in this workspace</p>
          </div>
        </div>
        
        <div className="space-y-6">
          {permissions.map((config, index) => (
            <div key={config.role} className="bg-gray-50 border border-gray-200 rounded-lg p-5">
              <div className="flex items-center space-x-3 mb-5">
                <div className={cn(
                  'p-2 rounded-lg',
                  config.role === 'admin' ? 'bg-red-100 text-red-600' :
                  config.role === 'editor' ? 'bg-blue-100 text-blue-600' :
                  'bg-gray-100 text-gray-600'
                )}>
                  {config.role === 'admin' && <Shield className="h-4 w-4" />}
                  {config.role === 'editor' && <Edit className="h-4 w-4" />}
                  {config.role === 'viewer' && <Eye className="h-4 w-4" />}
                </div>
                <div>
                  <h5 className="font-semibold text-gray-900 capitalize">{config.role}</h5>
                  <p className="text-sm text-gray-600">
                    {config.role === 'admin' && 'Full access to workspace and settings'}
                    {config.role === 'editor' && 'Can edit content and collaborate'}
                    {config.role === 'viewer' && 'Can view and comment on content'}
                  </p>
                </div>
              </div>
              
              <div className="space-y-4">
                {[
                  { key: 'canEdit', label: 'Can edit content', description: 'Edit articles, files, and goals' },
                  { key: 'canComment', label: 'Can comment', description: 'Comment on content' },
                  { key: 'canInvite', label: 'Can invite members', description: 'Invite new team members' },
                  { key: 'canManageSettings', label: 'Can manage settings', description: 'Change workspace settings' }
                ].map((permission) => (
                  <div key={permission.key} className="flex items-center justify-between py-2">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{permission.label}</div>
                      <div className="text-xs text-gray-500">{permission.description}</div>
                    </div>
                    <button
                      onClick={() => handlePermissionChange(
                        index, 
                        permission.key, 
                        !config.permissions[permission.key as keyof typeof config.permissions]
                      )}
                      className={cn(
                        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                        config.permissions[permission.key as keyof typeof config.permissions]
                          ? 'bg-blue-600' 
                          : 'bg-gray-200',
                        !isAdmin && 'opacity-50 cursor-not-allowed'
                      )}
                      disabled={!isAdmin}
                    >
                      <span
                        className={cn(
                          'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                          config.permissions[permission.key as keyof typeof config.permissions]
                            ? 'translate-x-6' 
                            : 'translate-x-1'
                        )}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        {isAdmin && (
          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
            <Button 
              variant="outline" 
              onClick={() => setActiveSection(null)}
              className="px-4 py-2"
            >
              Cancel
            </Button>
            <Button 
              onClick={() => setActiveSection(null)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700"
            >
              Save Permissions
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity"
        onClick={onClose} 
      />
      
      {/* Side Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white shadow-xl border-l border-gray-200 transform transition-transform">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Workspace Settings</h2>
              <p className="text-sm text-gray-500 mt-1">
                Manage workspace configuration and personalization
              </p>
            </div>
            <button 
              onClick={onClose}
              className="p-1 rounded-full hover:bg-gray-200 transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {activeSection ? (
              <div className="p-6">
                <button
                  onClick={() => setActiveSection(null)}
                  className="flex items-center text-sm text-blue-600 hover:text-blue-700 mb-6 font-medium"
                >
                  <ChevronRight className="h-4 w-4 mr-1 rotate-180" />
                  Back to Settings
                </button>
                
                {activeSection === 'workspace-info' && renderWorkspaceInformation()}
                {activeSection === 'archive' && renderArchiveWorkspace()}
                {activeSection === 'permissions' && renderManagePermissions()}
              </div>
            ) : (
              <div className="p-6 space-y-8">
                {/* Admin Settings */}
                {isAdmin && (
                  <div>
                    <div className="flex items-center space-x-2 mb-4">
                      <Shield className="h-5 w-5 text-red-600" />
                      <h3 className="text-lg font-semibold text-gray-900">Admin Settings</h3>
                    </div>
                    <div className="space-y-3">
                      <button
                        onClick={() => setActiveSection('workspace-info')}
                        className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Info className="h-4 w-4 text-blue-600" />
                          </div>
                          <div className="text-left">
                            <div className="text-sm font-medium text-gray-900">Workspace Information</div>
                            <div className="text-xs text-gray-500">Edit workspace name, description, and organization</div>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </button>

                      <button
                        onClick={() => setActiveSection('archive')}
                        className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-orange-100 rounded-lg">
                            <Archive className="h-4 w-4 text-orange-600" />
                          </div>
                          <div className="text-left">
                            <div className="text-sm font-medium text-gray-900">Archive Workspace</div>
                            <div className="text-xs text-gray-500">Move workspace to archived section</div>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </button>

                      <button
                        onClick={() => setActiveSection('permissions')}
                        className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-purple-100 rounded-lg">
                            <Shield className="h-4 w-4 text-purple-600" />
                          </div>
                          <div className="text-left">
                            <div className="text-sm font-medium text-gray-900">Manage Permissions</div>
                            <div className="text-xs text-gray-500">Configure rights for Member / Editor / Admin</div>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Personalizations */}
                <div>
                  <div className="flex items-center space-x-2 mb-4">
                    <Users className="h-5 w-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Personalizations</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="p-4 bg-white border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Users className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">Network Policy</div>
                          <div className="text-xs text-gray-500">
                            Configure how new workspace members are added to your network
                          </div>
                        </div>
                      </div>
                      <NetworkPolicySettings
                        workspaceId={workspace.id}
                        workspaceName={workspace.name}
                        isOwner={userRole === 'OWNER'}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default WorkspaceSettingsPanel;