import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  mockTools,
  mockStories,
  mockActivities,
  SYNC_DELAY,
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
  Check,
  ArrowRight,
  Zap,
} from 'lucide-react';

const TOOL_ICONS: Record<string, React.ReactNode> = {
  github: <GitBranch className="w-5 h-5" />,
  jira: <KanbanSquare className="w-5 h-5" />,
  confluence: <FileText className="w-5 h-5" />,
  slack: <Hash className="w-5 h-5" />,
  figma: <Figma className="w-5 h-5" />,
  'google-meet': <Video className="w-5 h-5" />,
};

const STEPS = ['Welcome', 'Connect', 'Sync', 'Story'] as const;
type Step = 0 | 1 | 2 | 3;

const SECTION_COLORS: Record<string, string> = {
  Situation: 'bg-blue-50 border-l-4 border-blue-400',
  Task: 'bg-yellow-50 border-l-4 border-yellow-400',
  Action: 'bg-purple-50 border-l-4 border-purple-400',
  Result: 'bg-emerald-50 border-l-4 border-emerald-400',
  Challenge: 'bg-orange-50 border-l-4 border-orange-400',
};

export function OnboardingV1() {
  const [step, setStep] = useState<Step>(0);
  const [selectedTools, setSelectedTools] = useState<Set<ToolId>>(new Set());
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncLabel, setSyncLabel] = useState('Initializing...');
  const [copied, setCopied] = useState(false);

  const story = mockStories[0];

  // Syncing simulation
  useEffect(() => {
    if (step !== 2) return;

    setSyncProgress(0);
    const selectedArr = Array.from(selectedTools);
    let elapsed = 0;
    const interval = 80;
    const total = SYNC_DELAY;
    let labelIndex = 0;

    const ticker = setInterval(() => {
      elapsed += interval;
      const pct = Math.min((elapsed / total) * 100, 100);
      setSyncProgress(pct);

      const labelStep = Math.floor((elapsed / total) * selectedArr.length);
      if (labelStep !== labelIndex && labelStep < selectedArr.length) {
        labelIndex = labelStep;
        const tool = mockTools.find((t) => t.id === selectedArr[labelIndex]);
        if (tool) setSyncLabel(`Analyzing ${tool.name}...`);
      }

      if (elapsed >= total) {
        clearInterval(ticker);
        setSyncLabel(`Found ${mockActivities.length} activities`);
        setTimeout(() => setStep(3), 400);
      }
    }, interval);

    return () => clearInterval(ticker);
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
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4">
      {/* Header stepper */}
      <div className="w-full max-w-2xl mb-10">
        <div className="flex items-center">
          {STEPS.map((label, i) => {
            const isCompleted = step > i;
            const isActive = step === i;
            return (
              <div key={label} className="flex items-center flex-1 last:flex-none">
                {/* Circle */}
                <div className="flex flex-col items-center">
                  <div
                    className={[
                      'w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300',
                      isCompleted
                        ? 'bg-emerald-500 text-white'
                        : isActive
                        ? 'bg-primary-500 text-white ring-4 ring-primary-200'
                        : 'bg-gray-200 text-gray-400',
                    ].join(' ')}
                  >
                    {isCompleted ? <Check className="w-4 h-4" /> : i + 1}
                  </div>
                  <span
                    className={[
                      'mt-2 text-xs font-medium whitespace-nowrap',
                      isActive ? 'text-primary-600' : isCompleted ? 'text-emerald-600' : 'text-gray-400',
                    ].join(' ')}
                  >
                    {label}
                  </span>
                </div>
                {/* Connector line */}
                {i < STEPS.length - 1 && (
                  <div className="flex-1 h-0.5 mx-2 mb-5 bg-gray-200 relative overflow-hidden rounded">
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

      {/* Step content */}
      <div className="w-full max-w-2xl">
        {/* Step 0: Welcome */}
        {step === 0 && (
          <Card className="shadow-lg">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-md">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl text-gray-800">
                Build your performance story
              </CardTitle>
              <p className="text-gray-500 mt-2 text-sm leading-relaxed">
                Connect your work tools and let inchronicle surface the impact you've made — ready to drop into your next review or promotion doc.
              </p>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-3 gap-3 mb-6">
                {([
                  { label: 'Tools supported', value: '6+' },
                  { label: 'Activities tracked', value: `${totalActivityCount}+` },
                  { label: 'Minutes to setup', value: '< 2' },
                ] as const).map((stat) => (
                  <div key={stat.label} className="bg-primary-50 rounded-xl p-3 text-center">
                    <div className="text-xl font-bold text-primary-600">{stat.value}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setStep(1)}
                className="w-full py-3 rounded-xl bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
              >
                Get Started <ArrowRight className="w-4 h-4" />
              </button>
            </CardContent>
          </Card>
        )}

        {/* Step 1: Tool Selection */}
        {step === 1 && (
          <Card className="shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl text-gray-800">Connect your tools</CardTitle>
              <p className="text-sm text-gray-500">
                Select 2 or more tools to analyze. We'll look at the last 90 days of activity.
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                {mockTools.map((tool) => {
                  const isSelected = selectedTools.has(tool.id);
                  return (
                    <button
                      key={tool.id}
                      onClick={() => toggleTool(tool.id)}
                      className={[
                        'relative flex flex-col gap-2 p-4 rounded-xl border-2 text-left transition-all duration-200 hover:shadow-md',
                        isSelected
                          ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                          : 'border-gray-200 bg-white hover:border-gray-300',
                      ].join(' ')}
                    >
                      {isSelected && (
                        <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </span>
                      )}
                      <span
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                        style={{ backgroundColor: tool.color }}
                      >
                        {TOOL_ICONS[tool.id]}
                      </span>
                      <span className="font-semibold text-gray-800 text-sm">{tool.name}</span>
                      <span className="text-xs text-gray-500 leading-snug">{tool.description}</span>
                      <Badge variant="secondary" className="self-start text-xs">
                        {tool.activityCount} {tool.activityLabel}
                      </Badge>
                    </button>
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
                {selectedTools.size >= 2
                  ? `Continue with ${selectedTools.size} tools`
                  : 'Select at least 2 tools'}
                {selectedTools.size >= 2 && <ArrowRight className="w-4 h-4" />}
              </button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Syncing */}
        {step === 2 && (
          <Card className="shadow-lg">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-xl text-gray-800">Syncing your activity</CardTitle>
              <p className="text-sm text-gray-500">
                Connecting to {selectedTools.size} tool{selectedTools.size !== 1 ? 's' : ''}...
              </p>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-6">
              {/* Spinner */}
              <div className="relative flex items-center justify-center w-20 h-20">
                <div className="absolute inset-0 rounded-full border-4 border-primary-100" />
                <div
                  className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary-500 animate-spin"
                  style={{ animationDuration: '0.9s' }}
                />
                <Loader2 className="w-7 h-7 text-primary-400 animate-spin" style={{ animationDuration: '1.4s' }} />
              </div>

              {/* Progress bar */}
              <div className="w-full">
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full transition-all duration-150"
                    style={{ width: `${syncProgress}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-xs text-gray-500">{syncLabel}</span>
                  <span className="text-xs text-gray-400">{Math.round(syncProgress)}%</span>
                </div>
              </div>

              {/* Tool pills */}
              <div className="flex flex-wrap justify-center gap-2">
                {Array.from(selectedTools).map((id) => {
                  const tool = mockTools.find((t) => t.id === id)!;
                  return (
                    <span key={id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-xs font-medium text-gray-600">
                      <span className="w-4 h-4" style={{ color: tool.color }}>{TOOL_ICONS[id]}</span>
                      {tool.name}
                    </span>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Story */}
        {step === 3 && (
          <Card className="shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Badge className="mb-3 text-xs">Performance Story</Badge>
                  <CardTitle className="text-xl text-gray-800 leading-snug">
                    {story.title}
                  </CardTitle>
                  <p className="text-sm text-gray-400 mt-1">{story.dateRange}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-xs text-gray-400">Confidence</span>
                  <span className="text-lg font-bold text-primary-600">
                    {Math.round(story.confidence * 100)}%
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {story.sections.map((section) => (
                <div
                  key={section.label}
                  className={[
                    'p-4 rounded-r-xl',
                    SECTION_COLORS[section.label] ?? 'bg-gray-50 border-l-4 border-gray-300',
                  ].join(' ')}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
                      {section.label}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {section.evidenceCount} signals
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{section.text}</p>
                </div>
              ))}

              <button
                onClick={handleCopy}
                className={[
                  'mt-4 w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2',
                  copied
                    ? 'bg-emerald-500 text-white'
                    : 'bg-primary-500 hover:bg-primary-600 text-white',
                ].join(' ')}
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Copied to Clipboard
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" /> Copy to Clipboard
                  </>
                )}
              </button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
