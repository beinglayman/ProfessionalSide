/**
 * useMyValidations - validator-side query + action hooks.
 *
 * Powers the /me/validations inbox and the per-section action buttons
 * in the validator-mode story view.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CareerStoriesService } from '../services/career-stories.service';
import type { MyValidationRow, ValidatorStoryView } from '../types/career-stories';

export function useMyValidations(enabled = true) {
  return useQuery({
    queryKey: ['my-validations'],
    queryFn: async () => {
      const res = await CareerStoriesService.listMyValidations();
      return res.data ?? { validations: [] as MyValidationRow[] };
    },
    enabled,
    staleTime: 30 * 1000,
  });
}

export function useValidatorStoryView(storyId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: ['validator-story-view', storyId],
    queryFn: async () => {
      if (!storyId) return null as ValidatorStoryView | null;
      const res = await CareerStoriesService.getStoryForValidator(storyId);
      return res.data ?? null;
    },
    enabled: Boolean(storyId) && enabled,
    staleTime: 30 * 1000,
  });
}

export function useApproveValidation(storyId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (validationId: string) => CareerStoriesService.approveValidation(validationId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-validations'] });
      if (storyId) qc.invalidateQueries({ queryKey: ['validator-story-view', storyId] });
    },
  });
}

export function useDisputeValidation(storyId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ validationId, note }: { validationId: string; note: string }) =>
      CareerStoriesService.disputeValidation(validationId, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-validations'] });
      if (storyId) qc.invalidateQueries({ queryKey: ['validator-story-view', storyId] });
    },
  });
}
