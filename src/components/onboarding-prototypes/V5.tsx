import { useState, useEffect, useRef } from 'react';
import { Badge } from '../ui/badge';
import {
  mockTools,
  mockStories,
  mockActivities,
  SYNC_DELAY,
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
  Bot,
  Copy,
  FileDown,
  Send,
  CheckCircle2,
  Check,
} from 'lucide-react';

const TOOL_ICONS: Record<string, React.ReactNode> = {
  github: <GitBranch className="w-3.5 h-3.5" />,
  jira: <KanbanSquare className="w-3.5 h-3.5" />,
  confluence: <FileText className="w-3.5 h-3.5" />,
  slack: <Hash className="w-3.5 h-3.5" />,
  figma: <Figma className="w-3.5 h-3.5" />,
  'google-meet': <Video className="w-3.5 h-3.5" />,
};

type ChatPhase =
  | 'intro'
  | 'tool-select'
  | 'user-selected'
  | 'syncing'
  | 'story'
  | 'done';

interface Message {
  id: string;
  role: 'bot' | 'user';
  type: 'text' | 'tool-select' | 'dots' | 'story' | 'actions';
  content?: string;
  tools?: ToolId[];
}

const SECTION_BADGE_COLORS: Record<string, string> = {
  Situation: 'bg-blue-100 text-blue-700',
  Task: 'bg-yellow-100 text-yellow-700',
  Action: 'bg-purple-100 text-purple-700',
  Result: 'bg-emerald-100 text-emerald-700',
  Challenge: 'bg-orange-100 text-orange-700',
};

function TypingDots() {
  return (
    <div className="flex gap-1 items-center h-5 px-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
          style={{ animationDelay: `${i * 150}ms`, animationDuration: '0.9s' }}
        />
      ))}
    </div>
  );
}

function BotAvatar() {
  return (
    <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center flex-shrink-0">
      <Bot className="w-4 h-4 text-white" />
    </div>
  );
}

