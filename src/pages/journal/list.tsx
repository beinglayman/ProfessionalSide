import React, { useState, useMemo, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import {
  Search,
  Filter,
  Grid,
  List,
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
  ChevronRight,
  UserCircle,
  Lock,
  Archive,
  Plus,
  Paperclip,
  Eye,
  EyeOff,
  Globe,
  Shield,
  FileText,
  Code,
  Image,
  BarChart,
  MessageSquare,
  ThumbsUp,
  UserCheck,
  Briefcase,
  Award,
  Target,
  Link2,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Heart,
  DollarSign,
  Settings,
  Star,
  MoreVertical,
  Upload,
  Download,
  RepeatIcon,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { ConfirmationDialog } from '../../components/ui/confirmation-dialog';
import { cn } from '../../lib/utils';
import { NewEntryModal } from '../../components/new-entry/new-entry-modal';
import { JournalCard } from '../../components/journal/journal-card';
import { RechronicleCard } from '../../components/journal/rechronicle-card';
import { RechronicleSidePanel } from '../../components/journal/rechronicle-side-panel';
import JournalEnhanced from '../../components/format7/journal-enhanced';
import { JournalEntry } from '../../types/journal';
import { useJournalEntries, useUserFeed, useToggleAppreciate, useToggleLike, useRechronicleEntry, useDeleteJournalEntry } from '../../hooks/useJournal';
import { useQueryClient } from '@tanstack/react-query';
import { JournalService } from '../../services/journal.service';
import { profileApiService } from '../../services/profile-api.service';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspaces } from '../../hooks/useWorkspace';
import { isDemoMode } from '../../services/demo-mode.service';
import { runDemoSync, runLiveSync, SyncState, SyncResult } from '../../services/sync.service';
import { SyncProgressModal } from '../../components/sync/SyncProgressModal';
import { ActivityViewTabs, ActivityViewType } from '../../components/journal/activity-view-tabs';
import { ActivityStream } from '../../components/journal/activity-stream';
import { useActivities, isGroupedResponse } from '../../hooks/useActivities';
import { GroupedActivitiesResponse } from '../../types/activity';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { EnhancingIndicator } from '../../components/ui/enhancing-indicator';
import { useNarrativePolling } from '../../hooks/useNarrativePolling';
import { useSSE } from '../../hooks/useSSE';

// Page Props interface
interface JournalPageProps {}

export default function JournalPage() {
  useDocumentTitle('Activity');
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'workspace' | 'network'>('workspace');
  const [entryViewModes, setEntryViewModes] = useState<Record<string, 'workspace' | 'network'>>({});
  const [searchQuery, setSearchQuery] = useState('');

  // Activity stream view state
  const [activityView, setActivityView] = useState<ActivityViewType>('timeline');

  // Toggle view mode for individual entry
  const toggleEntryViewMode = (entryId: string) => {
    setEntryViewModes(prev => ({
      ...prev,
      [entryId]: prev[entryId] === 'workspace' ? 'network' : 'workspace'
    }));
  };
  const [selectedWorkspace, setSelectedWorkspace] = useState('all');
  const [showViewToggleTooltip, setShowViewToggleTooltip] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState<'recent' | 'popular'>('recent');
  const [showSearchFilters, setShowSearchFilters] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showNewEntryModal, setShowNewEntryModal] = useState(false);
  const [openPublishMenus, setOpenPublishMenus] = useState<Set<string>>(new Set());
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [openAnalytics, setOpenAnalytics] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; journalId: string | null }>({
    open: false,
    journalId: null,
  });
  const [rechronicleSidePanel, setRechronicleSidePanel] = useState<{
    open: boolean;
    journal: JournalEntry | null;
  }>({ open: false, journal: null });
  const [onboardingProfileImage, setOnboardingProfileImage] = useState<string | null>(null);

  // Sync modal state
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncState, setSyncState] = useState<SyncState | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  /**
   * True while LLM narratives are being generated in the background.
   * Set after sync completes, cleared when SSE sends narratives-complete or polling times out.
   * Used to show EnhancingIndicator in header and on story cards.
   */
  const [narrativesGenerating, setNarrativesGenerating] = useState(false);

  // Regenerate narrative state
  const [regeneratingEntryId, setRegeneratingEntryId] = useState<string | null>(null);

  // Connect to SSE for real-time updates from backend
  // SSE automatically invalidates queries when data changes
  useSSE({
    enabled: true,
    onNarrativesComplete: () => {
      console.log('[Journal] SSE: All narratives complete');
      setNarrativesGenerating(false);
    },
    onDataChanged: (data) => {
      console.log('[Journal] SSE: Data changed', data);
      // SSE hook already invalidates queries, this callback is for extra handling
    },
  });

  // Fallback polling for narrative completion (in case SSE disconnects)
  // This hook handles interval setup, cleanup, and timeout automatically
  useNarrativePolling({
    isGenerating: narrativesGenerating,
    onPollingComplete: () => setNarrativesGenerating(false),
  });

  // Listen for external data changes to refresh (browser events, not SSE)
  useEffect(() => {
    const handleDataChanged = () => {
      console.log('[Journal] Browser event: Data changed, invalidating queries...');
      // Invalidate to mark as stale (bypasses staleTime), React Query will refetch active ones
      queryClient.invalidateQueries({ queryKey: ['journal'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    };

    window.addEventListener('journal-data-changed', handleDataChanged);
    return () => window.removeEventListener('journal-data-changed', handleDataChanged);
  }, [queryClient]);

  // Fetch journal entries from backend first (without workspace validation)
  const baseQueryParams = useMemo(() => ({
    search: searchQuery || undefined,
    workspaceId: selectedWorkspace !== 'all' ? selectedWorkspace : undefined,
    category: selectedCategory !== 'all' ? selectedCategory : undefined,
    sortBy: (sortBy === 'recent' ? 'createdAt' : 'likes') as 'createdAt' | 'likes',
    sortOrder: 'desc' as const,
    page: 1,
    limit: 100, // Increase limit to get more entries
  }), [searchQuery, selectedWorkspace, selectedCategory, sortBy]);

  const { data, isLoading, isError, error } = useUserFeed(baseQueryParams);
  const { data: userWorkspaces, isLoading: workspacesLoading } = useWorkspaces();

  // Fetch activities for the stream view - maps activityView to API groupBy param
  const activityGroupBy = activityView === 'timeline' ? 'temporal' : activityView;
  const {
    data: activitiesData,
    isLoading: activitiesLoading,
    error: activitiesError
  } = useActivities({ groupBy: activityGroupBy, limit: 100 });
  const toggleAppreciateMutation = useToggleAppreciate();
  const toggleLikeMutation = useToggleLike();
  const rechronicleMutation = useRechronicleEntry();
  const deleteMutation = useDeleteJournalEntry();

  // Load profile image from profile service
  useEffect(() => {
    const loadProfileImage = async () => {
      try {
        console.log('🔄 Journal: Loading profile data for avatar...');
        const profileData = await profileApiService.getProfile();
        console.log('📊 Journal: Profile data received:', {
          avatar: profileData.avatar,
          hasOnboardingData: !!profileData.onboardingData
        });
        
        if (profileData.avatar) {
          setOnboardingProfileImage(profileData.avatar);
        }
      } catch (error) {
        console.error('❌ Journal: Failed to load profile image:', error);
      }
    };

    loadProfileImage();

    // Listen for profile data changes
    const handleProfileDataChange = () => {
      loadProfileImage();
    };

    window.addEventListener('onboardingDataChanged', handleProfileDataChange);
    window.addEventListener('profileUpdated', handleProfileDataChange);

    return () => {
      window.removeEventListener('onboardingDataChanged', handleProfileDataChange);
      window.removeEventListener('profileUpdated', handleProfileDataChange);
    };
  }, []);


  // Handle appreciate toggle
  const handleAppreciate = async (entryId: string) => {
    console.log('🤍 handleAppreciate called for entry:', entryId);
    console.log('🤍 Current mutation state:', {
      isLoading: toggleAppreciateMutation.isPending,
      isError: toggleAppreciateMutation.isError,
      error: toggleAppreciateMutation.error
    });

    try {
      console.log('🤍 Calling toggleAppreciateMutation.mutateAsync...');
      const result = await toggleAppreciateMutation.mutateAsync(entryId);
      console.log('✅ Appreciate toggled successfully, result:', result);
    } catch (error) {
      console.error('❌ Failed to toggle appreciate:', error);
      // Show user-friendly error
      if (error instanceof Error) {
        alert(`Failed to appreciate entry: ${error.message}`);
      }
    }
  };

  // Handle like toggle
  const handleLike = async (entryId: string) => {
    console.log('❤️ handleLike called for entry:', entryId);

    try {
      const result = await toggleLikeMutation.mutateAsync(entryId);
      console.log('✅ Like toggled successfully, result:', result);
    } catch (error) {
      console.error('❌ Failed to toggle like:', error);
      if (error instanceof Error) {
        alert(`Failed to like entry: ${error.message}`);
      }
    }
  };

  // Get the actual journal entries from the API response
  const rawJournals = data?.entries || [];
  
  // Update journal entries with onboarding profile image for current user's posts
  const journals = useMemo(() => {
    if (!onboardingProfileImage || !user) return rawJournals;
    
    return rawJournals.map(journal => {
      let updatedJournal = { ...journal };
      
      // Update author avatar if this is the current user
      if (journal.author.name === user.name) {
        updatedJournal.author = {
          ...journal.author,
          avatar: onboardingProfileImage
        };
      }
      
      // Update collaborators avatars if current user is a collaborator
      if (journal.collaborators?.length > 0) {
        updatedJournal.collaborators = journal.collaborators.map(collaborator => {
          if (collaborator.name === user.name) {
            return {
              ...collaborator,
              avatar: onboardingProfileImage
            };
          }
          return collaborator;
        });
      }
      
      // Update reviewers avatars if current user is a reviewer
      if (journal.reviewers?.length > 0) {
        updatedJournal.reviewers = journal.reviewers.map(reviewer => {
          if (reviewer.name === user.name) {
            return {
              ...reviewer,
              avatar: onboardingProfileImage
            };
          }
          return reviewer;
        });
      }
      
      // Update rechronicled by avatar if current user rechronicled
      if (journal.rechronicledBy?.name === user.name) {
        updatedJournal.rechronicledBy = {
          ...journal.rechronicledBy,
          avatar: onboardingProfileImage
        };
      }
      
      // Update discussions avatars if current user is a discussion author
      if (journal.discussions?.length > 0) {
        updatedJournal.discussions = journal.discussions.map(discussion => {
          if (discussion.author.name === user.name) {
            return {
              ...discussion,
              author: {
                ...discussion.author,
                avatar: onboardingProfileImage
              }
            };
          }
          return discussion;
        });
      }
      
      return updatedJournal;
    });
  }, [rawJournals, onboardingProfileImage, user]);

  // Close publish menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('[data-publish-menu]')) {
        setOpenPublishMenus(new Set());
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Get workspaces from user's actual memberships (not derived from journal entries)
  // This prevents phantom workspaces from appearing when entries exist for workspaces
  // the user is no longer a member of
  const workspaces = useMemo(() => {
    if (!userWorkspaces || userWorkspaces.length === 0) {
      return [];
    }
    return userWorkspaces.map(ws => ({
      id: ws.id,
      name: ws.name,
      isPersonal: !ws.organization
    }));
  }, [userWorkspaces]);

  // Reset workspace filter if the selected workspace doesn't exist
  useEffect(() => {
    if (selectedWorkspace !== 'all' && workspaces.length > 0 && !isLoading && !workspacesLoading) {
      const workspaceExists = workspaces.some(ws => ws.id === selectedWorkspace);
      if (!workspaceExists) {
        console.warn('⚠️ Selected workspace not found, resetting to "all":', selectedWorkspace);
        setSelectedWorkspace('all');
      }
    }
  }, [selectedWorkspace, workspaces, isLoading, workspacesLoading]);

  // Debug: Log API data and filtering
  React.useEffect(() => {
    console.log('📊 Journal List Debug:', {
      isLoading,
      hasData: !!data,
      totalEntries: journals.length,
      viewMode,
      baseQueryParams,
      selectedWorkspace,
      workspaces: workspaces.map(w => ({ id: w.id, name: w.name }))
    });
    if (journals.length > 0) {
      console.log('📊 Sample entries:', journals.slice(0, 3).map(j => ({
        id: j.id,
        title: j.title,
        visibility: j.visibility,
        isPublished: j.isPublished,
        workspaceId: j.workspaceId,
        appreciates: j.appreciates,
        hasAppreciated: j.hasAppreciated
      })));
    }
    if (isError) {
      console.error('❌ Journal API Error:', {
        error: error?.message,
        baseQueryParams,
        selectedWorkspace
      });
    }
  }, [journals, viewMode, isLoading, data, isError, error, selectedWorkspace, workspaces, baseQueryParams]);

  // Get unique skills and categories
  const allSkills = useMemo(() => {
    const skills = new Set<string>();
    journals.forEach(journal => {
      journal.skills.forEach(skill => skills.add(skill));
    });
    return Array.from(skills).sort();
  }, [journals]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    journals.forEach(journal => cats.add(journal.category));
    return Array.from(cats).sort();
  }, [journals]);

  // Filter journals
  const filteredJournals = useMemo(() => {
    console.log(`🔍 Filtering ${journals.length} journals for viewMode: ${viewMode}`);

    const filtered = journals.filter(journal => {
      // Exclude auto-generated entries - they should only appear on workspace page
      if (journal.tags?.includes('auto-generated')) {
        console.log(`❌ Excluding "${journal.title}" from journal list (auto-generated)`);
        return false;
      }
      // In network view, only show entries with visibility='network' or generateNetworkEntry=true
      if (viewMode === 'network' && !journal.generateNetworkEntry && journal.visibility !== 'network') {
        console.log(`❌ Excluding "${journal.title}" from network view (visibility: ${journal.visibility})`);
        return false;
      }
      // Search filter
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = 
          journal.title.toLowerCase().includes(searchLower) ||
          journal.description.toLowerCase().includes(searchLower) ||
          journal.tags.some(tag => tag.toLowerCase().includes(searchLower)) ||
          journal.skills.some(skill => skill.toLowerCase().includes(searchLower));
        if (!matchesSearch) return false;
      }
      // Workspace filter
      if (selectedWorkspace !== 'all' && journal.workspaceId !== selectedWorkspace) {
        return false;
      }
      // Category filter
      if (selectedCategory !== 'all' && journal.category !== selectedCategory) {
        return false;
      }
      // Skills filter
      if (selectedSkills.length > 0) {
        const hasSelectedSkill = selectedSkills.some(skill => 
          journal.skills.includes(skill)
        );
        if (!hasSelectedSkill) return false;
      }
      return true;
    });
    
    console.log(`✅ Filtered result: ${filtered.length} journals after filtering`);
    return filtered;
  }, [journals, viewMode, searchQuery, selectedWorkspace, selectedCategory, selectedSkills]);

  // Sort journals
  const sortedJournals = useMemo(() => {
    const sorted = [...filteredJournals];
    if (sortBy === 'recent') {
      sorted.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      });
    } else {
      sorted.sort((a, b) => (b._count?.likes || 0) - (a._count?.likes || 0));
    }
    return sorted;
  }, [filteredJournals, sortBy]);

  // Toggle skill selection
  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev => 
      prev.includes(skill) 
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    );
  };

  // Toggle publish menu
  const togglePublishMenu = (journalId: string) => {
    setOpenPublishMenus(prev => {
      const newSet = new Set(prev);
      if (newSet.has(journalId)) {
        newSet.delete(journalId);
      } else {
        newSet.add(journalId);
      }
      return newSet;
    });
  };

  // Handle delete entry - opens confirmation dialog
  const handleDeleteEntry = (journalId: string) => {
    // Close menu first, then open confirmation dialog
    setOpenPublishMenus(prev => {
      const newSet = new Set(prev);
      newSet.delete(journalId);
      return newSet;
    });
    setDeleteConfirm({ open: true, journalId });
  };

  // Perform actual deletion after confirmation
  const confirmDeleteEntry = async () => {
    const journalId = deleteConfirm.journalId;
    if (!journalId) return;

    try {
      console.log('🗑️ Deleting journal:', { journalId, isDemoMode: isDemoMode() });
      await deleteMutation.mutateAsync(journalId);
      setToastMessage('Journal entry deleted successfully');
    } catch (error: any) {
      const errorMessage = error?.message || error?.response?.data?.error || 'Unknown error';
      console.error('❌ Failed to delete journal:', { journalId, error: errorMessage });
      setToastMessage(`Failed to delete: ${errorMessage}`);
    }
  };

  // Handle regenerate narrative
  const handleRegenerateNarrative = async (journalId: string) => {
    setRegeneratingEntryId(journalId);
    // Close menu
    setOpenPublishMenus(prev => {
      const newSet = new Set(prev);
      newSet.delete(journalId);
      return newSet;
    });

    try {
      console.log('🔄 Regenerating narrative:', { journalId, isDemoMode: isDemoMode() });
      await JournalService.regenerateNarrative(journalId, 'professional');
      setToastMessage('Narrative regenerated successfully');
      // Force refetch to update UI
      queryClient.refetchQueries({ queryKey: ['journal', 'feed'] });
      queryClient.refetchQueries({ queryKey: ['activities'] });
    } catch (error: any) {
      const errorMessage = error?.message || error?.response?.data?.error || 'Unknown error';
      console.error('❌ Failed to regenerate narrative:', { journalId, error: errorMessage });
      setToastMessage(`Failed to regenerate: ${errorMessage}`);
    } finally {
      setRegeneratingEntryId(null);
    }
  };

  // Handle visibility toggle (share to network / unshare)
  const handlePublishToggle = async (journal: JournalEntry) => {
    try {
      if (journal.visibility === 'network') {
        // Unshare - set visibility back to workspace
        await JournalService.publishJournalEntry(journal.id, {
          visibility: 'workspace'
        });
        setToastMessage('Entry unpublished successfully');
      } else {
        // Publish - set visibility to network
        await JournalService.publishJournalEntry(journal.id, {
          visibility: 'network',
          abstractContent: journal.abstractContent || journal.description
        });
        setToastMessage('Entry published to network successfully');
      }

      // Refetch entries to update UI
      queryClient.refetchQueries({ queryKey: ['journal', 'feed'] });
    } catch (error) {
      setToastMessage('Failed to update entry');
      console.error('Publish toggle error:', error);
    }

    // Close the menu
    setOpenPublishMenus(prev => {
      const newSet = new Set(prev);
      newSet.delete(journal.id);
      return newSet;
    });
  };

  // Auto-hide toast message
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // ReChronicle handler
  const handleReChronicle = async (journalId: string, comment?: string) => {
    console.log('🔄 handleReChronicle called for entry:', journalId, 'with comment:', comment);
    console.log('🔄 Current mutation state:', {
      isLoading: rechronicleMutation.isPending,
      isError: rechronicleMutation.isError,
      error: rechronicleMutation.error
    });
    
    try {
      console.log('🔄 Calling rechronicleMutation.mutateAsync...');
      const result = await rechronicleMutation.mutateAsync({ id: journalId, comment });
      console.log('✅ ReChronicle toggled successfully, result:', result);
      
      // Show success message
      setToastMessage(comment ? 'Entry rechronicled with your comment!' : 'Entry rechronicled!');
    } catch (error) {
      console.error('❌ Failed to ReChronicle entry:', error);
      // Show user-friendly error
      if (error instanceof Error) {
        alert(`Failed to ReChronicle entry: ${error.message}`);
      }
    }
  };

  // Open ReChronicle side panel
  const handleOpenReChronicle = (journal: JournalEntry) => {
    setRechronicleSidePanel({ open: true, journal });
  };

  // Close ReChronicle side panel
  const handleCloseReChronicle = () => {
    setRechronicleSidePanel({ open: false, journal: null });
  };

  // Handle sync button click
  const handleSync = async () => {
    console.log('[Journal] handleSync called, isDemoMode:', isDemoMode());
    if (isDemoMode()) {
      // Demo mode: run simulated sync
      console.log('[Journal] Starting demo sync...');
      setIsSyncing(true);
      setSyncState(null);
      setShowSyncModal(true);

      await runDemoSync({
        onStateUpdate: setSyncState,
        onComplete: (result: SyncResult) => {
          setIsSyncing(false);
          // Enable enhancing indicator - narratives generate in background
          // Polling is handled by useNarrativePolling hook
          setNarrativesGenerating(true);
        },
        onError: (error) => {
          console.error('Sync failed:', error);
          setIsSyncing(false);
          setShowSyncModal(false);
        },
      });
    } else {
      // Live mode: run real sync
      console.log('[Journal] Starting live sync...');
      setIsSyncing(true);
      setSyncState(null);
      setShowSyncModal(true);

      await runLiveSync({
        onStateUpdate: setSyncState,
        onComplete: () => {
          setIsSyncing(false);
          // Enable enhancing indicator - narratives generate in background
          // Polling is handled by useNarrativePolling hook
          setNarrativesGenerating(true);
        },
        onError: (error) => {
          console.error('Live sync failed:', error);
          setIsSyncing(false);
          setShowSyncModal(false);
          setToastMessage(`Sync failed: ${error.message}`);
        },
      });
    }
  };

  const handleSyncComplete = () => {
    console.log('[Journal] handleSyncComplete called');
    setShowSyncModal(false);
    // Navigate to Story tab to show enhancing animation
    setActivityView('story');
    // Invalidate all queries to force fresh fetch (bypasses staleTime)
    queryClient.invalidateQueries({ queryKey: ['journal'] });
    queryClient.invalidateQueries({ queryKey: ['activities'] });
  };

  // Toggle analytics section
  const toggleAnalytics = (journalId: string) => {
    setOpenAnalytics(prev => {
      const newSet = new Set(prev);
      if (newSet.has(journalId)) {
        newSet.delete(journalId);
      } else {
        newSet.add(journalId);
      }
      return newSet;
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-12">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="min-h-screen bg-gray-50 pb-12">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
              <div>
                <h3 className="text-sm font-medium text-red-800">
                  Unable to load journal entries
                </h3>
                <div className="text-sm text-red-700 mt-1">
                  {error?.message}
                  {selectedWorkspace !== 'all' && (
                    <div className="mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedWorkspace('all')}
                        className="text-red-600 border-red-200 hover:bg-red-100"
                      >
                        View All Workspaces
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render journal card or rechronicle card based on entry type
  const renderJournalCard = (journal: JournalEntry) => {
    // If it's a rechronicle, render RechronicleCard
    if (journal.isRechronicle) {
      return (
        <div key={journal.id}>
          <RechronicleCard
            entry={journal}
            viewMode={viewMode}
            showPublishMenu={openPublishMenus.has(journal.id)}
            onPublishToggle={handlePublishToggle}
            onDeleteEntry={handleDeleteEntry}
            onAppreciate={() => handleAppreciate(journal.id)}
            onReChronicle={handleReChronicle}
            onToggleAnalytics={toggleAnalytics}
            onTogglePublishMenu={togglePublishMenu}
            isAnalyticsOpen={openAnalytics.has(journal.id)}
            showUserProfile={false}
            isRechronicleLoading={rechronicleMutation.isPending}
          />

          {openPublishMenus.has(journal.id) && (
            <div
              className="fixed inset-0 z-5"
              onClick={() => togglePublishMenu(journal.id)}
            />
          )}
        </div>
      );
    }

    // If it has valid format7Data with entry_metadata, render JournalEnhanced
    if (journal.format7Data?.entry_metadata?.title) {
      // Use network view data when in network mode, fallback to workspace view
      const entryData = viewMode === 'network' && journal.format7DataNetwork
        ? journal.format7DataNetwork
        : journal.format7Data;
      const isDraft = journal.visibility !== 'network'; // Not yet shared to network
      const isOwner = user && journal.author.id === user.id;
      return (
        <div key={journal.id}>
          <JournalEnhanced
            entry={entryData}
            workspaceName={journal.workspaceName}
            onAppreciate={() => handleAppreciate(journal.id)}
            correlations={entryData?.correlations}
            categories={entryData?.categories}
            isDraft={isDraft}
            onPublish={isDraft && isOwner ? () => handlePublishToggle(journal) : undefined}
          />
        </div>
      );
    }

    // Otherwise, render regular JournalCard
    // Check if entry has both workspace and network views (published to network)
    const hasMultipleVisibilities = !!(journal.abstractContent && journal.visibility === 'network');
    const currentViewMode = entryViewModes[journal.id] || 'workspace';

    return (
      <div key={journal.id}>
        <JournalCard
          journal={journal}
          viewMode={currentViewMode}
          hasMultipleVisibilities={hasMultipleVisibilities}
          onToggleViewMode={hasMultipleVisibilities ? () => toggleEntryViewMode(journal.id) : undefined}
          showPublishMenu={openPublishMenus.has(journal.id)}
          onPublishToggle={handlePublishToggle}
          onDeleteEntry={handleDeleteEntry}
          onRegenerateNarrative={handleRegenerateNarrative}
          onAppreciate={() => handleAppreciate(journal.id)}
          onReChronicle={() => handleOpenReChronicle(journal)}
          onToggleAnalytics={toggleAnalytics}
          onTogglePublishMenu={togglePublishMenu}
          isAnalyticsOpen={openAnalytics.has(journal.id)}
          showUserProfile={false}
          isRechronicleLoading={rechronicleMutation.isPending}
          isRegenerateLoading={regeneratingEntryId === journal.id}
        />

        {openPublishMenus.has(journal.id) && (
          <div
            className="fixed inset-0 z-5"
            onClick={() => togglePublishMenu(journal.id)}
          />
        )}
      </div>
    );
  };

  // Get activity count for display
  const activityCount = activitiesData && isGroupedResponse(activitiesData)
    ? activitiesData.pagination.total
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Compact Header: Tabs + Count + Actions in one row */}
        <div className="flex items-center justify-between gap-4 mb-5">
          {/* Left: Tabs with integrated count */}
          <div className="flex items-center gap-4">
            <ActivityViewTabs
              activeView={activityView}
              onViewChange={setActivityView}
            />
            {activityCount > 0 && (
              <span className="text-sm text-gray-400">
                {activityCount} activities
              </span>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Background narrative generation indicator */}
            {narrativesGenerating && (
              <EnhancingIndicator variant="inline" text="Enhancing stories..." className="bg-primary-50/80 px-3 py-1.5 rounded-full border border-primary-200" />
            )}

            <Button
              variant="ghost"
              size="sm"
              className="text-gray-600 hover:text-gray-900"
              onClick={handleSync}
              disabled={isSyncing}
            >
              <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
            </Button>

            <Button
              size="sm"
              className="bg-primary-600 hover:bg-primary-700 text-white"
              onClick={() => setShowNewEntryModal(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              New
            </Button>
          </div>
        </div>

        {/* Activity Stream */}
        <ActivityStream
          groups={activitiesData && isGroupedResponse(activitiesData) ? activitiesData.groups : []}
          groupBy={activityGroupBy}
          isLoading={activitiesLoading}
          error={activitiesError ? String(activitiesError) : null}
          emptyMessage={
            activityView === 'timeline'
              ? 'No activities yet. Sync your tools to see your work history.'
              : activityView === 'source'
              ? 'No activities from connected sources. Try syncing your tools.'
              : 'No stories created yet. Activities will be grouped once you create draft stories.'
          }
          onRegenerateNarrative={handleRegenerateNarrative}
          regeneratingEntryId={regeneratingEntryId}
          isEnhancingNarratives={narrativesGenerating}
        />
      </div>
      <NewEntryModal 
        open={showNewEntryModal} 
        onOpenChange={setShowNewEntryModal} 
      />
      
      {/* ReChronicle Side Panel */}
      <RechronicleSidePanel
        journal={rechronicleSidePanel.journal}
        open={rechronicleSidePanel.open}
        onOpenChange={handleCloseReChronicle}
        onRechronicle={handleReChronicle}
        isLoading={rechronicleMutation.isPending}
      />
      
      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm({ open, journalId: open ? deleteConfirm.journalId : null })}
        title="Delete Journal Entry"
        description="Are you sure you want to delete this journal entry? This action cannot be undone."
        variant="destructive"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={confirmDeleteEntry}
        isLoading={deleteMutation.isPending}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg animate-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm font-medium">{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Sync Progress Modal */}
      <SyncProgressModal
        open={showSyncModal}
        onClose={() => setShowSyncModal(false)}
        state={syncState}
        onComplete={handleSyncComplete}
      />
    </div>
  );
}