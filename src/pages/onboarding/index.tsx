import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Check, User, FileText, Target, Briefcase, GraduationCap, Award, Settings } from 'lucide-react';
import { cn } from '../../lib/utils';
import { productionOnboardingService } from '../../services/onboarding-production.service';
import { useProfile } from '../../hooks/useProfile';

// Import step components (to be created)
import { ProfessionalBasicsStepClean } from './steps/professional-basics-clean';
import { BioSummaryStep } from './steps/bio-summary';
import { SkillsExpertiseStepClean } from './steps/skills-expertise-clean';
import { WorkExperienceStep } from './steps/work-experience';
import { EducationStep } from './steps/education';
import { CertificationsStep } from './steps/certifications';
import { GoalsInterestsStep } from './steps/goals-interests';

const ONBOARDING_STEPS = [
  {
    id: 'basics',
    title: 'Professional Basics',
    description: 'Your current role and basic information',
    icon: User,
    component: ProfessionalBasicsStepClean,
  },
  {
    id: 'bio',
    title: 'Bio & Summary',
    description: 'Professional summary and specializations',
    icon: FileText,
    component: BioSummaryStep,
  },
  {
    id: 'skills',
    title: 'Skills & Expertise',
    description: 'Your technical and soft skills',
    icon: Target,
    component: SkillsExpertiseStepClean,
  },
  {
    id: 'experience',
    title: 'Work Experience',
    description: 'Your professional background',
    icon: Briefcase,
    component: WorkExperienceStep,
  },
  {
    id: 'education',
    title: 'Education',
    description: 'Your educational background',
    icon: GraduationCap,
    component: EducationStep,
  },
  {
    id: 'certifications',
    title: 'Certifications',
    description: 'Professional certifications and licenses',
    icon: Award,
    component: CertificationsStep,
  },
  {
    id: 'goals',
    title: 'Goals & Interests',
    description: 'Your professional goals and preferences',
    icon: Settings,
    component: GoalsInterestsStep,
  },
];

