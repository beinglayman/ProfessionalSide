import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profileApiService } from '../services/profile-api.service';
import { CareerStoriesService } from '../services/career-stories.service';
import { networkService } from '../services/network.service';

export const PROFILE_QUERY_KEYS = {
  profile: (userId: string) => ['profile', userId],
  publishedStories: (userId: string) => ['profile', userId, 'stories'],
  followStatus: (userId: string) => ['profile', userId, 'followStatus'],
  followCounts: (userId: string) => ['profile', userId, 'followCounts'],
};

export function usePublicProfile(userId: string) {
  return useQuery({
    queryKey: PROFILE_QUERY_KEYS.profile(userId),
    queryFn: () => profileApiService.getPublicProfile(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePublishedStories(userId: string) {
  return useQuery({
    queryKey: PROFILE_QUERY_KEYS.publishedStories(userId),
    queryFn: () => CareerStoriesService.getPublishedStories(userId),
    enabled: !!userId,
    select: (data) => data?.data?.stories ?? [],
    staleTime: 5 * 60 * 1000,
  });
}

export function useFollowStatus(userId: string) {
  return useQuery({
    queryKey: PROFILE_QUERY_KEYS.followStatus(userId),
    queryFn: () => networkService.getFollowStatus(userId),
    enabled: !!userId,
    select: (data) => data?.data ?? { isFollowing: false, followingCount: 0, maxFollowing: 100 },
    staleTime: 30 * 1000,
  });
}

export function useFollowCounts(userId: string) {
  return useQuery({
    queryKey: PROFILE_QUERY_KEYS.followCounts(userId),
    queryFn: () => networkService.getFollowCounts(userId),
    enabled: !!userId,
    select: (data) => data?.data ?? { followerCount: 0, followingCount: 0 },
    staleTime: 30 * 1000,
  });
}

export function useToggleFollow(targetUserId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (isCurrentlyFollowing: boolean) => {
      if (isCurrentlyFollowing) {
        return networkService.unfollowUser(targetUserId);
      }
      return networkService.followUser(targetUserId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEYS.followStatus(targetUserId) });
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEYS.followCounts(targetUserId) });
    },
  });
}
