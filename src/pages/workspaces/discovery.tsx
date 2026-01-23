import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Search,
  Filter,
  Clock,
  Users,
  Calendar,
  Building2,
  CheckCircle2,
  XCircle,
  ChevronDown,
  AlertCircle,
  ExternalLink,
  Tag,
  Lock,
  Archive,
  Loader2,
  X,
  Plus,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { FilterSelect } from '../../components/ui/filter-select';
import { EmptyState } from '../../components/ui/empty-state';
import { cn } from '../../lib/utils';
import { useWorkspaces, useCreateWorkspace } from '../../hooks/useWorkspace';
import { Workspace as WorkspaceType } from '../../hooks/useWorkspace';
import { useOrganizations, useCreateOrganization } from '../../hooks/useOrganization';
import { usePendingInvitations, useAcceptInvitation, useDeclineInvitation, WorkspaceInvitation } from '../../hooks/useWorkspaceInvitations';
import { getErrorConsole } from '../../contexts/ErrorConsoleContext';

// Types
interface TeamMember {
  id: string;
  name: string;
  avatar: string;
  position: string;
}

// Remove local interface since we're using the one from the hook

interface WorkspaceDisplay {
  id: string;
  name: string;
  organizationName: string | null;
  teamName?: string | null;
  description: string;
  createdDate: string;
  lastActiveDate: string;
  status: 'active' | 'archived';
  category: string;
  teamSize: number;
  isCreator: boolean;
  isPersonal: boolean;
  teamMembers: TeamMember[];
  tags: string[];
  isRestricted?: boolean;
  isOwner?: boolean;
}

// Transform backend workspace data to display format
const transformWorkspaceData = (workspaces: WorkspaceType[]): WorkspaceDisplay[] => {
  return workspaces.map(workspace => ({
    id: workspace.id,
    name: workspace.name,
    organizationName: workspace.organization?.name || null,
    teamName: null, // Not available from backend yet
    description: workspace.description || '',
    createdDate: workspace.createdAt,
    lastActiveDate: workspace.updatedAt,
    status: workspace.isActive ? 'active' : 'archived',
    category: workspace.organization ? 'Team Workspace' : 'Personal Workspace',
    teamSize: workspace.stats.totalMembers,
    isCreator: workspace.userRole === 'OWNER',
    isPersonal: !workspace.organization,
    teamMembers: [], // Will be populated separately if needed
    tags: [], // Not available from backend yet
    isRestricted: false,
    isOwner: workspace.userRole === 'OWNER'
  }));
};

// Workspace invitations are now fetched from the API

// Filter options
const filterOptions = {
  type: ['All', 'Personal', 'Organization'],
  category: ['All', 'Finance', 'Marketing', 'IT', 'HR', 'Operations', 'Innovation', 'Design', 'Development', 'Education', 'Customer Service', 'Writing'],
  ownership: ['All', 'Created by me', 'Invited to join']
};

// Tab options
type TabType = 'active' | 'archived';

