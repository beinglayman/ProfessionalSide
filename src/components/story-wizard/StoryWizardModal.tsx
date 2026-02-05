/**
 * Story Wizard Modal
 *
 * 3-step wizard for promoting journal entries to career stories:
 * 1. Analyze: Detect archetype, show confidence
 * 2. Questions: D-I-G questions with checkboxes + free text
 * 3. Generate: Story + evaluation score
 */

import React, { useState, useEffect } from 'react';
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
  Loader2,
  CheckCircle2,
  AlertCircle,
  Flame,
  Building2,
  Users,
  Zap,
  Search,
  Compass,
  RefreshCw,
  Shield,
} from 'lucide-react';
import { CareerStoriesService } from '../../services/career-stories.service';
import {
  StoryArchetype,
  NarrativeFramework,
  WizardAnalyzeResponse,
  WizardGenerateResponse,
  WizardQuestion,
  WizardAnswer,
} from '../../types/career-stories';

// Archetype icons and colors
const ARCHETYPE_CONFIG: Record<StoryArchetype, { icon: React.ElementType; color: string; label: string }> = {
  firefighter: { icon: Flame, color: 'text-red-500', label: 'Firefighter' },
  architect: { icon: Building2, color: 'text-blue-500', label: 'Architect' },
  diplomat: { icon: Users, color: 'text-green-500', label: 'Diplomat' },
  multiplier: { icon: Zap, color: 'text-yellow-500', label: 'Multiplier' },
  detective: { icon: Search, color: 'text-purple-500', label: 'Detective' },
  pioneer: { icon: Compass, color: 'text-orange-500', label: 'Pioneer' },
  turnaround: { icon: RefreshCw, color: 'text-cyan-500', label: 'Turnaround' },
  preventer: { icon: Shield, color: 'text-emerald-500', label: 'Preventer' },
};

interface StoryWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  journalEntryId: string;
  /** Optional - will be fetched from analyze response if not provided */
  journalEntryTitle?: string;
  onStoryCreated?: (storyId: string) => void;
}

type WizardStep = 'analyze' | 'questions' | 'generate';

const FRAMEWORKS: Array<{ value: NarrativeFramework; label: string; description: string }> = [
  { value: 'STAR', label: 'STAR', description: 'Situation, Task, Action, Result' },
  { value: 'SOAR', label: 'SOAR', description: 'Situation, Obstacles, Actions, Results' },
  { value: 'CAR', label: 'CAR', description: 'Challenge, Action, Result' },
  { value: 'STARL', label: 'STARL', description: 'STAR + Learning' },
];

