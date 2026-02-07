import React, { useState, useEffect } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Settings, User } from 'lucide-react';
import { Button } from '../ui/button';
import { useAuth } from '../../contexts/AuthContext';
import { profileApiService } from '../../services/profile-api.service';
import { getAvatarUrl, handleAvatarError } from '../../utils/avatar';

export function UserNav() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);

  // Load profile data with proper prioritization
  useEffect(() => {
    const loadProfileData = async () => {
      try {
        console.log('🔄 UserNav: Loading profile data...');
        const profileData = await profileApiService.getProfile();
        console.log('📊 UserNav: Profile data received:', {
          name: profileData.name,
          avatar: profileData.avatar,
          onboardingDataExists: !!profileData.onboardingData
        });
        
        if (profileData.avatar) {
          setProfileImageUrl(profileData.avatar);
        }
        if (profileData.name && profileData.name !== 'No name provided') {
          setFullName(profileData.name);
        }
      } catch (error) {
        console.error('❌ UserNav: Failed to load profile data:', error);
        // Fallback to auth context user data
        if (user?.name && user.name !== 'user') {
          setFullName(user.name);
        }
        if (user?.avatar) {
          setProfileImageUrl(user.avatar);
        }
      }
    };

    if (isAuthenticated) {
      loadProfileData();
    }

    // Listen for custom profile data change events
    const handleProfileDataChange = (event: CustomEvent) => {
      loadProfileData();
    };

    window.addEventListener('onboardingDataChanged', handleProfileDataChange as EventListener);
    window.addEventListener('profileUpdated', handleProfileDataChange as EventListener);

    return () => {
      window.removeEventListener('onboardingDataChanged', handleProfileDataChange as EventListener);
      window.removeEventListener('profileUpdated', handleProfileDataChange as EventListener);
    };
  }, [isAuthenticated, user]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout fails, redirect to login
      navigate('/login');
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center space-x-2">
        <Link to="/login">
          <Button variant="ghost" size="sm">
            Sign in
          </Button>
        </Link>
        <Link to="/register">
          <Button size="sm">
            Sign up
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-4">      
      {/* User Menu */}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <Button variant="ghost" className="relative h-8 rounded-full">
            <img
              src={getAvatarUrl(profileImageUrl || user.avatar)}
              alt={fullName || (user.name && user.name !== 'user' ? user.name : 'User Profile')}
              className="h-8 w-8 rounded-full object-cover"
              onError={handleAvatarError}
            />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="w-56 rounded-lg border bg-white p-2 shadow-lg"
            align="end"
            sideOffset={5}
          >
            <div className="border-b border-gray-200 p-2 min-w-0">
              <p className="font-medium text-gray-900 truncate">
                {fullName || (user.name && user.name !== 'user' ? user.name : 'User Profile')}
              </p>
              {user.email && (
                <p className="text-sm text-gray-500 truncate font-mono">{user.email}</p>
              )}
              {user.company && (
                <p className="text-xs text-gray-400 truncate mt-0.5">{user.company}</p>
              )}
            </div>
            <DropdownMenu.Item asChild>
              <Link
                to="/me"
                className="flex w-full items-center space-x-2 rounded-md p-2 text-sm hover:bg-gray-100"
              >
                <User className="h-4 w-4" />
                <span>View Profile</span>
              </Link>
            </DropdownMenu.Item>
            <DropdownMenu.Item asChild>
              <Link
                to="/settings"
                className="flex w-full items-center space-x-2 rounded-md p-2 text-sm hover:bg-gray-100"
              >
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Link>
            </DropdownMenu.Item>
            <DropdownMenu.Separator className="my-1 h-px bg-gray-200" />
            <DropdownMenu.Item asChild>
              <button
                onClick={handleLogout}
                className="flex w-full items-center space-x-2 rounded-md p-2 text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                <span>Log out</span>
              </button>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}