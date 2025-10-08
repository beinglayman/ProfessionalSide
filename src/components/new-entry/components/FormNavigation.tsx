import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../../ui/button';
import { FormNavigationProps } from '../types/newEntryTypes';

export const FormNavigation: React.FC<FormNavigationProps> = ({
  currentStep,
  totalSteps,
  onNext,
  onPrevious,
  onSubmit,
  isSubmitting,
  canProceed,
  isLastStep
}) => {
  const canGoBack = currentStep > 1;

  return (
    <div className="flex items-center justify-between pt-6 border-t border-gray-200">
      {/* Back Button */}
      <div>
        {canGoBack ? (
          <Button
            type="button"
            variant="outline"
            onClick={onPrevious}
            disabled={isSubmitting}
            className="flex items-center space-x-1"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Back</span>
          </Button>
        ) : (
          <div /> // Empty div to maintain layout
        )}
      </div>

      {/* Step Indicator */}
      <div className="flex items-center space-x-2">
        {Array.from({ length: totalSteps }, (_, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isCompleted = stepNumber < currentStep;

          return (
            <div
              key={stepNumber}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-500 text-white'
                  : isCompleted
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {stepNumber}
            </div>
          );
        })}
      </div>

      {/* Next/Submit Button */}
      <div>
        {isLastStep ? (
          <Button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting || !canProceed}
            className="flex items-center space-x-1 bg-primary-500 hover:bg-primary-600 text-white"
          >
            <span>{isSubmitting ? 'Creating Entry...' : 'Create Entry'}</span>
          </Button>
        ) : (
          <Button
            type="button"
            onClick={onNext}
            disabled={!canProceed}
            className="flex items-center space-x-1"
          >
            <span>Next</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};