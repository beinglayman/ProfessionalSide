import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { sendSuccess, sendError } from '../utils/response.utils';
import { prisma } from '../app';

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

// Valid goal statuses
const VALID_GOAL_STATUSES = ['yet-to-start', 'in-progress', 'blocked', 'cancelled', 'pending-review', 'achieved'];

// Status transition validation
const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  'yet-to-start': ['in-progress', 'cancelled'],
  'in-progress': ['blocked', 'pending-review', 'achieved', 'cancelled'],
  'blocked': ['in-progress', 'cancelled'],
  'pending-review': ['in-progress', 'achieved', 'cancelled'],
  'achieved': ['in-progress'], // Allow editing completed goals back to in-progress
  'cancelled': ['in-progress'], // Allow restarting cancelled goals
};

// Request validation helper
const validateUpdateRequest = (updateData: any) => {
  const errors: string[] = [];
  
  // Validate status
  if (updateData.status !== undefined) {
    if (typeof updateData.status !== 'string') {
      errors.push('Status must be a string');
    } else if (!VALID_GOAL_STATUSES.includes(updateData.status)) {
      errors.push(`Invalid status. Must be one of: ${VALID_GOAL_STATUSES.join(', ')}`);
    }
  }
  
  // Validate title
  if (updateData.title !== undefined) {
    if (typeof updateData.title !== 'string') {
      errors.push('Title must be a string');
    } else if (updateData.title.trim().length === 0) {
      errors.push('Title cannot be empty');
    } else if (updateData.title.length > 200) {
      errors.push('Title must be less than 200 characters');
    }
  }
  
  // Validate description
  if (updateData.description !== undefined && updateData.description !== null) {
    if (typeof updateData.description !== 'string') {
      errors.push('Description must be a string');
    } else if (updateData.description.length > 2000) {
      errors.push('Description must be less than 2000 characters');
    }
  }
  
  // Validate priority
  if (updateData.priority !== undefined) {
    const validPriorities = ['low', 'medium', 'high', 'critical'];
    if (!validPriorities.includes(updateData.priority)) {
      errors.push(`Invalid priority. Must be one of: ${validPriorities.join(', ')}`);
    }
  }
  
  // Validate progress
  if (updateData.progressOverride !== undefined) {
    if (typeof updateData.progressOverride !== 'number' || 
        updateData.progressOverride < 0 || 
        updateData.progressOverride > 100) {
      errors.push('Progress override must be a number between 0 and 100');
    }
  }
  
  return errors;
};

// Status transition validation
const validateStatusTransition = (currentStatus: string, newStatus: string): string | null => {
  const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus] || [];
  if (!allowedTransitions.includes(newStatus)) {
    const allowedStr = allowedTransitions.length > 0 
      ? allowedTransitions.join(', ') 
      : 'none';
    return `Cannot transition from '${currentStatus}' to '${newStatus}'. Allowed transitions: ${allowedStr}`;
  }
  return null;
};