export const StoryWizardModal: React.FC<StoryWizardModalProps> = ({
  isOpen,
  onClose,
  journalEntryId,
  journalEntryTitle,
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

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setStep('analyze');
      setAnalyzeResult(null);
      setSelectedArchetype(null);
      setSelectedFramework('STAR');
      setAnswers({});
      setCurrentQuestionIndex(0);
      setGenerateResult(null);
      setError(null);
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
      if (response.success && response.data) {
        setAnalyzeResult(response.data);
        setSelectedArchetype(response.data.archetype.detected);
      } else {
        setError(response.error || 'Failed to analyze entry');
      }
    } catch (err) {
      setError('Failed to analyze entry');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedArchetype) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await CareerStoriesService.wizardGenerate({
        journalEntryId,
        answers,
        archetype: selectedArchetype,
        framework: selectedFramework,
      });
      if (response.success && response.data) {
        setGenerateResult(response.data);
        setStep('generate');
        onStoryCreated?.(response.data.story.id);
      } else {
        setError(response.error || 'Failed to generate story');
      }
    } catch (err) {
      setError('Failed to generate story');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, answer: WizardAnswer) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const stepIndex = ['analyze', 'questions', 'generate'].indexOf(step);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
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
          <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm animate-in fade-in duration-200">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto min-h-[300px]">
          {step === 'analyze' && (
            <div className="space-y-6 py-4 animate-in fade-in slide-in-from-right-2 duration-200">
              <AnalyzeStep
                isLoading={isLoading}
                result={analyzeResult}
                selectedArchetype={selectedArchetype}
                onArchetypeChange={setSelectedArchetype}
                selectedFramework={selectedFramework}
                onFrameworkChange={setSelectedFramework}
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
                onNext={() => {
                  if (currentQuestionIndex < analyzeResult.questions.length - 1) {
                    setCurrentQuestionIndex((i) => i + 1);
                  } else {
                    // Last question - trigger generate
                    handleGenerate();
                  }
                }}
                onPrev={() => setCurrentQuestionIndex((i) => Math.max(0, i - 1))}
                onSkip={() => {
                  if (currentQuestionIndex < analyzeResult.questions.length - 1) {
                    setCurrentQuestionIndex((i) => i + 1);
                  } else {
                    handleGenerate();
                  }
                }}
              />
            </div>
          )}

          {step === 'generate' && generateResult && (
            <div className="space-y-6 py-4 animate-in fade-in slide-in-from-right-2 duration-200">
              <GenerateStep result={generateResult} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t border-gray-100">
          <Button
            variant="ghost"
            onClick={() => {
              if (step === 'questions') {
                if (currentQuestionIndex > 0) {
                  setCurrentQuestionIndex((i) => i - 1);
                } else {
                  setStep('analyze');
                }
              } else if (step === 'generate') {
                setStep('questions');
              } else {
                onClose();
              }
            }}
            disabled={isLoading}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {step === 'analyze' ? 'Cancel' : 'Back'}
          </Button>

          {step === 'analyze' && (
            <Button
              onClick={() => setStep('questions')}
              disabled={isLoading || !analyzeResult}
              className="bg-primary-500 hover:bg-primary-600 text-white"
            >
              Continue
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}

          {step === 'questions' && isLoading && (
            <div className="flex items-center gap-2 text-primary-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Generating your story...</span>
            </div>
          )}

          {step === 'generate' && (
            <Button
              onClick={onClose}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Done
            </Button>
          )}
        </div>
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
}

const AnalyzeStep: React.FC<AnalyzeStepProps> = ({
  isLoading,
  result,
  selectedArchetype,
  onArchetypeChange,
  selectedFramework,
  onFrameworkChange,
}) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="relative">
          <Loader2 className="h-12 w-12 text-primary-500 animate-spin" />
          <div className="absolute inset-0 rounded-full border-2 border-primary-200 animate-ping opacity-50" />
        </div>
        <p className="text-gray-500 text-sm">Analyzing your story...</p>
      </div>
    );
  }

  if (!result) return null;

  const config = ARCHETYPE_CONFIG[result.archetype.detected];
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
      </div>

      {/* Alternative Archetypes */}
      {result.archetype.alternatives.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Or choose another archetype
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[result.archetype.detected, ...result.archetype.alternatives.map((a) => a.archetype)].map(
              (archetype) => {
                const cfg = ARCHETYPE_CONFIG[archetype];
                const AltIcon = cfg.icon;
                const isSelected = selectedArchetype === archetype;
                return (
                  <button
                    key={archetype}
                    onClick={() => onArchetypeChange(archetype)}
                    className={`p-3 rounded-lg border-2 transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <AltIcon className={`h-5 w-5 mx-auto mb-1 ${cfg.color}`} />
                    <span className="text-xs font-medium text-gray-700">{cfg.label}</span>
                  </button>
                );
              }
            )}
          </div>
        </div>
      )}

      {/* Framework Selection */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          Narrative Framework
        </p>
        <div className="grid grid-cols-2 gap-2">
          {FRAMEWORKS.map((fw) => (
            <button
              key={fw.value}
              onClick={() => onFrameworkChange(fw.value)}
              className={`p-3 rounded-lg border-2 text-left transition-all duration-150 hover:scale-[1.01] active:scale-[0.99] ${
                selectedFramework === fw.value
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <span className="font-medium text-sm text-gray-900">{fw.label}</span>
              <p className="text-xs text-gray-500 mt-0.5">{fw.description}</p>
            </button>
          ))}
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
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

const QuestionsStep: React.FC<QuestionsStepProps> = ({
  questions,
  answers,
  onAnswerChange,
  currentQuestionIndex,
  onNext,
  onPrev,
  onSkip,
}) => {
  const phaseConfig = {
    dig: { label: 'Context', color: 'bg-blue-500', bgColor: 'from-blue-50 to-slate-50 border-blue-100' },
    impact: { label: 'Impact', color: 'bg-emerald-500', bgColor: 'from-emerald-50 to-slate-50 border-emerald-100' },
    growth: { label: 'Growth', color: 'bg-violet-500', bgColor: 'from-violet-50 to-slate-50 border-violet-100' },
  };

  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = answers[currentQuestion?.id] || { selected: [] };
  const hasAnswer = currentAnswer.selected.length > 0 || (currentAnswer.freeText && currentAnswer.freeText.trim().length > 0);
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const answeredCount = questions.filter((q) => {
    const a = answers[q.id];
    return a?.selected.length > 0 || (a?.freeText && a.freeText.trim().length > 0);
  }).length;

  if (!currentQuestion) return null;

  const phase = phaseConfig[currentQuestion.phase];
  const textareaId = `question-${currentQuestion.id}-text`;

  return (
    <div className="space-y-5">
      {/* Compact progress header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">
            {currentQuestionIndex + 1}
            <span className="text-gray-400 font-normal"> / {questions.length}</span>
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full text-white ${phase.color}`}>
            {phase.label}
          </span>
        </div>
        <span className="text-xs text-gray-400">
          {answeredCount} answered
        </span>
      </div>

      {/* Single progress bar - clean, no dots */}
      <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question card - cleaner styling */}
      <div
        key={currentQuestion.id}
        className={`p-6 rounded-2xl border bg-gradient-to-br ${phase.bgColor} animate-in fade-in slide-in-from-right-4 duration-300`}
      >
        <div className="space-y-5">
          {/* Question text */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 leading-relaxed">
              {currentQuestion.question}
            </h3>
            {currentQuestion.hint && (
              <p className="text-sm text-gray-500 mt-2">{currentQuestion.hint}</p>
            )}
          </div>

          {/* Options as accessible chips */}
          {currentQuestion.options && currentQuestion.options.length > 0 && (
            <div
              className="flex flex-wrap gap-2"
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
                    className={`px-4 py-2.5 text-sm rounded-full border-2 transition-all duration-150 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                      isSelected
                        ? 'bg-primary-50 border-primary-500 text-primary-700 font-medium'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {isSelected && (
                      <CheckCircle2 className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5" />
                    )}
                    {opt.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Free text input with label */}
          {currentQuestion.allowFreeText && (
            <div className="space-y-2">
              <label
                htmlFor={textareaId}
                className="text-sm font-medium text-gray-600"
              >
                Add your own context
              </label>
              <textarea
                id={textareaId}
                value={currentAnswer.freeText || ''}
                onChange={(e) => onAnswerChange(currentQuestion.id, { ...currentAnswer, freeText: e.target.value })}
                placeholder="What else is relevant here?"
                className="w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none transition-all duration-150 bg-white"
                rows={3}
              />
            </div>
          )}
        </div>
      </div>

      {/* Navigation - cleaner layout */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onPrev}
          disabled={currentQuestionIndex === 0}
          className="text-gray-500 hover:text-gray-700"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onSkip}
            className="text-gray-400 hover:text-gray-600"
          >
            Skip
          </Button>

          {isLastQuestion ? (
            <Button
              onClick={onNext}
              className="bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white shadow-sm"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Story
            </Button>
          ) : (
            <Button
              onClick={onNext}
              variant={hasAnswer ? 'default' : 'secondary'}
              className={hasAnswer ? 'bg-primary-500 hover:bg-primary-600 text-white' : ''}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

interface QuestionItemProps {
  question: WizardQuestion;
  answer: WizardAnswer;
  onChange: (answer: WizardAnswer) => void;
}

const QuestionItem: React.FC<QuestionItemProps> = ({ question, answer, onChange }) => {
  const toggleOption = (value: string) => {
    const newSelected = answer.selected.includes(value)
      ? answer.selected.filter((v) => v !== value)
      : [...answer.selected, value];
    onChange({ ...answer, selected: newSelected });
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-800">{question.question}</p>
      {question.hint && <p className="text-xs text-gray-500 italic">{question.hint}</p>}

      {/* Options (checkboxes) */}
      {question.options && (
        <div className="flex flex-wrap gap-2 mt-2">
          {question.options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => toggleOption(opt.value)}
              className={`px-3 py-1.5 text-xs rounded-full border transition-all duration-150 active:scale-95 ${
                answer.selected.includes(opt.value)
                  ? 'bg-primary-100 border-primary-400 text-primary-700'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Free text */}
      {question.allowFreeText && (
        <textarea
          value={answer.freeText || ''}
          onChange={(e) => onChange({ ...answer, freeText: e.target.value })}
          placeholder="Add more details..."
          className="w-full mt-2 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none transition-shadow duration-150"
          rows={2}
        />
      )}
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
