// Main modal components
export { NewEntryModalRefactored } from './NewEntryModalRefactored';

// Step components
export { Step1FocusArea } from './steps/Step1FocusArea';
export { Step2EntryType } from './steps/Step2EntryType';
export { Step3Content } from './steps/Step3Content';
export { Step4Details } from './steps/Step4Details';
export { Step5Artifacts } from './steps/Step5Artifacts';
export { Step6Skills } from './steps/Step6Skills';
export { Step7AIPreview } from './steps/Step7AIPreview';

// Shared components
export { FormNavigation } from './components/FormNavigation';
export { AchievementPreview } from './components/AchievementPreview';
export { ArtifactManager } from './components/ArtifactManager';

// Types
export type {
  FormData,
  ValidationErrors,
  NewEntryModalProps,
  FocusArea,
  Category,
  WorkType,
  Skill,
  Goal,
  StepComponentProps,
  FormNavigationProps,
  AchievementPreviewProps
} from './types/newEntryTypes';

// Utilities
export {
  initializeFormData,
  resetFormData,
  updateFormField,
  validateCurrentStep,
  validateForm,
  getFormInputsHash,
  hasFormChanged,
  formatAIContent,
  formatAbstractContent,
  canProceedToNextStep,
  getTotalSteps,
  getStepTitle,
  isAchievementEntry,
  getAchievementTypeDisplayName,
  getEntryTypeDisplayName,
  getPrivacyLevelDisplayName,
  generateFileId,
  formatFileSize,
  isSupportedFileType,
  createArtifactFromFile
} from './utils/formUtils';

export {
  validateTitle,
  validateContent,
  validateAbstractContent,
  validateAchievementTitle,
  validateAchievementDescription
} from './utils/formValidation';