import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { 
  FileText, Award, Target, ChevronDown, ChevronRight,
  Bell, UserCheck, AlertCircle, Clock8, Eye, ThumbsUp,
  MessageCircle, CheckCircle2, Clock, AlertTriangle, UserPlus
} from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

// Type definitions
interface Validator {
  id: string;
  name: string;
  role: string;
  avatar: string;
  date: string;
  comment?: string;
}

interface KPIs {
  views: number;
  reactions: number;
  comments: number;
  attestations: number;
  endorsements: number;
  progress?: number;
}

interface Milestone {
  title: string;
  completed: boolean;
}

interface TimelineEntryDetails {
  issuer?: string;
  skills?: string[];
  credential?: string;
  metrics?: string;
  impact?: string;
  recognition?: string;
  deadline?: string;
  milestones?: Milestone[];
}

type EntryStatus = 
  | 'validated' 
  | 'pending_validation' 
  | 'attested' 
  | 'needs_attestation' 
  | 'on_track' 
  | 'delayed' 
  | 'completed';

type EntryType = 'journal' | 'achievement' | 'goal';

interface TimelineEntry {
  id: number;
  type: EntryType;
  icon: React.ReactNode;
  title: string;
  date: string;
  monthYear: string;
  content?: string;
  status: EntryStatus;
  kpis: KPIs;
  validators?: Validator[];
  details?: TimelineEntryDetails;
}

interface ActivityTimelineProps {
  entries: TimelineEntry[];
  itemsPerPage?: number;
}

// Sub-components
const StatusBadge = ({ status }: { status: EntryStatus }) => {
  const badges = {
    validated: {
      color: 'bg-green-100 text-green-800',
      icon: <CheckCircle2 className="h-3 w-3 text-green-600" />,
      text: 'Validated',
    },
    pending_validation: {
      color: 'bg-yellow-100 text-yellow-800',
      icon: <Clock className="h-3 w-3 text-yellow-600" />,
      text: 'Pending',
    },
    attested: {
      color: 'bg-blue-100 text-blue-800',
      icon: <UserCheck className="h-3 w-3 text-blue-600" />,
      text: 'Attested',
    },
    needs_attestation: {
      color: 'bg-purple-100 text-purple-800',
      icon: <Bell className="h-3 w-3 text-purple-600" />,
      text: 'Needs Attest',
    },
    on_track: {
      color: 'bg-emerald-100 text-emerald-800',
      icon: <Target className="h-3 w-3 text-emerald-600" />,
      text: 'On Track',
    },
    delayed: {
      color: 'bg-red-100 text-red-800',
      icon: <AlertTriangle className="h-3 w-3 text-red-600" />,
      text: 'Delayed',
    },
    completed: {
      color: 'bg-green-100 text-green-800',
      icon: <CheckCircle2 className="h-3 w-3 text-green-600" />,
      text: 'Completed',
    },
  };

  const badge = badges[status];
  
  return (
    <span className={cn("flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs font-medium", badge.color)}>
      {badge.icon}
      <span className="hidden sm:inline">{badge.text}</span>
    </span>
  );
};

const ActionButton = ({ status, onStatusChange }: { status: EntryStatus, onStatusChange?: (newStatus: EntryStatus) => void }) => {
  switch (status) {
    case 'pending_validation':
      return (
        <Button size="sm" variant="outline" className="h-6 px-2 py-0 text-xs">
          <UserCheck className="h-3 w-3 mr-1" />
          Validate
        </Button>
      );
    case 'needs_attestation':
      return (
        <Button size="sm" variant="outline" className="h-6 px-2 py-0 text-xs">
          <UserPlus className="h-3 w-3 mr-1" />
          Attest
        </Button>
      );
    case 'delayed':
      return (
        <div className="flex gap-1">
          <Button 
            size="sm"
            variant="outline" 
            className="h-6 px-2 py-0 text-xs text-blue-600"
            onClick={() => onStatusChange?.('on_track')}
          >
            On Track
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 py-0 text-xs text-green-600"
            onClick={() => onStatusChange?.('completed')}
          >
            Complete
          </Button>
        </div>
      );
    case 'on_track':
      return (
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 py-0 text-xs text-red-600"
            onClick={() => onStatusChange?.('delayed')}
          >
            Delayed
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 py-0 text-xs text-green-600"
            onClick={() => onStatusChange?.('completed')}
          >
            Complete
          </Button>
        </div>
      );
    default:
      return null;
  }
};

const TypeIcon = ({ type }: { type: EntryType }) => {
  switch (type) {
    case 'journal':
      return <FileText size={20} />;
    case 'achievement':
      return <Award size={20} />;
    case 'goal':
      return <Target size={20} />;
    default:
      return <FileText size={20} />;
  }
};

