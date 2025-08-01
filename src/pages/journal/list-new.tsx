import React, { useState } from 'react';
import { useJournalEntries, useToggleLike, useToggleAppreciate } from '../../hooks/useJournal';
import { JournalCard } from '../../components/journal/journal-card';
import { Button } from '../../components/ui/button';
import { Plus, Filter, Search, Grid, List } from 'lucide-react';

export default function JournalPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'likes' | 'comments'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [showNewEntryModal, setShowNewEntryModal] = useState(false);

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
              onClick={() => setShowNewEntryModal(true)}
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
                  onClick={() => setShowNewEntryModal(true)}
                  className="mt-4"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create your first entry
                </Button>
              )}
            </div>
          ) : (
            entries.map((entry) => (
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
            ))
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

        {/* New Entry Modal */}
        {showNewEntryModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
              <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div>
                  <div className="mt-3 text-center sm:mt-5">
                    <h3 className="text-lg font-medium leading-6 text-gray-900">
                      Create New Entry
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        New entry creation will be implemented soon.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-6">
                  <Button
                    type="button"
                    className="w-full"
                    onClick={() => setShowNewEntryModal(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}