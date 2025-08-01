import React, { useState } from 'react';
import { User, Bell, Shield, Globe, Users, ArrowLeft, Edit } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { cn } from '../../lib/utils';
import NetworkSettings from '../../components/settings/network-settings';
import NotificationSettings from '../../components/settings/notification-settings';
import PrivacySettings from '../../components/settings/privacy-settings';
import ProfileVisibility from '../../components/settings/profile-visibility';
import { useNavigate, Link } from 'react-router-dom';

type SettingsTab = 'profile' | 'network' | 'notifications' | 'privacy';

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
  }
];

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const navigate = useNavigate();

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
                    <Link to="/onboarding" className="flex items-center space-x-2">
                      <Edit className="h-4 w-4" />
                      <span>Edit Profile</span>
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Profile Visibility Settings */}
            <ProfileVisibility />
          </div>
        );
      
      case 'notifications':
        return <NotificationSettings />;
      
      case 'privacy':
        return <PrivacySettings />;
      
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
                    onClick={() => setActiveTab(tab.id)}
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