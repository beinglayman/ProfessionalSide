import React, { useState } from 'react';
import { format } from 'date-fns';
import { 
  Users, CheckCircle2, FileText, Image, Code, FileJson, Eye, Lock, Globe, Star, Trophy, Award, Badge,
  Calendar, Building2, Briefcase, UserCheck, Paperclip, BarChart, ExternalLink, ThumbsUp, MessageSquare,
  RepeatIcon, ArrowUpRight, ArrowDownRight, Zap, Heart, DollarSign, Settings, Shield, MoreVertical
} from 'lucide-react';
import { ArtifactPreview } from './artifact-preview';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

interface Collaborator {
  id: string;
  name: string;
  avatar: string;
  role: string;
}

interface Reviewer {
  id: string;
  name: string;
  avatar: string;
  department: string;
}

interface Artifact {
  id: string;
  name: string;
  type: 'document' | 'code' | 'design' | 'data' | 'presentation';
  url: string;
  size?: string;
  isConfidential?: boolean;
}

interface Discussion {
  id: string;
  author: {
    name: string;
    avatar: string;
  };
  content: string;
  createdAt: Date;
}

interface JournalEntryProps {
  entry: {
    id: string;
    title: string;
    workspaceId: string;
    workspaceName: string;
    organizationName: string | null;
    description: string;
    fullContent: string;
    abstractContent: string;
    createdAt: Date;
    lastModified: Date;
    author: {
      name: string;
      avatar: string;
      position: string;
    };
    collaborators: Collaborator[];
    reviewers: Reviewer[];
    artifacts: Artifact[];
    skills: string[];
    outcomes: {
      category: 'performance' | 'user-experience' | 'business' | 'technical' | 'team';
      title: string;
      description: string;
      metrics?: {
        before: string;
        after: string;
        improvement: string;
        trend: 'up' | 'down' | 'stable';
      };
      highlight?: string;
    }[];
    visibility: 'private' | 'workspace' | 'network';
    isPublished: boolean;
    publishedAt?: Date;
    likes: number;
    comments: number;
    hasLiked?: boolean;
    tags: string[];
    category: string;
    appreciates: number;
    hasAppreciated?: boolean;
    discussCount: number;
    discussions: Discussion[];
    rechronicles: number;
    hasReChronicled?: boolean;
  };
  viewMode?: 'workspace' | 'network';
}

