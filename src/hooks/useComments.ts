import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface Comment {
  id: string;
  content: string;
  authorId: string;
  entryId: string;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
    title?: string;
  };
  replies?: Comment[];
  _count: {
    replies: number;
  };
}

export interface CreateCommentData {
  content: string;
  parentId?: string;
}

export interface UpdateCommentData {
  content: string;
}

// Get comments for a journal entry
export function useComments(entryId: string) {
  return useQuery({
    queryKey: ['comments', entryId],
    queryFn: async (): Promise<Comment[]> => {
      try {
        console.log('🔍 Fetching comments for entry:', entryId);
        const response = await api.get(`/journal/entries/${entryId}/comments`);
        console.log('✅ Comments fetched successfully:', response.data);
        
        const comments = response.data.data || response.data; // Handle potential wrapper
        
        // Map backend 'user' field to frontend 'author' field
        const mappedComments = comments.map((comment: any) => ({
          ...comment,
          author: comment.user || comment.author,
          replies: comment.replies?.map((reply: any) => ({
            ...reply,
            author: reply.user || reply.author
          })) || []
        }));
        
        console.log('🔄 Mapped comments:', mappedComments);
        return mappedComments;
      } catch (error: any) {
        // Handle 404s gracefully in development environment
        if (error.response?.status === 404) {
          console.log('💬 No comments found for entry:', entryId);
          return [];
        }
        
        console.error('❌ Failed to fetch comments:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url,
          fullError: error.response?.data
        });
        console.error('❌ Full error object:', error);
        throw error;
      }
    },
    enabled: !!entryId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: false, // Disable automatic refetching
  });
}

// Create comment mutation
export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ entryId, ...data }: { entryId: string } & CreateCommentData) => {
      try {
        const response = await api.post(`/journal/entries/${entryId}/comments`, data);
        
        // Map backend 'user' field to frontend 'author' field
        const comment = response.data.data || response.data;
        if (comment.user) {
          comment.author = comment.user;
        }
        
        return comment;
      } catch (error: any) {
        console.error('Comment creation failed:', error.response?.data || error.message);
        throw new Error(error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to create comment');
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['comments', variables.entryId] });
      queryClient.invalidateQueries({ queryKey: ['journal', 'entries'] });
    }
  });
}

// Update comment mutation
export function useUpdateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      entryId, 
      commentId, 
      ...data 
    }: { 
      entryId: string; 
      commentId: string;
    } & UpdateCommentData) => {
      const response = await api.put(`/journal/entries/${entryId}/comments/${commentId}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['comments', variables.entryId] });
    },
  });
}

// Delete comment mutation
export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ entryId, commentId }: { entryId: string; commentId: string }) => {
      const response = await api.delete(`/journal/entries/${entryId}/comments/${commentId}`);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['comments', variables.entryId] });
      queryClient.invalidateQueries({ queryKey: ['journal', 'entries'] });
    },
  });
}

