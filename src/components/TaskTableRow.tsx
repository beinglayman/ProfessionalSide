import React, { useState, useRef, useEffect } from 'react';
import { Check, X, Trash2, Loader2, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import { Task, TeamMember, WorkspaceLabel } from '../hooks/useGoals';
import LabelDropdown from './LabelDropdown';
import UserDropdown from './UserDropdown';
import confetti from 'canvas-confetti';

interface TaskTableRowProps {
  task: Task;
  goalId: string;
  milestoneId: string;
  workspaceMembers: TeamMember[];
  priorityLabel?: WorkspaceLabel;
  statusLabel?: WorkspaceLabel;
  onUpdate: (taskId: string, updates: Partial<Task>) => void;
  onDelete: (taskId: string) => void;
  isUpdating?: boolean;
  isDeleting?: boolean;
  isLastRow?: boolean;
}

const TaskTableRow: React.FC<TaskTableRowProps> = ({
  task,
  goalId,
  milestoneId,
  workspaceMembers,
  priorityLabel,
  statusLabel,
  onUpdate,
  onDelete,
  isUpdating = false,
  isDeleting = false,
  isLastRow = false
}) => {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(task.title);
  const [editingDueDate, setEditingDueDate] = useState(task.dueDate || '');
  
  // Refs for localized confetti
  const rowRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const confettiInstance = useRef<any>(null);

  // Initialize confetti instance
  useEffect(() => {
    if (canvasRef.current && !confettiInstance.current) {
      try {
        confettiInstance.current = confetti.create(canvasRef.current, {
          resize: true,
          useWorker: false
        });
      } catch (error) {
        console.warn('Failed to create localized confetti instance:', error);
      }
    }
  }, []);

  // Cleanup confetti instance on unmount
  useEffect(() => {
    return () => {
      confettiInstance.current = null;
    };
  }, []);

  // Trigger localized confetti celebration across entire row
  const triggerTaskRowConfetti = () => {
    if (confettiInstance.current) {
      try {
        const colors = ['#5D259F', '#7C3AED', '#A855F7', '#22C55E', '#16A34A', '#C084FC'];
        
        // Create multiple launch points across the row width
        const launchPoints = [0.1, 0.3, 0.5, 0.7, 0.9];
        
        // Initial burst from multiple points
        launchPoints.forEach((x, index) => {
          setTimeout(() => {
            if (confettiInstance.current) {
              confettiInstance.current({
                particleCount: 12,
                spread: 60,
                startVelocity: 20,
                origin: { x, y: 0.3 },
                colors,
                ticks: 120,
                scalar: 0.8,
                gravity: 0.7,
                drift: (x - 0.5) * 0.5 // Add some drift based on position
              });
            }
          }, index * 30); // Stagger the launches slightly
        });
        
        // Follow-up wave across the row
        setTimeout(() => {
          launchPoints.forEach((x, index) => {
            setTimeout(() => {
              if (confettiInstance.current) {
                confettiInstance.current({
                  particleCount: 8,
                  spread: 45,
                  startVelocity: 15,
                  origin: { x, y: 0.7 },
                  colors: ['#C084FC', '#DDD6FE', '#15803D', '#10B981'],
                  ticks: 100,
                  scalar: 0.6,
                  gravity: 0.8,
                  drift: (x - 0.5) * 0.3
                });
              }
            }, index * 25);
          });
        }, 200);
        
      } catch (error) {
        console.warn('Failed to trigger localized confetti:', error);
        // Fallback: could trigger global confetti here if needed
      }
    }
  };

  const handleTitleEdit = () => {
    if (editingField === 'title') {
      // Save title
      if (editingTitle.trim() !== task.title) {
        onUpdate(task.id, { title: editingTitle.trim() });
      }
      setEditingField(null);
    } else {
      // Start editing
      setEditingTitle(task.title);
      setEditingField('title');
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleEdit();
    } else if (e.key === 'Escape') {
      setEditingTitle(task.title);
      setEditingField(null);
    }
  };

  const handlePriorityUpdate = (value: string) => {
    onUpdate(task.id, { priority: value as 'low' | 'medium' | 'high' });
  };

  const handleStatusUpdate = (value: string) => {
    // If status is set to "completed" or similar, also mark task as completed
    const updates: Partial<Task> = { status: value };
    const lowercaseValue = value.toLowerCase();
    const wasCompleted = task.completed;
    
    if (lowercaseValue === 'completed' || lowercaseValue === 'done') {
      updates.completed = true;
      
      // Trigger localized confetti if task wasn't already completed
      if (!wasCompleted) {
        setTimeout(() => triggerTaskRowConfetti(), 100);
      }
    } else if (task.completed && lowercaseValue !== 'completed' && lowercaseValue !== 'done') {
      // If task was completed but status changed to something else, unmark as completed
      updates.completed = false;
    }
    
    onUpdate(task.id, updates);
  };

  const handleOwnerUpdate = (userId: string | null) => {
    onUpdate(task.id, { assignedTo: userId || undefined });
  };

  const handleDueDateUpdate = (dateValue: string) => {
    onUpdate(task.id, { dueDate: dateValue || undefined });
  };

  const handleDueDateEdit = () => {
    if (editingField === 'dueDate') {
      // Save due date
      if (editingDueDate !== (task.dueDate || '')) {
        handleDueDateUpdate(editingDueDate);
      }
      setEditingField(null);
    } else {
      // Start editing
      setEditingDueDate(task.dueDate || '');
      setEditingField('dueDate');
    }
  };

  const handleDueDateKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleDueDateEdit();
    } else if (e.key === 'Escape') {
      setEditingDueDate(task.dueDate || '');
      setEditingField(null);
    }
  };

  // Find assigned user
  const assignedUser = task.assignedTo ? workspaceMembers.find(m => m.id === task.assignedTo) : null;

  return (
    <div 
      ref={rowRef}
      className={cn(
        "relative grid grid-cols-12 gap-3 p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors group",
        task.completed && "bg-green-50 border-green-100",
        !isLastRow && "border-b",
        isLastRow && "border-b-0"
      )}
    >
      {/* Task Title */}
      <div className="col-span-5 flex items-center">
        {editingField === 'title' ? (
          <div className="flex items-center gap-2 w-full">
            <input
              type="text"
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value)}
              onBlur={handleTitleEdit}
              onKeyDown={handleTitleKeyDown}
              className="flex-1 text-sm font-medium bg-white border border-gray-300 rounded px-2 py-1 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              autoFocus
            />
          </div>
        ) : (
          <div
            onClick={handleTitleEdit}
            className={cn(
              "cursor-pointer hover:bg-gray-100 rounded px-2 py-1 -mx-2 -my-1 w-full flex items-center gap-2",
              "text-sm font-medium transition-colors",
              task.completed 
                ? "text-green-800 line-through" 
                : "text-gray-900"
            )}
          >
            {/* Completion indicator */}
            <button
              onClick={(e) => {
                // Prevent event from bubbling up to title edit handler
                e.stopPropagation();
                
                // Toggle completion status
                const newCompleted = !task.completed;
                const updates: Partial<Task> = { completed: newCompleted };
                
                // Always set predictable status based on completion state
                if (newCompleted) {
                  updates.status = 'completed';
                } else {
                  updates.status = 'in-progress';
                }
                
                // Trigger localized confetti if task is being marked as completed
                if (newCompleted) {
                  setTimeout(() => triggerTaskRowConfetti(), 100);
                }
                
                onUpdate(task.id, updates);
              }}
              disabled={isUpdating || isDeleting}
              className={cn(
                "w-4 h-4 rounded-full flex items-center justify-center transition-all flex-shrink-0 hover:scale-110",
                task.completed
                  ? "bg-green-500 text-white hover:bg-green-600"
                  : "bg-gray-200 hover:bg-green-200 border-2 border-gray-300 hover:border-green-400",
                (isUpdating || isDeleting) && "opacity-50 cursor-not-allowed"
              )}
              title={task.completed ? "Mark as incomplete" : "Mark as complete"}
            >
              {task.completed && <Check className="h-3 w-3" />}
            </button>
            <span className="flex-1">{task.title}</span>
          </div>
        )}
      </div>

      {/* Priority */}
      <div className="col-span-2 flex items-center">
        <LabelDropdown
          value={task.priority}
          label={priorityLabel}
          onValueChange={handlePriorityUpdate}
          placeholder="Set priority"
          disabled={isUpdating || isDeleting}
          type="priority"
        />
      </div>

      {/* Assigned to */}
      <div className="col-span-2 flex items-center">
        <UserDropdown
          value={task.assignedTo || null}
          users={workspaceMembers}
          selectedUser={assignedUser}
          onValueChange={handleOwnerUpdate}
          placeholder="Assign to..."
          disabled={isUpdating || isDeleting}
        />
      </div>

      {/* Status */}
      <div className="col-span-2 flex items-center">
        <LabelDropdown
          value={task.status}
          label={statusLabel}
          onValueChange={handleStatusUpdate}
          placeholder="Set status"
          disabled={isUpdating || isDeleting}
          type="status"
        />
      </div>

      {/* Due On */}
      <div className="col-span-1 flex items-center">
        {editingField === 'dueDate' ? (
          <div className="flex items-center gap-2 w-full">
            <input
              type="date"
              value={editingDueDate}
              onChange={(e) => setEditingDueDate(e.target.value)}
              onBlur={handleDueDateEdit}
              onKeyDown={handleDueDateKeyDown}
              className="flex-1 text-sm bg-white border border-gray-300 rounded px-2 py-1 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
              autoFocus
            />
          </div>
        ) : (
          <div
            onClick={handleDueDateEdit}
            className={cn(
              "cursor-pointer hover:bg-gray-100 rounded px-1 py-1 -mx-1 -my-1 w-full text-left",
              "text-xs transition-colors"
            )}
          >
            <span className="text-gray-700">
              {task.dueDate 
                ? format(new Date(task.dueDate), 'MMM d')
                : 'Set'
              }
            </span>
          </div>
        )}
      </div>

      {/* Delete Button - Hover Zone */}
      <button
        onClick={() => onDelete(task.id)}
        disabled={isUpdating || isDeleting}
        className={cn(
          "absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 p-1 rounded transition-all opacity-0 group-hover:opacity-100 z-10",
          (isUpdating || isDeleting) && "opacity-50 cursor-not-allowed",
          editingField === 'dueDate' && "hidden"
        )}
        title="Delete task"
      >
        {isDeleting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
      </button>

      
      {/* Localized confetti canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
        style={{
          overflow: 'hidden'
        }}
      />
    </div>
  );
};

export default TaskTableRow;