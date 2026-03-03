import { useState, useEffect } from 'react';
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
  FileDown,
  ArrowRight,
  Sparkles,
  Check,
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

const STEPS = [
  { label: 'Welcome', desc: 'Get started' },
  { label: 'Connect Tools', desc: 'Select integrations' },
  { label: 'Syncing', desc: 'Importing activity' },
  { label: 'Your Story', desc: 'Review & export' },
] as const;

const SECTION_COLORS: Record<string, { bg: string; accent: string; text: string }> = {
  Situation: { bg: 'bg-blue-50', accent: 'text-blue-600', text: 'border-blue-200' },
  Task: { bg: 'bg-yellow-50', accent: 'text-yellow-700', text: 'border-yellow-200' },
  Action: { bg: 'bg-purple-50', accent: 'text-purple-600', text: 'border-purple-200' },
  Result: { bg: 'bg-emerald-50', accent: 'text-emerald-600', text: 'border-emerald-200' },
  Challenge: { bg: 'bg-orange-50', accent: 'text-orange-600', text: 'border-orange-200' },
};

export function OnboardingV2() {
  const [step, setStep] = useState<Step>(0);
  const [selectedTools, setSelectedTools] = useState<Set<ToolId>>(new Set());
  const [syncedTools, setSyncedTools] = useState<Set<ToolId>>(new Set());
  const [exported, setExported] = useState(false);

  const story = mockStories[0];

  // Staggered sync: mark each selected tool as done 500ms apart
  useEffect(() => {
    if (step !== 2) return;
    setSyncedTools(new Set());
    const arr = Array.from(selectedTools);
    arr.forEach((id, i) => {
      const delay = 500 + i * 600;
      setTimeout(() => {
        setSyncedTools((prev) => new Set([...prev, id]));
      }, delay);
    });
    // Advance to story step after all tools done + small buffer
    const total = 500 + arr.length * 600 + 400;
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

  const handleExport = () => {
    setExported(true);
    setTimeout(() => setExported(false), 2500);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center py-12 px-4">
      <div className="w-full max-w-3xl flex gap-0 rounded-2xl overflow-hidden shadow-xl border border-gray-200 bg-white">
        {/* Left rail */}
        <div className="w-56 flex-shrink-0 bg-gray-50 border-r border-gray-200 py-8">
          <div className="px-4 mb-6">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary-500" />
              <span className="text-sm font-bold text-primary-600">inchronicle</span>
            </div>
          </div>

          <nav className="relative">
            {/* Vertical connector line */}
            <div className="absolute left-8 top-4 bottom-4 w-0.5 bg-gray-200" />

            {STEPS.map((s, i) => {
              const isCompleted = step > i;
              const isActive = step === i;
              return (
                <div
                  key={s.label}
                  className={[
                    'relative flex items-start gap-3 px-4 py-3 mb-1 mx-2 rounded-lg transition-all duration-200',
                    isActive ? 'bg-primary-50 border-l-4 border-primary-500 pl-3' : 'border-l-4 border-transparent',
                  ].join(' ')}
                >
                  <div
                    className={[
                      'relative z-10 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200',
                      isCompleted
                        ? 'bg-emerald-500 text-white'
                        : isActive
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-200 text-gray-400',
                    ].join(' ')}
                  >
                    {isCompleted ? <Check className="w-3.5 h-3.5" /> : i + 1}
                  </div>
                  <div className="pt-0.5 min-w-0">
                    <div
                      className={[
                        'text-sm font-semibold',
                        isActive ? 'text-primary-700' : isCompleted ? 'text-gray-600' : 'text-gray-400',
                      ].join(' ')}
                    >
                      {s.label}
                    </div>
                    <div className="text-xs text-gray-400 truncate">{s.desc}</div>
                  </div>
                </div>
              );
            })}
          </nav>
        </div>

        {/* Right content */}
        <div className="flex-1 min-w-0 p-8">
          {/* Step 0: Welcome */}
          {step === 0 && (
            <div className="h-full flex flex-col justify-center">
              {/* Illustration placeholder */}
              <div className="w-full h-36 rounded-xl bg-gradient-to-br from-primary-400 via-primary-500 to-purple-600 mb-6 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-24 h-24 rounded-full border-2 border-white"
                      style={{ top: `${20 + i * 8}%`, left: `${10 + i * 15}%`, opacity: 0.4 - i * 0.05 }}
                    />
                  ))}
                </div>
                <div className="text-center text-white relative z-10">
                  <Sparkles className="w-10 h-10 mx-auto mb-2 opacity-90" />
                  <p className="text-sm font-medium opacity-80">Performance story engine</p>
                </div>
              </div>

              <h1 className="text-2xl font-bold text-gray-800 mb-2">
                Your work tells a story.
              </h1>
              <p className="text-gray-500 text-sm leading-relaxed mb-8">
                Connect the tools you use every day. We'll analyze your activity and generate a compelling performance narrative — backed by real evidence from your work.
              </p>

              <div className="grid grid-cols-2 gap-3 mb-8">
                <div className="bg-primary-50 p-3 rounded-xl">
                  <div className="text-lg font-bold text-primary-600">{totalActivityCount}+</div>
                  <div className="text-xs text-gray-500">activities tracked</div>
                </div>
                <div className="bg-emerald-50 p-3 rounded-xl">
                  <div className="text-lg font-bold text-emerald-600">90 days</div>
                  <div className="text-xs text-gray-500">of context analyzed</div>
                </div>
              </div>

              <button
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-semibold text-sm transition-colors"
              >
                Connect your tools <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Step 1: Tool selection with toggle switches */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-1">Select integrations</h2>
              <p className="text-sm text-gray-500 mb-6">
                Toggle the tools you use. We need at least 2 to generate a meaningful story.
              </p>

              <div className="space-y-3 mb-6">
                {mockTools.map((tool) => {
                  const isOn = selectedTools.has(tool.id);
                  return (
                    <div
                      key={tool.id}
                      onClick={() => toggleTool(tool.id)}
                      className={[
                        'flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-sm',
                        isOn ? 'border-primary-300 bg-primary-50' : 'border-gray-200 bg-white hover:border-gray-300',
                      ].join(' ')}
                    >
                      <span
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                        style={{ backgroundColor: tool.color }}
                      >
                        {TOOL_ICONS[tool.id]}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-800">{tool.name}</div>
                        <div className="text-xs text-gray-500">{tool.activityCount} {tool.activityLabel}</div>
                      </div>
                      {/* Toggle pill */}
                      <div
                        className={[
                          'relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0',
                          isOn ? 'bg-primary-500' : 'bg-gray-200',
                        ].join(' ')}
                      >
                        <div
                          className={[
                            'absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-200',
                            isOn ? 'left-6' : 'left-1',
                          ].join(' ')}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                disabled={selectedTools.size < 2}
                onClick={handleConnect}
                className={[
                  'w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2',
                  selectedTools.size >= 2
                    ? 'bg-primary-500 hover:bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed',
                ].join(' ')}
              >
                {selectedTools.size >= 2 ? `Sync ${selectedTools.size} tools` : 'Select 2+ tools to continue'}
              </button>
            </div>
          )}

          {/* Step 2: Staggered sync list */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-1">Importing activity</h2>
              <p className="text-sm text-gray-500 mb-6">
                Fetching data from your connected tools...
              </p>

              <div className="space-y-3">
                {Array.from(selectedTools).map((id) => {
                  const tool = mockTools.find((t) => t.id === id)!;
                  const isDone = syncedTools.has(id);
                  return (
                    <div
                      key={id}
                      className={[
                        'flex items-center gap-3 p-4 rounded-xl border transition-all duration-300',
                        isDone ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-200',
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
                          {isDone ? `${tool.activityCount} ${tool.activityLabel} imported` : 'Connecting...'}
                        </div>
                      </div>
                      {isDone ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                      ) : (
                        <Loader2 className="w-5 h-5 text-gray-400 animate-spin flex-shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 p-3 bg-primary-50 rounded-xl text-center text-xs text-primary-600 font-medium">
                Generating your performance story...
              </div>
            </div>
          )}

          {/* Step 3: Story */}
          {step === 3 && (
            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <Badge className="mb-2 text-xs">Story Generated</Badge>
                  <h2 className="text-lg font-bold text-gray-800 leading-snug">
                    {story.title}
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">{story.dateRange}</p>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <div className="text-xs text-gray-400">Confidence</div>
                  <div className="text-2xl font-bold text-primary-500">
                    {Math.round(story.confidence * 100)}%
                  </div>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                {story.sections.map((section) => {
                  const colors = SECTION_COLORS[section.label] ?? {
                    bg: 'bg-gray-50', accent: 'text-gray-600', text: 'border-gray-200',
                  };
                  return (
                    <div key={section.label} className={`${colors.bg} border ${colors.text} rounded-xl p-4`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-bold uppercase tracking-wider ${colors.accent}`}>
                          {section.label}
                        </span>
                        <span className="text-xs text-gray-400">{section.evidenceCount} evidence points</span>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">{section.text}</p>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={handleExport}
                className={[
                  'w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2',
                  exported ? 'bg-emerald-500 text-white' : 'bg-primary-500 hover:bg-primary-600 text-white',
                ].join(' ')}
              >
                {exported ? (
                  <><CheckCircle2 className="w-4 h-4" /> Export Started</>
                ) : (
                  <><FileDown className="w-4 h-4" /> Export as PDF</>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