export function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [onboardingData, setOnboardingData] = useState({});
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, updateProfile, refetch } = useProfile();
  
  // Check if we're in edit mode (coming from /profile/edit)
  const isEditMode = location.pathname === '/profile/edit';

  // Load existing onboarding data when component mounts
  useEffect(() => {
    const loadOnboardingData = async () => {
      
      try {
        // Load onboarding data from API
        const existingData = await productionOnboardingService.getOnboardingData();
        
        if (existingData) {
          setOnboardingData(existingData);
        }
        
        // Get current step from API or override for edit mode
        let targetStep: number;
        
        if (isEditMode) {
          
          // Check if onboarding is complete
          const progress = await productionOnboardingService.getOnboardingProgress();
          
          if (progress?.isCompleted) {
            targetStep = 6; // Last step (Goals & Interests)
          } else {
            // If not complete, calculate the appropriate step
            targetStep = await productionOnboardingService.getCurrentStep();
          }
        } else {
          targetStep = await productionOnboardingService.getCurrentStep();
        }
        
        setCurrentStep(targetStep);
        
        // Mark previous steps as completed
        const completed = new Set<number>();
        for (let i = 0; i < targetStep; i++) {
          completed.add(i);
        }
        setCompletedSteps(completed);
      } catch (error) {
        console.error('❌ Failed to load onboarding data:', error);
      } finally {
        setIsDataLoaded(true);
      }
    };
    
    loadOnboardingData();
  }, []);

  const updateOnboardingData = async (stepData: any) => {
    
    // Deep merge to preserve arrays and objects
    const updatedData = { ...onboardingData, ...stepData };
    
    // Special handling for arrays to ensure they're properly preserved/updated
    if (stepData.workExperiences) {
      updatedData.workExperiences = stepData.workExperiences;
    }
    if (stepData.education) {
      updatedData.education = stepData.education;
    }
    if (stepData.certifications) {
      updatedData.certifications = stepData.certifications;
    }
    if (stepData.skills) {
      updatedData.skills = stepData.skills;
    }
    if (stepData.topSkills) {
      updatedData.topSkills = stepData.topSkills;
    }
    if (stepData.specializations) {
      updatedData.specializations = stepData.specializations;
    }
    if (stepData.careerGoals) {
      updatedData.careerGoals = stepData.careerGoals;
    }
    if (stepData.professionalInterests) {
      updatedData.professionalInterests = stepData.professionalInterests;
    }
    
    
    setOnboardingData(updatedData);
    
    // Save to database via onboarding API
    try {
      await productionOnboardingService.saveOnboardingData(updatedData);
      
      // If profileImageUrl was updated, refresh profile to sync avatar
      if (stepData.profileImageUrl) {
        await refetch();
      }
    } catch (error) {
      console.error('❌ Onboarding: Failed to save onboarding data to database:', error);
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
      
      // Save current step to database
      try {
        await productionOnboardingService.saveCurrentStep(nextStep);
      } catch (error) {
        console.error('❌ Failed to save current step to database:', error);
      }
    } else {
      // Last step completed, mark it complete and finish onboarding
      markStepComplete(currentStep);
      completeOnboarding();
    }
  };

  const goToPreviousStep = async () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      
      // Save current step to database
      try {
        await productionOnboardingService.saveCurrentStep(prevStep);
      } catch (error) {
        console.error('Failed to save current step to database:', error);
      }
    }
  };

  const skipToStep = async (stepIndex: number) => {
    setCurrentStep(stepIndex);
    
    // Save current step to database
    try {
      await productionOnboardingService.saveCurrentStep(stepIndex);
    } catch (error) {
      console.error('Failed to save current step to database:', error);
    }
  };

  const completeOnboarding = async () => {
    try {
      
      // Fetch the latest data from API to ensure we have the most recent state
      const latestData = await productionOnboardingService.getOnboardingData();
      
      // Use the latest data from API for final save (this ensures we don't overwrite with stale state)
      const finalData = latestData || onboardingData;
      
      // Final save via onboarding API (with latest data)
      await productionOnboardingService.saveOnboardingData(finalData as any);
      
      // Mark onboarding as complete
      await productionOnboardingService.markOnboardingComplete();
      
      // Refresh profile data to ensure avatar is updated
      await updateProfile(finalData);
      await refetch();
      
      // Navigate to profile page to see the results
      navigate('/profile');
      
      // Force page reload to ensure all data is fresh (temporary fix for avatar sync)
      setTimeout(() => {
        window.location.reload();
      }, 100);
    } catch (error) {
      console.error('Error completing onboarding:', error);
      // Still navigate but show error
      navigate('/profile');
    }
  };

  const skipOnboarding = () => {
    // Allow user to skip and complete later
    navigate('/profile');
  };

  // Ensure currentStep is within bounds
  const safeCurrentStep = Math.min(Math.max(currentStep, 0), ONBOARDING_STEPS.length - 1);
  const currentStepData = ONBOARDING_STEPS[safeCurrentStep];
  
  // Ensure step is within bounds
  if (currentStep !== safeCurrentStep) {
    // Step was out of bounds, clamped to safe value
  }
  
  const CurrentStepComponent = currentStepData.component;
  const progressPercentage = ((safeCurrentStep + 1) / ONBOARDING_STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Complete Your Profile</h1>
                <p className="mt-2 text-sm text-gray-600">Help us personalize your InChronicle experience</p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={skipOnboarding} className="text-gray-500">
                  Skip for now
                </Button>
              </div>
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center space-x-4 overflow-x-auto pb-4">
          {ONBOARDING_STEPS.map((step, index) => {
            const isCompleted = completedSteps.has(index);
            const isCurrent = index === safeCurrentStep;
            const isAccessible = index <= safeCurrentStep || isCompleted;
            
            return (
              <button
                key={step.id}
                onClick={() => isAccessible && skipToStep(index)}
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary-100">
                <currentStepData.icon className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{currentStepData.title}</h2>
                <p className="text-sm text-gray-600">{currentStepData.description}</p>
              </div>
            </div>
          </div>

          {/* Step Component */}
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
                <p className="mt-4 text-sm text-gray-600">Loading your profile data...</p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}