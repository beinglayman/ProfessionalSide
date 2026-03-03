import { useState, useEffect } from 'react';
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
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Layers,
  Check,
} from 'lucide-react';

const TOOL_ICONS: Record<string, React.ReactNode> = {
  github: <GitBranch className="w-5 h-5" />,
  jira: <KanbanSquare className="w-5 h-5" />,
  confluence: <FileText className="w-5 h-5" />,
  slack: <Hash className="w-5 h-5" />,
  figma: <Figma className="w-5 h-5" />,
  'google-meet': <Video className="w-5 h-5" />,
};

type Step = 0 | 1 | 2 | 3;

const TOTAL_STEPS = 4;

const SECTION_BADGE_COLORS: Record<string, string> = {
  Situation: 'bg-blue-100 text-blue-700',
  Task: 'bg-yellow-100 text-yellow-700',
  Action: 'bg-purple-100 text-purple-700',
  Result: 'bg-emerald-100 text-emerald-700',
  Challenge: 'bg-orange-100 text-orange-700',
};

export function OnboardingV3() {
  const [step, setStep] = useState<Step>(0);
  const [exiting, setExiting] = useState(false);
  const [selectedTools, setSelectedTools] = useState<Set<ToolId>>(new Set());
  const [syncAngle, setSyncAngle] = useState(0);
  const [copied, setCopied] = useState(false);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['Situation']));

  const story = mockStories[0];

  // Rotate spinner ring
  useEffect(() => {
    if (step !== 2) return;
    const raf = requestAnimationFrame(function tick() {
      setSyncAngle((prev) => (prev + 1.5) % 360);
      requestAnimationFrame(tick);
    });
    const done = setTimeout(() => {
      cancelAnimationFrame(raf);
      advanceStep();
    }, SYNC_DELAY);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(done);
    };
  }, [step]);

  const advanceStep = () => {
    setExiting(true);
    setTimeout(() => {
      setStep((prev) => Math.min(prev + 1, TOTAL_STEPS - 1) as Step);
      setExiting(false);
    }, 350);
  };

  const toggleTool = (id: ToolId) => {
    setSelectedTools((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const handleConnect = () => {
    setTimeout(() => advanceStep(), CONNECT_DELAY);
  };

  const toggleSection = (label: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(label)) { next.delete(label); } else { next.add(label); }
      return next;
    });
  };

  const handleCopy = () => {
    const text = story.sections.map((s) => `${s.label}:\n${s.text}`).join('\n\n');
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Tool positions in a ring around spinner
  const selectedArr = Array.from(selectedTools);
  const ringRadius = 80;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-primary-50 flex flex-col items-center justify-center py-12 px-4">
      {/* Card stack wrapper */}
      <div className="relative w-full max-w-lg" style={{ height: 520 }}>
        {/* Shadow cards (stacked behind) */}
        {[2, 1].map((offset) => (
          <div
            key={offset}
            className="absolute inset-x-0 bg-white rounded-2xl border border-gray-200 shadow-md"
            style={{
              top: offset * 8,
              left: offset * 6,
              right: -(offset * 6),
              bottom: -(offset * 8),
              zIndex: TOTAL_STEPS - offset,
              opacity: 0.6,
            }}
          />
        ))}

        {/* Active card */}
        <div
          className={[
            'absolute inset-0 bg-white rounded-2xl border border-gray-200 shadow-xl z-10 overflow-hidden transition-all duration-350',
            exiting ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0',
          ].join(' ')}
          style={{ transitionDuration: '350ms' }}
        >
          {/* Step 0: Welcome */}
          {step === 0 && (
            <div className="h-full flex flex-col">
              <div className="bg-gradient-to-br from-primary-500 to-purple-700 px-8 py-10 text-white">
                <div className="flex items-center gap-2 mb-4 opacity-80">
                  <Layers className="w-5 h-5" />
                  <span className="text-sm font-semibold tracking-wide">inchronicle</span>
                </div>
                <h1 className="text-2xl font-bold mb-2">Build your performance story</h1>
                <p className="text-primary-100 text-sm leading-relaxed">
                  Connect your tools. Let us turn your work activity into compelling, evidence-backed narratives.
                </p>
              </div>
              <div className="flex-1 p-8 flex flex-col justify-between">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="text-2xl font-bold text-primary-500 mb-1">{totalActivityCount}+</div>
                    <div className="text-xs text-gray-500">activities scanned</div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="text-2xl font-bold text-emerald-500 mb-1">6</div>
                    <div className="text-xs text-gray-500">tool integrations</div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="text-2xl font-bold text-yellow-500 mb-1">89%</div>
                    <div className="text-xs text-gray-500">avg. confidence score</div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="text-2xl font-bold text-blue-500 mb-1">&lt;2m</div>
                    <div className="text-xs text-gray-500">setup time</div>
                  </div>
                </div>
                <button
                  onClick={() => advanceStep()}
                  className="w-full mt-6 py-3 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                >
                  Get Started <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 1: Tool Grid */}
          {step === 1 && (
            <div className="h-full flex flex-col p-7">
              <h2 className="text-xl font-bold text-gray-800 mb-1">Choose your tools</h2>
              <p className="text-sm text-gray-500 mb-5">Select the tools you use daily. Select 2 or more.</p>

              <div className="grid grid-cols-3 gap-3 flex-1 content-start">
                {mockTools.map((tool) => {
                  const isSelected = selectedTools.has(tool.id);
                  return (
                    <button
                      key={tool.id}
                      onClick={() => toggleTool(tool.id)}
                      className={[
                        'relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md',
                        isSelected ? 'border-primary-500 bg-primary-50' : 'border-gray-200 bg-white hover:border-gray-300',
                      ].join(' ')}
                    >
                      {isSelected && (
                        <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </span>
                      )}
                      <span
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm"
                        style={{ backgroundColor: tool.color }}
                      >
                        {TOOL_ICONS[tool.id]}
                      </span>
                      <span className="text-xs font-semibold text-gray-700 text-center leading-tight">{tool.name}</span>
                      <span className="text-xs text-gray-400">{tool.activityCount}</span>
                    </button>
                  );
                })}
              </div>

              <button
                disabled={selectedTools.size < 2}
                onClick={handleConnect}
                className={[
                  'mt-5 w-full py-3 rounded-xl font-semibold text-sm transition-all',
                  selectedTools.size >= 2
                    ? 'bg-primary-500 hover:bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed',
                ].join(' ')}
              >
                {selectedTools.size >= 2 ? `Connect ${selectedTools.size} tools` : 'Select 2+ to continue'}
              </button>
            </div>
          )}

          {/* Step 2: Radial spinner */}
          {step === 2 && (
            <div className="h-full flex flex-col items-center justify-center gap-6 p-8">
              <h2 className="text-xl font-bold text-gray-800">Syncing your activity</h2>

              {/* Radial ring of tool icons */}
              <div className="relative w-56 h-56 flex items-center justify-center">
                {/* Outer rotating ring */}
                <div
                  className="absolute inset-2 rounded-full border-4 border-primary-100 border-t-primary-500"
                  style={{ transform: `rotate(${syncAngle}deg)`, transition: 'transform 16ms linear' }}
                />
                {/* Center spinner */}
                <Loader2 className="w-10 h-10 text-primary-500 animate-spin z-10" />

                {/* Tool icons orbiting */}
                {selectedArr.map((id, i) => {
                  const angle = (i / selectedArr.length) * 2 * Math.PI + (syncAngle * Math.PI) / 180 * 0.3;
                  const x = Math.cos(angle) * ringRadius;
                  const y = Math.sin(angle) * ringRadius;
                  const tool = mockTools.find((t) => t.id === id)!;
                  return (
                    <div
                      key={id}
                      className="absolute w-9 h-9 rounded-full flex items-center justify-center text-white shadow-md transition-transform duration-100"
                      style={{
                        backgroundColor: tool.color,
                        transform: `translate(${x}px, ${y}px)`,
                        left: 'calc(50% - 18px)',
                        top: 'calc(50% - 18px)',
                      }}
                    >
                      {TOOL_ICONS[id]}
                    </div>
                  );
                })}
              </div>

              <div className="text-center">
                <p className="text-sm font-semibold text-gray-700">Analyzing your activity...</p>
                <p className="text-xs text-gray-400 mt-1">
                  Reading {mockActivities.length} events across {selectedTools.size} tools
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Story with expandable sections */}
          {step === 3 && (
            <div className="h-full flex flex-col p-7 overflow-y-auto">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0 pr-4">
                  <Badge className="mb-2 text-xs">Story Ready</Badge>
                  <h2 className="text-base font-bold text-gray-800 leading-snug">{story.title}</h2>
                  <p className="text-xs text-gray-400 mt-1">{story.dateRange}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xs text-gray-400 mb-0.5">Confidence</div>
                  <div className="text-2xl font-bold text-primary-500">{Math.round(story.confidence * 100)}%</div>
                </div>
              </div>

              {/* Expandable sections */}
              <div className="space-y-2 flex-1">
                {story.sections.map((section) => {
                  const isOpen = openSections.has(section.label);
                  const badgeColor = SECTION_BADGE_COLORS[section.label] ?? 'bg-gray-100 text-gray-600';
                  return (
                    <div key={section.label} className="border border-gray-200 rounded-xl overflow-hidden">
                      <button
                        onClick={() => toggleSection(section.label)}
                        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${badgeColor}`}>
                            {section.label}
                          </span>
                          <span className="text-xs text-gray-400">{section.evidenceCount} signals</span>
                        </div>
                        {isOpen ? (
                          <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        )}
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-4 pt-1">
                          <p className="text-sm text-gray-700 leading-relaxed">{section.text}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <button
                onClick={handleCopy}
                className={[
                  'mt-4 w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2',
                  copied ? 'bg-emerald-500 text-white' : 'bg-primary-500 hover:bg-primary-600 text-white',
                ].join(' ')}
              >
                {copied ? <><CheckCircle2 className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy Story</>}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Dot pagination */}
      <div className="flex gap-2 mt-8">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div
            key={i}
            className={[
              'rounded-full transition-all duration-300',
              i === step ? 'w-6 h-2.5 bg-primary-500' : 'w-2.5 h-2.5 bg-gray-300',
            ].join(' ')}
          />
        ))}
      </div>
    </div>
  );
}
