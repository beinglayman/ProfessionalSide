import { useState } from 'react';
import { Badge } from '../ui/badge';
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
  Lock,
  Unlock,
  Zap,
  X,
  ArrowRight,
} from 'lucide-react';

const TOOL_ICONS: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  GitBranch,
  KanbanSquare,
  FileText,
  Hash,
  Figma,
  Video,
};

type Phase = 'idle' | 'selecting' | 'syncing' | 'revealed';

const GENERIC_SECTIONS = [
  {
    label: 'Situation',
    text: 'I contributed to several projects and demonstrated strong leadership throughout the quarter. My work had a positive impact on the team and broader organization.',
  },
  {
    label: 'Task',
    text: 'I was responsible for key technical deliverables and collaborated effectively with cross-functional stakeholders to drive successful outcomes.',
  },
  {
    label: 'Action',
    text: 'I proactively identified areas for improvement, implemented solutions, and communicated progress regularly to ensure alignment with team goals.',
  },
  {
    label: 'Result',
    text: 'My contributions helped the team meet its objectives. I received positive feedback from peers and managers regarding my performance.',
  },
];

export function OnboardingV12() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [selectedTools, setSelectedTools] = useState<Set<ToolId>>(new Set());
  const [syncProgress, setSyncProgress] = useState(0);
  const [connectingTools, setConnectingTools] = useState<Set<ToolId>>(new Set());
  const [isCopied, setIsCopied] = useState(false);

  const story = mockStories[0];

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

  const handleConnect = () => {
    if (selectedTools.size === 0) return;
    setPhase('syncing');
    let progress = 0;
    const interval = setInterval(() => {
      progress += 5;
      setSyncProgress(Math.min(progress, 100));
      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => setPhase('revealed'), 400);
      }
    }, SYNC_DELAY / 20);
  };

  const handleCopy = () => {
    const text = `${story.title}\n\n${story.sections.map((s) => `${s.label}:\n${s.text}`).join('\n\n')}`;
    navigator.clipboard.writeText(text).catch(() => {});
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-primary-600 rounded-lg" />
          <span className="font-bold text-gray-900">inchronicle</span>
        </div>
        <Badge variant="secondary">Before / After Preview</Badge>
      </div>

      {/* Main split layout */}
      <div className="flex min-h-[calc(100vh-65px)]">
        {/* LEFT — Without inchronicle */}
        <div className="w-1/2 border-r border-gray-200 bg-white p-10 flex flex-col">
          <div className="mb-6">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />
              Without inchronicle
            </span>
          </div>

          {/* Generic bland self-review */}
          <div className="flex-1 space-y-4">
            <h2 className="text-xl font-semibold text-gray-400">
              My Performance Review — Q4 2025
            </h2>
            <p className="text-sm text-gray-400 italic">Written from memory, no evidence attached</p>

            <div className="space-y-5 mt-6">
              {GENERIC_SECTIONS.map((section) => (
                <div key={section.label} className="space-y-1.5">
                  <div className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    {section.label}
                  </div>
                  <p className="text-gray-400 leading-relaxed text-sm">{section.text}</p>
                  <div className="h-px bg-gray-100 mt-3" />
                </div>
              ))}
            </div>

            {/* Generic weaknesses indicator */}
            <div className="mt-8 p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="text-xs font-semibold text-gray-400 mb-2">Issues with this review</div>
              <ul className="space-y-1.5">
                {[
                  'No specific metrics or numbers',
                  'Vague claims — hard to verify',
                  'No linked evidence or sources',
                  'Forgettable and easy to dismiss',
                ].map((issue) => (
                  <li key={issue} className="flex items-center gap-2 text-xs text-gray-400">
                    <X className="w-3.5 h-3.5 text-red-300 shrink-0" />
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* CENTER — Connect button overlay */}
        <div className="relative -mx-px z-10 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-full w-px bg-gradient-to-b from-transparent via-primary-300 to-transparent" />
          </div>

          <div className="relative bg-white rounded-full shadow-xl border-2 border-primary-200 p-0.5">
            {phase === 'idle' && (
              <button
                onClick={() => setPhase('selecting')}
                className="flex flex-col items-center gap-1 px-5 py-4 rounded-full hover:bg-primary-50 transition-colors"
              >
                <Lock className="w-5 h-5 text-primary-600" />
                <span className="text-xs font-bold text-primary-700 whitespace-nowrap">Connect to unlock</span>
              </button>
            )}
            {phase === 'syncing' && (
              <div className="flex flex-col items-center gap-1 px-5 py-4">
                <div className="w-5 h-5 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
                <span className="text-xs font-bold text-primary-700 whitespace-nowrap">{syncProgress}%</span>
              </div>
            )}
            {phase === 'revealed' && (
              <div className="flex flex-col items-center gap-1 px-5 py-4">
                <Unlock className="w-5 h-5 text-primary-600" />
                <span className="text-xs font-bold text-primary-700 whitespace-nowrap">Unlocked!</span>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — With inchronicle */}
        <div className="w-1/2 bg-white p-10 flex flex-col relative overflow-hidden">
          {/* Blur overlay before reveal */}
          {phase !== 'revealed' && (
            <div
              className={`absolute inset-0 z-10 bg-white/60 backdrop-blur-md flex flex-col items-center justify-center gap-4 transition-opacity duration-700 ${
                phase === 'syncing' ? 'opacity-80' : 'opacity-100'
              }`}
            >
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
                <Lock className="w-7 h-7 text-primary-500" />
              </div>
              <p className="text-sm font-semibold text-gray-600 text-center max-w-xs">
                Connect your tools to see your evidence-backed review
              </p>
            </div>
          )}

          <div className={`transition-all duration-700 ${phase === 'revealed' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="mb-6 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-primary-500 inline-block animate-pulse" />
                With inchronicle
              </span>
              <Badge>{Math.round(story.confidence * 100)}% confidence</Badge>
            </div>

            <h2 className="text-xl font-bold text-gray-900 mb-1">{story.title}</h2>
            <p className="text-sm text-gray-500 mb-6">{story.dateRange}</p>

            {/* Tool badges */}
            <div className="flex gap-2 mb-6">
              {story.tools.map((toolId) => {
                const tool = mockTools.find((t) => t.id === toolId);
                const Icon = tool ? TOOL_ICONS[tool.icon] : null;
                return tool ? (
                  <span
                    key={toolId}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                    style={{ backgroundColor: `${tool.color}18`, color: tool.color }}
                  >
                    {Icon && <Icon className="w-3 h-3" />}
                    {tool.name}
                  </span>
                ) : null;
              })}
            </div>

            <div className="space-y-0 rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
              {story.sections.map((section, i) => (
                <div
                  key={section.label}
                  className={`p-5 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${
                    i < story.sections.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="text-xs font-bold text-primary-600 uppercase tracking-wider mb-1.5">
                        {section.label}
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">{section.text}</p>
                    </div>
                    <Badge variant="secondary" className="shrink-0 mt-0.5 whitespace-nowrap">
                      {section.evidenceCount} sources
                    </Badge>
                  </div>
                </div>
              ))}
            </div>

            {/* Strengths indicator */}
            <div className="mt-6 p-4 bg-primary-50 rounded-xl border border-primary-100">
              <div className="text-xs font-semibold text-primary-700 mb-2">Why this works</div>
              <ul className="space-y-1.5">
                {[
                  'Specific metrics: 94% reduction, 2 weeks ahead',
                  '20 evidence items linked from 3 tools',
                  'Verifiable timeline with exact dates',
                  'Quantified business impact',
                ].map((strength) => (
                  <li key={strength} className="flex items-center gap-2 text-xs text-primary-700">
                    <Check className="w-3.5 h-3.5 text-primary-500 shrink-0" />
                    {strength}
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={handleCopy}
              className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-colors"
            >
              {isCopied ? <Check className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              {isCopied ? 'Copied to clipboard' : 'Use this story'}
            </button>
          </div>
        </div>
      </div>

      {/* Tool selection overlay */}
      {phase === 'selecting' && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Connect your tools</h3>
                <p className="text-sm text-gray-500 mt-0.5">Select tools to analyze your work history</p>
              </div>
              <button
                onClick={() => setPhase('idle')}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {mockTools.map((tool) => {
                const Icon = TOOL_ICONS[tool.icon];
                const selected = selectedTools.has(tool.id);
                const connecting = connectingTools.has(tool.id);
                return (
                  <button
                    key={tool.id}
                    onClick={() => toggleTool(tool.id)}
                    className={`relative flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                      selected
                        ? 'border-primary-400 bg-primary-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    {connecting && (
                      <span className="absolute top-2 right-2 w-4 h-4 rounded-full border-2 border-primary-400 border-t-transparent animate-spin" />
                    )}
                    {selected && !connecting && (
                      <span className="absolute top-2 right-2 w-4 h-4 bg-primary-500 rounded-full flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </span>
                    )}
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${tool.color}18` }}
                    >
                      {Icon && <Icon className="w-4 h-4" style={{ color: tool.color }} />}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{tool.name}</div>
                      <div className="text-xs text-gray-400">{tool.activityCount} items</div>
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleConnect}
              disabled={selectedTools.size === 0}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Zap className="w-4 h-4" />
              Connect {selectedTools.size > 0 ? `${selectedTools.size} tool${selectedTools.size !== 1 ? 's' : ''}` : 'tools'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
