import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  mockTools,
  mockStories,
  CONNECT_DELAY,
  totalActivityCount,
} from './mock-data';
import type { ToolId } from './mock-data';
import {
  GitBranch,
  KanbanSquare,
  FileText,
  Hash,
  Figma,
  Video,
  CheckCircle2,
  Loader2,
  Copy,
  ArrowRight,
  Calendar,
  Zap,
  Check,
  ChevronRight,
} from 'lucide-react';

const TOOL_ICONS: Record<string, React.ReactNode> = {
  github: <GitBranch className="w-4 h-4" />,
  jira: <KanbanSquare className="w-4 h-4" />,
  confluence: <FileText className="w-4 h-4" />,
  slack: <Hash className="w-4 h-4" />,
  figma: <Figma className="w-4 h-4" />,
  'google-meet': <Video className="w-4 h-4" />,
};

type Step = 0 | 1 | 2 | 3;

const TIMELINE_NODES = [
  { label: 'Welcome', sublabel: 'Today' },
  { label: 'Connect', sublabel: 'Step 2' },
  { label: 'Sync', sublabel: 'Step 3' },
  { label: 'Story', sublabel: 'Step 4' },
] as const;

const SECTION_COLORS: Record<string, { dot: string; line: string; label: string }> = {
  Situation: { dot: 'bg-blue-500', line: 'border-blue-200', label: 'text-blue-700' },
  Task: { dot: 'bg-yellow-500', line: 'border-yellow-200', label: 'text-yellow-700' },
  Action: { dot: 'bg-purple-500', line: 'border-purple-200', label: 'text-purple-700' },
  Result: { dot: 'bg-emerald-500', line: 'border-emerald-200', label: 'text-emerald-700' },
  Challenge: { dot: 'bg-orange-500', line: 'border-orange-200', label: 'text-orange-700' },
};

