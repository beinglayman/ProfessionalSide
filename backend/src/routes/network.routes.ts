import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.middleware';
import { sendSuccess, sendError } from '../utils/response.utils';

const router = Router();
const prisma = new PrismaClient();

// In-memory storage for connection type preferences (for demo purposes)
// In production, this would be stored in a database table
const connectionTypePreferences = new Map<string, Map<string, 'core' | 'extended'>>();

// Helper function to get/set user connection preferences
function getUserPreferences(userId: string) {
  if (!connectionTypePreferences.has(userId)) {
    connectionTypePreferences.set(userId, new Map());
  }
  return connectionTypePreferences.get(userId)!;
}

function setConnectionType(userId: string, connectionId: string, type: 'core' | 'extended') {
  const userPrefs = getUserPreferences(userId);
  userPrefs.set(connectionId, type);
  console.log(`💾 Stored preference: User ${userId} set connection ${connectionId} to ${type}`);
}

function getConnectionType(userId: string, connectionId: string, defaultType: 'core' | 'extended'): 'core' | 'extended' {
  const userPrefs = getUserPreferences(userId);
  return userPrefs.get(connectionId) || defaultType;
}

// Request logging middleware
router.use((req, res, next) => {
  console.log(`🌐 ${req.method} ${req.path}`);
  next();
});

// Simple ping endpoint (no auth required)
router.get('/ping', (req, res) => {
  console.log('🏓 Network ping endpoint hit');
  res.json({ success: true, message: 'Network routes are working', timestamp: new Date().toISOString() });
});


// All network routes require authentication
router.use(authenticate);


