import { useState } from 'react';
import { Badge } from '../ui/badge';
import { mockTools, mockStories, mockActivities, SYNC_DELAY, CONNECT_DELAY, totalActivityCount } from './mock-data';
import type { ToolId } from './mock-data';
import {
  GitBranch,
  KanbanSquare,
  FileText,
  Hash,
  Figma,
  Video,
  Search,
  Check,
  Zap,
  ExternalLink,
  Copy,
  ChevronRight,
  Sparkles,
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

type Phase = 'search' | 'connecting' | 'syncing' | 'results';

export function OnboardingV14() {
  const [phase, setPhase] = useState<Phase>('search');
  const [selectedTools, setSelectedTools] = useState<Set<ToolId>>(new Set());
  const [syncProgress, setSyncProgress] = useState(0);
  const [isCopied, setIsCopied] = useState(false);
  const [connectingTools, setConnectingTools] = useState<Set<ToolId>>(new Set());
  const [visibleResults, setVisibleResults] = useState(0);

  const story = mockStories[0];
  const totalEvidence = story.sections.reduce((s, sec) => s + sec.evidenceCount, 0);

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

  const handleSync = () => {
    if (selectedTools.size === 0) return;
    setPhase('syncing');
    let progress = 0;
    const interval = setInterval(() => {
      progress += 5;
      setSyncProgress(Math.min(progress, 100));
      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setPhase('results');
          // Reveal results one by one
          let count = 0;
          const reveal = setInterval(() => {
            count++;
            setVisibleResults(count);
            if (count >= story.sections.length + 1) clearInterval(reveal);
          }, 200);
        }, 300);
      }
    }, SYNC_DELAY / 20);
  };

  const handleCopy = () => {
    const text = `${story.title}\n\n${story.sections.map((s) => `${s.label}:\n${s.text}`).join('\n\n')}`;
    navigator.clipboard.writeText(text).catch(() => {});
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const selectedToolsList = mockTools.filter((t) => selectedTools.has(t.id));

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Google-style header */}
      <div className="border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-primary-600 rounded-md" />
          <span className="text-lg font-bold text-gray-900">inchronicle</span>
        </div>
        <div className="text-gray-300">|</div>
        <span className="text-sm text-gray-500">Work History Search</span>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Search bar — always visible */}
        <div className="relative mb-8">
          <div className="flex items-center gap-3 px-5 py-3.5 border-2 border-gray-200 rounded-2xl hover:border-gray-300 hover:shadow-md transition-all bg-white">
            <Search className="w-5 h-5 text-gray-400 shrink-0" />
            <span className="text-gray-400 text-base flex-1">
              {phase === 'search' || phase === 'connecting'
                ? 'Search your work history...'
                : phase === 'syncing'
                ? 'Analyzing your work history...'
                : story.title}
            </span>
            {phase === 'syncing' && (
              <div className="w-5 h-5 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
            )}
            {phase === 'results' && (
              <div className="w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </div>
            )}
          </div>

          {/* Search result count */}
          {phase === 'results' && (
            <div className="mt-2 text-xs text-gray-500 px-1">
              About {totalEvidence} results ({(Math.random() * 0.3 + 0.1).toFixed(2)} seconds)
            </div>
          )}
        </div>

        {/* Phase: Search — initial CTA */}
        {phase === 'search' && (
          <div className="space-y-6">
            <div className="text-center py-8 space-y-4">
              <div className="text-gray-400 text-sm">No query? No problem.</div>
              <button
                onClick={() => setPhase('connecting')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-colors shadow-md shadow-primary-100"
              >
                <Sparkles className="w-4 h-4" />
                Or let us find your best stories
              </button>
            </div>

            {/* Suggested searches decorative */}
            <div className="space-y-2">
              <div className="text-xs text-gray-400 font-semibold px-1">Suggested searches</div>
              {[
                'Led technical project with measurable impact',
                'Mentored or unblocked teammates',
                'Improved system reliability or performance',
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => setPhase('connecting')}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 text-left group transition-colors"
                >
                  <Search className="w-4 h-4 text-gray-300 group-hover:text-gray-400 transition-colors" />
                  <span className="text-sm text-gray-600">{q}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-400 ml-auto transition-colors" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Phase: Connecting — compact tool toggles */}
        {phase === 'connecting' && (
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-1">Connect your tools</h3>
              <p className="text-sm text-gray-500">We'll scan your work history for the best stories.</p>
            </div>

            <div className="space-y-2">
              {mockTools.map((tool) => {
                const Icon = TOOL_ICONS[tool.icon];
                const selected = selectedTools.has(tool.id);
                const connecting = connectingTools.has(tool.id);
                return (
                  <button
                    key={tool.id}
                    onClick={() => toggleTool(tool.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                      selected
                        ? 'border-primary-300 bg-primary-50'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${tool.color}18` }}
                    >
                      {Icon && <Icon className="w-4 h-4" style={{ color: tool.color }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900">{tool.name}</div>
                      <div className="text-xs text-gray-400 truncate">{tool.activityCount} {tool.activityLabel}</div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                      selected ? 'bg-primary-500 border-primary-500' : 'border-gray-300'
                    }`}>
                      {connecting ? (
                        <div className="w-3 h-3 rounded-full border border-primary-300 border-t-transparent animate-spin" />
                      ) : selected ? (
                        <Check className="w-3 h-3 text-white" />
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleSync}
              disabled={selectedTools.size === 0}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Zap className="w-4 h-4" />
              Search with {selectedTools.size || 0} tool{selectedTools.size !== 1 ? 's' : ''}
            </button>
          </div>
        )}

        {/* Phase: Syncing */}
        {phase === 'syncing' && (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <div className="w-4 h-4 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
              Scanning {selectedToolsList.map((t) => t.name).join(', ')}...
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full transition-all duration-200"
                style={{ width: `${syncProgress}%` }}
              />
            </div>
            <div className="space-y-2 opacity-40">
              {mockActivities.slice(0, 3).map((a, i) => (
                <div key={i} className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: `${70 + i * 8}%` }} />
              ))}
            </div>
          </div>
        )}

        {/* Phase: Results */}
        {phase === 'results' && (
          <div className="space-y-5">
            {/* Featured snippet */}
            <div
              className={`transition-all duration-500 ${visibleResults >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
            >
              <div className="border border-primary-200 rounded-2xl bg-primary-50 overflow-hidden">
                <div className="px-5 py-3 border-b border-primary-100 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary-500" />
                  <span className="text-xs font-bold text-primary-700 uppercase tracking-wider">Featured Story</span>
                </div>
                <div className="p-5 space-y-3">
                  <h2 className="text-lg font-bold text-primary-700">{story.title}</h2>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge>{Math.round(story.confidence * 100)}% confidence</Badge>
                    <Badge variant="secondary">{story.dateRange}</Badge>
                    {story.tools.map((toolId) => {
                      const tool = mockTools.find((t) => t.id === toolId);
                      return tool ? (
                        <span
                          key={toolId}
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: `${tool.color}18`, color: tool.color }}
                        >
                          {tool.name}
                        </span>
                      ) : null;
                    })}
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {story.sections[0].text}
                  </p>
                  <button
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors"
                  >
                    {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {isCopied ? 'Copied!' : 'Copy full story'}
                  </button>
                </div>
              </div>
            </div>

            {/* Individual section results */}
            <div className="space-y-4">
              {story.sections.map((section, i) => (
                <div
                  key={section.label}
                  className={`transition-all duration-500 ${
                    visibleResults >= i + 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                  }`}
                >
                  <div className="group cursor-pointer space-y-1 py-3 border-b border-gray-100">
                    {/* URL breadcrumb */}
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <div className="w-4 h-4 bg-gray-100 rounded-sm flex items-center justify-center">
                        <div className="w-2.5 h-2.5 bg-gray-300 rounded-sm" />
                      </div>
                      <span>inchronicle.app</span>
                      <span>›</span>
                      <span>stories</span>
                      <span>›</span>
                      <span>{story.id}</span>
                      <span>›</span>
                      <span>{section.label.toLowerCase()}</span>
                    </div>

                    {/* Title — blue like Google */}
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-base font-semibold text-primary-600 group-hover:text-primary-700 group-hover:underline leading-snug">
                        {section.label}: {story.title}
                      </h3>
                      <ExternalLink className="w-3.5 h-3.5 text-gray-300 shrink-0 mt-0.5 group-hover:text-gray-400 transition-colors" />
                    </div>

                    {/* Snippet */}
                    <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">{section.text}</p>

                    {/* Evidence count */}
                    <div className="text-xs text-gray-400">
                      About {section.evidenceCount} evidence item{section.evidenceCount !== 1 ? 's' : ''} — verified
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Export results */}
            <div
              className={`transition-all duration-500 pt-4 ${
                visibleResults >= story.sections.length + 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors">
                Export results
                <ChevronRight className="w-4 h-4" />
              </button>
              <p className="text-xs text-gray-400 mt-2">
                {totalActivityCount.toLocaleString()} activities scanned · {totalEvidence} evidence items found
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
