import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Link2,
  RefreshCw,
  X
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { ConfirmationDialog } from '../../components/ui/confirmation-dialog';
import { cn } from '../../lib/utils';
import { RechronicleSidePanel } from '../../components/journal/rechronicle-side-panel';
import { JournalEntry } from '../../types/journal';
import { useToggleAppreciate, useToggleLike, useRechronicleEntry, useDeleteJournalEntry } from '../../hooks/useJournal';
import { useQueryClient } from '@tanstack/react-query';
import { JournalService } from '../../services/journal.service';
import { CareerStoriesService } from '../../services/career-stories.service';
import { useProfile } from '../../hooks/useProfile';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspaces } from '../../hooks/useWorkspace';
import { isDemoMode } from '../../services/demo-mode.service';
import { runDemoSync, runLiveSync, SyncState, SyncResult, getLastSyncAt } from '../../services/sync.service';
import { SYNC_IN_PROGRESS_KEY, JOURNAL_DATA_CHANGED_EVENT } from '../../constants/sync';
import { SyncProgressModal } from '../../components/sync/SyncProgressModal';

import { ActivityStream } from '../../components/journal/activity-stream';
import { DraftStorySidebar } from '../../components/journal/DraftStorySidebar';
// DraftFilterBanner replaced by story filter chip in FilterBar
import { DraftPeekBar } from '../../components/journal/DraftPeekBar';
import { DraftSheetContent } from '../../components/journal/DraftSheetContent';
import { MobileSheet } from '../../components/ui/mobile-sheet';
import { StoryWizardModal } from '../../components/story-wizard';
import { useActivities, isGroupedResponse } from '../../hooks/useActivities';
import { useDraftTimelineInteraction } from '../../hooks/useDraftTimelineInteraction';
import { JournalEntryMeta, ToolType } from '../../types/career-stories';
import { ToolIcon } from '../../components/career-stories/ToolIcon';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { EnhancingIndicator } from '../../components/ui/enhancing-indicator';
// useNarrativePolling removed - SSE handles updates, polling was hammering backend
import { useSSE } from '../../hooks/useSSE';
import { useMCPIntegrations } from '../../hooks/useMCP';

// Page Props interface
interface JournalPageProps {}

