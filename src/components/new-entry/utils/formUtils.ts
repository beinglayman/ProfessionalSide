import { FormData } from '../types/newEntryTypes';

// Legacy form hash function for current modal structure
export const getFormInputsHashLegacy = (formData: any): string => {
  const inputs = {
    primaryFocusArea: formData.primaryFocusArea,
    primaryFocusAreaOthers: formData.primaryFocusAreaOthers,
    workCategory: formData.workCategory,
    workCategoryOthers: formData.workCategoryOthers,
    workTypes: formData.workTypes.sort(), // Sort to ensure consistent ordering
    workTypeOthers: formData.workTypeOthers,
    title: formData.title.trim(),
    description: formData.description.trim(),
    result: formData.result?.trim() || '',
    workspaceId: formData.workspaceId,
    skillsApplied: formData.skillsApplied.sort(), // Sort to ensure consistent ordering
    collaborators: formData.collaborators.sort(),
    reviewers: formData.reviewers.sort(),
    projects: formData.projects.sort(),
    departments: formData.departments.sort(),
    artifacts: formData.artifacts.map((a: any) => ({ name: a.name, type: a.type, url: a.url })).sort((a: any, b: any) => a.name.localeCompare(b.name)),
    // Include goal completion fields for proper change detection
    linkedGoalId: formData.linkedGoalId,
    markGoalAsComplete: formData.markGoalAsComplete,
    goalCompletionNotes: formData.goalCompletionNotes?.trim() || ''
  };
  return JSON.stringify(inputs);
};

// New form hash function for refactored structure
export const getFormInputsHash = (formData: FormData): string => {
  const inputs = {
    focusAreaId: formData.focusAreaId,
    selectedCategoryIds: [...formData.selectedCategoryIds].sort(),
    selectedWorkTypeIds: [...formData.selectedWorkTypeIds].sort(),
    selectedSkillIds: [...formData.selectedSkillIds].sort(),
    entryType: formData.entryType,
    title: formData.title.trim(),
    content: formData.content.trim(),
    abstractContent: formData.abstractContent?.trim() || '',
    linkedGoalId: formData.linkedGoalId,
    markGoalAsComplete: formData.markGoalAsComplete,
    goalCompletionNotes: formData.goalCompletionNotes?.trim() || '',
    privacyLevel: formData.privacyLevel,
    achievementType: formData.achievementType,
    achievementTitle: formData.achievementTitle?.trim() || '',
    achievementDescription: formData.achievementDescription?.trim() || '',
    artifacts: formData.artifacts.map(a => ({
      name: a.name,
      type: a.type,
      size: a.size
    })).sort((a, b) => a.name.localeCompare(b.name))
  };
  return JSON.stringify(inputs);
};

// Check if form has changed since last AI generation
export const hasFormChanged = (currentHash: string, lastGenerationInputs: string | null): boolean => {
  return lastGenerationInputs !== currentHash;
};

// Format AI content for display
export const formatAIContent = (aiContent: any): string => {
  if (!aiContent) return '';

  const formattedOutcomes = aiContent.outcomes?.map((outcome: any) =>
    `**${outcome.title}** (${outcome.category})\n${outcome.description}`
  ).join('\n\n') || '';

  return `${aiContent.description}\n\n**Outcomes & Results:**\n\n${formattedOutcomes}`;
};

// Format abstract content with length limit for network entries
export const formatAbstractContent = (aiContent: any): string => {
  if (!aiContent?.description) return '';

  const baseContent = aiContent.description;
  const maxLength = 950; // Leave room for any additional formatting

  if (baseContent.length <= maxLength) {
    return baseContent;
  }

  return baseContent.substring(0, maxLength - 3) + '...';
};

// Initialize form data with default values
export const initializeFormData = (): FormData => ({
  focusAreaId: null,
  selectedCategoryIds: [],
  selectedWorkTypeIds: [],
  selectedSkillIds: [],
  entryType: '',
  title: '',
  content: '',
  abstractContent: '',
  linkedGoalId: null,
  markGoalAsComplete: false,
  goalCompletionNotes: '',
  privacyLevel: 'private',
  achievementType: '',
  achievementTitle: '',
  achievementDescription: '',
  skills: [],
  artifacts: []
});

// Reset form data to initial state
export const resetFormData = (): FormData => initializeFormData();

// Update form data with specific field
export const updateFormField = <K extends keyof FormData>(
  formData: FormData,
  field: K,
  value: FormData[K]
): FormData => ({
  ...formData,
  [field]: value
});

// Check if achievement fields are required
export const isAchievementEntry = (entryType: string): boolean => {
  return entryType === 'achievement';
};

// Get achievement type display name
export const getAchievementTypeDisplayName = (achievementType: string): string => {
  const types: Record<string, string> = {
    certification: 'Certification',
    award: 'Award',
    milestone: 'Milestone',
    recognition: 'Recognition'
  };
  return types[achievementType] || achievementType;
};

// Get entry type display name
export const getEntryTypeDisplayName = (entryType: string): string => {
  const types: Record<string, string> = {
    achievement: 'Achievement',
    learning: 'Learning',
    challenge: 'Challenge',
    reflection: 'Reflection'
  };
  return types[entryType] || entryType;
};

// Get privacy level display name
export const getPrivacyLevelDisplayName = (privacyLevel: string): string => {
  const levels: Record<string, string> = {
    private: 'Private',
    team: 'Team',
    network: 'Network',
    public: 'Public'
  };
  return levels[privacyLevel] || privacyLevel;
};

// Check if step is valid for navigation
export const canProceedToNextStep = (step: number, formData: FormData): boolean => {
  switch (step) {
    case 1:
      return formData.focusAreaId !== null &&
             formData.selectedCategoryIds.length > 0 &&
             formData.selectedWorkTypeIds.length > 0;
    case 2:
      return formData.entryType !== '';
    case 3:
      return formData.title.trim() !== '' && formData.content.trim() !== '';
    case 4:
      return formData.privacyLevel !== '' &&
             (!isAchievementEntry(formData.entryType) ||
              (formData.achievementType !== '' &&
               formData.achievementTitle.trim() !== '' &&
               formData.achievementDescription.trim() !== ''));
    case 5:
      return true; // Artifacts are optional
    case 6:
      return formData.selectedSkillIds.length > 0;
    case 7:
      return true; // AI Preview step
    default:
      return true;
  }
};

// Get step title
export const getStepTitle = (step: number): string => {
  const titles: Record<number, string> = {
    1: 'Focus Area',
    2: 'Entry Type',
    3: 'Content',
    4: 'Details',
    5: 'Artifacts',
    6: 'Skills',
    7: 'AI Preview'
  };
  return titles[step] || `Step ${step}`;
};

// Get total number of steps
export const getTotalSteps = (): number => 7;

// Generate file ID for artifacts
export const generateFileId = (): string => {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
};

// Format file size for display
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Check if file type is supported
export const isSupportedFileType = (file: File): boolean => {
  const supportedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown'
  ];
  return supportedTypes.includes(file.type);
};

// Create artifact from file
export const createArtifactFromFile = (file: File): FormData['artifacts'][0] => {
  return {
    id: generateFileId(),
    file,
    name: file.name,
    size: file.size,
    type: file.type,
    preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
  };
};