export function OnboardingV5() {
  const [phase, setPhase] = useState<ChatPhase>('intro');
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedTools, setSelectedTools] = useState<Set<ToolId>>(new Set());
  const [showDots, setShowDots] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exported, setExported] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const story = mockStories[0];

  const addMessage = (msg: Omit<Message, 'id'>, delay = 0) => {
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        setMessages((prev) => [...prev, { ...msg, id: Math.random().toString(36).slice(2) }]);
        resolve();
      }, delay);
    });
  };

  // Bootstrap conversation
  useEffect(() => {
    const run = async () => {
      setShowDots(true);
      await new Promise((r) => setTimeout(r, 800));
      setShowDots(false);
      await addMessage({ role: 'bot', type: 'text', content: "Hi! I'm here to help you build your performance story." });
      await new Promise((r) => setTimeout(r, 400));
      setShowDots(true);
      await new Promise((r) => setTimeout(r, 900));
      setShowDots(false);
      await addMessage({
        role: 'bot',
        type: 'text',
        content: `Connect 2 or more tools and I'll analyze your last 90 days — ${totalActivityCount}+ activities — to generate a compelling narrative.`,
      });
      await new Promise((r) => setTimeout(r, 500));
      setShowDots(true);
      await new Promise((r) => setTimeout(r, 700));
      setShowDots(false);
      await addMessage({ role: 'bot', type: 'tool-select', content: 'Which tools do you use? Select all that apply:' });
      setPhase('tool-select');
    };
    run();
  }, []);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, showDots]);

  const handleConnectTools = async () => {
    if (selectedTools.size < 2) return;
    setPhase('user-selected');

    const toolNames = Array.from(selectedTools)
      .map((id) => mockTools.find((t) => t.id === id)!.name)
      .join(', ');

    await addMessage({ role: 'user', type: 'text', content: `I use ${toolNames}` });

    setShowDots(true);
    await new Promise((r) => setTimeout(r, 700));
    setShowDots(false);
    await addMessage({ role: 'bot', type: 'text', content: `Connecting to ${toolNames}...` });

    setShowDots(true);
    await new Promise((r) => setTimeout(r, SYNC_DELAY));
    setShowDots(false);
    setPhase('syncing');

    await addMessage({
      role: 'bot',
      type: 'text',
      content: `Found ${mockActivities.length} key activities. Analyzing patterns and generating your story...`,
    });

    setShowDots(true);
    await new Promise((r) => setTimeout(r, 1200));
    setShowDots(false);
    setPhase('story');

    await addMessage({ role: 'bot', type: 'story', content: 'Here is your performance story:' });
    await new Promise((r) => setTimeout(r, 300));
    await addMessage({ role: 'bot', type: 'actions', content: "Your story is ready! What would you like to do?" });
    setPhase('done');
  };

  const toggleTool = (id: ToolId) => {
    setSelectedTools((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const handleCopy = () => {
    const text = story.sections.map((s) => `${s.label}:\n${s.text}`).join('\n\n');
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    setExported(true);
    setTimeout(() => setExported(false), 2500);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-lg flex flex-col" style={{ height: '85vh' }}>
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-t-2xl border border-b-0 border-gray-200 shadow-sm">
          <div className="w-9 h-9 rounded-full bg-primary-500 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-gray-800">inchronicle</div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-gray-400">Active now</span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto bg-white border border-y-0 border-gray-200 px-4 py-4 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              {msg.role === 'bot' && <BotAvatar />}

              <div className="flex flex-col gap-1 max-w-xs">
                {/* Regular text bubble */}
                {msg.type === 'text' && (
                  <div
                    className={[
                      'px-4 py-3 text-sm leading-relaxed',
                      msg.role === 'bot'
                        ? 'bg-gray-100 text-gray-800 rounded-lg rounded-tl-none'
                        : 'bg-primary-50 text-gray-800 rounded-lg rounded-tr-none border border-primary-100',
                    ].join(' ')}
                  >
                    {msg.content}
                  </div>
                )}

                {/* Tool selection bubble */}
                {msg.type === 'tool-select' && msg.role === 'bot' && (
                  <div className="bg-gray-100 rounded-lg rounded-tl-none overflow-hidden">
                    <div className="px-4 pt-3 pb-2 text-sm text-gray-700">{msg.content}</div>
                    <div className="px-3 pb-3 flex flex-wrap gap-2">
                      {mockTools.map((tool) => {
                        const isSelected = selectedTools.has(tool.id);
                        return (
                          <button
                            key={tool.id}
                            onClick={() => phase === 'tool-select' && toggleTool(tool.id)}
                            disabled={phase !== 'tool-select'}
                            className={[
                              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all duration-150',
                              isSelected
                                ? 'border-primary-500 bg-primary-500 text-white'
                                : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400',
                              phase !== 'tool-select' ? 'opacity-60 cursor-default' : 'cursor-pointer',
                            ].join(' ')}
                          >
                            <span style={{ color: isSelected ? 'white' : tool.color }}>
                              {TOOL_ICONS[tool.id]}
                            </span>
                            {tool.name}
                            {isSelected && <Check className="w-3 h-3" />}
                          </button>
                        );
                      })}
                    </div>
                    {phase === 'tool-select' && (
                      <div className="px-3 pb-3">
                        <button
                          disabled={selectedTools.size < 2}
                          onClick={handleConnectTools}
                          className={[
                            'w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all',
                            selectedTools.size >= 2
                              ? 'bg-primary-500 hover:bg-primary-600 text-white'
                              : 'bg-gray-200 text-gray-400 cursor-not-allowed',
                          ].join(' ')}
                        >
                          <Send className="w-3 h-3" />
                          {selectedTools.size >= 2 ? `Connect ${selectedTools.size} tools` : 'Select 2+ tools'}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Story bubble */}
                {msg.type === 'story' && msg.role === 'bot' && (
                  <div className="bg-gray-100 rounded-lg rounded-tl-none overflow-hidden w-80">
                    <div className="px-4 pt-3 pb-2">
                      <div className="flex items-center justify-between mb-2">
                        <Badge className="text-xs">Performance Story</Badge>
                        <span className="text-xs font-bold text-primary-500">
                          {Math.round(story.confidence * 100)}% confidence
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-gray-800 leading-snug mb-1">{story.title}</h4>
                      <p className="text-xs text-gray-400">{story.dateRange}</p>
                    </div>
                    <div className="px-4 pb-4 space-y-2">
                      {story.sections.map((section) => {
                        const badgeColor = SECTION_BADGE_COLORS[section.label] ?? 'bg-gray-100 text-gray-600';
                        return (
                          <div key={section.label} className="bg-white rounded-xl p-3 border border-gray-100">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${badgeColor}`}>
                                {section.label}
                              </span>
                              <span className="text-xs text-gray-400">{section.evidenceCount} signals</span>
                            </div>
                            <p className="text-xs text-gray-700 leading-relaxed">{section.text}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Action buttons bubble */}
                {msg.type === 'actions' && msg.role === 'bot' && (
                  <div className="bg-gray-100 rounded-lg rounded-tl-none px-4 py-3">
                    <p className="text-sm text-gray-700 mb-3">{msg.content}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleCopy}
                        className={[
                          'flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all',
                          copied
                            ? 'bg-emerald-500 text-white'
                            : 'bg-primary-500 hover:bg-primary-600 text-white',
                        ].join(' ')}
                      >
                        {copied ? (
                          <><CheckCircle2 className="w-3.5 h-3.5" /> Copied</>
                        ) : (
                          <><Copy className="w-3.5 h-3.5" /> Copy</>
                        )}
                      </button>
                      <button
                        onClick={handleExport}
                        className={[
                          'flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border transition-all',
                          exported
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                            : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400',
                        ].join(' ')}
                      >
                        {exported ? (
                          <><CheckCircle2 className="w-3.5 h-3.5" /> Sent!</>
                        ) : (
                          <><FileDown className="w-3.5 h-3.5" /> Export</>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-gray-500">You</span>
                </div>
              )}
            </div>
          ))}

          {/* Typing dots */}
          {showDots && (
            <div className="flex gap-2.5 flex-row">
              <BotAvatar />
              <div className="bg-gray-100 rounded-lg rounded-tl-none px-4 py-3">
                <TypingDots />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-white rounded-b-2xl border border-t-0 border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <div className="flex-1 bg-gray-100 rounded-xl px-4 py-2.5 text-gray-400 cursor-default select-none">
              inchronicle handles this conversation for you...
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