export default function JournalPage() {
  useDocumentTitle('Timeline');
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
  const [bannerDismissed, setBannerDismissed] = useState(() => sessionStorage.getItem('banner-dismissed-timeline') === '1');
  const [openPublishMenus, setOpenPublishMenus] = useState<Set<string>>(new Set());
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
  };
  const [openAnalytics, setOpenAnalytics] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; journalId: string | null }>({
    open: false,
    journalId: null,
  });
  const [rechronicleSidePanel, setRechronicleSidePanel] = useState<{
    open: boolean;
    journal: JournalEntry | null;
  }>({ open: false, journal: null });
  const { profile, refetch: refetchProfile } = useProfile();

  // Sync modal state
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncState, setSyncState] = useState<SyncState | null>(null);
  const [isSyncing, setIsSyncing] = useState(() => sessionStorage.getItem(SYNC_IN_PROGRESS_KEY) === 'true');
  const [lastSyncAt, setLastSyncAtState] = useState<string | null>(() => getLastSyncAt());
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

  // Regenerate narrative state — one at a time to avoid LLM rate limits
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
      setNarrativesGenerating(false);
      setPendingEnhancementIds(new Set()); // Clear all pending
    },
    onDataChanged: (data) => {
      // Clear background sync indicator when first data arrives
      if (isSyncing && sessionStorage.getItem(SYNC_IN_PROGRESS_KEY)) {
        sessionStorage.removeItem(SYNC_IN_PROGRESS_KEY);
        setIsSyncing(false);
        setNarrativesGenerating(true); // Narratives still generating in background
      }
    },
  });

  // Safety timeout: if SSE doesn't send narratives-complete within 90s, stop the indicator
  // This is a fallback, not polling. SSE is the primary mechanism.
  useEffect(() => {
    if (!narrativesGenerating) return;

    const timeout = setTimeout(() => {
      setNarrativesGenerating(false);
      setPendingEnhancementIds(new Set());
      // One final refetch in case SSE missed something
      queryClient.refetchQueries({ queryKey: ['journal'] });
      queryClient.refetchQueries({ queryKey: ['activities'] });
    }, 90000);

    return () => clearTimeout(timeout);
  }, [narrativesGenerating, queryClient]);

  // Safety timeout: if no SSE data-changed arrives within 60s, clear the sync banner
  useEffect(() => {
    if (!isSyncing || showSyncModal) return;

    const timeout = setTimeout(() => {
      sessionStorage.removeItem(SYNC_IN_PROGRESS_KEY);
      setIsSyncing(false);
      queryClient.refetchQueries({ queryKey: ['activities'] });
    }, 60000);

    return () => clearTimeout(timeout);
  }, [isSyncing, showSyncModal, queryClient]);

  // Listen for external data changes to refresh (browser events, not SSE)
  useEffect(() => {
    const handleDataChanged = () => {
      // Force refetch (not just invalidate) to guarantee fresh data renders
      queryClient.refetchQueries({ queryKey: ['journal'] });
      queryClient.refetchQueries({ queryKey: ['activities'] });
    };

    window.addEventListener(JOURNAL_DATA_CHANGED_EVENT, handleDataChanged);
    return () => window.removeEventListener(JOURNAL_DATA_CHANGED_EVENT, handleDataChanged);
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
    limit: 500
  }), []);
  const {
    data: activitiesData,
    isLoading: activitiesLoading,
    error: activitiesError
  } = useActivities(activityParams);

  // Fetch story groups for inline draft cards — deferred until timeline loads
  const storyParams = useMemo(() => ({
    groupBy: 'story' as const,
    limit: 500
  }), []);
  const {
    data: storyData,
  } = useActivities(storyParams, { enabled: !activitiesLoading });

  // Extract story groups (drafts) — filter out 'unassigned' (raw activities, not drafts)
  const storyGroups = useMemo(() => {
    if (!storyData || !isGroupedResponse(storyData)) return [];
    return storyData.groups.filter(g => g.key !== 'unassigned');
  }, [storyData]);

  // Count of draft stories hidden because they were promoted to career stories
  const promotedCount = storyData && isGroupedResponse(storyData)
    ? storyData.meta.promotedCount ?? 0
    : 0;

  // Temporal activity groups for the stream
  const activityGroups = useMemo(() => {
    if (!activitiesData || !isGroupedResponse(activitiesData)) return [];
    return activitiesData.groups;
  }, [activitiesData]);

  // Draft sidebar interaction — filtering, selection, pre-computed groups
  const {
    selectedDraftId,
    selectedDraft,
    filteredGroups,
    matchCount,
    totalDraftActivityCount,
    missingCount,
    selectDraft,
    clearSelection,
  } = useDraftTimelineInteraction(storyGroups, activityGroups);

  // Mobile bottom sheet state
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  // Draft story hover state — for cross-highlighting related activities
  const [hoveredDraftId, setHoveredDraftId] = useState<string | null>(null);
  const hoveredDraftActivityIds = useMemo(() => {
    if (!hoveredDraftId) return new Set<string>();
    const draft = storyGroups.find(g => g.key === hoveredDraftId);
    if (!draft?.storyMetadata?.activityEdges) return new Set<string>();
    return new Set(draft.storyMetadata.activityEdges.map(e => e.activityId));
  }, [hoveredDraftId, storyGroups]);

  // Story groups loading state (activities loaded but stories still loading)
  const storyGroupsLoading = activitiesLoading ? false : !storyData;

  // Escape key to deselect draft
  useEffect(() => {
    if (!selectedDraftId) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        clearSelection();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedDraftId, clearSelection]);

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

  // Re-fetch profile when updated elsewhere (onboarding, settings)
  useEffect(() => {
    const handleProfileDataChange = () => { refetchProfile(); };
    window.addEventListener('onboardingDataChanged', handleProfileDataChange);
    window.addEventListener('profileUpdated', handleProfileDataChange);
    return () => {
      window.removeEventListener('onboardingDataChanged', handleProfileDataChange);
      window.removeEventListener('profileUpdated', handleProfileDataChange);
    };
  }, [refetchProfile]);


  // Handle appreciate toggle
  const handleAppreciate = async (entryId: string) => {
    try {
      await toggleAppreciateMutation.mutateAsync(entryId);
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
    try {
      await toggleLikeMutation.mutateAsync(entryId);
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
      await deleteMutation.mutateAsync(journalId);
      showToast('Journal entry deleted successfully');
    } catch (error: any) {
      const errorMessage = error?.message || error?.response?.data?.error || 'Unknown error';
      console.error('❌ Failed to delete journal:', { journalId, error: errorMessage });
      showToast(`Failed to delete: ${errorMessage}`, 'error');
    }
  };

  // Handle promote to career story — close mobile sheet first, then open wizard
  const handlePromoteToCareerStory = (journalId: string) => {
    setMobileSheetOpen(false);
    setStoryWizardEntryId(journalId);
  };

  // Handle Story Wizard completion — clear selection, invalidate stories, navigate
  const handleStoryWizardComplete = async (storyId: string) => {
    setStoryWizardEntryId(null);
    clearSelection();
    setMobileSheetOpen(false);
    // Pre-fetch career stories so the data is in cache when the stories page mounts.
    await queryClient.fetchQuery({
      queryKey: ['career-stories', 'stories'],
      queryFn: async () => {
        const response = await CareerStoriesService.listStories();
        if (response.success && response.data) return response.data;
        throw new Error(response.error || 'Failed to fetch career stories');
      },
    });
    // Invalidate story groups so sidebar updates
    queryClient.invalidateQueries({ queryKey: ['activities'] });
    showToast('Career story created!');
    navigate(`/stories?storyId=${storyId}&celebrate=true`);
  };

  // Handle regenerate narrative — one at a time, block while in flight
  const handleRegenerateNarrative = async (journalId: string) => {
    // Block if another regeneration is already in flight
    if (regeneratingEntryId) return;

    setRegeneratingEntryId(journalId);
    // Close menu
    setOpenPublishMenus(prev => {
      const newSet = new Set(prev);
      newSet.delete(journalId);
      return newSet;
    });

    try {
      const result = await JournalService.regenerateNarrative(journalId, 'professional');
      if (result.usedFallback) {
        showToast('AI unavailable (rate limited) — used basic summary. Try again in a minute.', 'error');
      } else {
        showToast('Narrative re-enhanced with AI');
      }
      queryClient.refetchQueries({ queryKey: ['journal', 'feed'] });
      queryClient.refetchQueries({ queryKey: ['activities'] });
    } catch (error: any) {
      const errorMessage = error?.message || error?.response?.data?.error || 'Unknown error';
      console.error('❌ Failed to regenerate narrative:', { journalId, error: errorMessage });
      showToast(`Failed to regenerate: ${errorMessage}`, 'error');
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
        showToast('Entry unpublished successfully');
      } else {
        // Publish - set visibility to network
        await JournalService.publishJournalEntry(journal.id, {
          visibility: 'network',
          abstractContent: journal.abstractContent || journal.description
        });
        showToast('Entry published to network successfully');
      }

      // Refetch entries to update UI
      queryClient.refetchQueries({ queryKey: ['journal', 'feed'] });
    } catch (error) {
      showToast('Failed to update entry', 'error');
      console.error('Publish toggle error:', error);
    }

    // Close the menu
    setOpenPublishMenus(prev => {
      const newSet = new Set(prev);
      newSet.delete(journal.id);
      return newSet;
    });
  };

  // Auto-hide toast message — errors stay longer
  useEffect(() => {
    if (toastMessage) {
      const duration = toastMessage.type === 'error' ? 5000 : 3000;
      const timer = setTimeout(() => setToastMessage(null), duration);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // ReChronicle handler
  const handleReChronicle = async (journalId: string, comment?: string) => {
    try {
      await rechronicleMutation.mutateAsync({ id: journalId, comment });

      // Show success message
      showToast(comment ? 'Entry rechronicled with your comment!' : 'Entry rechronicled!');
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
    if (isDemoMode()) {
      // Demo mode: run simulated sync
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
          setLastSyncAtState(new Date().toISOString());
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
          setLastSyncAtState(new Date().toISOString());
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
          const msg = error.message;
          if (msg.includes('not connected') || msg.includes('No tools connected')) {
            showToast('No tools connected. Go to Settings > Integrations to connect.', 'error');
          } else {
            showToast(msg || 'Sync failed. Please try again.', 'error');
          }
        },
      });
    }
  };

  const handleSyncComplete = () => {
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

  // Unique tool sources for header icons
  const toolSources = useMemo(() => {
    if (!activitiesData || !isGroupedResponse(activitiesData)) return [];
    const sources = new Set<string>();
    for (const group of activitiesData.groups) {
      for (const a of group.activities) {
        sources.add(a.source);
      }
    }
    return [...sources].slice(0, 4);
  }, [activitiesData]);

  // Determine if there are activities (for empty state detection)
  const hasActivities = activitiesData && isGroupedResponse(activitiesData)
    && activitiesData.groups.length > 0;

  // Determine if sync button should pulse:
  // - Has integrations but no data: persistent pulse
  // - Has data: pulse for first 3 seconds on page load
  const shouldPulseSync = hasIntegrations && (!hasActivities || showInitialPulse);

  // Check if this is empty state (no activities)
  const isEmpty = !activitiesLoading && !hasActivities;

  // Auto-sync on first visit: user has connected tools but never synced
  const autoSyncTriggered = useRef(false);
  const filterBarContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (autoSyncTriggered.current || isSyncing || activitiesLoading) return;
    if (getLastSyncAt() === null && hasIntegrations) {
      autoSyncTriggered.current = true;
      handleSync();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasIntegrations, activitiesLoading, isSyncing]);

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 pb-6">
        <div className="space-y-4">
        {/* Page title */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Timeline
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            All your workspace activity, automatically organized
          </p>
        </div>

        {/* Page header — subtle metadata line + actions */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 flex-wrap text-sm text-gray-500">
            {activityCount > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="font-semibold text-gray-700">{activityCount}</span>
                {' '}activities
                {toolSources.length > 0 && (
                  <span className="inline-flex items-center gap-0.5 ml-0.5">
                    {toolSources.map(s => (
                      <ToolIcon key={s} tool={s as ToolType} className="w-4 h-4" />
                    ))}
                  </span>
                )}
              </span>
            )}
            {storyGroups.length > 0 && (
              <>
                {activityCount > 0 && <span className="text-gray-300">·</span>}
                <span>
                  <span className="font-semibold text-gray-700">{storyGroups.length}</span>
                  {' '}draft{storyGroups.length !== 1 ? 's' : ''} ready to promote
                </span>
              </>
            )}
            {promotedCount > 0 && (
              <>
                <span className="text-gray-300">·</span>
                <span>{promotedCount} promoted</span>
              </>
            )}
            {narrativesGenerating && (
              <>
                <span className="text-gray-300">·</span>
                <EnhancingIndicator variant="inline" text="Enhancing..." className="bg-primary-50/80 px-2 py-0.5 rounded-full border border-primary-200 text-xs" />
              </>
            )}
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {lastSyncAt && !isSyncing && (
              <span className="text-xs text-gray-400" title={`Last synced: ${new Date(lastSyncAt).toLocaleString()}`}>
                Synced {formatDistanceToNow(new Date(lastSyncAt), { addSuffix: true })}
              </span>
            )}
            <Button
              size="sm"
              className={cn(
                "bg-primary-600 hover:bg-primary-700 text-white shadow-sm",
                shouldPulseSync && !isSyncing && "ring-2 ring-primary-300 ring-offset-1 animate-pulse"
              )}
              onClick={handleSync}
              disabled={isSyncing}
            >
              <RefreshCw className={cn("h-4 w-4 mr-1", isSyncing && "animate-spin")} />
              {isSyncing ? 'Syncing...' : 'Sync'}
            </Button>
          </div>
        </div>

        {/* Contextual info banner — dismissible */}
        {!bannerDismissed && (
          <div className="px-3 py-1.5 rounded-md flex items-center gap-2 bg-primary-50 border border-primary-200">
            <Clock className="h-3.5 w-3.5 text-primary-600 flex-shrink-0" />
            <p className="text-xs text-primary-700 flex-1"><span className="font-semibold">Activities</span> are individual work items from your tools. <span className="font-semibold">Draft Stories</span> group related activities into narratives you can promote to Career Stories.</p>
            <button
              onClick={() => { setBannerDismissed(true); sessionStorage.setItem('banner-dismissed-timeline', '1'); }}
              className="p-0.5 rounded text-primary-400 hover:text-primary-600 flex-shrink-0"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Background sync indicator — shown when arriving from OAuth callback */}
        {isSyncing && !showSyncModal && (
          <div className="px-3 py-2 rounded-md flex items-center gap-2 bg-blue-50 border border-blue-200 animate-pulse">
            <RefreshCw className="h-3.5 w-3.5 text-blue-600 animate-spin flex-shrink-0" />
            <p className="text-xs text-blue-700">Importing your activity — items will appear below as they arrive...</p>
          </div>
        )}

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

        {/* FilterBar — full width, rendered here via portal from ActivityStream */}
        <div ref={filterBarContainerRef} />

        {/* Two-column layout: Activity Stream + Draft Sidebar */}
        <div className="lg:grid lg:grid-cols-[1fr,340px] lg:gap-6">
          {/* Left: Activity Timeline */}
          <div className={cn('pb-[60px] lg:pb-0', storyGroups.length > 0 && 'lg:pb-0')}>
            <ActivityStream
              groups={filteredGroups ?? activityGroups}
              isLoading={activitiesLoading}
              error={activitiesError ? String(activitiesError) : null}
              emptyMessage="No activities yet. Sync your tools to see your work history."
              hoveredDraftActivityIds={hoveredDraftActivityIds}
              isAnyDraftHovered={hoveredDraftId !== null}
              filterBarContainerRef={filterBarContainerRef}
              selectedStoryTitle={selectedDraft?.storyMetadata?.title}
              onClearStory={clearSelection}
            />
          </div>

          {/* Right: Draft Stories Sidebar (desktop only) */}
          {!activitiesError && (
            <aside className="hidden lg:block" aria-label="Draft Stories">
              <DraftStorySidebar
                drafts={storyGroups}
                selectedId={selectedDraftId}
                isLoading={storyGroupsLoading}
                onSelect={selectDraft}
                onPromote={handlePromoteToCareerStory}
                onRegenerate={handleRegenerateNarrative}
                regeneratingId={regeneratingEntryId}
                filterMatchCount={matchCount}
                filterTotalCount={totalDraftActivityCount}
                onHoverStart={(id: string) => setHoveredDraftId(id)}
                onHoverEnd={() => setHoveredDraftId(null)}
              />
            </aside>
          )}
        </div>

        {/* Mobile: Floating peek bar + bottom sheet (< lg) */}
        <div className="lg:hidden">
          {storyGroups.length > 0 && (
            <>
              <DraftPeekBar
                count={storyGroups.length}
                isLoading={storyGroupsLoading}
                isOpen={mobileSheetOpen}
                onTap={() => setMobileSheetOpen(true)}
              />
              <MobileSheet
                isOpen={mobileSheetOpen}
                onClose={() => setMobileSheetOpen(false)}
                maxHeightVh={85}
                ariaLabel="Draft Stories"
              >
                <DraftSheetContent
                  drafts={storyGroups}
                  onPromote={handlePromoteToCareerStory}
                  onRegenerate={handleRegenerateNarrative}
                  regeneratingId={regeneratingEntryId}
                  onClose={() => setMobileSheetOpen(false)}
                />
              </MobileSheet>
            </>
          )}
        </div>
        </div>
      </div>
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
        <div className={`fixed bottom-4 right-4 z-50 text-white px-4 py-2 rounded-lg shadow-lg animate-in slide-in-from-bottom-2 duration-300 ${
          toastMessage.type === 'error' ? 'bg-red-600' : 'bg-green-600'
        }`}>
          <div className="flex items-center gap-2">
            {toastMessage.type === 'error'
              ? <AlertCircle className="h-4 w-4" />
              : <CheckCircle2 className="h-4 w-4" />}
            <span className="text-sm font-medium">{toastMessage.text}</span>
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