import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Calendar,
  Users,
  Building2,
  CheckCircle2,
  Globe,
  Shield,
  FileText,
  Code,
  Image,
  BarChart,
  MessageSquare,
  UserCheck,
  Briefcase,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Heart,
  DollarSign,
  Settings,
  Star,
  MoreVertical,
  Upload,
  Download,
  RepeatIcon,
  Trash2,
  Paperclip,
  Eye,
  Clock,
  TrendingUp,
  TrendingDown,
  Network,
  Layers,
  Sparkles,
  Lightbulb,
  Users2,
  TrendingUp as TrendingUpIcon,
  Trophy,
  Award,
  Target,
} from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { JournalEntry } from '../../types/journal';
import { CommentsSection } from './comments-section';
import { onboardingService } from '../../services/onboarding.service';
import { useContainedConfetti } from '../../hooks/useContainedConfetti';
import { useAuth } from '../../contexts/AuthContext';

interface JournalCardProps {
  journal: JournalEntry;
  viewMode?: 'workspace' | 'network';
  showPublishMenu?: boolean;
  onPublishToggle?: (journal: JournalEntry) => void;
  onDeleteEntry?: (journalId: string) => void;
  onAppreciate?: (journalId: string) => void;
  onReChronicle?: (journalId: string, comment?: string) => void | (() => void);
  onToggleAnalytics?: (journalId: string) => void;
  onTogglePublishMenu?: (journalId: string) => void;
  isAnalyticsOpen?: boolean;
  showMenuButton?: boolean;
  showAnalyticsButton?: boolean;
  showUserProfile?: boolean;
  customActions?: React.ReactNode;
  isRechronicleLoading?: boolean;
  currentUserAvatar?: string;
  hasMultipleVisibilities?: boolean;
  onToggleViewMode?: () => void;
}