// Update goal (general endpoint for assignedToId, reviewerId, status, etc.)
router.put('/:goalId', async (req, res) => {
  try {
    const { goalId } = req.params;
    const updateData = req.body;
    const userId = req.user.id;
    
    
    // Validate goal ID format
    if (!goalId || typeof goalId !== 'string' || goalId.trim().length === 0) {
      return sendError(res, 'Invalid goal ID format', 400);
    }
    
    // Validate request body
    if (!updateData || typeof updateData !== 'object') {
      return sendError(res, 'Invalid request body', 400);
    }
    
    // Comprehensive request validation
    const validationErrors = validateUpdateRequest(updateData);
    if (validationErrors.length > 0) {
      return sendError(res, validationErrors.join('; '), 400);
    }
    
    // Find the goal in the database
    const goal = await prisma.goal.findUnique({
      where: { id: goalId },
      include: {
        assignedTo: true,
        reviewer: true,
        user: true,
        workspace: true,
        milestones: {
          include: {
            tasks: {
              include: {
                assignee: true,
                reviewer: true,
                completedByUser: true
              }
            }
          }
        }
      }
    });
    
    if (!goal) {
      return sendError(res, 'Goal not found', 404);
    }
    
    // Check if user has permission to update this goal
    const hasPermission = goal.userId === userId || 
                         goal.assignedToId === userId ||
                         goal.reviewerId === userId;
    
    if (!hasPermission) {
      return sendError(res, 'You do not have permission to modify this goal. Only the creator, assignee, or reviewer can make changes.', 403);
    }
    
    // Validate status transition if status is being changed
    if (updateData.status !== undefined && updateData.status !== goal.status) {
      const transitionError = validateStatusTransition(goal.status, updateData.status);
      if (transitionError) {
        return sendError(res, transitionError, 400);
      }
    }
    
    // Prepare update data, filtering out undefined and null values
    const updateFields: any = {};
    const changeLog: string[] = [];
    
    if (updateData.title !== undefined) updateFields.title = updateData.title;
    if (updateData.description !== undefined) updateFields.description = updateData.description;
    if (updateData.status !== undefined) {
      updateFields.status = updateData.status;
      changeLog.push(`status: '${goal.status}' → '${updateData.status}'`);
    }
    if (updateData.priority !== undefined) updateFields.priority = updateData.priority;
    if (updateData.targetDate !== undefined) updateFields.targetDate = updateData.targetDate ? new Date(updateData.targetDate) : null;
    if (updateData.category !== undefined) updateFields.category = updateData.category;
    if (updateData.assignedToId !== undefined) updateFields.assignedToId = updateData.assignedToId;
    if (updateData.reviewerId !== undefined) updateFields.reviewerId = updateData.reviewerId;
    
    // Handle progress field - NEVER allow null values to be set
    if (updateData.progressOverride !== undefined && typeof updateData.progressOverride === 'number') {
      updateFields.progress = updateData.progressOverride;
    }
    if (updateData.progress !== undefined && typeof updateData.progress === 'number' && updateData.progress !== null) {
      updateFields.progress = updateData.progress;
    }
    
    // Handle completed field after progress processing
    if (updateData.completed !== undefined) {
      updateFields.completed = updateData.completed;
      if (updateData.completed) {
        updateFields.completedDate = new Date();
        updateFields.status = 'achieved';
      } else {
        updateFields.completedDate = null;
      }
    }

    // CRITICAL: Ensure no null progress values are ever sent to Prisma
    if (updateFields.progress === null || updateFields.progress === undefined) {
      delete updateFields.progress;
    }
    
    
    // Update the goal in database
    const updatedGoal = await prisma.goal.update({
      where: { id: goalId },
      data: {
        ...updateFields,
        updatedAt: new Date()
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            title: true
          }
        },
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            title: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            title: true
          }
        },
        workspace: true,
        milestones: {
          include: {
            tasks: {
              include: {
                assignee: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    avatar: true,
                    title: true
                  }
                },
                reviewer: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    avatar: true,
                    title: true
                  }
                },
                completedByUser: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    avatar: true,
                    title: true
                  }
                }
              }
            }
          }
        }
      }
    });
    
    console.log('✅ Goal updated successfully:', {
      goalId: updatedGoal.id,
      title: updatedGoal.title,
      changes: changeLog
    });
    
    // Transform the goal to match frontend expectations
    const transformedGoal = {
      ...updatedGoal,
      createdBy: updatedGoal.user,
      progressPercentage: updatedGoal.progress,
      editHistory: [], // TODO: Implement edit history if needed
    };
    
    console.log('🔄 Sending transformed goal response:', {
      goalId: transformedGoal.id,
      status: transformedGoal.status,
      originalStatus: updatedGoal.status,
      hasStatusChange: changeLog.some(change => change.includes('status')),
      changeLog
    });
    
    return sendSuccess(res, transformedGoal, 'Goal updated successfully');
    
  } catch (error) {
    console.error('❌ Goal update failed:', {
      goalId: req.params.goalId,
      userId: req.user?.id,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Return user-friendly error messages
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint') || error.message.includes('unique')) {
        return sendError(res, 'A goal with this name already exists in the workspace', 409);
      }
      if (error.message.includes('Foreign key constraint') || error.message.includes('reference')) {
        return sendError(res, 'Referenced user or workspace does not exist', 400);
      }
      if (error.message.includes('timeout') || error.message.includes('connection')) {
        return sendError(res, 'Database connection timeout. Please try again.', 503);
      }
    }
    
    return sendError(res, 'Failed to update goal due to an internal error. Please try again or contact support if the problem persists.', 500);
  }
});

