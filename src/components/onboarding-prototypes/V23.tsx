import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { mockTools, mockStories, mockActivities, SYNC_DELAY, totalActivityCount } from './mock-data';
import type { ToolId } from './mock-data';
import {
  Mic, ChevronRight, Search, Star, CheckCircle2, BarChart3,
  AlertCircle, Video, KanbanSquare, Hash, GitBranch, FileText, Figma, Sparkles,
  Clock, BookOpen, LayoutDashboard, ArrowRight,
} from 'lucide-react';

type Phase = 'question' | 'pick-tool' | 'analyzing' | 'story' | 'enhanced' | 'handoff';
type HandoffTab = 'timeline' | 'stories' | 'dashboard';

const INTERVIEW_QUESTION = 'Tell me about a time you led a technical initiative that had a significant impact.';

const ANALYSIS_STEPS = [
  'Scanning commit history...',
  'Reading pull request reviews...',
  'Analyzing sprint data...',
  'Correlating timelines...',
  'Building STAR narrative...',
];

const SECTION_COLORS: Record<string, string> = {
  Situation: 'bg-blue-50 border-blue-200 text-blue-800',
  Task: 'bg-purple-50 border-purple-200 text-purple-800',
  Action: 'bg-amber-50 border-amber-200 text-amber-800',
  Result: 'bg-green-50 border-green-200 text-green-800',
};

const SECTION_LABEL_COLORS: Record<string, string> = {
  Situation: 'bg-blue-100 text-blue-700',
  Task: 'bg-purple-100 text-purple-700',
  Action: 'bg-amber-100 text-amber-700',
  Result: 'bg-green-100 text-green-700',
};

const TOOL_ICONS: Record<string, React.FC<{ size?: number; className?: string }>> = {
  GitBranch, KanbanSquare, FileText, Hash, Figma, Video,
};

const INITIAL_CONFIDENCE = 67;
const FULL_CONFIDENCE = 89;

const INITIAL_EVIDENCE: Record<string, number> = { Situation: 2, Task: 1, Action: 3, Result: 2 };
const FULL_EVIDENCE: Record<string, number> = { Situation: 4, Task: 3, Action: 8, Result: 5 };

const EVIDENCE_GAPS = [
  { iconName: 'Video', toolId: 'google-meet' as ToolId, gap: 'Meeting discussions that demonstrate leadership and communication' },
  { iconName: 'KanbanSquare', toolId: 'jira' as ToolId, gap: 'Sprint data showing project planning and delivery timelines' },
  { iconName: 'Hash', toolId: 'slack' as ToolId, gap: 'Team collaboration threads that show cross-functional coordination' },
  { iconName: 'FileText', toolId: 'confluence' as ToolId, gap: 'Documentation and RFCs that show strategic thinking' },
  { iconName: 'Figma', toolId: 'figma' as ToolId, gap: 'Design reviews that show cross-functional collaboration' },
];

const PHASE_INDEX: Record<Phase, number> = {
  question: 0,
  'pick-tool': 1,
  analyzing: 2,
  story: 3,
  enhanced: 4,
  handoff: 5,
};

const ROADMAP_NODES = [
  { id: 'signup', label: 'Sign Up', x: 50, y: 40 },
  { id: 'tools', label: 'Connect Tools', x: 150, y: 40 },
  { id: 'stories', label: 'Your Stories', x: 250, y: 40 },
  { id: 'publish', label: 'Publish', x: 370, y: 20, branch: true },
  { id: 'share', label: 'Share', x: 370, y: 40, branch: true },
  { id: 'playbook', label: 'Playbook', x: 370, y: 60, branch: true },
];

// ── Inline mini-preview components ──────────────────────────────────

