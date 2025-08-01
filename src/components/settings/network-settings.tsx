import React, { useState, useEffect } from 'react';
import { Users, Globe, Bell, Settings, Info, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import workspaceNetworkService, { 
  NetworkPreferences, 
  AutoAddPolicy,
  DEFAULT_NETWORK_PREFERENCES 
} from '../../services/workspace-network';

interface NetworkSettingsProps {
  onSettingsChange?: (preferences: NetworkPreferences) => void;
}

const policyOptions: { value: AutoAddPolicy; label: string; description: string; icon: React.ComponentType }[] = [
  {
    value: 'auto-core',
    label: 'Auto-add to Core Network',
    description: 'Automatically add workspace collaborators to your Core Network (recommended)',
    icon: Users
  },
  {
    value: 'auto-extended',
    label: 'Auto-add to Extended Network',
    description: 'Automatically add workspace collaborators to your Extended Network',
    icon: Globe
  },
  {
    value: 'manual',
    label: 'Manual Review',
    description: 'Get notified when new collaborators join, decide manually',
    icon: Bell
  },
  {
    value: 'disabled',
    label: 'Disabled',
    description: 'Don\'t automatically add workspace collaborators to network',
    icon: Settings
  }
];

const departureBehaviorOptions = [
  {
    value: 'keep' as const,
    label: 'Keep Connection',
    description: 'Maintain network connection when someone leaves a workspace'
  },
  {
    value: 'demote' as const,
    label: 'Demote to Extended',
    description: 'Move Core connections to Extended when they leave workspaces'
  },
  {
    value: 'remove' as const,
    label: 'Remove Connection',
    description: 'Remove from network if they leave all shared workspaces'
  }
];

export function NetworkSettings({ onSettingsChange }: NetworkSettingsProps) {
  const [preferences, setPreferences] = useState<NetworkPreferences>(DEFAULT_NETWORK_PREFERENCES);
  const [hasChanges, setHasChanges] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load current preferences
    const currentPrefs = workspaceNetworkService.getPreferences();
    setPreferences(currentPrefs);
  }, []);

  const handlePreferenceChange = (key: keyof NetworkPreferences, value: any) => {
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);
    setHasChanges(true);
    setSaved(false);
  };

  const handleSave = () => {
    workspaceNetworkService.updatePreferences(preferences);
    onSettingsChange?.(preferences);
    setHasChanges(false);
    setSaved(true);
    
    // Hide saved indicator after 2 seconds
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setPreferences(DEFAULT_NETWORK_PREFERENCES);
    setHasChanges(true);
    setSaved(false);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-2xl font-bold text-gray-900">Network Settings</h2>
        <p className="mt-2 text-gray-600">
          Configure how workspace collaborations automatically build your professional network.
        </p>
      </div>

      {/* Default Policy Setting */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-semibold text-gray-900">Default Workspace Policy</h3>
          <div className="group relative">
            <Info className="h-4 w-4 text-gray-400 cursor-help" />
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
              This applies to all workspaces unless overridden
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {policyOptions.map(option => {
            const IconComponent = option.icon;
            const isSelected = preferences.defaultPolicy === option.value;
            
            return (
              <div
                key={option.value}
                onClick={() => handlePreferenceChange('defaultPolicy', option.value)}
                className={cn(
                  'border-2 rounded-lg p-4 cursor-pointer transition-all',
                  isSelected
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                )}
              >
                <div className="flex items-start space-x-3">
                  <div className={cn(
                    'p-2 rounded-lg',
                    isSelected ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'
                  )}>
                    <IconComponent className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={cn(
                      'font-medium',
                      isSelected ? 'text-primary-900' : 'text-gray-900'
                    )}>
                      {option.label}
                    </h4>
                    <p className={cn(
                      'text-sm mt-1',
                      isSelected ? 'text-primary-700' : 'text-gray-600'
                    )}>
                      {option.description}
                    </p>
                  </div>
                  {isSelected && (
                    <CheckCircle className="h-5 w-5 text-primary-600 flex-shrink-0" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Advanced Settings */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900">Advanced Settings</h3>
        
        {/* Notifications */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-start space-x-3">
            <Bell className="h-5 w-5 text-gray-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-gray-900">Network Notifications</h4>
              <p className="text-sm text-gray-600 mt-1">
                Get notified when new collaborators are added to your network
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.notificationsEnabled}
              onChange={(e) => handlePreferenceChange('notificationsEnabled', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>

        {/* Auto-promote to Core */}
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-start space-x-3">
              <Users className="h-5 w-5 text-gray-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-gray-900">Auto-promote to Core Network</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Automatically promote Extended connections to Core based on collaboration frequency
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.autoPromoteToCore}
                onChange={(e) => handlePreferenceChange('autoPromoteToCore', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>

          {preferences.autoPromoteToCore && (
            <div className="ml-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <label className="block text-sm font-medium text-blue-900 mb-2">
                Promotion Threshold
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={preferences.autoPromoteThreshold}
                  onChange={(e) => handlePreferenceChange('autoPromoteThreshold', parseInt(e.target.value))}
                  className="w-20 px-3 py-2 border border-blue-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="text-sm text-blue-700">
                  workspace interactions before promoting to Core Network
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Departure Behavior */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">When someone leaves a workspace:</h4>
          <div className="space-y-3">
            {departureBehaviorOptions.map(option => {
              const isSelected = preferences.departureBehavior === option.value;
              
              return (
                <div
                  key={option.value}
                  onClick={() => handlePreferenceChange('departureBehavior', option.value)}
                  className={cn(
                    'p-3 border rounded-lg cursor-pointer transition-all',
                    isSelected
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  )}
                >
                  <div className="flex items-center space-x-3">
                    <div className={cn(
                      'w-4 h-4 rounded-full border-2 flex items-center justify-center',
                      isSelected ? 'border-primary-500' : 'border-gray-300'
                    )}>
                      {isSelected && (
                        <div className="w-2 h-2 rounded-full bg-primary-500"></div>
                      )}
                    </div>
                    <div>
                      <h5 className={cn(
                        'font-medium',
                        isSelected ? 'text-primary-900' : 'text-gray-900'
                      )}>
                        {option.label}
                      </h5>
                      <p className={cn(
                        'text-sm',
                        isSelected ? 'text-primary-700' : 'text-gray-600'
                      )}>
                        {option.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Workspace Overrides Summary */}
      {Object.keys(preferences.workspaceOverrides).length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Workspace-Specific Settings</h3>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-900">Custom workspace policies active</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  {Object.keys(preferences.workspaceOverrides).length} workspace(s) have custom network policies that override your default setting.
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  You can manage these in individual workspace settings.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-200">
        <Button 
          variant="outline" 
          onClick={handleReset}
          disabled={!hasChanges}
        >
          Reset to Defaults
        </Button>
        
        <div className="flex items-center space-x-4">
          {saved && (
            <div className="flex items-center space-x-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Settings saved</span>
            </div>
          )}
          <Button 
            onClick={handleSave}
            disabled={!hasChanges}
            className={cn(
              hasChanges ? 'bg-primary-600 hover:bg-primary-700' : 'bg-gray-300'
            )}
          >
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}

export default NetworkSettings;