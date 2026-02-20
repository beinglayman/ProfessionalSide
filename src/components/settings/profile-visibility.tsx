import React, { useState, useEffect } from 'react';
import { Globe, Users, Mail, MapPin, Building, Check, X, Link2, Copy, ExternalLink, Pencil } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { usePrivacySettings, useUpdatePrivacySettings } from '../../hooks/useDataPrivacy';
import { useToast } from '../../contexts/ToastContext';
import { api } from '../../lib/api';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

function ToggleSwitch({ checked, onChange, disabled = false }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
        checked ? 'bg-primary-600' : 'bg-gray-200',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
      disabled={disabled}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1'
        )}
      />
    </button>
  );
}

interface VisibilitySettingProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

function VisibilitySetting({ icon, title, description, checked, onChange, disabled = false }: VisibilitySettingProps) {
  return (
    <div className={cn(
      'flex items-center justify-between py-4 px-4 rounded-lg border transition-colors',
      checked ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200',
      disabled && 'opacity-60'
    )}>
      <div className="flex items-start space-x-3 flex-1">
        <div className={cn(
          'p-2 rounded-lg',
          checked ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
        )}>
          {icon}
        </div>
        <div className="flex-1">
          <h4 className={cn(
            'font-medium',
            checked ? 'text-green-900' : 'text-gray-900'
          )}>
            {title}
          </h4>
          <p className={cn(
            'text-sm mt-1',
            checked ? 'text-green-700' : 'text-gray-600'
          )}>
            {description}
          </p>
        </div>
      </div>
      <div className="flex items-center space-x-3">
        <span className={cn(
          'text-sm font-medium',
          checked ? 'text-green-600' : 'text-gray-500'
        )}>
          {checked ? 'Visible' : 'Hidden'}
        </span>
        <ToggleSwitch 
          checked={checked} 
          onChange={onChange}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

function ChronicleUrlSection() {
  const { toast } = useToast();
  const [currentSlug, setCurrentSlug] = useState<string | null>(null);
  const [editSlug, setEditSlug] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [isLoadingSlug, setIsLoadingSlug] = useState(true);

  // Fetch current profileUrl from user profile
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/users/profile/me');
        const slug = res.data?.data?.profileUrl ?? null;
        setCurrentSlug(slug);
        setEditSlug(slug ?? '');
      } catch {
        // Ignore — slug will show as empty
      } finally {
        setIsLoadingSlug(false);
      }
    })();
  }, []);

  const validateSlug = (value: string): string | null => {
    if (value.length < 3 || value.length > 50) return 'Must be between 3 and 50 characters';
    if (!/^[a-z0-9-]+$/.test(value)) return 'Only lowercase letters, numbers, and hyphens';
    if (value.includes('--')) return 'No consecutive hyphens';
    if (value.startsWith('-') || value.endsWith('-')) return 'Cannot start or end with a hyphen';
    return null;
  };

  const handleSlugChange = (value: string) => {
    const normalized = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setEditSlug(normalized);
    setSlugError(validateSlug(normalized));
  };

  const handleSave = async () => {
    const error = validateSlug(editSlug);
    if (error) { setSlugError(error); return; }
    if (editSlug === currentSlug) { setIsEditing(false); return; }

    setIsSaving(true);
    setSlugError(null);
    try {
      await api.put('/users/profile-url', { profileUrl: editSlug });
      setCurrentSlug(editSlug);
      setIsEditing(false);
      toast.success('Chronicle URL updated successfully');
    } catch (err: any) {
      const status = err?.response?.status;
      const message = err?.response?.data?.error;
      if (status === 409) {
        setSlugError('This URL is already taken');
      } else if (status === 400) {
        setSlugError(message || 'Invalid URL format');
      } else {
        setSlugError('Failed to update URL');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = async () => {
    if (!currentSlug) return;
    try {
      await navigator.clipboard.writeText(`https://inchronicle.com/${currentSlug}`);
      toast.success('Chronicle URL copied to clipboard');
    } catch {
      toast.error('Failed to copy URL');
    }
  };

  const chronicleUrl = currentSlug ? `inchronicle.com/${currentSlug}` : null;

  if (isLoadingSlug) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="animate-pulse h-20 bg-gray-100 rounded" />
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="mb-4">
        <div className="flex items-center space-x-2 mb-2">
          <Link2 className="h-5 w-5 text-primary-600" />
          <h3 className="text-lg font-semibold text-gray-900">Career Chronicle URL</h3>
        </div>
        <p className="text-sm text-gray-600">
          Your shareable profile link. Anyone with this URL can see your public Career Chronicle.
        </p>
      </div>

      {!isEditing ? (
        <div className="space-y-3">
          {chronicleUrl ? (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 flex-1 min-w-0">
                <span className="text-sm text-gray-700 truncate">{chronicleUrl}</span>
              </div>
              <Button variant="outline" size="sm" onClick={handleCopy} title="Copy URL">
                <Copy className="h-4 w-4" />
              </Button>
              <a
                href={`https://${chronicleUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-gray-200 bg-white hover:bg-gray-50 h-9 w-9"
                title="Open Chronicle"
              >
                <ExternalLink className="h-4 w-4 text-gray-600" />
              </a>
              <Button variant="outline" size="sm" onClick={() => { setEditSlug(currentSlug ?? ''); setIsEditing(true); setSlugError(null); }}>
                <Pencil className="h-4 w-4 mr-1" />
                Edit
              </Button>
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">
              No Chronicle URL set. Complete onboarding to get one, or set one manually.
            </p>
          )}
          {!currentSlug && (
            <Button variant="outline" size="sm" onClick={() => { setIsEditing(true); setSlugError(null); }}>
              Set Chronicle URL
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label htmlFor="chronicle-slug" className="block text-sm font-medium text-gray-700 mb-1">
              Chronicle URL
            </label>
            <div className="flex items-center gap-1">
              <span className="text-sm text-gray-500 shrink-0">inchronicle.com/</span>
              <input
                id="chronicle-slug"
                type="text"
                value={editSlug}
                onChange={(e) => handleSlugChange(e.target.value)}
                className={cn(
                  'flex-1 rounded-md border px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none',
                  slugError ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                )}
                placeholder="your-name"
                maxLength={50}
                autoFocus
              />
            </div>
            {slugError && <p className="text-xs text-red-600 mt-1">{slugError}</p>}
            {!slugError && editSlug.length >= 3 && (
              <p className="text-xs text-gray-500 mt-1">
                Preview: <span className="font-medium">inchronicle.com/{editSlug}</span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving || !!slugError || editSlug.length < 3}
              className="bg-primary-600 hover:bg-primary-700"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white mr-1.5" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Save
                </>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setIsEditing(false); setEditSlug(currentSlug ?? ''); setSlugError(null); }} disabled={isSaving}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ProfileVisibility() {
  const { toast } = useToast();
  const { data: privacySettings, isLoading, error } = usePrivacySettings();
  const updatePrivacySettings = useUpdatePrivacySettings();
  
  const [localSettings, setLocalSettings] = useState({
    profileVisibility: 'network' as 'public' | 'network',
    showEmail: false,
    showLocation: true,
    showCompany: true,
    showConnections: true,
    allowSearchEngineIndexing: false,
  });
  
  const [hasChanges, setHasChanges] = useState(false);

  // Update local settings when privacy settings are loaded
  useEffect(() => {
    if (privacySettings) {
      console.log('🔄 Loading privacy settings into local state:', privacySettings);
      setLocalSettings(privacySettings);
    }
  }, [privacySettings]);

  // Debug current state
  useEffect(() => {
    console.log('📊 Current local settings:', localSettings);
    console.log('🔄 Has changes:', hasChanges);
  }, [localSettings, hasChanges]);

  const handleSettingChange = (key: string, value: boolean | string) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSaveChanges = async () => {
    try {
      await updatePrivacySettings.mutateAsync(localSettings);
      setHasChanges(false);
      toast.success('Profile visibility settings updated successfully');
    } catch (error: any) {
      console.error('Privacy settings update error:', error);
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to update profile visibility settings';
      toast.error(errorMessage);
    }
  };

  const handleResetChanges = () => {
    if (privacySettings) {
      setLocalSettings(privacySettings);
      setHasChanges(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Visibility Level */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Profile Visibility Level</h3>
          <p className="text-sm text-gray-600">Control who can see your profile information</p>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <input
              type="radio"
              id="visibility-public"
              name="profileVisibility"
              value="public"
              checked={localSettings.profileVisibility === 'public'}
              onChange={() => handleSettingChange('profileVisibility', 'public')}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
            />
            <label htmlFor="visibility-public" className="flex items-center space-x-2">
              <Globe className="h-4 w-4 text-green-600" />
              <div>
                <span className="text-sm font-medium text-gray-900">Public</span>
                <p className="text-xs text-gray-600">Anyone can view your profile</p>
              </div>
            </label>
          </div>
          
          <div className="flex items-center space-x-3">
            <input
              type="radio"
              id="visibility-network"
              name="profileVisibility"
              value="network"
              checked={localSettings.profileVisibility === 'network'}
              onChange={() => handleSettingChange('profileVisibility', 'network')}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
            />
            <label htmlFor="visibility-network" className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-blue-600" />
              <div>
                <span className="text-sm font-medium text-gray-900">Network Only</span>
                <p className="text-xs text-gray-600">Only your connections and workspace members can view</p>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Career Chronicle URL */}
      <ChronicleUrlSection />

      {/* Contact Information Visibility */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Contact Information</h3>
          <p className="text-sm text-gray-600">Choose what contact details are visible to others</p>
        </div>
        
        <div className="space-y-4">
          <VisibilitySetting
            icon={<Mail className="h-4 w-4" />}
            title="Email Address"
            description="Show your email address on your profile"
            checked={localSettings.showEmail}
            onChange={(checked) => handleSettingChange('showEmail', checked)}
          />
          
          <VisibilitySetting
            icon={<MapPin className="h-4 w-4" />}
            title="Location"
            description="Display your current location or city"
            checked={localSettings.showLocation}
            onChange={(checked) => handleSettingChange('showLocation', checked)}
          />
          
          <VisibilitySetting
            icon={<Building className="h-4 w-4" />}
            title="Company"
            description="Show your current company or organization"
            checked={localSettings.showCompany}
            onChange={(checked) => handleSettingChange('showCompany', checked)}
          />
        </div>
      </div>

      {/* Additional Visibility Settings */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Additional Settings</h3>
          <p className="text-sm text-gray-600">Advanced visibility and discoverability options</p>
        </div>
        
        <div className="space-y-4">
          <VisibilitySetting
            icon={<Users className="h-4 w-4" />}
            title="Connections"
            description="Allow others to see your network connections"
            checked={localSettings.showConnections}
            onChange={(checked) => handleSettingChange('showConnections', checked)}
          />
          
          <VisibilitySetting
            icon={<Globe className="h-4 w-4" />}
            title="Search Engine Indexing"
            description="Allow search engines to index your public profile"
            checked={localSettings.allowSearchEngineIndexing}
            onChange={(checked) => handleSettingChange('allowSearchEngineIndexing', checked)}
          />
        </div>
      </div>

      {/* Save/Reset Actions */}
      {hasChanges && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">You have unsaved changes</p>
              <p className="text-sm text-gray-600">Your profile visibility settings have been modified</p>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={handleResetChanges}
                disabled={updatePrivacySettings.isPending}
              >
                <X className="h-4 w-4 mr-2" />
                Reset
              </Button>
              <Button
                onClick={handleSaveChanges}
                disabled={updatePrivacySettings.isPending}
                className="bg-primary-600 hover:bg-primary-700"
              >
                {updatePrivacySettings.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfileVisibility;