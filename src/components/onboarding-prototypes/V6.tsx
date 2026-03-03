import { useState, useEffect, useRef } from 'react';
import { mockTools, mockStories, SYNC_DELAY, CONNECT_DELAY, totalActivityCount } from './mock-data';
import type { ToolId } from './mock-data';
import { Terminal, Copy, Check } from 'lucide-react';

type Step = 'welcome' | 'select' | 'connecting' | 'syncing' | 'story' | 'done';

const COMMANDS = [
  '$ inchronicle connect --tools github jira confluence',
  '$ inchronicle sync --analyze',
  '$ inchronicle story generate --format star',
];

function useTypewriter(text: string, active: boolean, speed = 28) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!active) return;
    setDisplayed('');
    setDone(false);
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(id);
        setDone(true);
      }
    }, speed);
    return () => clearInterval(id);
  }, [text, active, speed]);

  return { displayed, done };
}

function TypedLine({ text, active, onDone }: { text: string; active: boolean; onDone?: () => void }) {
  const { displayed, done } = useTypewriter(text, active);

  useEffect(() => {
    if (done && onDone) onDone();
  }, [done, onDone]);

  return (
    <div className="flex items-center gap-1 min-h-[1.5rem]">
      <span className="text-green-400 whitespace-pre">{displayed}</span>
      {active && !done && (
        <span className="inline-block w-2 h-4 bg-green-400 animate-pulse" />
      )}
    </div>
  );
}

function AsciiProgress({ progress }: { progress: number }) {
  const total = 24;
  const filled = Math.round((progress / 100) * total);
  const bar = '█'.repeat(filled) + '░'.repeat(total - filled);
  return (
    <span className="text-green-400">
      [{bar}] {progress}%
    </span>
  );
}

