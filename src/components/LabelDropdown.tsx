import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Plus } from 'lucide-react';
import { cn } from '../lib/utils';
import { WorkspaceLabel } from '../hooks/useGoals';

interface LabelDropdownProps {
  value: string;
  label?: WorkspaceLabel;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  type?: 'priority' | 'status';
}

const LabelDropdown: React.FC<LabelDropdownProps> = ({
  value,
  label,
  onValueChange,
  placeholder = "Select...",
  disabled = false,
  className,
  type
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Find the selected label value
  const selectedValue = label?.values.find(v => v.name === value);

  // Default colors for fallback
  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      case 'low': return '#10B981';
      default: return '#6B7280';
    }
  };

  const handleSelect = (labelValue: string) => {
    onValueChange(labelValue);
    setIsOpen(false);
  };

  // Helper function to get display-friendly names
  const getDisplayName = (value: string, type?: 'priority' | 'status'): string => {
    if (type === 'priority') {
      switch (value) {
        case 'high': return 'High';
        case 'medium': return 'Medium';
        case 'low': return 'Low';
        default: return value;
      }
    }
    if (type === 'status') {
      switch (value) {
        case 'not-started': return 'Not Started';
        case 'in-progress': return 'In Progress';
        case 'completed': return 'Completed';
        case 'blocked': return 'Blocked';
        case 'cancelled': return 'Cancelled';
        default: return value;
      }
    }
    return value;
  };

  // If no label is provided, show fallback options based on type
  if (!label) {
    const priorityOptions = [
      { name: 'high', color: '#EF4444' },
      { name: 'medium', color: '#F59E0B' },
      { name: 'low', color: '#10B981' }
    ];

    const statusOptions = [
      { name: 'not-started', color: '#6B7280' },
      { name: 'in-progress', color: '#F59E0B' },
      { name: 'completed', color: '#10B981' },
      { name: 'blocked', color: '#EF4444' }
    ];

    const options = type === 'status' ? statusOptions : priorityOptions;

    return (
      <div ref={dropdownRef} className={cn("relative", className)}>
        <button
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-md hover:bg-gray-50 transition-colors",
            disabled && "opacity-50 cursor-not-allowed",
            isOpen && "ring-2 ring-primary-500 border-primary-500"
          )}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: options.find(o => o.name === value)?.color || getPriorityColor(value) }}
            />
            <span className="truncate">
              {value ? getDisplayName(value, type) : placeholder}
            </span>
          </div>
          <ChevronDown className={cn(
            "h-4 w-4 text-gray-400 transition-transform",
            isOpen && "rotate-180"
          )} />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-[9999]">
            <div className="p-1">
              {options.map((option) => (
                <button
                  key={option.name}
                  onClick={() => handleSelect(option.name)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 rounded transition-colors",
                    value === option.name && "bg-primary-50 text-primary-700"
                  )}
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: option.color }}
                  />
                  <span className="flex-1 text-left">{getDisplayName(option.name, type)}</span>
                  {value === option.name && (
                    <Check className="h-4 w-4 text-primary-600" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={dropdownRef} className={cn("relative", className)}>
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "w-full flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-md hover:bg-gray-50 transition-colors",
          disabled && "opacity-50 cursor-not-allowed",
          isOpen && "ring-2 ring-primary-500 border-primary-500"
        )}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {selectedValue && (
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: selectedValue.color }}
            />
          )}
          <span className="truncate">
            {selectedValue?.name || value || placeholder}
          </span>
        </div>
        <ChevronDown className={cn(
          "h-4 w-4 text-gray-400 transition-transform",
          isOpen && "rotate-180"
        )} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-[9999]">
          <div className="p-1">
            {label.values
              .sort((a, b) => a.order - b.order)
              .map((labelValue) => (
                <button
                  key={labelValue.id}
                  onClick={() => handleSelect(labelValue.name)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 rounded transition-colors",
                    value === labelValue.name && "bg-primary-50 text-primary-700"
                  )}
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: labelValue.color }}
                  />
                  <span className="flex-1 text-left">{labelValue.name}</span>
                  {value === labelValue.name && (
                    <Check className="h-4 w-4 text-primary-600" />
                  )}
                </button>
              ))}
            
            {/* TODO: Add "Manage Labels" option for admins */}
            <div className="border-t border-gray-100 mt-1 pt-1">
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors"
                onClick={() => {
                  // TODO: Open label management modal
                  setIsOpen(false);
                }}
              >
                <Plus className="h-4 w-4" />
                <span>Manage labels...</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default LabelDropdown;