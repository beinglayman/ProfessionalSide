import React, { useState, useEffect } from 'react';
import { Link2, ExternalLink } from 'lucide-react';
import { ProfileUrlInput } from '../ui/profile-url-input';
import { useAuth } from '../../contexts/AuthContext';

export default function ProfileUrlSettings() {
  const { user } = useAuth();
  const [profileUrl, setProfileUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Load current profile URL from user data
  useEffect(() => {
    if (user) {
      // Try to get profileUrl from user data (we need to update the AuthContext to include this)
      // For now, we'll need to fetch it separately
      fetchCurrentProfileUrl();
    }
  }, [user]);

  const fetchCurrentProfileUrl = async () => {
    if (!user) return;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3002/api/v1'}/users/profile/me`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('inchronicle_access_token')}`
          }
        }
      );

      if (response.ok) {
        const result = await response.json();
        setProfileUrl(result.data.profileUrl || '');
      }
    } catch (error) {
      console.error('Failed to fetch profile URL:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfileUrl = async (newUrl: string): Promise<void> => {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL || 'http://localhost:3002/api/v1'}/users/profile-url`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('inchronicle_access_token')}`
        },
        body: JSON.stringify({ profileUrl: newUrl })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update profile URL');
    }
  };

  // Generate a suggested URL from user's name
  const generateSuggestedUrl = () => {
    if (!user?.name) return '';
    
    return user.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/[\s-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 40);
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Link2 className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Profile URL</h3>
            <p className="text-sm text-gray-500">Create a custom link to your public profile</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Choose a unique URL for your profile that's easy to remember and share. 
          This will make it easier for others to find and connect with you.
        </p>

        <ProfileUrlInput
          value={profileUrl}
          onChange={setProfileUrl}
          onSave={handleSaveProfileUrl}
          placeholder={generateSuggestedUrl() || 'your-profile-url'}
        />

        {/* Help text */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">Guidelines for Profile URLs:</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Must be 3-50 characters long</li>
            <li>• Can only contain lowercase letters, numbers, and hyphens</li>
            <li>• Cannot start or end with a hyphen</li>
            <li>• Cannot contain consecutive hyphens</li>
            <li>• Must be unique across the platform</li>
          </ul>
        </div>

        {/* Current profile URL display */}
        {profileUrl && (
          <div className="border-t pt-4">
            <h4 className="font-medium text-gray-900 mb-2">Your Current Profile URL:</h4>
            <div className="flex items-center gap-2">
              <code className="bg-gray-100 px-3 py-2 rounded text-sm text-gray-800">
                {window.location.origin}/u/{profileUrl}
              </code>
              <button
                onClick={() => window.open(`${window.location.origin}/u/${profileUrl}`, '_blank')}
                className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 text-sm"
              >
                <ExternalLink className="h-3 w-3" />
                Visit
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}