export default function WorkspaceDiscoveryPage() {
  const navigate = useNavigate();
  
  // Fetch workspaces from backend
  const { data: workspaces, isLoading, error } = useWorkspaces();
  const createWorkspaceMutation = useCreateWorkspace();
  const { data: organizations } = useOrganizations();
  const createOrganizationMutation = useCreateOrganization();
  
  // Fetch pending invitations
  const { data: workspaceInvitations = [], isLoading: invitationsLoading, error: invitationsError } = usePendingInvitations();
  const acceptInvitationMutation = useAcceptInvitation();
  const declineInvitationMutation = useDeclineInvitation();
  
  // Debug logging (can be removed in production)
  // console.log('🔍 Workspace Invitations Debug:', { invitationsLoading, count: workspaceInvitations.length });
  
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [showInvitations, setShowInvitations] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [showSearchFilters, setShowSearchFilters] = useState(false);
  const [filters, setFilters] = useState({
    type: 'All',
    category: 'All',
    ownership: 'All'
  });
  const [showCreateSidebar, setShowCreateSidebar] = useState(false);
  const [newWorkspace, setNewWorkspace] = useState({
    name: '',
    type: 'Personal',
    organizationName: '',
    category: '',
    description: '',
  });
  const [formTouched, setFormTouched] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [createError, setCreateError] = useState<string | null>(null);
  
  // Handle escape key to close sidebar
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showCreateSidebar) {
        setShowCreateSidebar(false);
        setCreateError(null);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showCreateSidebar]);

  // Focus management for sidebar
  useEffect(() => {
    if (showCreateSidebar) {
      // Focus the first input when sidebar opens
      const firstInput = document.querySelector('#create-workspace-form input[type="text"]') as HTMLInputElement;
      if (firstInput) {
        setTimeout(() => firstInput.focus(), 100);
      }
    }
  }, [showCreateSidebar]);
  
  // Transform backend data to display format
  const workspaceData = useMemo(() => {
    if (!workspaces) return [];
    return transformWorkspaceData(workspaces);
  }, [workspaces]);

  // Get workspaces by status
  const activeWorkspaces = useMemo(() => {
    // Exclude restricted workspaces from active
    return workspaceData.filter(workspace => workspace.status === 'active' && !workspace.isRestricted);
  }, [workspaceData]);

  const archivedWorkspaces = useMemo(() => {
    // Include all archived and all restricted workspaces
    return workspaceData.filter(workspace => workspace.status === 'archived' || workspace.isRestricted);
  }, [workspaceData]);

  // Filter workspaces based on current filters and search query
  const filteredWorkspaces = useMemo(() => {
    const baseWorkspaces = activeTab === 'active' ? activeWorkspaces : archivedWorkspaces;
    
    return baseWorkspaces.filter(workspace => {
      // Search filter
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = 
          workspace.name.toLowerCase().includes(searchLower) ||
          workspace.description.toLowerCase().includes(searchLower) ||
          workspace.tags.some(tag => tag.toLowerCase().includes(searchLower)) ||
          (workspace.organizationName && workspace.organizationName.toLowerCase().includes(searchLower));
        
        if (!matchesSearch) return false;
      }

      // Type filter
      if (filters.type !== 'All') {
        if (filters.type === 'Personal' && !workspace.isPersonal) return false;
        if (filters.type === 'Organization' && workspace.isPersonal) return false;
      }

      // Category filter
      if (filters.category !== 'All' && workspace.category !== filters.category) {
        return false;
      }

      // Ownership filter
      if (filters.ownership !== 'All') {
        if (filters.ownership === 'Created by me' && !workspace.isCreator) return false;
        if (filters.ownership === 'Invited to join' && workspace.isCreator) return false;
      }

      return true;
    });
  }, [activeTab, activeWorkspaces, archivedWorkspaces, searchQuery, filters]);

  // Handle invitation response
  const handleInvitationResponse = async (invitationId: string, accept: boolean) => {
    try {
      if (accept) {
        await acceptInvitationMutation.mutateAsync(invitationId);
        console.log(`✅ Invitation ${invitationId} accepted successfully`);
        // Navigate to the workspace after successful acceptance
        const invitation = workspaceInvitations.find(inv => inv.id === invitationId);
        if (invitation) {
          navigate(`/workspaces/${invitation.workspaceId}`);
        }
      } else {
        await declineInvitationMutation.mutateAsync(invitationId);
        console.log(`❌ Invitation ${invitationId} declined successfully`);
      }
    } catch (error) {
      console.error(`Failed to ${accept ? 'accept' : 'decline'} invitation:`, error);
    }
  };

  // Check if filters are active
  const areFiltersActive = () => {
    return searchQuery !== '' || 
           filters.type !== 'All' || 
           filters.category !== 'All' || 
           filters.ownership !== 'All';
  };

  // Get the active tab count
  const getTabCount = (tab: TabType) => {
    return tab === 'active' ? activeWorkspaces.length : archivedWorkspaces.length;
  };

  // Validation
  const isTeam = newWorkspace.type === 'Team';
  const isNameValid = newWorkspace.name.trim().length > 0;
  const isFormValid = isNameValid;

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormTouched(true);
    setCreateError(null);
    if (!isFormValid) return;

    try {
      let organizationId;
      
      if (newWorkspace.organizationName) {
        // Check if organization with this name already exists
        const existingOrg = organizations?.find(org => 
          org.name.toLowerCase() === newWorkspace.organizationName.toLowerCase()
        );
        
        if (existingOrg) {
          organizationId = existingOrg.id;
          console.log(`Using existing organization: ${existingOrg.name}`);
        } else {
          // Create new organization
          console.log(`Creating new organization: ${newWorkspace.organizationName}`);
          const orgResponse = await createOrganizationMutation.mutateAsync({
            name: newWorkspace.organizationName,
            description: `Organization for ${newWorkspace.organizationName}`
          });
          organizationId = orgResponse.data.id;
        }
      }
      // If no organization specified, organizationId remains undefined (personal workspace)
      
      const workspaceData = {
        name: newWorkspace.name,
        description: newWorkspace.description || undefined,
        organizationId: organizationId
      };

      console.log('Creating workspace:', workspaceData);
      
      await createWorkspaceMutation.mutateAsync(workspaceData);
      
      // Success - close sidebar and reset form
      setShowCreateSidebar(false);
      setNewWorkspace({ name: '', type: 'Personal', organizationName: '', category: '', description: '' });
      setFormTouched(false);
      setCreateError(null);
      
      console.log('✅ Workspace created successfully!');
    } catch (error: any) {
      console.error('❌ Failed to create workspace:', error);

      // Capture detailed error context for debugging
      const { captureError } = getErrorConsole();
      captureError?.({
        source: 'WorkspaceDiscovery:createWorkspace',
        message: error?.response?.data?.error || error?.message || 'Failed to create workspace',
        severity: 'error',
        details: `Attempted to create workspace "${newWorkspace.name}"`,
        context: {
          workspaceName: newWorkspace.name,
          workspaceType: newWorkspace.type,
          organizationName: newWorkspace.organizationName || 'none (personal)',
          organizationId: organizationId || 'none',
          responseStatus: error?.response?.status,
          responseData: error?.response?.data,
        },
        stack: error?.stack,
      });

      const errorMessage = error?.response?.data?.error || error?.response?.data?.message || error?.message || 'Failed to create workspace';
      setCreateError(errorMessage);
    }
  };

  // Render workspace card
  const renderWorkspaceCard = (workspace: WorkspaceDisplay) => (
    <div
      key={workspace.id}
      className="group relative rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      {/* Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-4 pb-0">
        {/* Personal/Org Badge */}
        <div className="flex items-center gap-2 min-w-0">
          {workspace.isPersonal ? (
            <div className="flex items-center gap-1 rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-800">
              <Lock className="h-3 w-3" />
              Personal
            </div>
          ) : (
            <div className="flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 min-w-0">
              <Building2 className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{workspace.organizationName}</span>
              {workspace.teamName ? <span className="mx-1 flex-shrink-0">&gt;</span> : null}
              {workspace.teamName && <span className="truncate">{workspace.teamName}</span>}
            </div>
          )}
        </div>
        
        {/* Role Badge: Owner / Member / Restricted access */}
        <div className={cn(
          "rounded-full px-2 py-1 text-xs font-medium flex-shrink-0",
          workspace.isRestricted
            ? "bg-red-100 text-red-800"
            : workspace.isCreator
              ? "bg-green-100 text-green-800"
              : "bg-orange-100 text-orange-800"
        )}>
          {workspace.isRestricted
            ? "Restricted access"
            : workspace.isCreator
              ? "Owner"
              : "Member"}
        </div>
      </div>

      <div className="p-4">
        <div className="mb-3">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
            {workspace.name}
          </h3>
          {/* Only show category if it has meaningful info (not generic "Team/Personal Workspace") */}
          {workspace.category && !workspace.category.includes('Workspace') && (
            <p className="text-sm text-gray-500 mt-0.5">
              {workspace.category}
            </p>
          )}
        </div>

        {workspace.description && (
          <div className="mb-4">
            <p className="text-sm text-gray-600 line-clamp-2">
              {workspace.description}
            </p>
          </div>
        )}

        <div className="mb-4 space-y-2">
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Calendar className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">
              <span className="hidden sm:inline">Created: </span>{format(new Date(workspace.createdDate), 'MMM d, yyyy')}
            </span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Clock className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">
              <span className="hidden sm:inline">Last active: </span>{format(new Date(workspace.lastActiveDate), 'MMM d, yyyy')}
            </span>
          </div>
          {!workspace.isPersonal && (
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Users className="h-4 w-4 flex-shrink-0" />
              <span>{workspace.teamSize} <span className="hidden sm:inline">team </span>members</span>
            </div>
          )}
        </div>

        {/* Team Members (only for non-personal workspaces) */}
        {!workspace.isPersonal && workspace.teamMembers.length > 0 && (
          <div className="mb-4">
            <div className="flex -space-x-2">
              {workspace.teamMembers.slice(0, 3).map((member) => (
                <Link
                  key={member.id}
                  to={`/profile/${member.id}`}
                  className="block"
                >
                  <img
                    src={member.avatar}
                    alt={member.name}
                    className="h-8 w-8 rounded-full border-2 border-white hover:border-primary-300 transition-colors cursor-pointer"
                    title={`${member.name} - ${member.position}`}
                  />
                </Link>
              ))}
              {workspace.teamMembers.length > 3 && (
                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gray-100 text-xs font-medium">
                  +{workspace.teamMembers.length - 3}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tags */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {workspace.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800"
              >
                <Tag className="mr-1 h-3 w-3" />
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-6">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate(`/workspaces/${workspace.id}`)}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Open Workspace
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                My Workspaces
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Manage your personal and organization workspaces
              </p>
            </div>
            
          </div>
        </div>

        {/* Workspace Invitations Section */}
        {(workspaceInvitations.length > 0 || invitationsLoading) && (
          <div className="mb-8 rounded-lg border border-amber-200 bg-amber-50 shadow-sm">
            <div 
              className="flex items-center justify-between p-4 sm:p-2 cursor-pointer border-l-4 border-amber-500"
              onClick={() => setShowInvitations(!showInvitations)}
            >
              <div className="flex items-center flex-wrap gap-2">
                <h2 className="text-sm sm:text-base font-semibold text-gray-900">
                  Pending Invitations
                </h2>
{invitationsLoading ? (
                  <div className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                    <Loader2 className="h-3 w-3 animate-spin" />
                  </div>
                ) : (
                  <div className="ml-2 rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-800">
                    {workspaceInvitations.length}
                  </div>
                )}
              </div>
              <ChevronDown className={cn(
                "h-5 w-5 text-gray-500 transition-transform",
                showInvitations ? "transform rotate-180" : ""
              )} />
            </div>

            {showInvitations && (
              <div className="border-t border-gray-200 p-4">
                {invitationsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                    <span className="ml-2 text-gray-500">Loading invitations...</span>
                  </div>
                ) : workspaceInvitations.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No pending invitations</p>
                  </div>
                ) : (
                  workspaceInvitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="rounded-lg border border-gray-200 bg-white p-4 sm:p-6 shadow-sm"
                  >
                    <div className="mb-4">
                      <h3 className="text-base sm:text-lg font-medium text-gray-900">
                        {invitation.workspaceName}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        {invitation.isPersonal ? (
                          <span className="inline-flex items-center gap-1 text-xs text-purple-700">
                            <Lock className="h-3 w-3" />
                            <span className="hidden sm:inline">Personal Workspace</span>
                            <span className="sm:hidden">Personal</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-blue-700">
                            <Building2 className="h-3 w-3" />
                            <span className="truncate max-w-[200px]">{invitation.organizationName}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mb-4">
                      <p className="text-sm text-gray-600">
                        {invitation.description}
                      </p>
                    </div>

                    <div className="mb-4">
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <Users className="h-4 w-4" />
                        <span>Role: {invitation.role}</span>
                      </div>
                      <div className="mt-1 flex items-center space-x-2 text-sm text-gray-500">
                        <Clock className="h-4 w-4" />
                        <span>Expires: {format(new Date(invitation.expirationDate), 'MMM d, yyyy')}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-2 min-w-0 flex-1">
                        <Link to={`/profile/${(invitation.invitedBy as any).id || invitation.invitedBy.name.replace(/\s+/g, '').toLowerCase()}`}>
                          <img
                            src={invitation.invitedBy.avatar}
                            alt={invitation.invitedBy.name}
                            className="h-6 w-6 rounded-full flex-shrink-0 hover:ring-2 hover:ring-primary-300 transition-all cursor-pointer"
                          />
                        </Link>
                        <div className="text-sm min-w-0">
                          <Link 
                            to={`/profile/${(invitation.invitedBy as any).id || invitation.invitedBy.name.replace(/\s+/g, '').toLowerCase()}`}
                            className="font-medium text-gray-900 hover:text-primary-600 truncate block transition-colors"
                          >
                            {invitation.invitedBy.name}
                          </Link>
                          <span className="text-gray-500 text-xs truncate block sm:inline"> 
                            <span className="hidden sm:inline">•</span> {invitation.invitedBy.position}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:space-x-2">
                      <Button
                        className="flex-1"
                        onClick={() => handleInvitationResponse(invitation.id, true)}
                        disabled={acceptInvitationMutation.isPending || declineInvitationMutation.isPending}
                      >
                        {acceptInvitationMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Accepting...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Accept
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleInvitationResponse(invitation.id, false)}
                        disabled={acceptInvitationMutation.isPending || declineInvitationMutation.isPending}
                      >
                        {declineInvitationMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Declining...
                          </>
                        ) : (
                          <>
                            <XCircle className="mr-2 h-4 w-4" />
                            Decline
                          </>
                        )}
                      </Button>
                    </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex -mb-px space-x-4 sm:space-x-8 overflow-x-auto">
            <button
              className={cn(
                "py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap",
                activeTab === 'active'
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
              onClick={() => setActiveTab('active')}
            >
              <span className="flex items-center">
                <span className="hidden sm:inline">Active Workspaces</span>
                <span className="sm:hidden">Active</span>
                <span className="ml-2 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                  {getTabCount('active')}
                </span>
              </span>
            </button>
            <button
              className={cn(
                "py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap",
                activeTab === 'archived'
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
              onClick={() => setActiveTab('archived')}
            >
              <span className="flex items-center">
                <Archive className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Archived Workspaces</span>
                <span className="sm:hidden">Archived</span>
                <span className="ml-2 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                  {getTabCount('archived')}
                </span>
              </span>
            </button>
          </div>
          {/* Create Workspace button */}
          <div className="flex justify-end sm:justify-start">
            <button
                className="ml-2 px-3 py-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                title="Create new workspace"
                aria-label="Create new workspace"
                onClick={() => setShowCreateSidebar(true)}
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">New Workspace</span>
              </button>
          </div>
        </div>

        {/* Search and Filters - Expandable */}
        {showSearchFilters && (
          <div className="mb-8 space-y-4">
            <div className="flex flex-col gap-4">
              {/* Search */}
              <div className="w-full">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search workspaces..."
                    className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2 focus:border-primary-500 focus:ring-primary-500"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Filters:</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <FilterSelect
                  id="filter-type"
                  label="Type"
                  value={filters.type}
                  options={filterOptions.type}
                  onChange={(value) => setFilters({ ...filters, type: value })}
                />
                <FilterSelect
                  id="filter-category"
                  label="Category"
                  value={filters.category}
                  options={filterOptions.category}
                  onChange={(value) => setFilters({ ...filters, category: value })}
                />
                <FilterSelect
                  id="filter-ownership"
                  label="Ownership"
                  value={filters.ownership}
                  options={filterOptions.ownership}
                  onChange={(value) => setFilters({ ...filters, ownership: value })}
                />
              </div>
            </div>
          </div>
        )}

        {/* Results Summary with Search/Filter Toggle and View Mode */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="text-sm text-gray-600">
            Showing {filteredWorkspaces.length} {activeTab} {filteredWorkspaces.length === 1 ? 'workspace' : 'workspaces'}
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowSearchFilters(!showSearchFilters)}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Search & Filter</span>
              <span className="sm:hidden">Filter</span>
              {areFiltersActive() && (
                <span className="ml-1 rounded-full bg-primary-500 px-2 py-0.5 text-xs text-white">
                  {[searchQuery !== '', filters.type !== 'All', filters.category !== 'All', filters.ownership !== 'All'].filter(Boolean).length}
                </span>
              )}
              <ChevronDown className={cn("h-4 w-4 transition-transform", showSearchFilters && "rotate-180")} />
            </button>

            {/* View Toggle 
            <div className="flex items-center rounded-full bg-gray-100 p-0.5 shadow-sm">
              <button
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200",
                  viewMode === 'grid'
                    ? "bg-primary-500 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                )}
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200",
                  viewMode === 'list'
                    ? "bg-primary-500 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                )}
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </button>
            </div>*/}
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            <span className="ml-2 text-gray-500">Loading workspaces...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-red-300 p-12 text-center">
            <AlertCircle className="h-12 w-12 text-red-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading workspaces</h3>
            <p className="mt-1 text-sm text-gray-500">
              Unable to load workspaces. Please try again.
            </p>
          </div>
        )}

        {/* Workspaces Display */}
        {!isLoading && !error && (
          filteredWorkspaces.length > 0 ? (
            <div className={cn(
              "grid gap-4 sm:gap-6",
              viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
            )}>
              {filteredWorkspaces.map(workspace => renderWorkspaceCard(workspace))}
            </div>
          ) : (
            {areFiltersActive() ? (
              <EmptyState
                variant="no-results"
                title="No workspaces found"
                description={activeTab === 'active'
                  ? "No active workspaces match your filters"
                  : "No archived workspaces match your filters"
                }
                action={{
                  label: "Clear all filters",
                  onClick: () => {
                    setSearchQuery('');
                    setFilters({ type: 'All', category: 'All', ownership: 'All' });
                  }
                }}
              />
            ) : (
              <EmptyState
                variant="no-workspaces"
                title={activeTab === 'active' ? "Create your first workspace" : "No archived workspaces"}
                description={activeTab === 'active'
                  ? "Workspaces help you organize your journal entries, collaborate with teams, and track your professional growth."
                  : "Workspaces you archive will appear here. You can archive workspaces you're no longer actively using."
                }
                action={activeTab === 'active' ? {
                  label: "Create Workspace",
                  onClick: () => setShowCreateSidebar(true),
                  icon: Plus
                } : undefined}
              />
            )}
          )
        )}

        {/* Sidebar for creating workspace */}
        <>
          {/* Backdrop */}
          <div 
            className={cn(
              "fixed inset-0 z-40 bg-black transition-opacity duration-300",
              showCreateSidebar ? "bg-opacity-30" : "bg-opacity-0 pointer-events-none"
            )}
            onClick={() => setShowCreateSidebar(false)}
          />
          
          {/* Sidebar */}
          <div className={cn(
            "fixed inset-y-0 right-0 z-50 w-full sm:w-96 max-w-md bg-white shadow-xl transform transition-transform duration-300 ease-in-out",
            showCreateSidebar ? "translate-x-0" : "translate-x-full"
          )}>
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Create New Workspace</h2>
                  <button
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    onClick={() => {
                      setShowCreateSidebar(false);
                      setCreateError(null);
                    }}
                    aria-label="Close"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                  {/* Error Message */}
                  {createError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="text-sm text-red-700">{createError}</div>
                    </div>
                  )}
                  
              <form id="create-workspace-form" onSubmit={handleCreateWorkspace} className="space-y-6">
                {/* Workspace Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Workspace Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className={cn(
                      "w-full rounded-lg border px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500",
                      !isNameValid && formTouched ? "border-red-500" : "border-gray-300"
                    )}
                    value={newWorkspace.name}
                    onChange={e => setNewWorkspace({ ...newWorkspace, name: e.target.value })}
                    required
                  />
                  {!isNameValid && formTouched && (
                    <div className="text-xs text-red-500 mt-1">Workspace name is required.</div>
                  )}
                </div>
                {/* Workspace Category (optional) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Workspace Category <span className="text-gray-400">(optional)</span>
                  </label>
                  <select
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
                    value={newWorkspace.category}
                    onChange={e => setNewWorkspace({ ...newWorkspace, category: e.target.value })}
                  >
                    <option value="">No category</option>
                    {filterOptions.category.filter(opt => opt !== 'All').map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
                {/* Workspace Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Workspace Description <span className="text-gray-400">(optional)</span>
                  </label>
                  <textarea
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
                    value={newWorkspace.description}
                    onChange={e => setNewWorkspace({ ...newWorkspace, description: e.target.value })}
                    rows={3}
                    placeholder="Describe the purpose and scope of this workspace..."
                  />
                </div>
                {/* Workspace Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Workspace Type <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-3">
                    <label className={cn(
                      "flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer",
                      newWorkspace.type === 'Personal' ? "border-primary-500 bg-primary-50" : "border-gray-300"
                    )}>
                      <input
                        type="radio"
                        name="workspace-type"
                        value="Personal"
                        checked={newWorkspace.type === 'Personal'}
                        onChange={() => setNewWorkspace({ ...newWorkspace, type: 'Personal', organizationName: '' })}
                        className="mt-0.5"
                      />
                      <div>
                        <div className="font-medium text-sm">Personal</div>
                        <div className="text-xs text-gray-500">For individual projects and tasks</div>
                      </div>
                    </label>
                    <label className={cn(
                      "flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer",
                      newWorkspace.type === 'Team' ? "border-primary-500 bg-primary-50" : "border-gray-300"
                    )}>
                      <input
                        type="radio"
                        name="workspace-type"
                        value="Team"
                        checked={newWorkspace.type === 'Team'}
                        onChange={() => setNewWorkspace({ ...newWorkspace, type: 'Team' })}
                        className="mt-0.5"
                      />
                      <div>
                        <div className="font-medium text-sm">Team</div>
                        <div className="text-xs text-gray-500">For collaborative projects with colleagues</div>
                      </div>
                    </label>
                  </div>
                </div>
                {/* Organisation Name (if Team) */}
                {isTeam && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Organisation Name <span className="text-gray-400">(optional)</span>
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
                      value={newWorkspace.organizationName}
                      onChange={e => setNewWorkspace({ ...newWorkspace, organizationName: e.target.value })}
                    />
                  </div>
                )}
              </form>
                </div>
                
                {/* Footer */}
                <div className="border-t border-gray-200 p-6">
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setShowCreateSidebar(false);
                        setCreateError(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      className="flex-1"
                      disabled={!isFormValid || createWorkspaceMutation.isPending}
                      form="create-workspace-form"
                    >
                      {createWorkspaceMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        'Create Workspace'
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
        </>
      </div>
    </div>
  );
}