function MiniTimelineSpine({ activities }: { activities: typeof mockActivities }) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">This Week</p>
      {activities.slice(0, 5).map((act, i) => (
        <div key={i} className="flex items-start gap-2">
          <div className="flex flex-col items-center">
            <div className={`w-2 h-2 rounded-full shrink-0 mt-1 ${
              act.type.includes('Merged') ? 'bg-green-400' :
              act.type.includes('Review') ? 'bg-blue-400' :
              act.type.includes('Closed') ? 'bg-purple-400' :
              act.type.includes('Thread') ? 'bg-indigo-400' :
              act.type.includes('Presentation') ? 'bg-teal-400' : 'bg-gray-300'
            }`} />
            {i < 4 && <div className="w-px h-4 bg-gray-200 mt-0.5" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-700 truncate leading-tight">{act.title}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-gray-400">{act.date}</span>
              {act.meta && <span className="text-[10px] text-gray-300">{act.meta}</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MiniSTARSections({ sections, evidence }: { sections: typeof mockStories[0]['sections']; evidence: Record<string, number> }) {
  return (
    <div className="space-y-2">
      {sections.map((section) => (
        <div
          key={section.label}
          className={`rounded-md border p-2.5 ${SECTION_COLORS[section.label] ?? 'bg-gray-50 border-gray-200 text-gray-800'}`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${SECTION_LABEL_COLORS[section.label] ?? 'bg-gray-100 text-gray-700'}`}>
              {section.label}
            </span>
            <span className="text-[10px] text-gray-500 tabular-nums">{evidence[section.label] ?? section.evidenceCount} sources</span>
          </div>
          <p className="text-xs leading-relaxed line-clamp-2">{section.text}</p>
        </div>
      ))}
    </div>
  );
}

function MiniRoadmapSVG({ completedCount }: { completedCount: number }) {
  return (
    <div className="rounded-lg bg-gradient-to-br from-[#4C1D95] via-[#5B21B6] to-[#7C3AED] p-3">
      <p className="text-[10px] font-semibold text-white/80 mb-2">Getting Started · {completedCount}/6</p>
      <svg viewBox="0 0 420 70" className="w-full" preserveAspectRatio="xMidYMid meet">
        <line x1={50} y1={35} x2={150} y2={35} stroke="rgba(255,255,255,0.5)" strokeWidth={1.5} />
        <line x1={150} y1={35} x2={250} y2={35} stroke="rgba(255,255,255,0.5)" strokeWidth={1.5} />
        {[18, 35, 52].map((ty) => (
          <path
            key={ty}
            d={`M250,35 C300,35 300,${ty} 350,${ty}`}
            fill="none"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth={1}
            strokeDasharray="4 3"
          />
        ))}
        {ROADMAP_NODES.map((node, i) => {
          const isComplete = i < completedCount;
          const r = node.branch ? 4 : 5;
          const ny = node.branch ? node.y - 5 : node.y - 5;
          return (
            <g key={node.id}>
              <circle
                cx={node.x} cy={ny} r={r}
                fill={isComplete ? 'white' : 'rgba(255,255,255,0.15)'}
                stroke={isComplete ? 'rgba(91,33,182,0.5)' : 'rgba(255,255,255,0.3)'}
                strokeWidth={1}
              />
              {isComplete && (
                <text x={node.x} y={ny + 1.5} textAnchor="middle" fill="#5B21B6" fontSize={r * 1.1} fontWeight="bold">&#10003;</text>
              )}
              <text
                x={node.branch ? node.x + 10 : node.x}
                y={node.branch ? ny + 1 : ny - 10}
                textAnchor={node.branch ? 'start' : 'middle'}
                fill={isComplete ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.4)'}
                fontSize={5} fontWeight={500}
              >
                {node.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────

export function OnboardingV23() {
  const [phase, setPhase] = useState<Phase>('question');
  const [primaryTool, setPrimaryTool] = useState<ToolId | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisLine, setAnalysisLine] = useState(0);
  const [revealedSections, setRevealedSections] = useState(0);
  const [displayConfidence, setDisplayConfidence] = useState(INITIAL_CONFIDENCE);
  const [showGapCallout, setShowGapCallout] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [practiced, setPracticed] = useState(false);
  const [visible, setVisible] = useState(true);
  const [activeTab, setActiveTab] = useState<HandoffTab>('timeline');

  const story = mockStories[0];
  const isEnhanced = phase === 'enhanced';

  const goToPhase = useCallback((next: Phase) => {
    setVisible(false);
    setTimeout(() => {
      setPhase(next);
      setVisible(true);
    }, 200);
  }, []);

  // Auto-advance after picking primary tool
  useEffect(() => {
    if (primaryTool && phase === 'pick-tool') {
      const timer = setTimeout(() => goToPhase('analyzing'), 600);
      return () => clearTimeout(timer);
    }
  }, [primaryTool, phase, goToPhase]);

  // Analysis animation
  useEffect(() => {
    if (phase !== 'analyzing') return;
    setAnalysisProgress(0);
    setAnalysisLine(0);
    let prog = 0;
    let line = 0;

    const lineInterval = setInterval(() => {
      line = Math.min(line + 1, ANALYSIS_STEPS.length - 1);
      setAnalysisLine(line);
    }, SYNC_DELAY / ANALYSIS_STEPS.length);

    const progInterval = setInterval(() => {
      prog = Math.min(prog + 3, 100);
      setAnalysisProgress(prog);
      if (prog >= 100) {
        clearInterval(lineInterval);
        clearInterval(progInterval);
        setTimeout(() => {
          goToPhase('story');
          let s = 0;
          const revealInterval = setInterval(() => {
            s++;
            setRevealedSections(s);
            if (s >= story.sections.length) {
              clearInterval(revealInterval);
              setTimeout(() => setShowGapCallout(true), 400);
            }
          }, 300);
        }, 400);
      }
    }, SYNC_DELAY / 34);

    return () => { clearInterval(lineInterval); clearInterval(progInterval); };
  }, [phase, story.sections.length, goToPhase]);

  function handleConnectMore() {
    setIsEnhancing(true);
    setShowGapCallout(false);
    setTimeout(() => {
      setIsEnhancing(false);
      setPhase('enhanced');
      let conf = INITIAL_CONFIDENCE;
      const confInterval = setInterval(() => {
        conf = Math.min(conf + 2, FULL_CONFIDENCE);
        setDisplayConfidence(conf);
        if (conf >= FULL_CONFIDENCE) clearInterval(confInterval);
      }, 30);
    }, 1500);
  }

  const currentEvidence = isEnhanced ? FULL_EVIDENCE : INITIAL_EVIDENCE;
  const progressWidth = `${(PHASE_INDEX[phase] / 5) * 100}%`;
  const visibleGaps = EVIDENCE_GAPS.filter((g) => g.toolId !== primaryTool);
  const selectedTool = mockTools.find((t) => t.id === primaryTool);

  const HANDOFF_TABS: { id: HandoffTab; label: string; icon: React.FC<{ size?: number; className?: string }> }[] = [
    { id: 'timeline', label: 'Timeline', icon: Clock },
    { id: 'stories', label: 'Stories', icon: BookOpen },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ];

  const TAB_DESCRIPTIONS: Record<HandoffTab, string> = {
    timeline: 'Your activity feed — activities from all connected tools appear here automatically, grouped by time.',
    stories: 'Your career narratives — each story is built from your evidence and structured in STAR format.',
    dashboard: 'Your progress tracker — see what\'s connected, what\'s next, and how your profile is growing.',
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary-100 mb-4">
            <Mic size={22} className="text-primary-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Let&apos;s prepare your interview answer</h1>
          <p className="text-gray-500 mt-1 text-sm">We&apos;ll pull real evidence from your work tools to build a compelling STAR story.</p>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: progressWidth }}
            />
          </div>
        </div>

        {/* Phase content */}
        <div className={`transition-all duration-200 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
          {/* Question */}
          {phase === 'question' && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3">Common interview question</p>
                <blockquote className="text-xl font-semibold text-gray-900 leading-snug border-l-4 border-primary-400 pl-4 py-1 italic mb-6">
                  &ldquo;{INTERVIEW_QUESTION}&rdquo;
                </blockquote>
                <p className="text-gray-500 text-sm mb-6">
                  This is one of the most common behavioral questions. Instead of preparing a vague answer,
                  let&apos;s pull concrete evidence from your actual work to build something credible.
                </p>
                <button
                  onClick={() => goToPhase('pick-tool')}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
                >
                  Prepare My Answer
                  <ChevronRight size={16} />
                </button>
              </CardContent>
            </Card>
          )}

          {/* Pick Tool */}
          {phase === 'pick-tool' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What&apos;s your primary work tool?</CardTitle>
                <p className="text-sm text-gray-500">Pick the one where most of your work happens. We&apos;ll start there.</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {mockTools.map((tool) => {
                    const selected = primaryTool === tool.id;
                    const Icon = TOOL_ICONS[tool.icon];
                    return (
                      <button
                        key={tool.id}
                        onClick={() => setPrimaryTool(tool.id)}
                        className={`relative flex items-center gap-3 p-4 rounded-lg border-2 text-left transition-all duration-200 ${
                          selected
                            ? 'border-primary-500 bg-primary-50 shadow-sm'
                            : primaryTool && !selected
                              ? 'border-gray-100 bg-gray-50 opacity-50'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        {Icon && <Icon size={20} className={selected ? 'text-primary-600' : 'text-gray-400'} />}
                        <div className="min-w-0">
                          <div className={`font-semibold text-sm ${selected ? 'text-primary-700' : 'text-gray-800'}`}>{tool.name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{tool.activityCount} {tool.activityLabel}</div>
                        </div>
                        {selected && <CheckCircle2 size={16} className="absolute top-2 right-2 text-primary-500" />}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Analyzing */}
          {phase === 'analyzing' && (
            <Card>
              <CardContent className="pt-8 pb-8">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-50 mb-4">
                    <Search size={28} className="text-primary-600 animate-pulse" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">Analyzing your work history...</h2>
                  <p className="text-sm text-gray-500 mt-1">{ANALYSIS_STEPS[analysisLine]}</p>
                </div>
                <div className="mb-6">
                  <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                    <span>Processing {selectedTool?.activityCount ?? 0} activities</span>
                    <span className="tabular-nums">{analysisProgress}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-primary-500 rounded-full transition-all duration-200" style={{ width: `${analysisProgress}%` }} />
                  </div>
                </div>
                <div className="space-y-2">
                  {mockActivities
                    .filter((a) => a.tool === primaryTool)
                    .slice(0, Math.ceil((analysisProgress / 100) * 3))
                    .map((act, i) => (
                      <div key={i} className="flex items-center gap-3 py-1.5 px-3 bg-gray-50 rounded-md transition-opacity duration-300">
                        <div className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
                        <span className="text-xs text-gray-600 truncate">{act.title}</span>
                        <Badge variant="secondary" className="ml-auto text-xs shrink-0">{act.type}</Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Story (initial) & Enhanced */}
          {(phase === 'story' || phase === 'enhanced') && (
            <div className="space-y-4">
              {/* Question reminder */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Interview Question</p>
                <p className="text-sm text-gray-700 italic">&ldquo;{INTERVIEW_QUESTION}&rdquo;</p>
              </div>

              {/* Story card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Your Answer</CardTitle>
                    <div className="flex items-center gap-2">
                      <BarChart3 size={14} className={displayConfidence >= 80 ? 'text-green-500' : 'text-amber-500'} />
                      <span className={`text-sm font-semibold tabular-nums ${displayConfidence >= 80 ? 'text-green-600' : 'text-amber-600'}`}>
                        {displayConfidence}% confidence
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">{story.title}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {story.sections.slice(0, revealedSections).map((section, idx) => (
                      <div
                        key={section.label}
                        className={`rounded-lg border p-4 transition-all duration-300 ${SECTION_COLORS[section.label] ?? 'bg-gray-50 border-gray-200 text-gray-800'}`}
                        style={{ animationDelay: `${idx * 100}ms` }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded ${SECTION_LABEL_COLORS[section.label] ?? 'bg-gray-100 text-gray-700'}`}>
                            {section.label}
                          </span>
                          <Badge
                            variant="secondary"
                            className={`text-xs tabular-nums transition-all duration-300 ${isEnhancing ? 'animate-pulse' : ''}`}
                          >
                            {currentEvidence[section.label] ?? section.evidenceCount} sources
                          </Badge>
                        </div>
                        <p className="text-sm leading-relaxed">{section.text}</p>
                      </div>
                    ))}
                  </div>

                  {/* Gap callout */}
                  {phase === 'story' && showGapCallout && !isEnhancing && (
                    <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 border-l-4 border-l-amber-400 transition-all duration-300">
                      <div className="flex items-start gap-3 mb-3">
                        <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-amber-800">Good start, but we&apos;re missing context</p>
                          <p className="text-xs text-amber-600 mt-0.5">Connect more tools to strengthen your answer with additional evidence.</p>
                        </div>
                      </div>
                      <div className="space-y-2 mb-4">
                        {visibleGaps.slice(0, 3).map((gap) => {
                          const Icon = TOOL_ICONS[gap.iconName];
                          const tool = mockTools.find((t) => t.id === gap.toolId);
                          return (
                            <div key={gap.toolId} className="flex items-center gap-3 py-1.5 px-3 bg-white/60 rounded-md">
                              {Icon && <Icon size={14} className="text-amber-700 shrink-0" />}
                              <span className="text-xs text-amber-800">
                                <span className="font-medium">{tool?.name}:</span> {gap.gap}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <button
                        onClick={handleConnectMore}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors"
                      >
                        Connect {visibleGaps.length} More Tools
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  )}

                  {/* Enhancing state */}
                  {isEnhancing && (
                    <div className="mt-6 rounded-lg border border-primary-200 bg-primary-50 p-4 text-center transition-all duration-300">
                      <Search size={18} className="text-primary-600 animate-pulse mx-auto mb-2" />
                      <p className="text-sm font-medium text-primary-700">Connecting additional tools & re-analyzing...</p>
                      <p className="text-xs text-primary-500 mt-1">Enriching your answer with {totalActivityCount - (selectedTool?.activityCount ?? 0)} more activities</p>
                    </div>
                  )}

                  {/* Enhanced success banner */}
                  {phase === 'enhanced' && (
                    <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4 transition-all duration-300">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100">
                          <Sparkles size={16} className="text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-green-800">Full evidence coverage</p>
                          <p className="text-xs text-green-600">All {mockTools.length} tools connected — your answer is backed by {totalActivityCount} activities</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  {revealedSections >= story.sections.length && (phase === 'enhanced' || (phase === 'story' && showGapCallout)) && (
                    <div className="mt-6 pt-4 border-t border-gray-100 flex items-center gap-3">
                      <button
                        onClick={() => setPracticed(true)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                          practiced
                            ? 'bg-green-50 border-green-300 text-green-700'
                            : 'bg-white border-gray-300 text-gray-700 hover:border-primary-400'
                        }`}
                      >
                        <Star size={14} className={practiced ? 'text-green-500 fill-green-500' : 'text-gray-400'} />
                        {practiced ? 'Practiced!' : 'Practice Out Loud'}
                      </button>
                      <button
                        onClick={() => {
                          const text = `${INTERVIEW_QUESTION}\n\n${story.sections.map((s) => `${s.label.toUpperCase()}:\n${s.text}`).join('\n\n')}`;
                          navigator.clipboard.writeText(text).catch(() => {});
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors"
                      >
                        Copy Answer
                      </button>
                    </div>
                  )}

                  {/* "See Where Everything Lives" CTA — only in enhanced phase */}
                  {phase === 'enhanced' && (
                    <div className="mt-4">
                      <button
                        onClick={() => goToPhase('handoff')}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 border-2 border-primary-200 bg-primary-50 text-primary-700 rounded-lg font-medium hover:bg-primary-100 transition-colors"
                      >
                        See Where Everything Lives
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Handoff Phase */}
          {phase === 'handoff' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">You&apos;re all set — here&apos;s where everything lives</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Tab buttons */}
                <div className="flex rounded-lg bg-gray-100 p-1 mb-4">
                  {HANDOFF_TABS.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                          isActive
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <tab.icon size={14} />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {/* Tab description */}
                <p className="text-xs text-gray-500 mb-4">{TAB_DESCRIPTIONS[activeTab]}</p>

                {/* Tab content */}
                {activeTab === 'timeline' && (
                  <div className="grid grid-cols-[1fr,180px] gap-3">
                    {/* Activity spine */}
                    <div className="border rounded-lg p-3 bg-gray-50">
                      <MiniTimelineSpine activities={mockActivities} />
                    </div>
                    {/* Draft sidebar */}
                    <div className="rounded-lg border border-primary-200 bg-primary-50 p-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <div className="w-2 h-2 rounded-full bg-primary-400" />
                        <p className="text-[10px] font-semibold text-primary-700 uppercase tracking-wide">Draft Story</p>
                      </div>
                      <p className="text-xs font-medium text-gray-800 mb-1 line-clamp-2">{story.title}</p>
                      <div className="flex items-center gap-1 mb-1">
                        {story.tools.slice(0, 3).map((tId) => {
                          const Icon = TOOL_ICONS[mockTools.find((t) => t.id === tId)?.icon ?? ''];
                          return Icon ? <Icon key={tId} size={10} className="text-gray-400" /> : null;
                        })}
                      </div>
                      <p className="text-[10px] text-gray-400">{story.dateRange}</p>
                    </div>
                  </div>
                )}

                {activeTab === 'stories' && (
                  <div>
                    {/* Summary bar */}
                    <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-gray-50 rounded-lg border">
                      <span className="text-xs font-medium text-gray-700">1 story</span>
                      <span className="text-gray-300">·</span>
                      <div className="flex items-center gap-1">
                        {story.tools.map((tId) => {
                          const Icon = TOOL_ICONS[mockTools.find((t) => t.id === tId)?.icon ?? ''];
                          return Icon ? <Icon key={tId} size={12} className="text-gray-400" /> : null;
                        })}
                      </div>
                      <span className="text-gray-300">·</span>
                      <Badge variant="secondary" className="text-[10px] font-bold">STAR</Badge>
                      <span className="text-gray-300">·</span>
                      <div className="flex items-center gap-1">
                        <BarChart3 size={12} className="text-green-500" />
                        <span className="text-xs font-semibold text-green-600 tabular-nums">{FULL_CONFIDENCE}%</span>
                      </div>
                    </div>

                    {/* Full STAR sections */}
                    <MiniSTARSections sections={story.sections} evidence={FULL_EVIDENCE} />
                  </div>
                )}

                {activeTab === 'dashboard' && (
                  <div className="space-y-4">
                    {/* Roadmap */}
                    <MiniRoadmapSVG completedCount={3} />

                    {/* Integration health */}
                    <div className="border rounded-lg p-3">
                      <p className="text-xs font-semibold text-gray-700 mb-2">Integration Health</p>
                      <div className="space-y-2">
                        {mockTools.map((tool) => {
                          const Icon = TOOL_ICONS[tool.icon];
                          return (
                            <div key={tool.id} className="flex items-center gap-3">
                              {Icon && <Icon size={14} className="text-green-500" />}
                              <span className="text-xs text-gray-600">{tool.name}</span>
                              <Badge variant="secondary" className="ml-auto text-[10px]">Connected</Badge>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Final CTA */}
                <button className="w-full mt-6 flex items-center justify-center gap-2 py-3 px-4 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors">
                  Go to Timeline
                  <ArrowRight size={16} />
                </button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
