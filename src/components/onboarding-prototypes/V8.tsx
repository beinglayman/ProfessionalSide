import { useState, useEffect } from 'react';
import { mockTools, mockStories, SYNC_DELAY } from './mock-data';
import type { ToolId } from './mock-data';
import { Copy, Share2, Edit3, Check, GitBranch, KanbanSquare, FileText, Hash, Video, Figma } from 'lucide-react';

type Step = 'intro' | 'connect' | 'syncing' | 'story';

const TOOL_ICON_COMPONENTS: Record<string, React.ElementType> = {
  GitBranch,
  KanbanSquare,
  FileText,
  Hash,
  Video,
  Figma,
};

export function OnboardingV8() {
  const [step, setStep] = useState<Step>('intro');
  const [selectedTools, setSelectedTools] = useState<Set<ToolId>>(new Set());
  const [syncProgress, setSyncProgress] = useState(0);
  const [revealedSections, setRevealedSections] = useState(0);
  const [copied, setCopied] = useState(false);
  const [pulse, setPulse] = useState(false);

  const story = mockStories[0];

  useEffect(() => {
    if (step !== 'syncing') return;
    setPulse(true);
    let prog = 0;
    const interval = setInterval(() => {
      prog = Math.min(prog + Math.ceil(Math.random() * 5 + 2), 100);
      setSyncProgress(prog);
      if (prog >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setStep('story');
          // Reveal sections staggered
          let s = 0;
          const reveal = setInterval(() => {
            s++;
            setRevealedSections(s);
            if (s >= story.sections.length) clearInterval(reveal);
          }, 600);
        }, 600);
      }
    }, SYNC_DELAY / 28);
    return () => clearInterval(interval);
  }, [step, story.sections.length]);

  function handleConnect() {
    if (selectedTools.size === 0) return;
    setStep('syncing');
  }

  function handleCopy() {
    const text = [
      story.title,
      '',
      ...story.sections.map((s) => `${s.label}\n${s.text}`),
    ].join('\n\n');
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Gradient background */}
      <div
        className={`absolute inset-0 transition-all duration-1000 ${
          step === 'syncing'
            ? pulse
              ? 'bg-gradient-to-br from-primary-100 via-purple-50 to-indigo-100 animate-pulse'
              : 'bg-gradient-to-br from-primary-50 via-white to-purple-50'
            : step === 'story'
            ? 'bg-white'
            : 'bg-gradient-to-b from-gray-50 to-white'
        }`}
      />

      <div className="relative z-10 min-h-screen flex flex-col">

        {/* INTRO */}
        {step === 'intro' && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
            <h1 className="text-4xl font-light text-gray-800 leading-tight max-w-lg mb-10 tracking-tight">
              What if your work<br />
              <span className="text-gray-400">spoke for itself?</span>
            </h1>
            <button
              onClick={() => setStep('connect')}
              className="text-sm text-gray-400 border border-gray-200 px-8 py-3 rounded-full hover:border-gray-300 hover:text-gray-600 transition-all duration-200"
            >
              See how it works
            </button>
          </div>
        )}

        {/* CONNECT — minimal overlay */}
        {step === 'connect' && (
          <div className="flex-1 flex flex-col items-center justify-center px-6">
            <p className="text-sm text-gray-400 uppercase tracking-widest mb-10">Connect your tools</p>
            <div className="flex items-center gap-5 flex-wrap justify-center mb-12">
              {mockTools.map((tool) => {
                const selected = selectedTools.has(tool.id);
                const Icon = TOOL_ICON_COMPONENTS[tool.icon] ?? FileText;
                return (
                  <button
                    key={tool.id}
                    onClick={() => {
                      const next = new Set(selectedTools);
                      if (next.has(tool.id)) next.delete(tool.id);
                      else next.add(tool.id);
                      setSelectedTools(next);
                    }}
                    title={tool.name}
                    className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-200 ${
                      selected
                        ? 'border-primary-400 bg-primary-50 shadow-md shadow-primary-100'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <Icon
                      size={24}
                      className={selected ? 'text-primary-600' : 'text-gray-400'}
                    />
                    <span className={`text-xs ${selected ? 'text-primary-700 font-medium' : 'text-gray-500'}`}>
                      {tool.name}
                    </span>
                    {selected && (
                      <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-primary-500 rounded-full flex items-center justify-center">
                        <Check size={9} className="text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <button
              onClick={handleConnect}
              disabled={selectedTools.size === 0}
              className="text-sm text-white bg-gray-900 px-10 py-3 rounded-full hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
            >
              {selectedTools.size === 0 ? 'Select a tool' : `Continue with ${selectedTools.size} tool${selectedTools.size > 1 ? 's' : ''}`}
            </button>
          </div>
        )}

        {/* SYNCING */}
        {step === 'syncing' && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
            <div className="mb-8">
              <div className="w-16 h-16 rounded-full border-4 border-primary-200 border-t-primary-500 animate-spin mx-auto mb-6" />
              <p className="text-xl text-gray-500 font-light">Reading your work...</p>
              <p className="text-sm text-gray-400 mt-2">{syncProgress}% complete</p>
            </div>
            <div className="w-48 h-0.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-400 rounded-full transition-all duration-300"
                style={{ width: `${syncProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* STORY */}
        {step === 'story' && (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto px-8 py-20 pb-32">
              {/* Story title */}
              <h1
                className="text-3xl font-serif text-gray-900 leading-tight mb-3"
                style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
              >
                {story.title}
              </h1>
              <p className="text-sm text-gray-400 mb-16 font-light tracking-wide">{story.dateRange}</p>

              {/* Story sections */}
              <div className="space-y-14">
                {story.sections.slice(0, revealedSections).map((section) => (
                  <div
                    key={section.label}
                    className="transition-all duration-700"
                  >
                    <p
                      className="text-xs uppercase tracking-[0.2em] text-gray-400 mb-4 font-medium"
                    >
                      {section.label}
                    </p>
                    <p
                      className="text-gray-700 leading-[1.9] text-lg font-light"
                      style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                    >
                      {section.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Floating action bar — only in story step */}
        {step === 'story' && revealedSections >= story.sections.length && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-20">
            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-full shadow-xl px-2 py-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <div className="w-px h-4 bg-gray-200" />
              <button className="flex items-center gap-2 px-4 py-2 rounded-full text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                <Share2 size={14} />
                Share
              </button>
              <div className="w-px h-4 bg-gray-200" />
              <button className="flex items-center gap-2 px-4 py-2 rounded-full text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                <Edit3 size={14} />
                Edit
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