export function JournalEntry({ entry, viewMode = 'workspace' }: JournalEntryProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [currentArtifactIndex, setCurrentArtifactIndex] = useState(0);
  const [isDiscussOpen, setIsDiscussOpen] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  
  const isWorkspaceView = viewMode === 'workspace';
  const isGlobal = entry.visibility === 'network';
  const isOrganization = entry.visibility === 'workspace';
  
  // Add error boundary protection
  if (!entry || !entry.id) {
    return <div className="p-4 text-red-500">Error: Invalid journal entry data</div>;
  }
  
  const getCategoryIcon = (category: string) => {
    const categoryIcons = {
      'performance': Zap,
      'user-experience': Heart,
      'business': DollarSign,
      'technical': Settings,
      'team': Users
    };
    return categoryIcons[category] || Star;
  };

  const getCategoryColors = (category: string) => {
    const categoryColors = {
      'performance': 'bg-yellow-50 text-yellow-700 border-yellow-200',
      'user-experience': 'bg-pink-50 text-pink-700 border-pink-200',
      'business': 'bg-green-50 text-green-700 border-green-200',
      'technical': 'bg-blue-50 text-blue-700 border-blue-200',
      'team': 'bg-purple-50 text-purple-700 border-purple-200'
    };
    return categoryColors[category] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <Image className="h-5 w-5" />;
      case 'code':
        return <Code className="h-5 w-5" />;
      case 'json':
        return <FileJson className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const getFileTypeLabel = (type: string) => {
    switch (type) {
      case 'image':
        return 'Image';
      case 'code':
        return 'Code';
      case 'pdf':
        return 'PDF';
      case 'html':
        return 'HTML';
      case 'json':
        return 'JSON';
      default:
        return 'File';
    }
  };

  return (
    <div className="group relative rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Header */}
      <div className="p-6 pb-0">
        <div className="flex items-start justify-between mb-4 group/header">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {entry.title}
            </h3>
            {entry.organizationName && (
              <div className="flex items-center gap-1 text-sm text-gray-700 mb-1">
                <Building2 className="h-3.5 w-3.5" />
                {isWorkspaceView ? entry.organizationName : 'Enterprise Client'}
              </div>
            )}
            <div className="flex items-center gap-4 text-sm text-gray-600 mb-1">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {format(entry.createdAt, 'MMM d, yyyy')}
              </span>
            </div>
          </div>
          
          {/* Visibility indicator */}
          <div className="flex flex-col items-end gap-2 min-w-fit">
            <div className="flex items-center gap-2 mb-1">
              {/* Published/Unpublished tag */}
              {entry.isPublished ? (
                <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                  <Globe className="h-3 w-3" />
                  Published
                </div>
              ) : (
                <div className="flex items-center gap-1 text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                  <Lock className="h-3 w-3" />
                  Workspace Only
                </div>
              )}
              {/* Workspace tag */}
              <span className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                <Briefcase className="h-3 w-3" />
                {entry.workspaceName}
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="mb-4">
          <p className="text-sm text-gray-600 line-clamp-3">
            {isWorkspaceView ? entry.fullContent : entry.abstractContent}
          </p>
        </div>

        {/* Skills */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {entry.skills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>

        {/* Collaborators */}
        {entry.collaborators && entry.collaborators.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
              <Users className="h-4 w-4" />
              <span className="font-medium">Collaborators:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {entry.collaborators.map((collaborator) => (
                <div key={collaborator.id} className="flex items-center space-x-2 bg-gray-100 rounded-full px-3 py-1">
                  <img src={collaborator.avatar} alt={collaborator.name} className="h-5 w-5 rounded-full" />
                  <span className="text-sm text-gray-700">{collaborator.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reviewers */}
        {entry.reviewers && entry.reviewers.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
              <UserCheck className="h-4 w-4" />
              <span className="font-medium">Reviewers:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {entry.reviewers.map((reviewer) => (
                <div key={reviewer.id} className="flex items-center space-x-2 bg-gray-100 rounded-full px-3 py-1">
                  <img src={reviewer.avatar} alt={reviewer.name} className="h-5 w-5 rounded-full" />
                  <span className="text-sm text-gray-700">{reviewer.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Outcomes & Results */}
        {entry.outcomes && entry.outcomes.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Outcomes & Results</h4>
            <div className="space-y-3">
              {entry.outcomes.map((outcome, index) => {
                const CategoryIcon = getCategoryIcon(outcome.category);
                return (
                  <div key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className={cn('p-1 rounded-full', getCategoryColors(outcome.category))}>
                        <CategoryIcon className="h-3 w-3" />
                      </div>
                      <span className="font-medium text-sm">{outcome.title}</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{outcome.description}</p>
                    {outcome.metrics && (
                      <div className="flex items-center space-x-4 text-xs">
                        <span>Before: {outcome.metrics.before}</span>
                        <span>→</span>
                        <span>After: {outcome.metrics.after}</span>
                        <span className="font-medium text-green-600">{outcome.metrics.improvement}</span>
                      </div>
                    )}
                    {outcome.highlight && (
                      <div className="mt-2 text-xs text-blue-600 font-medium">{outcome.highlight}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Artifacts */}
        {entry.artifacts && entry.artifacts.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
              <Paperclip className="h-4 w-4" />
              <span className="font-medium">Artifacts ({entry.artifacts.length})</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {entry.artifacts.map((artifact) => (
                <div key={artifact.id} className="flex items-center space-x-2 bg-gray-100 rounded px-2 py-1">
                  {getFileIcon(artifact.type)}
                  <span className="text-sm text-gray-700">{artifact.name}</span>
                  {artifact.isConfidential && <Shield className="h-3 w-3 text-red-500" />}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer with social actions */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button className="flex items-center space-x-1 text-sm text-gray-600 hover:text-blue-600">
              <ThumbsUp className="h-4 w-4" />
              <span>Appreciate ({entry.appreciates})</span>
            </button>
            <button className="flex items-center space-x-1 text-sm text-gray-600 hover:text-blue-600">
              <MessageSquare className="h-4 w-4" />
              <span>Discuss ({entry.discussCount})</span>
            </button>
            <button className="flex items-center space-x-1 text-sm text-gray-600 hover:text-blue-600">
              <RepeatIcon className="h-4 w-4" />
              <span>ReChronicle ({entry.rechronicles})</span>
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}