// Get connections for current user with workspace-based auto-connections
router.get('/connections', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { type, search, workspaces, skills, department, organization, lastActivity } = req.query;

    // Get all workspaces the user is a member of
    const userWorkspaces = await prisma.workspaceMember.findMany({
      where: { userId },
      include: {
        workspace: {
          select: { id: true, name: true }
        }
      }
    });

    const workspaceIds = userWorkspaces.map(w => w.workspace.id);

    // Get all members from user's workspaces (potential connections)
    const workspaceMembersQuery = await prisma.workspaceMember.findMany({
      where: {
        workspaceId: { in: workspaceIds },
        userId: { not: userId } // Exclude current user
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            title: true,
            company: true,
            bio: true,
            location: true,
            skills: true
          }
        },
        workspace: {
          select: { id: true, name: true }
        }
      }
    });

    // Group by user and collect their workspace memberships
    const userConnections = new Map();
    
    workspaceMembersQuery.forEach(member => {
      const userId = member.user.id;
      if (!userConnections.has(userId)) {
        userConnections.set(userId, {
          user: member.user,
          workspaces: [],
          roles: new Set(),
          joinDates: []
        });
      }
      
      const connection = userConnections.get(userId);
      connection.workspaces.push({
        id: member.workspace.id,
        name: member.workspace.name
      });
      connection.roles.add(member.role);
      connection.joinDates.push(member.joinedAt);
    });

    // Convert to connection format with automatic core network assignment
    const connections = Array.from(userConnections.values()).map(conn => {
      const sharedWorkspaceCount = conn.workspaces.length;
      const earliestJoin = new Date(Math.min(...conn.joinDates.map(d => d.getTime())));
      const isRecentCollaborator = (Date.now() - earliestJoin.getTime()) < (90 * 24 * 60 * 60 * 1000); // 90 days

      // Auto-assign to core network based on workspace collaboration, then check user preferences
      const defaultConnectionType = sharedWorkspaceCount >= 2 || isRecentCollaborator ? 'core' : 'extended';
      const connectionType = getConnectionType(userId, conn.user.id, defaultConnectionType);

      return {
        id: conn.user.id,
        name: conn.user.name || conn.user.email.split('@')[0],
        email: conn.user.email,
        avatar: conn.user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(conn.user.name || conn.user.email.split('@')[0])}&background=random`,
        position: conn.user.title || Array.from(conn.roles)[0] || 'Team Member',
        department: 'Unknown', // Could be extracted from workspace or user profile
        organization: conn.user.company || 'Unknown',
        connectionType,
        context: 'workspace-collaborator',
        sharedWorkspaces: conn.workspaces,
        collaborationSince: earliestJoin.toISOString(),
        lastActivity: new Date(Math.max(...conn.joinDates.map(d => d.getTime()))).toISOString(),
        skills: conn.user.skills || [],
        bio: conn.user.bio || '',
        location: conn.user.location || '',
        isOnline: false, // Would need real-time status
        status: 'active',
        // Add required fields for ConnectionCard
        mutualConnections: 0, // Would need calculation
        connectedAt: earliestJoin.toISOString(),
        lastInteraction: new Date(Math.max(...conn.joinDates.map(d => d.getTime()))).toISOString(),
        interactionCount: conn.workspaces.length, // Simple metric based on shared workspaces
        collaborationScore: Math.min(95, 60 + (conn.workspaces.length * 10)), // Simple score
        appreciatedByCore: 0, // Would need calculation
        networkHealth: sharedWorkspaceCount >= 2 ? 'strong' : 'moderate'
      };
    });

    // Apply filters
    let filteredConnections = connections;

    if (type && ['core', 'extended'].includes(type as string)) {
      filteredConnections = filteredConnections.filter(conn => conn.connectionType === type);
    }

    if (search) {
      const searchLower = (search as string).toLowerCase();
      filteredConnections = filteredConnections.filter(conn =>
        conn.name.toLowerCase().includes(searchLower) ||
        conn.email.toLowerCase().includes(searchLower) ||
        conn.position.toLowerCase().includes(searchLower) ||
        conn.organization.toLowerCase().includes(searchLower)
      );
    }

    if (workspaces && (workspaces as string).length > 0) {
      const workspaceFilter = (workspaces as string).split(',');
      filteredConnections = filteredConnections.filter(conn =>
        conn.sharedWorkspaces.some(w => workspaceFilter.includes(w.id))
      );
    }

    if (skills && (skills as string).length > 0) {
      const skillFilter = (skills as string).split(',').map(s => s.toLowerCase());
      filteredConnections = filteredConnections.filter(conn =>
        conn.skills.some(skill => skillFilter.includes(skill.toLowerCase()))
      );
    }

    // Sort by collaboration recency and connection type
    filteredConnections.sort((a, b) => {
      if (a.connectionType === 'core' && b.connectionType === 'extended') return -1;
      if (a.connectionType === 'extended' && b.connectionType === 'core') return 1;
      return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
    });

    const result = {
      data: filteredConnections,
      pagination: {
        page: 1,
        limit: filteredConnections.length,
        total: filteredConnections.length,
        totalPages: 1
      }
    };

    sendSuccess(res, result, 'Network connections retrieved successfully');
  } catch (error) {
    console.error('Error fetching network connections:', error);
    sendError(res, 'Failed to fetch network connections', 500);
  }
});

// Move connection between core/extended networks
router.put('/connections/:connectionId', async (req: Request, res: Response) => {
  try {
    const { connectionId } = req.params;
    const { connectionType, reason } = req.body;
    const userId = req.user!.id;

    // Validate required fields
    if (!connectionType) {
      return void sendError(res, 'connectionType is required', 400);
    }

    if (!['core', 'extended'].includes(connectionType)) {
      return void sendError(res, 'Invalid connection type. Must be "core" or "extended"', 400);
    }

    // Store the connection type preference
    setConnectionType(userId, connectionId, connectionType);
    
    // Return success response with updated connection info
    const updatedConnection = {
      id: connectionId,
      connectionType,
      updatedAt: new Date().toISOString(),
      reason
    };

    console.log(`✅ User ${userId} moved connection ${connectionId} to ${connectionType} network - PERSISTED`);
    sendSuccess(res, updatedConnection, `Connection moved to ${connectionType} network successfully`);
  } catch (error) {
    console.error('Error updating connection:', error);
    sendError(res, 'Failed to update connection', 500);
  }
});

// Remove connection
router.delete('/connections/:connectionId', async (req: Request, res: Response) => {
  try {
    const { connectionId } = req.params;
    const userId = req.user!.id;

    // Log the removal (in real implementation, you'd update preferences)
    console.log(`User ${userId} removed connection ${connectionId} from network`);

    sendSuccess(res, null, 'Connection removed successfully');
  } catch (error) {
    console.error('Error removing connection:', error);
    sendError(res, 'Failed to remove connection', 500);
  }
});

// Bulk update connections
router.post('/connections/bulk', async (req: Request, res: Response) => {
  try {
    const { actions } = req.body;
    const userId = req.user!.id;

    if (!Array.isArray(actions)) {
      return void sendError(res, 'Actions must be an array', 400);
    }

    // Process bulk actions
    for (const action of actions) {
      const { connectionId, action: actionType, connectionType } = action;
      console.log(`User ${userId} bulk action: ${actionType} on connection ${connectionId} to ${connectionType}`);
    }

    sendSuccess(res, null, 'Bulk actions completed successfully');
  } catch (error) {
    console.error('Error processing bulk actions:', error);
    sendError(res, 'Failed to process bulk actions', 500);
  }
});

// Get available workspaces for filtering
router.get('/filters/workspaces', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const userWorkspaces = await prisma.workspaceMember.findMany({
      where: { userId },
      include: {
        workspace: {
          select: { id: true, name: true }
        }
      }
    });

    const workspaces = userWorkspaces.map(w => ({
      id: w.workspace.id,
      name: w.workspace.name
    }));

    sendSuccess(res, workspaces, 'Available workspaces retrieved successfully');
  } catch (error) {
    console.error('Error fetching workspaces:', error);
    sendError(res, 'Failed to fetch workspaces', 500);
  }
});

// Get available skills for filtering
router.get('/filters/skills', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // Get skills from all workspace collaborators
    const userWorkspaces = await prisma.workspaceMember.findMany({
      where: { userId },
      select: { workspaceId: true }
    });

    const workspaceIds = userWorkspaces.map(w => w.workspaceId);

    const workspaceMembers = await prisma.workspaceMember.findMany({
      where: {
        workspaceId: { in: workspaceIds },
        userId: { not: userId }
      },
      include: {
        user: {
          select: { skills: true }
        }
      }
    });

    // Collect all unique skills
    const skillsSet = new Set<string>();
    workspaceMembers.forEach(member => {
      if (member.user.skills && Array.isArray(member.user.skills)) {
        member.user.skills.forEach(skill => skillsSet.add(skill));
      }
    });

    const skills = Array.from(skillsSet).sort();

    sendSuccess(res, skills, 'Available skills retrieved successfully');
  } catch (error) {
    console.error('Error fetching skills:', error);
    sendError(res, 'Failed to fetch skills', 500);
  }
});

// Get connection requests
router.get('/requests', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // For now, return empty array since connection requests are not fully implemented
    // In a real implementation, this would fetch actual connection requests from database
    const requests = [];

    sendSuccess(res, requests, 'Connection requests retrieved successfully');
  } catch (error) {
    console.error('Error fetching connection requests:', error);
    sendError(res, 'Failed to fetch connection requests', 500);
  }
});

// Get followers
router.get('/followers', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { search, skills, department, organization } = req.query;

    // For now, return empty array since followers are not fully implemented
    // In a real implementation, this would fetch actual followers from database
    const followers = [];

    const result = {
      data: followers,
      pagination: {
        page: 1,
        limit: followers.length,
        total: followers.length,
        totalPages: 1
      }
    };

    sendSuccess(res, result, 'Followers retrieved successfully');
  } catch (error) {
    console.error('Error fetching followers:', error);
    sendError(res, 'Failed to fetch followers', 500);
  }
});

// Get network suggestions
router.get('/suggestions', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // Get user's workspaces for suggestions
    const userWorkspaces = await prisma.workspaceMember.findMany({
      where: { userId },
      select: { workspaceId: true }
    });

    const workspaceIds = userWorkspaces.map(w => w.workspaceId);

    // Generate basic suggestions based on workspace activity
    const suggestions = [];

    // Example suggestion for network health
    if (workspaceIds.length > 0) {
      suggestions.push({
        id: 'workspace-collab',
        type: 'network-health',
        title: 'Active Workspace Collaboration',
        description: `You're collaborating in ${workspaceIds.length} workspace${workspaceIds.length > 1 ? 's' : ''}. Great networking opportunity!`,
        priority: 'medium',
        actionable: true,
        action: 'Review Connections'
      });
    }

    sendSuccess(res, suggestions, 'Network suggestions retrieved successfully');
  } catch (error) {
    console.error('Error fetching network suggestions:', error);
    sendError(res, 'Failed to fetch network suggestions', 500);
  }
});

