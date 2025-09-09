import React from 'react';
import { cn } from '../lib/utils';
import { Task, TeamMember, WorkspaceLabel } from '../hooks/useGoals';
import TaskTableRow from './TaskTableRow';

interface TaskTableViewProps {
  tasks: Task[];
  goalId: string;
  milestoneId: string;
  workspaceMembers: TeamMember[];
  workspaceLabels: WorkspaceLabel[];
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
  updateTaskId?: string;
  deleteTaskId?: string;
  className?: string;
}

const TaskTableView: React.FC<TaskTableViewProps> = ({
  tasks,
  goalId,
  milestoneId,
  workspaceMembers,
  workspaceLabels,
  onUpdateTask,
  onDeleteTask,
  updateTaskId,
  deleteTaskId,
  className
}) => {
  // Get priority and status labels
  const priorityLabel = workspaceLabels.find(label => label.type === 'priority');
  const statusLabel = workspaceLabels.find(label => label.type === 'status');

  if (tasks.length === 0) {
    return (
      <div className={cn("text-center py-8 text-gray-500", className)}>
        <div className="text-sm">No tasks yet</div>
        <div className="text-xs mt-1">Click "Add Task" to create the first task</div>
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      {/* Table Header */}
      <div className="bg-gray-50 border border-gray-200 rounded-t-lg">
        <div className="grid grid-cols-12 gap-3 p-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
          <div className="col-span-5">Task</div>
          <div className="col-span-2">Priority</div>
          <div className="col-span-2">Assigned to</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-1">Due On</div>
        </div>
      </div>

      {/* Table Body */}
      <div className="border-l border-r border-b border-gray-200 rounded-b-lg">
        {tasks
          .sort((a, b) => a.order - b.order)
          .map((task, index) => (
            <TaskTableRow
              key={task.id}
              task={task}
              goalId={goalId}
              milestoneId={milestoneId}
              workspaceMembers={workspaceMembers}
              priorityLabel={priorityLabel}
              statusLabel={statusLabel}
              onUpdate={onUpdateTask}
              onDelete={onDeleteTask}
              isUpdating={updateTaskId === task.id}
              isDeleting={deleteTaskId === task.id}
              isLastRow={index === tasks.length - 1}
            />
          ))}
      </div>
    </div>
  );
};

export default TaskTableView;