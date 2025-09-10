import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface PersonalWorkspace {
  id: string;
  name: string;
  description?: string;
  isPersonal: boolean;
  allowTeamMembers: boolean;
}

interface UsePersonalWorkspaceReturn {
  personalWorkspace: PersonalWorkspace | null;
  isLoading: boolean;
  error: string | null;
  isPersonalWorkspace: (workspaceId: string) => boolean;
  canInviteTeamMembers: (workspaceId: string) => boolean;
  createPersonalWorkspace: () => Promise<PersonalWorkspace | null>;
}

export const usePersonalWorkspace = (): UsePersonalWorkspaceReturn => {
  const { user } = useAuth();
  const [personalWorkspace, setPersonalWorkspace] = useState<PersonalWorkspace | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load personal workspace when user is available
  useEffect(() => {
    if (!user?.id) return;
    
    loadPersonalWorkspace();
  }, [user?.id]);

  const loadPersonalWorkspace = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/v1/workspaces/personal/${user.id}`);
      // const workspace = await response.json();
      
      // For now, simulate a personal workspace
      const mockPersonalWorkspace: PersonalWorkspace = {
        id: 'personal_' + user.id,
        name: 'My Workspace',
        description: `${user.name || 'Your'} personal workspace for individual goals and journal entries`,
        isPersonal: true,
        allowTeamMembers: false
      };
      
      setPersonalWorkspace(mockPersonalWorkspace);
    } catch (err) {
      console.error('❌ Failed to load personal workspace:', err);
      setError('Failed to load personal workspace');
    } finally {
      setIsLoading(false);
    }
  };

  const createPersonalWorkspace = async (): Promise<PersonalWorkspace | null> => {
    if (!user?.id) return null;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // TODO: Replace with actual API call to backend onboarding service
      // const response = await fetch('/api/v1/onboarding/personal-workspace', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ userId: user.id })
      // });
      // const workspace = await response.json();
      
      // For now, simulate workspace creation
      const newPersonalWorkspace: PersonalWorkspace = {
        id: 'personal_' + user.id,
        name: 'My Workspace',
        description: `${user.name || 'Your'} personal workspace for individual goals and journal entries`,
        isPersonal: true,
        allowTeamMembers: false
      };
      
      setPersonalWorkspace(newPersonalWorkspace);
      console.log('✅ Personal workspace created:', newPersonalWorkspace.id);
      
      return newPersonalWorkspace;
    } catch (err) {
      console.error('❌ Failed to create personal workspace:', err);
      setError('Failed to create personal workspace');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const isPersonalWorkspace = (workspaceId: string): boolean => {
    return personalWorkspace?.id === workspaceId || workspaceId.startsWith('personal_');
  };

  const canInviteTeamMembers = (workspaceId: string): boolean => {
    if (isPersonalWorkspace(workspaceId)) {
      return false; // Personal workspaces don't allow team invitations
    }
    return true;
  };

  return {
    personalWorkspace,
    isLoading,
    error,
    isPersonalWorkspace,
    canInviteTeamMembers,
    createPersonalWorkspace
  };
};