// Toggle milestone completion
router.put('/:goalId/milestones/:milestoneId/toggle', async (req, res) => {
  try {
    const { goalId, milestoneId } = req.params;
    const userId = req.user.id;
    
    console.log('🎯 Toggle milestone called:', { goalId, milestoneId, userId });
    
    // Find the milestone in database
    const milestone = await prisma.goalMilestone.findFirst({
      where: { 
        id: milestoneId,
        goalId: goalId
      },
      include: {
        goal: {
          include: {
            workspace: true,
            milestones: true
          }
        }
      }
    });
    
    if (!milestone) {
      console.log('❌ Milestone not found:', milestoneId);
      return sendError(res, 'Milestone not found', 404);
    }

    // Check if user has access to this workspace
    const hasAccess = await prisma.workspaceMember.findFirst({
      where: { 
        workspaceId: milestone.goal.workspaceId!,
        userId
      }
    });

    if (!hasAccess) {
      return sendError(res, 'Access denied', 403);
    }
    
    // Toggle completion status in database
    const updatedMilestone = await prisma.$transaction(async (tx) => {
      const newCompleted = !milestone.completed;
      
      const updated = await tx.goalMilestone.update({
        where: { id: milestoneId },
        data: {
          completed: newCompleted,
          completedDate: newCompleted ? new Date() : null,
          manuallyCompleted: newCompleted // Track manual completion
        }
      });

      // Update goal progress if auto-calculation is enabled
      const allMilestones = await tx.goalMilestone.findMany({
        where: { goalId: goalId }
      });
      
      const completedCount = allMilestones.filter(m => m.completed).length;
      const totalCount = allMilestones.length;
      const newProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
      
      // Auto-transition goal status if needed
      let goalUpdateData: any = {
        progress: newProgress,
        completed: newProgress === 100,
        completedDate: newProgress === 100 && !milestone.goal.completed ? new Date() : (newProgress < 100 ? null : milestone.goal.completedDate)
      };

      // If goal is 'yet-to-start' and milestone is being completed, move to 'in-progress'
      if (milestone.goal.status === 'yet-to-start' && newCompleted) {
        goalUpdateData.status = 'in-progress';
        console.log('🎯 Auto-transitioning goal from yet-to-start to in-progress due to milestone completion');
      }

      await tx.goal.update({
        where: { id: goalId },
        data: goalUpdateData
      });

      return updated;
    });
    
    console.log('✅ Milestone toggled:', { milestoneId, completed: updatedMilestone.completed });
    sendSuccess(res, { 
      milestoneId: updatedMilestone.id,
      completed: updatedMilestone.completed,
      completedAt: updatedMilestone.completedDate?.toISOString()
    }, 'Milestone completion toggled successfully');
    
  } catch (error) {
    console.error('Error toggling milestone:', error);
    sendError(res, 'Failed to toggle milestone', 500);
  }
});

// Update goal progress manually
router.put('/:goalId/progress', async (req, res) => {
  try {
    const { goalId } = req.params;
    const { progressOverride, autoCalculateProgress } = req.body;
    const userId = req.user.id;
    
    console.log('🎯 Manual progress update called:', { goalId, progressOverride, autoCalculateProgress });
    
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
    
    // Update progress settings
    if (progressOverride !== undefined) {
      targetGoal.progressOverride = Math.min(100, Math.max(0, progressOverride));
    }
    
    if (autoCalculateProgress !== undefined) {
      targetGoal.autoCalculateProgress = autoCalculateProgress;
    }
    
    // If switching back to auto-calculate, remove override and recalculate
    if (autoCalculateProgress && progressOverride === null) {
      targetGoal.progressOverride = null;
      
      // Recalculate from milestones
      const completedCount = targetGoal.milestones.filter(m => m.completed).length;
      const partialCount = targetGoal.milestones.filter(m => m.status === 'partial').length;
      const totalCount = targetGoal.milestones.length;
      
      if (totalCount > 0) {
        const progress = ((completedCount + (partialCount * 0.5)) / totalCount) * 100;
        targetGoal.progressPercentage = Math.round(progress);
      }
    }
    
    // Update the storage
    const workspaceGoals = goalsStorage.get(targetWorkspaceId);
    const goalIndex = workspaceGoals.findIndex(g => g.id === goalId);
    workspaceGoals[goalIndex] = targetGoal;
    goalsStorage.set(targetWorkspaceId, workspaceGoals);
    setGoalsStorage(goalsStorage);
    
    console.log('✅ Goal progress updated:', { 
      goalId, 
      progressOverride: targetGoal.progressOverride,
      autoCalculateProgress: targetGoal.autoCalculateProgress,
      currentProgress: targetGoal.progressPercentage
    });
    
    sendSuccess(res, { 
      goalId, 
      progressOverride: targetGoal.progressOverride,
      autoCalculateProgress: targetGoal.autoCalculateProgress,
      progressPercentage: targetGoal.progressPercentage
    }, 'Goal progress updated successfully');
    
  } catch (error) {
    console.error('Error updating goal progress:', error);
    sendError(res, 'Failed to update goal progress', 500);
  }
});

// ============================================================================
// TASK MANAGEMENT ENDPOINTS
// ============================================================================

// Test routes removed - catch-all routes were interfering with task routes

