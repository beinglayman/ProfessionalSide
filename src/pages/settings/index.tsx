import React, { useState } from 'react';
import { User, Bell, Shield, Globe, Users, ArrowLeft, Edit, Clock, Settings, Link2, CreditCard } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { cn } from '../../lib/utils';
import NetworkSettings from '../../components/settings/network-settings';
import NotificationSettings from '../../components/settings/notification-settings';
import PrivacySettings from '../../components/settings/privacy-settings';
import ProfileVisibility from '../../components/settings/profile-visibility';
import IntegrationsSettings from '../../components/settings/integrations-settings';
import BillingSettings from '../../components/settings/billing-settings';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';

type SettingsTab = 'profile' | 'network' | 'notifications' | 'privacy' | 'integrations' | 'billing';

// Additional Settings Component
function AdditionalSettings() {
  const [feedAgeLimit, setFeedAgeLimit] = useState(7);
  const [hasChanges, setHasChanges] = useState(false);

  const handleFeedAgeLimitChange = (value: number) => {
    setFeedAgeLimit(value);
    setHasChanges(true);
  };

  const handleSave = () => {
    // TODO: Save to backend
    console.log('Saving feed age limit:', feedAgeLimit);
    setHasChanges(false);
  };

  const handleReset = () => {
    setFeedAgeLimit(7);
    setHasChanges(false);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <Settings className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Additional Settings</h3>
            <p className="text-sm text-gray-500">Configure additional preferences for your experience</p>
          </div>
        </div>
      </div>

      {/* Feed Age Limit Setting */}
      <div className="space-y-4">
        <div className="flex items-start justify-between py-4">
          <div className="flex items-start space-x-3 flex-1">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 mb-1">Feed Age Limit</h4>
              <p className="text-sm text-gray-600 mb-3">
                Show journal entries from the last N days in your activity feed. Older entries will be filtered out.
              </p>
              <div className="flex items-center space-x-4">
                <label htmlFor="feed-age-limit" className="text-sm font-medium text-gray-700">
                  Days:
                </label>
                <select
                  id="feed-age-limit"
                  value={feedAgeLimit}
                  onChange={(e) => handleFeedAgeLimitChange(parseInt(e.target.value))}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value={1}>1 day</option>
                  <option value={3}>3 days</option>
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                  <option value={90}>90 days</option>
                </select>
                <span className="text-sm text-gray-500">
                  ({feedAgeLimit === 1 ? '1 day' : `${feedAgeLimit} days`})
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save/Reset Actions */}
      {hasChanges && (
        <div className="border-t pt-4 mt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">You have unsaved changes</p>
              <p className="text-sm text-gray-600">Your additional settings have been modified</p>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={handleReset}
              >
                Reset
              </Button>
              <Button
                onClick={handleSave}
                className="bg-primary-600 hover:bg-primary-700"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const settingsTabs = [
  {
    id: 'profile' as SettingsTab,
    label: 'Profile',
    icon: User,
    description: 'Manage your profile information and preferences'
  },
  {
    id: 'network' as SettingsTab,
    label: 'Network',
    icon: Users,
    description: 'Configure workspace collaboration and network settings'
  },
  {
    id: 'notifications' as SettingsTab,
    label: 'Notifications',
    icon: Bell,
    description: 'Control how and when you receive notifications'
  },
  {
    id: 'privacy' as SettingsTab,
    label: 'Privacy',
    icon: Shield,
    description: 'Manage your privacy and data sharing preferences'
  },
  {
    id: 'integrations' as SettingsTab,
    label: 'Integrations',
    icon: Link2,
    description: 'Connect external tools to import work activity'
  },
  {
    id: 'billing' as SettingsTab,
    label: 'Billing',
    icon: CreditCard,
    description: 'Manage your subscription, credits, and payments'
  }
];

export function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') as SettingsTab | null;
  const validTabs: SettingsTab[] = ['profile', 'network', 'notifications', 'privacy', 'integrations', 'billing'];
  const [activeTab, setActiveTab] = useState<SettingsTab>(
    tabFromUrl && validTabs.includes(tabFromUrl) ? tabFromUrl : 'profile'
  );
  const navigate = useNavigate();

  // Update URL when tab changes
  const handleTabChange = (tab: SettingsTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'network':
        return <NetworkSettings />;
      
      case 'profile':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Profile Settings</h2>
              <p className="mt-2 text-gray-600">
                Manage your personal information, visibility, and preferences.
              </p>
            </div>
            
            {/* Edit Profile Section */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Edit className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Edit Profile</h3>
                      <p className="text-sm text-gray-500">Update your profile information, skills, and experience</p>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm mb-4">
                    Modify your profile details including professional summary, work experience, education, skills, and career goals.
                  </p>
                </div>
                <div className="flex-shrink-0 ml-6">
                  <Button asChild>
                    <Link to="/profile/edit" className="flex items-center space-x-2">
                      <Edit className="h-4 w-4" />
                      <span>Edit Profile</span>
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Profile Visibility Settings */}
            <ProfileVisibility />
            
            {/* Additional Settings */}
            <AdditionalSettings />
          </div>
        );
      
      case 'notifications':
        return <NotificationSettings />;
      
      case 'privacy':
        return <PrivacySettings />;

      case 'integrations':
        return <IntegrationsSettings />;

      case 'billing':
        return <BillingSettings />;

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="mt-2 text-gray-600">
            Manage your account preferences and configuration.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Settings Navigation */}
          <div className="lg:col-span-1">
            <nav className="space-y-2">
              {settingsTabs.map(tab => {
                const IconComponent = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={cn(
                      'w-full text-left p-4 rounded-lg transition-all duration-200',
                      isActive
                        ? 'bg-primary-50 border-2 border-primary-200 text-primary-900'
                        : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                    )}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={cn(
                        'p-2 rounded-lg',
                        isActive 
                          ? 'bg-primary-100 text-primary-700' 
                          : 'bg-gray-100 text-gray-600'
                      )}>
                        <IconComponent className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={cn(
                          'font-medium',
                          isActive ? 'text-primary-900' : 'text-gray-900'
                        )}>
                          {tab.label}
                        </h3>
                        <p className={cn(
                          'text-sm mt-1',
                          isActive ? 'text-primary-700' : 'text-gray-600'
                        )}>
                          {tab.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Settings Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8">
              {renderTabContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;