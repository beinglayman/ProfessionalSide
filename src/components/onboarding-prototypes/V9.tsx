import { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { mockTools, mockStories, SYNC_DELAY, totalActivityCount } from './mock-data';
import type { ToolId } from './mock-data';
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Loader2,
  Copy,
  FileDown,
  Mail,
  Check,
  Sparkles,
  GitBranch,
  KanbanSquare,
  FileText,
  Hash,
  Video,
  Figma as FigmaIcon,
} from 'lucide-react';

type SectionId = 1 | 2 | 3 | 4 | 5;

const SECTION_META: Record<SectionId, { title: string; subtitle: string }> = {
  1: { title: 'Welcome', subtitle: 'Get started with inchronicle' },
  2: { title: 'Connect Tools', subtitle: 'Choose your work data sources' },
  3: { title: 'Sync & Analyze', subtitle: 'Pulling your work history' },
  4: { title: 'Your Story', subtitle: 'STAR narrative from your data' },
  5: { title: 'Export', subtitle: 'Take your story anywhere' },
};

const TOOL_ICON_MAP: Record<string, React.ElementType> = {
  GitBranch,
  KanbanSquare,
  FileText,
  Hash,
  Video,
  Figma: FigmaIcon,
};

interface SectionHeaderProps {
  id: SectionId;
  active: boolean;
  completed: boolean;
  summary?: string;
  onClick: () => void;
}

function SectionHeader({ id, active, completed, summary, onClick }: SectionHeaderProps) {
  const meta = SECTION_META[id];
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-colors ${
        active ? 'bg-primary-50' : completed ? 'bg-white hover:bg-gray-50' : 'bg-white hover:bg-gray-50'
      }`}
    >
      {/* Step indicator */}
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-colors ${
          completed
            ? 'bg-green-100 text-green-600'
            : active
            ? 'bg-primary-600 text-white'
            : 'bg-gray-100 text-gray-400'
        }`}
      >
        {completed ? <CheckCircle2 size={15} /> : id}
      </div>

      {/* Title + summary */}
      <div className="flex-1 min-w-0">
        <span className={`font-semibold text-sm ${active ? 'text-primary-700' : completed ? 'text-gray-700' : 'text-gray-500'}`}>
          {meta.title}
        </span>
        {completed && summary && (
          <span className="text-xs text-gray-400 ml-2">— {summary}</span>
        )}
        {!completed && !active && (
          <span className="text-xs text-gray-400 ml-2 hidden sm:inline">— {meta.subtitle}</span>
        )}
      </div>

      {/* Chevron */}
      <div className="text-gray-400 shrink-0">
        {active ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </div>
    </button>
  );
}

