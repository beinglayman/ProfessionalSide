import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { mockTools, mockStories, SYNC_DELAY, CONNECT_DELAY, totalActivityCount } from './mock-data';
import type { ToolId } from './mock-data';
import {
  GitBranch,
  KanbanSquare,
  FileText,
  Hash,
  Figma,
  Video,
  CalendarDays,
  AlertTriangle,
  Check,
  Copy,
  CheckCircle2,
  CalendarPlus,
  ArrowRight,
  Clock,
} from 'lucide-react';

const TOOL_ICONS: Record<string, React.ReactNode> = {
  github: <GitBranch className="w-4 h-4" />,
  jira: <KanbanSquare className="w-4 h-4" />,
  confluence: <FileText className="w-4 h-4" />,
  slack: <Hash className="w-4 h-4" />,
  figma: <Figma className="w-4 h-4" />,
  'google-meet': <Video className="w-4 h-4" />,
};

const SECTION_STYLES: Record<string, { border: string; bg: string; label: string; time: string }> = {
  Situation: { border: 'border-l-blue-400', bg: 'bg-blue-50', label: 'text-blue-700', time: 'Oct 2025' },
  Task: { border: 'border-l-amber-400', bg: 'bg-amber-50', label: 'text-amber-700', time: 'Oct–Nov 2025' },
  Action: { border: 'border-l-purple-400', bg: 'bg-purple-50', label: 'text-purple-700', time: 'Nov 2025' },
  Result: { border: 'border-l-emerald-400', bg: 'bg-emerald-50', label: 'text-emerald-700', time: 'Dec 2025' },
  Challenge: { border: 'border-l-orange-400', bg: 'bg-orange-50', label: 'text-orange-700', time: 'Sep–Oct 2025' },
};

// Calendar data for current month (March 2026 based on currentDate)
const CALENDAR_YEAR = 2026;
const DAYS_IN_MONTH = 31;
const FIRST_DAY_OF_WEEK = 0; // Sunday (March 1 2026 is a Sunday)
const DEADLINE_DAY = 15; // Highlighted as review deadline
const TODAY_DAY = 3; // March 3 2026

type Step = 'calendar' | 'generating' | 'story';

