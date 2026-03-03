import { useState, useEffect } from 'react';
import { mockTools, mockStories, SYNC_DELAY, CONNECT_DELAY } from './mock-data';
import type { ToolId } from './mock-data';
import {
  GitBranch,
  KanbanSquare,
  FileText,
  Hash,
  Figma,
  Video,
  Check,
  Copy,
  Download,
  Feather,
  Zap,
  Award,
} from 'lucide-react';

const TOOL_ICONS: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  GitBranch,
  KanbanSquare,
  FileText,
  Hash,
  Figma,
  Video,
};

type Phase = 'idle' | 'connecting' | 'typing' | 'done';

// Flatten to char array with metadata
interface TypeChar {
  char: string;
  isTitle: boolean;
  isSectionHeader: boolean;
  sectionIdx?: number;
}

function buildCharArray(story: typeof mockStories[0]): TypeChar[] {
  const chars: TypeChar[] = [];

  // Title
  for (const ch of story.title) {
    chars.push({ char: ch, isTitle: true, isSectionHeader: false });
  }
  chars.push({ char: '\n', isTitle: false, isSectionHeader: false });
  chars.push({ char: '\n', isTitle: false, isSectionHeader: false });

  story.sections.forEach((section, sectionIdx) => {
    // Section header
    for (const ch of `${section.label}`) {
      chars.push({ char: ch, isTitle: false, isSectionHeader: true, sectionIdx });
    }
    chars.push({ char: '\n', isTitle: false, isSectionHeader: false, sectionIdx });

    // Section body
    for (const ch of section.text) {
      chars.push({ char: ch, isTitle: false, isSectionHeader: false, sectionIdx });
    }

    if (sectionIdx < story.sections.length - 1) {
      chars.push({ char: '\n', isTitle: false, isSectionHeader: false });
      chars.push({ char: '\n', isTitle: false, isSectionHeader: false });
    }
  });

  return chars;
}

// Small random offset for typewriter "key press" feel
function randomOffset() {
  return (Math.random() - 0.5) * 0.6;
}

