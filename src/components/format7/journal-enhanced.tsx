import React, { useState, useEffect, useRef } from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Format7JournalEntry } from './sample-data';
import {
  GithubIcon,
  JiraIcon,
  SlackIcon,
  TeamsIcon,
  FigmaIcon,
  ConfluenceIcon,
  OutlookIcon,
  OneDriveIcon,
  OneNoteIcon,
  SharePointIcon,
  ZoomIcon,
  GoogleWorkspaceIcon,
} from '../icons/ToolIcons';
import { ChevronDown, ChevronUp, Clock, Heart, MessageSquare, Repeat2, MoreVertical, Lightbulb, Link2, TrendingUp, Users, FileText, Code, Pencil, Check, X, Trophy, Building, Upload, Trash2 } from 'lucide-react';
import { useContainedConfetti } from '../../hooks/useContainedConfetti';

interface JournalEnhancedProps {
  entry: Format7JournalEntry;
  showUserProfile?: boolean;
  editMode?: boolean;
  isPreview?: boolean;
  selectedWorkspaceId?: string;
  workspaceName?: string; // Display-only workspace name (selected in Step 1)
  author?: {
    name: string;
    title?: string;
    avatar?: string;
  };
  onTitleChange?: (title: string) => void;
  onDescriptionChange?: (description: string) => void;
  onAppreciate?: () => void;
  onDiscuss?: () => void;
  onReChronicle?: () => void;
  isDraft?: boolean; // Whether this entry is a draft (unpublished)
  onPublish?: () => void; // Handler for publishing the entry
  onDiscard?: () => void; // Handler for discarding the draft entry
  correlations?: Array<{
    id: string;
    type: 'pr_to_jira' | 'meeting_to_code' | 'design_to_code' | 'discussion_to_doc' | 'general';
    source1: { tool: string; id: string; title: string; url?: string };
    source2: { tool: string; id: string; title: string; url?: string };
    confidence: number;
    reasoning: string;
  }>;
  categories?: Array<{
    type: 'achievement' | 'learning' | 'collaboration' | 'documentation' | 'problem_solving';
    label: string;
    summary: string;
    items: Array<{
      id: string;
      source: string;
      type: string;
      title: string;
      description: string;
      url: string;
      importance: 'high' | 'medium' | 'low';
    }>;
  }>;
}

const getToolIcon = (source: string, size = 'w-4 h-4') => {
  switch (source) {
    case 'github': return <GithubIcon className={size} />;
    case 'jira': return <JiraIcon className={size} />;
    case 'slack': return <SlackIcon className={size} />;
    case 'teams': return <TeamsIcon className={size} />;
    case 'figma': return <FigmaIcon className={size} />;
    case 'confluence': return <ConfluenceIcon className={size} />;
    case 'outlook': return <OutlookIcon className={size} />;
    case 'onedrive': return <OneDriveIcon className={size} />;
    case 'onenote': return <OneNoteIcon className={size} />;
    case 'sharepoint': return <SharePointIcon className={size} />;
    case 'zoom': return <ZoomIcon className={size} />;
    case 'google_workspace': return <GoogleWorkspaceIcon className={size} />;
    default: return null;
  }
};

const getCategoryIcon = (type: string) => {
  switch (type) {
    case 'achievement': return <TrendingUp className="w-4 h-4" />;
    case 'learning': return <Lightbulb className="w-4 h-4" />;
    case 'collaboration': return <Users className="w-4 h-4" />;
    case 'documentation': return <FileText className="w-4 h-4" />;
    case 'problem_solving': return <Code className="w-4 h-4" />;
    default: return <Lightbulb className="w-4 h-4" />;
  }
};

const getCategoryColor = (type: string) => {
  switch (type) {
    case 'achievement': return 'bg-green-50 border-green-200 text-green-700';
    case 'learning': return 'bg-blue-50 border-blue-200 text-blue-700';
    case 'collaboration': return 'bg-purple-50 border-purple-200 text-purple-700';
    case 'documentation': return 'bg-yellow-50 border-yellow-200 text-yellow-700';
    case 'problem_solving': return 'bg-orange-50 border-orange-200 text-orange-700';
    default: return 'bg-gray-50 border-gray-200 text-gray-700';
  }
};

