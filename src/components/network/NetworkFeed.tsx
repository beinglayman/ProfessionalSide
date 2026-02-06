import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Rss } from 'lucide-react';
import { api, ApiResponse } from '../../lib/api';
import { Button } from '../ui/button';
import { CareerStory } from '../../types/career-stories';

interface FeedStory extends CareerStory {
  user?: { id: string; name: string; email: string };
}

interface SuggestedUser {
  user: { id: string; name: string; email: string; title?: string } | undefined;
  publishedCount: number;
}

export function NetworkFeed() {
  const [stories, setStories] = useState<FeedStory[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchFeed();
    fetchSuggestions();
  }, [page]);

  const fetchFeed = async () => {
    setIsLoading(true);
    try {
      const response = await api.get<ApiResponse<{ stories: FeedStory[]; total: number }>>(`/network/feed?page=${page}&pageSize=20`);
      if (response.data.success && response.data.data) {
        setStories(response.data.data.stories);
        setTotal(response.data.data.total);
      }
    } catch (error) {
      console.error('Failed to fetch feed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSuggestions = async () => {
    try {
      const response = await api.get<ApiResponse<{ suggestions: SuggestedUser[] }>>('/network/suggested-users?limit=5');
      if (response.data.success && response.data.data) {
        setSuggestions(response.data.data.suggestions);
      }
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
    }
  };

  const handleFollow = async (userId: string) => {
    try {
      await api.post(`/network/follow/${userId}`);
      setSuggestions(prev => prev.filter(s => s.user?.id !== userId));
      fetchFeed();
    } catch (error) {
      console.error('Failed to follow user:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto mb-4" />
        Loading feed...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Feed */}
      {stories.length === 0 ? (
        <div className="text-center py-12">
          <Rss className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Your feed is empty</h3>
          <p className="text-gray-500 mb-6">Follow people to see their career stories here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {stories.map((story) => (
            <div key={story.id} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-xs font-semibold text-purple-700">
                  {story.user?.name?.charAt(0) || '?'}
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">{story.user?.name}</div>
                  <div className="text-xs text-gray-500">
                    {story.publishedAt ? new Date(story.publishedAt).toLocaleDateString() : ''}
                  </div>
                </div>
              </div>
              <h4 className="text-sm font-semibold text-gray-900">{story.title}</h4>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-600 rounded">
                  {story.framework}
                </span>
                {story.archetype && (
                  <span className="px-1.5 py-0.5 text-[10px] font-medium bg-purple-50 text-purple-700 rounded capitalize">
                    {story.archetype}
                  </span>
                )}
              </div>
              {story.sections && Object.values(story.sections)[0]?.summary && (
                <p className="text-xs text-gray-600 mt-2 line-clamp-3">
                  {Object.values(story.sections)[0].summary}
                </p>
              )}
            </div>
          ))}
          {total > stories.length && (
            <div className="text-center">
              <Button variant="outline" onClick={() => setPage(p => p + 1)}>
                Load more
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Suggested Users */}
      {suggestions.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-700">Suggested People</h3>
          </div>
          <div className="space-y-3">
            {suggestions.map((s) => s.user && (
              <div key={s.user.id} className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-900">{s.user.name}</div>
                  <div className="text-xs text-gray-500">
                    {s.user.title || s.user.email} &middot; {s.publishedCount} stories
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleFollow(s.user!.id)}
                  className="text-xs"
                >
                  <UserPlus className="w-3 h-3 mr-1" />
                  Follow
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