export function OnboardingV19() {
  const [step, setStep] = useState<Step>('calendar');
  const [selectedTools, setSelectedTools] = useState<Set<ToolId>>(new Set());
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncLabel, setSyncLabel] = useState('Connecting...');
  const [copied, setCopied] = useState(false);
  const [addedToCalendar, setAddedToCalendar] = useState(false);
  const [showTools, setShowTools] = useState(false);

  const story = mockStories[0];
  const daysUntilDeadline = DEADLINE_DAY - TODAY_DAY; // 12

  useEffect(() => {
    if (step !== 'generating') return;
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
        if (tool) setSyncLabel(`Scanning ${tool.name}...`);
      }
      if (elapsed >= total) {
        clearInterval(ticker);
        setSyncLabel('Review draft ready');
        setTimeout(() => setStep('story'), 400);
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

  const handleConnectAndGenerate = () => {
    setTimeout(() => setStep('generating'), CONNECT_DELAY);
  };

  const handleCopy = () => {
    const text = `Performance Review Draft — Q4 2025\n\n${story.title}\n\n${story.sections.map((s) => `${s.label}:\n${s.text}`).join('\n\n')}`;
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleAddToCalendar = () => {
    setAddedToCalendar(true);
    setTimeout(() => setAddedToCalendar(false), 2500);
  };

  // Build calendar grid
  const calendarCells: (number | null)[] = [];
  for (let i = 0; i < FIRST_DAY_OF_WEEK; i++) calendarCells.push(null);
  for (let d = 1; d <= DAYS_IN_MONTH; d++) calendarCells.push(d);
  while (calendarCells.length % 7 !== 0) calendarCells.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < calendarCells.length; i += 7) {
    weeks.push(calendarCells.slice(i, i + 7));
  }

  const urgencyDays = daysUntilDeadline <= 7 ? 'red' : daysUntilDeadline <= 14 ? 'amber' : 'gray';
  const urgencyClass = urgencyDays === 'red'
    ? 'bg-red-50 border-red-200 text-red-700'
    : urgencyDays === 'amber'
    ? 'bg-amber-50 border-amber-200 text-amber-700'
    : 'bg-gray-50 border-gray-200 text-gray-700';
  const urgencyBadge = urgencyDays === 'red'
    ? 'bg-red-100 text-red-700'
    : 'bg-amber-100 text-amber-700';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-md space-y-4">

        {/* Urgency banner */}
        <div className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${urgencyClass}`}>
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold">Performance reviews due in {daysUntilDeadline} days</p>
            <p className="text-xs opacity-80 mt-0.5">Deadline: March {DEADLINE_DAY}, {CALENDAR_YEAR}</p>
          </div>
          <Badge className={`text-xs font-semibold shrink-0 ${urgencyBadge} border-0`}>
            {daysUntilDeadline}d left
          </Badge>
        </div>

        {/* Calendar card */}
        {step === 'calendar' && (
          <Card className="shadow-md overflow-hidden">
            <CardHeader className="pb-2 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-primary-500" />
                  <CardTitle className="text-sm font-bold text-gray-800">
                    March {CALENDAR_YEAR}
                  </CardTitle>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-primary-200" /> Today</div>
                  <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-red-400" /> Deadline</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-3 pb-4">
              {/* Day headers */}
              <div className="grid grid-cols-7 mb-1">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                  <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
                ))}
              </div>
              {/* Calendar grid */}
              <div className="space-y-0.5">
                {weeks.map((week, wi) => (
                  <div key={wi} className="grid grid-cols-7">
                    {week.map((day, di) => {
                      const isDeadline = day === DEADLINE_DAY;
                      const isToday = day === TODAY_DAY;
                      const isRange = day !== null && day > TODAY_DAY && day < DEADLINE_DAY;

                      return (
                        <div key={di} className="flex items-center justify-center py-0.5 px-0.5">
                          {day !== null ? (
                            <div className={[
                              'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium transition-all',
                              isDeadline ? 'bg-red-500 text-white font-bold shadow-md shadow-red-200' : '',
                              isToday ? 'bg-primary-500 text-white font-bold ring-2 ring-primary-200' : '',
                              isRange ? 'bg-amber-50 text-amber-600' : '',
                              !isDeadline && !isToday && !isRange ? 'text-gray-600 hover:bg-gray-100' : '',
                            ].join(' ')}>
                              {day}
                            </div>
                          ) : (
                            <div className="w-8 h-8" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* CTA section */}
              <div className="mt-4 border-t border-gray-100 pt-4 space-y-3">
                <p className="text-sm text-gray-600 font-medium text-center">
                  Don't start from scratch — let your work build your review
                </p>
                <p className="text-xs text-gray-400 text-center">
                  We'll scan {totalActivityCount}+ activities from your tools
                </p>

                {!showTools ? (
                  <button
                    onClick={() => setShowTools(true)}
                    className="w-full py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-md shadow-primary-500/20"
                  >
                    <CalendarDays className="w-4 h-4" />
                    Generate my review
                  </button>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Select your tools</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {mockTools.map((tool) => {
                        const isSel = selectedTools.has(tool.id);
                        return (
                          <button
                            key={tool.id}
                            onClick={() => toggleTool(tool.id)}
                            className={[
                              'flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all',
                              isSel
                                ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm'
                                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300',
                            ].join(' ')}
                          >
                            <span className="w-4 h-4 rounded flex items-center justify-center text-white shrink-0" style={{ backgroundColor: tool.color }}>
                              {TOOL_ICONS[tool.id]}
                            </span>
                            {tool.name}
                            {isSel && <Check className="w-3 h-3 text-primary-500 ml-auto" />}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      disabled={selectedTools.size < 1}
                      onClick={handleConnectAndGenerate}
                      className={[
                        'w-full py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2',
                        selectedTools.size >= 1
                          ? 'bg-primary-500 hover:bg-primary-600 text-white shadow-md shadow-primary-500/20'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed',
                      ].join(' ')}
                    >
                      {selectedTools.size >= 1 ? (
                        <>Generate review draft <ArrowRight className="w-4 h-4" /></>
                      ) : (
                        'Select at least one tool'
                      )}
                    </button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Generating state */}
        {step === 'generating' && (
          <Card className="shadow-md">
            <CardContent className="py-8 flex flex-col items-center gap-4">
              <div className="relative w-14 h-14 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-primary-100" />
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary-500 animate-spin" />
                <CalendarDays className="w-6 h-6 text-primary-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-700">{syncLabel}</p>
                <p className="text-xs text-gray-400 mt-1">Building your Q4 2025 review draft...</p>
              </div>
              <div className="w-full">
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full transition-all duration-150"
                    style={{ width: `${syncProgress}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-xs text-gray-400">Analyzing {totalActivityCount}+ activities</span>
                  <span className="text-xs text-gray-500 font-medium">{Math.round(syncProgress)}%</span>
                </div>
              </div>
              <div className="flex flex-wrap justify-center gap-1.5">
                {Array.from(selectedTools).map((id) => {
                  const tool = mockTools.find((t) => t.id === id)!;
                  return (
                    <span key={id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-xs text-gray-600">
                      <span className="w-3 h-3 rounded" style={{ backgroundColor: tool.color }} />
                      {tool.name}
                    </span>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Story — review draft */}
        {step === 'story' && (
          <Card className="shadow-md overflow-hidden">
            <CardHeader className="pb-3 bg-gradient-to-r from-primary-50 to-primary-100 border-b border-primary-200">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <CalendarDays className="w-4 h-4 text-primary-500" />
                    <Badge className="text-xs bg-white text-primary-700 border-primary-200">
                      Draft for Q4 2025 Review
                    </Badge>
                  </div>
                  <CardTitle className="text-base text-gray-800 leading-snug">{story.title}</CardTitle>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-xs text-gray-400">Confidence</div>
                  <div className="text-base font-bold text-primary-600">{Math.round(story.confidence * 100)}%</div>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>Evidence from Oct–Dec 2025</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  <span>Due March {DEADLINE_DAY} · {daysUntilDeadline} days</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {story.sections.map((section) => {
                const style = SECTION_STYLES[section.label] ?? { border: 'border-l-gray-300', bg: 'bg-gray-50', label: 'text-gray-600', time: '' };
                return (
                  <div
                    key={section.label}
                    className={`border-l-4 ${style.border} ${style.bg} rounded-r-xl p-3`}
                  >
                    <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                      <span className={`text-xs font-bold uppercase tracking-widest ${style.label}`}>
                        {section.label}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {style.time}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {section.evidenceCount} signals
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{section.text}</p>
                  </div>
                );
              })}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleAddToCalendar}
                  className={[
                    'flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2',
                    addedToCalendar
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-800 hover:bg-gray-700 text-white',
                  ].join(' ')}
                >
                  {addedToCalendar ? (
                    <><CheckCircle2 className="w-4 h-4" /> Added!</>
                  ) : (
                    <><CalendarPlus className="w-4 h-4" /> Add to calendar</>
                  )}
                </button>
                <button
                  onClick={handleCopy}
                  className={[
                    'flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 border',
                    copied
                      ? 'border-emerald-400 text-emerald-600 bg-emerald-50'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white',
                  ].join(' ')}
                >
                  {copied ? (
                    <><Check className="w-4 h-4" /> Copied</>
                  ) : (
                    <><Copy className="w-4 h-4" /> Copy draft</>
                  )}
                </button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
