/**
 * Story Wizard Modal
 *
 * 3-step wizard for promoting journal entries to career stories:
 * 1. Analyze: Detect archetype, show confidence
 * 2. Questions: D-I-G questions with checkboxes + free text
 * 3. Generate: Story + evaluation score
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
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
import { ArchetypeSelector, ARCHETYPE_CONFIG } from './ArchetypeSelector';
import { FrameworkSelector } from '../career-stories/FrameworkSelector';

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

type WizardStep = 'analyze' | 'questions' | 'generate';

export const StoryWizardModal: React.FC<StoryWizardModalProps> = ({
  isOpen,
  onClose,
  journalEntryId,
  journalEntryTitle,
  journalEntryMeta,
  onStoryCreated,
}) => {
  // State
  const [step, setStep] = useState<WizardStep>('analyze');
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
      setStep('analyze');
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

  // Auto-analyze on open
  useEffect(() => {
    if (isOpen && step === 'analyze' && !analyzeResult) {
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
    if (!selectedArchetype) return;

    setStep('generate'); // Show loading immediately
    setIsLoading(true);
    setError(null);
    try {
      const response = await CareerStoriesService.wizardGenerate({
        journalEntryId,
        answers,
        archetype: selectedArchetype,
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

  const stepIndex = ['analyze', 'questions', 'generate'].indexOf(step);
  const isLastQuestion = analyzeResult
    ? currentQuestionIndex === analyzeResult.questions.length - 1
    : false;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={cn(
        'max-w-2xl max-h-[85vh] flex flex-col border-2 border-transparent ai-moving-border',
        // Allow dropdowns to overflow on analyze step; clip on other steps
        step === 'analyze' ? 'overflow-visible' : 'overflow-hidden'
      )}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary-500" />
            Promote to Career Story
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            Transform "{journalEntryTitle || analyzeResult?.journalEntry.title || 'your draft'}" into a compelling career story
          </DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 px-1 py-3">
          {(['analyze', 'questions', 'generate'] as WizardStep[]).map((s, idx) => (
            <React.Fragment key={s}>
              <div
                className={`flex items-center gap-2 transition-colors duration-200 ${
                  step === s
                    ? 'text-primary-600 font-medium'
                    : idx < stepIndex
                    ? 'text-green-600'
                    : 'text-gray-400'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300 ${
                    step === s
                      ? 'bg-primary-100 text-primary-700 ring-2 ring-primary-500 ring-offset-2'
                      : idx < stepIndex
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {idx < stepIndex ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    idx + 1
                  )}
                </div>
                <span className="hidden sm:inline text-sm capitalize">{s}</span>
              </div>
              {idx < 2 && (
                <div
                  className={`flex-1 h-0.5 transition-colors duration-300 ${
                    idx < stepIndex ? 'bg-green-300' : 'bg-gray-200'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Error message */}
        {error && (
          <div role="alert" className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm animate-in fade-in duration-200">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span className="flex-1">{error}</span>
            <button
              type="button"
              onClick={() => {
                setError(null);
                if (step === 'analyze') handleAnalyze();
                else if (step === 'generate') handleGenerate();
              }}
              className="text-xs font-medium text-red-600 hover:text-red-800 underline underline-offset-2 flex-shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {/* Content */}
        <div className={cn(
          'flex-1',
          // Analyze step: no scroll so dropdown menus aren't clipped
          step === 'analyze' ? 'overflow-visible' : 'overflow-y-auto min-h-[300px]'
        )}>
          {step === 'analyze' && (
            <div className="space-y-6 py-4 animate-in fade-in slide-in-from-right-2 duration-200">
              <AnalyzeStep
                isLoading={isLoading}
                result={analyzeResult}
                selectedArchetype={selectedArchetype}
                onArchetypeChange={setSelectedArchetype}
                selectedFramework={selectedFramework}
                onFrameworkChange={setSelectedFramework}
                journalMeta={journalEntryMeta}
              />
            </div>
          )}

          {step === 'questions' && analyzeResult && (
            <div className="space-y-6 py-4 animate-in fade-in slide-in-from-right-2 duration-200">
              <QuestionsStep
                questions={analyzeResult.questions}
                answers={answers}
                onAnswerChange={handleAnswerChange}
                currentQuestionIndex={currentQuestionIndex}
              />
            </div>
          )}

          {step === 'generate' && isLoading && (
            <div className="py-4 animate-in fade-in duration-200">
              <WizardLoadingState mode="generate" journalMeta={journalEntryMeta} />
            </div>
          )}

          {step === 'generate' && !isLoading && generateResult && (
            <div className="space-y-6 py-4 animate-in fade-in slide-in-from-right-2 duration-200">
              <GenerateStep result={generateResult} />
            </div>
          )}
        </div>

        {/* Footer — unified navigation */}
        {!(step === 'generate' && isLoading) && (
          <div className="flex justify-between items-center pt-4 border-t border-gray-100">
            <Button
              variant="ghost"
              onClick={() => {
                if (step === 'analyze') {
                  onClose();
                } else if (step === 'questions') {
                  if (currentQuestionIndex > 0) {
                    setCurrentQuestionIndex((i) => i - 1);
                  } else {
                    setStep('analyze');
                  }
                } else if (step === 'generate' && analyzeResult) {
                  // Back from generate result → last question
                  setStep('questions');
                  setCurrentQuestionIndex(analyzeResult.questions.length - 1);
                }
              }}
              disabled={isLoading}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              {step === 'analyze' ? 'Cancel' : 'Back'}
            </Button>

            <div className="flex items-center gap-3">
              {/* Skip (questions only) */}
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

              {/* Primary action */}
              {step === 'analyze' && (
                <Button
                  onClick={() => setStep('questions')}
                  disabled={isLoading || !analyzeResult}
                  className="bg-primary-500 hover:bg-primary-600 text-white"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
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
      </DialogContent>
    </Dialog>
  );
};

// ============================================================================
// Step Components
// ============================================================================

interface AnalyzeStepProps {
  isLoading: boolean;
  result: WizardAnalyzeResponse | null;
  selectedArchetype: StoryArchetype | null;
  onArchetypeChange: (archetype: StoryArchetype) => void;
  selectedFramework: NarrativeFramework;
  onFrameworkChange: (framework: NarrativeFramework) => void;
  journalMeta?: JournalEntryMeta;
}

const AnalyzeStep: React.FC<AnalyzeStepProps> = ({
  isLoading,
  result,
  selectedArchetype,
  onArchetypeChange,
  selectedFramework,
  onFrameworkChange,
  journalMeta,
}) => {
  if (isLoading) {
    return <WizardLoadingState mode="analyze" journalMeta={journalMeta} />;
  }

  if (!result) return null;

  const config = ARCHETYPE_CONFIG[result.archetype.detected] ?? ARCHETYPE_CONFIG.firefighter;
  const Icon = config.icon;

  return (
    <div className="space-y-6">
      {/* Detected Archetype */}
      <div className="p-4 bg-gradient-to-r from-primary-50 to-purple-50 rounded-xl border border-primary-100">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl bg-white shadow-sm ${config.color} animate-in zoom-in duration-300`}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-gray-900">{config.label}</span>
              <span className="text-xs px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full">
                {Math.round(result.archetype.confidence * 100)}% match
              </span>
            </div>
            <p className="text-sm text-gray-600">{result.archetype.reasoning}</p>
          </div>
        </div>

        {/* Selectors — integrated inside the card */}
        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-primary-100/50">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">Archetype</span>
            <ArchetypeSelector
              value={selectedArchetype || result.archetype.detected}
              onChange={onArchetypeChange}
              detected={result.archetype.detected}
              alternatives={result.archetype.alternatives}
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">Format</span>
            <FrameworkSelector
              value={selectedFramework}
              onChange={onFrameworkChange}
              align="left"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

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
}

const GenerateStep: React.FC<GenerateStepProps> = ({ result }) => {
  const { story, evaluation } = result;
  const archetypeConfig = ARCHETYPE_CONFIG[story.archetype];
  const ArchetypeIcon = archetypeConfig.icon;

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
    </div>
  );
};

export default StoryWizardModal;
