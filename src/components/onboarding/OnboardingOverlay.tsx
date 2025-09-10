import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/button';
import { OnboardingStep } from './OnboardingStep';
import { OnboardingOverlayProps } from '../../types/onboarding-overlay';
import { cn } from '../../lib/utils';

export const OnboardingOverlay: React.FC<OnboardingOverlayProps> = ({
  steps,
  onComplete,
  onSkip
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  // Prevent background scrolling when overlay is visible
  useEffect(() => {
    if (isVisible) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isVisible]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    setIsVisible(false);
    onSkip?.();
  };

  const handleComplete = () => {
    setIsVisible(false);
    onComplete?.();
  };

  const handleClose = () => {
    handleSkip();
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isVisible) return;

      switch (event.key) {
        case 'Escape':
          handleSkip();
          break;
        case 'ArrowRight':
        case 'Enter':
          event.preventDefault();
          handleNext();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          handlePrevious();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, currentStep, steps.length]);

  if (!isVisible || !steps.length) {
    return null;
  }

  const progressPercentage = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-300"
        onClick={handleSkip}
      />
      
      {/* Modal Content */}
      <div className={cn(
        "relative w-full max-w-4xl mx-4 bg-white rounded-2xl shadow-2xl",
        "transform transition-all duration-300 ease-out",
        "max-h-[90vh] overflow-y-auto"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                <span className="text-primary-600 font-semibold text-sm">
                  {currentStep + 1}
                </span>
              </div>
              <span className="text-sm text-gray-500">
                of {steps.length}
              </span>
            </div>
            
            {/* Progress bar */}
            <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close onboarding"
          >
            <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
          </button>
        </div>

        {/* Step Content */}
        <div className="p-8">
          <OnboardingStep
            step={steps[currentStep]}
            stepNumber={currentStep + 1}
            totalSteps={steps.length}
            onNext={handleNext}
            onPrevious={handlePrevious}
            onSkip={handleSkip}
            isFirstStep={currentStep === 0}
            isLastStep={currentStep === steps.length - 1}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-100 bg-gray-50/50">
          <Button
            variant="ghost"
            onClick={handleSkip}
            className="text-gray-500 hover:text-gray-700"
          >
            Skip for now
          </Button>

          <div className="flex items-center space-x-3">
            {currentStep > 0 && (
              <Button
                variant="outline"
                onClick={handlePrevious}
                className="px-6"
              >
                Previous
              </Button>
            )}
            
            <Button
              onClick={handleNext}
              className="px-6 bg-primary-500 hover:bg-primary-600 text-white"
            >
              {currentStep === steps.length - 1 ? "Complete! 🎉" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};