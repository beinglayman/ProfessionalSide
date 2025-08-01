// Workspace Network Integration Service
// Handles automatic detection and management of workspace collaborations

export type NetworkTier = 'core' | 'extended' | 'none';
export type AutoAddPolicy = 'auto-core' | 'auto-extended' | 'manual' | 'disabled';

// User preferences for workspace network integration
export interface NetworkPreferences {
  // Global profile-level settings
  defaultPolicy: AutoAddPolicy;
  notificationsEnabled: boolean;
  
  // Workspace-specific overrides
  workspaceOverrides: Record<string, AutoAddPolicy>;
  
  // Advanced settings
  autoPromoteToCore: boolean; // Promote extended to core after X interactions
  autoPromoteThreshold: number; // Number of workspace interactions
  departureBehavior: 'keep' | 'demote' | 'remove'; // What to do when someone leaves
}

// Workspace collaboration event
export interface WorkspaceCollaborationEvent {
  workspaceId: string;
  workspaceName: string;
  collaboratorId: string;
  collaboratorName: string;
  collaboratorEmail: string;
  collaboratorRole: string;
  eventType: 'joined' | 'invited' | 'left' | 'role_changed';
  timestamp: Date;
  invitedBy?: string;
}

// Network connection entry
export interface NetworkConnection {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatar: string;
  position: string;
  department: string;
  organization: string;
  tier: NetworkTier;
  context: 'workspace-collaborator' | 'followed-professional' | 'industry-contact' | 'former-colleague';
  
  // Workspace-specific data
  sharedWorkspaces: string[];
  collaborationHistory: {
    workspaceId: string;
    workspaceName: string;
    joinedAt: Date;
    leftAt?: Date;
    role: string;
    interactionCount: number;
  }[];
  
  // Auto-detection metadata
  autoAdded: boolean;
  autoAddedFrom?: string; // workspace ID where they were first detected
  lastInteraction: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Notification for new network connections
export interface NetworkNotification {
  id: string;
  type: 'workspace_connection_added' | 'workspace_connection_promoted' | 'workspace_connection_departed';
  title: string;
  message: string;
  connectionId: string;
  workspaceId: string;
  timestamp: Date;
  read: boolean;
  actions?: {
    label: string;
    action: 'move_to_extended' | 'move_to_core' | 'remove' | 'dismiss';
  }[];
}

// Default preferences
export const DEFAULT_NETWORK_PREFERENCES: NetworkPreferences = {
  defaultPolicy: 'auto-core',
  notificationsEnabled: true,
  workspaceOverrides: {},
  autoPromoteToCore: true,
  autoPromoteThreshold: 5,
  departureBehavior: 'keep'
};

class WorkspaceNetworkService {
  private preferences: NetworkPreferences = DEFAULT_NETWORK_PREFERENCES;
  private connections: Map<string, NetworkConnection> = new Map();
  private notifications: NetworkNotification[] = [];

  // Initialize service with user preferences
  initialize(userPreferences?: Partial<NetworkPreferences>) {
    this.preferences = { ...DEFAULT_NETWORK_PREFERENCES, ...userPreferences };
  }

  // Get effective policy for a workspace (considering overrides)
  getEffectivePolicy(workspaceId: string): AutoAddPolicy {
    return this.preferences.workspaceOverrides[workspaceId] || this.preferences.defaultPolicy;
  }

  // Process workspace collaboration event
  async processCollaborationEvent(event: WorkspaceCollaborationEvent): Promise<void> {
    const policy = this.getEffectivePolicy(event.workspaceId);
    
    if (policy === 'disabled') {
      return; // No auto-adding for this workspace
    }

    switch (event.eventType) {
      case 'joined':
      case 'invited':
        await this.handleCollaboratorJoined(event, policy);
        break;
      case 'left':
        await this.handleCollaboratorLeft(event);
        break;
      case 'role_changed':
        await this.handleRoleChanged(event);
        break;
    }
  }

  // Handle when someone joins a workspace
  private async handleCollaboratorJoined(
    event: WorkspaceCollaborationEvent,
    policy: AutoAddPolicy
  ): Promise<void> {
    if (policy === 'manual') {
      // Create notification for manual review
      this.createManualReviewNotification(event);
      return;
    }

    const existingConnection = this.connections.get(event.collaboratorId);
    const targetTier: NetworkTier = policy === 'auto-core' ? 'core' : 'extended';

    if (existingConnection) {
      // Update existing connection
      await this.updateExistingConnection(existingConnection, event, targetTier);
    } else {
      // Create new connection
      await this.createNewConnection(event, targetTier);
    }
  }