// Create a new task for a milestone
router.post('/:goalId/milestones/:milestoneId/tasks', async (req, res) => {
  console.log('🚀 POST TASK ROUTE HIT:', req.path, req.params);
  try {
    const { goalId, milestoneId } = req.params;
    const { title, description, assignedTo, reviewerId, priority, status, dueDate } = req.body;
    const userId = req.user.id;

    console.log('📝 Creating task for milestone:', { goalId, milestoneId, title });

    // Find the milestone in database with workspace access validation
    const milestone = await prisma.goalMilestone.findFirst({
      where: { 
        id: milestoneId,
        goalId: goalId,
        goal: {
          workspace: {
            members: {
              some: {
                userId: userId
              }
            }
          }
        }
      },
      include: {
        goal: {
          include: {
            workspace: true
          }
        },
        tasks: {
          orderBy: { order: 'desc' },
          take: 1
        }
      }
    });

    if (!milestone) {
      console.log('❌ Milestone not found or access denied:', { goalId, milestoneId });
      return sendError(res, 'Milestone not found or access denied', 404);
    }

    console.log('✅ Found milestone:', { goalId, milestoneId: milestone.id });

    // Get next order value
    const nextOrder = milestone.tasks.length > 0 
      ? milestone.tasks[0].order + 1 
      : 1;

    // Create the task in database with transaction for progress updates
    const newTask = await prisma.$transaction(async (tx) => {
      // Create the task
      const created = await tx.goalTask.create({
        data: {
          milestoneId,
          title,
          description: description || '',
          assignedTo: assignedTo || null,
          reviewerId: reviewerId || null,
          priority: priority || 'medium',
          status: status || 'Not Started',
          dueDate: dueDate ? new Date(dueDate) : null,
          order: nextOrder,
          completed: false,
        }
      });

      console.log('✅ Task created in database:', created.id);

      return created;
    });

    // Transform task to match frontend interface
    const transformedTask = {
      id: newTask.id,
      milestoneId: newTask.milestoneId,
      title: newTask.title,
      description: newTask.description,
      completed: newTask.completed,
      completedDate: newTask.completedDate?.toISOString() || null,
      completedBy: newTask.completedBy,
      assignedTo: newTask.assignedTo,
      reviewerId: newTask.reviewerId,
      priority: newTask.priority as 'low' | 'medium' | 'high',
      status: newTask.status,
      dueDate: newTask.dueDate?.toISOString() || null,
      order: newTask.order,
      createdAt: newTask.createdAt.toISOString(),
      updatedAt: newTask.updatedAt.toISOString()
    };

    console.log('✅ Task created successfully:', transformedTask.id);
    sendSuccess(res, transformedTask, 'Task created successfully');

  } catch (error) {
    console.error('Error creating task:', error);
    sendError(res, 'Failed to create task', 500);
  }
});

// Get all tasks for a milestone
router.get('/:goalId/milestones/:milestoneId/tasks', async (req, res) => {
  try {
    const { goalId, milestoneId } = req.params;
    const userId = req.user.id;

    console.log('📋 Retrieving tasks for milestone:', { goalId, milestoneId });

    // Verify milestone exists and user has workspace access
    const milestone = await prisma.goalMilestone.findFirst({
      where: { 
        id: milestoneId,
        goalId: goalId,
        goal: {
          workspace: {
            members: {
              some: {
                userId: userId
              }
            }
          }
        }
      }
    });

    if (!milestone) {
      console.log('❌ Milestone not found or access denied:', { goalId, milestoneId });
      return sendError(res, 'Milestone not found or access denied', 404);
    }

    // Get all tasks for the milestone from database
    const tasks = await prisma.goalTask.findMany({
      where: { milestoneId },
      include: {
        assignee: { 
          select: { id: true, name: true, email: true, avatar: true, title: true } 
        },
        reviewer: { 
          select: { id: true, name: true, email: true, avatar: true, title: true } 
        },
        completedByUser: { 
          select: { id: true, name: true, email: true, avatar: true, title: true } 
        }
      },
      orderBy: { order: 'asc' }
    });

    // Transform tasks to match frontend interface
    const transformedTasks = tasks.map(task => ({
      id: task.id,
      milestoneId: task.milestoneId,
      title: task.title,
      description: task.description,
      completed: task.completed,
      completedDate: task.completedDate?.toISOString() || null,
      completedBy: task.completedBy,
      completedByUser: task.completedByUser,
      assignedTo: task.assignedTo,
      assignee: task.assignee,
      reviewerId: task.reviewerId,
      reviewer: task.reviewer,
      priority: task.priority as 'low' | 'medium' | 'high',
      status: task.status,
      dueDate: task.dueDate?.toISOString() || null,
      order: task.order,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString()
    }));

    console.log('✅ Retrieved tasks:', transformedTasks.length);
    sendSuccess(res, transformedTasks, 'Tasks retrieved successfully');

  } catch (error) {
    console.error('Error retrieving tasks:', error);
    sendError(res, 'Failed to retrieve tasks', 500);
  }
});