export function OnboardingV6() {
  const [step, setStep] = useState<Step>('welcome');
  const [selectedTools, setSelectedTools] = useState<Set<ToolId>>(new Set());
  const [cmdIndex, setCmdIndex] = useState(0);
  const [cmdActive, setCmdActive] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const [lines, setLines] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines, step, cmdIndex, syncProgress]);

  function pushLine(line: string) {
    setLines((prev) => [...prev, line]);
  }

  function startConnect() {
    if (selectedTools.size === 0) return;
    setStep('connecting');
    setCmdIndex(0);
    setCmdActive(true);
  }

  function handleCmd0Done() {
    setTimeout(() => {
      const toolNames = Array.from(selectedTools).join(' ');
      pushLine(`> Authenticating: ${toolNames}...`);
      setTimeout(() => {
        pushLine('> ✓ All connections established');
        setCmdIndex(1);
        setCmdActive(true);
        setStep('syncing');
      }, CONNECT_DELAY);
    }, 300);
  }

  function handleCmd1Done() {
    let prog = 0;
    const interval = setInterval(() => {
      prog = Math.min(prog + Math.ceil(Math.random() * 8 + 2), 100);
      setSyncProgress(prog);
      if (prog >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          pushLine(`> ✓ Analyzed ${totalActivityCount} activities across ${selectedTools.size} tools`);
          setCmdIndex(2);
          setCmdActive(true);
          setStep('story');
        }, 400);
      }
    }, SYNC_DELAY / 20);
  }

  function handleCmd2Done() {
    setTimeout(() => {
      pushLine('> ✓ STAR story generated');
      setStep('done');
    }, 500);
  }

  function handleCopy() {
    const story = mockStories[0];
    const text = `${story.title}\n\n${story.sections.map((s) => `${s.label.toUpperCase()}\n${s.text}`).join('\n\n')}`;
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    pushLine('$ inchronicle export --clipboard');
    setTimeout(() => pushLine('✓ Copied to clipboard!'), 300);
  }

  const story = mockStories[0];

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6 font-mono">
      <div className="w-full max-w-3xl">
        {/* Window chrome */}
        <div className="bg-gray-800 rounded-t-lg border border-gray-700 px-4 py-2.5 flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500" />
          <span className="w-3 h-3 rounded-full bg-yellow-500" />
          <span className="w-3 h-3 rounded-full bg-green-500" />
          <span className="ml-4 text-gray-400 text-xs flex items-center gap-1.5">
            <Terminal size={12} />
            inchronicle — zsh
          </span>
        </div>

        <div className="bg-gray-900 border border-t-0 border-gray-700 rounded-b-lg p-6 min-h-[520px] flex flex-col gap-3">

          {/* Welcome */}
          <div className="text-green-400">
            <div className="text-green-300 font-bold">inchronicle v1.0.0</div>
            <div className="text-gray-500 text-sm">Turn your work history into interview-ready STAR stories.</div>
          </div>

          {/* Tool selection */}
          {step === 'welcome' && (
            <div className="mt-4">
              <div className="text-green-300 mb-2">$ inchronicle init</div>
              <div className="text-gray-400 mb-3 text-sm">Select tools to connect: (click to toggle)</div>
              <div className="space-y-1 mb-4">
                {mockTools.map((tool, i) => {
                  const selected = selectedTools.has(tool.id);
                  return (
                    <button
                      key={tool.id}
                      onClick={() => {
                        const next = new Set(selectedTools);
                        if (selected) next.delete(tool.id);
                        else next.add(tool.id);
                        setSelectedTools(next);
                      }}
                      className="flex items-center gap-3 w-full text-left hover:text-green-300 transition-colors"
                    >
                      <span className="text-gray-500">[{i + 1}]</span>
                      <span className={`w-4 h-4 border text-xs flex items-center justify-center ${selected ? 'border-green-400 text-green-400' : 'border-gray-600 text-transparent'}`}>
                        {selected ? 'x' : ' '}
                      </span>
                      <span className={selected ? 'text-green-400' : 'text-gray-400'}>{tool.name}</span>
                      <span className="text-gray-600 text-xs">— {tool.description}</span>
                    </button>
                  );
                })}
              </div>
              <button
                onClick={startConnect}
                disabled={selectedTools.size === 0}
                className="mt-2 px-4 py-1.5 border border-green-500 text-green-400 text-sm hover:bg-green-900/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                $ run →
              </button>
              {selectedTools.size === 0 && (
                <div className="text-red-400 text-xs mt-2">Select at least one tool to continue.</div>
              )}
            </div>
          )}

          {/* Typed commands */}
          {(step === 'connecting' || step === 'syncing' || step === 'story' || step === 'done') && (
            <div className="mt-2 space-y-2">
              <TypedLine
                text={COMMANDS[0]}
                active={cmdIndex === 0 && cmdActive}
                onDone={handleCmd0Done}
              />

              {/* Output lines */}
              {lines.map((l, i) => (
                <div key={i} className={`text-sm ${l.startsWith('✓') ? 'text-green-300' : 'text-gray-400'}`}>{l}</div>
              ))}

              {(step === 'syncing' || step === 'story' || step === 'done') && cmdIndex >= 1 && (
                <>
                  <TypedLine
                    text={COMMANDS[1]}
                    active={cmdIndex === 1 && cmdActive}
                    onDone={handleCmd1Done}
                  />
                  {step !== 'connecting' && (
                    <div className="text-sm">
                      <AsciiProgress progress={syncProgress} />
                      {syncProgress < 100 && (
                        <span className="text-gray-500 ml-3 text-xs">scanning activities...</span>
                      )}
                    </div>
                  )}
                </>
              )}

              {(step === 'story' || step === 'done') && cmdIndex >= 2 && (
                <TypedLine
                  text={COMMANDS[2]}
                  active={cmdIndex === 2 && cmdActive}
                  onDone={handleCmd2Done}
                />
              )}
            </div>
          )}

          {/* Story output */}
          {step === 'done' && (
            <div className="mt-4 border border-green-800 bg-green-950/30 p-4 space-y-3">
              <div className="text-green-300 font-bold text-base">{story.title}</div>
              <div className="text-gray-500 text-xs">
                Confidence: {Math.round(story.confidence * 100)}% · {story.dateRange} · {story.tools.length} tools
              </div>
              {story.sections.map((section) => (
                <div key={section.label} className="space-y-1">
                  <div className="text-green-400 font-bold text-sm">[{section.label.toUpperCase()}]</div>
                  <div className="text-gray-300 text-sm leading-relaxed">{section.text}</div>
                  <div className="text-gray-600 text-xs">{section.evidenceCount} evidence items</div>
                </div>
              ))}
              <div className="mt-4 pt-3 border-t border-green-900">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 px-4 py-1.5 border border-green-500 text-green-400 text-sm hover:bg-green-900/30 transition-colors"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? '✓ Copied!' : '$ inchronicle export --clipboard'}
                </button>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}