export function OnboardingV9() {
  const [activeSection, setActiveSection] = useState<SectionId>(1);
  const [completedSections, setCompletedSections] = useState<Set<SectionId>>(new Set());
  const [selectedTools, setSelectedTools] = useState<Set<ToolId>>(new Set());
  const [toolStatus, setToolStatus] = useState<Record<ToolId, 'idle' | 'syncing' | 'done'>>({
    github: 'idle',
    jira: 'idle',
    confluence: 'idle',
    slack: 'idle',
    figma: 'idle',
    'google-meet': 'idle',
  });
  const [syncDone, setSyncDone] = useState(false);
  const [copied, setCopied] = useState(false);

  const story = mockStories[0];

  function complete(id: SectionId, next: SectionId) {
    setCompletedSections((prev) => new Set([...prev, id]));
    setActiveSection(next);
  }

  function toggleSection(id: SectionId) {
    setActiveSection((prev) => (prev === id ? (0 as SectionId) : id));
  }

  function startSync() {
    const tools = Array.from(selectedTools);
    tools.forEach((toolId, i) => {
      setTimeout(() => {
        setToolStatus((prev) => ({ ...prev, [toolId]: 'syncing' }));
        setTimeout(() => {
          setToolStatus((prev) => ({ ...prev, [toolId]: 'done' }));
          if (i === tools.length - 1) {
            setTimeout(() => {
              setSyncDone(true);
              complete(3, 4);
            }, 400);
          }
        }, SYNC_DELAY * 0.6 + i * 200);
      }, i * 350);
    });
  }

  function handleCopy() {
    const text = [
      story.title,
      '',
      ...story.sections.map((s) => `${s.label.toUpperCase()}\n${s.text}`),
    ].join('\n\n');
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const sectionSummaries: Partial<Record<SectionId, string>> = {
    1: 'Welcome',
    2: selectedTools.size > 0 ? `${selectedTools.size} tools selected` : undefined,
    3: syncDone ? `${totalActivityCount} activities analyzed` : undefined,
    4: story.title.slice(0, 40) + '...',
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-primary-600 font-semibold text-sm bg-primary-50 px-4 py-1.5 rounded-full mb-3">
            <Sparkles size={14} />
            inchronicle
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Build your professional story</h1>
          <p className="text-gray-500 text-sm mt-1">Complete each step at your own pace.</p>
        </div>

        {/* Accordion */}
        <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm divide-y divide-gray-200 bg-white">

          {/* Section 1: Welcome */}
          <div>
            <SectionHeader
              id={1}
              active={activeSection === 1}
              completed={completedSections.has(1)}
              summary={sectionSummaries[1]}
              onClick={() => toggleSection(1)}
            />
            <div
              className={`overflow-hidden transition-all duration-300 ${
                activeSection === 1 ? 'max-h-96' : 'max-h-0'
              }`}
            >
              <div className="px-6 py-5 bg-primary-50/40 border-t border-primary-100">
                <p className="text-gray-700 leading-relaxed mb-2">
                  <strong>Welcome to inchronicle.</strong> We connect to your work tools and automatically surface
                  the evidence behind your best professional moments.
                </p>
                <p className="text-gray-500 text-sm mb-5">
                  In four quick steps, you'll have a polished STAR story ready for your next interview.
                </p>
                <button
                  onClick={() => complete(1, 2)}
                  className="px-5 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
                >
                  Begin
                </button>
              </div>
            </div>
          </div>

          {/* Section 2: Tools */}
          <div>
            <SectionHeader
              id={2}
              active={activeSection === 2}
              completed={completedSections.has(2)}
              summary={sectionSummaries[2]}
              onClick={() => toggleSection(2)}
            />
            <div
              className={`overflow-hidden transition-all duration-300 ${
                activeSection === 2 ? 'max-h-[600px]' : 'max-h-0'
              }`}
            >
              <div className="px-6 py-5 border-t border-gray-100">
                <p className="text-sm text-gray-500 mb-4">Select the tools where your work is tracked:</p>
                <div className="space-y-2 mb-5">
                  {mockTools.map((tool) => {
                    const checked = selectedTools.has(tool.id);
                    const Icon = TOOL_ICON_MAP[tool.icon] ?? FileText;
                    return (
                      <label
                        key={tool.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                          checked ? 'border-primary-300 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            const next = new Set(selectedTools);
                            if (checked) next.delete(tool.id);
                            else next.add(tool.id);
                            setSelectedTools(next);
                          }}
                          className="w-4 h-4 accent-primary-600 shrink-0"
                        />
                        <Icon size={16} className={checked ? 'text-primary-600' : 'text-gray-400'} />
                        <div className="flex-1 min-w-0">
                          <span className={`text-sm font-medium ${checked ? 'text-primary-700' : 'text-gray-700'}`}>
                            {tool.name}
                          </span>
                          <span className="text-xs text-gray-400 ml-2">{tool.description}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {tool.activityCount}
                        </Badge>
                      </label>
                    );
                  })}
                </div>
                <button
                  onClick={() => {
                    if (selectedTools.size === 0) return;
                    complete(2, 3);
                    setTimeout(startSync, 200);
                  }}
                  disabled={selectedTools.size === 0}
                  className="px-5 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Connect {selectedTools.size > 0 ? `${selectedTools.size} tool${selectedTools.size > 1 ? 's' : ''}` : 'Tools'}
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: Sync */}
          <div>
            <SectionHeader
              id={3}
              active={activeSection === 3}
              completed={completedSections.has(3)}
              summary={sectionSummaries[3]}
              onClick={() => toggleSection(3)}
            />
            <div
              className={`overflow-hidden transition-all duration-300 ${
                activeSection === 3 ? 'max-h-96' : 'max-h-0'
              }`}
            >
              <div className="px-6 py-5 border-t border-gray-100">
                <p className="text-sm text-gray-500 mb-4">Syncing your selected tools...</p>
                <div className="space-y-3">
                  {Array.from(selectedTools).map((toolId) => {
                    const tool = mockTools.find((t) => t.id === toolId)!;
                    const status = toolStatus[toolId];
                    const Icon = TOOL_ICON_MAP[tool.icon] ?? FileText;
                    return (
                      <div key={toolId} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                        <Icon size={16} className="text-gray-500 shrink-0" />
                        <span className="text-sm text-gray-700 flex-1">{tool.name}</span>
                        <span className="text-xs text-gray-400 mr-2">{tool.activityCount} {tool.activityLabel}</span>
                        {status === 'idle' && (
                          <span className="text-xs text-gray-400">Waiting...</span>
                        )}
                        {status === 'syncing' && (
                          <Loader2 size={14} className="text-primary-500 animate-spin" />
                        )}
                        {status === 'done' && (
                          <CheckCircle2 size={14} className="text-green-500" />
                        )}
                      </div>
                    );
                  })}
                  {selectedTools.size === 0 && (
                    <p className="text-sm text-gray-400 italic">No tools selected — go back to step 2.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Story */}
          <div>
            <SectionHeader
              id={4}
              active={activeSection === 4}
              completed={completedSections.has(4)}
              summary={sectionSummaries[4]}
              onClick={() => toggleSection(4)}
            />
            <div
              className={`overflow-hidden transition-all duration-300 ${
                activeSection === 4 ? 'max-h-[800px]' : 'max-h-0'
              }`}
            >
              <div className="px-6 py-5 border-t border-gray-100">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 text-sm">{story.title}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {Math.round(story.confidence * 100)}% confidence
                  </Badge>
                </div>
                <div className="space-y-3 mb-5">
                  {story.sections.map((section) => (
                    <Card key={section.label} className="border-gray-100 shadow-none">
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-primary-600 uppercase tracking-wide">
                            {section.label}
                          </span>
                          <span className="text-xs text-gray-400">{section.evidenceCount} sources</span>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">{section.text}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <button
                  onClick={() => complete(4, 5)}
                  className="px-5 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
                >
                  Continue to Export
                </button>
              </div>
            </div>
          </div>

          {/* Section 5: Export */}
          <div>
            <SectionHeader
              id={5}
              active={activeSection === 5}
              completed={completedSections.has(5)}
              onClick={() => toggleSection(5)}
            />
            <div
              className={`overflow-hidden transition-all duration-300 ${
                activeSection === 5 ? 'max-h-64' : 'max-h-0'
              }`}
            >
              <div className="px-6 py-5 border-t border-gray-100">
                <p className="text-sm text-gray-500 mb-5">Take your story wherever you need it:</p>
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm hover:border-primary-400 hover:text-primary-700 transition-colors"
                  >
                    {copied ? <Check size={15} className="text-green-500" /> : <Copy size={15} />}
                    {copied ? 'Copied!' : 'Copy Text'}
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm hover:border-primary-400 hover:text-primary-700 transition-colors">
                    <FileDown size={15} />
                    Export PDF
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm hover:border-primary-400 hover:text-primary-700 transition-colors">
                    <Mail size={15} />
                    Send via Email
                  </button>
                </div>
                <button
                  onClick={() => complete(5, 5)}
                  className="mt-5 px-5 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                >
                  Done — Story complete!
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
