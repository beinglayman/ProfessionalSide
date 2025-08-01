import React, { useState, useEffect } from 'react';
import { Globe, Users, Mail, MapPin, Building, Check, X } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { usePrivacySettings, useUpdatePrivacySettings } from '../../hooks/useDataPrivacy';
import { useToast } from '../../contexts/ToastContext';

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