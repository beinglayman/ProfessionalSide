import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, GripVertical, Check } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import { WorkspaceLabel, useUpdateWorkspaceLabel } from '../hooks/useGoals';

interface LabelManagerProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  label: WorkspaceLabel;
  onUpdated: () => void;
}

interface LabelValue {
  id: string;
  name: string;
  color: string;
  order: number;
  isNew?: boolean;
}

const PREDEFINED_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', 
  '#84CC16', '#22C55E', '#10B981', '#14B8A6',
  '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1',
  '#8B5CF6', '#A855F7', '#C084FC', '#D946EF',
  '#EC4899', '#F43F5E', '#6B7280', '#374151'
];

const LabelManager: React.FC<LabelManagerProps> = ({
  isOpen,
  onClose,
  workspaceId,
  label,
  onUpdated
}) => {
  const [values, setValues] = useState<LabelValue[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const updateLabelMutation = useUpdateWorkspaceLabel();

  useEffect(() => {
    if (label) {
      setValues(label.values.map(v => ({
        id: v.id,
        name: v.name,
        color: v.color,
        order: v.order
      })));
      setIsDirty(false);
    }
  }, [label]);

  const handleAddValue = () => {
    const newValue: LabelValue = {
      id: `new-${Date.now()}`,
      name: '',
      color: PREDEFINED_COLORS[0],
      order: values.length,
      isNew: true
    };
    setValues([...values, newValue]);
    setIsDirty(true);
  };

  const handleUpdateValue = (id: string, updates: Partial<LabelValue>) => {
    setValues(values.map(v => 
      v.id === id ? { ...v, ...updates } : v
    ));
    setIsDirty(true);
  };

  const handleDeleteValue = (id: string) => {
    setValues(values.filter(v => v.id !== id));
    setIsDirty(true);
  };

  const handleMoveValue = (fromIndex: number, toIndex: number) => {
    const newValues = [...values];
    const [movedValue] = newValues.splice(fromIndex, 1);
    newValues.splice(toIndex, 0, movedValue);
    
    // Update order
    const orderedValues = newValues.map((v, index) => ({
      ...v,
      order: index
    }));
    
    setValues(orderedValues);
    setIsDirty(true);
  };

  const handleSave = async () => {
    const validValues = values.filter(v => v.name.trim());
    
    try {
      await updateLabelMutation.mutateAsync({
        workspaceId,
        type: label.type,
        values: validValues.map((v, index) => ({
          name: v.name.trim(),
          color: v.color,
          order: index
        }))
      });
      
      onUpdated();
      onClose();
    } catch (error) {
      console.error('Failed to update labels:', error);
    }
  };

  const handleCancel = () => {
    if (isDirty) {
      if (confirm('You have unsaved changes. Are you sure you want to close?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Manage {label?.name} Labels
          </h3>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-3 mb-4">
            {values.map((value, index) => (
              <LabelValueRow
                key={value.id}
                value={value}
                index={index}
                totalCount={values.length}
                onUpdate={(updates) => handleUpdateValue(value.id, updates)}
                onDelete={() => handleDeleteValue(value.id)}
                onMove={handleMoveValue}
                colors={PREDEFINED_COLORS}
              />
            ))}
          </div>

          {/* Add Button */}
          <button
            onClick={handleAddValue}
            className="w-full flex items-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-md hover:border-primary-400 hover:bg-primary-50 transition-colors text-gray-600 hover:text-primary-700"
          >
            <Plus className="h-4 w-4" />
            <span>Add {label?.type} option</span>
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={updateLabelMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isDirty || updateLabelMutation.isPending}
            className="min-w-[80px]"
          >
            {updateLabelMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
};

interface LabelValueRowProps {
  value: LabelValue;
  index: number;
  totalCount: number;
  onUpdate: (updates: Partial<LabelValue>) => void;
  onDelete: () => void;
  onMove: (fromIndex: number, toIndex: number) => void;
  colors: string[];
}

const LabelValueRow: React.FC<LabelValueRowProps> = ({
  value,
  index,
  totalCount,
  onUpdate,
  onDelete,
  onMove,
  colors
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);

  return (
    <div className="flex items-center gap-2 p-2 border border-gray-200 rounded-md">
      {/* Drag Handle */}
      <button
        className="text-gray-400 hover:text-gray-600 cursor-move"
        title="Reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Color */}
      <div className="relative">
        <button
          onClick={() => setShowColorPicker(!showColorPicker)}
          className="w-6 h-6 rounded-full border-2 border-gray-300 hover:border-gray-400 transition-colors"
          style={{ backgroundColor: value.color }}
          title="Change color"
        />
        
        {showColorPicker && (
          <div className="absolute top-full left-0 mt-1 p-2 bg-white border border-gray-200 rounded-md shadow-lg z-10">
            <div className="grid grid-cols-5 gap-1">
              {colors.map((color) => (
                <button
                  key={color}
                  onClick={() => {
                    onUpdate({ color });
                    setShowColorPicker(false);
                  }}
                  className={cn(
                    "w-6 h-6 rounded-full border-2 hover:scale-110 transition-transform",
                    value.color === color ? "border-gray-600" : "border-gray-300"
                  )}
                  style={{ backgroundColor: color }}
                >
                  {value.color === color && (
                    <Check className="h-3 w-3 text-white mx-auto" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Name Input */}
      <input
        type="text"
        value={value.name}
        onChange={(e) => onUpdate({ name: e.target.value })}
        placeholder="Label name..."
        className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
      />

      {/* Delete Button */}
      <button
        onClick={onDelete}
        className="text-gray-400 hover:text-red-500 transition-colors p-1"
        title="Delete"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      {/* Color Picker Overlay */}
      {showColorPicker && (
        <div
          className="fixed inset-0 z-5"
          onClick={() => setShowColorPicker(false)}
        />
      )}
    </div>
  );
};

export default LabelManager;