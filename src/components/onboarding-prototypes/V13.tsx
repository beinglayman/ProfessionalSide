import { useState, useRef } from 'react';
import { Card, CardContent } from '../ui/card';
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
  Check,
  ChevronRight,
  Copy,
  Share2,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

const TOOL_ICONS: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  GitBranch,
  KanbanSquare,
  FileText,
  Hash,
  Figma,
  Video,
};

type Screen = 0 | 1 | 2 | 3 | 4;

export function OnboardingV13() {
  const [screen, setScreen] = useState<Screen>(0);
  const [selectedTools, setSelectedTools] = useState<Set<ToolId>>(new Set());
  const [syncProgress, setSyncProgress] = useState(0);
  const [isCopied, setIsCopied] = useState(false);
  const [connectingTools, setConnectingTools] = useState<Set<ToolId>>(new Set());
  const storyScrollRef = useRef<HTMLDivElement>(null);

  const story = mockStories[0];
  const totalScreens = 5;

  const toggleTool = (id: ToolId) => {
    setSelectedTools((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        setConnectingTools((c) => new Set([...c, id]));
        setTimeout(() => {
          setConnectingTools((c) => {
            const n = new Set(c);
            n.delete(id);
            return n;
          });
        }, CONNECT_DELAY);
      }
      return next;
    });
  };

  const goNext = () => {
    if (screen === 1 && selectedTools.size === 0) return;
    if (screen === 1) {
      setScreen(2);
      let progress = 0;
      const interval = setInterval(() => {
        progress += 5;
        setSyncProgress(Math.min(progress, 100));
        if (progress >= 100) {
          clearInterval(interval);
          setTimeout(() => setScreen(3), 500);
        }
      }, SYNC_DELAY / 20);
    } else {
      setScreen((s) => Math.min(s + 1, 4) as Screen);
    }
  };

  const goBack = () => {
    if (screen > 0 && screen !== 2) {
      setScreen((s) => Math.max(s - 1, 0) as Screen);
    }
  };

  const handleCopy = () => {
    const text = `${story.title}\n\n${story.sections.map((s) => `${s.label}:\n${s.text}`).join('\n\n')}`;
    navigator.clipboard.writeText(text).catch(() => {});
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center font-sans py-12 px-4">
      {/* Phone frame */}
      <div className="relative max-w-sm w-full">
        {/* Phone chrome */}
        <div className="rounded-[2.5rem] border-4 border-gray-800 bg-gray-800 shadow-2xl overflow-hidden">
          {/* Notch */}
          <div className="bg-gray-800 flex items-center justify-center py-2">
            <div className="w-24 h-5 bg-gray-900 rounded-full" />
          </div>

          {/* Screen */}
          <div className="bg-white relative overflow-hidden" style={{ minHeight: '680px' }}>
            {/* Status bar sim */}
            <div className="flex items-center justify-between px-5 pt-2 pb-1">
              <span className="text-xs font-semibold text-gray-900">9:41</span>
              <div className="flex items-center gap-1.5">
                <div className="flex gap-0.5 items-end">
                  {[2, 3, 4, 4].map((h, i) => (
                    <div key={i} className="w-1 bg-gray-900 rounded-sm" style={{ height: `${h * 3}px` }} />
                  ))}
                </div>
                <div className="w-4 h-2.5 rounded-sm border border-gray-900 relative">
                  <div className="absolute inset-0.5 left-0.5 bg-gray-900 rounded-sm" style={{ right: '3px' }} />
                  <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-0.5 h-1.5 bg-gray-900 rounded-r-sm" />
                </div>
              </div>
            </div>

            {/* Progress dots */}
            <div className="flex items-center justify-center gap-1.5 py-3">
              {Array.from({ length: totalScreens }, (_, i) => (
                <div
                  key={i}
                  className={`rounded-full transition-all duration-300 ${
                    i === screen
                      ? 'w-5 h-1.5 bg-primary-500'
                      : i < screen
                      ? 'w-1.5 h-1.5 bg-primary-300'
                      : 'w-1.5 h-1.5 bg-gray-200'
                  }`}
                />
              ))}
            </div>

            {/* Screen content */}
            <div className="px-6 pb-6" style={{ minHeight: '580px' }}>

              {/* Screen 0 — Ready? */}
              {screen === 0 && (
                <div className="flex flex-col items-center justify-center text-center h-full py-12 space-y-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-primary-400 to-primary-600 rounded-3xl flex items-center justify-center shadow-lg shadow-primary-200">
                    <Sparkles className="w-9 h-9 text-white" />
                  </div>
                  <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-gray-900">Ready to build your story?</h1>
                    <p className="text-gray-500 text-sm leading-relaxed">
                      Connect your tools in 30 seconds and get your evidence-backed performance review.
                    </p>
                  </div>
                  <div className="pt-4 w-full space-y-3">
                    <button
                      onClick={goNext}
                      className="w-full py-4 bg-primary-600 text-white rounded-2xl font-bold text-base hover:bg-primary-700 transition-colors active:scale-[0.98]"
                    >
                      Let's Go
                    </button>
                    <p className="text-xs text-gray-400">{totalActivityCount.toLocaleString()} activities ready to analyze</p>
                  </div>
                </div>
              )}

              {/* Screen 1 — Tool selection */}
              {screen === 1 && (
                <div className="space-y-4">
                  <button onClick={goBack} className="flex items-center gap-1 text-sm text-gray-500 -ml-1">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Which tools do you use?</h2>
                    <p className="text-sm text-gray-500 mt-1">Tap to select. We'll find your best work.</p>
                  </div>

                  <div className="space-y-2 mt-4">
                    {mockTools.map((tool) => {
                      const Icon = TOOL_ICONS[tool.icon];
                      const selected = selectedTools.has(tool.id);
                      const connecting = connectingTools.has(tool.id);
                      return (
                        <button
                          key={tool.id}
                          onClick={() => toggleTool(tool.id)}
                          className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.99] ${
                            selected
                              ? 'border-primary-400 bg-primary-50'
                              : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                          }`}
                        >
                          <div
                            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                            style={{ backgroundColor: `${tool.color}18` }}
                          >
                            {Icon && <Icon className="w-5 h-5" style={{ color: tool.color }} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900 text-sm">{tool.name}</div>
                            <div className="text-xs text-gray-500 truncate">{tool.description}</div>
                          </div>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                            selected ? 'bg-primary-500 border-primary-500' : 'border-gray-300'
                          }`}>
                            {connecting ? (
                              <div className="w-3 h-3 rounded-full border border-primary-400 border-t-transparent animate-spin" />
                            ) : selected ? (
                              <Check className="w-3.5 h-3.5 text-white" />
                            ) : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-4">
                    <button
                      onClick={goNext}
                      disabled={selectedTools.size === 0}
                      className="w-full py-4 bg-primary-600 text-white rounded-2xl font-bold text-base hover:bg-primary-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      Next
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Screen 2 — Syncing */}
              {screen === 2 && (
                <div className="flex flex-col items-center justify-center h-full py-12 space-y-8">
                  <div className="space-y-2 text-center">
                    <h2 className="text-xl font-bold text-gray-900">Syncing your data...</h2>
                    <p className="text-sm text-gray-500">Finding your best work</p>
                  </div>

                  {/* Tool icons marching */}
                  <div className="flex gap-3 flex-wrap justify-center max-w-[240px]">
                    {Array.from(selectedTools).map((toolId) => {
                      const tool = mockTools.find((t) => t.id === toolId);
                      const Icon = tool ? TOOL_ICONS[tool.icon] : null;
                      return tool ? (
                        <div
                          key={toolId}
                          className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md animate-bounce"
                          style={{
                            backgroundColor: `${tool.color}18`,
                            border: `2px solid ${tool.color}33`,
                            animationDelay: `${Math.random() * 0.5}s`,
                            animationDuration: '1.2s',
                          }}
                        >
                          {Icon && <Icon className="w-5 h-5" style={{ color: tool.color }} />}
                        </div>
                      ) : null;
                    })}
                  </div>

                  {/* Progress bar */}
                  <div className="w-full space-y-2">
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full transition-all duration-200"
                        style={{ width: `${syncProgress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Analyzing activities</span>
                      <span>{syncProgress}%</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Screen 3 — Story cards */}
              {screen === 3 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 leading-snug">{story.title}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary">{story.dateRange}</Badge>
                      <Badge>{Math.round(story.confidence * 100)}% confidence</Badge>
                    </div>
                  </div>

                  {/* Horizontal snap scroll cards */}
                  <div
                    ref={storyScrollRef}
                    className="flex gap-3 overflow-x-auto snap-x snap-mandatory -mx-6 px-6 pb-2"
                    style={{ scrollbarWidth: 'none' }}
                  >
                    {story.sections.map((section, i) => (
                      <div
                        key={section.label}
                        className="snap-center flex-shrink-0 w-[calc(100%-1.5rem)] bg-gradient-to-br from-primary-50 to-white border border-primary-100 rounded-2xl p-5"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-bold text-primary-600 uppercase tracking-wider">
                            {section.label}
                          </span>
                          <Badge variant="secondary">{section.evidenceCount} sources</Badge>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">{section.text}</p>
                        <div className="mt-4 text-xs text-gray-400 text-right">
                          {i + 1} of {story.sections.length}
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="text-xs text-gray-400 text-center">Swipe to see all sections</p>

                  <button
                    onClick={goNext}
                    className="w-full py-4 bg-primary-600 text-white rounded-2xl font-bold text-base hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
                  >
                    Use this story
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}

              {/* Screen 4 — Done */}
              {screen === 4 && (
                <div className="flex flex-col items-center justify-center text-center h-full py-12 space-y-6">
                  <div className="w-20 h-20 bg-green-50 rounded-3xl flex items-center justify-center">
                    <CheckCircle2 className="w-10 h-10 text-green-500" />
                  </div>
                  <div className="space-y-1.5">
                    <h2 className="text-2xl font-bold text-gray-900">Done!</h2>
                    <p className="text-gray-500 text-sm">Your story is ready to share.</p>
                  </div>

                  <Card className="w-full text-left">
                    <CardContent className="pt-4 pb-4 space-y-1">
                      <div className="text-xs text-gray-400">Story ready</div>
                      <div className="text-sm font-semibold text-gray-900 line-clamp-2">{story.title}</div>
                      <div className="text-xs text-gray-400">
                        {story.sections.reduce((s, sec) => s + sec.evidenceCount, 0)} evidence items · {story.dateRange}
                      </div>
                    </CardContent>
                  </Card>

                  <div className="w-full space-y-3">
                    <button
                      onClick={handleCopy}
                      className="w-full py-4 bg-primary-600 text-white rounded-2xl font-bold text-base hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
                    >
                      {isCopied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                      {isCopied ? 'Copied!' : 'Copy Story'}
                    </button>
                    <button className="w-full py-4 bg-gray-100 text-gray-700 rounded-2xl font-bold text-base hover:bg-gray-200 transition-colors flex items-center justify-center gap-2">
                      <Share2 className="w-5 h-5" />
                      Share
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Home indicator */}
          <div className="bg-white flex items-center justify-center py-2.5">
            <div className="w-28 h-1 bg-gray-200 rounded-full" />
          </div>
        </div>

        {/* Phone shadow */}
        <div className="absolute inset-0 rounded-[2.5rem] shadow-2xl -z-10 translate-y-2 blur-xl bg-gray-900/30 scale-95" />
      </div>
    </div>
  );
}
