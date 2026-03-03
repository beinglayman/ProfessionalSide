import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { mockTools, mockStories, SYNC_DELAY, CONNECT_DELAY, totalActivityCount } from './mock-data';
import type { ToolId } from './mock-data';
import {
  CheckCircle2,
  Loader2,
  Copy,
  Check,
  GitBranch,
  KanbanSquare,
  FileText,
  Hash,
  Video,
  Figma as FigmaIcon,
  Wifi,
  BarChart2,
  Download,
} from 'lucide-react';

type ToolConnectionState = 'off' | 'connecting' | 'connected';

const TOOL_ICON_MAP: Record<string, React.ElementType> = {
  GitBranch,
  KanbanSquare,
  FileText,
  Hash,
  Video,
  Figma: FigmaIcon,
};

// Map each tool to the story section it contributes to (by index)
const TOOL_SECTION_MAP: Partial<Record<ToolId, number[]>> = {
  github: [2], // Action
  jira: [0, 1], // Situation, Task
  confluence: [1, 2], // Task, Action
  slack: [2], // Action
  figma: [3], // Result
  'google-meet': [3], // Result
};

function ShimmerBlock({ width = 'full', height = 4 }: { width?: string; height?: number }) {
  return (
    <div
      className={`bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-pulse rounded`}
      style={{
        width: width === 'full' ? '100%' : width,
        height: `${height * 4}px`,
        backgroundSize: '200% 100%',
      }}
    />
  );
}

function ConfidenceBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary-400 rounded-full transition-all duration-700"
          style={{ width: `${Math.round(value * 100)}%` }}
        />
      </div>
      <span className="text-xs text-gray-400 tabular-nums w-8 text-right">{Math.round(value * 100)}%</span>
    </div>
  );
}

