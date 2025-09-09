import React, { useState } from 'react';
import { Check, X, Edit, Trash2, Calendar, User, ChevronDown, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import { Task, TeamMember } from '../hooks/useGoals';

interface TaskRowProps {
  task: Task;
  goalId: string;
  milestoneId: string;
  workspaceMembers: TeamMember[];
  onToggle: (taskId: string) => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => void;
  onDelete: (taskId: string) => void;
  isToggling?: boolean;
  isUpdating?: boolean;
  isDeleting?: boolean;
  className?: string;
}

const TaskRow: React.FC<TaskRowProps> = ({
  task,
  goalId,
  milestoneId,
  workspaceMembers,
  onToggle,
  onUpdate,
  onDelete,
  isToggling = false,
  isUpdating = false,
  isDeleting = false,
  className
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingTitle, setEditingTitle] = useState(task.title);
  const [editingPriority, setEditingPriority] = useState(task.priority);
  const [editingDueDate, setEditingDueDate] = useState(
    task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : ''
  );
  const [editingAssignedTo, setEditingAssignedTo] = useState(task.assignedTo || '');

  const handleSave = () => {
    onUpdate(task.id, {
      title: editingTitle,
      priority: editingPriority,
      dueDate: editingDueDate || undefined,
      assignedTo: editingAssignedTo || undefined
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditingTitle(task.title);
    setEditingPriority(task.priority);
    setEditingDueDate(task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : '');
    setEditingAssignedTo(task.assignedTo || '');
    setIsEditing(false);
  };

  const priorityColors = {
    low: 'text-gray-500 bg-gray-100',
    medium: 'text-blue-500 bg-blue-100',
    high: 'text-orange-500 bg-orange-100'
  };

  const priorityIcons = {
    low: '○',
    medium: '◐',
    high: '●'
  };

  return (
    <div className={cn(
      "group flex items-center gap-3 p-3 rounded-lg border transition-all hover:shadow-sm",
      task.completed 
        ? "bg-green-50 border-green-200 hover:bg-green-100" 
        : "bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50",
      className
    )}>
      {/* Completion Checkbox */}
      <button
        onClick={() => onToggle(task.id)}
        disabled={isToggling}
        className={cn(
          "w-5 h-5 rounded border-2 flex items-center justify-center text-xs font-bold transition-all",
          task.completed
            ? "bg-green-500 border-green-500 text-white"
            : "bg-white border-gray-300 hover:border-green-400 hover:bg-green-50",
          isToggling && "opacity-75 cursor-not-allowed"
        )}
      >
        {isToggling ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          task.completed && <Check className="h-3 w-3" />
        )}
      </button>

      {/* Task Content */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          /* Editing Mode */
          <div className="space-y-2">
            <input
              type="text"
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value)}
              className="w-full text-sm font-medium bg-white border border-gray-300 rounded px-2 py-1 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              autoFocus
            />
            
            <div className="flex gap-2 flex-wrap">
              {/* Priority Selector */}
              <select
                value={editingPriority}
                onChange={(e) => setEditingPriority(e.target.value as 'low' | 'medium' | 'high')}
                className="text-xs border border-gray-300 rounded px-2 py-1 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
              
              {/* Due Date */}
              <input
                type="date"
                value={editingDueDate}
                onChange={(e) => setEditingDueDate(e.target.value)}
                className="text-xs border border-gray-300 rounded px-2 py-1 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              />
              
              {/* Assignee Selector */}
              <select
                value={editingAssignedTo}
                onChange={(e) => setEditingAssignedTo(e.target.value)}
                className="text-xs border border-gray-300 rounded px-2 py-1 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              >
                <option value="">Unassigned</option>
                {workspaceMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex gap-1">
              <Button onClick={handleSave} size="sm" disabled={!editingTitle.trim() || isUpdating}>
                {isUpdating ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Check className="h-3 w-3" />
                )}
              </Button>
              <Button onClick={handleCancel} variant="outline" size="sm" disabled={isUpdating}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ) : (
          /* Display Mode */
          <div className="flex items-center justify-between">
            <div className="flex-1 cursor-pointer" onClick={() => setIsEditing(true)}>
              <div className="flex items-center gap-2 mb-1">
                <p className={cn(
                  "text-sm font-medium transition-colors",
                  task.completed 
                    ? "text-green-800 line-through" 
                    : "text-gray-900 hover:text-primary-600"
                )}>
                  {task.title}
                </p>
                
                {/* Priority Indicator */}
                <span className={cn(
                  "inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium",
                  priorityColors[task.priority]
                )}>
                  <span className="mr-1">{priorityIcons[task.priority]}</span>
                  {task.priority}
                </span>
              </div>
              
              {/* Task Metadata */}
              <div className="flex items-center gap-3 text-xs text-gray-500">
                {task.dueDate && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>Due {format(new Date(task.dueDate), 'MMM d, yyyy')}</span>
                  </div>
                )}
                
                {task.assignee && (
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span>Assigned to {task.assignee.name}</span>
                  </div>
                )}
                
                {task.completed && task.completedByUser && (
                  <div className="flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    <span>Completed by {task.completedByUser.name}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setIsEditing(true)}
                disabled={isUpdating || isDeleting}
                className={cn(
                  "text-gray-400 hover:text-primary-500 p-1 rounded transition-colors",
                  (isUpdating || isDeleting) && "opacity-50 cursor-not-allowed"
                )}
                title="Edit task"
              >
                <Edit className="h-3 w-3" />
              </button>
              <button
                onClick={() => onDelete(task.id)}
                disabled={isUpdating || isDeleting}
                className={cn(
                  "text-gray-400 hover:text-red-500 p-1 rounded transition-colors",
                  (isUpdating || isDeleting) && "opacity-50 cursor-not-allowed"
                )}
                title="Delete task"
              >
                {isDeleting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskRow;