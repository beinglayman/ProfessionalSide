/**
 * Story Wizard Modal
 *
 * 3-step wizard for promoting journal entries to career stories:
 * 1. Checklist: Fixed-shape "what a strong STAR story needs" with per-draft
 *    ✓ (derived from Activities) / ✗ (question needed) state.
 * 2. Questions: Only asked for ✗ rows; skipped entirely if everything is ✓.
 * 3. Generate: Story + evaluation score.
 *
 * Archetype is classified at draft generation time — no dedicated Analyze
 * step. User can override archetype and toggle Learning section via a
 * compact header above Questions.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { CareerStoriesService } from '../../services/career-stories.service';
import { WALKTHROUGH_STORAGE_KEYS } from '../walkthrough/walkthrough-steps';
import {
  StoryArchetype,
  NarrativeFramework,
  WizardAnalyzeResponse,
  WizardGenerateResponse,
  WizardQuestion,
  WizardAnswer,
  JournalEntryMeta,
} from '../../types/career-stories';
import { WizardLoadingState } from './WizardLoadingState';
import { ARCHETYPE_CONFIG } from './ArchetypeSelector';
import { ChecklistStep, countAskRows } from './ChecklistStep';
import { ContextPanel } from './ContextPanel';

interface StoryWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  journalEntryId: string;
  /** Optional - will be fetched from analyze response if not provided */
  journalEntryTitle?: string;
  /** Metadata for loading state facts */
  journalEntryMeta?: JournalEntryMeta;
  onStoryCreated?: (storyId: string) => void | Promise<void>;
}

type WizardStep = 'checklist' | 'questions' | 'generate';

export const StoryWizardModal: React.FC<StoryWizardModalProps> = ({
  isOpen,
  onClose,
  journalEntryId,
  journalEntryTitle,
  journalEntryMeta,
  onStoryCreated,
}) => {
  // State
  const [step, setStep] = useState<WizardStep>('checklist');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Analysis state
  const [analyzeResult, setAnalyzeResult] = useState<WizardAnalyzeResponse | null>(null);
  const [selectedArchetype, setSelectedArchetype] = useState<StoryArchetype | null>(null);
  const [selectedFramework, setSelectedFramework] = useState<NarrativeFramework>('STAR');

  // Questions state
  const [answers, setAnswers] = useState<Record<string, WizardAnswer>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Generate state
  const [generateResult, setGenerateResult] = useState<WizardGenerateResponse | null>(null);

  // Walkthrough coaching — check once on mount to avoid re-renders
  const walkthroughPausedRef = useRef(
    sessionStorage.getItem(WALKTHROUGH_STORAGE_KEYS.paused) === 'true'
  );

  // Guard against state updates after close/unmount
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      mountedRef.current = false;
      setStep('checklist');
      setAnalyzeResult(null);
      setSelectedArchetype(null);
      setSelectedFramework('STAR');
      setAnswers({});
      setCurrentQuestionIndex(0);
      setGenerateResult(null);
      setError(null);
    } else {
      mountedRef.current = true;
    }
  }, [isOpen]);

  // Auto-load on open: archetype + questions + checklistState come from the
  // draft via wizardAnalyze. Wizard opens on the Checklist step.
  useEffect(() => {
    if (isOpen && !analyzeResult) {
      handleAnalyze();
    }
  }, [isOpen]);

  const handleAnalyze = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await CareerStoriesService.wizardAnalyze(journalEntryId);
      if (!mountedRef.current) return;
      if (response.success && response.data) {
        setAnalyzeResult(response.data);
        setSelectedArchetype(response.data.archetype.detected);
      } else {
        setError(response.error || 'Failed to analyze entry');
      }
    } catch (err) {
      if (!mountedRef.current) return;
      setError('Failed to analyze entry');
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  };

  const handleGenerate = async () => {
    const archetype = selectedArchetype || analyzeResult?.archetype.detected;
    if (!archetype) return;

    setStep('generate'); // Show loading immediately
    setIsLoading(true);
    setError(null);
    try {
      const response = await CareerStoriesService.wizardGenerate({
        journalEntryId,
        answers,
        archetype,
        framework: selectedFramework,
      });
      if (!mountedRef.current) return;
      if (response.success && response.data) {
        setGenerateResult(response.data);
        await onStoryCreated?.(response.data.story.id);
      } else {
        setError(response.error || 'Failed to generate story');
      }
    } catch (err) {
      if (!mountedRef.current) return;
      setError('Failed to generate story');
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, answer: WizardAnswer) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const stepIndex = (['checklist', 'questions', 'generate'] as WizardStep[]).indexOf(step);
  const isLastQuestion = analyzeResult
    ? currentQuestionIndex === analyzeResult.questions.length - 1
    : false;

  // Number of ✗ rows in the checklist for this draft + framework combination.
  // Drives the primary button label on the Checklist step: "Generate now" when
  // everything is derived, otherwise "Start questions (N)".
  const askRowCount = analyzeResult
    ? countAskRows(analyzeResult.checklist, selectedFramework)
    : 0;

  const wizardCommentary = walkthroughPausedRef.current
    ? step === 'checklist'
      ? { title: 'What Your Story Needs', description: 'We already know most of your story from your Activities. Rows marked \u2713 are done \u2014 we\u2019ll just ask about the gaps.' }
      : step === 'questions'
      ? { title: 'Add What Only You Know', description: 'These are things only you would know. Your answers fill in context AI can\u2019t find in your data \u2014 they make this story yours.' }
      : step === 'generate'
      ? { title: 'Generating Your Story', description: 'Sit tight \u2014 we\u2019re weaving your work data and answers into a narrative. This usually takes about 10 seconds.' }
      : null
    : null;

  // Checklist cover math for the context panel.
  const coveredCount = analyzeResult
    ? analyzeResult.checklist.filter((r) => r.state === 'derived').length
    : 0;
  const totalRows = selectedFramework === 'STARL' ? 7 : 6;

  const progressPills: Array<{ key: WizardStep; label: string }> = [
    { key: 'checklist', label: 'Checklist' },
    { key: 'questions', label: 'Questions' },
    { key: 'generate',  label: 'Generate' },
  ];

  return (
    <>
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn(
          'max-w-4xl max-h-[85vh] p-0 gap-0 overflow-hidden border-2 border-transparent ai-moving-border',
          'grid grid-cols-[280px_1fr]'
        )}
      >
        {/* Accessibility: keep a title/desc for screen readers even though
            the visible chrome is the context panel. */}
        <DialogTitle className="sr-only">Create Story</DialogTitle>
        <DialogDescription className="sr-only">
          Turn "{journalEntryTitle || analyzeResult?.journalEntry.title || 'your draft'}" into a polished story
        </DialogDescription>

        {/* Left: persistent context panel (dark) */}
        {analyzeResult ? (
          <ContextPanel
            journalEntry={analyzeResult.journalEntry}
            detectedArchetype={analyzeResult.archetype.detected}
            alternatives={analyzeResult.archetype.alternatives}
            selectedArchetype={selectedArchetype || analyzeResult.archetype.detected}
            onArchetypeChange={setSelectedArchetype}
            selectedFramework={selectedFramework}
            onFrameworkChange={setSelectedFramework}
            coveredCount={coveredCount}
            totalRows={totalRows}
          />
        ) : (
          <aside className="bg-gradient-to-b from-primary-50/60 via-white to-primary-50/20 border-r border-primary-100 px-5 py-5 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary-400 animate-pulse" />
          </aside>
        )}

        {/* Right: step content (header + body + footer) */}
        <div className="flex flex-col min-w-0 max-h-[85vh]">
          {/* Header: progress pills */}
          <div className="flex items-center gap-1.5 px-6 py-4 border-b border-gray-100">
            {progressPills.map((p, idx) => (
              <span
                key={p.key}
                className={cn(
                  'text-xs px-2.5 py-1 rounded-full transition-colors',
                  step === p.key
                    ? 'bg-gray-900 text-white font-medium'
                    : idx < stepIndex
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                )}
              >
                {p.label}
              </span>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div role="alert" className="mx-6 mt-4 flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm animate-in fade-in duration-200">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1">{error}</span>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  if (step === 'checklist' && !analyzeResult) handleAnalyze();
                  else if (step === 'generate') handleGenerate();
                }}
                className="text-xs font-medium text-red-600 hover:text-red-800 underline underline-offset-2 flex-shrink-0"
              >
                Retry
              </button>
            </div>
          )}

          {/* Body (scrolls independently of context panel) */}
          <div className="flex-1 px-6 py-5 overflow-y-auto min-w-0">
            {step === 'checklist' && isLoading && !analyzeResult && (
              <div className="animate-in fade-in duration-200">
                <WizardLoadingState mode="analyze" journalMeta={journalEntryMeta} />
              </div>
            )}

            {step === 'checklist' && analyzeResult && (
              <div className="animate-in fade-in slide-in-from-right-2 duration-200">
                <ChecklistStep
                  checklist={analyzeResult.checklist}
                  framework={selectedFramework}
                  onJumpToAskRow={() => {
                    setCurrentQuestionIndex(0);
                    setStep('questions');
                  }}
                />
              </div>
            )}

            {step === 'questions' && analyzeResult && (
              <div className="animate-in fade-in slide-in-from-right-2 duration-200">
                <QuestionsStep
                  questions={analyzeResult.questions}
                  answers={answers}
                  onAnswerChange={handleAnswerChange}
                  currentQuestionIndex={currentQuestionIndex}
                />
              </div>
            )}

            {step === 'generate' && isLoading && (
              <div className="animate-in fade-in duration-200">
                <WizardLoadingState mode="generate" journalMeta={journalEntryMeta} />
              </div>
            )}

            {step === 'generate' && !isLoading && generateResult && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-200">
                <GenerateStep
                  result={generateResult}
                  askedQuestions={analyzeResult?.questions}
                  answers={answers}
                  onReviseSkipped={(qIndex) => {
                    setCurrentQuestionIndex(qIndex);
                    setStep('questions');
                  }}
                />
              </div>
            )}
          </div>

          {/* Footer */}
          {!(step === 'generate' && isLoading) && (
            <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100 bg-gray-50/50">
              <Button
                variant="ghost"
                onClick={() => {
                  if (step === 'checklist') {
                    onClose();
                  } else if (step === 'questions') {
                    if (currentQuestionIndex > 0) {
                      setCurrentQuestionIndex((i) => i - 1);
                    } else {
                      setStep('checklist');
                    }
                  } else if (step === 'generate' && analyzeResult) {
                    if (askRowCount > 0 && analyzeResult.questions.length > 0) {
                      setStep('questions');
                      setCurrentQuestionIndex(Math.max(0, analyzeResult.questions.length - 1));
                    } else {
                      setStep('checklist');
                    }
                  }
                }}
                disabled={isLoading}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                {step === 'checklist' ? 'Cancel' : 'Back'}
              </Button>

              <div className="flex items-center gap-3">
                {step === 'checklist' && analyzeResult && askRowCount === 0 && (
                  <Button
                    onClick={handleGenerate}
                    className="bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate now
                  </Button>
                )}

                {step === 'checklist' && analyzeResult && askRowCount > 0 && (
                  <Button
                    onClick={() => {
                      setCurrentQuestionIndex(0);
                      setStep('questions');
                    }}
                    className="bg-primary-500 hover:bg-primary-600 text-white"
                  >
                    Start questions ({askRowCount})
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                )}

                {step === 'questions' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!analyzeResult) return;
                      if (currentQuestionIndex < analyzeResult.questions.length - 1) {
                        setCurrentQuestionIndex((i) => i + 1);
                      } else {
                        handleGenerate();
                      }
                    }}
                    className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    Skip
                  </button>
                )}

                {step === 'questions' && !isLastQuestion && (
                  <Button
                    onClick={() => setCurrentQuestionIndex((i) => i + 1)}
                    className="bg-primary-500 hover:bg-primary-600 text-white"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                )}

                {step === 'questions' && isLastQuestion && (
                  <Button
                    onClick={handleGenerate}
                    className="bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate
                  </Button>
                )}

                {step === 'generate' && !isLoading && (
                  <Button
                    onClick={onClose}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Done
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>

    {/* Walkthrough coaching tooltip — shown during tour pause while wizard is open */}
    {wizardCommentary && (
      <div className="fixed bottom-4 right-4 z-[55] max-w-xs bg-white border border-gray-200 text-gray-900 rounded-xl p-4 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
        <p className="text-xs text-primary-600 mb-1 font-medium">{wizardCommentary.title}</p>
        <p className="text-sm text-gray-600 leading-relaxed">{wizardCommentary.description}</p>
      </div>
    )}
    </>
  );
};

