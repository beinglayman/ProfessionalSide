import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  UserService, 
  UpdateProfileRequest, 
  AddUserSkillRequest, 
  UpdateUserSkillRequest,
  SearchUsersParams 
} from '../services/user.service';
import { QueryKeys } from '../lib/queryClient';

// Get user profile
export const useUserProfile = (userId: string) => {
  return useQuery({
    queryKey: QueryKeys.userProfile(userId),
    queryFn: async () => {
      const response = await UserService.getUserProfile(userId);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to fetch user profile');
    },
    enabled: !!userId,
  });
};

// Get current user's full profile
export const useMyProfile = () => {
  return useQuery({
    queryKey: QueryKeys.userProfile('me'),
    queryFn: async () => {
      const response = await UserService.getMyProfile();
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to fetch profile');
    },
  });
};

// Update profile
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: UpdateProfileRequest) => UserService.updateProfile(data),
    onSuccess: (response) => {
      if (response.success) {
        // Update current user cache
        queryClient.setQueryData(QueryKeys.currentUser, response.data);
        queryClient.setQueryData(QueryKeys.userProfile('me'), response.data);
      }
    },
  });
};

// Get user skills
export const useUserSkills = (userId?: string) => {
  return useQuery({
    queryKey: QueryKeys.userSkills(userId),
    queryFn: async () => {
      const response = await UserService.getUserSkills(userId);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to fetch skills');
    },
  });
};

// Add user skill
export const useAddUserSkill = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: AddUserSkillRequest) => UserService.addUserSkill(data),
    onSuccess: (response) => {
      if (response.success) {
        // Invalidate skills queries
        queryClient.invalidateQueries({ queryKey: ['users', 'skills'] });
        // Update current user to reflect new profile completeness
        queryClient.invalidateQueries({ queryKey: QueryKeys.currentUser });
      }
    },
  });
};

// Update user skill
export const useUpdateUserSkill = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ skillId, data }: { skillId: string; data: UpdateUserSkillRequest }) => 
      UserService.updateUserSkill(skillId, data),
    onSuccess: (response) => {
      if (response.success) {
        // Invalidate skills queries
        queryClient.invalidateQueries({ queryKey: ['users', 'skills'] });
      }
    },
  });
};

// Remove user skill
export const useRemoveUserSkill = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (skillId: string) => UserService.removeUserSkill(skillId),
    onSuccess: (response) => {
      if (response.success) {
        // Invalidate skills queries
        queryClient.invalidateQueries({ queryKey: ['users', 'skills'] });
        // Update current user to reflect new profile completeness
        queryClient.invalidateQueries({ queryKey: QueryKeys.currentUser });
      }
    },
  });
};

// Search users
export const useSearchUsers = (params: SearchUsersParams) => {
  return useQuery({
    queryKey: QueryKeys.searchUsers(params),
    queryFn: async () => {
      const response = await UserService.searchUsers(params);
      if (response.success && response.data) {
        return {
          users: response.data,
          pagination: response.pagination,
        };
      }
      throw new Error(response.error || 'Failed to search users');
    },
    enabled: !!params.query && params.query.length > 0,
  });
};

// Get all skills
export const useAllSkills = () => {
  return useQuery({
    queryKey: QueryKeys.allSkills,
    queryFn: async () => {
      const response = await UserService.getAllSkills();
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to fetch skills');
    },
    staleTime: 30 * 60 * 1000, // 30 minutes - skills don't change often
  });
};

// Endorse user skill
export const useEndorseUserSkill = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ userId, skillId }: { userId: string; skillId: string }) => 
      UserService.endorseUserSkill(userId, skillId),
    onSuccess: (response, { userId }) => {
      if (response.success) {
        // Invalidate user's skills
        queryClient.invalidateQueries({ queryKey: QueryKeys.userSkills(userId) });
        queryClient.invalidateQueries({ queryKey: QueryKeys.userProfile(userId) });
      }
    },
  });
};

// Upload avatar
export const useUploadAvatar = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (file: File) => UserService.uploadAvatar(file),
    onSuccess: (response) => {
      if (response.success) {
        // Invalidate current user to refetch with new avatar
        queryClient.invalidateQueries({ queryKey: QueryKeys.currentUser });
        queryClient.invalidateQueries({ queryKey: QueryKeys.userProfile('me') });
      }
    },
  });
};