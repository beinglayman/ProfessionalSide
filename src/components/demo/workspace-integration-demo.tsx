import React, { useState } from 'react';
import { Users, UserPlus, UserMinus, Building2, Play, CheckCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import workspaceNetworkService, { WorkspaceCollaborationEvent } from '../../services/workspace-network';
import NetworkNotifications from '../network/network-notifications';

export function WorkspaceIntegrationDemo() {
  const [isRunning, setIsRunning] = useState(false);
  const [events, setEvents] = useState<WorkspaceCollaborationEvent[]>([]);
  const [currentStep, setCurrentStep] = useState(0);

  // Sample events to demonstrate the integration
  const demoEvents: WorkspaceCollaborationEvent[] = [
    {
      workspaceId: 'ws-demo-001',
      workspaceName: 'Frontend Development Team',
      collaboratorId: 'user-alice',
      collaboratorName: 'Alice Johnson',
      collaboratorEmail: 'alice@techcorp.com',
      collaboratorRole: 'Senior Frontend Developer',
      eventType: 'joined',
      timestamp: new Date(),
      invitedBy: 'current-user'
    },
    {
      workspaceId: 'ws-demo-001',
      workspaceName: 'Frontend Development Team',
      collaboratorId: 'user-bob',
      collaboratorName: 'Bob Chen',
      collaboratorEmail: 'bob@techcorp.com',
      collaboratorRole: 'UI/UX Designer',
      eventType: 'joined',
      timestamp: new Date(Date.now() + 1000),
      invitedBy: 'current-user'
    },
    {
      workspaceId: 'ws-demo-002',
      workspaceName: 'Data Analytics Project',
      collaboratorId: 'user-carol',
      collaboratorName: 'Carol Williams',
      collaboratorEmail: 'carol@analytics.com',
      collaboratorRole: 'Data Scientist',
      eventType: 'joined',
      timestamp: new Date(Date.now() + 2000),
      invitedBy: 'current-user'
    },
    {
      workspaceId: 'ws-demo-001',
      workspaceName: 'Frontend Development Team',
      collaboratorId: 'user-alice',
      collaboratorName: 'Alice Johnson',
      collaboratorEmail: 'alice@techcorp.com',
      collaboratorRole: 'Tech Lead',
      eventType: 'role_changed',
      timestamp: new Date(Date.now() + 3000)
    },
    {
      workspaceId: 'ws-demo-002',
      workspaceName: 'Data Analytics Project',
      collaboratorId: 'user-carol',
      collaboratorName: 'Carol Williams',
      collaboratorEmail: 'carol@analytics.com',
      collaboratorRole: 'Data Scientist',
      eventType: 'left',
      timestamp: new Date(Date.now() + 4000)
    }
  ];

  const runDemo = async () => {
    setIsRunning(true);
    setEvents([]);
    setCurrentStep(0);

    // Initialize the service with demo preferences
    workspaceNetworkService.initialize({
      defaultPolicy: 'auto-core',
      notificationsEnabled: true,
      workspaceOverrides: {
        'ws-demo-002': 'auto-extended' // Override for Data Analytics Project
      },
      autoPromoteToCore: true,
      autoPromoteThreshold: 3,
      departureBehavior: 'keep'
    });

    // Process events one by one with delay
    for (let i = 0; i < demoEvents.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const event = demoEvents[i];
      setEvents(prev => [...prev, event]);
      setCurrentStep(i + 1);
      
      // Process the event through the service
      await workspaceNetworkService.processCollaborationEvent(event);
    }

    setIsRunning(false);
  };

  const resetDemo = () => {
    setEvents([]);
    setCurrentStep(0);
    // Reset service state if needed
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'joined':
        return UserPlus;
      case 'left':
        return UserMinus;
      case 'role_changed':
        return Users;
      default:
        return Building2;
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'joined':
        return 'text-green-600 bg-green-100';
      case 'left':
        return 'text-red-600 bg-red-100';
      case 'role_changed':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getEventDescription = (event: WorkspaceCollaborationEvent) => {
    switch (event.eventType) {
      case 'joined':
        return `${event.collaboratorName} joined "${event.workspaceName}" as ${event.collaboratorRole}`;
      case 'left':
        return `${event.collaboratorName} left "${event.workspaceName}"`;
      case 'role_changed':
        return `${event.collaboratorName} role changed to ${event.collaboratorRole} in "${event.workspaceName}"`;
      default:
        return `${event.collaboratorName} - ${event.eventType} in "${event.workspaceName}"`;
    }
  };

  return (
    <div className="space-y-8">
      {/* Demo Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Workspace Integration Demo
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          This demo shows how workspace collaboration events automatically build your professional network.
          Watch as team members join workspaces and get added to your network based on your preferences.
        </p>
      </div>

      {/* Demo Controls */}
      <div className="flex items-center justify-center space-x-4">
        <Button
          onClick={runDemo}
          disabled={isRunning}
          className="flex items-center space-x-2"
        >
          <Play className="h-4 w-4" />
          <span>{isRunning ? 'Running Demo...' : 'Run Demo'}</span>
        </Button>
        
        <Button
          variant="outline"
          onClick={resetDemo}
          disabled={isRunning}
        >
          Reset
        </Button>
      </div>

      {/* Demo Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Events Timeline */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Workspace Events</h3>
          
          <div className="space-y-3">
            {demoEvents.map((event, index) => {
              const IconComponent = getEventIcon(event.eventType);
              const isProcessed = index < currentStep;
              const isProcessing = index === currentStep - 1 && isRunning;
              
              return (
                <div
                  key={`${event.collaboratorId}-${event.eventType}-${index}`}
                  className={cn(
                    'flex items-start space-x-3 p-4 rounded-lg border transition-all duration-300',
                    isProcessed 
                      ? 'bg-white border-green-200' 
                      : 'bg-gray-50 border-gray-200',
                    isProcessing && 'ring-2 ring-primary-500 border-primary-300'
                  )}
                >
                  <div className={cn(
                    'p-2 rounded-lg transition-all duration-300',
                    isProcessed 
                      ? getEventColor(event.eventType)
                      : 'bg-gray-200 text-gray-400'
                  )}>
                    <IconComponent className="h-4 w-4" />
                  </div>
                  
                  <div className="flex-1">
                    <p className={cn(
                      'text-sm font-medium transition-colors duration-300',
                      isProcessed ? 'text-gray-900' : 'text-gray-500'
                    )}>
                      {getEventDescription(event)}
                    </p>
                    <p className={cn(
                      'text-xs mt-1 transition-colors duration-300',
                      isProcessed ? 'text-gray-600' : 'text-gray-400'
                    )}>
                      Step {index + 1} of {demoEvents.length}
                    </p>
                  </div>
                  
                  {isProcessed && (
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Network Notifications */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Network Notifications</h3>
          
          <div className="bg-white border border-gray-200 rounded-lg p-4 min-h-[400px]">
            <NetworkNotifications
              maxNotifications={10}
              onNotificationAction={(notificationId, action) => {
                console.log('Demo: Notification action:', { notificationId, action });
              }}
            />
          </div>
        </div>
      </div>

      {/* Current Settings Display */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">Current Network Settings</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium text-blue-900">Default Policy:</p>
            <p className="text-blue-700">Auto-add to Core Network</p>
          </div>
          <div>
            <p className="font-medium text-blue-900">Notifications:</p>
            <p className="text-blue-700">Enabled</p>
          </div>
          <div>
            <p className="font-medium text-blue-900">Auto-promote:</p>
            <p className="text-blue-700">Enabled (after 3 interactions)</p>
          </div>
          <div>
            <p className="font-medium text-blue-900">Departure Behavior:</p>
            <p className="text-blue-700">Keep connections</p>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-blue-200">
          <p className="font-medium text-blue-900 mb-2">Workspace Overrides:</p>
          <div className="bg-blue-100 rounded-lg p-3">
            <p className="text-blue-800 text-sm">
              <span className="font-medium">Data Analytics Project:</span> Auto-add to Extended Network
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WorkspaceIntegrationDemo;