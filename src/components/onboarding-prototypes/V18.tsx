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
  Loader2,
  Check,
  Trophy,
  Sword,
  Star,
  Shield,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

const TOOL_ICONS: Record<string, React.ReactNode> = {
  github: <GitBranch className="w-4 h-4" />,
  jira: <KanbanSquare className="w-4 h-4" />,
  confluence: <FileText className="w-4 h-4" />,
  slack: <Hash className="w-4 h-4" />,
  figma: <Figma className="w-4 h-4" />,
  'google-meet': <Video className="w-4 h-4" />,
};

interface QuestStep {
  id: number;
  label: string;
  desc: string;
  xp: number;
  icon: React.ReactNode;
}

const QUEST_STEPS: QuestStep[] = [
  { id: 0, label: 'Begin your journey', desc: 'Start your Story Quest', xp: 50, icon: <Star className="w-4 h-4" /> },
  { id: 1, label: 'Connect your tools', desc: 'Link 1+ work tools to gather evidence', xp: 100, icon: <Shield className="w-4 h-4" /> },
  { id: 2, label: 'Analyze your work', desc: 'Let inchronicle scan your activity', xp: 150, icon: <Sparkles className="w-4 h-4" /> },
  { id: 3, label: 'Claim your story', desc: 'Reveal your generated STAR story', xp: 100, icon: <Trophy className="w-4 h-4" /> },
];

const TOTAL_XP = QUEST_STEPS.reduce((sum, s) => sum + s.xp, 0); // 400

interface XpFloat {
  id: number;
  xp: number;
  stepId: number;
}

type SubStep = 'idle' | 'selecting' | 'connecting' | 'syncing';

