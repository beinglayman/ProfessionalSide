import React, { useState } from 'react';
import { useJournalEntries, useToggleLike, useToggleAppreciate, useCreateJournalEntry } from '../../hooks/useJournal';
import { JournalCard } from '../../components/journal/journal-card';
import { JournalEnhanced } from '../../components/format7/journal-enhanced';
import { Button } from '../../components/ui/button';
import { Plus, Filter, Search, Grid, List } from 'lucide-react';
import { MCPFlowSidePanel } from '../../components/new-entry/MCPFlowSidePanel';
import { useQueryClient } from '@tanstack/react-query';

// Version: 2024-11-21-v2
export default function JournalPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'likes' | 'comments'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [showMCPPanel, setShowMCPPanel] = useState(false);

  // API query parameters
  const queryParams = {
    search: searchQuery || undefined,
    workspaceId: selectedWorkspace || undefined,
    category: selectedCategory || undefined,
    sortBy,
    sortOrder,
    page,
    limit: 20,
  };

  // Fetch journal entries
  const { data, isLoading, isError, error } = useJournalEntries(queryParams);
  const toggleLikeMutation = useToggleLike();
  const toggleAppreciateMutation = useToggleAppreciate();
  const createJournalEntryMutation = useCreateJournalEntry();
  const queryClient = useQueryClient();

  // Handle like toggle
  const handleLike = async (entryId: string) => {
    try {
      await toggleLikeMutation.mutateAsync(entryId);
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  };

  // Handle appreciate toggle
  const handleAppreciate = async (entryId: string) => {
    try {
      await toggleAppreciateMutation.mutateAsync(entryId);
    } catch (error) {
      console.error('Failed to toggle appreciate:', error);
    }
  };

  // Handle MCP flow completion - Format7 version
  const handleMCPComplete = async (data: any) => {
    console.log('[Journal] MCP flow completed with Format7 data:', data);
    console.log('[Journal] Workspace info:', {
      workspaceId: data.workspaceEntry?.workspaceId,
      workspaceName: data.workspaceEntry?.workspaceName,
      hasWorkspaceEntry: !!data.workspaceEntry
    });

    // Validate required fields before API call
    if (!data.workspaceEntry?.workspaceId) {
      console.error('[Journal] Missing workspaceId in data:', data.workspaceEntry);
      alert('Failed to create entry: Please select a workspace for this entry. If you see a workspace dropdown in the preview, make sure to select a workspace before creating the entry.');
      return;
    }

    try {
      console.log('[Journal] Creating journal entry with data:', {
        title: data.title,
        workspaceId: data.workspaceEntry.workspaceId,
        skillsCount: data.skills?.length || 0,
        hasFormat7Data: !!data.format7Entry
      });

      // Create journal entry with Format7 data
      const result = await createJournalEntryMutation.mutateAsync({
        title: data.title,
        description: data.description,
        fullContent: data.description, // Use description as full content for now
        abstractContent: data.description.substring(0, 500), // First 500 chars as abstract
        workspaceId: data.workspaceEntry.workspaceId, // From MCP flow - validated above
        visibility: 'workspace', // Default to workspace visibility
        tags: [],
        skills: data.skills || [],
        // Store the complete Format7 structure for rich display
        format7Data: data.format7Entry
      });

      console.log('[Journal] Journal entry created successfully:', result);

      // Refresh the journal entries list
      queryClient.invalidateQueries({ queryKey: ['journalEntries'] });

      // Close the panel only after successful creation
      setShowMCPPanel(false);

      console.log('[Journal] Panel closed, entry creation complete');
    } catch (error: any) {
      console.error('[Journal] Failed to create journal entry:', error);
      alert(`Failed to create entry: ${error.message || 'Unknown error'}. Please check the console for details.`);
      // Don't close panel on error so user can retry
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
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
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-800">
              Error loading journal entries: {error?.message}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const entries = data?.entries || [];
  const pagination = data?.pagination;

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Journal Entries</h1>
              <p className="mt-2 text-gray-600">
                Your professional journey documented
              </p>
            </div>
            <Button
              onClick={() => setShowMCPPanel(true)}
              className="bg-primary-600 hover:bg-primary-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Entry
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center space-x-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search entries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-md border border-gray-300 pl-10 pr-4 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">All Categories</option>
              <option value="Engineering">Engineering</option>
              <option value="Design">Design</option>
              <option value="Product">Product</option>
              <option value="Business">Business</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="createdAt">Most Recent</option>
              <option value="likes">Most Liked</option>
              <option value="comments">Most Discussed</option>
            </select>
          </div>
        </div>

        {/* Results Summary */}
        {pagination && (
          <div className="mb-4 text-sm text-gray-600">
            Showing {entries.length} of {pagination.total} entries
          </div>
        )}

        {/* Journal Entries */}
        <div className="space-y-6">
          {entries.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                <List className="h-6 w-6 text-gray-400" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">No entries found</h3>
              <p className="mt-2 text-gray-500">
                {searchQuery ? 'Try adjusting your search filters.' : 'Start by creating your first journal entry.'}
              </p>
              {!searchQuery && (
                <Button
                  onClick={() => setShowMCPPanel(true)}
                  className="mt-4"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create your first entry
                </Button>
              )}
            </div>
          ) : (
            entries.map((entry) => {
              // Check if entry has Format7 data
              if (entry.format7Data) {
                return (
                  <JournalEnhanced
                    key={entry.id}
                    entry={entry.format7Data}
                    mode="expanded"
                    onLike={() => handleLike(entry.id)}
                    onAppreciate={() => handleAppreciate(entry.id)}
                  />
                );
              }

              // Fallback to regular JournalCard for non-Format7 entries
              return (
                <JournalCard
                  key={entry.id}
                  journal={entry}
                  viewMode="workspace"
                  showMenuButton={true}
                  showAnalyticsButton={true}
                  showUserProfile={true}
                  onLike={() => handleLike(entry.id)}
                  onAppreciate={() => handleAppreciate(entry.id)}
                />
              );
            })
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="mt-8 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Page {pagination.page} of {pagination.totalPages}
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={() => setPage(page + 1)}
                disabled={page >= pagination.totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* MCP Flow Side Panel */}
        <MCPFlowSidePanel
          open={showMCPPanel}
          onOpenChange={setShowMCPPanel}
          onComplete={handleMCPComplete}
          workspaceName="Professional Work"
        />
      </div>
    </div>
  );
}