export function JournalCard({
  journal,
  viewMode = 'workspace',
  showPublishMenu = false,
  onPublishToggle,
  onDeleteEntry,
  onAppreciate,
  onReChronicle,
  onToggleAnalytics,
  onTogglePublishMenu,
  isAnalyticsOpen = false,
  showMenuButton = true,
  showAnalyticsButton = true,
  showUserProfile = true,
  customActions,
  isRechronicleLoading = false,
  currentUserAvatar,
  hasMultipleVisibilities = false,
  onToggleViewMode,
}: JournalCardProps) {
  const { user: currentUser } = useAuth();
  const { triggerContainedConfetti } = useContainedConfetti();
  const cardRef = useRef<HTMLDivElement>(null);
  const isWorkspaceView = viewMode === 'workspace';
  const [showComments, setShowComments] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [onboardingProfileImage, setOnboardingProfileImage] = useState<string | null>(null);
  
  // Load profile image from onboarding data as fallback for current user
  useEffect(() => {
    const loadOnboardingProfileImage = async () => {
      try {
        const onboardingData = await onboardingService.getOnboardingData();
        if (onboardingData?.profileImageUrl) {
          setOnboardingProfileImage(onboardingData.profileImageUrl);
        }
      } catch (error) {
        console.error('Failed to load onboarding profile image:', error);
      }
    };

    // Only load onboarding image if:
    // 1. Journal author avatar is not available
    // 2. The journal author is the current user (by name comparison as a simple check)
    if (!journal.author.avatar && currentUser && journal.author.name === currentUser.name) {
      loadOnboardingProfileImage();
    }
  }, [journal.author.avatar, journal.author.name, currentUser]);

  // Get connection type info for network view
  const getConnectionTypeInfo = () => {
    if (viewMode === 'workspace') return null;
    
    const connectionType = journal.author.connectionType || 'none';
    
    switch (connectionType) {
      case 'core_connection':
        return {
          label: 'Core Network',
          icon: Layers,
          color: 'bg-blue-50 text-blue-700 border-blue-200',
          dotColor: 'bg-blue-500'
        };
      case 'extended_connection':
        return {
          label: 'Extended Network',
          icon: Network,
          color: 'bg-purple-50 text-purple-700 border-purple-200',
          dotColor: 'bg-purple-500'
        };
      case 'following':
        return {
          label: 'Following',
          icon: Eye,
          color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          dotColor: 'bg-indigo-500'
        };
      case 'none':
        return {
          label: 'Professional Discovery',
          icon: Sparkles,
          color: 'bg-amber-50 text-amber-700 border-amber-200',
          dotColor: 'bg-amber-500'
        };
      default:
        return {
          label: 'Professional Network',
          icon: Network,
          color: 'bg-gray-50 text-gray-700 border-gray-200',
          dotColor: 'bg-gray-500'
        };
    }
  };

  const connectionInfo = getConnectionTypeInfo();

  // Get reasoning info for Professional Discovery entries
  const getReasoningInfo = () => {
    if (viewMode === 'workspace' || (journal.author.connectionType || 'none') !== 'none') return null;
    
    // Use connection reason first, then fall back to recommendation reason
    let reasonText = journal.author.connectionReason || '';
    let reasonIcon = Lightbulb;
    
    if (!reasonText && journal.recommendationReason) {
      switch (journal.recommendationReason) {
        case 'skill_match':
          reasonText = `Strong skill match in ${journal.skills?.slice(0, 2).join(' and ') || 'relevant skills'}`;
          reasonIcon = Sparkles;
          break;
        case 'connection_appreciated':
          reasonText = 'Appreciated by professionals in your network';
          reasonIcon = Heart;
          break;
        case 'network_following':
          reasonText = 'Followed by professionals in your network';
          reasonIcon = Users2;
          break;
        case 'trending':
          reasonText = 'Trending content in your field';
          reasonIcon = TrendingUpIcon;
          break;
        default:
          reasonText = 'Recommended based on your professional interests';
          reasonIcon = Lightbulb;
      }
    }
    
    return reasonText ? { text: reasonText, icon: reasonIcon } : null;
  };

  const reasoningInfo = getReasoningInfo();

  // Get achievement info for achievement entries
  const getAchievementInfo = () => {
    if (!journal.achievementType || !journal.achievementTitle) return null;
    
    const achievementIcons = {
      'certification': Award,
      'award': Trophy,
      'milestone': Star,
      'recognition': Star
    };
    
    const AchievementIcon = achievementIcons[journal.achievementType] || Award;
    
    return {
      icon: AchievementIcon,
      title: journal.achievementTitle,
      description: journal.achievementDescription
    };
  };

  const achievementInfo = getAchievementInfo();

  // Handler for achievement hover confetti with throttling
  const [lastConfettiTime, setLastConfettiTime] = useState(0);
  const handleAchievementHover = () => {
    if (achievementInfo && cardRef.current) {
      const now = Date.now();
      // Throttle confetti to max once every 3 seconds
      if (now - lastConfettiTime > 3000) {
        triggerContainedConfetti(cardRef, {
          particleCount: 40,
          colors: ['#5D259F', '#8B5CF6', '#A78BFA', '#C4B5FD', '#DDD6FE']
        });
        setLastConfettiTime(now);
      }
    }
  };

  return (
    <div
      ref={cardRef}
      className={cn(
        "group relative rounded-lg border bg-white shadow-sm transition-shadow hover:shadow-md overflow-hidden",
        achievementInfo ? "border-purple-300" : "border-gray-200"
      )}
      onMouseEnter={handleAchievementHover}
    >

      {/* User Profile Outline (Both Views) */}
      {showUserProfile && (
        <div className="p-4 pb-0">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              <Link to={`/profile/${journal.author.id || journal.author.name.replace(/\s+/g, '').toLowerCase()}`} className="block">
                {journal.author.avatar || onboardingProfileImage ? (
                  <img
                    src={journal.author.avatar || onboardingProfileImage || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop'}
                    alt={journal.author.name}
                    className="h-12 w-12 rounded-full border-2 border-gray-200 hover:border-primary-300 transition-colors cursor-pointer"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full border-2 border-gray-200 hover:border-primary-300 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center transition-colors cursor-pointer">
                    <span className="text-white font-semibold text-lg">
                      {journal.author.name ? journal.author.name.charAt(0).toUpperCase() : 'U'}
                    </span>
                  </div>
                )}
              </Link>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                <Link 
                  to={`/profile/${journal.author.id || journal.author.name.replace(/\s+/g, '').toLowerCase()}`}
                  className="text-base font-semibold text-gray-900 hover:text-primary-600 truncate transition-colors"
                >
                  {journal.author.name || 'Unknown User'}
                </Link>
                {viewMode === 'network' && connectionInfo && (
                  <span className={cn(
                    "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border flex-shrink-0",
                    connectionInfo.color
                  )}>
                    <connectionInfo.icon className="h-3 w-3" />
                    {connectionInfo.label}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 truncate mb-1">
                {journal.author.title}
              </p>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                {journal.organizationName && (
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5" />
                    {isWorkspaceView ? journal.organizationName : 'Enterprise Client'}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {format(journal.createdAt, 'MMM d, yyyy')}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Reasoning Box for Professional Discovery */}
      {reasoningInfo && (
        <div className="px-4 pb-4">
          <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <reasoningInfo.icon className="h-4 w-4 text-amber-600 flex-shrink-0" />
              <p className="text-sm text-amber-800 font-medium">
                Why you're seeing this
              </p>
            </div>
            <p className="text-xs text-amber-700 mt-1 ml-6">
              {reasoningInfo.text}
            </p>
          </div>
        </div>
      )}
      
      
      {/* Header */}
      <div className={cn("px-6 pb-4", showUserProfile ? "pt-0" : "pt-6")}>
        {/* Title with date range - matching JournalEnhanced style */}
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex-1">
            {journal.title}
          </h3>
          <div className="flex items-center gap-2 text-xs text-gray-500 flex-shrink-0 ml-4">
            <Clock className="w-3.5 h-3.5" />
            <span>{format(journal.createdAt, 'MMM d, yyyy')}</span>
          </div>
        </div>

        {/* Achievement Box */}
        {achievementInfo && (
          <div className="mb-4">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <achievementInfo.icon className="h-6 w-6 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-purple-900 mb-1">
                    Achievement
                  </h4>
                  <p className="text-sm font-medium text-purple-800 mb-1">
                    {achievementInfo.title}
                  </p>
                  {achievementInfo.description && (
                    <p className="text-xs text-purple-700">
                      {achievementInfo.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Linked Goals Section */}
        {journal.linkedGoals && journal.linkedGoals.length > 0 && (
          <div className="mb-4 py-3 bg-primary-50 border-l-4 border-primary-500 -mx-6 px-6 rounded-r-lg">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-primary-600" />
              <span className="text-sm font-medium text-primary-900">Linked Goals</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {journal.linkedGoals.map((link, index) => (
                <div key={index} className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded-md border border-primary-200 text-xs">
                  <span className="font-medium text-primary-900">{link.goalTitle}</span>
                  <span className="text-primary-600">•</span>
                  <span className="text-primary-700">{link.contributionType}</span>
                  {link.progressContribution > 0 && (
                    <>
                      <span className="text-primary-600">•</span>
                      <span className="text-primary-700">+{link.progressContribution}%</span>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="mb-4">
          <p className="text-sm text-gray-600 line-clamp-3">
            {hasMultipleVisibilities && viewMode === 'network'
              ? journal.abstractContent
              : journal.description}
          </p>
        </div>

        {/* Tools/Tech/Team Cards - Matching JournalEnhanced style */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {/* Tools Card - from artifacts */}
          <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
            <span className="text-xs text-gray-500 font-medium">Tools:</span>
            <div className="flex gap-1.5 flex-1 flex-wrap items-center">
              {journal.artifacts && journal.artifacts.length > 0 ? (
                <>
                  {journal.artifacts.slice(0, 3).map((artifact) => (
                    <div key={artifact.id} className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full">
                      <Paperclip className="w-3.5 h-3.5 text-gray-600" />
                      <span className="text-xs text-gray-700 truncate max-w-[60px]">{artifact.name}</span>
                    </div>
                  ))}
                  {journal.artifacts.length > 3 && (
                    <div className="px-2 py-1 bg-gray-200 rounded-full text-xs text-gray-700 font-semibold">
                      +{journal.artifacts.length - 3}
                    </div>
                  )}
                </>
              ) : (
                <span className="text-xs text-gray-400">None</span>
              )}
            </div>
          </div>

          {/* Tech Card - from skills */}
          <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
            <span className="text-xs text-gray-500 font-medium">Tech:</span>
            <div className="flex gap-1.5 flex-1 flex-wrap">
              {journal.skills && journal.skills.length > 0 ? (
                <>
                  {journal.skills.slice(0, 2).map((skill) => (
                    <span key={skill} className="bg-purple-50 text-purple-700 text-xs rounded-full px-2 py-0.5">
                      {skill}
                    </span>
                  ))}
                  {journal.skills.length > 2 && (
                    <span className="px-2 py-0.5 bg-gray-200 rounded-full text-xs text-gray-700 font-semibold">
                      +{journal.skills.length - 2}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-xs text-gray-400">None</span>
              )}
            </div>
          </div>

          {/* Team Card - from collaborators */}
          <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
            <span className="text-xs text-gray-500 font-medium">Team:</span>
            <div className="flex gap-2 flex-1 items-center">
              {journal.collaborators && journal.collaborators.length > 0 ? (
                <>
                  {journal.collaborators.slice(0, 2).map((collaborator) => (
                    <div key={collaborator.id} className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded-md border border-gray-100">
                      <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                        {collaborator.avatar ? (
                          <img src={collaborator.avatar} alt={collaborator.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[9px] font-bold text-white bg-gradient-to-br from-blue-400 to-blue-600">
                            {collaborator.name ? collaborator.name.charAt(0).toUpperCase() : 'C'}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] font-medium text-gray-900 truncate max-w-[60px]">
                        {collaborator.name?.split(' ')[0] || 'Unknown'}
                      </span>
                    </div>
                  ))}
                  {journal.collaborators.length > 2 && (
                    <div className="px-2 py-1 bg-gray-200 rounded-full text-xs text-gray-700 font-semibold">
                      +{journal.collaborators.length - 2}
                    </div>
                  )}
                </>
              ) : (
                <span className="text-xs text-gray-400">None</span>
              )}
            </div>
          </div>
        </div>

        {/* Expanded Section - Collaborators, Reviewers, Artifacts, Outcomes */}
        {isExpanded && (
          <>
        {/* Collaborators & Reviewers - Visible in both workspace and network views */}
        {((journal.collaborators && journal.collaborators.length > 0) || (journal.reviewers && journal.reviewers.length > 0)) && (
          <div className="mb-4 space-y-4">
            {journal.collaborators && journal.collaborators.length > 0 && (
              <div>
                <span className="text-xs font-medium text-gray-700 flex items-center gap-1 mb-3">
                  <Users className="h-3.5 w-3.5" />
                  Collaborators ({journal.collaborators?.length || 0})
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {journal.collaborators?.map((collaborator) => (
                    <div 
                      key={collaborator.id} 
                      className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100 transition-colors group"
                    >
                      <div className="relative">
                        <Link to={`/profile/${collaborator.id}`} className="block">
                          {collaborator.avatar ? (
                            <img
                              src={collaborator.avatar}
                              alt={collaborator.name}
                              className="h-10 w-10 rounded-full border-2 border-white shadow-sm hover:border-blue-300 transition-colors cursor-pointer"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full border-2 border-white hover:border-blue-300 shadow-sm bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center transition-colors cursor-pointer">
                              <span className="text-white font-medium text-sm">
                                {collaborator.name ? collaborator.name.charAt(0).toUpperCase() : 'C'}
                              </span>
                            </div>
                          )}
                        </Link>
                        <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center">
                          <Users className="h-2 w-2 text-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link 
                          to={`/profile/${collaborator.id}`}
                          className="text-sm font-medium text-gray-900 hover:text-blue-600 truncate transition-colors"
                        >
                          {collaborator.name || 'Unknown Collaborator'}
                        </Link>
                        <p className="text-xs text-blue-700 truncate">
                          {collaborator.role}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {journal.reviewers && journal.reviewers.length > 0 && (
              <div>
                <span className="text-xs font-medium text-gray-700 flex items-center gap-1 mb-3">
                  <UserCheck className="h-3.5 w-3.5" />
                  Reviewers ({journal.reviewers?.length || 0})
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {journal.reviewers?.map((reviewer) => (
                    <div 
                      key={reviewer.id} 
                      className="flex items-center gap-3 p-3 bg-green-50 border border-green-100 rounded-lg hover:bg-green-100 transition-colors group"
                    >
                      <div className="relative">
                        <Link to={`/profile/${reviewer.id}`} className="block">
                          {reviewer.avatar ? (
                            <img
                              src={reviewer.avatar}
                              alt={reviewer.name}
                              className="h-10 w-10 rounded-full border-2 border-white shadow-sm hover:border-green-300 transition-colors cursor-pointer"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full border-2 border-white hover:border-green-300 shadow-sm bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center transition-colors cursor-pointer">
                              <span className="text-white font-medium text-sm">
                                {reviewer.name ? reviewer.name.charAt(0).toUpperCase() : 'R'}
                              </span>
                            </div>
                          )}
                        </Link>
                        <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                          <UserCheck className="h-2 w-2 text-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link 
                          to={`/profile/${reviewer.id}`}
                          className="text-sm font-medium text-gray-900 hover:text-green-600 truncate transition-colors"
                        >
                          {reviewer.name || 'Unknown Reviewer'}
                        </Link>
                        <p className="text-xs text-green-700 truncate">
                          {reviewer.department}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Artifacts - Only in workspace view */}
        {isWorkspaceView && journal.artifacts && journal.artifacts.length > 0 && (
          <div className="mb-4">
            <span className="text-xs font-medium text-gray-700 flex items-center gap-1 mb-2">
              <Paperclip className="h-3.5 w-3.5" />
              Artifacts ({journal.artifacts?.length || 0})
            </span>
            <div className="flex flex-wrap gap-2">
              {journal.artifacts?.map((artifact) => {
                const Icon = artifact.type === 'document' ? FileText :
                             artifact.type === 'code' ? Code :
                             artifact.type === 'design' ? Image :
                             artifact.type === 'data' ? BarChart : FileText;
                
                return (
                  <a
                    key={artifact.id}
                    href={artifact.url}
                    className={cn(
                      "flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors",
                      artifact.isConfidential 
                        ? "bg-red-50 text-red-700 hover:bg-red-100" 
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {artifact.name}
                    {artifact.isConfidential && <Shield className="h-3 w-3" />}
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* Outcomes & Results */}
        {journal.outcomes && journal.outcomes.length > 0 && (
          <div className="mb-4">
            <span className="text-xs font-medium text-gray-700 flex items-center gap-1 mb-3">
              <Star className="h-3.5 w-3.5" />
              Outcomes & Results
            </span>
            <div className="space-y-3">
              {journal.outcomes?.map((outcome, index) => {
                const categoryIcons = {
                  'performance': Zap,
                  'user-experience': Heart,
                  'business': DollarSign,
                  'technical': Settings,
                  'team': Users
                };
                
                const categoryColors = {
                  'performance': 'bg-yellow-50 text-yellow-700 border-yellow-200',
                  'user-experience': 'bg-red-50 text-red-700 border-red-200',
                  'business': 'bg-green-50 text-green-700 border-green-200',
                  'technical': 'bg-blue-50 text-blue-700 border-blue-200',
                  'team': 'bg-purple-50 text-purple-700 border-purple-200'
                };
                
                const CategoryIcon = categoryIcons[outcome.category];
                
                return (
                  <div key={index} className={cn(
                    "p-3 rounded-lg border",
                    categoryColors[outcome.category]
                  )}>
                    <div className="flex items-start gap-2">
                      <CategoryIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium mb-1">{outcome.title}</h4>
                        <p className="text-xs opacity-90 mb-2">{outcome.description}</p>
                        
                        {outcome.metrics && (
                          <div className="flex items-center gap-4 text-xs">
                            <div className="flex items-center gap-1">
                              <span className="opacity-75">Before:</span>
                              <span className="font-medium">{outcome.metrics.before}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {outcome.metrics.trend === 'up' ? (
                                <ArrowUpRight className="h-3 w-3" />
                              ) : outcome.metrics.trend === 'down' ? (
                                <ArrowDownRight className="h-3 w-3" />
                              ) : null}
                              <span className="font-medium">{outcome.metrics.after}</span>
                            </div>
                            <div className="flex items-center gap-1 px-2 py-0.5 bg-white/50 rounded-full">
                              <span className="font-semibold">{outcome.metrics.improvement}</span>
                            </div>
                          </div>
                        )}
                        
                        {outcome.highlight && !outcome.metrics && (
                          <div className="inline-flex items-center gap-1 px-2 py-1 bg-white/50 rounded-full text-xs font-medium">
                            <Star className="h-3 w-3" />
                            {outcome.highlight}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
          </>
        )}

        {/* Show More/Less Toggle - Matching JournalEnhanced style */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
        >
          {isExpanded ? 'Show Less' : 'Show More'}
        </button>
      </div>

      {/* Footer */}
      <div className="border-t px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-gray-500">
            {/* Appreciate */}
            <button
              className={cn(
                "flex items-center gap-1 transition-colors",
                journal.hasAppreciated ? "text-purple-600" : "hover:text-purple-600"
              )}
              onClick={() => onAppreciate?.(journal.id)}
              title={journal.hasAppreciated ? "Remove Appreciate" : "Appreciate"}
            >
              <Heart className="h-3.5 w-3.5" />
              {journal.appreciates}
              <span className="ml-1">Appreciate</span>
            </button>
            {/* Discuss (Comments) */}
            <button
              className={cn(
                "flex items-center gap-1 hover:text-purple-600 transition-colors",
                showComments && "text-purple-600"
              )}
              onClick={() => setShowComments(!showComments)}
              title="Discuss"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              {journal.comments || 0}
              <span className="ml-1">Discuss</span>
            </button>
            {/* ReChronicle (Repost) */}
            <button
              className={cn(
                "flex items-center gap-1 hover:text-purple-600 transition-colors",
                journal.hasReChronicled && "text-purple-600"
              )}
              onClick={() => onReChronicle?.(journal.id)}
              disabled={journal.hasReChronicled || isRechronicleLoading}
              title={journal.hasReChronicled ? "ReChronicled" : "ReChronicle"}
            >
              <RepeatIcon className="h-3.5 w-3.5" />
              {journal.rechronicles}
              <span className="ml-1">ReChronicle</span>
            </button>

            {/* Publish Button - shown for entries not yet shared to network, owned by current user */}
            {journal.visibility !== 'network' && currentUser && journal.author.id === currentUser.id && onPublishToggle && (
              <button
                className="flex items-center gap-1.5 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-full transition-colors"
                onClick={() => onPublishToggle(journal)}
                title="Publish this entry"
              >
                <Upload className="h-3.5 w-3.5" />
                Publish
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Workspace Badge - matching JournalEnhanced style */}
            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
              <Briefcase className="h-3 w-3" />
              {journal.workspaceName}
            </span>

            {/* Publication Status - based on visibility */}
            {journal.visibility === 'network' ? (
              <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">
                Published
              </span>
            ) : (
              <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                <FileText className="h-3 w-3" />
                Draft
              </span>
            )}

            {/* View Toggle for entries with multiple visibilities */}
            {hasMultipleVisibilities && onToggleViewMode && (
              <button
                onClick={onToggleViewMode}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 bg-white border border-gray-200 hover:border-gray-300 px-2 py-0.5 rounded-full font-medium transition-all duration-200"
                title={`Switch to ${viewMode === 'workspace' ? 'network' : 'workspace'} view`}
              >
                <Eye className="h-3 w-3" />
                {viewMode === 'workspace' ? 'Workspace' : 'Network'}
              </button>
            )}

            {/* Menu Button */}
            {showMenuButton && (
              <div className="relative" data-publish-menu>
                <button
                  className="p-1 rounded-full hover:bg-gray-100 transition-all duration-200"
                  title="More options"
                  onClick={() => onTogglePublishMenu?.(journal.id)}
                >
                  <MoreVertical className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600" />
                </button>

                {showPublishMenu && (
                  <div className="absolute right-0 bottom-8 z-10 w-48 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 border border-gray-200 animate-in fade-in-0 zoom-in-95 duration-100">
                    <div className="py-1">
                      <button
                        onClick={() => onPublishToggle?.(journal)}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        {journal.visibility === 'network' ? (
                          <>
                            <Download className="h-4 w-4 text-gray-500" />
                            Unpublish Entry
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 text-gray-500" />
                            Publish Entry
                          </>
                        )}
                      </button>
                      {showAnalyticsButton && (
                        <button
                          onClick={() => onToggleAnalytics?.(journal.id)}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <BarChart className="h-4 w-4 text-gray-500" />
                          View Analytics
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteEntry?.(journal.id);
                        }}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete Entry
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {customActions}
          </div>
        </div>
        {/* Analytics Section */}
        {isAnalyticsOpen && (
          <div className="mt-3 border-t pt-3">
            <div className="bg-gray-50/50 rounded-md px-4 py-2">
              <div className="flex items-center justify-between gap-6">
                {/* View Count */}
                <div className="flex items-center gap-2">
                  <Eye className="h-3.5 w-3.5 text-blue-600" />
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm font-medium text-gray-900">
                      {journal.analytics.viewCount.toLocaleString()}
                    </span>
                    <span className="text-xs text-gray-500">views</span>
                  </div>
                </div>
                
                {/* Average Read Time */}
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-green-600" />
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm font-medium text-gray-900">
                      {Math.floor(journal.analytics.averageReadTime / 60)}m {journal.analytics.averageReadTime % 60}s
                    </span>
                    <span className="text-xs text-gray-500">average read time</span>
                  </div>
                </div>
                
                {/* Engagement Trend */}
                <div className="flex items-center gap-2">
                  {journal.analytics.engagementTrend === 'up' ? (
                    <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                  ) : journal.analytics.engagementTrend === 'down' ? (
                    <TrendingDown className="h-3.5 w-3.5 text-red-600" />
                  ) : (
                    <BarChart className="h-3.5 w-3.5 text-gray-600" />
                  )}
                  <div className="flex items-baseline gap-1">
                    <span className={cn(
                      "text-sm font-medium",
                      journal.analytics.engagementTrend === 'up' && "text-green-600",
                      journal.analytics.engagementTrend === 'down' && "text-red-600",
                      journal.analytics.engagementTrend === 'stable' && "text-gray-600"
                    )}>
                      {journal.analytics.engagementTrend === 'stable' ? 'Stable' : `${journal.analytics.trendPercentage > 0 ? '+' : ''}${journal.analytics.trendPercentage}%`}
                    </span>
                    <span className="text-xs text-gray-500">trend</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Comments Section */}
        <CommentsSection 
          entryId={journal.id}
          isOpen={showComments}
          onClose={() => setShowComments(false)}
          currentUserAvatar={currentUserAvatar}
        />
      </div>
      
    </div>
  );
}