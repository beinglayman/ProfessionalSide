import { useState, useRef } from 'react';
import { Badge } from '../ui/badge';
import { mockTools, mockStories, mockActivities, SYNC_DELAY, CONNECT_DELAY, totalActivityCount } from './mock-data';
import type { ToolId } from './mock-data';
import {
  GitBranch,
  KanbanSquare,
  FileText,
  Hash,
  Figma,
  Video,
  Copy,
  Download,
  Share2,
  Check,
  ChevronDown,
  Sparkles,
  ArrowRight,
  Zap,
} from 'lucide-react';

const TOOL_ICONS: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  GitBranch,
  KanbanSquare,
  FileText,
  Hash,
  Figma,
  Video,
};

type Section = 'welcome' | 'connect' | 'syncing' | 'story' | 'export';

export function OnboardingV11() {
  const [unlockedSections, setUnlockedSections] = useState<Set<Section>>(new Set(['welcome']));
  const [selectedTools, setSelectedTools] = useState<Set<ToolId>>(new Set());
  const [syncProgress, setSyncProgress] = useState(0);
  const [, setIsSyncing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [connectingTools, setConnectingTools] = useState<Set<ToolId>>(new Set());

  const sectionRefs = {
    welcome: useRef<HTMLDivElement>(null),
    connect: useRef<HTMLDivElement>(null),
    syncing: useRef<HTMLDivElement>(null),
    story: useRef<HTMLDivElement>(null),
    export: useRef<HTMLDivElement>(null),
  };

  const scrollTo = (section: Section) => {
    sectionRefs[section].current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const toggleTool = (id: ToolId) => {
    setSelectedTools((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        setConnectingTools((c) => new Set([...c, id]));
        setTimeout(() => {
          setConnectingTools((c) => {
            const n = new Set(c);
            n.delete(id);
            return n;
          });
        }, CONNECT_DELAY);
      }
      return next;
    });
  };

  const handleStartSync = () => {
    if (selectedTools.size === 0) return;
    setUnlockedSections((prev) => new Set([...prev, 'syncing']));
    setTimeout(() => {
      setIsSyncing(true);
      scrollTo('syncing');
      let progress = 0;
      const interval = setInterval(() => {
        progress += 4;
        setSyncProgress(Math.min(progress, 100));
        if (progress >= 100) {
          clearInterval(interval);
          setIsSyncing(false);
          setUnlockedSections((prev) => new Set([...prev, 'story', 'export']));
          setTimeout(() => scrollTo('story'), 400);
        }
      }, SYNC_DELAY / 25);
    }, 100);
  };

  const handleCopy = () => {
    const story = mockStories[0];
    const text = `${story.title}\n\n${story.sections.map((s) => `${s.label}:\n${s.text}`).join('\n\n')}`;
    navigator.clipboard.writeText(text).catch(() => {});
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const story = mockStories[0];
  const isConnectUnlocked = unlockedSections.has('connect');
  const isSyncingUnlocked = unlockedSections.has('syncing');
  const isStoryUnlocked = unlockedSections.has('story');
  const isExportUnlocked = unlockedSections.has('export');

  // Orbit positions for 6 tools around circle
  const orbitPositions = mockTools.map((_, i) => {
    const angle = (i / mockTools.length) * 2 * Math.PI - Math.PI / 2;
    const r = 130;
    return {
      x: Math.round(Math.cos(angle) * r),
      y: Math.round(Math.sin(angle) * r),
    };
  });

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Sticky nav dots */}
      <div className="fixed right-6 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-3">
        {(['welcome', 'connect', 'syncing', 'story', 'export'] as Section[]).map((s) => {
          const locked = !unlockedSections.has(s);
          return (
            <button
              key={s}
              disabled={locked}
              onClick={() => scrollTo(s)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                locked
                  ? 'bg-gray-200 cursor-not-allowed'
                  : 'bg-primary-400 hover:bg-primary-600 cursor-pointer'
              }`}
              title={s}
            />
          );
        })}
      </div>

      {/* Section 1 — Welcome */}
      <div
        ref={sectionRefs.welcome}
        className="min-h-[100vh] relative flex flex-col items-center justify-center overflow-hidden px-8"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-purple-50 pointer-events-none" />
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary-100 rounded-full opacity-30 -translate-x-1/2 -translate-y-1/2 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-purple-100 rounded-full opacity-40 translate-x-1/3 translate-y-1/3 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-100 text-primary-600 rounded-full text-sm font-medium mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            Performance review season is here
          </div>
          <h1 className="text-6xl font-bold text-gray-900 leading-tight tracking-tight">
            Your work tells
            <span className="block bg-gradient-to-r from-primary-500 to-purple-500 bg-clip-text text-transparent">
              a story
            </span>
          </h1>
          <p className="text-xl text-gray-500 max-w-lg mx-auto leading-relaxed">
            Connect your tools and let inchronicle surface the evidence for your best performance stories — in minutes.
          </p>
          <div className="flex items-center justify-center gap-4 pt-2">
            <button
              onClick={() => {
                setUnlockedSections((prev) => new Set([...prev, 'connect']));
                setTimeout(() => scrollTo('connect'), 100);
              }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-semibold text-base hover:bg-primary-700 transition-colors shadow-lg shadow-primary-200"
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-400">{totalActivityCount.toLocaleString()} activities analyzed</span>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronDown className="w-5 h-5 text-gray-400" />
        </div>
      </div>

      {/* Gradient divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-primary-200 to-transparent mx-8" />

      {/* Section 2 — Connect */}
      <div
        ref={sectionRefs.connect}
        className={`min-h-[500px] py-20 px-8 transition-opacity duration-500 ${isConnectUnlocked ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}
      >
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold text-gray-900">Connect your tools</h2>
            <p className="text-gray-500">Select the tools you use. We'll find your evidence automatically.</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {mockTools.map((tool) => {
              const Icon = TOOL_ICONS[tool.icon];
              const selected = selectedTools.has(tool.id);
              const connecting = connectingTools.has(tool.id);
              return (
                <button
                  key={tool.id}
                  onClick={() => toggleTool(tool.id)}
                  className={`relative p-4 rounded-2xl border-2 text-left transition-all duration-200 ${
                    selected
                      ? 'border-primary-400 bg-primary-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                  }`}
                >
                  {selected && (
                    <span className="absolute top-3 right-3 w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </span>
                  )}
                  {connecting && (
                    <span className="absolute top-3 right-3 w-5 h-5 rounded-full border-2 border-primary-400 border-t-transparent animate-spin" />
                  )}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                    style={{ backgroundColor: `${tool.color}18` }}
                  >
                    {Icon && <Icon className="w-5 h-5" style={{ color: tool.color }} />}
                  </div>
                  <div className="font-semibold text-gray-900 text-sm">{tool.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{tool.activityCount.toLocaleString()} {tool.activityLabel}</div>
                </button>
              );
            })}
          </div>

          {selectedTools.size > 0 && (
            <div className="flex justify-center pt-2">
              <button
                onClick={handleStartSync}
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-all shadow-lg shadow-primary-200 animate-pulse-subtle"
              >
                <Zap className="w-4 h-4" />
                Sync {selectedTools.size} tool{selectedTools.size !== 1 ? 's' : ''}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Gradient divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mx-8" />

      {/* Section 3 — Syncing */}
      <div
        ref={sectionRefs.syncing}
        className={`min-h-[500px] py-20 px-8 bg-gray-50 transition-opacity duration-500 ${isSyncingUnlocked ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}
      >
        <div className="max-w-2xl mx-auto">
          <div className="text-center space-y-2 mb-16">
            <h2 className="text-3xl font-bold text-gray-900">
              {syncProgress < 100 ? 'Syncing your data...' : 'Sync complete!'}
            </h2>
            <p className="text-gray-500">
              {syncProgress < 100
                ? 'Analyzing your activity across connected tools'
                : `Found ${totalActivityCount.toLocaleString()} activities to build your story`}
            </p>
          </div>

          {/* Orbital animation */}
          <div className="relative flex items-center justify-center" style={{ height: '320px' }}>
            {/* Center circle */}
            <div className="relative z-10 w-28 h-28 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex flex-col items-center justify-center shadow-2xl shadow-primary-200">
              <span className="text-white text-2xl font-bold">{syncProgress}%</span>
              <span className="text-primary-200 text-xs">syncing</span>
            </div>

            {/* Outer ring */}
            <div className="absolute w-64 h-64 rounded-full border-2 border-dashed border-primary-200 animate-spin" style={{ animationDuration: '8s' }} />

            {/* Orbiting tool icons */}
            {mockTools.map((tool, i) => {
              const Icon = TOOL_ICONS[tool.icon];
              const pos = orbitPositions[i];
              const isSelected = selectedTools.has(tool.id);
              return (
                <div
                  key={tool.id}
                  className={`absolute w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-all duration-500 ${
                    isSelected ? 'opacity-100 scale-100' : 'opacity-30 scale-90'
                  }`}
                  style={{
                    transform: `translate(${pos.x}px, ${pos.y}px)`,
                    backgroundColor: `${tool.color}22`,
                    border: `2px solid ${tool.color}44`,
                  }}
                >
                  {Icon && <Icon className="w-4 h-4" style={{ color: tool.color }} />}
                </div>
              );
            })}
          </div>

          {/* Progress bar */}
          <div className="mt-8 max-w-sm mx-auto">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full transition-all duration-300"
                style={{ width: `${syncProgress}%` }}
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2 justify-center">
              {mockActivities.slice(0, 4).map((a, i) => (
                <span
                  key={i}
                  className="text-xs text-gray-400 bg-white px-2 py-1 rounded-full border border-gray-200"
                >
                  {a.type}: {a.title.slice(0, 28)}…
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Gradient divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-primary-200 to-transparent mx-8" />

      {/* Section 4 — Story */}
      <div
        ref={sectionRefs.story}
        className={`min-h-[500px] py-20 px-8 transition-opacity duration-700 ${isStoryUnlocked ? 'opacity-100' : 'opacity-20 pointer-events-none'}`}
      >
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <Badge className="mb-2">{Math.round(story.confidence * 100)}% confidence</Badge>
            <h2 className="text-3xl font-bold text-gray-900">{story.title}</h2>
            <p className="text-gray-500">{story.dateRange}</p>
          </div>

          <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
            {story.sections.map((section, i) => (
              <div
                key={section.label}
                className={`p-6 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${
                  i < story.sections.length - 1 ? 'border-b border-gray-100' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="inline-flex items-center gap-1.5 mb-2">
                      <span className="text-xs font-bold text-primary-600 uppercase tracking-wider">{section.label}</span>
                    </div>
                    <p className="text-gray-700 leading-relaxed">{section.text}</p>
                  </div>
                  <Badge variant="secondary" className="shrink-0 mt-1">
                    {section.evidenceCount} sources
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Gradient divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mx-8" />

      {/* Section 5 — Export */}
      <div
        ref={sectionRefs.export}
        className={`min-h-[400px] py-20 px-8 bg-gradient-to-b from-white to-primary-50 transition-opacity duration-700 ${isExportUnlocked ? 'opacity-100' : 'opacity-20 pointer-events-none'}`}
      >
        <div className="max-w-xl mx-auto text-center space-y-8">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-gray-900">Export your story</h2>
            <p className="text-gray-500">Your evidence-backed performance narrative is ready to share.</p>
          </div>

          <div className="flex items-center justify-center gap-6">
            <button
              onClick={handleCopy}
              className="flex flex-col items-center gap-3 p-6 bg-white rounded-2xl border-2 border-gray-200 hover:border-primary-300 hover:shadow-md transition-all group"
            >
              <div className="w-14 h-14 bg-primary-50 group-hover:bg-primary-100 rounded-2xl flex items-center justify-center transition-colors">
                {isCopied ? (
                  <Check className="w-6 h-6 text-primary-600" />
                ) : (
                  <Copy className="w-6 h-6 text-primary-600" />
                )}
              </div>
              <span className="text-sm font-semibold text-gray-700">{isCopied ? 'Copied!' : 'Copy Text'}</span>
            </button>

            <button className="flex flex-col items-center gap-3 p-6 bg-white rounded-2xl border-2 border-gray-200 hover:border-primary-300 hover:shadow-md transition-all group">
              <div className="w-14 h-14 bg-primary-50 group-hover:bg-primary-100 rounded-2xl flex items-center justify-center transition-colors">
                <Download className="w-6 h-6 text-primary-600" />
              </div>
              <span className="text-sm font-semibold text-gray-700">Download PDF</span>
            </button>

            <button className="flex flex-col items-center gap-3 p-6 bg-white rounded-2xl border-2 border-gray-200 hover:border-primary-300 hover:shadow-md transition-all group">
              <div className="w-14 h-14 bg-primary-50 group-hover:bg-primary-100 rounded-2xl flex items-center justify-center transition-colors">
                <Share2 className="w-6 h-6 text-primary-600" />
              </div>
              <span className="text-sm font-semibold text-gray-700">Share Link</span>
            </button>
          </div>

          <p className="text-xs text-gray-400">
            {totalActivityCount.toLocaleString()} activities analyzed · {story.sections.reduce((s, sec) => s + sec.evidenceCount, 0)} evidence items linked
          </p>
        </div>
      </div>
    </div>
  );
}
