/**
 * EditActivitiesModal Component
 *
 * Modal for editing activity assignments for clusters or journal entries.
 * Features two-column layout: current activities (with remove) and available activities (with add).
 *
 * Used by:
 * - ClusterCard: Edit which activities belong to a cluster
 * - JournalEntryCard: Edit which activities are linked to a journal entry
 */

import React, { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { Plus, Minus, Loader2, AlertCircle, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ToolIcon } from '../career-stories/ToolIcon';
import { cn } from '../../lib/utils';
import { ToolActivity, ToolType } from '../../types/career-stories';

export interface EditActivitiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentActivityIds: string[];
  availableActivities: ToolActivity[];
  onSave: (activityIds: string[]) => Promise<void>;
  minActivities?: number;
  title?: string;
}

export function EditActivitiesModal({
  isOpen,
  onClose,
  currentActivityIds,
  availableActivities,
  onSave,
  minActivities = 1,
  title = 'Edit Activities',
}: EditActivitiesModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(currentActivityIds));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Reset state when modal opens with new data
  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set(currentActivityIds));
      setError(null);
      setSearchQuery('');
    }
  }, [isOpen, currentActivityIds]);

  // Split activities into current and available
  const { currentActivities, unassignedActivities } = useMemo(() => {
    const current: ToolActivity[] = [];
    const unassigned: ToolActivity[] = [];

    availableActivities.forEach((activity) => {
      if (selectedIds.has(activity.id)) {
        current.push(activity);
      } else {
        unassigned.push(activity);
      }
    });

    // Sort by timestamp descending (most recent first)
    const sortByTimestamp = (a: ToolActivity, b: ToolActivity) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();

    current.sort(sortByTimestamp);
    unassigned.sort(sortByTimestamp);

    return { currentActivities: current, unassignedActivities: unassigned };
  }, [availableActivities, selectedIds]);

  // Filter activities by search query
  const filteredUnassigned = useMemo(() => {
    if (!searchQuery.trim()) return unassignedActivities;
    const query = searchQuery.toLowerCase();
    return unassignedActivities.filter(
      (a) =>
        a.title.toLowerCase().includes(query) ||
        a.source.toLowerCase().includes(query) ||
        (a.description && a.description.toLowerCase().includes(query))
    );
  }, [unassignedActivities, searchQuery]);

  const handleAdd = (activityId: string) => {
    setSelectedIds((prev) => new Set([...prev, activityId]));
    setError(null);
  };

  const handleRemove = (activityId: string) => {
    if (selectedIds.size <= minActivities) {
      setError(`Cannot remove. At least ${minActivities} activity required.`);
      return;
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(activityId);
      return next;
    });
    setError(null);
  };

  const handleSave = async () => {
    if (selectedIds.size < minActivities) {
      setError(`At least ${minActivities} activity required.`);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave(Array.from(selectedIds));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = useMemo(() => {
    if (selectedIds.size !== currentActivityIds.length) return true;
    return !currentActivityIds.every((id) => selectedIds.has(id));
  }, [selectedIds, currentActivityIds]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Select which activities to include. Changes will update the grouping method to manual.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="flex-1 grid grid-cols-2 gap-4 min-h-0 overflow-hidden">
          {/* Current Activities Column */}
          <div className="flex flex-col min-h-0">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Current ({currentActivities.length})
            </h3>
            <div className="flex-1 overflow-y-auto border border-gray-200 rounded-md p-2 space-y-2 bg-gray-50">
              {currentActivities.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No activities assigned</p>
              ) : (
                currentActivities.map((activity) => (
                  <ActivityItem
                    key={activity.id}
                    activity={activity}
                    action="remove"
                    onAction={() => handleRemove(activity.id)}
                    disabled={selectedIds.size <= minActivities}
                  />
                ))
              )}
            </div>
          </div>

          {/* Available Activities Column */}
          <div className="flex flex-col min-h-0">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Available ({filteredUnassigned.length})
            </h3>
            <div className="relative mb-2">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search activities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
            <div className="flex-1 overflow-y-auto border border-gray-200 rounded-md p-2 space-y-2">
              {filteredUnassigned.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  {searchQuery ? 'No matching activities' : 'No available activities'}
                </p>
              ) : (
                filteredUnassigned.map((activity) => (
                  <ActivityItem
                    key={activity.id}
                    activity={activity}
                    action="add"
                    onAction={() => handleAdd(activity.id)}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ActivityItemProps {
  activity: ToolActivity;
  action: 'add' | 'remove';
  onAction: () => void;
  disabled?: boolean;
}

function ActivityItem({ activity, action, onAction, disabled }: ActivityItemProps) {
  const formattedDate = format(new Date(activity.timestamp), 'MMM d');

  return (
    <div
      className="flex items-center gap-2 p-2 rounded border bg-white border-gray-200"
    >
      <ToolIcon tool={activity.source as ToolType} className="w-4 h-4" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{activity.title}</p>
        <p className="text-xs text-gray-500">{formattedDate}</p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onAction}
        disabled={disabled}
        className={cn(
          'h-7 w-7 p-0',
          action === 'add'
            ? 'text-green-600 hover:text-green-700 hover:bg-green-50'
            : 'text-red-600 hover:text-red-700 hover:bg-red-50'
        )}
        title={action === 'add' ? 'Add to current' : 'Remove from current'}
      >
        {action === 'add' ? <Plus className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
      </Button>
    </div>
  );
}