export function OnboardingV10() {
  const [toolStates, setToolStates] = useState<Record<ToolId, ToolConnectionState>>({
    github: 'off',
    jira: 'off',
    confluence: 'off',
    slack: 'off',
    figma: 'off',
    'google-meet': 'off',
  });
  const [connecting, setConnecting] = useState(false);
  const [globalSyncing, setGlobalSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const [exportReady, setExportReady] = useState(false);

  const story = mockStories[0];

  const connectedTools = Object.entries(toolStates)
    .filter(([, s]) => s === 'connected')
    .map(([id]) => id as ToolId);

  // Which story section indices are "unlocked" based on connected tools
  const unlockedSections = new Set<number>();
  connectedTools.forEach((toolId) => {
    TOOL_SECTION_MAP[toolId]?.forEach((idx) => unlockedSections.add(idx));
  });

  const [selected, setSelected] = useState<Set<ToolId>>(new Set());

  function handleToggle(id: ToolId) {
    if (connecting || globalSyncing) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleConnect() {
    if (selected.size === 0 || connecting || globalSyncing) return;
    setConnecting(true);

    const toolArr = Array.from(selected);
    toolArr.forEach((toolId, i) => {
      setToolStates((prev) => ({ ...prev, [toolId]: 'connecting' }));
      setTimeout(() => {
        setToolStates((prev) => ({ ...prev, [toolId]: 'connected' }));
        if (i === toolArr.length - 1) {
          setTimeout(() => {
            setConnecting(false);
            setGlobalSyncing(true);
            let prog = 0;
            const interval = setInterval(() => {
              prog = Math.min(prog + Math.ceil(Math.random() * 6 + 2), 100);
              setSyncProgress(prog);
              if (prog >= 100) {
                clearInterval(interval);
                setGlobalSyncing(false);
                setExportReady(true);
              }
            }, SYNC_DELAY / 22);
          }, 300);
        }
      }, CONNECT_DELAY + i * 300);
    });
  }

  function handleCopy() {
    const text = [
      story.title,
      '',
      ...story.sections.map((s) => `${s.label.toUpperCase()}\n${s.text}`),
    ].join('\n\n');
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-5xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Build your STAR story</h1>
          <p className="text-gray-500 text-sm mt-1">Connect tools on the left — see your story build on the right.</p>
        </div>

        <div className="flex gap-6 items-start">
          {/* LEFT PANEL — Controls */}
          <div className="w-2/5 space-y-4">
            {/* Tool selection */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">1. Select tools</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {mockTools.map((tool) => {
                  const isSelected = selected.has(tool.id);
                  const state = toolStates[tool.id];
                  const Icon = TOOL_ICON_MAP[tool.icon] ?? FileText;

                  return (
                    <div
                      key={tool.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all select-none ${
                        state === 'connected'
                          ? 'border-green-300 bg-green-50'
                          : state === 'connecting'
                          ? 'border-primary-200 bg-primary-50/50'
                          : isSelected
                          ? 'border-primary-300 bg-primary-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                      onClick={() => handleToggle(tool.id)}
                    >
                      <Icon
                        size={16}
                        className={
                          state === 'connected'
                            ? 'text-green-600'
                            : state === 'connecting'
                            ? 'text-primary-400'
                            : isSelected
                            ? 'text-primary-600'
                            : 'text-gray-400'
                        }
                      />
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium ${state === 'connected' ? 'text-green-700' : isSelected ? 'text-primary-700' : 'text-gray-700'}`}>
                          {tool.name}
                        </div>
                        <div className="text-xs text-gray-400">{tool.activityCount} {tool.activityLabel}</div>
                      </div>
                      <div className="shrink-0">
                        {state === 'connected' && <CheckCircle2 size={14} className="text-green-500" />}
                        {state === 'connecting' && <Loader2 size={14} className="text-primary-400 animate-spin" />}
                        {state === 'off' && isSelected && (
                          <div className="w-4 h-4 rounded border-2 border-primary-400 bg-primary-400 flex items-center justify-center">
                            <Check size={9} className="text-white" />
                          </div>
                        )}
                        {state === 'off' && !isSelected && (
                          <div className="w-4 h-4 rounded border-2 border-gray-300" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Connect button */}
            <button
              onClick={handleConnect}
              disabled={selected.size === 0 || connecting || globalSyncing}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-primary-600 text-white rounded-lg font-medium text-sm hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {connecting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Connecting...
                </>
              ) : globalSyncing ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Syncing... {syncProgress}%
                </>
              ) : (
                <>
                  <Wifi size={15} />
                  {selected.size === 0 ? 'Select tools above' : `Connect ${selected.size} tool${selected.size > 1 ? 's' : ''}`}
                </>
              )}
            </button>

            {/* Sync progress */}
            {globalSyncing && (
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Analyzing {totalActivityCount} activities</span>
                  <span>{syncProgress}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500 rounded-full transition-all duration-300"
                    style={{ width: `${syncProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Status indicators */}
            {Object.values(toolStates).some((s) => s === 'connected') && (
              <div className="text-xs text-gray-500 space-y-1">
                {mockTools
                  .filter((t) => toolStates[t.id] === 'connected')
                  .map((t) => (
                    <div key={t.id} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                      <span>{t.name} — {t.activityCount} activities ready</span>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* RIGHT PANEL — Live Preview */}
          <div className="flex-1">
            <div
              className="bg-white border border-gray-100 rounded-xl shadow-sm min-h-[540px] flex flex-col"
              style={{
                backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.03) 1px, transparent 0)',
                backgroundSize: '20px 20px',
              }}
            >
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart2 size={15} className="text-gray-400" />
                  <span className="text-sm font-medium text-gray-600">Story Preview</span>
                </div>
                {exportReady && (
                  <Badge variant="default" className="text-xs">Ready to export</Badge>
                )}
                {globalSyncing && (
                  <Badge variant="secondary" className="text-xs">
                    <Loader2 size={10} className="animate-spin mr-1" />
                    Analyzing...
                  </Badge>
                )}
              </div>

              <div className="flex-1 p-6 space-y-5">
                {/* Title */}
                <div>
                  {exportReady ? (
                    <h2 className="text-lg font-bold text-gray-900 leading-tight">{story.title}</h2>
                  ) : (
                    <ShimmerBlock height={5} />
                  )}
                  {exportReady ? (
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-400">{story.dateRange}</span>
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-xs text-gray-400">{story.tools.length} tools</span>
                    </div>
                  ) : (
                    <div className="mt-2">
                      <ShimmerBlock width="40%" height={3} />
                    </div>
                  )}
                </div>

                {/* Sections */}
                {story.sections.map((section, idx) => {
                  const isUnlocked = unlockedSections.has(idx);
                  const isFullyReady = exportReady;

                  return (
                    <div key={section.label} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        {isFullyReady || isUnlocked ? (
                          <span className="text-xs font-bold text-primary-600 uppercase tracking-wider">
                            {section.label}
                          </span>
                        ) : (
                          <ShimmerBlock width="15%" height={3} />
                        )}
                        {isFullyReady && (
                          <span className="text-xs text-gray-400">{section.evidenceCount} sources</span>
                        )}
                      </div>

                      {isFullyReady ? (
                        <>
                          <p className="text-sm text-gray-700 leading-relaxed">{section.text}</p>
                          <ConfidenceBar value={story.confidence - idx * 0.03} />
                        </>
                      ) : isUnlocked && globalSyncing ? (
                        // Partially filling in
                        <div className="space-y-1.5">
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {section.text.slice(0, Math.ceil(section.text.length * syncProgress / 100))}
                            <span className="inline-block w-1 h-3.5 bg-primary-400 animate-pulse ml-0.5 align-middle" />
                          </p>
                        </div>
                      ) : isUnlocked ? (
                        <p className="text-sm text-gray-700 leading-relaxed">{section.text}</p>
                      ) : (
                        <div className="space-y-1.5">
                          <ShimmerBlock height={3} />
                          <ShimmerBlock width="85%" height={3} />
                          <ShimmerBlock width="60%" height={3} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Export footer */}
              <div className="px-6 py-4 border-t border-gray-100">
                {exportReady ? (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm rounded-lg font-medium hover:bg-primary-700 transition-colors"
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      {copied ? 'Copied!' : 'Copy Story'}
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 text-sm rounded-lg hover:border-gray-300 transition-colors">
                      <Download size={14} />
                      Export PDF
                    </button>
                    <div className="ml-auto flex items-center gap-2 text-xs text-gray-400">
                      <BarChart2 size={12} />
                      {Math.round(story.confidence * 100)}% confidence
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 opacity-40 pointer-events-none">
                    <div className="h-9 w-28 bg-gray-200 rounded-lg" />
                    <div className="h-9 w-28 bg-gray-100 rounded-lg" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
