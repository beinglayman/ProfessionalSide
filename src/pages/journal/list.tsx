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
  Trash2
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { cn } from '../../lib/utils';
import { NewEntryModal } from '../../components/new-entry/new-entry-modal';
import { JournalCard } from '../../components/journal/journal-card';
import { RechronicleCard } from '../../components/journal/rechronicle-card';
import { RechronicleSidePanel } from '../../components/journal/rechronicle-side-panel';
import JournalEnhanced from '../../components/format7/journal-enhanced';
import { JournalEntry } from '../../types/journal';
import { useJournalEntries, useUserFeed, useToggleAppreciate, useToggleLike, useRechronicleEntry } from '../../hooks/useJournal';
import { useQueryClient } from '@tanstack/react-query';
import { JournalService } from '../../services/journal.service';
import { profileApiService } from '../../services/profile-api.service';
import { useAuth } from '../../contexts/AuthContext';

// Page Props interface
interface JournalPageProps {}

export default function JournalPage() {
  const { user } = useAuth();
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
  const [rechronicleSidePanel, setRechronicleSidePanel] = useState<{
    open: boolean;
    journal: JournalEntry | null;
  }>({ open: false, journal: null });
  const [onboardingProfileImage, setOnboardingProfileImage] = useState<string | null>(null);

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
  const toggleAppreciateMutation = useToggleAppreciate();
  const toggleLikeMutation = useToggleLike();
  const rechronicleMutation = useRechronicleEntry();

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

  // Get unique workspaces
  const workspaces = useMemo(() => {
    const uniqueWorkspaces = new Map();
    journals.forEach(journal => {
      if (!uniqueWorkspaces.has(journal.workspaceId)) {
        uniqueWorkspaces.set(journal.workspaceId, {
          id: journal.workspaceId,
          name: journal.workspaceName,
          isPersonal: !journal.organizationName
        });
      }
    });
    return Array.from(uniqueWorkspaces.values());
  }, [journals]);

  // Reset workspace filter if the selected workspace doesn't exist
  useEffect(() => {
    if (selectedWorkspace !== 'all' && workspaces.length > 0 && !isLoading) {
      const workspaceExists = workspaces.some(ws => ws.id === selectedWorkspace);
      if (!workspaceExists) {
        console.warn('⚠️ Selected workspace not found, resetting to "all":', selectedWorkspace);
        setSelectedWorkspace('all');
      }
    }
  }, [selectedWorkspace, workspaces, isLoading]);

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
      // In network view, show entries that have: generateNetworkEntry=true OR visibility='network' OR isPublished=true
      if (viewMode === 'network' && !journal.generateNetworkEntry && journal.visibility !== 'network' && !journal.isPublished) {
        console.log(`❌ Excluding "${journal.title}" from network view (visibility: ${journal.visibility}, isPublished: ${journal.isPublished}, generateNetworkEntry: ${journal.generateNetworkEntry})`);
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

  // Handle delete entry
  const handleDeleteEntry = (journalId: string) => {
    // In a real app, this would make an API call
    console.log('Deleting journal:', journalId);
    
    // Show toast message
    setToastMessage('Journal entry deleted successfully');
    
    // Close the menu
    setOpenPublishMenus(prev => {
      const newSet = new Set(prev);
      newSet.delete(journalId);
      return newSet;
    });
  };

  // Handle publish/unpublish
  const handlePublishToggle = async (journal: JournalEntry) => {
    try {
      if (journal.isPublished || journal.visibility === 'network') {
        // Unpublish - set visibility back to workspace
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
      queryClient.invalidateQueries({ queryKey: ['journal', 'feed'] });
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

    // If it has format7Data, render JournalEnhanced
    if (journal.format7Data) {
      // Use network view data when in network mode, fallback to workspace view
      const entryData = viewMode === 'network' && journal.format7DataNetwork
        ? journal.format7DataNetwork
        : journal.format7Data;
      return (
        <div key={journal.id}>
          <JournalEnhanced
            entry={entryData}
            mode="expanded"
            workspaceName={journal.workspaceName}
            onLike={() => handleLike(journal.id)}
            onAppreciate={() => handleAppreciate(journal.id)}
            correlations={entryData?.correlations}
            categories={entryData?.categories}
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
          onAppreciate={() => handleAppreciate(journal.id)}
          onReChronicle={() => handleOpenReChronicle(journal)}
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
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                My Journal
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Document your professional journey and share your achievements
              </p>
            </div>
            
            {/* Workspace/Network Toggle */}
            <div className="flex items-center gap-4">
              <div className="flex items-center rounded-full bg-gray-100 p-0.5 shadow-sm">
                <button
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200",
                    viewMode === 'workspace' 
                      ? "bg-primary-500 text-white shadow-sm"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  )}
                  onClick={() => setViewMode('workspace')}
                >
                  Workspace View
                </button>
                <button
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200",
                    viewMode === 'network' 
                      ? "bg-primary-500 text-white shadow-sm"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  )}
                  onClick={() => setViewMode('network')}
                >
                  Network View
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* View Mode Info Banner */}
        <div className={cn(
          "mb-6 p-4 rounded-lg flex items-start gap-3",
          viewMode === 'workspace' ? "bg-blue-50 border border-blue-200" : "bg-purple-50 border border-purple-200"
        )}>
          <div className="flex-shrink-0">
            {viewMode === 'workspace' ? 
              <Shield className="h-5 w-5 text-blue-600" /> : 
              <Globe className="h-5 w-5 text-purple-600" />
            }
          </div>
          <div className="flex-1">
            <h3 className={cn(
              "text-sm font-medium",
              viewMode === 'workspace' ? "text-blue-900" : "text-purple-900"
            )}>
              {viewMode === 'workspace' ? 'Workspace View' : 'Network View'}
            </h3>
            <p className={cn(
              "mt-1 text-sm",
              viewMode === 'workspace' ? "text-blue-700" : "text-purple-700"
            )}>
              {viewMode === 'workspace' 
                ? 'Full access to all journal details, artifacts, and confidential information. Only visible to you and your workspace members.'
                : 'Sanitized view of your published journals. Client names and confidential details are hidden. This is what your network sees.'}
            </p>
          </div>
        </div>

        {/* Search and Filters - Expandable */}
        {showSearchFilters && (
          <div className="mb-8 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search journal entries..."
                    className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2 focus:border-primary-500 focus:ring-primary-500"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Sort Options */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Sort by:</span>
                <select
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'recent' | 'popular')}
                >
                  <option value="recent">Most Recent</option>
                  <option value="popular">Most Popular</option>
                </select>
              </div>

              {/* Filter Toggle */}
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className={cn(showFilters && "bg-gray-100")}
              >
                <Filter className="mr-2 h-4 w-4" />
                Filters
                {(selectedWorkspace !== 'all' || selectedCategory !== 'all' || selectedSkills.length > 0) && (
                  <span className="ml-2 rounded-full bg-primary-500 px-2 py-0.5 text-xs text-white">
                    {[selectedWorkspace !== 'all', selectedCategory !== 'all', selectedSkills.length > 0].filter(Boolean).length}
                  </span>
                )}
              </Button>
            </div>

            {/* Expandable Filters */}
            {showFilters && (
              <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Workspace Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Workspace
                    </label>
                    <select
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
                      value={selectedWorkspace}
                      onChange={(e) => setSelectedWorkspace(e.target.value)}
                    >
                      <option value="all">All Workspaces</option>
                      {workspaces.map((workspace) => (
                        <option key={workspace.id} value={workspace.id}>
                          {workspace.name} {workspace.isPersonal && '(Personal)'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Category Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <select
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                      <option value="all">All Categories</option>
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Clear Filters */}
                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedWorkspace('all');
                        setSelectedCategory('all');
                        setSelectedSkills([]);
                        setSearchQuery('');
                      }}
                      className="w-full"
                    >
                      Clear All Filters
                    </Button>
                  </div>
                </div>

                {/* Skills Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Skills ({selectedSkills.length} selected)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {allSkills.map((skill) => (
                      <button
                        key={skill}
                        onClick={() => toggleSkill(skill)}
                        className={cn(
                          "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                          selectedSkills.includes(skill)
                            ? "bg-primary-500 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        )}
                      >
                        {skill}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Results Summary with Search/Filter Toggle */}
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {sortedJournals.length} journal {sortedJournals.length === 1 ? 'entry' : 'entries'}
            {viewMode === 'network' && ' (published only)'}
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowSearchFilters(!showSearchFilters)}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <Search className="h-4 w-4" />
              <span>Search & Filter</span>
              {(searchQuery || selectedWorkspace !== 'all' || selectedCategory !== 'all' || selectedSkills.length > 0) && (
                <span className="ml-1 rounded-full bg-primary-500 px-2 py-0.5 text-xs text-white">
                  {[searchQuery !== '', selectedWorkspace !== 'all', selectedCategory !== 'all', selectedSkills.length > 0].filter(Boolean).length}
                </span>
              )}
              <ChevronDown className={cn("h-4 w-4 transition-transform", showSearchFilters && "rotate-180")} />
            </button>
            
            <Button 
              className="bg-primary-500 hover:bg-primary-600 text-white shadow-xs transition-all duration-200 hover:shadow-md px-3 py-1.5 text-xs"
              onClick={() => setShowNewEntryModal(true)}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              New Entry
            </Button>
          </div>
        </div>

        {/* Workspace Tabs (only in workspace view) */}
        {viewMode === 'workspace' && (
          <div className="mb-6 flex items-center gap-2 overflow-x-auto border-b border-gray-200">
            <button
              className={cn(
                "relative px-4 py-2 text-sm font-medium transition-colors flex items-center group",
                selectedWorkspace === 'all'
                  ? "text-primary-600"
                  : "text-gray-500 hover:text-primary-600"
              )}
              style={{ outline: 'none', background: 'none', border: 'none' }}
              onClick={() => setSelectedWorkspace('all')}
            >
              All Workspaces
              {selectedWorkspace === 'all' && (
                <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-primary-500 rounded-full" />
              )}
            </button>
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                className={cn(
                  "relative px-4 py-2 text-sm font-medium transition-colors flex items-center group",
                  selectedWorkspace === ws.id
                    ? "text-primary-600"
                    : "text-gray-500 hover:text-primary-600"
                )}
                style={{ outline: 'none', background: 'none', border: 'none' }}
                onClick={() => setSelectedWorkspace(ws.id)}
              >
                <span className="mr-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7V6a2 2 0 012-2h2a2 2 0 012 2v1m0 0v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7m6 0h6m0 0V6a2 2 0 012-2h2a2 2 0 012 2v1m0 0v10a2 2 0 01-2 2h-2a2 2 0 01-2-2V7" /></svg>
                </span>
                {ws.name}
                {selectedWorkspace === ws.id && (
                  <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-primary-500 rounded-full" />
                )}
              </button>
            ))}
            
          </div>
        )}

        {/* Journal Entries */}
        {sortedJournals.length > 0 ? (
          <div className="grid gap-6">
            {sortedJournals.map(journal => renderJournalCard(journal))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
            <FileText className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-sm font-medium text-gray-900">No journal entries found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchQuery || selectedSkills.length > 0 || selectedWorkspace !== 'all' || selectedCategory !== 'all' 
                ? 'Try adjusting your filters or search query'
                : 'Start documenting your professional journey by creating your first entry'}
            </p>
            <Button 
              className="mt-4 bg-primary-500 hover:bg-primary-600 text-white shadow-sm transition-all duration-200 hover:shadow-md px-3 py-1.5 text-sm"
              onClick={() => setShowNewEntryModal(true)}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Create Your First Entry
            </Button>
          </div>
        )}
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
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg animate-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm font-medium">{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
}