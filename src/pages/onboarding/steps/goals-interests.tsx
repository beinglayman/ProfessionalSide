import React, { useState, useEffect } from 'react';
import { Button } from '../../../components/ui/button';
import { Target, Code } from 'lucide-react';

interface GoalsInterestsProps {
  data: any;
  onUpdate: (data: any) => Promise<void>;
  onNext: () => Promise<void>;
  onPrevious: () => Promise<void>;
  isFirstStep: boolean;
  isLastStep: boolean;
}

const CAREER_GOALS = [
  'Advance to Senior/Lead Position',
  'Transition to Management',
  'Start My Own Company',
  'Become a Technical Expert',
  'Switch Industries',
  'Work at a Startup',
  'Work at a Large Corporation',
  'Pursue Further Education',
  'Become a Consultant',
  'Achieve Work-Life Balance',
  'Increase Salary Significantly',
  'Work Remotely',
  'Move to a Different Country',
  'Lead Large Teams',
  'Focus on Innovation',
  'Become a Thought Leader'
];

const PROFESSIONAL_INTERESTS = [
  'Artificial Intelligence & Machine Learning',
  'Cloud Computing & DevOps',
  'Cybersecurity',
  'Data Science & Analytics',
  'Mobile Development',
  'Web Development',
  'Product Management',
  'User Experience Design',
  'Digital Marketing',
  'Project Management',
  'Blockchain & Cryptocurrency',
  'Internet of Things (IoT)',
  'Sustainability & Green Tech',
  'Healthcare Technology',
  'Financial Technology (FinTech)',
  'Education Technology (EdTech)',
  'Gaming & Entertainment',
  'Research & Development',
  'Open Source Contributions',
  'Technical Writing & Documentation'
];


export function GoalsInterestsStep({ 
  data, 
  onUpdate, 
  onNext, 
  onPrevious, 
  isFirstStep, 
  isLastStep 
}: GoalsInterestsProps) {
  const [formData, setFormData] = useState({
    careerGoals: [],
    professionalInterests: [],
    ...data
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isInitialized, setIsInitialized] = useState(false);

  // Update form data when data prop changes (for pre-population)
  useEffect(() => {
    // Always update form data when new data arrives, not just once
    if (data && Object.keys(data).length > 0) {
      const newFormData = {
        careerGoals: Array.isArray(data.careerGoals) ? data.careerGoals : [],
        professionalInterests: Array.isArray(data.professionalInterests) ? data.professionalInterests : [],
        ...data
      };
      
      setFormData(newFormData);
      setIsInitialized(true);
    }
  }, [data]);

  // No auto-save - data is only saved when Continue button is clicked

  const handleArrayToggle = (array: string[], value: string, maxItems = 5) => {
    if (array.includes(value)) {
      return array.filter(item => item !== value);
    } else if (array.length < maxItems) {
      return [...array, value];
    }
    return array;
  };

  const handleCareerGoalToggle = (goal: string) => {
    setFormData(prev => ({
      ...prev,
      careerGoals: handleArrayToggle(prev.careerGoals, goal, 3)
    }));
  };

  const handleInterestToggle = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      professionalInterests: handleArrayToggle(prev.professionalInterests, interest, 5)
    }));
  };


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Make validation more lenient for the final step
    if (!formData.careerGoals || formData.careerGoals.length === 0) {
      newErrors.careerGoals = 'Please select at least one career goal';
    }

    if (!formData.professionalInterests || formData.professionalInterests.length === 0) {
      newErrors.professionalInterests = 'Please select at least one professional interest';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (validateForm()) {
      try {
        // Save data only when Continue button is clicked
        await onUpdate(formData);
        await onNext();
      } catch (error) {
        console.error('Failed to proceed to next step:', error);
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* Career Goals */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          <div className="flex items-center space-x-2">
            <Target className="w-4 h-4 text-gray-500" />
            <span>Career Goals * (Select up to 3)</span>
          </div>
        </label>
        <p className="text-sm text-gray-600 mb-4">
          What are your main professional objectives for the next few years?
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {CAREER_GOALS.map(goal => (
            <button
              key={goal}
              type="button"
              onClick={() => handleCareerGoalToggle(goal)}
              className={`px-4 py-3 text-sm font-medium rounded-lg border-2 transition-all duration-200 text-left ${
                (formData.careerGoals || []).includes(goal)
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              {goal}
            </button>
          ))}
        </div>
        {errors.careerGoals && (
          <p className="mt-2 text-sm text-red-600">{errors.careerGoals}</p>
        )}
        <p className="mt-2 text-sm text-gray-500">
          Selected: {(formData.careerGoals || []).length}/3 goals
        </p>
      </div>


      {/* Professional Interests */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          <div className="flex items-center space-x-2">
            <Code className="w-4 h-4 text-gray-500" />
            <span>Professional Interests * (Select up to 5)</span>
          </div>
        </label>
        <p className="text-sm text-gray-600 mb-4">
          What technologies, fields, or areas are you most passionate about?
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {PROFESSIONAL_INTERESTS.map(interest => (
            <button
              key={interest}
              type="button"
              onClick={() => handleInterestToggle(interest)}
              className={`px-4 py-3 text-sm font-medium rounded-lg border-2 transition-all duration-200 text-left ${
                (formData.professionalInterests || []).includes(interest)
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              {interest}
            </button>
          ))}
        </div>
        {errors.professionalInterests && (
          <p className="mt-2 text-sm text-red-600">{errors.professionalInterests}</p>
        )}
        <p className="mt-2 text-sm text-gray-500">
          Selected: {(formData.professionalInterests || []).length}/5 interests
        </p>
      </div>




      {/* Preview Card */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Goals & Interests Preview</h3>
        <div className="bg-white rounded-lg p-6 shadow-sm space-y-4">
          {formData.careerGoals && formData.careerGoals.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">Career Goals</h4>
              <div className="flex flex-wrap gap-2">
                {(formData.careerGoals || []).map((goal: string) => (
                  <span key={goal} className="bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-sm font-medium">
                    {goal}
                  </span>
                ))}
              </div>
            </div>
          )}

          {formData.professionalInterests && formData.professionalInterests.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">Professional Interests</h4>
              <div className="flex flex-wrap gap-2">
                {(formData.professionalInterests || []).map((interest: string) => (
                  <span key={interest} className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-200">
        <Button 
          variant="outline" 
          onClick={onPrevious} 
          disabled={isFirstStep}
          className="flex items-center space-x-2"
        >
          <span>Previous</span>
        </Button>

        <div className="text-center text-xs text-gray-500">
          Step 7 of 7 • Goals & Interests
        </div>

        <Button 
          onClick={handleNext}
          className="flex items-center space-x-2"
        >
          <span>{isLastStep ? 'Complete Setup' : 'Continue'}</span>
        </Button>
      </div>
    </div>
  );
}