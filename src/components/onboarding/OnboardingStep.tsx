import React from 'react';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '../ui/button';
import { OnboardingStepProps } from '../../types/onboarding-overlay';
import { cn } from '../../lib/utils';

export const OnboardingStep: React.FC<OnboardingStepProps> = ({
  step,
  stepNumber,
  totalSteps,
  onNext,
  onPrevious,
  onSkip,
  isFirstStep,
  isLastStep
}) => {
  const IllustrationComponent = step.illustration;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[400px]">
        {/* Content Side */}
        <div className="space-y-6">
          {/* Step indicator */}
          <div className="flex items-center space-x-3">
            <div className={cn(
              "flex items-center justify-center w-10 h-10 rounded-full",
              "bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold"
            )}>
              {stepNumber}
            </div>
            <div className="text-sm text-gray-500">
              {step.progressMessage}
            </div>
          </div>

          {/* Title */}
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 leading-tight">
            {step.title}
          </h2>

          {/* Primary message */}
          <p className="text-xl text-gray-700 leading-relaxed">
            {step.primaryMessage}
          </p>

          {/* Secondary message */}
          <p className="text-gray-600 leading-relaxed">
            {step.secondaryMessage}
          </p>

          {/* Call to action */}
          {step.callToAction && (
            <div className="flex items-center space-x-3 p-4 bg-primary-50 rounded-lg border border-primary-100">
              <CheckCircle2 className="w-5 h-5 text-primary-600 flex-shrink-0" />
              <span className="text-primary-700 font-medium">
                {step.callToAction}
              </span>
            </div>
          )}

          {/* Progress indicator */}
          <div className="pt-4">
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span className="font-medium text-primary-600">
                {Math.round((stepNumber / totalSteps) * 100)}% complete
              </span>
              <span>•</span>
              <span>{totalSteps - stepNumber} steps remaining</span>
            </div>
          </div>

          {/* Action buttons for mobile */}
          <div className="flex lg:hidden items-center justify-between pt-6">
            <Button
              variant="ghost"
              onClick={onSkip}
              className="text-gray-500 hover:text-gray-700"
            >
              Skip for now
            </Button>

            <div className="flex items-center space-x-3">
              {!isFirstStep && (
                <Button
                  variant="outline"
                  onClick={onPrevious}
                  className="px-6"
                >
                  Previous
                </Button>
              )}
              
              <Button
                onClick={onNext}
                className="px-6 bg-primary-500 hover:bg-primary-600 text-white flex items-center space-x-2"
              >
                <span>{isLastStep ? "Complete!" : "Next"}</span>
                {!isLastStep && <ArrowRight className="w-4 h-4" />}
                {isLastStep && <span>🎉</span>}
              </Button>
            </div>
          </div>
        </div>

        {/* Illustration Side */}
        <div className="flex items-center justify-center lg:justify-end">
          <div className="relative">
            {/* Decorative background */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary-50 to-primary-100 rounded-2xl transform rotate-3 scale-105 opacity-50" />
            
            {/* Illustration container */}
            <div className="relative bg-white rounded-2xl shadow-lg p-8 border border-primary-100">
              <IllustrationComponent 
                width={300} 
                height={240}
                className="w-full h-auto max-w-[300px]"
              />
            </div>

            {/* Floating elements */}
            <div className="absolute -top-4 -right-4 w-8 h-8 bg-primary-500 rounded-full opacity-20 animate-pulse" />
            <div className="absolute -bottom-6 -left-6 w-6 h-6 bg-primary-400 rounded-full opacity-15 animate-pulse delay-1000" />
            <div className="absolute top-1/2 -right-8 w-4 h-4 bg-primary-300 rounded-full opacity-25 animate-pulse delay-500" />
          </div>
        </div>
      </div>

      {/* Target elements highlight (if specified) */}
      {step.targetElements && step.targetElements.length > 0 && (
        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0 animate-pulse" />
            <div>
              <p className="text-blue-700 text-sm font-medium">
                Look for these elements:
              </p>
              <div className="mt-1 flex flex-wrap gap-2">
                {step.targetElements.map((element, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-md"
                  >
                    {element}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};