// Toggle task completion
router.put('/:goalId/milestones/:milestoneId/tasks/:taskId/toggle', async (req, res) => {
  try {
    const { goalId, milestoneId, taskId } = req.params;
    const userId = req.user.id;

    console.log('☑️ Toggling task completion:', { taskId });

    // Find the task in database with full relationships
    const task = await prisma.goalTask.findFirst({
      where: { 
        id: taskId,
        milestoneId: milestoneId,
        milestone: {
          goalId: goalId
        }
      },
      include: {
        milestone: {
          include: {
            goal: {
              include: {
                workspace: true
              }
            },
            tasks: true
          }
        }
      }
    });

    if (!task) {
      console.log('❌ Task not found:', taskId);
      return sendError(res, 'Task not found', 404);
    }

    // Check if user has access to this workspace
    const hasAccess = await prisma.workspaceMember.findFirst({
      where: { 
        workspaceId: task.milestone.goal.workspaceId!,
        userId
      }
    });

    if (!hasAccess) {
      return sendError(res, 'Access denied', 403);
    }

    console.log('✅ Found task:', { taskId: task.id, currentCompleted: task.completed });

    // Toggle task completion in database transaction
    const updatedTask = await prisma.$transaction(async (tx) => {
      const newCompleted = !task.completed;

      // Update the task
      const updated = await tx.goalTask.update({
        where: { id: taskId },
        data: {
          completed: newCompleted,
          completedDate: newCompleted ? new Date() : null,
          completedBy: newCompleted ? userId : null
        }
      });

      // Check if all tasks in milestone are completed for auto-completion
      const allMilestoneTasks = await tx.goalTask.findMany({
        where: { milestoneId: milestoneId }
      });

      const allTasksCompleted = allMilestoneTasks.length > 0 && 
                                allMilestoneTasks.every(t => t.id === taskId ? newCompleted : t.completed);

      // Auto-complete milestone if all tasks are done and auto-completion is enabled
      if (task.milestone.autoCompleteFromTasks && allTasksCompleted !== task.milestone.completed) {
        await tx.goalMilestone.update({
          where: { id: milestoneId },
          data: {
            completed: allTasksCompleted,
            completedDate: allTasksCompleted ? new Date() : null
          }
        });

        console.log('🎯 Milestone auto-completion:', { milestoneId, completed: allTasksCompleted });
      }

      // Update goal progress
      const allGoalMilestones = await tx.goalMilestone.findMany({
        where: { goalId: goalId }
      });

      const completedMilestones = allGoalMilestones.filter(m => 
        m.id === milestoneId ? allTasksCompleted : m.completed
      ).length;
      const totalMilestones = allGoalMilestones.length;
      const newProgress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

      // Auto-transition goal status if needed
      let goalUpdateData: any = {
        progress: newProgress,
        completed: newProgress === 100,
        completedDate: newProgress === 100 && !task.milestone.goal.completed ? new Date() : 
                      (newProgress < 100 ? null : task.milestone.goal.completedDate)
      };

      // If goal is 'yet-to-start' and task is being completed, move to 'in-progress'
      if (task.milestone.goal.status === 'yet-to-start' && newCompleted) {
        goalUpdateData.status = 'in-progress';
        console.log('🎯 Auto-transitioning goal from yet-to-start to in-progress due to task completion');
      }

      await tx.goal.update({
        where: { id: goalId },
        data: goalUpdateData
      });

      console.log('📊 Goal progress updated:', { goalId, progress: newProgress });

      return updated;
    });

    console.log('✅ Task toggled:', { taskId, completed: updatedTask.completed });
    
    // Transform task to match frontend interface
    const transformedTask = {
      id: updatedTask.id,
      title: updatedTask.title,
      description: updatedTask.description,
      completed: updatedTask.completed,
      completedDate: updatedTask.completedDate?.toISOString(),
      completedBy: updatedTask.completedBy,
      assignedTo: updatedTask.assignedTo,
      reviewerId: updatedTask.reviewerId,
      priority: updatedTask.priority as 'low' | 'medium' | 'high',
      status: updatedTask.status,
      dueDate: updatedTask.dueDate?.toISOString(),
      order: updatedTask.order,
      createdAt: updatedTask.createdAt.toISOString(),
      updatedAt: updatedTask.updatedAt.toISOString()
    };

    sendSuccess(res, transformedTask, 'Task completion toggled successfully');

  } catch (error) {
    console.error('Error toggling task completion:', error);
    sendError(res, 'Failed to toggle task completion', 500);
  }
});

