import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, User, Plug } from 'lucide-react';
import { cn } from '../../lib/utils';
import { productionOnboardingService } from '../../services/onboarding-production.service';
import { useProfile } from '../../hooks/useProfile';
import { disableDemoMode } from '../../services/demo-mode.service';

import { ProfessionalBasicsStepClean } from './steps/professional-basics-clean';
import { ConnectToolsStep } from './steps/connect-tools';

const ONBOARDING_STEPS = [
  {
    id: 'basics',
    title: 'About You',
    description: 'Name and role',
    icon: User,
    component: ProfessionalBasicsStepClean,
  },
  {
    id: 'tools',
    title: 'Connect Tools',
    description: 'Link your work tools',
    icon: Plug,
    component: ConnectToolsStep,
  },
];

export function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [onboardingData, setOnboardingData] = useState({});
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const navigate = useNavigate();
  const { updateProfile, refetch } = useProfile();

  useEffect(() => {
    const loadOnboardingData = async () => {
      try {
        const existingData = await productionOnboardingService.getOnboardingData();
        if (existingData) {
          setOnboardingData(existingData);
        }

        const targetStep = await productionOnboardingService.getCurrentStep();
        const safeStep = Math.min(targetStep, ONBOARDING_STEPS.length - 1);
        setCurrentStep(safeStep);

        const completed = new Set<number>();
        for (let i = 0; i < safeStep; i++) {
          completed.add(i);
        }
        setCompletedSteps(completed);
      } catch (error) {
        console.error('Failed to load onboarding data:', error);
      } finally {
        setIsDataLoaded(true);
      }
    };

    loadOnboardingData();
  }, []);

  const updateOnboardingData = async (stepData: any) => {
    const updatedData = { ...onboardingData, ...stepData };
    setOnboardingData(updatedData);

    try {
      await productionOnboardingService.saveOnboardingData(updatedData);
      if (stepData.profileImageUrl) {
        await refetch();
      }
    } catch (error) {
      console.error('Failed to save onboarding data:', error);
      throw error;
    }
  };

  const markStepComplete = (stepIndex: number) => {
    setCompletedSteps(prev => new Set(prev).add(stepIndex));
  };

  const goToNextStep = async () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      markStepComplete(currentStep);
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);

      try {
        await productionOnboardingService.saveCurrentStep(nextStep);
      } catch (error) {
        console.error('Failed to save current step:', error);
      }
    } else {
      markStepComplete(currentStep);
      completeOnboarding();
    }
  };

  const goToPreviousStep = async () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);

      try {
        await productionOnboardingService.saveCurrentStep(prevStep);
      } catch (error) {
        console.error('Failed to save current step:', error);
      }
    }
  };

  const completeOnboarding = async () => {
    try {
      const latestData = await productionOnboardingService.getOnboardingData();
      const finalData = latestData || onboardingData;

      await productionOnboardingService.saveOnboardingData(finalData as any);
      await productionOnboardingService.markOnboardingComplete();
      await updateProfile(finalData);
      await refetch();

      // User completed onboarding with real tool connections — switch to live mode.
      // Existing demo accounts that never re-onboard are unaffected.
      disableDemoMode();

      // Navigate to Timeline — the core product experience
      navigate('/timeline');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      navigate('/timeline');
    }
  };

  const safeCurrentStep = Math.min(Math.max(currentStep, 0), ONBOARDING_STEPS.length - 1);
  const currentStepData = ONBOARDING_STEPS[safeCurrentStep];
  const CurrentStepComponent = currentStepData.component;
  const progressPercentage = ((safeCurrentStep + 1) / ONBOARDING_STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                Get started with InChronicle
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Two quick steps and you're in
              </p>
            </div>

            {/* Progress Bar */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900">
                  Step {safeCurrentStep + 1} of {ONBOARDING_STEPS.length}
                </span>
                <span className="text-sm text-gray-500">
                  {Math.round(progressPercentage)}% Complete
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-primary-500 to-primary-600 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Step Navigation */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-center space-x-4">
          {ONBOARDING_STEPS.map((step, index) => {
            const isCompleted = completedSteps.has(index);
            const isCurrent = index === safeCurrentStep;
            const isAccessible = index <= safeCurrentStep || isCompleted;

            return (
              <button
                key={step.id}
                onClick={() => isAccessible && setCurrentStep(index)}
                disabled={!isAccessible}
                className={cn(
                  'flex items-center space-x-3 px-4 py-3 rounded-lg border-2 transition-all duration-200 min-w-max',
                  isCurrent && 'border-primary-500 bg-primary-50 shadow-md',
                  isCompleted && !isCurrent && 'border-green-500 bg-green-50',
                  !isCurrent && !isCompleted && isAccessible && 'border-gray-300 bg-white hover:border-gray-400',
                  !isAccessible && 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                )}
              >
                <div className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-full',
                  isCurrent && 'bg-primary-500 text-white',
                  isCompleted && !isCurrent && 'bg-green-500 text-white',
                  !isCurrent && !isCompleted && 'bg-gray-200 text-gray-600'
                )}>
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <step.icon className="w-4 h-4" />
                  )}
                </div>
                <div className="text-left">
                  <p className={cn(
                    'font-medium text-sm',
                    isCurrent && 'text-primary-700',
                    isCompleted && !isCurrent && 'text-green-700',
                    !isCurrent && !isCompleted && 'text-gray-700'
                  )}>
                    {step.title}
                  </p>
                  <p className="text-xs text-gray-500 hidden sm:block">
                    {step.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {isDataLoaded ? (
            <CurrentStepComponent
              data={onboardingData}
              onUpdate={updateOnboardingData}
              onNext={goToNextStep}
              onPrevious={goToPreviousStep}
              isFirstStep={safeCurrentStep === 0}
              isLastStep={safeCurrentStep === ONBOARDING_STEPS.length - 1}
            />
          ) : (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                <p className="mt-4 text-sm text-gray-600">Loading...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
