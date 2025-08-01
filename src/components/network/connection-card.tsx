import React from 'react';
import { Link } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  Building2, 
  Users, 
  Eye, 
  Heart, 
  MessageSquare, 
  UserCheck, 
  Briefcase,
  Star,
  Globe,
  Shield,
  CheckSquare,
  Square,
  GripVertical,
  Clock,
  Zap,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

interface Connection {
  id: string;
  name: string;
  avatar: string;
  position: string;
  department: string;
  organization: string;
  connectionType: 'core' | 'extended';
  context: 'workspace-collaborator' | 'followed-professional' | 'industry-contact' | 'former-colleague';
  mutualConnections: number;
  sharedWorkspaces: string[];
  latestJournal?: {
    title: string;
    abstract: string;
    createdAt: Date;
    skills: string[];
  };
  skills: string[];
  isOnline?: boolean;
  lastActive?: Date;
  // Enhanced network management properties
  connectedAt: Date;
  lastInteraction?: Date;
  interactionCount: number;
  collaborationScore: number;
  appreciatedByCore: number;
  networkHealth: 'strong' | 'moderate' | 'weak';
  suggestedPromotionReason?: string;
}

interface ConnectionCardProps {
  connection: Connection;
  viewMode: 'grid' | 'list';
  isManagementMode?: boolean;
  isSelected?: boolean;
  onSelect?: (isSelected: boolean) => void;
  onConnect?: () => void;
  onMessage?: () => void;
  onViewProfile?: () => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
}

const contextLabels = {
  'workspace-collaborator': 'Workspace Collaborator',
  'followed-professional': 'Following',
  'industry-contact': 'Industry Contact',
  'former-colleague': 'Former Colleague'
};

const contextIcons = {
  'workspace-collaborator': Building2,
  'followed-professional': Heart,
  'industry-contact': Globe,
  'former-colleague': Briefcase
};

const contextColors = {
  'workspace-collaborator': 'bg-blue-100 text-blue-700 border-blue-200',
  'followed-professional': 'bg-pink-100 text-pink-700 border-pink-200',
  'industry-contact': 'bg-purple-100 text-purple-700 border-purple-200',
  'former-colleague': 'bg-green-100 text-green-700 border-green-200'
};

