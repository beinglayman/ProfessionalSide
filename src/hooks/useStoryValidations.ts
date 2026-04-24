/**
 * useStoryValidations - author-side view of outstanding + resolved peer
 * validations on a story. Feeds the "already invited" state on participant
 * cards and the validator-status chips shown next to them.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CareerStoriesService } from '../services/career-stories.service';
import type {
  InviteValidatorRequest,
  StoryValidationSummary,
  PendingEditSuggestion,
} from '../types/career-stories';

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

/** Author view: pending edit suggestions awaiting accept/reject on a story. */
export function usePendingEditSuggestions(storyId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: ['edit-suggestions', storyId],
    queryFn: async () => {
      if (!storyId) return { suggestions: [] as PendingEditSuggestion[] };
      const res = await CareerStoriesService.listPendingEditSuggestions(storyId);
      return res.data ?? { suggestions: [] as PendingEditSuggestion[] };
    },
    enabled: Boolean(storyId) && enabled,
    staleTime: 30 * 1000,
  });
}

export function useAcceptEditSuggestion(storyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (validationId: string) => CareerStoriesService.acceptEditSuggestion(validationId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['edit-suggestions', storyId] });
      qc.invalidateQueries({ queryKey: ['story-validations', storyId] });
      // Also refetch the story content itself - section text was replaced.
      qc.invalidateQueries({ queryKey: ['story', storyId] });
      qc.invalidateQueries({ queryKey: ['published-story', storyId] });
    },
  });
}

export function useRejectEditSuggestion(storyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (validationId: string) => CareerStoriesService.rejectEditSuggestion(validationId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['edit-suggestions', storyId] });
      qc.invalidateQueries({ queryKey: ['story-validations', storyId] });
    },
  });
}
