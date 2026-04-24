/**
 * useStoryParticipants - fetches the humans surfaced from a story's
 * source activities (via the backend participant resolver).
 *
 * Only the story author can call this endpoint today; non-authors
 * will receive 403 until Ship 3.2 relaxes access for validators.
 */

import { useQuery } from '@tanstack/react-query';
import { CareerStoriesService } from '../services/career-stories.service';
import type { StoryParticipant } from '../types/career-stories';

export function useStoryParticipants(storyId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: ['story-participants', storyId],
    queryFn: async () => {
      if (!storyId) return { participants: [] as StoryParticipant[] };
      const res = await CareerStoriesService.getStoryParticipants(storyId);
      return res.data ?? { participants: [] as StoryParticipant[] };
    },
    enabled: Boolean(storyId) && enabled,
    staleTime: 5 * 60 * 1000,
  });
}
