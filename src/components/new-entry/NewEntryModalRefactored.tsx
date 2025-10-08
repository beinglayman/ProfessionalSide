import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader } from '../ui/dialog';
import { Button } from '../ui/button';
import { useCreateJournalEntry } from '../../hooks/useJournal';
import { useFocusAreas } from '../../hooks/useReference';
import { useWorkspaceGoals, useUpdateGoal, triggerGoalCompletionCelebration } from '../../hooks/useGoals';
import { useGenerateAIEntries } from '../../hooks/useAIGeneration';
import { CreateJournalEntryRequest } from '../../services/journal.service';

// Types and utilities
import {
  FormData,
  ValidationErrors,
  NewEntryModalProps,
  FocusArea,
  Goal,
  Skill
} from './types/newEntryTypes';
import {
  initializeFormData,
  validateCurrentStep,
  getFormInputsHash,
  hasFormChanged,
  formatAIContent,
  formatAbstractContent,
  canProceedToNextStep,
  getTotalSteps
} from './utils/formUtils';

// Step components
import { Step1FocusArea } from './steps/Step1FocusArea';
import { Step2EntryType } from './steps/Step2EntryType';
import { Step3Content } from './steps/Step3Content';
import { Step4Details } from './steps/Step4Details';
import { Step5Artifacts } from './steps/Step5Artifacts';
import { Step6Skills } from './steps/Step6Skills';
import { Step7AIPreview } from './steps/Step7AIPreview';

// Shared components
import { FormNavigation } from './components/FormNavigation';