export function OnboardingV18() {
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [activeStep, setActiveStep] = useState<number>(0);
  const [subStep, setSubStep] = useState<SubStep>('idle');
  const [selectedTools, setSelectedTools] = useState<Set<ToolId>>(new Set());
  const [syncProgress, setSyncProgress] = useState(0);
  const [xpFloats, setXpFloats] = useState<XpFloat[]>([]);
  const [floatCounter, setFloatCounter] = useState(0);
  const [copied, setCopied] = useState(false);

  const story = mockStories[0];
  const currentXP = Array.from(completedSteps).reduce((sum, id) => sum + QUEST_STEPS[id].xp, 0);
  const xpPercent = Math.round((currentXP / TOTAL_XP) * 100);
  const allComplete = completedSteps.size === QUEST_STEPS.length;

  function addFloat(stepId: number, xp: number) {
    const id = floatCounter;
    setFloatCounter((c) => c + 1);
    setXpFloats((prev) => [...prev, { id, xp, stepId }]);
    setTimeout(() => {
      setXpFloats((prev) => prev.filter((f) => f.id !== id));
    }, 1200);
  }

  function completeStep(stepId: number) {
    setCompletedSteps((prev) => {
      if (prev.has(stepId)) return prev;
      return new Set([...prev, stepId]);
    });
    addFloat(stepId, QUEST_STEPS[stepId].xp);
  }

  // Step 0: Begin
  function handleBegin() {
    if (completedSteps.has(0)) return;
    completeStep(0);
    setActiveStep(1);
    setSubStep('selecting');
  }

  // Step 1: Tool selection
  const toggleTool = (id: ToolId) => {
    setSelectedTools((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  function handleConnectTools() {
    setSubStep('connecting');
    setTimeout(() => {
      completeStep(1);
      setActiveStep(2);
      setSubStep('syncing');
    }, CONNECT_DELAY);
  }

  // Step 2: Syncing
  useEffect(() => {
    if (subStep !== 'syncing') return;
    setSyncProgress(0);
    let elapsed = 0;
    const interval = 80;
    const total = SYNC_DELAY;

    const ticker = setInterval(() => {
      elapsed += interval;
      const pct = Math.min((elapsed / total) * 100, 100);
      setSyncProgress(pct);
      if (elapsed >= total) {
        clearInterval(ticker);
        setTimeout(() => {
          completeStep(2);
          setActiveStep(3);
          setSubStep('idle');
        }, 400);
      }
    }, interval);

    return () => clearInterval(ticker);
  }, [subStep]);

  // Step 3: Claim story
  function handleClaimStory() {
    if (completedSteps.has(3)) return;
    completeStep(3);
  }

  function handleCopy() {
    const text = story.sections.map((s) => `${s.label}:\n${s.text}`).join('\n\n');
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const SECTION_COLORS: Record<string, string> = {
    Situation: 'text-blue-600 bg-blue-50',
    Task: 'text-amber-600 bg-amber-50',
    Action: 'text-purple-600 bg-purple-50',
    Result: 'text-emerald-600 bg-emerald-50',
    Challenge: 'text-orange-600 bg-orange-50',
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center py-10 px-4">
      {/* Confetti dots when all complete */}
      {allComplete && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          {Array.from({ length: 24 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 60}%`,
                backgroundColor: ['#a78bfa', '#34d399', '#fbbf24', '#60a5fa', '#f87171'][i % 5],
                animationDelay: `${(i * 0.13).toFixed(2)}s`,
                animationDuration: `${0.8 + (i % 4) * 0.3}s`,
              }}
            />
          ))}
        </div>
      )}

      <div className="w-full max-w-xl relative z-10 space-y-4">
        {/* Header */}
        <Card className="bg-gray-800 border-amber-500/40 shadow-xl">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                <Sword className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-white text-lg">Story Quest</CardTitle>
                <p className="text-amber-300/70 text-xs">Build your performance story to unlock rewards</p>
              </div>
              <div className="text-right">
                <div className="text-amber-400 font-bold text-lg">{currentXP} <span className="text-amber-300/60 text-xs">/ {TOTAL_XP} XP</span></div>
              </div>
            </div>

            {/* XP Progress bar */}
            <div className="mt-4 relative">
              <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${xpPercent}%` }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs text-gray-500">XP Progress</span>
                <span className="text-xs text-amber-400 font-semibold">{xpPercent}%</span>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Achievement unlock banner */}
        {allComplete && (
          <div className="bg-amber-500 rounded-xl p-4 flex items-center gap-3 shadow-lg shadow-amber-500/30 border border-amber-400">
            <Trophy className="w-8 h-8 text-white shrink-0" />
            <div>
              <p className="text-white font-bold text-sm">Achievement Unlocked: Story Crafter</p>
              <p className="text-amber-100 text-xs mt-0.5">You've built your first evidence-backed performance story!</p>
            </div>
            <Badge className="ml-auto bg-white text-amber-600 shrink-0">+{TOTAL_XP} XP</Badge>
          </div>
        )}

        {/* Quest steps */}
        <div className="space-y-2">
          {QUEST_STEPS.map((questStep) => {
            const isComplete = completedSteps.has(questStep.id);
            const isActive = activeStep === questStep.id && !isComplete;
            const isLocked = !isComplete && questStep.id > activeStep;
            const float = xpFloats.find((f) => f.stepId === questStep.id);

            return (
              <div key={questStep.id} className="relative">
                {/* XP float */}
                {float && (
                  <div
                    className="absolute -top-3 right-4 z-20 text-amber-400 font-bold text-sm animate-bounce pointer-events-none"
                    style={{ animation: 'floatUp 1.2s ease-out forwards' }}
                  >
                    +{float.xp} XP
                  </div>
                )}

                <Card
                  className={[
                    'border transition-all duration-300',
                    isComplete ? 'bg-gray-800 border-amber-500/30 shadow-md' : '',
                    isActive ? 'bg-gray-800 border-primary-500/50 shadow-lg shadow-primary-500/10' : '',
                    isLocked ? 'bg-gray-800/50 border-gray-700/50 opacity-60' : '',
                    !isComplete && !isActive && !isLocked ? 'bg-gray-800 border-gray-700' : '',
                  ].join(' ')}
                >
                  <CardContent className="py-4 px-4">
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <button
                        onClick={() => {
                          if (isComplete || isLocked) return;
                          if (questStep.id === 0) handleBegin();
                          if (questStep.id === 3 && !completedSteps.has(3)) handleClaimStory();
                        }}
                        disabled={isLocked || isComplete || questStep.id === 1 || questStep.id === 2}
                        className={[
                          'w-8 h-8 rounded-lg border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all duration-300',
                          isComplete
                            ? 'bg-amber-500 border-amber-500 shadow-md shadow-amber-500/30'
                            : isActive
                            ? 'border-primary-400 hover:border-primary-300 cursor-pointer'
                            : 'border-gray-600 cursor-not-allowed',
                        ].join(' ')}
                      >
                        {isComplete ? (
                          <Check className="w-4 h-4 text-white" />
                        ) : (
                          <div className={`w-3 h-3 rounded-sm ${isActive ? 'bg-primary-400/30' : 'bg-gray-700'}`} />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={[
                            'text-sm font-semibold',
                            isComplete ? 'text-amber-300 line-through decoration-amber-500/50' : isActive ? 'text-white' : 'text-gray-500',
                          ].join(' ')}>
                            {questStep.label}
                          </span>
                          <Badge
                            className={[
                              'text-xs font-bold',
                              isComplete ? 'bg-amber-500/20 text-amber-400 border-0' : 'bg-gray-700 text-gray-400 border-0',
                            ].join(' ')}
                          >
                            +{questStep.xp} XP
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{questStep.desc}</p>

                        {/* Step 1 expanded: tool selection */}
                        {questStep.id === 1 && (isActive || subStep === 'selecting' || subStep === 'connecting') && !isComplete && (
                          <div className="mt-3 space-y-2">
                            <div className="grid grid-cols-2 gap-1.5">
                              {mockTools.map((tool) => {
                                const isSel = selectedTools.has(tool.id);
                                return (
                                  <button
                                    key={tool.id}
                                    onClick={() => toggleTool(tool.id)}
                                    disabled={subStep === 'connecting'}
                                    className={[
                                      'flex items-center gap-2 px-2.5 py-2 rounded-lg border text-xs font-medium transition-all',
                                      isSel ? 'border-primary-500 bg-primary-900/30 text-primary-300' : 'border-gray-600 text-gray-400 hover:border-gray-500',
                                    ].join(' ')}
                                  >
                                    <span className="w-4 h-4 rounded flex items-center justify-center text-white shrink-0" style={{ backgroundColor: tool.color }}>
                                      {TOOL_ICONS[tool.id]}
                                    </span>
                                    {tool.name}
                                    {isSel && <Check className="w-3 h-3 text-primary-400 ml-auto" />}
                                  </button>
                                );
                              })}
                            </div>
                            {subStep === 'connecting' ? (
                              <div className="flex items-center gap-2 text-xs text-gray-400">
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary-400" />
                                Connecting tools...
                              </div>
                            ) : (
                              <button
                                onClick={handleConnectTools}
                                disabled={selectedTools.size < 1}
                                className={[
                                  'w-full py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5',
                                  selectedTools.size >= 1
                                    ? 'bg-primary-500 hover:bg-primary-600 text-white'
                                    : 'bg-gray-700 text-gray-500 cursor-not-allowed',
                                ].join(' ')}
                              >
                                Connect {selectedTools.size > 0 ? `${selectedTools.size} tool${selectedTools.size > 1 ? 's' : ''}` : 'tools'}
                              </button>
                            )}
                          </div>
                        )}

                        {/* Step 2 expanded: sync progress */}
                        {questStep.id === 2 && isActive && subStep === 'syncing' && (
                          <div className="mt-3 space-y-2">
                            <div className="flex items-center gap-2">
                              <Loader2 className="w-3.5 h-3.5 text-primary-400 animate-spin shrink-0" />
                              <span className="text-xs text-gray-400">Analyzing {totalActivityCount}+ activities...</span>
                            </div>
                            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-primary-400 to-primary-500 rounded-full transition-all duration-150"
                                style={{ width: `${syncProgress}%` }}
                              />
                            </div>
                            <div className="text-xs text-gray-500 text-right">{Math.round(syncProgress)}%</div>
                          </div>
                        )}

                        {/* Step 3 expanded: claim button */}
                        {questStep.id === 3 && isActive && (
                          <div className="mt-3">
                            <button
                              onClick={handleClaimStory}
                              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold transition-all shadow-md shadow-amber-500/30"
                            >
                              <Trophy className="w-3.5 h-3.5" />
                              Claim Story Reward
                            </button>
                          </div>
                        )}
                      </div>

                      <div className={`shrink-0 text-gray-600 ${isActive ? 'text-primary-400' : ''} ${isComplete ? 'text-amber-400' : ''}`}>
                        {questStep.icon}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>

        {/* Story reward */}
        {completedSteps.has(3) && (
          <Card className="border-2 border-amber-400 bg-gray-800 shadow-xl shadow-amber-500/20">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <CardTitle className="text-amber-300 text-base">Quest Reward: Your Story</CardTitle>
              </div>
              <p className="text-xs text-gray-400 mt-1">{story.title}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-xs">
                  {Math.round(story.confidence * 100)}% confidence
                </Badge>
                <Badge className="bg-gray-700 text-gray-300 border-0 text-xs">{story.dateRange}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {story.sections.map((section) => {
                const colorClass = SECTION_COLORS[section.label] ?? 'text-gray-300 bg-gray-700/50';
                const [textClass, bgClass] = colorClass.split(' ');
                return (
                  <div key={section.label} className={`rounded-lg p-3 ${bgClass ?? 'bg-gray-700/50'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-bold uppercase tracking-widest ${textClass}`}>
                        {section.label}
                      </span>
                      <span className="text-xs text-gray-500">{section.evidenceCount} signals</span>
                    </div>
                    <p className="text-xs text-gray-300 leading-relaxed">{section.text}</p>
                  </div>
                );
              })}

              <button
                onClick={handleCopy}
                className={[
                  'w-full py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 mt-2',
                  copied
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                    : 'bg-amber-500 hover:bg-amber-400 text-white shadow-md shadow-amber-500/30',
                ].join(' ')}
              >
                {copied ? (
                  <><CheckCircle2 className="w-4 h-4" /> Story Equipped!</>
                ) : (
                  <><Sword className="w-4 h-4" /> Equip Story</>
                )}
              </button>
            </CardContent>
          </Card>
        )}

        <style>{`
          @keyframes floatUp {
            0% { opacity: 1; transform: translateY(0); }
            100% { opacity: 0; transform: translateY(-24px); }
          }
        `}</style>
      </div>
    </div>
  );
}