const MonthFilter = ({ 
  months, 
  selectedMonth, 
  onSelectMonth 
}: { 
  months: string[];
  selectedMonth: string | null;
  onSelectMonth: (month: string | null) => void;
}) => {
  return (
    <div className="w-40 border-l border-gray-200 p-3">
      <h3 className="mb-2 text-xs font-medium text-gray-900">Filter by Date</h3>
      <div className="space-y-1 max-h-96 overflow-y-auto">
        <button
          onClick={() => onSelectMonth(null)}
          className={cn(
            'w-full rounded-md px-2 py-1 text-left text-xs transition-colors',
            selectedMonth === null
              ? 'bg-primary-50 text-primary-600'
              : 'text-gray-600 hover:bg-gray-50'
          )}
        >
          All Entries
        </button>
        {months.map((month) => (
          <button
            key={month}
            onClick={() => onSelectMonth(month)}
            className={cn(
              'w-full rounded-md px-2 py-1 text-left text-xs transition-colors',
              selectedMonth === month
                ? 'bg-primary-50 text-primary-600'
                : 'text-gray-600 hover:bg-gray-50'
            )}
          >
            {month.length === 7
              ? format(parseISO(`${month}-01`), 'MMM yyyy')
              : month}
          </button>
        ))}
      </div>
    </div>
  );
};