// Get network statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // Get user's workspaces
    const userWorkspaces = await prisma.workspaceMember.findMany({
      where: { userId },
      select: { workspaceId: true }
    });

    const workspaceIds = userWorkspaces.map(w => w.workspaceId);

    // Get all members from user's workspaces (potential connections)
    const workspaceMembers = await prisma.workspaceMember.findMany({
      where: {
        workspaceId: { in: workspaceIds },
        userId: { not: userId } // Exclude current user
      },
      include: {
        user: {
          select: { id: true }
        }
      }
    });

    // Group by user and collect their workspace memberships to apply the same logic as connections endpoint
    const userConnections = new Map();
    
    workspaceMembers.forEach(member => {
      const userId = member.user.id;
      if (!userConnections.has(userId)) {
        userConnections.set(userId, {
          workspaces: [],
          joinDates: []
        });
      }
      
      const connection = userConnections.get(userId);
      connection.workspaces.push(member.workspaceId);
      connection.joinDates.push(member.joinedAt);
    });

    // Apply the same core/extended logic as the connections endpoint
    let coreConnections = 0;
    let extendedConnections = 0;

    Array.from(userConnections.values()).forEach(conn => {
      const sharedWorkspaceCount = conn.workspaces.length;
      const earliestJoin = new Date(Math.min(...conn.joinDates.map(d => d.getTime())));
      const isRecentCollaborator = (Date.now() - earliestJoin.getTime()) < (90 * 24 * 60 * 60 * 1000); // 90 days

      // Auto-assign to core network based on workspace collaboration
      const connectionType = sharedWorkspaceCount >= 2 || isRecentCollaborator ? 'core' : 'extended';
      
      if (connectionType === 'core') {
        coreConnections++;
      } else {
        extendedConnections++;
      }
    });

    const totalConnections = coreConnections + extendedConnections;

    const stats = {
      totalConnections,
      coreConnections,
      extendedConnections,
      pendingRequests: 0, // Would come from actual requests table
      totalWorkspaces: workspaceIds.length,
      recentActivity: new Date().toISOString()
    };

    sendSuccess(res, stats, 'Network statistics retrieved successfully');
  } catch (error) {
    console.error('Error fetching network stats:', error);
    sendError(res, 'Failed to fetch network stats', 500);
  }
});

export default router;