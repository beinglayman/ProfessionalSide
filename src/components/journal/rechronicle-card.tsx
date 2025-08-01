import React from 'react';
import { Link } from 'react-router-dom';
import { RepeatIcon, Calendar, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { JournalEntry } from '../../types/journal';
import { JournalCard } from './journal-card';
import { cn } from '../../lib/utils';

interface RechronicleCardProps {
  entry: JournalEntry; // This is the rechronicle entry with metadata
  viewMode?: 'workspace' | 'network';
  showPublishMenu?: boolean;
  onPublishToggle?: (journal: JournalEntry) => void;
  onDeleteEntry?: (journalId: string) => void;
  onAppreciate?: (journalId: string) => void;
  onReChronicle?: (journalId: string, comment?: string) => void;
  onToggleAnalytics?: (journalId: string) => void;
  onTogglePublishMenu?: (journalId: string) => void;
  isAnalyticsOpen?: boolean;
  showMenuButton?: boolean;
  showAnalyticsButton?: boolean;
  showUserProfile?: boolean;
  customActions?: React.ReactNode;
  isRechronicleLoading?: boolean;
}

export function RechronicleCard({
  entry,
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
}: RechronicleCardProps) {
  const originalEntry = entry.originalEntry || entry;

  return (
    <div className="space-y-3">
      {/* ReChronicle Header */}
      <div className="flex items-center gap-2 text-sm text-gray-600 bg-purple-50 px-4 py-2 rounded-lg border border-purple-100">
        <RepeatIcon className="h-4 w-4 text-purple-600" />
        <div className="flex items-center gap-2">
          <Link to={`/profile/${(entry.rechronicledBy as any)?.id || (entry.author as any).id || (entry.rechronicledBy?.name || entry.author.name).replace(/\s+/g, '').toLowerCase()}`}>
            <img
              src={entry.rechronicledBy?.avatar || entry.author.avatar}
              alt={entry.rechronicledBy?.name || entry.author.name}
              className="h-6 w-6 rounded-full hover:ring-2 hover:ring-purple-300 transition-all cursor-pointer"
            />
          </Link>
          <Link 
            to={`/profile/${(entry.rechronicledBy as any)?.id || (entry.author as any).id || (entry.rechronicledBy?.name || entry.author.name).replace(/\s+/g, '').toLowerCase()}`}
            className="font-medium text-purple-900 hover:text-purple-700 transition-colors"
          >
            {entry.rechronicledBy?.name || entry.author.name}
          </Link>
          <span className="text-purple-700">rechronicled this entry</span>
          <span className="text-purple-600">•</span>
          <div className="flex items-center gap-1 text-purple-600">
            <Calendar className="h-3 w-3" />
            {format(entry.rechronicledAt || entry.createdAt, 'MMM d, yyyy')}
          </div>
        </div>
      </div>

      {/* ReChronicle Comment */}
      {entry.rechronicleComment && (
        <div className="bg-purple-50 border border-purple-100 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <MessageSquare className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-purple-900 font-medium mb-1">
                {entry.rechronicledBy?.name || entry.author.name}'s thoughts:
              </p>
              <p className="text-sm text-purple-800 leading-relaxed">
                {entry.rechronicleComment}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Original Entry */}
      <div className="relative">
        {/* Left border to indicate this is the original entry */}
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-200 rounded-full" />
        <div className="pl-4">
          <JournalCard
            journal={originalEntry}
            viewMode={viewMode}
            showPublishMenu={showPublishMenu}
            onPublishToggle={onPublishToggle}
            onDeleteEntry={onDeleteEntry}
            onAppreciate={onAppreciate}
            onReChronicle={onReChronicle}
            onToggleAnalytics={onToggleAnalytics}
            onTogglePublishMenu={onTogglePublishMenu}
            isAnalyticsOpen={isAnalyticsOpen}
            showMenuButton={showMenuButton}
            showAnalyticsButton={showAnalyticsButton}
            showUserProfile={true} // Always show original author profile
            customActions={customActions}
            isRechronicleLoading={isRechronicleLoading}
          />
        </div>
      </div>
    </div>
  );
}