const TimelineEntry = ({ entry, isExpanded, onToggle, onStatusChange }: {
  entry: TimelineEntry, 
  isExpanded: boolean, 
  onToggle: () => void,
  onStatusChange?: (id: number, status: EntryStatus) => void
}) => {
  return (
    <div className="relative pl-12 transition-all">
      {/* Timeline dot */}
      <div className="absolute left-4 top-4 -translate-x-1/2 rounded-full p-1 bg-primary-100 text-primary-600">
        <TypeIcon type={entry.type} />
      </div>

      {/* Entry content */}
      <div className="rounded-lg border border-gray-200 px-3 py-2 hover:shadow-sm transition-shadow">
        <div className="flex items-center justify-between">
          {/* Left side with title, date and status */}
          <div className="flex items-center gap-2 min-w-0">
            <h4 className="font-small text-gray-900 truncate max-w-xs">{entry.title}</h4>
            <StatusBadge status={entry.status} />
            <p className="text-xs text-gray-500 hidden sm:block">
              {format(parseISO(entry.date), 'MMM d')}
            </p>
          </div>
          
          {/* Right side with stats and expand button */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" /> {entry.kpis.views}
              </span>
              <span className="flex items-center gap-1">
                <ThumbsUp className="h-3 w-3" /> {entry.kpis.reactions}
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle className="h-3 w-3" /> {entry.kpis.comments}
              </span>
            </div>
            
            <button
              className="flex items-center text-gray-400 hover:text-gray-700 transition-colors"
              onClick={onToggle}
              aria-expanded={isExpanded}
              aria-label={isExpanded ? "Collapse details" : "Expand details"}
            >
              {isExpanded ? (
                <ChevronDown className="h-5 w-5" />
              ) : (
                <ChevronRight className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Expanded content - more compact */}
        {isExpanded && (
          <div className="mt-2 space-y-2 animate-fadeIn text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Left column */}
              <div className="space-y-2">
                {entry.content && (
                  <div className="rounded-md bg-gray-50 p-2 text-gray-700">
                    {entry.content.length > 100 ? `${entry.content.substring(0, 100)}...` : entry.content}
                  </div>
                )}
                
                {entry.type === 'goal' && entry.kpis.progress !== undefined && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-700">Progress</span>
                      <span className="text-gray-600">{entry.kpis.progress}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary-500 transition-all duration-300"
                        style={{ width: `${entry.kpis.progress}%` }}
                      />
                    </div>
                  </div>
                )}
                
                {entry.details && entry.details.milestones && entry.details.milestones.length > 0 && (
                  <div className="space-y-1">
                    <p className="font-medium">Milestones:</p>
                    <div className="grid grid-cols-1 gap-1">
                      {entry.details.milestones.slice(0, 3).map((milestone, index) => (
                        <div key={index} className="flex items-center space-x-1">
                          <input
                            type="checkbox"
                            checked={milestone.completed}
                            readOnly
                            className="rounded border-gray-300 text-primary-600 h-3 w-3"
                          />
                          <span className={cn("truncate", milestone.completed ? "line-through text-gray-500" : "")}>
                            {milestone.title}
                          </span>
                        </div>
                      ))}
                      {entry.details.milestones.length > 3 && (
                        <span className="text-gray-500 italic">+{entry.details.milestones.length - 3} more</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Right column */}
              <div className="space-y-2">
                {entry.validators && entry.validators.length > 0 && (
                  <div>
                    <span className="font-medium text-gray-900">Validators:</span>
                    <div className="mt-1 space-y-1">
                      {entry.validators.slice(0, 2).map((validator) => (
                        <div key={validator.id} className="flex items-center gap-1 rounded bg-gray-50 p-1">
                          <img src={validator.avatar} alt={validator.name} className="h-4 w-4 rounded-full object-cover" />
                          <span className="font-medium truncate">{validator.name}</span>
                        </div>
                      ))}
                      {entry.validators.length > 2 && (
                        <span className="text-gray-500 italic">+{entry.validators.length - 2} more</span>
                      )}
                    </div>
                  </div>
                )}
                
                {entry.details && (
                  <div className="grid grid-cols-1 gap-1">
                    {entry.details.skills && entry.details.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {entry.details.skills.slice(0, 3).map((skill) => (
                          <span key={skill} className="rounded-full bg-primary-50 px-1.5 py-0.5 text-primary-700">
                            {skill}
                          </span>
                        ))}
                        {entry.details.skills.length > 3 && (
                          <span className="text-gray-500">+{entry.details.skills.length - 3}</span>
                        )}
                      </div>
                    )}
                    
                    {entry.details.metrics && (
                      <p><span className="font-medium">Metrics:</span> {entry.details.metrics}</p>
                    )}
                    
                    {entry.details.impact && (
                      <p><span className="font-medium">Impact:</span> {entry.details.impact}</p>
                    )}
                  </div>
                )}
                
                {entry.status === 'pending_validation' || entry.status === 'needs_attestation' || 
                  entry.status === 'delayed' || entry.status === 'on_track' ? (
                  <div className="flex flex-wrap gap-1 justify-end mt-1">
                    <ActionButton status={entry.status} onStatusChange={(newStatus) => onStatusChange?.(entry.id, newStatus)} />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Main component
export function ActivityTimeline({ entries, itemsPerPage = 5 }: ActivityTimelineProps) {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [expandedEntries, setExpandedEntries] = useState<Set<number>>(new Set());
  const [visibleEntries, setVisibleEntries] = useState<number>(itemsPerPage);
  const [isLoading, setIsLoading] = useState(false);
  const [entriesData, setEntriesData] = useState<TimelineEntry[]>(entries);

  // Generate months for the filter - memoized to avoid recalculation
  const months = useMemo(() => {
    const result = [];
    const currentDate = new Date();
    
    // Add current month and previous 11 months
    for (let i = 0; i < 4; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      result.push(date.toISOString().slice(0, 7));
    }
    
    // Add past two years by year
    
    
    return result;
  }, []);

  // Filter entries based on selected month
  const filteredEntries = useMemo(() => 
    selectedMonth
      ? entriesData.filter((entry) => entry.monthYear.startsWith(selectedMonth))
      : entriesData
  , [selectedMonth, entriesData]);

  // Get entries to display based on pagination
  const displayedEntries = useMemo(() => 
    filteredEntries.slice(0, visibleEntries)
  , [filteredEntries, visibleEntries]);

  // Toggle entry expansion
  const toggleEntry = useCallback((id: number) => {
    setExpandedEntries((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Handle status change
  const handleStatusChange = useCallback((id: number, newStatus: EntryStatus) => {
    setEntriesData(prev => 
      prev.map(entry => 
        entry.id === id 
          ? { ...entry, status: newStatus }
          : entry
      )
    );
  }, []);

  // Load more entries
  const loadMore = useCallback(() => {
    setIsLoading(true);
    setTimeout(() => {
      setVisibleEntries(prev => prev + itemsPerPage);
      setIsLoading(false);
    }, 300);
  }, [itemsPerPage]);

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoading && displayedEntries.length < filteredEntries.length) {
          loadMore();
        }
      },
      { threshold: 0.5 }
    );

    const loadingTrigger = document.getElementById('loading-trigger');
    if (loadingTrigger) {
      observer.observe(loadingTrigger);
    }

    return () => observer.disconnect();
  }, [displayedEntries.length, filteredEntries.length, isLoading, loadMore]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
      </div>

      <div className="flex flex-col md:flex-row">
        {/* Timeline content */}
        <div className="flex-1 p-4">
          {displayedEntries.length > 0 ? (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-6 top-0 bottom-0 w-px bg-gray-200" />

              {/* Timeline entries */}
              <div className="space-y-2">
                {displayedEntries.map((entry) => (
                  <TimelineEntry
                    key={entry.id}
                    entry={entry}
                    isExpanded={expandedEntries.has(entry.id)}
                    onToggle={() => toggleEntry(entry.id)}
                    onStatusChange={handleStatusChange}
                  />
                ))}

                {/* Loading trigger for infinite scroll */}
                {displayedEntries.length < filteredEntries.length && (
                  <div
                    id="loading-trigger"
                    className="flex justify-center py-2"
                  >
                    {isLoading ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
                    ) : (
                      <div className="h-4 w-4" />
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-20 items-center justify-center rounded-lg border-2 border-dashed border-gray-200">
              <p className="text-center text-gray-500">
                No entries found
              </p>
            </div>
          )}
        </div>

        {/* Month filter sidebar */}
        <MonthFilter 
          months={months}
          selectedMonth={selectedMonth}
          onSelectMonth={setSelectedMonth}
        />
      </div>
    </div>
  );
}