export function OnboardingV15() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [selectedTools, setSelectedTools] = useState<Set<ToolId>>(new Set());
  const [connectingTools, setConnectingTools] = useState<Set<ToolId>>(new Set());
  const [showToolPanel, setShowToolPanel] = useState(false);
  const [revealedCount, setRevealedCount] = useState(0);
  const [isCopied, setIsCopied] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);

  const story = mockStories[0];
  const charArray = buildCharArray(story);
  const totalChars = charArray.length;

  // Blink cursor
  useEffect(() => {
    const interval = setInterval(() => setCursorVisible((v) => !v), 530);
    return () => clearInterval(interval);
  }, []);

  // Typing effect
  useEffect(() => {
    if (phase !== 'typing') return;
    if (revealedCount >= totalChars) {
      setTimeout(() => setPhase('done'), 600);
      return;
    }

    // Vary speed: faster for spaces, slower for newlines, normal otherwise
    const ch = charArray[revealedCount]?.char;
    const delay = ch === '\n' ? 80 : ch === ' ' ? 18 : Math.random() * 25 + 22;

    const timeout = setTimeout(() => {
      setRevealedCount((c) => c + 1);
    }, delay);
    return () => clearTimeout(timeout);
  }, [phase, revealedCount, totalChars]);

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

  const handleBegin = () => {
    if (selectedTools.size === 0) return;
    setShowToolPanel(false);
    setPhase('connecting');
    setTimeout(() => {
      setPhase('typing');
      setRevealedCount(0);
    }, SYNC_DELAY);
  };

  const handleCopy = () => {
    const text = `${story.title}\n\n${story.sections.map((s) => `${s.label}:\n${s.text}`).join('\n\n')}`;
    navigator.clipboard.writeText(text).catch(() => {});
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Build rendered segments from revealed chars
  function renderTypedText() {
    const revealed = charArray.slice(0, revealedCount);
    const nodes: React.ReactNode[] = [];
    let i = 0;

    while (i < revealed.length) {
      const c = revealed[i];

      if (c.char === '\n') {
        nodes.push(<br key={`br-${i}`} />);
        i++;
        continue;
      }

      if (c.isTitle) {
        // Collect consecutive title chars
        let text = '';
        while (i < revealed.length && revealed[i].isTitle && revealed[i].char !== '\n') {
          text += revealed[i].char;
          i++;
        }
        nodes.push(
          <span key={`title-${i}`} className="font-serif font-bold text-2xl text-gray-900 leading-tight">
            {text.split('').map((ch, ci) => (
              <span
                key={ci}
                style={{ display: 'inline-block', transform: `translateY(${randomOffset()}px) rotate(${randomOffset() * 0.3}deg)` }}
              >
                {ch}
              </span>
            ))}
          </span>
        );
        continue;
      }

      if (c.isSectionHeader) {
        let text = '';
        while (i < revealed.length && revealed[i].isSectionHeader && revealed[i].char !== '\n') {
          text += revealed[i].char;
          i++;
        }
        nodes.push(
          <span key={`header-${i}`} className="font-serif font-semibold text-sm uppercase tracking-widest text-primary-700">
            {text}
          </span>
        );
        continue;
      }

      // Body text
      let text = '';
      const sIdx = c.sectionIdx;
      while (
        i < revealed.length &&
        !revealed[i].isTitle &&
        !revealed[i].isSectionHeader &&
        revealed[i].char !== '\n' &&
        revealed[i].sectionIdx === sIdx
      ) {
        text += revealed[i].char;
        i++;
      }
      if (text) {
        nodes.push(
          <span key={`body-${i}`} className="font-serif text-gray-800 text-base leading-relaxed">
            {text.split('').map((ch, ci) => (
              <span
                key={ci}
                style={{
                  display: 'inline-block',
                  transform: `translateY(${randomOffset() * 0.5}px)`,
                }}
              >
                {ch === ' ' ? '\u00A0' : ch}
              </span>
            ))}
          </span>
        );
      }
    }

    return nodes;
  }

  const isTypingOrDone = phase === 'typing' || phase === 'done';

  return (
    <div
      className="min-h-screen font-serif relative"
      style={{
        backgroundColor: '#faf8f4',
        backgroundImage: `
          repeating-linear-gradient(
            0deg,
            transparent,
            transparent 27px,
            rgba(180, 160, 120, 0.12) 27px,
            rgba(180, 160, 120, 0.12) 28px
          )
        `,
      }}
    >
      {/* Paper texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Top bar — minimal */}
      <div className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-amber-200/50">
        <div className="flex items-center gap-2">
          <Feather className="w-4 h-4 text-amber-700" />
          <span className="text-sm font-semibold text-amber-900 tracking-wide" style={{ fontFamily: 'Georgia, serif' }}>
            inchronicle
          </span>
        </div>

        {phase === 'idle' && (
          <button
            onClick={() => setShowToolPanel(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-900 text-amber-50 rounded-lg text-sm font-semibold hover:bg-amber-800 transition-colors"
          >
            <Zap className="w-3.5 h-3.5" />
            Connect tools
          </button>
        )}

        {phase === 'connecting' && (
          <div className="flex items-center gap-2 text-sm text-amber-700">
            <div className="w-3.5 h-3.5 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
            Gathering your work history...
          </div>
        )}

        {isTypingOrDone && (
          <div className="flex items-center gap-2 text-xs text-amber-600">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            {revealedCount < totalChars ? 'Writing...' : 'Complete'}
          </div>
        )}
      </div>

      {/* Main typing area */}
      <div className="relative z-10 max-w-2xl mx-auto px-8 py-16">
        {/* Idle state */}
        {phase === 'idle' && (
          <div className="text-center space-y-8 py-20">
            <div className="space-y-3">
              <p className="text-amber-700/60 text-sm tracking-widest uppercase">performance review season</p>
              <h1 className="text-4xl font-bold text-gray-800 leading-tight" style={{ fontFamily: 'Georgia, serif' }}>
                Your work, in your words.
              </h1>
              <p className="text-gray-500 text-lg leading-relaxed max-w-md mx-auto" style={{ fontFamily: 'Georgia, serif' }}>
                Connect your tools and watch your performance story write itself.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 text-amber-600">
              <span className="w-px h-8 bg-amber-400 animate-pulse" />
              <span className="text-sm italic">waiting for your story...</span>
            </div>
          </div>
        )}

        {/* Connecting state */}
        {phase === 'connecting' && (
          <div className="text-center space-y-6 py-20">
            <div className="flex items-center justify-center gap-3">
              {Array.from(selectedTools).map((toolId, i) => {
                const tool = mockTools.find((t) => t.id === toolId);
                const Icon = tool ? TOOL_ICONS[tool.icon] : null;
                return tool ? (
                  <div
                    key={toolId}
                    className="w-10 h-10 rounded-full flex items-center justify-center animate-bounce"
                    style={{
                      backgroundColor: `${tool.color}20`,
                      border: `1.5px solid ${tool.color}40`,
                      animationDelay: `${i * 0.15}s`,
                      animationDuration: '1s',
                    }}
                  >
                    {Icon && <Icon className="w-4 h-4" style={{ color: tool.color }} />}
                  </div>
                ) : null;
              })}
            </div>
            <p className="text-amber-700/80 italic text-sm" style={{ fontFamily: 'Georgia, serif' }}>
              Gathering your work history...
            </p>
          </div>
        )}

        {/* Typing + Done states */}
        {isTypingOrDone && (
          <div className="space-y-6">
            {/* Typewriter output */}
            <div className="min-h-[300px] leading-relaxed">
              {renderTypedText()}
              {/* Blinking cursor */}
              {phase === 'typing' && (
                <span
                  className="inline-block w-0.5 h-5 bg-amber-700 ml-0.5 align-middle transition-opacity"
                  style={{ opacity: cursorVisible ? 1 : 0 }}
                />
              )}
            </div>

            {/* Completion */}
            {phase === 'done' && (
              <div className="pt-6 border-t border-amber-200 space-y-6">
                {/* Ding moment */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 border border-amber-200 rounded-full">
                    <Award className="w-4 h-4 text-amber-700" />
                    <span className="text-sm font-semibold text-amber-800" style={{ fontFamily: 'Georgia, serif' }}>
                      Story complete
                    </span>
                  </div>
                  <span className="text-sm text-gray-400">
                    {story.sections.reduce((s, sec) => s + sec.evidenceCount, 0)} evidence items · {story.dateRange}
                  </span>
                </div>

                {/* Evidence badges per section */}
                <div className="flex flex-wrap gap-2">
                  {story.sections.map((section) => (
                    <span
                      key={section.label}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-gray-200 rounded-full text-xs text-gray-600 shadow-sm"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-primary-400 inline-block" />
                      {section.label}: {section.evidenceCount} sources
                    </span>
                  ))}
                </div>

                {/* Export actions */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-2 px-5 py-2.5 bg-amber-900 text-amber-50 rounded-lg text-sm font-semibold hover:bg-amber-800 transition-colors"
                  >
                    {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {isCopied ? 'Copied!' : 'Copy story'}
                  </button>
                  <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors shadow-sm">
                    <Download className="w-4 h-4" />
                    Save as PDF
                  </button>
                  <span className="text-xs text-gray-400 ml-auto">
                    {Math.round(story.confidence * 100)}% confidence
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tool selection panel */}
      {showToolPanel && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-end sm:items-center justify-center p-4">
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5 border border-amber-100"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            <div>
              <h3 className="text-lg font-bold text-gray-900">Connect your tools</h3>
              <p className="text-sm text-gray-500 mt-0.5" style={{ fontFamily: 'Inter, sans-serif' }}>
                Select tools to pull your work history from
              </p>
            </div>

            <div className="space-y-2" style={{ fontFamily: 'Inter, sans-serif' }}>
              {mockTools.map((tool) => {
                const Icon = TOOL_ICONS[tool.icon];
                const selected = selectedTools.has(tool.id);
                const connecting = connectingTools.has(tool.id);
                return (
                  <button
                    key={tool.id}
                    onClick={() => toggleTool(tool.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                      selected ? 'border-amber-400 bg-amber-50' : 'border-gray-100 hover:border-gray-200 bg-white'
                    }`}
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${tool.color}18` }}
                    >
                      {Icon && <Icon className="w-4 h-4" style={{ color: tool.color }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900">{tool.name}</div>
                      <div className="text-xs text-gray-400">{tool.activityCount} {tool.activityLabel}</div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      selected ? 'bg-amber-600 border-amber-600' : 'border-gray-300'
                    }`}>
                      {connecting ? (
                        <div className="w-3 h-3 rounded-full border border-amber-300 border-t-transparent animate-spin" />
                      ) : selected ? (
                        <Check className="w-3 h-3 text-white" />
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex gap-3" style={{ fontFamily: 'Inter, sans-serif' }}>
              <button
                onClick={() => setShowToolPanel(false)}
                className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBegin}
                disabled={selectedTools.size === 0}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-amber-900 text-amber-50 rounded-lg text-sm font-semibold hover:bg-amber-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Feather className="w-4 h-4" />
                Begin writing ({selectedTools.size} tool{selectedTools.size !== 1 ? 's' : ''})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
