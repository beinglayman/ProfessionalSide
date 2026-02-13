import React, { useState } from 'react';
import {
  mockReducedProfile,
  TOOL_META,
  getInitials,
  getConfidenceLevel,
} from './mock-data';
import type {
  MockCareerStory,
  MockDraftStory,
  MockToolActivity,
  ConnectedTool,
} from './mock-data';
import { Card, CardContent } from '../ui/card';
import { cn } from '../../lib/utils';
import {
  BookOpen,
  FileText,
  Activity,
  Calendar,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  V17 — "Split Identity + Output"                                    */
/*  Top hero band + tabbed content area                                */
/* ------------------------------------------------------------------ */

type Tab = 'published' | 'drafts' | 'activity';

export function ProfileV17() {
  const p = mockReducedProfile;
  const initials = getInitials(p.name);
  const [activeTab, setActiveTab] = useState<Tab>('published');

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  const tabs: { key: Tab; label: string; icon: React.ElementType; count: number }[] = [
    { key: 'published', label: 'Published', icon: BookOpen, count: p.publishedStories.length },
    { key: 'drafts', label: 'Drafts', icon: FileText, count: p.draftStories.length },
    { key: 'activity', label: 'Activity', icon: Activity, count: p.connectedTools.length },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Hero Band ── */}
      <div className="bg-gradient-to-r from-primary-50 to-primary-100">
        <div className="mx-auto flex max-w-4xl flex-col items-center px-4 py-10">
          {/* Avatar */}
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-primary-700 shadow-sm ring-4 ring-white">
            <span className="text-2xl font-bold">{initials}</span>
          </div>

          {/* Name */}
          <h1 className="mt-4 text-2xl font-bold text-gray-900">{p.name}</h1>

          {/* Role + Title */}
          <p className="mt-1 text-sm text-gray-600">
            {p.role} &middot; {p.title} at {p.company}
          </p>

          {/* Tool chips */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {p.connectedTools.map((ta: MockToolActivity) => {
              const meta = TOOL_META[ta.tool as ConnectedTool];
              return (
                <span
                  key={ta.tool}
                  className={cn(
                    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                    meta.bgColor,
                    meta.color,
                  )}
                >
                  {meta.label}
                </span>
              );
            })}
          </div>

          {/* Stats line */}
          <p className="mt-3 text-sm text-gray-500">
            {p.publishedStories.length} stories &middot; {p.totalActivities} activities
          </p>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="mx-auto max-w-4xl px-4">
        <div className="flex border-b border-gray-200">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-1.5 border-b-2 px-5 py-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-primary-600 text-primary-700'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                <span
                  className={cn(
                    'ml-1 rounded-full px-1.5 py-0.5 text-xs',
                    isActive
                      ? 'bg-primary-100 text-primary-700'
                      : 'bg-gray-100 text-gray-500',
                  )}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Tab Content ── */}
        <div className="py-6">
          {/* Published tab */}
          {activeTab === 'published' && (
            <div className="space-y-3">
              {p.publishedStories.map((story: MockCareerStory) => {
                const confidence = getConfidenceLevel(story.overallConfidence);
                return (
                  <Card key={story.id} className="shadow-sm transition-shadow hover:shadow-md">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-900">{story.title}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                              {story.framework}
                            </span>
                            <span className="rounded bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">
                              {story.archetype}
                            </span>
                            <span
                              className={cn(
                                'rounded px-2 py-0.5 text-xs font-medium',
                                confidence.bgColor,
                                confidence.color,
                              )}
                            >
                              {confidence.label} ({Math.round(story.overallConfidence * 100)}%)
                            </span>
                          </div>
                        </div>
                        <span className="flex shrink-0 items-center gap-1 text-xs text-gray-400">
                          <Calendar className="h-3 w-3" />
                          {formatDate(story.publishedAt)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Drafts tab */}
          {activeTab === 'drafts' && (
            <div className="space-y-3">
              {p.draftStories.map((draft: MockDraftStory) => (
                <Card key={draft.id} className="shadow-sm transition-shadow hover:shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900">{draft.title}</p>
                        <p className="mt-0.5 text-xs text-gray-400">{draft.framework}</p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-gray-600">
                        {draft.completionPercent}%
                      </span>
                    </div>
                    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={cn(
                          'h-1.5 rounded-full transition-all',
                          draft.completionPercent >= 60
                            ? 'bg-emerald-400'
                            : draft.completionPercent >= 30
                              ? 'bg-amber-400'
                              : 'bg-gray-300',
                        )}
                        style={{ width: `${draft.completionPercent}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Activity tab */}
          {activeTab === 'activity' && (
            <div className="space-y-4">
              {p.connectedTools.map((ta: MockToolActivity) => {
                const meta = TOOL_META[ta.tool as ConnectedTool];
                return (
                  <Card key={ta.tool} className="shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                            meta.bgColor,
                            meta.color,
                          )}
                        >
                          {meta.label}
                        </span>
                        <span className="text-xs text-gray-400">
                          {ta.activityCount} activities
                        </span>
                      </div>
                      <ul className="mt-3 space-y-2">
                        {ta.recentItems.map((item, idx) => (
                          <li
                            key={idx}
                            className="flex items-start justify-between gap-3 text-sm"
                          >
                            <span className="text-gray-700">{item.title}</span>
                            <span className="shrink-0 text-xs text-gray-400">
                              {formatDate(item.date)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