// ============================================================================
// Step Components
// ============================================================================

interface QuestionsStepProps {
  questions: WizardQuestion[];
  answers: Record<string, WizardAnswer>;
  onAnswerChange: (questionId: string, answer: WizardAnswer) => void;
  currentQuestionIndex: number;
}

const QuestionsStep: React.FC<QuestionsStepProps> = ({
  questions,
  answers,
  onAnswerChange,
  currentQuestionIndex,
}) => {
  const [showHint, setShowHint] = useState(false);

  // Reset hint when question changes
  useEffect(() => {
    setShowHint(false);
  }, [currentQuestionIndex]);

  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = answers[currentQuestion?.id] || { selected: [] };

  if (!currentQuestion) return null;

  const textareaId = `question-${currentQuestion.id}-text`;

  return (
    <div className="space-y-4">
      {/* Thin progress bar */}
      <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* "Why we're asking" explainer — Ship 4 */}
      {(currentQuestion.whyWeNeed || currentQuestion.howItHelps) && (
        <div className="rounded-lg bg-primary-50/40 border border-primary-100 px-3 py-2 space-y-0.5">
          {currentQuestion.whyWeNeed && (
            <p className="text-[11px] text-gray-700">
              <span className="font-semibold text-primary-700">Why we need this: </span>
              {currentQuestion.whyWeNeed}
            </p>
          )}
          {currentQuestion.howItHelps && (
            <p className="text-[11px] text-gray-700">
              <span className="font-semibold text-primary-700">How your answer helps: </span>
              {currentQuestion.howItHelps}
            </p>
          )}
        </div>
      )}

      {/* Question card */}
      <div
        key={currentQuestion.id}
        className="rounded-2xl border border-gray-100 bg-white p-5 animate-in fade-in slide-in-from-right-4 duration-300"
      >
        <div className="space-y-4">
          {/* Question text + hint toggle */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base font-semibold text-gray-900 leading-relaxed">
              {currentQuestion.question}
            </h3>
            {currentQuestion.hint && (
              <button
                type="button"
                onClick={() => setShowHint(!showHint)}
                className="flex-shrink-0 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                aria-label="Show hint"
              >
                <HelpCircle className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Hint (click-to-toggle) */}
          {showHint && currentQuestion.hint && (
            <p className="text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2 animate-in fade-in duration-200">
              {currentQuestion.hint}
            </p>
          )}

          {/* Side-by-side: chips + textarea */}
          <div className="flex flex-col sm:flex-row sm:items-stretch gap-4">
            {/* Chips (left, 40%) */}
            {currentQuestion.options && currentQuestion.options.length > 0 && (
              <div
                className="sm:w-2/5 flex flex-wrap sm:flex-col gap-1.5"
                role="group"
                aria-label="Select options that apply"
              >
                {currentQuestion.options.map((opt) => {
                  const isSelected = currentAnswer.selected.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="checkbox"
                      aria-checked={isSelected}
                      onClick={() => {
                        const newSelected = isSelected
                          ? currentAnswer.selected.filter((v) => v !== opt.value)
                          : [...currentAnswer.selected, opt.value];
                        onAnswerChange(currentQuestion.id, { ...currentAnswer, selected: newSelected });
                      }}
                      className={cn(
                        'px-3 py-1.5 text-xs rounded-full border transition-all duration-150 active:scale-95 text-left',
                        isSelected
                          ? 'bg-primary-50 border-primary-500 text-primary-700 font-medium'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                      )}
                    >
                      {isSelected && <CheckCircle2 className="inline h-3 w-3 mr-1 -mt-0.5" />}
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Textarea (right, 60% or full-width if no chips) — stretches to match pills height */}
            {currentQuestion.allowFreeText && (
              <div className={cn(
                'flex',
                currentQuestion.options?.length ? 'sm:w-3/5' : 'w-full'
              )}>
                <textarea
                  id={textareaId}
                  value={currentAnswer.freeText || ''}
                  onChange={(e) => {
                    onAnswerChange(currentQuestion.id, { ...currentAnswer, freeText: e.target.value });
                    if (showHint) setShowHint(false);
                  }}
                  placeholder={currentQuestion.hint || 'Add your thoughts...'}
                  className="w-full h-full min-h-[7rem] px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none transition-all duration-150 bg-white"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface GenerateStepProps {
  result: WizardGenerateResponse;
  /** The questions that were shown to the user (from analyzeResult). */
  askedQuestions?: WizardQuestion[];
  /** The user's answers keyed by question id. */
  answers?: Record<string, WizardAnswer>;
  /** Click handler on a skipped question — jumps the wizard back to it. */
  onReviseSkipped?: (questionIndex: number) => void;
}

const GenerateStep: React.FC<GenerateStepProps> = ({
  result,
  askedQuestions = [],
  answers = {},
  onReviseSkipped,
}) => {
  const { story, evaluation } = result;
  const archetypeConfig = ARCHETYPE_CONFIG[story.archetype];
  const ArchetypeIcon = archetypeConfig.icon;

  // Skipped = questions shown but with no selected chips and no free text.
  // Ship 4: surface these to the user with a one-click path back to fill them.
  const skipped = askedQuestions
    .map((q, idx) => ({ q, idx }))
    .filter(({ q }) => {
      const answer = answers[q.id];
      if (!answer) return true;
      const hasSelected = Array.isArray(answer.selected) && answer.selected.length > 0;
      const hasFreeText = typeof answer.freeText === 'string' && answer.freeText.trim().length > 0;
      return !hasSelected && !hasFreeText;
    });

  const scoreColor =
    evaluation.score >= 8
      ? 'text-green-600 bg-green-50'
      : evaluation.score >= 6
      ? 'text-yellow-600 bg-yellow-50'
      : 'text-red-600 bg-red-50';

  return (
    <div className="space-y-6">
      {/* Success header with score */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100 animate-in zoom-in-95 duration-300">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-green-600" />
          <div>
            <p className="font-semibold text-gray-900">Story Created!</p>
            <p className="text-sm text-gray-600">{story.framework} format with {archetypeConfig.label} archetype</p>
          </div>
        </div>
        <div className={`px-4 py-2 rounded-lg ${scoreColor}`}>
          <span className="text-2xl font-bold">{evaluation.score.toFixed(1)}</span>
          <span className="text-xs ml-1">/10</span>
        </div>
      </div>

      {/* Hook */}
      <div className="p-4 bg-primary-50 rounded-lg border border-primary-100 animate-in fade-in slide-in-from-bottom-1 duration-300" style={{ animationDelay: '100ms' }}>
        <p className="text-sm font-medium text-gray-500 mb-1">Opening Hook</p>
        <p className="text-gray-800 italic">"{story.hook}"</p>
      </div>

      {/* Sections preview */}
      <div className="space-y-3 animate-in fade-in slide-in-from-bottom-1 duration-300" style={{ animationDelay: '200ms' }}>
        <p className="text-sm font-medium text-gray-500">Story Sections</p>
        <div className="grid gap-2">
          {Object.entries(story.sections).map(([key, section], idx) => (
            <div
              key={key}
              className="p-3 bg-gray-50 rounded-lg animate-in fade-in slide-in-from-left-1 duration-200"
              style={{ animationDelay: `${200 + idx * 50}ms` }}
            >
              <span className="text-xs font-semibold text-primary-600 uppercase tracking-wider">
                {key}
              </span>
              <p className="text-sm text-gray-700 mt-1 line-clamp-2">{section.summary}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Coach comment */}
      <div className="p-4 bg-gray-900 text-white rounded-lg animate-in fade-in slide-in-from-bottom-1 duration-300" style={{ animationDelay: '300ms' }}>
        <div className="flex items-center gap-2 mb-2">
          <ArchetypeIcon className={`h-4 w-4 ${archetypeConfig.color}`} />
          <span className="text-xs font-medium text-gray-400">Story Coach</span>
        </div>
        <p className="text-sm">{evaluation.coachComment}</p>
      </div>

      {/* Suggestions */}
      {evaluation.suggestions.length > 0 && (
        <div className="space-y-2 animate-in fade-in duration-300" style={{ animationDelay: '400ms' }}>
          <p className="text-xs font-medium text-gray-500">To improve your score:</p>
          <ul className="space-y-1">
            {evaluation.suggestions.map((suggestion, idx) => (
              <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                <span className="text-primary-500 mt-0.5">•</span>
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Skipped-question panel (Ship 4) */}
      {skipped.length > 0 && (
        <div
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 space-y-2 animate-in fade-in duration-300"
          style={{ animationDelay: '450ms' }}
        >
          <p className="text-xs font-medium text-amber-900">
            You skipped {skipped.length} {skipped.length === 1 ? 'question' : 'questions'}. Adding them usually makes the story noticeably stronger.
          </p>
          <ul className="space-y-1">
            {skipped.map(({ q, idx }) => (
              <li key={q.id}>
                <button
                  type="button"
                  onClick={() => onReviseSkipped?.(idx)}
                  className="text-left text-xs text-amber-900 hover:text-amber-700 underline underline-offset-2 decoration-amber-300 hover:decoration-amber-500 transition-colors"
                >
                  {q.question}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default StoryWizardModal;