const JournalEnhanced: React.FC<JournalEnhancedProps> = ({
  entry,
  showUserProfile = false,
  editMode = false,
  isPreview = false,
  selectedWorkspaceId,
  workspaceName,
  author: authorProp,
  onTitleChange,
  onDescriptionChange,
  onAppreciate,
  onDiscuss,
  onReChronicle,
  correlations = [],
  categories = [],
  isDraft = false,
  onPublish,
  onDiscard
}) => {
  // In preview mode, always show expanded view
  const [isExpanded, setIsExpanded] = useState(isPreview);
  const [expandedActivities, setExpandedActivities] = useState<Set<string>>(new Set());
  const [showRelativeTime, setShowRelativeTime] = useState(true);
  const [showCorrelations, setShowCorrelations] = useState(false);
  const [showCategories, setShowCategories] = useState(false);

  // Inline editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [localTitle, setLocalTitle] = useState(entry.entry_metadata?.title || '');
  const [localDescription, setLocalDescription] = useState(entry.context?.primary_focus || '');

  // Confetti effect for achievement entries
  const [lastConfettiTime, setLastConfettiTime] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const { triggerContainedConfetti } = useContainedConfetti();

  // Keep expanded in preview mode
  useEffect(() => {
    if (isPreview) {
      setIsExpanded(true);
      // Auto-expand correlations and categories in preview mode if they exist
      if (correlations.length > 0) {
        setShowCorrelations(true);
      }
      if (categories.length > 0) {
        setShowCategories(true);
      }
    }
  }, [isPreview, correlations.length, categories.length]);

  // Handle confetti effect on achievement entry hover
  const handleAchievementHover = () => {
    if (entry.entry_metadata?.type === 'achievement' && cardRef.current) {
      const now = Date.now();
      // 3-second cooldown between confetti bursts
      if (now - lastConfettiTime > 3000) {
        triggerContainedConfetti(cardRef, {
          particleCount: 40,
          spread: 60,
          colors: ['#5D259F', '#8B5CF6', '#A78BFA', '#C4B5FD', '#DDD6FE'],
          duration: 2000,
          origin: { x: { min: 0.2, max: 0.8 }, y: 0.85 }
        });
        setLastConfettiTime(now);
      }
    }
  };

  const toggleActivity = (activityId: string) => {
    const newExpanded = new Set(expandedActivities);
    if (newExpanded.has(activityId)) {
      newExpanded.delete(activityId);
    } else {
      newExpanded.add(activityId);
    }
    setExpandedActivities(newExpanded);
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 2592000) {
      const weeks = Math.floor(diffInSeconds / 604800);
      return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 31536000) {
      const months = Math.floor(diffInSeconds / 2592000);
      return `${months} month${months > 1 ? 's' : ''} ago`;
    } else {
      const years = Math.floor(diffInSeconds / 31536000);
      return `${years} year${years > 1 ? 's' : ''} ago`;
    }
  };

  const getAbsoluteTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDateRange = (startDate: string, endDate: string): string => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const sameDay = start.toDateString() === end.toDateString();
    const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
    const sameYear = start.getFullYear() === end.getFullYear();

    const dayMonth = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const dayMonthYear = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

    if (sameDay) {
      return dayMonthYear(start);
    } else if (sameMonth) {
      return `${start.getDate()} - ${dayMonthYear(end)}`;
    } else if (sameYear) {
      return `${dayMonth(start)} - ${dayMonthYear(end)}`;
    } else {
      return `${dayMonthYear(start)} - ${dayMonthYear(end)}`;
    }
  };

  const primaryFocus = entry.context?.primary_focus || '';
  const excerpt = primaryFocus.length > 112 ? primaryFocus.slice(0, 112) + '...' : primaryFocus;

  // Use provided author prop or fallback to defaults
  const author = authorProp || {
    name: "Unknown Author",
    title: "",
    avatar: "https://i.pravatar.cc/150?img=1"
  };

  const strongCorrelations = correlations.filter(c => c.confidence >= 0.7);

  return (
    <div className="w-full">
      {/* Card with hover shadow */}
      <div
        ref={cardRef}
        onMouseEnter={handleAchievementHover}
        className="rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
      >
        {/* Compact Author Header */}
        {showUserProfile && (
          <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-2">
            <div className="w-8 h-8 rounded-full border border-gray-200 overflow-hidden flex-shrink-0">
              <img src={author.avatar} alt={author.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900 truncate">{author.name}</span>
                <span className="text-xs text-gray-500">·</span>
                <span className="text-xs text-gray-500">{author.title}</span>
                <span className="text-xs text-gray-500">·</span>
                <button
                  onClick={() => setShowRelativeTime(!showRelativeTime)}
                  className="text-xs text-gray-500 hover:text-gray-700 cursor-pointer transition-colors"
                >
                  {showRelativeTime
                    ? getRelativeTime(entry.entry_metadata?.created_at || new Date().toISOString())
                    : getAbsoluteTime(entry.entry_metadata?.created_at || new Date().toISOString())}
                </button>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="w-4 h-4 text-gray-500" />
            </Button>
          </div>
        )}

        {/* Main Content */}
        <div className="p-6">
          {/* Draft indicator and actions */}
          {isDraft && (
            <div className="flex items-center justify-between mb-2">
              <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-xs px-2 py-0.5 flex items-center gap-1">
                <FileText className="w-3 h-3" />
                Draft
              </Badge>
              {(onPublish || onDiscard) && (
                <div className="flex gap-1">
                  {onDiscard && (
                    <button
                      onClick={onDiscard}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="Discard draft"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {onPublish && (
                    <button
                      onClick={onPublish}
                      className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                      title="Publish"
                    >
                      <Upload className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
          {/* Title with time span */}
          <div className="flex items-start justify-between mb-3">
            {editMode && !isEditingTitle ? (
              <div className="flex items-center gap-2 flex-1">
                <h2 className="text-lg font-semibold text-gray-900">{localTitle}</h2>
                <button
                  onClick={() => setIsEditingTitle(true)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  title="Edit title"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
            ) : editMode && isEditingTitle ? (
              <div className="flex flex-col gap-2 flex-1">
                <input
                  type="text"
                  value={localTitle}
                  onChange={(e) => setLocalTitle(e.target.value)}
                  className="text-lg font-semibold border border-gray-300 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  maxLength={100}
                  autoFocus
                />
                <div className="flex gap-2 items-center">
                  <span className="text-xs text-gray-500">{localTitle.length}/100 characters</span>
                  <button
                    onClick={() => {
                      onTitleChange?.(localTitle);
                      setIsEditingTitle(false);
                    }}
                    className="text-green-600 hover:text-green-700 transition-colors"
                    title="Save"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setLocalTitle(entry.entry_metadata?.title || '');
                      setIsEditingTitle(false);
                    }}
                    className="text-red-600 hover:text-red-700 transition-colors"
                    title="Cancel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <h2 className="text-lg font-semibold text-gray-900 flex-1">{entry.entry_metadata?.title || ''}</h2>
            )}
            {entry.context?.date_range && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Clock className="w-3.5 h-3.5" />
                <span>{formatDateRange(entry.context.date_range.start, entry.context.date_range.end)}</span>
              </div>
            )}
          </div>

          {/* Achievement Widget - Only for achievement entries (v2) */}
          {entry.entry_metadata?.type === 'achievement' && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-semibold text-purple-900">Achievement Unlocked</span>
              </div>
              <p className="text-sm text-purple-700">
                {entry.entry_metadata?.title || 'Achievement description'}
              </p>
            </div>
          )}

          {/* Description */}
          {editMode && !isEditingDescription ? (
            <div className="flex items-start gap-2 mb-4">
              <p className="text-sm text-gray-600 leading-relaxed flex-1">
                {isExpanded ? localDescription : localDescription.slice(0, 112) + '...'}
              </p>
              <button
                onClick={() => setIsEditingDescription(true)}
                className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 mt-1"
                title="Edit description"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          ) : editMode && isEditingDescription ? (
            <div className="flex flex-col gap-2 mb-4">
              <textarea
                value={localDescription}
                onChange={(e) => setLocalDescription(e.target.value)}
                className="text-sm text-gray-600 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 leading-relaxed"
                maxLength={500}
                rows={4}
                autoFocus
              />
              <div className="flex gap-2 items-center">
                <span className="text-xs text-gray-500">{localDescription.length}/500 characters</span>
                <button
                  onClick={() => {
                    onDescriptionChange?.(localDescription);
                    setIsEditingDescription(false);
                  }}
                  className="text-green-600 hover:text-green-700 transition-colors"
                  title="Save"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setLocalDescription(entry.context?.primary_focus || '');
                    setIsEditingDescription(false);
                  }}
                  className="text-red-600 hover:text-red-700 transition-colors"
                  title="Cancel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-600 mb-4 leading-relaxed">
              {isExpanded ? (entry.context?.primary_focus || '') : excerpt}
            </p>
          )}

          {/* Metadata Tags - Workspace, Categories, Correlations */}
          {(workspaceName || correlations.length > 0 || categories.length > 0) && (
            <div className="flex flex-wrap gap-2 mb-4">
              {/* Workspace Tag (read-only, selected in Step 1) */}
              {workspaceName && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full text-xs text-blue-700">
                  <Building className="w-3.5 h-3.5" />
                  <span>{workspaceName}</span>
                </span>
              )}
              {strongCorrelations.length > 0 && (
                <button
                  onClick={() => setShowCorrelations(!showCorrelations)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-full text-xs text-purple-700 hover:bg-purple-100 transition-colors"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>{strongCorrelations.length} AI-detected correlation{strongCorrelations.length > 1 ? 's' : ''}</span>
                </button>
              )}
              {categories.length > 0 && (
                <button
                  onClick={() => setShowCategories(!showCategories)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full text-xs text-green-700 hover:bg-green-100 transition-colors"
                >
                  <Lightbulb className="w-3.5 h-3.5" />
                  <span>{categories.length} AI-grouped categor{categories.length > 1 ? 'ies' : 'y'}</span>
                </button>
              )}
            </div>
          )}

          {/* AI Correlations Section */}
          {showCorrelations && strongCorrelations.length > 0 && (
            <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <h4 className="text-sm font-bold text-purple-900 mb-3 flex items-center gap-2">
                <Link2 className="w-4 h-4" />
                AI-Detected Correlations
              </h4>
              <div className="space-y-3">
                {strongCorrelations.map((correlation) => (
                  <div key={correlation.id} className="bg-white p-3 rounded-md border border-purple-100">
                    <div className="flex items-start gap-3 mb-2">
                      <div className="flex items-center gap-2 flex-1">
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded">
                          {getToolIcon(correlation.source1.tool, 'w-3.5 h-3.5')}
                          <span className="text-xs font-medium text-gray-700">{correlation.source1.title}</span>
                        </div>
                        <div className="text-purple-400">→</div>
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded">
                          {getToolIcon(correlation.source2.tool, 'w-3.5 h-3.5')}
                          <span className="text-xs font-medium text-gray-700">{correlation.source2.title}</span>
                        </div>
                      </div>
                      <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 text-xs">
                        {Math.round(correlation.confidence * 100)}% match
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 pl-1">{correlation.reasoning}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Categories Section */}
          {showCategories && categories.length > 0 && (
            <div className="mb-4 space-y-3">
              {categories.map((category) => (
                <div key={category.type} className={`p-4 border rounded-lg ${getCategoryColor(category.type)}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {getCategoryIcon(category.type)}
                    <h4 className="text-sm font-bold">{category.label}</h4>
                    <Badge variant="outline" className="text-xs ml-auto">
                      {category.items.length} item{category.items.length > 1 ? 's' : ''}
                    </Badge>
                  </div>
                  <p className="text-xs mb-3">{category.summary}</p>
                  <div className="space-y-2">
                    {category.items.slice(0, 3).map((item) => (
                      <div key={item.id} className="flex items-center gap-2 text-xs bg-white/60 px-2 py-1.5 rounded">
                        {getToolIcon(item.source, 'w-3 h-3')}
                        {item.url ? (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 font-medium truncate text-blue-600 hover:text-blue-800 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {item.title}
                          </a>
                        ) : (
                          <span className="flex-1 font-medium truncate">{item.title}</span>
                        )}
                        {item.url && (
                          <Link2 className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        )}
                        {item.importance === 'high' && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">High</Badge>
                        )}
                      </div>
                    ))}
                    {category.items.length > 3 && (
                      <div className="text-xs text-gray-600 pl-2">
                        +{category.items.length - 3} more...
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Metadata Cards - Tools, Tech, Team */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {/* Tools Card */}
            <div
              className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => !isExpanded && setIsExpanded(true)}
            >
              <span className="text-xs text-gray-500 font-medium">Tools:</span>
              <div className="flex gap-1.5 flex-1 flex-wrap items-center">
                {Array.from(new Set((entry.activities || []).map(a => a.source))).slice(0, 3).map(source => (
                  <div key={source} className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full">
                    {getToolIcon(source, 'w-3.5 h-3.5')}
                    <span className="text-xs text-gray-700 capitalize">{source}</span>
                  </div>
                ))}
                {Array.from(new Set((entry.activities || []).map(a => a.source))).length > 3 && (
                  <div className="px-2 py-1 bg-gray-200 rounded-full text-xs text-gray-700 font-semibold">
                    +{Array.from(new Set((entry.activities || []).map(a => a.source))).length - 3}
                  </div>
                )}
              </div>
            </div>

            {/* Tech Card */}
            <div
              className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => !isExpanded && setIsExpanded(true)}
            >
              <span className="text-xs text-gray-500 font-medium">Tech:</span>
              <div className="flex gap-1.5 flex-1 flex-wrap">
                {(entry.summary?.technologies_used || []).slice(0, 2).map(tech => (
                  <Badge key={tech} className="bg-purple-50 text-purple-700 hover:bg-purple-50 text-xs rounded-full px-2 py-0.5">
                    {tech}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Team Card */}
            <div
              className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => !isExpanded && setIsExpanded(true)}
            >
              <span className="text-xs text-gray-500 font-medium">Team:</span>
              <div className="flex gap-2 flex-1 items-center">
                {(entry.summary?.unique_collaborators || []).slice(0, 2).map(collaborator => (
                  <div key={collaborator.id} className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded-md border border-gray-100">
                    <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                      {collaborator.avatar ? (
                        <img src={collaborator.avatar} alt={collaborator.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className={`w-full h-full flex items-center justify-center text-[9px] font-bold text-white bg-gradient-to-br ${collaborator.color}`}>
                          {collaborator.initials}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-medium text-gray-900 truncate max-w-[60px]">{collaborator.name.split(' ')[0]}</div>
                    </div>
                  </div>
                ))}
                {(entry.summary?.unique_collaborators?.length || 0) > 2 && (
                  <div className="px-2 py-1 bg-gray-200 rounded-full text-xs text-gray-700 font-semibold">
                    +{(entry.summary?.unique_collaborators?.length || 0) - 2}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Expanded Activities Section */}
          {isExpanded && (
            <>
              <div className="space-y-3 mb-4">
                {(entry.activities || []).map((activity) => {
                  const isActivityExpanded = expandedActivities.has(activity.id);

                  // Log activity technologies to console
                  console.log('[JournalEnhanced] Rendering activity:', {
                    id: activity.id,
                    action: activity.action,
                    hasTechnologies: !!activity.technologies,
                    technologiesType: typeof activity.technologies,
                    isArray: Array.isArray(activity.technologies),
                    technologiesLength: activity.technologies?.length || 0,
                    technologies: activity.technologies
                  });

                  return (
                    <div key={activity.id} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div
                        className="flex items-start gap-3 p-3 hover:bg-gray-50 cursor-pointer"
                        onClick={() => toggleActivity(activity.id)}
                      >
                        <div className="flex flex-col items-center gap-1 flex-shrink-0">
                          {getToolIcon(activity.source, 'w-5 h-5')}
                          <span className="text-[10px] text-gray-400">
                            {new Date(activity.timestamp).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            {activity.evidence?.url ? (
                              <a
                                href={activity.evidence.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {activity.action}
                              </a>
                            ) : (
                              <span className="text-sm font-semibold text-gray-900">{activity.action}</span>
                            )}
                            {activity.evidence?.url && (
                              <Link2 className="w-3.5 h-3.5 text-gray-400" />
                            )}
                            {activity.importance === 'high' && (
                              <Badge variant="destructive" className="text-xs">High</Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {(activity.technologies || []).slice(0, 3).map(tech => (
                              <Badge key={tech} variant="outline" className="text-xs px-1.5 py-0.5 font-normal text-gray-600">
                                {tech}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {isActivityExpanded ? (
                          <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        )}
                      </div>

                      {isActivityExpanded && (
                        <div className="px-3 pb-3 bg-gray-50 border-t border-gray-200">
                          <p className="text-sm text-gray-600">{activity.description}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Team Sections */}
              <div className="grid grid-cols-2 gap-5 mb-4">
                {/* Collaborators */}
                <div>
                  <h4 className="text-sm font-bold text-gray-700 mb-3">Collaborators</h4>
                  <div className="space-y-2">
                    {(entry.summary?.unique_collaborators || []).map(collaborator => (
                      <div key={collaborator.id} className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-100 rounded-md">
                        <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                          {collaborator.avatar ? (
                            <img src={collaborator.avatar} alt={collaborator.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className={`w-full h-full flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br ${collaborator.color}`}>
                              {collaborator.initials}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">{collaborator.name}</div>
                          <div className="text-xs text-gray-500 truncate">{collaborator.role}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Reviewers */}
                <div>
                  <h4 className="text-sm font-bold text-gray-700 mb-3">Reviewers</h4>
                  <div className="space-y-2">
                    {(entry.summary?.unique_reviewers || []).map(reviewer => (
                      <div key={reviewer.id} className="flex items-center gap-2 p-2 bg-green-50 border border-green-100 rounded-md">
                        <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                          {reviewer.avatar ? (
                            <img src={reviewer.avatar} alt={reviewer.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className={`w-full h-full flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br ${reviewer.color}`}>
                              {reviewer.initials}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">{reviewer.name}</div>
                          <div className="text-xs text-gray-500 truncate">{reviewer.role}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Show More/Less Link - hidden in preview mode */}
          {!isPreview && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
            >
              {isExpanded ? 'Show Less' : 'Show More'}
            </button>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-100 px-6 py-3 flex items-center justify-between">
          {/* Hide social actions in preview mode */}
          {!isPreview && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-600 hover:text-purple-600 transition-colors"
                onClick={onAppreciate}
              >
                <Heart className="w-4 h-4 mr-1" />
                <span className="text-xs">Appreciate</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-600 hover:text-purple-600 transition-colors"
                onClick={onDiscuss}
              >
                <MessageSquare className="w-4 h-4 mr-1" />
                <span className="text-xs">Discuss</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-600 hover:text-purple-600 transition-colors"
                onClick={onReChronicle}
              >
                <Repeat2 className="w-4 h-4 mr-1" />
                <span className="text-xs">ReChronicle</span>
              </Button>
            </div>
          )}

          {/* Workspace badge - only shown in non-preview mode */}
          {!isPreview && (
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-xs px-2 py-0.5">
                Workspace: {workspaceName || entry.entry_metadata?.workspace || 'Unknown'}
              </Badge>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JournalEnhanced;
