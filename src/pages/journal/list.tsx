import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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

import { ActivityStream } from '../../components/journal/activity-stream';
import { StoryWizardModal } from '../../components/story-wizard';
import { useActivities, isGroupedResponse } from '../../hooks/useActivities';
import { GroupedActivitiesResponse } from '../../types/activity';
import { JournalEntryMeta } from '../../types/career-stories';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { EnhancingIndicator } from '../../components/ui/enhancing-indicator';
// useNarrativePolling removed - SSE handles updates, polling was hammering backend
import { useSSE } from '../../hooks/useSSE';
import { useMCPIntegrations } from '../../hooks/useMCP';

// Page Props interface
interface JournalPageProps {}

export default function JournalPage() {
  useDocumentTitle('Activity');
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'workspace' | 'network'>('workspace');
  const [entryViewModes, setEntryViewModes] = useState<Record<string, 'workspace' | 'network'>>({});
  const [searchQuery, setSearchQuery] = useState('');

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
   * Used to show EnhancingIndicator in header.
   */
  const [narrativesGenerating, setNarrativesGenerating] = useState(false);

  /**
   * Set of entry IDs that are currently pending enhancement.
   * Tracks per-entry status so completing one entry doesn't affect others.
   * Entries are removed when SSE sends data-changed with their ID.
   */
  const [pendingEnhancementIds, setPendingEnhancementIds] = useState<Set<string>>(new Set());

  // Regenerate narrative state
  const [regeneratingEntryId, setRegeneratingEntryId] = useState<string | null>(null);

  // Story Wizard modal state
  const [storyWizardEntryId, setStoryWizardEntryId] = useState<string | null>(null);

  // Integration detection for first-time user experience
  const { data: integrationsData } = useMCPIntegrations();
  const hasIntegrations = integrationsData?.integrations?.some((i: { isConnected: boolean }) => i.isConnected) ?? false;

  // Track initial load pulse (3 seconds for returning users with data)
  const [showInitialPulse, setShowInitialPulse] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setShowInitialPulse(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Connect to SSE for real-time updates from backend
  // SSE automatically invalidates queries when data changes (debounced 500ms)
  // We DON'T remove entry IDs on data-changed because the invalidation is debounced.
  // Instead, we rely on the hasLLMContent fallback in StoryGroupHeader to stop
  // the animation once the refetched data shows the entry has LLM content.
  // Only narratives-complete clears all pending IDs (immediate invalidation).
  useSSE({
    enabled: true,
    onNarrativesComplete: () => {
      console.log('[Journal] SSE: All narratives complete - setting narrativesGenerating=false (should stop polling)');
      setNarrativesGenerating(false);
      setPendingEnhancementIds(new Set()); // Clear all pending
    },
    onDataChanged: (data) => {
      console.log('[Journal] SSE: Data changed', data);
      // Don't remove from pendingEnhancementIds here - the query invalidation
      // is debounced, so we let the data refresh happen first. The StoryGroupHeader
      // will stop showing the animation once hasLLMContent becomes true.
    },
  });

  // Safety timeout: if SSE doesn't send narratives-complete within 90s, stop the indicator
  // This is a fallback, not polling. SSE is the primary mechanism.
  useEffect(() => {
    if (!narrativesGenerating) return;

    const timeout = setTimeout(() => {
      console.log('[Journal] Safety timeout (90s) - stopping narrativesGenerating');
      setNarrativesGenerating(false);
      setPendingEnhancementIds(new Set());
      // One final refetch in case SSE missed something
      queryClient.refetchQueries({ queryKey: ['journal'] });
      queryClient.refetchQueries({ queryKey: ['activities'] });
    }, 90000);

    return () => clearTimeout(timeout);
  }, [narrativesGenerating, queryClient]);

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

  // NOTE: useUserFeed removed - data not used in current UI (only ActivityStream is rendered)
  // const { data, isLoading, isError, error } = useUserFeed(baseQueryParams);
  const { data: userWorkspaces, isLoading: workspacesLoading } = useWorkspaces();

  // Fetch activities for the stream view - always temporal grouping
  const activityParams = useMemo(() => ({
    groupBy: 'temporal' as const,
    limit: 100
  }), []);
  const {
    data: activitiesData,
    isLoading: activitiesLoading,
    error: activitiesError
  } = useActivities(activityParams);

  // Fetch story groups for inline draft cards
  const storyParams = useMemo(() => ({
    groupBy: 'story' as const,
    limit: 100
  }), []);
  const {
    data: storyData,
  } = useActivities(storyParams);

  // Extract story groups (drafts) — filter out 'unassigned' (raw activities, not drafts)
  const storyGroups = useMemo(() => {
    if (!storyData || !isGroupedResponse(storyData)) return [];
    return storyData.groups.filter(g => g.key !== 'unassigned');
  }, [storyData]);

  // Build journal entry metadata for Story Wizard loading facts
  const wizardEntryMeta = useMemo<JournalEntryMeta | undefined>(() => {
    if (!storyWizardEntryId) return undefined;
    const group = storyGroups.find(
      (g) => g.storyMetadata?.id === storyWizardEntryId
    );
    if (!group?.storyMetadata) return undefined;
    const meta = group.storyMetadata;
    return {
      title: meta.title,
      dateRange: meta.timeRangeStart && meta.timeRangeEnd
        ? `${new Date(meta.timeRangeStart).toLocaleDateString()} - ${new Date(meta.timeRangeEnd).toLocaleDateString()}`
        : undefined,
      activityCount: group.count,
      tools: [...new Set(group.activities.map((a) => a.source))],
      topics: meta.topics,
      impactHighlights: meta.impactHighlights,
      skills: meta.skills,
    };
  }, [storyWizardEntryId, storyGroups]);

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

  // NOTE: Journal entries code removed - useUserFeed data not used (only ActivityStream renders)

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
    if (selectedWorkspace !== 'all' && workspaces.length > 0 && !workspacesLoading) {
      const workspaceExists = workspaces.some(ws => ws.id === selectedWorkspace);
      if (!workspaceExists) {
        console.warn('⚠️ Selected workspace not found, resetting to "all":', selectedWorkspace);
        setSelectedWorkspace('all');
      }
    }
  }, [selectedWorkspace, workspaces, workspacesLoading]);

  // NOTE: Debug logging, skills/categories, filtering, and sorting removed
  // These were for useUserFeed data which is no longer used

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

  // Handle promote to career story - opens the Story Wizard modal
  const handlePromoteToCareerStory = (journalId: string) => {
    console.log('[Journal] Opening Story Wizard for entry:', journalId);
    setStoryWizardEntryId(journalId);
  };

  // Handle Story Wizard completion - navigate to career stories page with the new story
  const handleStoryWizardComplete = async (storyId: string) => {
    console.log('[Journal] Story Wizard completed, storyId:', storyId);
    setStoryWizardEntryId(null);
    // Ensure the career stories cache is fresh before navigating,
    // otherwise the page may render with stale/empty data
    await queryClient.invalidateQueries({ queryKey: ['career-stories', 'stories'] });
    navigate(`/career-stories?storyId=${storyId}&celebrate=true`);
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
        onStateUpdate: (state) => {
          setSyncState(state);
          // Capture entry IDs from sync state for per-entry tracking
          if (state?.entries) {
            const pendingIds = new Set(state.entries.map(e => e.id));
            setPendingEnhancementIds(pendingIds);
          }
        },
        onComplete: (result: SyncResult) => {
          setIsSyncing(false);
          // Enable enhancing indicator - narratives generate in background
          setNarrativesGenerating(true);
          // Invalidate all activity queries - they'll refetch when their tab is viewed
          // Using invalidate (not refetch) because tabs mount different queries
          queryClient.invalidateQueries({ queryKey: ['journal'] });
          queryClient.invalidateQueries({ queryKey: ['activities'] });
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
        onStateUpdate: (state) => {
          setSyncState(state);
          // Capture entry IDs from sync state for per-entry tracking
          if (state?.entries) {
            const pendingIds = new Set(state.entries.map(e => e.id));
            setPendingEnhancementIds(pendingIds);
          }
        },
        onComplete: () => {
          setIsSyncing(false);
          // Enable enhancing indicator - narratives generate in background
          setNarrativesGenerating(true);
          // Invalidate all activity queries - they'll refetch when their tab is viewed
          queryClient.invalidateQueries({ queryKey: ['journal'] });
          queryClient.invalidateQueries({ queryKey: ['activities'] });
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
    // Invalidate queries - they'll refetch
    // Note: invalidate (not refetch) because the story query might not exist yet
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

  // Get activity count for display
  const activityCount = activitiesData && isGroupedResponse(activitiesData)
    ? activitiesData.pagination.total
    : 0;

  // Determine if there are activities (for empty state detection)
  const hasActivities = activitiesData && isGroupedResponse(activitiesData)
    && activitiesData.groups.length > 0;

  // Determine if sync button should pulse:
  // - Has integrations but no data: persistent pulse
  // - Has data: pulse for first 3 seconds on page load
  const shouldPulseSync = hasIntegrations && (!hasActivities || showInitialPulse);

  // Check if this is empty state (no activities)
  const isEmpty = !activitiesLoading && !hasActivities;

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Compact Header: Tabs + Count + Actions in one row */}
        <div className="flex items-center justify-between gap-4 mb-5">
          {/* Left: Page title with count */}
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-gray-900">Timeline</h1>
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
              onClick={handleSync}
              disabled={isSyncing}
              className={cn(
                "text-gray-600 hover:text-gray-900",
                shouldPulseSync && !isSyncing && "ring-2 ring-primary-300 ring-offset-1 animate-pulse"
              )}
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

        {/* First-time user CTA: No integrations connected */}
        {!hasIntegrations && isEmpty && (
          <div className="bg-gradient-to-r from-primary-50 to-primary-100 border border-primary-200 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white rounded-lg shadow-sm">
                <Link2 className="h-6 w-6 text-primary-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Connect your tools</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Link GitHub, Jira, or other tools to automatically import your work activity
                </p>
              </div>
              <Button
                onClick={() => navigate('/settings?tab=integrations')}
                className="bg-primary-600 hover:bg-primary-700 text-white"
              >
                Set Up Integrations
              </Button>
            </div>
          </div>
        )}

        {/* Activity Stream */}
        <ActivityStream
          groups={activitiesData && isGroupedResponse(activitiesData) ? activitiesData.groups : []}
          storyGroups={storyGroups}
          isLoading={activitiesLoading}
          error={activitiesError ? String(activitiesError) : null}
          emptyMessage="No activities yet. Sync your tools to see your work history."
          onRegenerateNarrative={handleRegenerateNarrative}
          regeneratingEntryId={regeneratingEntryId}
          onDeleteEntry={handleDeleteEntry}
          onPromoteToCareerStory={handlePromoteToCareerStory}
          isEnhancingNarratives={narrativesGenerating}
          pendingEnhancementIds={pendingEnhancementIds}
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

      {/* Story Wizard Modal */}
      {storyWizardEntryId && (
        <StoryWizardModal
          isOpen={true}
          onClose={() => setStoryWizardEntryId(null)}
          journalEntryId={storyWizardEntryId}
          journalEntryMeta={wizardEntryMeta}
          onStoryCreated={handleStoryWizardComplete}
        />
      )}
    </div>
  );
}