export function ConnectionCard({ 
  connection, 
  viewMode, 
  isManagementMode = false,
  isSelected = false,
  onSelect,
  onConnect, 
  onMessage, 
  onViewProfile,
  onDragStart,
  onDragEnd,
  isDragging = false
}: ConnectionCardProps) {
  const ContextIcon = contextIcons[connection.context];
  
  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect?.(!isSelected);
  };
  
  const getNetworkHealthColor = (health: string) => {
    switch (health) {
      case 'strong': return 'text-green-600';
      case 'moderate': return 'text-yellow-600';
      case 'weak': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };
  
  const getNetworkHealthIcon = (health: string) => {
    switch (health) {
      case 'strong': return TrendingUp;
      case 'moderate': return Clock;
      case 'weak': return AlertCircle;
      default: return Clock;
    }
  };
  
  const HealthIcon = getNetworkHealthIcon(connection.networkHealth);
  
  if (viewMode === 'list') {
    return (
      <div 
        className={cn(
          "bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all",
          isDragging && "opacity-50 rotate-1",
          isSelected && "ring-2 ring-primary-500 border-primary-300"
        )}
        draggable={isManagementMode}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="flex items-start space-x-4">
          {/* Selection checkbox and drag handle */}
          {isManagementMode && (
            <div className="flex flex-col items-center space-y-2 pt-1">
              <button
                onClick={handleCheckboxClick}
                className="text-gray-400 hover:text-gray-600"
              >
                {isSelected ? (
                  <CheckSquare className="h-4 w-4 text-primary-600" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
              </button>
              <GripVertical className="h-4 w-4 text-gray-300 cursor-move" />
            </div>
          )}
          {/* Avatar and online status */}
          <div className="relative flex-shrink-0">
            <Link to={`/profile/${connection.id}`}>
              <img
                src={connection.avatar}
                alt={connection.name}
                className="h-12 w-12 rounded-full object-cover hover:ring-2 hover:ring-primary-300 transition-all cursor-pointer"
              />
            </Link>
            {connection.isOnline && (
              <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 border-2 border-white rounded-full"></div>
            )}
          </div>
          
          {/* Main content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <Link to={`/profile/${connection.id}`} className="text-sm font-semibold text-gray-900 hover:text-primary-600 truncate transition-colors">
                    {connection.name}
                  </Link>
                  <div className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
                    contextColors[connection.context]
                  )}>
                    <ContextIcon className="h-3 w-3 mr-1" />
                    {contextLabels[connection.context]}
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mb-1">
                  {connection.position} at {connection.organization}
                </p>
                
                <div className="flex items-center space-x-4 text-xs text-gray-500 mb-2">
                  {connection.mutualConnections > 0 && (
                    <span className="flex items-center">
                      <Users className="h-3 w-3 mr-1" />
                      {connection.mutualConnections} mutual
                    </span>
                  )}
                  {connection.sharedWorkspaces.length > 0 && (
                    <span className="flex items-center">
                      <Building2 className="h-3 w-3 mr-1" />
                      {connection.sharedWorkspaces.length} shared workspace{connection.sharedWorkspaces.length > 1 ? 's' : ''}
                    </span>
                  )}
                  <span className={cn("flex items-center", getNetworkHealthColor(connection.networkHealth))}>
                    <HealthIcon className="h-3 w-3 mr-1" />
                    {connection.collaborationScore}/100
                  </span>
                </div>
                
                {/* Enhanced connection insights */}
                {isManagementMode && (
                  <div className="bg-gray-50 rounded-md p-2 mb-2 text-xs">
                    <div className="grid grid-cols-2 gap-2 text-gray-600">
                      <span>Connected: {connection.connectedAt ? formatDistanceToNow(new Date(connection.connectedAt), { addSuffix: true }) : 'Unknown'}</span>
                      <span>Interactions: {connection.interactionCount || 0}</span>
                      {connection.lastInteraction && (
                        <span>Last: {formatDistanceToNow(new Date(connection.lastInteraction), { addSuffix: true })}</span>
                      )}
                      <span>Core appreciation: {connection.appreciatedByCore}</span>
                    </div>
                    {connection.suggestedPromotionReason && (
                      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-blue-800">
                        <Zap className="h-3 w-3 inline mr-1" />
                        {connection.suggestedPromotionReason}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Latest journal preview */}
                {connection.latestJournal && (
                  <div className="bg-gray-50 rounded-md p-3 mb-2">
                    <h4 className="text-xs font-medium text-gray-800 mb-1">
                      Latest: {connection.latestJournal.title}
                    </h4>
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {connection.latestJournal.abstract}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex flex-wrap gap-1">
                        {connection.latestJournal.skills.slice(0, 2).map((skill) => (
                          <span key={skill} className="inline-block bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded">
                            {skill}
                          </span>
                        ))}
                        {connection.latestJournal.skills.length > 2 && (
                          <span className="text-xs text-gray-500">
                            +{connection.latestJournal.skills.length - 2} more
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">
                        {connection.latestJournal.createdAt ? format(new Date(connection.latestJournal.createdAt), 'MMM d') : 'N/A'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Actions */}
              <div className="flex items-center space-x-2 ml-4">
                <Button variant="outline" size="sm" onClick={onMessage}>
                  <MessageSquare className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={onViewProfile}>
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Grid view
  return (
    <div 
      className={cn(
        "bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all",
        isDragging && "opacity-50 rotate-1",
        isSelected && "ring-2 ring-primary-500 border-primary-300"
      )}
      draggable={isManagementMode}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start space-x-2">
          {/* Selection checkbox and drag handle */}
          {isManagementMode && (
            <div className="flex flex-col items-center space-y-1 pt-1">
              <button
                onClick={handleCheckboxClick}
                className="text-gray-400 hover:text-gray-600"
              >
                {isSelected ? (
                  <CheckSquare className="h-3 w-3 text-primary-600" />
                ) : (
                  <Square className="h-3 w-3" />
                )}
              </button>
              <GripVertical className="h-3 w-3 text-gray-300 cursor-move" />
            </div>
          )}
          <div className="relative">
            <Link to={`/profile/${connection.id}`}>
              <img
                src={connection.avatar}
                alt={connection.name}
                className="h-10 w-10 rounded-full object-cover hover:ring-2 hover:ring-primary-300 transition-all cursor-pointer"
              />
            </Link>
            {connection.isOnline && (
              <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 border-2 border-white rounded-full"></div>
            )}
          </div>
        </div>
        
        <div className={cn(
          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
          contextColors[connection.context]
        )}>
          <ContextIcon className="h-3 w-3 mr-1" />
          {contextLabels[connection.context]}
        </div>
      </div>
      
      {/* Name and position */}
      <div className="mb-3">
        <Link to={`/profile/${connection.id}`} className="text-sm font-semibold text-gray-900 hover:text-primary-600 truncate mb-1 block transition-colors">
          {connection.name}
        </Link>
        <p className="text-sm text-gray-600 line-clamp-2">
          {connection.position}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {connection.organization}
        </p>
      </div>
      
      {/* Connection stats */}
      <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
        <div className="flex items-center space-x-2">
          {connection.mutualConnections > 0 && (
            <span className="flex items-center">
              <Users className="h-3 w-3 mr-1" />
              {connection.mutualConnections}
            </span>
          )}
          {connection.sharedWorkspaces.length > 0 && (
            <span className="flex items-center">
              <Building2 className="h-3 w-3 mr-1" />
              {connection.sharedWorkspaces.length}
            </span>
          )}
        </div>
        <span className={cn("flex items-center", getNetworkHealthColor(connection.networkHealth))}>
          <HealthIcon className="h-3 w-3 mr-1" />
          {connection.collaborationScore}
        </span>
      </div>
      
      {/* Enhanced connection insights */}
      {isManagementMode && (
        <div className="bg-gray-50 rounded-md p-2 mb-3 text-xs text-gray-600">
          <div className="space-y-1">
            <div>Connected {connection.connectedAt ? formatDistanceToNow(new Date(connection.connectedAt), { addSuffix: true }) : 'Unknown'}</div>
            <div>{connection.interactionCount || 0} interactions</div>
            {connection.lastInteraction && (
              <div>Last active {formatDistanceToNow(new Date(connection.lastInteraction), { addSuffix: true })}</div>
            )}
            {connection.appreciatedByCore > 0 && (
              <div className="text-blue-600">{connection.appreciatedByCore} core appreciations</div>
            )}
          </div>
          {connection.suggestedPromotionReason && (
            <div className="mt-2 p-1.5 bg-blue-50 border border-blue-200 rounded text-blue-800 text-xs">
              <Zap className="h-3 w-3 inline mr-1" />
              Promotion suggested
            </div>
          )}
        </div>
      )}
      
      {/* Latest journal preview */}
      {connection.latestJournal && (
        <div className="bg-gray-50 rounded-md p-2 mb-3">
          <h4 className="text-xs font-medium text-gray-800 mb-1 line-clamp-1">
            {connection.latestJournal.title}
          </h4>
          <p className="text-xs text-gray-600 line-clamp-2 mb-2">
            {connection.latestJournal.abstract}
          </p>
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-1">
              {connection.latestJournal.skills.slice(0, 1).map((skill) => (
                <span key={skill} className="inline-block bg-gray-200 text-gray-700 text-xs px-1.5 py-0.5 rounded">
                  {skill}
                </span>
              ))}
              {connection.latestJournal.skills.length > 1 && (
                <span className="text-xs text-gray-500">
                  +{connection.latestJournal.skills.length - 1}
                </span>
              )}
            </div>
            <span className="text-xs text-gray-400">
              {connection.latestJournal.createdAt ? format(new Date(connection.latestJournal.createdAt), 'MMM d') : 'N/A'}
            </span>
          </div>
        </div>
      )}
      
      {/* Actions */}
      <div className="flex items-center space-x-2">
        {!isManagementMode ? (
          <>
            <Button variant="outline" size="sm" className="flex-1" onClick={onMessage}>
              <MessageSquare className="h-4 w-4 mr-1" />
              Message
            </Button>
            <Button variant="outline" size="sm" onClick={onViewProfile}>
              <Eye className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <div className="w-full text-center text-xs text-gray-500">
            Management Mode - Select for bulk actions
          </div>
        )}
      </div>
    </div>
  );
}

export default ConnectionCard;