// Update task properties (priority, status, assignment, etc.)
router.put('/:goalId/milestones/:milestoneId/tasks/:taskId', async (req, res) => {
  try {
    const { goalId, milestoneId, taskId } = req.params;
    const userId = req.user.id;
    const updates = req.body;

    // Find the task in database
    const task = await prisma.goalTask.findFirst({
      where: { 
        id: taskId,
        milestoneId: milestoneId,
        milestone: {
          goalId: goalId
        }
      },
      include: {
        milestone: {
          include: {
            goal: {
              include: {
                workspace: true
              }
            }
          }
        }
      }
    });

    if (!task) {
      console.log('❌ Task not found:', taskId);
      return sendError(res, 'Task not found', 404);
    }

    // Check if user has access to this workspace
    const hasAccess = await prisma.workspaceMember.findFirst({
      where: { 
        workspaceId: task.milestone.goal.workspaceId!,
        userId
      }
    });

    if (!hasAccess) {
      return sendError(res, 'Access denied', 403);
    }

    // Update the task with provided fields
    const updatedTask = await prisma.goalTask.update({
      where: { id: taskId },
      data: {
        ...(updates.title && { title: updates.title }),
        ...(updates.description !== undefined && { description: updates.description }),
        ...(updates.priority && { priority: updates.priority }),
        ...(updates.status && { status: updates.status }),
        ...(updates.completed !== undefined && { 
          completed: updates.completed,
          completedDate: updates.completed ? new Date() : null,
          completedBy: updates.completed ? userId : null
        }),
        ...(updates.assignedTo !== undefined && { assignedTo: updates.assignedTo || null }),
        ...(updates.reviewerId !== undefined && { reviewerId: updates.reviewerId || null }),
        ...(updates.dueDate !== undefined && { 
          dueDate: updates.dueDate ? new Date(updates.dueDate) : null 
        }),
        ...(updates.order !== undefined && { order: updates.order })
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            title: true
          }
        },
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            title: true
          }
        },
        completedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            title: true
          }
        }
      }
    });

    console.log('✅ Backend: Task updated successfully:', { 
      taskId, 
      newCompleted: updatedTask.completed,
      newStatus: updatedTask.status,
      completedDate: updatedTask.completedDate,
      completedBy: updatedTask.completedBy
    });

    // Transform task to match frontend interface
    const transformedTask = {
      id: updatedTask.id,
      title: updatedTask.title,
      description: updatedTask.description,
      completed: updatedTask.completed,
      completedDate: updatedTask.completedDate?.toISOString(),
      completedBy: updatedTask.completedBy,
      assignedTo: updatedTask.assignedTo,
      reviewerId: updatedTask.reviewerId,
      assignee: updatedTask.assignee ? {
        id: updatedTask.assignee.id,
        name: updatedTask.assignee.name || updatedTask.assignee.email.split('@')[0],
        email: updatedTask.assignee.email,
        avatar: updatedTask.assignee.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(updatedTask.assignee.name || updatedTask.assignee.email.split('@')[0])}&background=random`,
        title: updatedTask.assignee.title || 'Team Member'
      } : undefined,
      reviewer: updatedTask.reviewer ? {
        id: updatedTask.reviewer.id,
        name: updatedTask.reviewer.name || updatedTask.reviewer.email.split('@')[0],
        email: updatedTask.reviewer.email,
        avatar: updatedTask.reviewer.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(updatedTask.reviewer.name || updatedTask.reviewer.email.split('@')[0])}&background=random`,
        title: updatedTask.reviewer.title || 'Team Member'
      } : undefined,
      completedByUser: updatedTask.completedByUser ? {
        id: updatedTask.completedByUser.id,
        name: updatedTask.completedByUser.name || updatedTask.completedByUser.email.split('@')[0],
        email: updatedTask.completedByUser.email,
        avatar: updatedTask.completedByUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(updatedTask.completedByUser.name || updatedTask.completedByUser.email.split('@')[0])}&background=random`,
        title: updatedTask.completedByUser.title || 'Team Member'
      } : undefined,
      priority: updatedTask.priority as 'low' | 'medium' | 'high',
      status: updatedTask.status,
      dueDate: updatedTask.dueDate?.toISOString(),
      order: updatedTask.order,
      createdAt: updatedTask.createdAt.toISOString(),
      updatedAt: updatedTask.updatedAt.toISOString()
    };

    sendSuccess(res, transformedTask, 'Task updated successfully');

  } catch (error) {
    console.error('Error updating task:', error);
    sendError(res, 'Failed to update task', 500);
  }
});

// Delete a task
router.delete('/:goalId/milestones/:milestoneId/tasks/:taskId', async (req, res) => {
  try {
    const { goalId, milestoneId, taskId } = req.params;
    const userId = req.user.id;

    console.log('🗑️ Deleting task:', { taskId });

    // Find the task in database with workspace access validation
    const task = await prisma.goalTask.findFirst({
      where: { 
        id: taskId,
        milestoneId: milestoneId,
        milestone: {
          goalId: goalId,
          goal: {
            workspace: {
              members: {
                some: {
                  userId: userId
                }
              }
            }
          }
        }
      },
      include: {
        milestone: {
          include: {
            goal: true,
            tasks: true
          }
        }
      }
    });

    if (!task) {
      console.log('❌ Task not found or access denied:', { goalId, milestoneId, taskId });
      return sendError(res, 'Task not found or access denied', 404);
    }

    console.log('✅ Found task to delete:', { taskId: task.id, title: task.title });

    // Delete task and update milestone/goal progress in transaction
    await prisma.$transaction(async (tx) => {
      // Delete the task
      await tx.goalTask.delete({
        where: { id: taskId }
      });

      console.log('✅ Task deleted from database:', taskId);

      // Check if milestone should be auto-uncompleted after task deletion
      if (task.milestone.autoCompleteFromTasks) {
        const remainingTasks = await tx.goalTask.findMany({
          where: { milestoneId: milestoneId }
        });

        const allTasksCompleted = remainingTasks.length > 0 && 
                                 remainingTasks.every(t => t.completed);

        // If not all remaining tasks are completed and milestone was auto-completed, unmark it
        if (!allTasksCompleted && task.milestone.completed) {
          await tx.goalMilestone.update({
            where: { id: milestoneId },
            data: {
              completed: false,
              completedDate: null
            }
          });
          console.log('🎯 Milestone auto-uncompleted due to task deletion:', { milestoneId });
        }
      }

      // Update goal progress
      const allGoalMilestones = await tx.goalMilestone.findMany({
        where: { goalId: goalId }
      });

      const completedMilestones = allGoalMilestones.filter(m => m.completed).length;
      const totalMilestones = allGoalMilestones.length;
      const newProgress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

      await tx.goal.update({
        where: { id: goalId },
        data: {
          progress: newProgress,
          completed: newProgress === 100,
          completedDate: newProgress === 100 && !task.milestone.goal.completed ? new Date() : 
                        (newProgress < 100 ? null : task.milestone.goal.completedDate)
        }
      });

      console.log('📊 Goal progress updated after task deletion:', { goalId, progress: newProgress });
    });

    console.log('✅ Task deleted successfully:', taskId);
    sendSuccess(res, { taskId }, 'Task deleted successfully');

  } catch (error) {
    console.error('Error deleting task:', error);
    sendError(res, 'Failed to delete task', 500);
  }
});

// Manually complete/uncomplete a milestone (override task-based completion)
router.put('/:goalId/milestones/:milestoneId/complete', async (req, res) => {
  try {
    const { goalId, milestoneId } = req.params;
    const { completed } = req.body;
    const userId = req.user.id;

    console.log('🎯 Manually completing milestone:', { milestoneId, completed });

    // Verify milestone exists and user has access
    const milestone = await prisma.goalMilestone.findFirst({
      where: {
        id: milestoneId,
        goalId,
        goal: {
          OR: [
            { userId },
            { workspace: { members: { some: { userId } } } }
          ]
        }
      },
      include: {
        goal: true
      }
    });

    if (!milestone) {
      return sendError(res, 'Milestone not found or access denied', 404);
    }

    // Update milestone completion
    const updatedMilestone = await prisma.goalMilestone.update({
      where: { id: milestoneId },
      data: {
        completed,
        completedDate: completed ? new Date() : null,
        manuallyCompleted: true // Mark as manually completed
      }
    });

    // Update goal progress if auto-calculation is enabled
    if (milestone.goal.autoCalculateProgress !== false && !milestone.goal.progressOverride) {
      const allMilestones = await prisma.goalMilestone.findMany({
        where: { goalId }
      });
      
      const completedMilestones = allMilestones.filter(m => 
        m.id === milestoneId ? completed : m.completed
      ).length;
      
      const newProgress = allMilestones.length > 0 
        ? Math.round((completedMilestones / allMilestones.length) * 100)
        : 0;

      await prisma.goal.update({
        where: { id: goalId },
        data: { progress: newProgress }
      });
    }

    console.log('✅ Milestone manually completed:', { milestoneId, completed });
    sendSuccess(res, updatedMilestone, 'Milestone completion updated successfully');

  } catch (error) {
    console.error('Error updating milestone completion:', error);
    sendError(res, 'Failed to update milestone completion', 500);
  }
});

// ============================================================================
// WORKSPACE LABEL MANAGEMENT ENDPOINTS
// ============================================================================

// Get workspace labels for Priority and Status
router.get('/workspace/:workspaceId/labels', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user.id;

    // Verify user has access to workspace
    const workspaceMember = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId,
        isActive: true
      }
    });

    if (!workspaceMember) {
      return sendError(res, 'Workspace access denied', 403);
    }

    // Get all labels for this workspace
    const labels = await prisma.workspaceLabel.findMany({
      where: { workspaceId },
      include: {
        values: {
          orderBy: { order: 'asc' }
        }
      }
    });

    sendSuccess(res, labels, 'Workspace labels retrieved successfully');

  } catch (error) {
    console.error('Error retrieving workspace labels:', error);
    sendError(res, 'Failed to retrieve workspace labels', 500);
  }
});

// Create or update workspace label values
router.put('/workspace/:workspaceId/labels/:type', async (req, res) => {
  try {
    const { workspaceId, type } = req.params;
    const { values } = req.body; // Array of { name, color, order }
    const userId = req.user.id;

    // Verify user has access to workspace (admin/owner only)
    const workspaceMember = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId,
        isActive: true,
        role: { in: ['owner', 'admin'] }
      }
    });

    if (!workspaceMember) {
      return sendError(res, 'Insufficient permissions', 403);
    }

    // Validate type
    if (!['priority', 'status'].includes(type)) {
      return sendError(res, 'Invalid label type. Must be "priority" or "status"', 400);
    }

    // Find or create the workspace label
    let workspaceLabel = await prisma.workspaceLabel.findFirst({
      where: { workspaceId, type }
    });

    if (!workspaceLabel) {
      workspaceLabel = await prisma.workspaceLabel.create({
        data: {
          name: type === 'priority' ? 'Priority' : 'Status',
          type,
          workspaceId,
          createdById: userId
        }
      });
    }

    // Delete existing values
    await prisma.workspaceLabelValue.deleteMany({
      where: { labelId: workspaceLabel.id }
    });

    // Create new values
    const newValues = await prisma.workspaceLabelValue.createMany({
      data: values.map((value: any, index: number) => ({
        labelId: workspaceLabel.id,
        name: value.name,
        color: value.color,
        order: value.order || index
      }))
    });

    // Get updated label with values
    const updatedLabel = await prisma.workspaceLabel.findUnique({
      where: { id: workspaceLabel.id },
      include: {
        values: {
          orderBy: { order: 'asc' }
        }
      }
    });

    sendSuccess(res, updatedLabel, 'Workspace label updated successfully');

  } catch (error) {
    console.error('Error updating workspace label:', error);
    sendError(res, 'Failed to update workspace label', 500);
  }
});

// Initialize default workspace labels (called when workspace is created)
router.post('/workspace/:workspaceId/labels/initialize', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user.id;

    // Verify user has access to workspace (admin/owner only)
    const workspaceMember = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId,
        isActive: true,
        role: { in: ['owner', 'admin'] }
      }
    });

    if (!workspaceMember) {
      return sendError(res, 'Insufficient permissions', 403);
    }

    // Check if labels already exist
    const existingLabels = await prisma.workspaceLabel.count({
      where: { workspaceId }
    });

    if (existingLabels > 0) {
      return sendError(res, 'Workspace labels already initialized', 400);
    }

    // Create Priority label with default values
    const priorityLabel = await prisma.workspaceLabel.create({
      data: {
        name: 'Priority',
        type: 'priority',
        workspaceId,
        createdById: userId
      }
    });

    await prisma.workspaceLabelValue.createMany({
      data: [
        { labelId: priorityLabel.id, name: 'Low', color: '#10B981', order: 0 },
        { labelId: priorityLabel.id, name: 'Medium', color: '#F59E0B', order: 1 },
        { labelId: priorityLabel.id, name: 'High', color: '#EF4444', order: 2 }
      ]
    });

    // Create Status label with default values
    const statusLabel = await prisma.workspaceLabel.create({
      data: {
        name: 'Status',
        type: 'status',
        workspaceId,
        createdById: userId
      }
    });

    await prisma.workspaceLabelValue.createMany({
      data: [
        { labelId: statusLabel.id, name: 'Not Started', color: '#6B7280', order: 0 },
        { labelId: statusLabel.id, name: 'In Progress', color: '#3B82F6', order: 1 },
        { labelId: statusLabel.id, name: 'Review', color: '#F59E0B', order: 2 },
        { labelId: statusLabel.id, name: 'Completed', color: '#10B981', order: 3 }
      ]
    });

    // Get all created labels with values
    const labels = await prisma.workspaceLabel.findMany({
      where: { workspaceId },
      include: {
        values: {
          orderBy: { order: 'asc' }
        }
      }
    });

    sendSuccess(res, labels, 'Default workspace labels created successfully');

  } catch (error) {
    console.error('Error initializing workspace labels:', error);
    sendError(res, 'Failed to initialize workspace labels', 500);
  }
});

export default router;