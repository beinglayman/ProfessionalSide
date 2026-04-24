/**
 * useStoryValidations - author-side view of outstanding + resolved peer
 * validations on a story. Feeds the "already invited" state on participant
 * cards and the validator-status chips shown next to them.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CareerStoriesService } from '../services/career-stories.service';
import type { InviteValidatorRequest, StoryValidationSummary } from '../types/career-stories';

export function useStoryValidations(storyId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: ['story-validations', storyId],
    queryFn: async () => {
      if (!storyId) return { validations: [] as StoryValidationSummary[] };
      const res = await CareerStoriesService.listStoryValidations(storyId);
      return res.data ?? { validations: [] as StoryValidationSummary[] };
    },
    enabled: Boolean(storyId) && enabled,
    staleTime: 60 * 1000,
  });
}

export function useInviteValidator(storyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: InviteValidatorRequest) =>
      CareerStoriesService.inviteValidator(storyId, payload),
    onSuccess: () => {
      // Refresh validations so the participant card flips to "Pending"
      // without a full page reload.
      qc.invalidateQueries({ queryKey: ['story-validations', storyId] });
    },
  });
}
