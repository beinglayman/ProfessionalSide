export interface OnboardingStep {
  id: string;
  title: string;
  primaryMessage: string;
  secondaryMessage: string;
  progressMessage: string;
  illustration: React.ComponentType<any>;
  targetElements?: string[];
  callToAction?: string;
}

export interface OnboardingOverlayState {
  isVisible: boolean;
  currentStep: number;
  totalSteps: number;
  isCompleted: boolean;
}

export interface OnboardingOverlayContextType {
  state: OnboardingOverlayState;
  showOverlay: () => void;
  hideOverlay: () => void;
  nextStep: () => void;
  previousStep: () => void;
  skipOnboarding: () => void;
  completeOnboarding: () => void;
  goToStep: (step: number) => void;
}

export interface OnboardingOverlayProps {
  steps: OnboardingStep[];
  onComplete?: () => void;
  onSkip?: () => void;
}

export interface OnboardingStepProps {
  step: OnboardingStep;
  stepNumber: number;
  totalSteps: number;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}