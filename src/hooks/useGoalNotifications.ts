import { useCreateNotification } from './useNotifications';
import { TeamMember, Goal } from './useGoals';

export function useGoalNotifications() {
  const createNotificationMutation = useCreateNotification();

  const notifyGoalCreated = async (goal: Goal, createdBy: TeamMember) => {
    const notifications = [];

    // Notify accountable person
    if (goal.accountable.id !== createdBy.id) {
      notifications.push({
        type: 'SYSTEM' as const,
        title: 'New Goal Assignment',
        message: `You've been assigned as accountable for the goal "${goal.title}"`,
        recipientId: goal.accountable.id,
        relatedEntityType: 'WORKSPACE' as const,
        relatedEntityId: goal.workspaceId,
        data: { goalId: goal.id, role: 'accountable' }
      });
    }

    // Notify responsible people
    for (const person of goal.responsible) {
      if (person.id !== createdBy.id) {
        notifications.push({
          type: 'SYSTEM' as const,
          title: 'New Goal Assignment',
          message: `You've been assigned as responsible for the goal "${goal.title}"`,
          recipientId: person.id,
          relatedEntityType: 'WORKSPACE' as const,
          relatedEntityId: goal.workspaceId,
          data: { goalId: goal.id, role: 'responsible' }
        });
      }
    }

    // Notify consulted people
    if (goal.consulted) {
      for (const person of goal.consulted) {
        if (person.id !== createdBy.id) {
          notifications.push({
            type: 'SYSTEM' as const,
            title: 'Goal Consultation Required',
            message: `Your consultation is needed for the goal "${goal.title}"`,
            recipientId: person.id,
            relatedEntityType: 'WORKSPACE' as const,
            relatedEntityId: goal.workspaceId,
            data: { goalId: goal.id, role: 'consulted' }
          });
        }
      }
    }

    // Notify informed people
    if (goal.informed) {
      for (const person of goal.informed) {
        if (person.id !== createdBy.id) {
          notifications.push({
            type: 'SYSTEM' as const,
            title: 'New Goal Created',
            message: `A new goal "${goal.title}" has been created in your workspace`,
            recipientId: person.id,
            relatedEntityType: 'WORKSPACE' as const,
            relatedEntityId: goal.workspaceId,
            data: { goalId: goal.id, role: 'informed' }
          });
        }
      }
    }

    // Send all notifications
    try {
      await Promise.all(
        notifications.map(notification => 
          createNotificationMutation.mutateAsync(notification)
        )
      );
    } catch (error) {
      console.log('🔔 Failed to send goal creation notifications:', error);
    }
  };

  const notifyGoalStatusChanged = async (
    goal: Goal, 
    oldStatus: string, 
    newStatus: string, 
    changedBy: TeamMember
  ) => {
    const notifications = [];
    const statusMessages = {
      'not-started': 'not started',
      'in-progress': 'in progress',
      'completed': 'completed',
      'blocked': 'blocked',
      'cancelled': 'cancelled'
    };

    // Notify accountable person
    if (goal.accountable.id !== changedBy.id) {
      notifications.push({
        type: 'SYSTEM' as const,
        title: 'Goal Status Updated',
        message: `Goal "${goal.title}" status changed to ${statusMessages[newStatus as keyof typeof statusMessages]}`,
        recipientId: goal.accountable.id,
        relatedEntityType: 'WORKSPACE' as const,
        relatedEntityId: goal.workspaceId,
        data: { goalId: goal.id, oldStatus, newStatus }
      });
    }

    // If goal is completed, notify everyone involved
    if (newStatus === 'completed') {
      const allInvolved = [
        ...goal.responsible,
        ...(goal.consulted || []),
        ...(goal.informed || [])
      ].filter(person => person.id !== changedBy.id && person.id !== goal.accountable.id);

      for (const person of allInvolved) {
        notifications.push({
          type: 'ACHIEVEMENT' as const,
          title: 'Goal Completed',
          message: `Goal "${goal.title}" has been completed!`,
          recipientId: person.id,
          relatedEntityType: 'WORKSPACE' as const,
          relatedEntityId: goal.workspaceId,
          data: { goalId: goal.id, completedBy: changedBy.id }
        });
      }
    }

    // Send all notifications
    try {
      await Promise.all(
        notifications.map(notification => 
          createNotificationMutation.mutateAsync(notification)
        )
      );
    } catch (error) {
      console.log('🔔 Failed to send goal status change notifications:', error);
    }
  };

  const notifyMilestoneCompleted = async (
    goal: Goal, 
    milestone: { id: string; title: string }, 
    completedBy: TeamMember
  ) => {
    const notifications = [];

    // Notify accountable person
    if (goal.accountable.id !== completedBy.id) {
      notifications.push({
        type: 'SYSTEM' as const,
        title: 'Milestone Completed',
        message: `Milestone "${milestone.title}" completed for goal "${goal.title}"`,
        recipientId: goal.accountable.id,
        relatedEntityType: 'WORKSPACE' as const,
        relatedEntityId: goal.workspaceId,
        data: { goalId: goal.id, milestoneId: milestone.id }
      });
    }

    // Notify responsible people
    for (const person of goal.responsible) {
      if (person.id !== completedBy.id) {
        notifications.push({
          type: 'SYSTEM' as const,
          title: 'Milestone Completed',
          message: `Milestone "${milestone.title}" completed for goal "${goal.title}"`,
          recipientId: person.id,
          relatedEntityType: 'WORKSPACE' as const,
          relatedEntityId: goal.workspaceId,
          data: { goalId: goal.id, milestoneId: milestone.id }
        });
      }
    }

    // Send all notifications
    try {
      await Promise.all(
        notifications.map(notification => 
          createNotificationMutation.mutateAsync(notification)
        )
      );
    } catch (error) {
      console.log('🔔 Failed to send milestone completion notifications:', error);
    }
  };

  return {
    notifyGoalCreated,
    notifyGoalStatusChanged,
    notifyMilestoneCompleted
  };
}