export const NewEntryModalRefactored: React.FC<NewEntryModalProps> = ({
  isOpen,
  onClose,
  workspaceId,
  onEntryCreated
}) => {
  // State
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(initializeFormData());
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [generatedEntry, setGeneratedEntry] = useState<any>(null);
  const [lastGenerationInputs, setLastGenerationInputs] = useState<string | null>(null);

  // Hooks
  const createJournalMutation = useCreateJournalEntry();
  const generateAIMutation = useGenerateAIEntries();
  const updateGoalMutation = useUpdateGoal();
  const { data: focusAreas = [], isLoading: loadingFocusAreas } = useFocusAreas();
  const { data: workspaceGoals = [] } = useWorkspaceGoals(workspaceId);

  // Mock data for skills - in real implementation, this would come from hooks
  const availableSkills: Skill[] = [
    { id: 1, name: 'React', focusAreaId: 1, workTypeId: 1 },
    { id: 2, name: 'TypeScript', focusAreaId: 1, workTypeId: 1 },
    { id: 3, name: 'JavaScript', focusAreaId: 1, workTypeId: 1 },
    { id: 4, name: 'Node.js', focusAreaId: 1, workTypeId: 2 },
    { id: 5, name: 'Python', focusAreaId: 1, workTypeId: 2 },
    { id: 6, name: 'Project Management', focusAreaId: 2, workTypeId: 3 },
    { id: 7, name: 'Leadership', focusAreaId: 2, workTypeId: 3 },
    { id: 8, name: 'Communication', focusAreaId: 2 },
    { id: 9, name: 'Problem Solving', focusAreaId: 2 },
    { id: 10, name: 'Team Collaboration', focusAreaId: 2 }
  ];

  // Initialize workspace
  useEffect(() => {
    if (workspaceId && isOpen) {
      setFormData(prev => ({ ...prev, workspaceId }));
    }
  }, [workspaceId, isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(1);
      setFormData(initializeFormData());
      setValidationErrors({});
      setIsSubmitting(false);
      setIsGeneratingAI(false);
      setGeneratedEntry(null);
      setLastGenerationInputs(null);
    }
  }, [isOpen]);

  // Navigation handlers
  const handleNext = () => {
    const validation = validateCurrentStep(currentStep, formData);

    if (validation.valid) {
      setValidationErrors({});
      if (currentStep < getTotalSteps()) {
        setCurrentStep(currentStep + 1);
      }
    } else {
      setValidationErrors({ [getStepFieldName(currentStep)]: validation.message });
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setValidationErrors({});
    }
  };

  const getStepFieldName = (step: number): keyof ValidationErrors => {
    switch (step) {
      case 1: return 'focusAreaId';
      case 2: return 'entryType';
      case 3: return 'title';
      case 4: return 'achievementType';
      case 6: return 'selectedSkillIds';
      default: return 'focusAreaId';
    }
  };

  // AI Generation
  const handleGenerateAI = async () => {
    if (!canGenerateAI()) return;

    setIsGeneratingAI(true);
    try {
      // Mock AI generation - replace with actual API call
      const mockGenerated = {
        title: formData.title || 'AI Enhanced Title',
        description: formData.content || 'AI enhanced description based on your content...',
        outcomes: [
          {
            category: 'technical' as const,
            title: 'Technical Achievement',
            description: 'Successfully implemented technical solutions...'
          }
        ]
      };

      setGeneratedEntry(mockGenerated);
      setLastGenerationInputs(getFormInputsHash(formData));
    } catch (error) {
      console.error('AI generation failed:', error);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const canGenerateAI = (): boolean => {
    return !!(
      formData.title.trim() &&
      formData.content.trim() &&
      formData.entryType &&
      formData.selectedSkillIds.length > 0
    );
  };

  const hasFormChangedSinceGeneration = (): boolean => {
    if (!lastGenerationInputs) return true;
    return hasFormChanged(getFormInputsHash(formData), lastGenerationInputs);
  };

  // Form submission
  const handleSubmit = async () => {
    if (!generatedEntry) {
      setValidationErrors({ entryType: 'Please generate AI content first' });
      return;
    }

    setIsSubmitting(true);
    try {
      // Create journal entry
      const journalData: CreateJournalEntryRequest = {
        title: generatedEntry.title,
        description: generatedEntry.description.substring(0, 490) +
                   (generatedEntry.description.length > 490 ? '...' : ''),
        fullContent: formatAIContent(generatedEntry),
        abstractContent: formatAbstractContent(generatedEntry),
        workspaceId: workspaceId,
        visibility: formData.privacyLevel === 'private' ? 'private' :
                   formData.privacyLevel === 'team' ? 'workspace' : 'network',
        category: 'General',
        tags: [],
        skills: formData.skills.map(skill => skill.name),
        collaborators: [],
        reviewers: [],
        artifacts: formData.artifacts.map(a => ({ name: a.name, type: a.type, url: '' })),
        outcomes: generatedEntry.outcomes || [],
        linkedGoalId: formData.linkedGoalId || undefined,
        // Add achievement fields for goal completion
        ...(formData.markGoalAsComplete && formData.linkedGoalId && {
          achievementType: 'milestone' as const,
          achievementTitle: `Completed Goal: ${workspaceGoals.find(g => g.id === formData.linkedGoalId)?.title || 'Unknown Goal'}`,
          achievementDescription: formData.goalCompletionNotes?.trim() ||
            `Successfully completed the goal "${workspaceGoals.find(g => g.id === formData.linkedGoalId)?.title}" through this journal entry.`
        }),
        // Add achievement fields for regular achievement entries
        ...(formData.entryType === 'achievement' && !formData.markGoalAsComplete && {
          achievementType: formData.achievementType,
          achievementTitle: formData.achievementTitle,
          achievementDescription: formData.achievementDescription
        })
      };

      const response = await createJournalMutation.mutateAsync(journalData);

      if (response.success) {
        // Handle goal completion if requested
        if (formData.markGoalAsComplete && formData.linkedGoalId) {
          try {
            await updateGoalMutation.mutateAsync({
              goalId: formData.linkedGoalId,
              data: { status: 'achieved' }
            });
            triggerGoalCompletionCelebration();
          } catch (error) {
            console.error('Failed to update goal status:', error);
          }
        }

        onEntryCreated?.();
        onClose();
      }
    } catch (error) {
      console.error('Failed to create entry:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // File handling
  const handleFileUpload = (files: FileList) => {
    // This is handled by the Step5Artifacts component
  };

  const handleRemoveArtifact = (artifactId: string) => {
    setFormData(prev => ({
      ...prev,
      artifacts: prev.artifacts.filter(a => a.id !== artifactId)
    }));
  };

  const handleSkillSearch = (query: string) => {
    // This would trigger skill search in real implementation
    console.log('Searching skills:', query);
  };

  // Check if current step can proceed
  const canProceed = canProceedToNextStep(currentStep, formData);

  // Render current step
  const renderCurrentStep = () => {
    const stepProps = {
      formData,
      setFormData,
      validationErrors,
      setValidationErrors
    };

    switch (currentStep) {
      case 1:
        return (
          <Step1FocusArea
            {...stepProps}
            focusAreas={focusAreas as FocusArea[]}
          />
        );
      case 2:
        return <Step2EntryType {...stepProps} />;
      case 3:
        return <Step3Content {...stepProps} />;
      case 4:
        return (
          <Step4Details
            {...stepProps}
            workspaceGoals={workspaceGoals as Goal[]}
          />
        );
      case 5:
        return (
          <Step5Artifacts
            {...stepProps}
            handleFileUpload={handleFileUpload}
            handleRemoveArtifact={handleRemoveArtifact}
          />
        );
      case 6:
        return (
          <Step6Skills
            {...stepProps}
            availableSkills={availableSkills}
            onSkillSearch={handleSkillSearch}
          />
        );
      case 7:
        return (
          <Step7AIPreview
            {...stepProps}
            workspaceId={workspaceId}
            onGenerate={handleGenerateAI}
            isGenerating={isGeneratingAI}
            generatedEntry={generatedEntry}
          />
        );
      default:
        return null;
    }
  };

  if (loadingFocusAreas) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-2xl">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
            <span className="ml-2 text-sm text-gray-600">Loading...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
          <h2 className="text-lg font-semibold">Create New Entry</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1">
          {renderCurrentStep()}
        </div>

        <FormNavigation
          currentStep={currentStep}
          totalSteps={getTotalSteps()}
          onNext={handleNext}
          onPrevious={handlePrevious}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          canProceed={canProceed}
          isLastStep={currentStep === getTotalSteps()}
        />
      </DialogContent>
    </Dialog>
  );
};