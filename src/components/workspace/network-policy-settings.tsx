import React, { useState, useEffect } from 'react';
import { Users, Globe, Bell, Settings, Info, CheckCircle, AlertTriangle, Cog } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import workspaceNetworkService, { AutoAddPolicy } from '../../services/workspace-network';

interface NetworkPolicySettingsProps {
  workspaceId: string;
  workspaceName: string;
  isOwner?: boolean;
  onPolicyChange?: (policy: AutoAddPolicy | null) => void;
}

const policyOptions: { value: AutoAddPolicy; label: string; description: string; icon: React.ComponentType; color: string }[] = [
  {
    value: 'auto-core',
    label: 'Auto-add to Core Network',
    description: 'Automatically add new workspace members to your Core Network',
    icon: Users,
    color: 'text-blue-600'
  },
  {
    value: 'auto-extended',
    label: 'Auto-add to Extended Network',
    description: 'Automatically add new workspace members to your Extended Network',
    icon: Globe,
    color: 'text-green-600'
  },
  {
    value: 'manual',
    label: 'Manual Review',
    description: 'Get notified when new members join, decide manually',
    icon: Bell,
    color: 'text-yellow-600'
  },
  {
    value: 'disabled',
    label: 'Disabled',
    description: 'Don\'t add workspace members to network automatically',
    icon: Settings,
    color: 'text-gray-600'
  }
];

export function NetworkPolicySettings({ 
  workspaceId, 
  workspaceName, 
  isOwner = false,
  onPolicyChange 
}: NetworkPolicySettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentPolicy, setCurrentPolicy] = useState<AutoAddPolicy | null>(null);
  const [defaultPolicy, setDefaultPolicy] = useState<AutoAddPolicy>('auto-core');
  const [hasChanges, setHasChanges] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load current workspace policy and default policy
    const preferences = workspaceNetworkService.getPreferences();
    setDefaultPolicy(preferences.defaultPolicy);
    
    const workspacePolicy = preferences.workspaceOverrides[workspaceId] || null;
    setCurrentPolicy(workspacePolicy);
  }, [workspaceId]);

  const effectivePolicy = currentPolicy || defaultPolicy;

  const handlePolicyChange = (policy: AutoAddPolicy | 'use-default') => {
    const newPolicy = policy === 'use-default' ? null : policy;
    setCurrentPolicy(newPolicy);
    setHasChanges(true);
    setSaved(false);
  };

  const handleSave = () => {
    if (currentPolicy) {
      workspaceNetworkService.setWorkspacePolicy(workspaceId, currentPolicy);
    } else {
      workspaceNetworkService.removeWorkspacePolicy(workspaceId);
    }
    
    onPolicyChange?.(currentPolicy);
    setHasChanges(false);
    setSaved(true);
    
    // Hide saved indicator after 2 seconds
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setCurrentPolicy(null);
    setHasChanges(true);
    setSaved(false);
  };

  const getCurrentPolicyOption = () => {
    return policyOptions.find(option => option.value === effectivePolicy) || policyOptions[0];
  };

  const currentOption = getCurrentPolicyOption();
  const CurrentIcon = currentOption.icon;

  return (
    <div className="space-y-4">
      {/* Policy Display */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center space-x-3">
          <div className={cn('p-2 bg-white rounded-lg', currentOption.color)}>
            <CurrentIcon className="h-4 w-4" />
          </div>
          <div>
            <h4 className="font-medium text-gray-900">Network Policy</h4>
            <p className="text-sm text-gray-600">
              {currentPolicy ? (
                <>
                  <span className="font-medium">{currentOption.label}</span>
                  <span className="text-gray-500 ml-2">(Custom for this workspace)</span>
                </>
              ) : (
                <>
                  <span className="font-medium">{currentOption.label}</span>
                  <span className="text-gray-500 ml-2">(Using your default setting)</span>
                </>
              )}
            </p>
          </div>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2"
        >
          <Cog className="h-4 w-4" />
          <span>Configure</span>
        </Button>
      </div>

      {/* Configuration Panel */}
      {isOpen && (
        <div className="border border-gray-200 rounded-lg p-6 bg-white">
          <div className="space-y-6">
            {/* Header */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Network Policy for "{workspaceName}"
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Configure how new members of this workspace are added to your professional network.
              </p>
            </div>

            {/* Use Default Option */}
            <div
              onClick={() => handlePolicyChange('use-default')}
              className={cn(
                'border rounded-lg p-4 cursor-pointer transition-all',
                !currentPolicy
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              )}
            >
              <div className="flex items-center space-x-3">
                <div className={cn(
                  'w-4 h-4 rounded-full border-2 flex items-center justify-center',
                  !currentPolicy ? 'border-primary-500' : 'border-gray-300'
                )}>
                  {!currentPolicy && (
                    <div className="w-2 h-2 rounded-full bg-primary-500"></div>
                  )}
                </div>
                <div className="flex-1">
                  <h4 className={cn(
                    'font-medium',
                    !currentPolicy ? 'text-primary-900' : 'text-gray-900'
                  )}>
                    Use Default Policy
                  </h4>
                  <p className={cn(
                    'text-sm mt-1',
                    !currentPolicy ? 'text-primary-700' : 'text-gray-600'
                  )}>
                    Follow your account's default network policy: <span className="font-medium">{getCurrentPolicyOption().label}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Custom Policy Options */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Or set a custom policy for this workspace:</h4>
              
              {policyOptions.map(option => {
                const IconComponent = option.icon;
                const isSelected = currentPolicy === option.value;
                
                return (
                  <div
                    key={option.value}
                    onClick={() => handlePolicyChange(option.value)}
                    className={cn(
                      'border rounded-lg p-4 cursor-pointer transition-all',
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
                      <div className={cn('p-2 rounded-lg bg-gray-100', option.color)}>
                        <IconComponent className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <h5 className={cn(
                          'font-medium',
                          isSelected ? 'text-primary-900' : 'text-gray-900'
                        )}>
                          {option.label}
                        </h5>
                        <p className={cn(
                          'text-sm mt-1',
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

            {/* Impact Warning */}
            {currentPolicy && currentPolicy !== defaultPolicy && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-900">Custom Policy Active</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      This workspace will use "{getCurrentPolicyOption().label}" instead of your default policy.
                      This setting only affects your personal network - other workspace members have their own policies.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <Button 
                variant="outline" 
                onClick={handleReset}
                disabled={!currentPolicy}
              >
                Use Default
              </Button>
              
              <div className="flex items-center space-x-4">
                {saved && (
                  <div className="flex items-center space-x-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Policy saved</span>
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline"
                    onClick={() => setIsOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSave}
                    disabled={!hasChanges}
                    className={cn(
                      hasChanges ? 'bg-primary-600 hover:bg-primary-700' : 'bg-gray-300'
                    )}
                  >
                    Save Policy
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default NetworkPolicySettings;