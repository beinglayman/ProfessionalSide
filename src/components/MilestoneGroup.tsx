import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight, Plus, Target, Check, Clock, Users, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from './ui/button';
import TaskTableView from './TaskTableView';
import LabelDropdown from './LabelDropdown';
import UserDropdown from './UserDropdown';
import { cn } from '../lib/utils';
import { Milestone, Task, TeamMember, WorkspaceLabel } from '../hooks/useGoals';
import confetti from 'canvas-confetti';

interface MilestoneGroupProps {
  milestone: Milestone;
  goalId: string;
  workspaceMembers: TeamMember[];
  workspaceLabels: WorkspaceLabel[];
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onToggleCompletion: () => void;
  onCreateTask: (task: Partial<Task>) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
  updateTaskId?: string;
  deleteTaskId?: string;
  className?: string;
}

const MilestoneGroup: React.FC<MilestoneGroupProps> = ({
  milestone,
  goalId,
  workspaceMembers,
  workspaceLabels,
  isExpanded,
  onToggleExpanded,
  onToggleCompletion,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  updateTaskId,
  deleteTaskId,
  className
}) => {
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('medium');
  const [newTaskStatus, setNewTaskStatus] = useState('not-started');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskAssignedTo, setNewTaskAssignedTo] = useState<string | null>(null);
  
  // Refs for localized milestone confetti
  const milestoneRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const confettiInstance = useRef<any>(null);
  const previousCompletedState = useRef(milestone.completed);

  const tasks = milestone.tasks || [];
  const completedTasks = tasks.filter(t => t.completed).length;
  const totalTasks = tasks.length;
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Initialize confetti instance
  useEffect(() => {
    if (canvasRef.current && !confettiInstance.current) {
      try {
        confettiInstance.current = confetti.create(canvasRef.current, {
          resize: true,
          useWorker: false
        });
      } catch (error) {
        console.warn('Failed to create localized milestone confetti instance:', error);
      }
    }
  }, []);

  // Cleanup confetti instance on unmount
  useEffect(() => {
    return () => {
      confettiInstance.current = null;
    };
  }, []);

  // Check for completion state change and trigger confetti
  useEffect(() => {
    const wasCompleted = previousCompletedState.current;
    const isNowCompleted = milestone.completed;
    
    if (!wasCompleted && isNowCompleted) {
      // Milestone was just completed, trigger localized confetti
      setTimeout(() => triggerMilestoneConfetti(), 100);
    }
    
    previousCompletedState.current = isNowCompleted;
  }, [milestone.completed]);

  // Trigger localized milestone confetti celebration across milestone area
  const triggerMilestoneConfetti = () => {
    if (confettiInstance.current) {
      try {
        const colors = ['#5D259F', '#7C3AED', '#A855F7', '#22C55E', '#16A34A', '#FFD700', '#FFA500', '#FF6B6B'];
        
        // Create multiple launch points across the milestone width
        const launchPoints = [0.15, 0.35, 0.5, 0.65, 0.85];
        
        // Initial bigger burst from multiple points (milestone is more important than task)
        launchPoints.forEach((x, index) => {
          setTimeout(() => {
            if (confettiInstance.current) {
              confettiInstance.current({
                particleCount: 20,
                spread: 70,
                startVelocity: 25,
                origin: { x, y: 0.2 },
                colors,
                ticks: 150,
                scalar: 1.0,
                gravity: 0.6,
                drift: (x - 0.5) * 0.6
              });
            }
          }, index * 40); // Slightly longer stagger for milestone
        });
        
        // Follow-up wave with more particles
        setTimeout(() => {
          launchPoints.forEach((x, index) => {
            setTimeout(() => {
              if (confettiInstance.current) {
                confettiInstance.current({
                  particleCount: 15,
                  spread: 50,
                  startVelocity: 20,
                  origin: { x, y: 0.6 },
                  colors: ['#FFD700', '#FFA500', '#C084FC', '#DDD6FE', '#15803D', '#10B981'],
                  ticks: 120,
                  scalar: 0.8,
                  gravity: 0.7,
                  drift: (x - 0.5) * 0.4
                });
              }
            }, index * 35);
          });
        }, 300);
        
        // Third celebratory burst from center (milestone achievement deserves more celebration)
        setTimeout(() => {
          if (confettiInstance.current) {
            confettiInstance.current({
              particleCount: 30,
              spread: 360,
              startVelocity: 30,
              origin: { x: 0.5, y: 0.4 },
              colors: ['#FFD700', '#FFA500', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'],
              ticks: 200,
              scalar: 1.2,
              gravity: 0.5
            });
          }
        }, 600);
        
      } catch (error) {
        console.warn('Failed to trigger localized milestone confetti:', error);
      }
    }
  };

  const handleCreateTask = () => {
    if (!newTaskTitle.trim()) return;
    
    onCreateTask({
      title: newTaskTitle,
      priority: newTaskPriority as 'low' | 'medium' | 'high',
      status: newTaskStatus as 'not-started' | 'in-progress' | 'completed' | 'blocked',
      dueDate: newTaskDueDate || undefined,
      assignedTo: newTaskAssignedTo || undefined
    });

    // Reset form
    setNewTaskTitle('');
    setNewTaskPriority('medium');
    setNewTaskStatus('not-started');
    setNewTaskDueDate('');
    setNewTaskAssignedTo(null);
    setShowNewTaskForm(false);
  };

  const handleCancelNewTask = () => {
    setNewTaskTitle('');
    setNewTaskPriority('medium');
    setNewTaskStatus('not-started');
    setNewTaskDueDate('');
    setNewTaskAssignedTo(null);
    setShowNewTaskForm(false);
  };

  // Auto-completion status display
  const getCompletionStatus = () => {
    if (milestone.manuallyCompleted) {
      return 'manually completed';
    }
    if (milestone.autoCompleteFromTasks !== false && totalTasks > 0) {
      return `${completedTasks}/${totalTasks} tasks completed`;
    }
    return milestone.completed ? 'completed' : 'incomplete';
  };

  return (
    <div 
      ref={milestoneRef}
      className={cn(
        "relative border border-gray-200 rounded-lg transition-all",
        milestone.completed ? "bg-green-50 border-green-200" : "bg-white",
        className
      )}
    >
      {/* Milestone Header */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Expand/Collapse Button */}
            <button
              onClick={onToggleExpanded}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
            
            {/* Milestone Icon */}
            <Target className="h-5 w-5 text-primary-500" />
            
            {/* Milestone Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className={cn(
                  "text-base font-semibold",
                  milestone.completed ? "text-green-800" : "text-gray-900"
                )}>
                  {milestone.title}
                </h3>
                
                {/* Completion Status Badge */}
                <span className={cn(
                  "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                  milestone.completed
                    ? "bg-green-100 text-green-800"
                    : totalTasks > 0
                    ? "bg-blue-100 text-blue-800"
                    : "bg-gray-100 text-gray-600"
                )}>
                  {getCompletionStatus()}
                </span>
              </div>
              
              {/* Milestone Metadata */}
              <div className="flex items-center gap-4 text-sm text-gray-500">
                {milestone.targetDate && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>Due {format(new Date(milestone.targetDate), 'MMM d, yyyy')}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  <span>{totalTasks} {totalTasks === 1 ? 'task' : 'tasks'}</span>
                </div>
                
                {/* Progress Bar */}
                {totalTasks > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full transition-all duration-300",
                          milestone.completed ? "bg-green-500" : "bg-primary-500"
                        )}
                        style={{ width: `${completionPercentage}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium">{completionPercentage}%</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Milestone Actions */}
          <div className="flex items-center gap-2">
            {/* Manual Completion Toggle */}
            <button
              onClick={onToggleCompletion}
              className={cn(
                "w-6 h-6 rounded border-2 flex items-center justify-center transition-all",
                milestone.completed
                  ? "bg-green-500 border-green-500 text-white"
                  : "bg-white border-gray-300 hover:border-green-400 hover:bg-green-50"
              )}
              title={milestone.completed ? "Mark as incomplete" : "Mark as complete"}
            >
              {milestone.completed && <Check className="h-3 w-3" />}
            </button>
            
            {/* Add Task Button */}
            <Button
              onClick={() => {
                if (!isExpanded) {
                  onToggleExpanded();
                }
                setShowNewTaskForm(true);
              }}
              size="sm"
              variant="outline"
              className="text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Task
            </Button>
          </div>
        </div>
      </div>
      
      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-200">
          <div className="p-4 space-y-2">
            {/* New Task Form */}
            {showNewTaskForm && (
              <div className="bg-gray-50 rounded-lg p-3 border-2 border-dashed border-gray-300">
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Task title..."
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    className="w-full text-sm font-medium bg-white border border-gray-300 rounded px-3 py-2 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                    autoFocus
                  />
                  
                  {/* Task Options Grid - Match Task Table Layout */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Priority */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-600">Priority</label>
                      <LabelDropdown
                        value={newTaskPriority}
                        label={workspaceLabels.find(label => label.type === 'priority')}
                        onValueChange={setNewTaskPriority}
                        placeholder="Set priority"
                        type="priority"
                        className="text-xs"
                      />
                    </div>

                    {/* Status */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-600">Status</label>
                      <LabelDropdown
                        value={newTaskStatus}
                        label={workspaceLabels.find(label => label.type === 'status')}
                        onValueChange={setNewTaskStatus}
                        placeholder="Set status"
                        type="status"
                        className="text-xs"
                      />
                    </div>

                    {/* Assigned To */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-600">Assigned to</label>
                      <UserDropdown
                        value={newTaskAssignedTo}
                        users={workspaceMembers}
                        selectedUser={newTaskAssignedTo ? workspaceMembers.find(m => m.id === newTaskAssignedTo) || null : null}
                        onValueChange={setNewTaskAssignedTo}
                        placeholder="Assign to..."
                        className="text-xs"
                      />
                    </div>

                    {/* Due Date */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-600">Due Date</label>
                      <div className="relative">
                        <input
                          type="date"
                          value={newTaskDueDate}
                          onChange={(e) => setNewTaskDueDate(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-md focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
                        />
                        <Calendar className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleCreateTask} 
                      size="sm" 
                      disabled={!newTaskTitle.trim()}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Task
                    </Button>
                    <Button onClick={handleCancelNewTask} variant="outline" size="sm">
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Task Table */}
            <TaskTableView
              tasks={tasks}
              goalId={goalId}
              milestoneId={milestone.id}
              workspaceMembers={workspaceMembers}
              workspaceLabels={workspaceLabels}
              onUpdateTask={onUpdateTask}
              onDeleteTask={onDeleteTask}
              updateTaskId={updateTaskId}
              deleteTaskId={deleteTaskId}
            />
          </div>
        </div>
      )}
      
      {/* Localized milestone confetti canvas */}
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

export default MilestoneGroup;