import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { sendSuccess, sendError } from '../utils/response.utils';

const router = Router();

// All goal routes require authentication
router.use(authenticate);

// Import the goals storage from workspace routes
// Note: In a real app, this would be in a database
const getGoalsStorage = () => {
  // This is a workaround to access the storage from workspace routes
  // In production, this would be proper database operations
  return global.goalsStorage || new Map();
};

const setGoalsStorage = (storage: Map<string, any[]>) => {
  global.goalsStorage = storage;
};

// Toggle milestone completion
router.put('/:goalId/milestones/:milestoneId/toggle', async (req, res) => {
  try {
    const { goalId, milestoneId } = req.params;
    const userId = req.user.id;
    
    console.log('🎯 Toggle milestone called:', { goalId, milestoneId, userId });
    
    // Find the goal across all workspaces
    const goalsStorage = getGoalsStorage();
    let targetGoal = null;
    let targetWorkspaceId = null;
    
    for (const [workspaceId, goals] of goalsStorage.entries()) {
      const goal = goals.find(g => g.id === goalId);
      if (goal) {
        targetGoal = goal;
        targetWorkspaceId = workspaceId;
        break;
      }
    }
    
    if (!targetGoal) {
      console.log('❌ Goal not found:', goalId);
      return sendError(res, 'Goal not found', 404);
    }
    
    // Find and toggle the milestone
    const milestone = targetGoal.milestones.find(m => m.id === milestoneId);
    if (!milestone) {
      console.log('❌ Milestone not found:', milestoneId);
      return sendError(res, 'Milestone not found', 404);
    }
    
    // Toggle completion status
    milestone.completed = !milestone.completed;
    milestone.completedAt = milestone.completed ? new Date().toISOString() : null;
    milestone.completedBy = milestone.completed ? { id: userId, name: 'Current User', email: '' } : null;
    
    // Update goal progress percentage based on completed milestones
    const completedCount = targetGoal.milestones.filter(m => m.completed).length;
    const totalCount = targetGoal.milestones.length;
    targetGoal.progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    
    // Update the storage
    const workspaceGoals = goalsStorage.get(targetWorkspaceId);
    const goalIndex = workspaceGoals.findIndex(g => g.id === goalId);
    workspaceGoals[goalIndex] = targetGoal;
    goalsStorage.set(targetWorkspaceId, workspaceGoals);
    setGoalsStorage(goalsStorage);
    
    console.log('✅ Milestone toggled:', { 
      milestoneId, 
      completed: milestone.completed, 
      newProgress: targetGoal.progressPercentage 
    });
    
    sendSuccess(res, { 
      goalId, 
      milestoneId, 
      completed: milestone.completed,
      progressPercentage: targetGoal.progressPercentage
    }, 'Milestone toggled successfully');
    
  } catch (error) {
    console.error('Error toggling milestone:', error);
    sendError(res, 'Failed to toggle milestone', 500);
  }
});

// Placeholder routes - will implement next
router.get('/', (req, res) => {
  res.json({ success: true, message: 'Goals endpoint - coming soon' });
});

router.post('/', (req, res) => {
  res.json({ success: true, message: 'Create goal endpoint - coming soon' });
});

export default router;