  // Create new network connection from workspace collaboration
  private async createNewConnection(
    event: WorkspaceCollaborationEvent,
    tier: NetworkTier
  ): Promise<void> {
    const connection: NetworkConnection = {
      id: event.collaboratorId,
      userId: event.collaboratorId,
      name: event.collaboratorName,
      email: event.collaboratorEmail,
      avatar: this.generateAvatarUrl(event.collaboratorEmail),
      position: event.collaboratorRole,
      department: 'Unknown', // Would be fetched from user profile
      organization: 'Unknown', // Would be fetched from workspace info
      tier,
      context: 'workspace-collaborator',
      sharedWorkspaces: [event.workspaceId],
      collaborationHistory: [{
        workspaceId: event.workspaceId,
        workspaceName: event.workspaceName,
        joinedAt: event.timestamp,
        role: event.collaboratorRole,
        interactionCount: 1
      }],
      autoAdded: true,
      autoAddedFrom: event.workspaceId,
      lastInteraction: event.timestamp,
      createdAt: event.timestamp,
      updatedAt: event.timestamp
    };

    this.connections.set(connection.id, connection);

    // Create notification
    if (this.preferences.notificationsEnabled) {
      this.createConnectionAddedNotification(connection, event);
    }
  }

  // Update existing connection with new workspace info
  private async updateExistingConnection(
    connection: NetworkConnection,
    event: WorkspaceCollaborationEvent,
    suggestedTier: NetworkTier
  ): Promise<void> {
    // Add workspace to shared workspaces if not already there
    if (!connection.sharedWorkspaces.includes(event.workspaceId)) {
      connection.sharedWorkspaces.push(event.workspaceId);
    }

    // Add to collaboration history
    const existingHistory = connection.collaborationHistory.find(
      h => h.workspaceId === event.workspaceId
    );

    if (existingHistory) {
      existingHistory.interactionCount++;
    } else {
      connection.collaborationHistory.push({
        workspaceId: event.workspaceId,
        workspaceName: event.workspaceName,
        joinedAt: event.timestamp,
        role: event.collaboratorRole,
        interactionCount: 1
      });
    }

    // Check for auto-promotion to core
    if (
      connection.tier === 'extended' && 
      suggestedTier === 'core' &&
      this.preferences.autoPromoteToCore
    ) {
      const totalInteractions = connection.collaborationHistory.reduce(
        (sum, h) => sum + h.interactionCount, 0
      );

      if (totalInteractions >= this.preferences.autoPromoteThreshold) {
        connection.tier = 'core';
        this.createPromotionNotification(connection, event);
      }
    }

    connection.lastInteraction = event.timestamp;
    connection.updatedAt = event.timestamp;
    this.connections.set(connection.id, connection);
  }

  // Handle when someone leaves a workspace
  private async handleCollaboratorLeft(event: WorkspaceCollaborationEvent): Promise<void> {
    const connection = this.connections.get(event.collaboratorId);
    if (!connection) return;

    // Update collaboration history
    const workspaceHistory = connection.collaborationHistory.find(
      h => h.workspaceId === event.workspaceId
    );
    if (workspaceHistory) {
      workspaceHistory.leftAt = event.timestamp;
    }

    // Apply departure behavior
    switch (this.preferences.departureBehavior) {
      case 'keep':
        // Do nothing - connection remains as is
        break;
      case 'demote':
        if (connection.tier === 'core') {
          connection.tier = 'extended';
          this.createDepartureNotification(connection, event, 'demoted');
        }
        break;
      case 'remove':
        // Only remove if they have no other shared workspaces
        const activeWorkspaces = connection.collaborationHistory.filter(
          h => !h.leftAt
        );
        if (activeWorkspaces.length === 0) {
          this.connections.delete(connection.id);
          this.createDepartureNotification(connection, event, 'removed');
        }
        break;
    }

    if (this.connections.has(connection.id)) {
      connection.updatedAt = event.timestamp;
      this.connections.set(connection.id, connection);
    }
  }

  // Handle role changes in workspace
  private async handleRoleChanged(event: WorkspaceCollaborationEvent): Promise<void> {
    const connection = this.connections.get(event.collaboratorId);
    if (!connection) return;

    // Update role in collaboration history
    const workspaceHistory = connection.collaborationHistory.find(
      h => h.workspaceId === event.workspaceId && !h.leftAt
    );
    if (workspaceHistory) {
      workspaceHistory.role = event.collaboratorRole;
      workspaceHistory.interactionCount++;
    }

    connection.updatedAt = event.timestamp;
    this.connections.set(connection.id, connection);
  }

  // Create notifications for various events
  private createConnectionAddedNotification(
    connection: NetworkConnection,
    event: WorkspaceCollaborationEvent
  ): void {
    const notification: NetworkNotification = {
      id: `conn_${connection.id}_${Date.now()}`,
      type: 'workspace_connection_added',
      title: 'New workspace collaborator added',
      message: `${connection.name} has been added to your ${connection.tier === 'core' ? 'Core' : 'Extended'} Network as a workspace collaborator in "${event.workspaceName}".`,
      connectionId: connection.id,
      workspaceId: event.workspaceId,
      timestamp: event.timestamp,
      read: false,
      actions: [
        {
          label: connection.tier === 'core' ? 'Move to Extended' : 'Move to Core',
          action: connection.tier === 'core' ? 'move_to_extended' : 'move_to_core'
        },
        {
          label: 'Remove from Network',
          action: 'remove'
        },
        {
          label: 'Dismiss',
          action: 'dismiss'
        }
      ]
    };

    this.notifications.unshift(notification);
  }

