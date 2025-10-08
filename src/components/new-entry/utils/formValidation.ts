import { FormData, ValidationErrors } from '../types/newEntryTypes';

export interface ValidationResult {
  valid: boolean;
  message: string;
}

// Legacy validation function for current modal structure
export const validateCurrentStepLegacy = (step: number, formData: any): ValidationResult => {
  switch (step) {
    case 1:
      if (!formData.primaryFocusArea)
        return { valid: false, message: 'Please select a focus area.' };
      if (formData.primaryFocusArea === '99-others' && !formData.primaryFocusAreaOthers.trim())
        return { valid: false, message: 'Please describe your focus area.' };
      return { valid: true, message: '' };

    case 2:
      if (!formData.workCategory)
        return { valid: false, message: 'Please select a work category.' };
      if (formData.workCategory?.endsWith('-others') && !formData.workCategoryOthers.trim())
        return { valid: false, message: 'Please describe your work category.' };
      return { valid: true, message: '' };

    case 3:
      if (!formData.workTypes || formData.workTypes.length === 0)
        return { valid: false, message: 'Please select at least one work type.' };
      if (formData.workTypes.includes('others') && !formData.workTypeOthers.trim())
        return { valid: false, message: 'Please describe your work type.' };
      return { valid: true, message: '' };

    case 4:
      if (!formData.workspaceId)
        return { valid: false, message: 'Please select a workspace.' };
      if (!formData.title?.trim())
        return { valid: false, message: 'Please provide a title for your work.' };
      if (!formData.description?.trim())
        return { valid: false, message: 'Please provide a description of your work.' };
      return { valid: true, message: '' };

    case 5:
      if (!formData.skillsApplied || formData.skillsApplied.length === 0)
        return { valid: false, message: 'Please select at least one skill.' };
      return { valid: true, message: '' };

    case 6:
      // Collaborators and Reviewers step - optional
      return { valid: true, message: '' };

    case 7:
      // AI Preview step
      return { valid: true, message: '' };

    default:
      return { valid: true, message: '' };
  }
};

// New validation function for refactored structure
export const validateCurrentStep = (step: number, formData: FormData): ValidationResult => {
  switch (step) {
    case 1: // Focus Area Selection
      if (!formData.focusAreaId)
        return { valid: false, message: 'Please select a focus area.' };
      if (!formData.selectedCategoryIds || formData.selectedCategoryIds.length === 0)
        return { valid: false, message: 'Please select at least one category.' };
      if (!formData.selectedWorkTypeIds || formData.selectedWorkTypeIds.length === 0)
        return { valid: false, message: 'Please select at least one work type.' };
      return { valid: true, message: '' };

    case 2: // Entry Type Selection
      if (!formData.entryType)
        return { valid: false, message: 'Please select an entry type.' };
      return { valid: true, message: '' };

    case 3: // Content Input
      if (!formData.title?.trim())
        return { valid: false, message: 'Please provide a title for your entry.' };
      if (!formData.content?.trim())
        return { valid: false, message: 'Please provide content for your entry.' };
      if (formData.abstractContent && formData.abstractContent.length > 1000)
        return { valid: false, message: 'Abstract content must be less than 1,000 characters.' };
      return { valid: true, message: '' };

    case 4: // Details (Goals, Privacy, Achievement)
      if (!formData.privacyLevel)
        return { valid: false, message: 'Please select a privacy level.' };

      // Achievement validation
      if (formData.entryType === 'achievement') {
        if (!formData.achievementType)
          return { valid: false, message: 'Please select an achievement type.' };
        if (!formData.achievementTitle?.trim())
          return { valid: false, message: 'Please provide an achievement title.' };
        if (!formData.achievementDescription?.trim())
          return { valid: false, message: 'Please provide an achievement description.' };
      }

      // Goal completion validation
      if (formData.markGoalAsComplete) {
        if (!formData.linkedGoalId)
          return { valid: false, message: 'Please select a goal to mark as complete.' };
      }

      return { valid: true, message: '' };

    case 5: // Artifacts
      // Artifacts are optional
      return { valid: true, message: '' };

    case 6: // Skills
      if (!formData.selectedSkillIds || formData.selectedSkillIds.length === 0)
        return { valid: false, message: 'Please select at least one skill.' };
      return { valid: true, message: '' };

    case 7: // AI Preview
      return { valid: true, message: '' };

    default:
      return { valid: true, message: '' };
  }
};

// Field-level validation functions
export const validateTitle = (title: string): string | null => {
  if (!title?.trim()) return 'Title is required.';
  if (title.length < 3) return 'Title must be at least 3 characters long.';
  if (title.length > 200) return 'Title must be less than 200 characters.';
  return null;
};

export const validateContent = (content: string): string | null => {
  if (!content?.trim()) return 'Content is required.';
  if (content.length < 10) return 'Content must be at least 10 characters long.';
  return null;
};

export const validateAbstractContent = (abstractContent: string): string | null => {
  if (abstractContent && abstractContent.length > 1000) {
    return 'Abstract content must be less than 1,000 characters.';
  }
  return null;
};

export const validateAchievementTitle = (title: string, isAchievement: boolean): string | null => {
  if (!isAchievement) return null;
  if (!title?.trim()) return 'Achievement title is required for achievement entries.';
  if (title.length > 100) return 'Achievement title must be less than 100 characters.';
  return null;
};

export const validateAchievementDescription = (description: string, isAchievement: boolean): string | null => {
  if (!isAchievement) return null;
  if (!description?.trim()) return 'Achievement description is required for achievement entries.';
  if (description.length > 500) return 'Achievement description must be less than 500 characters.';
  return null;
};

// Comprehensive form validation
export const validateForm = (formData: FormData): ValidationErrors => {
  const errors: ValidationErrors = {};

  // Focus area validation
  if (!formData.focusAreaId) {
    errors.focusAreaId = 'Please select a focus area.';
  }

  // Categories validation
  if (!formData.selectedCategoryIds || formData.selectedCategoryIds.length === 0) {
    errors.selectedCategoryIds = 'Please select at least one category.';
  }

  // Work types validation
  if (!formData.selectedWorkTypeIds || formData.selectedWorkTypeIds.length === 0) {
    errors.selectedWorkTypeIds = 'Please select at least one work type.';
  }

  // Entry type validation
  if (!formData.entryType) {
    errors.entryType = 'Please select an entry type.';
  }

  // Content validation
  const titleError = validateTitle(formData.title);
  if (titleError) errors.title = titleError;

  const contentError = validateContent(formData.content);
  if (contentError) errors.content = contentError;

  const abstractError = validateAbstractContent(formData.abstractContent);
  if (abstractError) errors.abstractContent = abstractError;

  // Achievement validation
  if (formData.entryType === 'achievement') {
    if (!formData.achievementType) {
      errors.achievementType = 'Please select an achievement type.';
    }

    const achievementTitleError = validateAchievementTitle(formData.achievementTitle, true);
    if (achievementTitleError) errors.achievementTitle = achievementTitleError;

    const achievementDescError = validateAchievementDescription(formData.achievementDescription, true);
    if (achievementDescError) errors.achievementDescription = achievementDescError;
  }

  // Skills validation
  if (!formData.selectedSkillIds || formData.selectedSkillIds.length === 0) {
    errors.selectedSkillIds = 'Please select at least one skill.';
  }

  return errors;
};