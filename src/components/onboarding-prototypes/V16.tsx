import { useState, useEffect } from 'react';
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
  Lock,
  Mail,
  Send,
  Copy,
  Check,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Paperclip,
  Star,
} from 'lucide-react';

const TOOL_ICONS: Record<string, React.ReactNode> = {
  github: <GitBranch className="w-4 h-4" />,
  jira: <KanbanSquare className="w-4 h-4" />,
  confluence: <FileText className="w-4 h-4" />,
  slack: <Hash className="w-4 h-4" />,
  figma: <Figma className="w-4 h-4" />,
  'google-meet': <Video className="w-4 h-4" />,
};

const SECTION_LABEL_COLORS: Record<string, string> = {
  Situation: 'text-blue-600',
  Task: 'text-amber-600',
  Action: 'text-purple-600',
  Result: 'text-emerald-600',
  Challenge: 'text-orange-600',
};

type Step = 'compose' | 'connecting' | 'syncing' | 'revealed';

export function OnboardingV16() {
  const [step, setStep] = useState<Step>('compose');
  const [selectedTools, setSelectedTools] = useState<Set<ToolId>>(new Set());
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncLabel, setSyncLabel] = useState('Connecting...');
  const [copied, setCopied] = useState(false);
  const [sentToSelf, setSentToSelf] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);

  const story = mockStories[0];

  useEffect(() => {
    if (step !== 'syncing') return;
    setSyncProgress(0);
    const selectedArr = Array.from(selectedTools);
    let elapsed = 0;
    const interval = 80;
    const total = SYNC_DELAY;
    let labelIndex = 0;

    const ticker = setInterval(() => {
      elapsed += interval;
      const pct = Math.min((elapsed / total) * 100, 100);
      setSyncProgress(pct);
      const labelStep = Math.floor((elapsed / total) * selectedArr.length);
      if (labelStep !== labelIndex && labelStep < selectedArr.length) {
        labelIndex = labelStep;
        const tool = mockTools.find((t) => t.id === selectedArr[labelIndex]);
        if (tool) setSyncLabel(`Analyzing ${tool.name}...`);
      }
      if (elapsed >= total) {
        clearInterval(ticker);
        setSyncLabel(`Found ${mockActivities.length} activities`);
        setIsUnlocking(true);
        setTimeout(() => {
          setIsUnlocking(false);
          setStep('revealed');
        }, 600);
      }
    }, interval);

    return () => clearInterval(ticker);
  }, [step, selectedTools]);

  const toggleTool = (id: ToolId) => {
    setSelectedTools((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const handleConnect = () => {
    setStep('connecting');
    setTimeout(() => setStep('syncing'), CONNECT_DELAY);
  };

  const handleCopy = () => {
    const text = `Subject: Your Performance Review Draft — Q4 2025\n\n${story.title}\n\n${story.sections.map((s) => `${s.label.toUpperCase()}\n${s.text}`).join('\n\n')}`;
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendToSelf = () => {
    setSentToSelf(true);
    setTimeout(() => setSentToSelf(false), 2500);
  };

  const isUnlocked = step === 'revealed';
  const isLoading = step === 'connecting' || step === 'syncing';

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-10 px-4">
      {/* Email client shell */}
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">

        {/* Email client toolbar */}
        <div className="bg-gray-800 px-5 py-3 flex items-center gap-3">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            <span className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <div className="flex items-center gap-2 text-gray-300 text-xs ml-3">
            <Mail className="w-3.5 h-3.5" />
            <span>inchronicle Mail</span>
          </div>
        </div>

        {/* Email header fields */}
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-4 space-y-2.5">
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-400 w-14 shrink-0 font-medium">From:</span>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center">
                <span className="text-white text-xs font-bold">Y</span>
              </div>
              <span className="text-gray-700">you@company.com</span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-400 w-14 shrink-0 font-medium">To:</span>
            <span className="text-gray-700">manager@company.com</span>
            <Badge variant="secondary" className="text-xs ml-auto">CC: hr@company.com</Badge>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-400 w-14 shrink-0 font-medium">Subject:</span>
            <span className="text-gray-800 font-medium">Your Performance Review Draft — Q4 2025</span>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Paperclip className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs text-gray-400">review-draft-q4-2025.pdf</span>
            <Star className="w-3.5 h-3.5 text-amber-400 ml-auto" />
          </div>
        </div>

        {/* Email body */}
        <div className="px-6 py-5 space-y-4 relative">
          {/* Email greeting */}
          <div className="text-sm text-gray-700 leading-relaxed">
            <p>Hi Sarah,</p>
            <p className="mt-2">
              Ahead of our Q4 review cycle, I wanted to share a draft summarizing my key contributions.
              This covers the period Oct–Dec 2025.
            </p>
          </div>

          {/* Story content — blurred until tools connected */}
          <div className="relative">
            <div className={`space-y-4 transition-all duration-700 ${isUnlocking ? 'opacity-0 blur-md' : isUnlocked ? 'opacity-100 blur-0' : 'blur-sm opacity-60 select-none pointer-events-none'}`}>
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-base font-bold text-gray-800 mb-3">{story.title}</h3>
                <div className="space-y-3">
                  {story.sections.map((section) => (
                    <div key={section.label}>
                      <span className={`text-xs font-bold uppercase tracking-widest ${SECTION_LABEL_COLORS[section.label] ?? 'text-gray-500'}`}>
                        {section.label}
                      </span>
                      <p className="text-sm text-gray-700 leading-relaxed mt-1">{section.text}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-xs text-gray-400">{section.evidenceCount} evidence items</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-200 pt-3 text-sm text-gray-600">
                <p>Confidence score: <strong>{Math.round(story.confidence * 100)}%</strong> · {story.dateRange}</p>
                <p className="mt-2">Happy to discuss further in our 1:1.</p>
                <p className="mt-3 text-gray-500">— Generated by inchronicle</p>
              </div>
            </div>

            {/* Lock overlay — shown when not connected */}
            {!isUnlocked && !isUnlocking && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-[1px] rounded-xl">
                {isLoading ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative w-12 h-12 flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full border-3 border-primary-100" />
                      <div className="absolute inset-0 rounded-full border-3 border-t-primary-500 animate-spin" style={{ borderWidth: 3 }} />
                      <Loader2 className="w-5 h-5 text-primary-400 animate-spin" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-700">{syncLabel}</p>
                      <div className="mt-2 w-40 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full transition-all duration-150"
                          style={{ width: `${syncProgress}%` }}
                        />
                      </div>
                      {step === 'syncing' && (
                        <p className="text-xs text-gray-400 mt-1">{Math.round(syncProgress)}% complete</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4 px-6 text-center">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                      <Lock className="w-6 h-6 text-gray-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-700 text-sm">Connect your tools to unlock</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Your story content will be generated from {totalActivityCount}+ activities
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tool connection section (shown when not yet connected) */}
          {step === 'compose' && (
            <div className="mt-4 border border-dashed border-primary-300 rounded-xl bg-primary-50 p-4">
              <p className="text-xs font-semibold text-primary-600 mb-3 uppercase tracking-wide">Select tools to connect</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                {mockTools.map((tool) => {
                  const isSelected = selectedTools.has(tool.id);
                  return (
                    <button
                      key={tool.id}
                      onClick={() => toggleTool(tool.id)}
                      className={[
                        'flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all',
                        isSelected
                          ? 'border-primary-500 bg-white text-primary-700 shadow-sm'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300',
                      ].join(' ')}
                    >
                      <span className="w-5 h-5 rounded flex items-center justify-center text-white" style={{ backgroundColor: tool.color }}>
                        {TOOL_ICONS[tool.id]}
                      </span>
                      <span>{tool.name}</span>
                      {isSelected && <Check className="w-3 h-3 text-primary-500 ml-auto" />}
                    </button>
                  );
                })}
              </div>
              <button
                disabled={selectedTools.size < 1}
                onClick={handleConnect}
                className={[
                  'w-full py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2',
                  selectedTools.size >= 1
                    ? 'bg-primary-500 hover:bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed',
                ].join(' ')}
              >
                {selectedTools.size >= 1 ? (
                  <>Unlock email content <ArrowRight className="w-3.5 h-3.5" /></>
                ) : (
                  'Select at least one tool'
                )}
              </button>
            </div>
          )}
        </div>

        {/* Email action bar */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center gap-3">
          <button
            onClick={handleSendToSelf}
            disabled={!isUnlocked}
            className={[
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              isUnlocked
                ? sentToSelf
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-800 hover:bg-gray-700 text-white'
                : 'bg-gray-100 text-gray-300 cursor-not-allowed',
            ].join(' ')}
          >
            {sentToSelf ? (
              <><CheckCircle2 className="w-4 h-4" /> Sent to self</>
            ) : (
              <><Send className="w-4 h-4" /> Send to self</>
            )}
          </button>
          <button
            onClick={handleCopy}
            disabled={!isUnlocked}
            className={[
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all',
              isUnlocked
                ? copied
                  ? 'border-emerald-400 text-emerald-600 bg-emerald-50'
                  : 'border-gray-300 text-gray-600 hover:border-gray-400 bg-white'
                : 'border-gray-200 text-gray-300 cursor-not-allowed',
            ].join(' ')}
          >
            {copied ? <><Check className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy</>}
          </button>
          {isUnlocked && (
            <div className="ml-auto flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-xs text-gray-500">Draft ready</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