  private createPromotionNotification(
    connection: NetworkConnection,
    event: WorkspaceCollaborationEvent
  ): void {
    const notification: NetworkNotification = {
      id: `promo_${connection.id}_${Date.now()}`,
      type: 'workspace_connection_promoted',
      title: 'Connection promoted to Core Network',
      message: `${connection.name} has been promoted to your Core Network due to frequent collaboration across ${connection.sharedWorkspaces.length} shared workspace(s).`,
      connectionId: connection.id,
      workspaceId: event.workspaceId,
      timestamp: event.timestamp,
      read: false,
      actions: [
        {
          label: 'Move back to Extended',
          action: 'move_to_extended'
        },
        {
          label: 'Dismiss',
          action: 'dismiss'
        }
      ]
    };

    this.notifications.unshift(notification);
  }

  private createDepartureNotification(
    connection: NetworkConnection,
    event: WorkspaceCollaborationEvent,
    action: 'demoted' | 'removed'
  ): void {
    const notification: NetworkNotification = {
      id: `dept_${connection.id}_${Date.now()}`,
      type: 'workspace_connection_departed',
      title: `Connection ${action} after workspace departure`,
      message: `${connection.name} left "${event.workspaceName}" and has been ${action} ${action === 'demoted' ? 'to Extended Network' : 'from your network'}.`,
      connectionId: connection.id,
      workspaceId: event.workspaceId,
      timestamp: event.timestamp,
      read: false,
      actions: action === 'removed' ? [] : [
        {
          label: 'Restore to Core',
          action: 'move_to_core'
        },
        {
          label: 'Dismiss',
          action: 'dismiss'
        }
      ]
    };

    this.notifications.unshift(notification);
  }

  private createManualReviewNotification(event: WorkspaceCollaborationEvent): void {
    const notification: NetworkNotification = {
      id: `manual_${event.collaboratorId}_${Date.now()}`,
      type: 'workspace_connection_added',
      title: 'New collaborator requires manual review',
      message: `${event.collaboratorName} joined "${event.workspaceName}". Would you like to add them to your network?`,
      connectionId: event.collaboratorId,
      workspaceId: event.workspaceId,
      timestamp: event.timestamp,
      read: false,
      actions: [
        {
          label: 'Add to Core Network',
          action: 'move_to_core'
        },
        {
          label: 'Add to Extended Network',
          action: 'move_to_extended'
        },
        {
          label: 'Don\'t Add',
          action: 'dismiss'
        }
      ]
    };

    this.notifications.unshift(notification);
  }

  // Utility methods
  private generateAvatarUrl(email: string): string {
    // Generate a consistent avatar URL based on email
    const hash = email.toLowerCase().split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    const randomSeed = Math.abs(hash) % 1000;
    return `https://images.unsplash.com/photo-${1500000000000 + randomSeed}?w=100&h=100&fit=crop`;
  }

  // Public API methods
  getConnections(): NetworkConnection[] {
    return Array.from(this.connections.values());
  }

  getConnection(id: string): NetworkConnection | undefined {
    return this.connections.get(id);
  }

  getNotifications(): NetworkNotification[] {
    return this.notifications;
  }

  getUnreadNotifications(): NetworkNotification[] {
    return this.notifications.filter(n => !n.read);
  }

  markNotificationAsRead(notificationId: string): void {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
    }
  }

  // Execute notification action
  executeNotificationAction(notificationId: string, action: string): void {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (!notification) return;

    const connection = this.connections.get(notification.connectionId);
    
    switch (action) {
      case 'move_to_core':
        if (connection) {
          connection.tier = 'core';
          connection.updatedAt = new Date();
          this.connections.set(connection.id, connection);
        }
        break;
      case 'move_to_extended':
        if (connection) {
          connection.tier = 'extended';
          connection.updatedAt = new Date();
          this.connections.set(connection.id, connection);
        }
        break;
      case 'remove':
        this.connections.delete(notification.connectionId);
        break;
      case 'dismiss':
        // Just mark as read
        break;
    }

    this.markNotificationAsRead(notificationId);
  }

  updatePreferences(newPreferences: Partial<NetworkPreferences>): void {
    this.preferences = { ...this.preferences, ...newPreferences };
  }

  getPreferences(): NetworkPreferences {
    return { ...this.preferences };
  }

  // Set workspace-specific policy
  setWorkspacePolicy(workspaceId: string, policy: AutoAddPolicy): void {
    this.preferences.workspaceOverrides[workspaceId] = policy;
  }

  // Remove workspace policy override
  removeWorkspacePolicy(workspaceId: string): void {
    delete this.preferences.workspaceOverrides[workspaceId];
  }
}

// Create singleton instance
export const workspaceNetworkService = new WorkspaceNetworkService();

// Export types and service
export default workspaceNetworkService;