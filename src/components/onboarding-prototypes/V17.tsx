import { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { mockTools, mockStories, mockActivities, SYNC_DELAY, CONNECT_DELAY } from './mock-data';
import type { ToolId } from './mock-data';
import {
  GitBranch,
  KanbanSquare,
  FileText,
  Hash,
  Figma,
  Video,
  Loader2,
  ArrowRight,
  Check,
  Copy,
  CheckCircle2,
  Zap,
} from 'lucide-react';

const TOOL_ICONS: Record<string, React.ReactNode> = {
  github: <GitBranch className="w-3.5 h-3.5" />,
  jira: <KanbanSquare className="w-3.5 h-3.5" />,
  confluence: <FileText className="w-3.5 h-3.5" />,
  slack: <Hash className="w-3.5 h-3.5" />,
  figma: <Figma className="w-3.5 h-3.5" />,
  'google-meet': <Video className="w-3.5 h-3.5" />,
};

// Map activity index → story section index for visual connections
const ACTIVITY_TO_SECTION: Record<number, number> = {
  0: 2, // PR Merged → Action
  1: 2, // Code Review → Action
  2: 1, // Ticket Closed → Task
  3: 1, // Sprint Complete → Task
  4: 0, // Page Published → Situation
  5: 2, // Slack Thread → Action
  6: 3, // Design Review → Result
  7: 3, // Presentation → Result
};

const SECTION_COLORS = [
  { border: 'border-blue-400', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-400', line: '#60a5fa' },
  { border: 'border-amber-400', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400', line: '#fbbf24' },
  { border: 'border-purple-400', bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-400', line: '#a78bfa' },
  { border: 'border-emerald-400', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400', line: '#34d399' },
];

type Step = 'select' | 'connecting' | 'syncing' | 'revealed';

export function OnboardingV17() {
  const [step, setStep] = useState<Step>('select');
  const [selectedTools, setSelectedTools] = useState<Set<ToolId>>(new Set());
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncLabel, setSyncLabel] = useState('Connecting...');
  const [copied, setCopied] = useState(false);
  const [hoveredActivity, setHoveredActivity] = useState<number | null>(null);
  const [hoveredSection, setHoveredSection] = useState<number | null>(null);
  const [visibleSections, setVisibleSections] = useState<Set<number>>(new Set());

  const story = mockStories[0];
  const isRevealed = step === 'revealed';
  const isLoading = step === 'connecting' || step === 'syncing';

  useEffect(() => {
    if (step !== 'syncing') return;
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
        setSyncLabel('Done');
        // Reveal sections one by one
        const revealOrder = [0, 1, 2, 3];
        revealOrder.forEach((i, idx) => {
          setTimeout(() => {
            setVisibleSections((prev) => new Set([...prev, i]));
          }, idx * 200);
        });
        setTimeout(() => setStep('revealed'), 900);
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
    setStep('connecting');
    setTimeout(() => setStep('syncing'), CONNECT_DELAY);
  };

  const handleCopy = () => {
    const text = story.sections.map((s) => `${s.label}:\n${s.text}`).join('\n\n');
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Determine which section is highlighted based on hover state
  const highlightedSection =
    hoveredActivity !== null ? ACTIVITY_TO_SECTION[hoveredActivity] : hoveredSection;
  const highlightedActivity =
    hoveredSection !== null
      ? Object.entries(ACTIVITY_TO_SECTION)
          .filter(([, sec]) => sec === hoveredSection)
          .map(([act]) => Number(act))
      : hoveredActivity !== null
      ? [hoveredActivity]
      : [];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10 px-4">
      {/* Header */}
      <div className="w-full max-w-5xl mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800">Evidence Mapping</h1>
            <p className="text-xs text-gray-500">See exactly how your raw work becomes your story</p>
          </div>
          {isRevealed && (
            <Badge className="ml-auto bg-emerald-100 text-emerald-700 border-emerald-200">
              {mockActivities.length} activities mapped
            </Badge>
          )}
        </div>
      </div>

      {/* Tool selection bar (shown before connected) */}
      {step === 'select' && (
        <div className="w-full max-w-5xl mb-6">
          <Card className="shadow-sm">
            <CardContent className="py-4">
              <p className="text-sm font-medium text-gray-700 mb-3">Connect tools to map your evidence</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {mockTools.map((tool) => {
                  const isSelected = selectedTools.has(tool.id);
                  return (
                    <button
                      key={tool.id}
                      onClick={() => toggleTool(tool.id)}
                      className={[
                        'flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all',
                        isSelected
                          ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300',
                      ].join(' ')}
                    >
                      <span className="w-5 h-5 rounded flex items-center justify-center text-white" style={{ backgroundColor: mockTools.find((t) => t.id === tool.id)!.color }}>
                        {TOOL_ICONS[tool.id]}
                      </span>
                      {tool.name}
                      {isSelected && <Check className="w-3 h-3 text-primary-500" />}
                    </button>
                  );
                })}
              </div>
              <button
                disabled={selectedTools.size < 1}
                onClick={handleConnect}
                className={[
                  'flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all',
                  selectedTools.size >= 1
                    ? 'bg-primary-500 hover:bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed',
                ].join(' ')}
              >
                Map my evidence <ArrowRight className="w-4 h-4" />
              </button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="w-full max-w-5xl mb-6">
          <Card className="shadow-sm">
            <CardContent className="py-6 flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">{syncLabel}</p>
                <div className="mt-2 w-64 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full transition-all duration-150"
                    style={{ width: step === 'syncing' ? `${syncProgress}%` : '15%' }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Two-column evidence map */}
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Raw Evidence */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-gray-400" />
            <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wide">Raw Evidence</h2>
            <Badge variant="secondary" className="text-xs">{mockActivities.length} activities</Badge>
          </div>
          <div className="space-y-2">
            {mockActivities.map((activity, idx) => {
              const tool = mockTools.find((t) => t.id === activity.tool)!;
              const sectionIdx = ACTIVITY_TO_SECTION[idx];
              const sectionColor = SECTION_COLORS[sectionIdx];
              const isHighlighted = isRevealed && highlightedActivity.includes(idx);
              const isConnected = isRevealed;

              return (
                <div
                  key={idx}
                  onMouseEnter={() => isRevealed && setHoveredActivity(idx)}
                  onMouseLeave={() => setHoveredActivity(null)}
                  className={[
                    'rounded-xl border bg-white p-3 cursor-default transition-all duration-200',
                    isHighlighted
                      ? `${sectionColor.border} shadow-md`
                      : 'border-gray-200 hover:border-gray-300',
                    isConnected && !isHighlighted ? 'opacity-80' : '',
                  ].join(' ')}
                >
                  <div className="flex items-start gap-2">
                    <span
                      className="w-6 h-6 rounded-md flex items-center justify-center text-white shrink-0 mt-0.5"
                      style={{ backgroundColor: tool.color }}
                    >
                      {TOOL_ICONS[activity.tool]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="secondary"
                          className={`text-xs ${isHighlighted && isRevealed ? `${sectionColor.bg} ${sectionColor.text} border-0` : ''}`}
                        >
                          {activity.type}
                        </Badge>
                        <span className="text-xs text-gray-400">{activity.date}</span>
                      </div>
                      <p className="text-xs font-medium text-gray-700 mt-1 leading-tight truncate">{activity.title}</p>
                      {activity.meta && (
                        <span className="text-xs text-gray-400 mt-0.5 block">{activity.meta}</span>
                      )}
                    </div>
                    {isConnected && (
                      <div className="shrink-0 flex items-center">
                        <div className={`w-2 h-2 rounded-full ${sectionColor.dot} ${isHighlighted ? 'ring-2 ring-offset-1' : ''}`} style={{ ringColor: sectionColor.line }} />
                        <div className={`h-px w-4 ${isHighlighted ? '' : 'opacity-30'}`} style={{ backgroundColor: sectionColor.line }} />
                        <ArrowRight className="w-3 h-3" style={{ color: sectionColor.line, opacity: isHighlighted ? 1 : 0.3 }} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Generated Story */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-primary-400" />
            <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wide">Generated Story</h2>
            {isRevealed && (
              <Badge className="text-xs bg-primary-50 text-primary-700 border-primary-200">
                {Math.round(story.confidence * 100)}% confidence
              </Badge>
            )}
          </div>

          {!isRevealed && !isLoading && (
            <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-8 flex flex-col items-center justify-center text-center min-h-[320px]">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <FileText className="w-5 h-5 text-gray-300" />
              </div>
              <p className="text-sm text-gray-400">Your generated story will appear here</p>
              <p className="text-xs text-gray-300 mt-1">Connect tools to see evidence mapped to sections</p>
            </div>
          )}

          {isLoading && (
            <div className="rounded-xl border-2 border-dashed border-primary-200 bg-primary-50 p-8 flex flex-col items-center justify-center min-h-[320px]">
              <Loader2 className="w-6 h-6 text-primary-400 animate-spin mb-3" />
              <p className="text-sm text-primary-600">Generating story sections...</p>
            </div>
          )}

          {(isRevealed || visibleSections.size > 0) && (
            <div className="space-y-3">
              <div className="bg-white rounded-xl border border-gray-200 p-4 mb-2">
                <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Story Title</p>
                <h3 className="text-sm font-bold text-gray-800 leading-snug">{story.title}</h3>
                <p className="text-xs text-gray-400 mt-1">{story.dateRange}</p>
              </div>
              {story.sections.map((section, idx) => {
                const color = SECTION_COLORS[idx] ?? SECTION_COLORS[0];
                const isVisible = visibleSections.has(idx) || isRevealed;
                const isHighlighted = highlightedSection === idx;

                return (
                  <div
                    key={section.label}
                    onMouseEnter={() => isRevealed && setHoveredSection(idx)}
                    onMouseLeave={() => setHoveredSection(null)}
                    className={[
                      'rounded-xl border-l-4 p-3 bg-white transition-all duration-300 cursor-default',
                      color.border,
                      isHighlighted ? 'shadow-md scale-[1.01]' : 'shadow-sm',
                      isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4',
                    ].join(' ')}
                    style={{
                      transition: 'opacity 0.3s ease, transform 0.3s ease, box-shadow 0.2s ease',
                      transitionDelay: isVisible ? `${idx * 100}ms` : '0ms',
                    }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-xs font-bold uppercase tracking-widest ${color.text}`}>
                        {section.label}
                      </span>
                      <Badge
                        variant="secondary"
                        className={`text-xs ${isHighlighted ? `${color.bg} ${color.text} border-0` : ''}`}
                      >
                        {section.evidenceCount} signals
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-700 leading-relaxed">{section.text}</p>
                  </div>
                );
              })}

              {isRevealed && (
                <button
                  onClick={handleCopy}
                  className={[
                    'w-full py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 mt-2',
                    copied
                      ? 'bg-emerald-500 text-white'
                      : 'bg-primary-500 hover:bg-primary-600 text-white',
                  ].join(' ')}
                >
                  {copied ? (
                    <><CheckCircle2 className="w-4 h-4" /> Copied!</>
                  ) : (
                    <><Copy className="w-4 h-4" /> Copy Story</>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      {isRevealed && (
        <div className="w-full max-w-5xl mt-6 flex flex-wrap items-center gap-4">
          <span className="text-xs text-gray-400 uppercase tracking-wide">Section colors:</span>
          {story.sections.map((section, idx) => {
            const color = SECTION_COLORS[idx];
            return (
              <div key={section.label} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-full ${color.dot}`} />
                <span className="text-xs text-gray-500">{section.label}</span>
              </div>
            );
          })}
          <span className="text-xs text-gray-400 ml-auto">Hover evidence or sections to highlight connections</span>
        </div>
      )}
    </div>
  );
}
