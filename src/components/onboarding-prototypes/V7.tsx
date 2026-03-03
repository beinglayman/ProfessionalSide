import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { mockTools, mockStories, mockActivities, SYNC_DELAY, CONNECT_DELAY, totalActivityCount } from './mock-data';
import type { ToolId } from './mock-data';
import { Mic, Folder, Search, Star, ChevronRight, CheckCircle2, BarChart3 } from 'lucide-react';

type Step = 'question' | 'connect' | 'analyzing' | 'answer';

const INTERVIEW_QUESTION = 'Tell me about a time you led a technical initiative that had a significant impact.';

const EVIDENCE_ANIMATIONS = [
  'Scanning commit history...',
  'Reading pull request reviews...',
  'Analyzing Jira sprint data...',
  'Processing documentation...',
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

export function OnboardingV7() {
  const [step, setStep] = useState<Step>('question');
  const [selectedTools, setSelectedTools] = useState<Set<ToolId>>(new Set());
  const [, setConnecting] = useState<Set<ToolId>>(new Set());
  const [, setConnected] = useState<Set<ToolId>>(new Set());
  const [analysisLine, setAnalysisLine] = useState(0);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [revealedSections, setRevealedSections] = useState(0);
  const [practiced, setPracticed] = useState(false);

  const story = mockStories[0];

  function toggleTool(id: ToolId) {
    const next = new Set(selectedTools);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedTools(next);
  }

  function handleConnect() {
    if (selectedTools.size === 0) return;
    setStep('analyzing');

    // Simulate connecting each tool
    const toolArr = Array.from(selectedTools);
    toolArr.forEach((toolId, i) => {
      setTimeout(() => {
        setConnecting((prev) => new Set([...prev, toolId]));
        setTimeout(() => {
          setConnected((prev) => new Set([...prev, toolId]));
        }, CONNECT_DELAY);
      }, i * 400);
    });

    // Analysis animation
    let line = 0;
    let prog = 0;
    const lineInterval = setInterval(() => {
      line = Math.min(line + 1, EVIDENCE_ANIMATIONS.length - 1);
      setAnalysisLine(line);
    }, SYNC_DELAY / EVIDENCE_ANIMATIONS.length);

    const progInterval = setInterval(() => {
      prog = Math.min(prog + 3, 100);
      setAnalysisProgress(prog);
      if (prog >= 100) {
        clearInterval(lineInterval);
        clearInterval(progInterval);
        setTimeout(() => {
          setStep('answer');
          // Reveal sections one by one
          let s = 0;
          const revealInterval = setInterval(() => {
            s++;
            setRevealedSections(s);
            if (s >= story.sections.length) clearInterval(revealInterval);
          }, 400);
        }, 500);
      }
    }, SYNC_DELAY / 34);
  }

  const confidencePct = Math.round(story.confidence * 100);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary-100 mb-4">
            <Mic size={22} className="text-primary-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Let's prepare your interview answer</h1>
          <p className="text-gray-500 mt-1 text-sm">We'll pull real evidence from your work tools to build a compelling STAR story.</p>
        </div>

        {/* Step: Question */}
        {step === 'question' && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3 mb-6">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary-600 text-white text-xs font-bold shrink-0 mt-0.5">1</span>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-3">Common interview question</p>
                  <blockquote className="text-xl font-semibold text-gray-900 leading-snug border-l-4 border-primary-400 pl-4 py-1 italic">
                    "{INTERVIEW_QUESTION}"
                  </blockquote>
                </div>
              </div>
              <p className="text-gray-500 text-sm mb-6">
                This is one of the most common behavioral questions. Instead of preparing a vague answer,
                let's pull concrete evidence from your actual work to build something credible.
              </p>
              <button
                onClick={() => setStep('connect')}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
              >
                First, let's gather your evidence
                <ChevronRight size={16} />
              </button>
            </CardContent>
          </Card>
        )}

        {/* Step: Connect */}
        {step === 'connect' && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary-600 text-white text-xs font-bold shrink-0">2</span>
                <CardTitle className="text-lg">Connect your evidence sources</CardTitle>
              </div>
              <p className="text-sm text-gray-500 ml-9">Select the tools where your work is tracked.</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {mockTools.map((tool) => {
                  const selected = selectedTools.has(tool.id);
                  return (
                    <button
                      key={tool.id}
                      onClick={() => toggleTool(tool.id)}
                      className={`relative flex items-start gap-3 p-4 rounded-lg border-2 text-left transition-all ${
                        selected
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <Folder size={20} className={selected ? 'text-primary-600' : 'text-gray-400'} />
                      <div className="min-w-0">
                        <div className={`font-semibold text-sm ${selected ? 'text-primary-700' : 'text-gray-800'}`}>
                          {tool.name}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">{tool.activityCount} {tool.activityLabel}</div>
                      </div>
                      {selected && (
                        <CheckCircle2 size={14} className="absolute top-2 right-2 text-primary-500" />
                      )}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={handleConnect}
                disabled={selectedTools.size === 0}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Analyze my work history
                <Search size={16} />
              </button>
            </CardContent>
          </Card>
        )}

        {/* Step: Analyzing */}
        {step === 'analyzing' && (
          <Card>
            <CardContent className="pt-8 pb-8">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-50 mb-4">
                  <Search size={28} className="text-primary-600 animate-pulse" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Analyzing your work history...</h2>
                <p className="text-sm text-gray-500 mt-1">{EVIDENCE_ANIMATIONS[analysisLine]}</p>
              </div>

              {/* Progress bar */}
              <div className="mb-6">
                <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                  <span>Processing {totalActivityCount} activities</span>
                  <span>{analysisProgress}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500 rounded-full transition-all duration-300"
                    style={{ width: `${analysisProgress}%` }}
                  />
                </div>
              </div>

              {/* Evidence items appearing */}
              <div className="space-y-2">
                {mockActivities.slice(0, Math.ceil((analysisProgress / 100) * mockActivities.length)).map((act, i) => (
                  <div key={i} className="flex items-center gap-3 py-1.5 px-3 bg-gray-50 rounded-md">
                    <div className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
                    <span className="text-xs text-gray-600 truncate">{act.title}</span>
                    <Badge variant="secondary" className="ml-auto text-xs shrink-0">{act.type}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step: Answer */}
        {step === 'answer' && (
          <div className="space-y-4">
            {/* Question reminder */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Interview Question</p>
              <p className="text-sm text-gray-700 italic">"{INTERVIEW_QUESTION}"</p>
            </div>

            {/* Your answer */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Your Answer</CardTitle>
                  <div className="flex items-center gap-2">
                    <BarChart3 size={14} className="text-green-500" />
                    <span className="text-sm font-semibold text-green-600">{confidencePct}% confidence</span>
                  </div>
                </div>
                <p className="text-sm text-gray-500">{story.title}</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {story.sections.slice(0, revealedSections).map((section) => (
                    <div
                      key={section.label}
                      className={`rounded-lg border p-4 ${SECTION_COLORS[section.label] ?? 'bg-gray-50 border-gray-200 text-gray-800'}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded ${SECTION_LABEL_COLORS[section.label] ?? 'bg-gray-100 text-gray-700'}`}>
                          {section.label}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {section.evidenceCount} sources
                        </Badge>
                      </div>
                      <p className="text-sm leading-relaxed">{section.text}</p>
                    </div>
                  ))}
                </div>

                {revealedSections >= story.sections.length && (
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
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
