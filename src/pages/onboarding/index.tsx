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
  const { profile, updateProfile } = useProfile();
  
  // Check if we're in edit mode (coming from /profile/edit)
  const isEditMode = location.pathname === '/profile/edit';

  // Load existing onboarding data when component mounts
  useEffect(() => {
    const loadOnboardingData = async () => {
      console.log('🚀 Loading onboarding data and current step from API...');
      
      try {
        // Load onboarding data from API
        const existingData = await productionOnboardingService.getOnboardingData();
        console.log('📊 Existing onboarding data:', existingData);
        console.log('📊 Onboarding data careerGoals:', existingData?.careerGoals);
        console.log('📊 Onboarding data professionalInterests:', existingData?.professionalInterests);
        console.log('📊 Onboarding data keys:', Object.keys(existingData || {}));
        
        if (existingData) {
          setOnboardingData(existingData);
          console.log('📊 Set onboarding data with careerGoals:', existingData.careerGoals);
          console.log('📊 Set onboarding data with professionalInterests:', existingData.professionalInterests);
        }
        
        // Get current step from API or override for edit mode
        let targetStep: number;
        
        if (isEditMode) {
          console.log('🔧 Edit mode detected - checking if onboarding is complete');
          
          // Check if onboarding is complete
          const progress = await productionOnboardingService.getOnboardingProgress();
          
          if (progress?.isCompleted) {
            console.log('📍 Onboarding complete - directing to last step for editing');
            targetStep = 6; // Last step (Goals & Interests)
          } else {
            // If not complete, calculate the appropriate step
            targetStep = await productionOnboardingService.getCurrentStep();
          }
        } else {
          targetStep = await productionOnboardingService.getCurrentStep();
        }
        
        console.log('📍 Current step determined:', targetStep);
        setCurrentStep(targetStep);
        
        // Mark previous steps as completed
        const completed = new Set<number>();
        for (let i = 0; i < targetStep; i++) {
          completed.add(i);
        }
        setCompletedSteps(completed);
        console.log('✅ Onboarding initialization complete - Step:', targetStep);
      } catch (error) {
        console.error('❌ Failed to load onboarding data:', error);
      } finally {
        setIsDataLoaded(true);
      }
    };
    
    loadOnboardingData();
  }, []);

  const updateOnboardingData = async (stepData: any) => {
    console.log('🔄 Onboarding: Updating data with step data:', stepData);
    console.log('🔄 Onboarding: Current data before merge:', onboardingData);
    
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
      console.log('🔄 Onboarding: Updated careerGoals in state:', updatedData.careerGoals);
    }
    if (stepData.professionalInterests) {
      updatedData.professionalInterests = stepData.professionalInterests;
      console.log('🔄 Onboarding: Updated professionalInterests in state:', updatedData.professionalInterests);
    }
    
    console.log('🔄 Onboarding: Complete updated data after merge:', updatedData);
    console.log('🔄 Onboarding: Final careerGoals in merged data:', updatedData.careerGoals);
    console.log('🔄 Onboarding: Final professionalInterests in merged data:', updatedData.professionalInterests);
    
    setOnboardingData(updatedData);
    
    // Save to database via onboarding API
    try {
      console.log('💾 Onboarding: Saving to database via API...');
      console.log('💾 Onboarding: Final data being saved:', {
        step: currentStep,
        dataKeys: Object.keys(updatedData),
        professionalSummary: updatedData.professionalSummary ? 'EXISTS' : 'MISSING',
        specializations: updatedData.specializations?.length || 0,
        skills: updatedData.skills?.length || 0,
        workExperiences: updatedData.workExperiences?.length || 0,
        education: updatedData.education?.length || 0
      });
      await productionOnboardingService.saveOnboardingData(updatedData);
      console.log('✅ Onboarding: Data saved successfully to database');
    } catch (error) {
      console.error('❌ Onboarding: Failed to save onboarding data to database:', error);
      throw error;
    }
  };

  const markStepComplete = (stepIndex: number) => {
    setCompletedSteps(prev => new Set(prev).add(stepIndex));
  };

  const goToNextStep = async () => {
    console.log('🎯 goToNextStep called - Current step:', currentStep);
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      markStepComplete(currentStep);
      const nextStep = currentStep + 1;
      console.log('📈 Moving to next step:', nextStep);
      setCurrentStep(nextStep);
      
      // Save current step to database
      try {
        console.log('💾 Saving current step to database:', nextStep);
        await productionOnboardingService.saveCurrentStep(nextStep);
        console.log('✅ Current step saved successfully:', nextStep);
      } catch (error) {
        console.error('❌ Failed to save current step to database:', error);
      }
    } else {
      // Last step completed, mark it complete and finish onboarding
      console.log('🎉 Last step reached - completing onboarding');
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
      console.log('🎉 Starting onboarding completion...');
      console.log('🔍 Final onboardingData state before completion:', onboardingData);
      console.log('🔍 Final careerGoals before completion:', onboardingData.careerGoals);
      console.log('🔍 Final professionalInterests before completion:', onboardingData.professionalInterests);
      
      // Fetch the latest data from API to ensure we have the most recent state
      console.log('📡 Fetching latest onboarding data from API before completion...');
      const latestData = await productionOnboardingService.getOnboardingData();
      console.log('📊 Latest data from API:', latestData);
      console.log('📊 Latest careerGoals from API:', latestData?.careerGoals);
      console.log('📊 Latest professionalInterests from API:', latestData?.professionalInterests);
      
      // Use the latest data from API for final save (this ensures we don't overwrite with stale state)
      const finalData = latestData || onboardingData;
      console.log('💾 Using final data for completion:', finalData);
      
      // Final save via onboarding API (with latest data)
      await productionOnboardingService.saveOnboardingData(finalData as any);
      
      // Mark onboarding as complete
      await productionOnboardingService.markOnboardingComplete();
      
      console.log('✅ Onboarding completion successful');
      
      // Navigate to profile page to see the results
      navigate('/profile');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      // Still navigate but show error
      navigate('/profile');
    }
  };

  const skipOnboarding = () => {
    // Allow user to skip and complete later
    navigate('/dashboard');
  };

  // Ensure currentStep is within bounds
  const safeCurrentStep = Math.min(Math.max(currentStep, 0), ONBOARDING_STEPS.length - 1);
  const currentStepData = ONBOARDING_STEPS[safeCurrentStep];
  
  // Log if step was out of bounds
  if (currentStep !== safeCurrentStep) {
    console.warn(`⚠️ Current step ${currentStep} was out of bounds, clamped to ${safeCurrentStep}`);
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
                <Button variant="ghost" onClick={() => {
                  console.log('=== DEBUG DATA ===');
                  console.log('Current onboardingData state:', onboardingData);
                  console.log('Is data loaded:', isDataLoaded);
                  console.log('Current step:', currentStep);
                }} className="text-gray-500">
                  Debug Data
                </Button>
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