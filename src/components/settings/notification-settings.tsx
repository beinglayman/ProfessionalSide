import React, { useState } from 'react';
import { Bell, Mail, Smartphone, Check, X } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { useNotificationPreferences, useUpdateNotificationPreferences } from '../../hooks/useNotifications';
import { useToast } from '../../contexts/ToastContext';

// Helper function to format time for display
function formatTime(time24: string): string {
  if (!time24) return '';
  
  const [hours, minutes] = time24.split(':');
  const hour12 = parseInt(hours);
  const ampm = hour12 >= 12 ? 'PM' : 'AM';
  const displayHour = hour12 % 12 || 12;
  
  return `${displayHour}:${minutes} ${ampm}`;
}

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

interface NotificationSettingProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

function NotificationSetting({ icon, title, description, checked, onChange, disabled = false }: NotificationSettingProps) {
  return (
    <div className={cn(
      'flex items-center justify-between py-4 px-4 rounded-lg border transition-colors',
      checked ? 'bg-primary-50 border-primary-200' : 'bg-white border-gray-200',
      disabled && 'opacity-60'
    )}>
      <div className="flex items-start space-x-3 flex-1">
        <div className={cn(
          'p-2 rounded-lg',
          checked ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'
        )}>
          {icon}
        </div>
        <div className="flex-1">
          <h4 className={cn(
            'font-medium',
            checked ? 'text-primary-900' : 'text-gray-900'
          )}>
            {title}
          </h4>
          <p className={cn(
            'text-sm mt-1',
            checked ? 'text-primary-700' : 'text-gray-600'
          )}>
            {description}
          </p>
        </div>
      </div>
      <div className="flex-shrink-0 ml-4">
        <ToggleSwitch 
          checked={checked} 
          onChange={onChange}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

interface NotificationChannelProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

function NotificationChannel({ icon, title, description, checked, onChange, disabled = false }: NotificationChannelProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center space-x-3">
        <div className={cn(
          'p-2 rounded-lg',
          checked ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
        )}>
          {icon}
        </div>
        <div>
          <h4 className="font-medium text-gray-900">{title}</h4>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>
      <ToggleSwitch 
        checked={checked} 
        onChange={onChange}
        disabled={disabled}
      />
    </div>
  );
}

export function NotificationSettings() {
  const { toast } = useToast();
  const { data: preferences, isLoading } = useNotificationPreferences();
  const updatePreferences = useUpdateNotificationPreferences();
  
  const [localPreferences, setLocalPreferences] = useState(preferences);
  const [hasChanges, setHasChanges] = useState(false);

  // Update local state when preferences are loaded
  React.useEffect(() => {
    if (preferences) {
      setLocalPreferences(preferences);
    }
  }, [preferences]);

  const handlePreferenceChange = (key: string, value: boolean) => {
    if (!localPreferences) return;
    
    const updated = { ...localPreferences, [key]: value };
    setLocalPreferences(updated);
    setHasChanges(true);
  };

  const handleDigestFrequencyChange = (frequency: 'NONE' | 'DAILY' | 'WEEKLY') => {
    if (!localPreferences) return;
    
    const updated = { ...localPreferences, digestFrequency: frequency };
    setLocalPreferences(updated);
    setHasChanges(true);
  };

  const handleQuietHoursChange = (start: string | undefined, end: string | undefined) => {
    if (!localPreferences) return;
    
    const updated = { 
      ...localPreferences, 
      quietHoursStart: start,
      quietHoursEnd: end
    };
    setLocalPreferences(updated);
    setHasChanges(true);
  };

  const handleSaveChanges = async () => {
    if (!localPreferences || !hasChanges) return;

    try {
      await updatePreferences.mutateAsync(localPreferences);
      setHasChanges(false);
      toast.success('Notification preferences updated successfully');
    } catch (error) {
      toast.error('Failed to update notification preferences');
    }
  };

  const handleResetChanges = () => {
    if (preferences) {
      setLocalPreferences(preferences);
      setHasChanges(false);
    }
  };

  if (isLoading || !localPreferences) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Notification Settings</h2>
          <p className="mt-2 text-gray-600">Loading your notification preferences...</p>
        </div>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Notification Settings</h2>
        <p className="mt-2 text-gray-600">
          Control how and when you receive notifications about activity on InChronicle.
        </p>
      </div>

      {/* Notification Channels */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Notification Channels</h3>
          <p className="text-sm text-gray-600">Choose how you want to receive notifications</p>
        </div>
        
        <div className="space-y-4">
          <NotificationChannel
            icon={<Bell className="h-4 w-4" />}
            title="In-App Notifications"
            description="Receive notifications within the application"
            checked={true}
            onChange={() => {}} // Always enabled
            disabled={true}
          />
          
          <NotificationChannel
            icon={<Mail className="h-4 w-4" />}
            title="Email Notifications"
            description="Receive notifications via email"
            checked={localPreferences.emailNotifications}
            onChange={(checked) => handlePreferenceChange('emailNotifications', checked)}
          />
          
          <NotificationChannel
            icon={<Smartphone className="h-4 w-4" />}
            title="Push Notifications"
            description="Receive push notifications on your devices"
            checked={localPreferences.pushNotifications}
            onChange={(checked) => handlePreferenceChange('pushNotifications', checked)}
          />
        </div>
      </div>

      {/* Email Digest Settings */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Email Digest</h3>
          <p className="text-sm text-gray-600">Receive a summary of your notifications via email</p>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <input
              type="radio"
              id="digest-none"
              name="digestFrequency"
              value="NONE"
              checked={localPreferences.digestFrequency === 'NONE'}
              onChange={() => handleDigestFrequencyChange('NONE')}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
            />
            <label htmlFor="digest-none" className="text-sm text-gray-700">
              Never send email digest
            </label>
          </div>
          
          <div className="flex items-center space-x-3">
            <input
              type="radio"
              id="digest-daily"
              name="digestFrequency"
              value="DAILY"
              checked={localPreferences.digestFrequency === 'DAILY'}
              onChange={() => handleDigestFrequencyChange('DAILY')}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
            />
            <label htmlFor="digest-daily" className="text-sm text-gray-700">
              Daily digest (at 8:00 PM)
            </label>
          </div>
          
          <div className="flex items-center space-x-3">
            <input
              type="radio"
              id="digest-weekly"
              name="digestFrequency"
              value="WEEKLY"
              checked={localPreferences.digestFrequency === 'WEEKLY'}
              onChange={() => handleDigestFrequencyChange('WEEKLY')}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
            />
            <label htmlFor="digest-weekly" className="text-sm text-gray-700">
              Weekly digest (Friday evenings)
            </label>
          </div>
        </div>
      </div>

      {/* Save/Reset Actions */}
      {hasChanges && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">You have unsaved changes</p>
              <p className="text-sm text-gray-600">Your notification preferences have been modified</p>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={handleResetChanges}
                disabled={updatePreferences.isPending}
              >
                <X className="h-4 w-4 mr-2" />
                Reset
              </Button>
              <Button
                onClick={handleSaveChanges}
                disabled={updatePreferences.isPending}
                className="bg-primary-600 hover:bg-primary-700"
              >
                {updatePreferences.isPending ? (
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

export default NotificationSettings;