export function OnboardingV4() {
  const [step, setStep] = useState<Step>(0);
  const [selectedTools, setSelectedTools] = useState<Set<ToolId>>(new Set());
  const [syncedTools, setSyncedTools] = useState<ToolId[]>([]);
  const [copied, setCopied] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);

  const story = mockStories[0];

  // Scroll active node into view
  useEffect(() => {
    if (timelineRef.current) {
      const activeNode = timelineRef.current.querySelector('[data-active="true"]');
      activeNode?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [step]);

  // Sync: add tools to timeline one by one
  useEffect(() => {
    if (step !== 2) return;
    setSyncedTools([]);
    const arr = Array.from(selectedTools);
    arr.forEach((id, i) => {
      setTimeout(() => {
        setSyncedTools((prev) => [...prev, id]);
      }, 600 + i * 700);
    });
    const total = 600 + arr.length * 700 + 500;
    const timer = setTimeout(() => setStep(3), total);
    return () => clearTimeout(timer);
  }, [step, selectedTools]);

  const toggleTool = (id: ToolId) => {
    setSelectedTools((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const handleConnect = () => {
    setTimeout(() => setStep(2), CONNECT_DELAY);
  };

  const handleCopy = () => {
    const text = story.sections.map((s) => `${s.label}:\n${s.text}`).join('\n\n');
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10 px-4">
      {/* Horizontal scrollable timeline */}
      <div className="w-full max-w-2xl mb-8">
        <div
          ref={timelineRef}
          className="overflow-x-auto flex gap-0 pb-3 snap-x snap-mandatory scrollbar-hide"
          style={{ scrollbarWidth: 'none' }}
        >
          {TIMELINE_NODES.map((node, i) => {
            const isActive = step === i;
            const isCompleted = step > i;
            return (
              <div key={node.label} className="flex items-center snap-center flex-shrink-0">
                {/* Node */}
                <div
                  className="flex flex-col items-center"
                  data-active={isActive ? 'true' : 'false'}
                >
                  <div
                    className={[
                      'flex items-center justify-center rounded-full transition-all duration-300 font-bold text-sm',
                      isActive
                        ? 'w-12 h-12 bg-primary-500 text-white ring-4 ring-primary-200 shadow-lg'
                        : isCompleted
                        ? 'w-10 h-10 bg-emerald-500 text-white'
                        : 'w-10 h-10 bg-white border-2 border-gray-300 text-gray-400',
                    ].join(' ')}
                  >
                    {isCompleted ? <Check className="w-4 h-4" /> : i + 1}
                  </div>
                  <div className="mt-2 text-center">
                    <div
                      className={[
                        'text-xs font-semibold whitespace-nowrap',
                        isActive ? 'text-primary-700' : isCompleted ? 'text-emerald-600' : 'text-gray-400',
                      ].join(' ')}
                    >
                      {node.label}
                    </div>
                    <div className="text-xs text-gray-400">{node.sublabel}</div>
                  </div>
                </div>

                {/* Connector */}
                {i < TIMELINE_NODES.length - 1 && (
                  <div className="w-16 h-0.5 mx-1 mb-6 bg-gray-200 relative overflow-hidden flex-shrink-0">
                    <div
                      className="absolute inset-y-0 left-0 bg-emerald-400 transition-all duration-500"
                      style={{ width: isCompleted ? '100%' : '0%' }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Content area */}
      <div className="w-full max-w-2xl">
        {/* Step 0: Welcome */}
        {step === 0 && (
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-primary-400" />
                <span className="text-xs text-gray-400 font-medium">Today · March 3, 2026</span>
              </div>
              <CardTitle className="text-2xl text-gray-800">
                Turn your work into your story
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 leading-relaxed mb-6">
                inchronicle connects to the tools you already use and automatically surfaces your most impactful moments — so you're never scrambling before a performance review.
              </p>

              {/* Timeline preview of what's coming */}
              <div className="relative pl-6 mb-6 space-y-4">
                <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-gray-200" />
                {[
                  { icon: <Zap className="w-3 h-3" />, label: 'Connect your tools', detail: 'GitHub, Jira, Slack & more' },
                  { icon: <Loader2 className="w-3 h-3" />, label: 'We analyze 90 days of activity', detail: `${totalActivityCount}+ events scanned` },
                  { icon: <CheckCircle2 className="w-3 h-3" />, label: 'Get your performance story', detail: 'Evidence-backed narrative' },
                ].map((item, i) => (
                  <div key={i} className="relative flex items-start gap-3">
                    <div className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-primary-100 flex items-center justify-center text-primary-500">
                      {item.icon}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-700">{item.label}</div>
                      <div className="text-xs text-gray-400">{item.detail}</div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setStep(1)}
                className="w-full py-3 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
              >
                Get Started <ArrowRight className="w-4 h-4" />
              </button>
            </CardContent>
          </Card>
        )}

        {/* Step 1: Horizontal scrollable chip selection */}
        {step === 1 && (
          <Card className="shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl text-gray-800">Choose your tools</CardTitle>
              <p className="text-sm text-gray-500">Scroll to see all options. Select 2 or more.</p>
            </CardHeader>
            <CardContent>
              {/* Horizontal scrollable chips */}
              <div
                className="flex gap-3 overflow-x-auto pb-3 mb-6 snap-x"
                style={{ scrollbarWidth: 'none' }}
              >
                {mockTools.map((tool) => {
                  const isSelected = selectedTools.has(tool.id);
                  return (
                    <button
                      key={tool.id}
                      onClick={() => toggleTool(tool.id)}
                      className={[
                        'flex-shrink-0 snap-center flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-200 w-36',
                        isSelected
                          ? 'border-primary-500 bg-primary-50 shadow-md'
                          : 'border-gray-200 bg-white hover:border-gray-300',
                      ].join(' ')}
                    >
                      <div className="relative">
                        <span
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow"
                          style={{ backgroundColor: tool.color }}
                        >
                          {TOOL_ICONS[tool.id]}
                        </span>
                        {isSelected && (
                          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-gray-700 text-center">{tool.name}</span>
                      <span className="text-xs text-gray-400 text-center">{tool.activityCount} events</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-500">
                  {selectedTools.size} of {mockTools.length} selected
                </span>
                {selectedTools.size > 0 && (
                  <div className="flex gap-1">
                    {Array.from(selectedTools).map((id) => {
                      const tool = mockTools.find((t) => t.id === id)!;
                      return (
                        <span
                          key={id}
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs"
                          style={{ backgroundColor: tool.color }}
                        >
                          {TOOL_ICONS[id]}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                disabled={selectedTools.size < 2}
                onClick={handleConnect}
                className={[
                  'w-full py-3 rounded-xl font-semibold text-sm transition-all',
                  selectedTools.size >= 2
                    ? 'bg-primary-500 hover:bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed',
                ].join(' ')}
              >
                {selectedTools.size >= 2 ? `Sync ${selectedTools.size} tools →` : 'Select 2+ tools'}
              </button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Tool sync timeline */}
        {step === 2 && (
          <Card className="shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl text-gray-800">Syncing tools</CardTitle>
              <p className="text-sm text-gray-500">Importing your activity history...</p>
            </CardHeader>
            <CardContent>
              <div className="relative pl-8">
                <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-200" />
                <div className="space-y-5">
                  {Array.from(selectedTools).map((id, i) => {
                    const tool = mockTools.find((t) => t.id === id)!;
                    const isDone = syncedTools.includes(id);
                    const isActive = !isDone && i === syncedTools.length;
                    return (
                      <div key={id} className="relative flex items-start gap-3">
                        {/* Timeline dot */}
                        <div
                          className={[
                            'absolute -left-8 top-1 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300',
                            isDone
                              ? 'bg-emerald-500'
                              : isActive
                              ? 'bg-primary-500'
                              : 'bg-gray-200',
                          ].join(' ')}
                        >
                          {isDone ? (
                            <Check className="w-3 h-3 text-white" />
                          ) : isActive ? (
                            <Loader2 className="w-3 h-3 text-white animate-spin" />
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-gray-400" />
                          )}
                        </div>
                        <div
                          className={[
                            'flex-1 flex items-center gap-3 p-3 rounded-xl border transition-all duration-300',
                            isDone ? 'bg-emerald-50 border-emerald-200' : isActive ? 'bg-primary-50 border-primary-200' : 'bg-white border-gray-200',
                          ].join(' ')}
                        >
                          <span
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                            style={{ backgroundColor: tool.color }}
                          >
                            {TOOL_ICONS[id]}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-gray-700">{tool.name}</div>
                            <div className="text-xs text-gray-400">
                              {isDone
                                ? `${tool.activityCount} ${tool.activityLabel}`
                                : isActive
                                ? 'Connecting...'
                                : 'Waiting'}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Story as timeline events */}
        {step === 3 && (
          <Card className="shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Badge className="mb-2 text-xs">Story Generated</Badge>
                  <CardTitle className="text-lg text-gray-800 leading-snug">{story.title}</CardTitle>
                  <p className="text-xs text-gray-400 mt-1">{story.dateRange}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xs text-gray-400">Confidence</div>
                  <div className="text-2xl font-bold text-primary-500">{Math.round(story.confidence * 100)}%</div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Vertical timeline of sections */}
              <div className="relative pl-8">
                <div className="absolute left-3 top-0 bottom-4 w-0.5 bg-gray-200" />
                <div className="space-y-5">
                  {story.sections.map((section) => {
                    const colors = SECTION_COLORS[section.label] ?? {
                      dot: 'bg-gray-400', line: 'border-gray-200', label: 'text-gray-600',
                    };
                    return (
                      <div key={section.label} className="relative">
                        <div
                          className={`absolute -left-8 top-1.5 w-5 h-5 rounded-full ${colors.dot} flex items-center justify-center`}
                        >
                          <ChevronRight className="w-3 h-3 text-white" />
                        </div>
                        <div className={`border ${colors.line} rounded-xl p-4`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-xs font-bold uppercase tracking-wide ${colors.label}`}>
                              {section.label}
                            </span>
                            <span className="text-xs text-gray-400">{section.evidenceCount} signals</span>
                          </div>
                          <p className="text-sm text-gray-700 leading-relaxed">{section.text}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={handleCopy}
                className={[
                  'mt-6 w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2',
                  copied ? 'bg-emerald-500 text-white' : 'bg-primary-500 hover:bg-primary-600 text-white',
                ].join(' ')}
              >
                {copied ? <><CheckCircle2 className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy Story</>}
              </button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
