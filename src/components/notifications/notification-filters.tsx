import React, { useState } from 'react';
import { format } from 'date-fns';
import {
  Search,
  Filter,
  Calendar,
  X,
  ChevronDown,
  Clock,
  AlertTriangle,
  Info,
  CheckCircle
} from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { 
  NotificationFilters as FilterType,
  NotificationPriority,
  DATE_RANGES
} from '../../types/notifications';

interface NotificationFiltersProps {
  filters: FilterType;
  onFiltersChange: (filters: FilterType) => void;
  onClose: () => void;
}

export function NotificationFilters({ filters, onFiltersChange, onClose }: NotificationFiltersProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customDateRange, setCustomDateRange] = useState({
    start: '',
    end: ''
  });

  const updateFilter = <K extends keyof FilterType>(key: K, value: FilterType[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      category: 'all',
      dateRange: {},
      isRead: null,
      searchQuery: '',
      priority: undefined
    });
  };

  const hasActiveFilters = () => {
    return (
      filters.searchQuery !== '' ||
      filters.isRead !== null ||
      filters.priority !== undefined ||
      filters.dateRange.start || filters.dateRange.end
    );
  };

  const handleDateRangeSelect = (range: { start: Date; end: Date } | null) => {
    if (range) {
      updateFilter('dateRange', range);
    } else {
      updateFilter('dateRange', {});
    }
    setShowDatePicker(false);
  };

  const handleCustomDateRange = () => {
    if (customDateRange.start && customDateRange.end) {
      handleDateRangeSelect({
        start: new Date(customDateRange.start),
        end: new Date(customDateRange.end)
      });
    }
  };

  const priorityOptions: { value: NotificationPriority | undefined; label: string; icon: React.ReactNode; color: string }[] = [
    { value: undefined, label: 'All Priorities', icon: <Filter className="h-3 w-3" />, color: 'text-gray-600' },
    { value: 'high', label: 'High Priority', icon: <AlertTriangle className="h-3 w-3" />, color: 'text-red-600' },
    { value: 'medium', label: 'Medium Priority', icon: <Info className="h-3 w-3" />, color: 'text-yellow-600' },
    { value: 'low', label: 'Low Priority', icon: <CheckCircle className="h-3 w-3" />, color: 'text-green-600' }
  ];

  const readStatusOptions = [
    { value: null, label: 'All Notifications' },
    { value: false, label: 'Unread Only' },
    { value: true, label: 'Read Only' }
  ];

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-500" />
          <h3 className="text-sm font-medium text-gray-900">Filter Notifications</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="p-4 space-y-6">
        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search Notifications
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by title, content, or user..."
              className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
              value={filters.searchQuery}
              onChange={(e) => updateFilter('searchQuery', e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Read Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Read Status
            </label>
            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
              value={filters.isRead === null ? 'null' : filters.isRead.toString()}
              onChange={(e) => {
                const value = e.target.value;
                updateFilter('isRead', value === 'null' ? null : value === 'true');
              }}
            >
              {readStatusOptions.map((option) => (
                <option key={option.value?.toString() || 'null'} value={option.value?.toString() || 'null'}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority
            </label>
            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
              value={filters.priority || ''}
              onChange={(e) => updateFilter('priority', (e.target.value as NotificationPriority) || undefined)}
            >
              {priorityOptions.map((option) => (
                <option key={option.value || 'all'} value={option.value || ''}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date Range
            </label>
            <div className="relative">
              <button
                type="button"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-left text-sm focus:border-primary-500 focus:ring-primary-500 flex items-center justify-between"
                onClick={() => setShowDatePicker(!showDatePicker)}
              >
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  {filters.dateRange.start ? (
                    `${format(filters.dateRange.start, 'MMM d')} - ${format(filters.dateRange.end || new Date(), 'MMM d, yyyy')}`
                  ) : (
                    'All Time'
                  )}
                </span>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </button>
              
              {showDatePicker && (
                <div className="absolute top-full left-0 right-0 mt-1 z-10 rounded-lg border border-gray-200 bg-white shadow-lg">
                  <div className="p-3 space-y-2">
                    <button
                      className="w-full text-left px-2 py-1 text-sm hover:bg-gray-100 rounded"
                      onClick={() => handleDateRangeSelect(null)}
                    >
                      All Time
                    </button>
                    {DATE_RANGES.map((range, index) => (
                      <button
                        key={index}
                        className="w-full text-left px-2 py-1 text-sm hover:bg-gray-100 rounded"
                        onClick={() => handleDateRangeSelect(range)}
                      >
                        {range.label}
                      </button>
                    ))}
                    
                    <div className="border-t border-gray-200 pt-2 mt-2">
                      <div className="text-xs font-medium text-gray-700 mb-2">Custom Range:</div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="date"
                          className="text-xs border border-gray-300 rounded px-2 py-1"
                          value={customDateRange.start}
                          onChange={(e) => setCustomDateRange({ ...customDateRange, start: e.target.value })}
                        />
                        <input
                          type="date"
                          className="text-xs border border-gray-300 rounded px-2 py-1"
                          value={customDateRange.end}
                          onChange={(e) => setCustomDateRange({ ...customDateRange, end: e.target.value })}
                        />
                      </div>
                      <Button
                        size="sm"
                        className="w-full mt-2"
                        onClick={handleCustomDateRange}
                        disabled={!customDateRange.start || !customDateRange.end}
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters() && (
          <div className="pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700">Active Filters:</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="text-primary-600 hover:text-primary-700 text-xs"
              >
                Clear All
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {filters.searchQuery && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Search: "{filters.searchQuery}"
                  <button
                    onClick={() => updateFilter('searchQuery', '')}
                    className="hover:bg-blue-200 rounded p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              
              {filters.isRead !== null && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {filters.isRead ? 'Read Only' : 'Unread Only'}
                  <button
                    onClick={() => updateFilter('isRead', null)}
                    className="hover:bg-green-200 rounded p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              
              {filters.priority && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  {priorityOptions.find(p => p.value === filters.priority)?.label}
                  <button
                    onClick={() => updateFilter('priority', undefined)}
                    className="hover:bg-purple-200 rounded p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              
              {filters.dateRange.start && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                  {format(filters.dateRange.start, 'MMM d')} - {format(filters.dateRange.end || new Date(), 'MMM d')}
                  <button
                    onClick={() => updateFilter('dateRange', {})}
                    className="hover:bg-orange-200 rounded p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}