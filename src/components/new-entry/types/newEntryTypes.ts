export interface FormData {
  focusAreaId: number | null;
  selectedCategoryIds: number[];
  selectedWorkTypeIds: number[];
  selectedSkillIds: number[];
  entryType: 'achievement' | 'learning' | 'challenge' | 'reflection' | '';
  title: string;
  content: string;
  abstractContent: string;
  linkedGoalId: string | null;
  markGoalAsComplete: boolean;
  goalCompletionNotes: string;
  privacyLevel: 'private' | 'team' | 'network' | 'public';
  achievementType: 'certification' | 'award' | 'milestone' | 'recognition' | '';
  achievementTitle: string;
  achievementDescription: string;
  skills: Array<{
    id: number;
    name: string;
    focusAreaId: number;
    workTypeId?: number;
  }>;
  artifacts: Array<{
    id: string;
    file: File;
    name: string;
    size: number;
    type: string;
    preview?: string;
  }>;
  // MCP imported data (temporary storage for later steps)
  importedArtifacts?: any[];
  importedSkills?: string[];
  workspaceId?: string;
}

export interface ValidationErrors {
  focusAreaId?: string;
  selectedCategoryIds?: string;
  selectedWorkTypeIds?: string;
  entryType?: string;
  title?: string;
  content?: string;
  abstractContent?: string;
  achievementType?: string;
  achievementTitle?: string;
  achievementDescription?: string;
  selectedSkillIds?: string;
}

export interface FocusArea {
  id: number;
  name: string;
  description: string;
  categories: Category[];
}

export interface Category {
  id: number;
  name: string;
  description: string;
  focusAreaId: number;
  workTypes: WorkType[];
}

export interface WorkType {
  id: number;
  name: string;
  description: string;
  categoryId: number;
  skills: Skill[];
}

export interface Skill {
  id: number;
  name: string;
  focusAreaId: number;
  workTypeId?: number;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'achieved' | 'paused';
  targetDate: string;
  priority: 'low' | 'medium' | 'high';
  workspaceId: string;
}

export interface NewEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  onEntryCreated?: () => void;
}

export interface StepComponentProps {
  formData: FormData;
  setFormData: (data: FormData) => void;
  validationErrors: ValidationErrors;
  setValidationErrors: (errors: ValidationErrors) => void;
}

export interface Step1Props extends StepComponentProps {
  focusAreas: FocusArea[];
}

export interface Step2Props extends StepComponentProps {
  // Entry type selection specific props if needed
}

export interface Step3Props extends StepComponentProps {
  // Content input specific props if needed
}

export interface Step4Props extends StepComponentProps {
  workspaceGoals: Goal[];
}

export interface Step5Props extends StepComponentProps {
  handleFileUpload: (files: FileList) => void;
  handleRemoveArtifact: (artifactId: string) => void;
}

export interface Step6Props extends StepComponentProps {
  availableSkills: Skill[];
  onSkillSearch: (query: string) => void;
}

export interface Step7Props extends StepComponentProps {
  workspaceId: string;
  onGenerate: () => void;
  isGenerating: boolean;
  generatedEntry: any;
}

export interface FormNavigationProps {
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrevious: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  canProceed: boolean;
  isLastStep: boolean;
}

export interface AchievementPreviewProps {
  achievementType: string;
  achievementTitle: string;
  achievementDescription: string;
}