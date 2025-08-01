import React, { useState, useEffect } from 'react';
import { Button } from '../../../components/ui/button';
import { FileText, Lightbulb, User } from 'lucide-react';

interface BioSummaryProps {
  data: any;
  onUpdate: (data: any) => Promise<void>;
  onNext: () => Promise<void>;
  onPrevious: () => Promise<void>;
  isFirstStep: boolean;
  isLastStep: boolean;
}

// Specialization options
const SPECIALIZATIONS = [
  'Frontend Development',
  'Backend Development',
  'Full Stack Development',
  'DevOps & Infrastructure',
  'Data Science & Analytics',
  'Machine Learning & AI',
  'Mobile Development',
  'Cloud Architecture',
  'Cybersecurity',
  'Product Management',
  'UX/UI Design',
  'Quality Assurance',
  'Technical Writing',
  'System Architecture',
  'Database Management',
  'Blockchain Development',
  'Game Development',
  'Embedded Systems',
  'Research & Development',
  'Technical Leadership'
];

export function BioSummaryStep({ 
  data, 
  onUpdate, 
  onNext, 
  onPrevious, 
  isFirstStep, 
  isLastStep 
}: BioSummaryProps) {
  const [formData, setFormData] = useState({
    ...data,
    // Ensure these fields are never null/undefined - override any values from data
    professionalSummary: data.professionalSummary || '',
    specializations: Array.isArray(data.specializations) ? data.specializations : [],
    careerHighlights: data.careerHighlights || ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update form data when new data is received (for prepopulation)
  useEffect(() => {
    const newFormData = {
      ...data,
      // Ensure these fields are never null/undefined (override any null values from data)
      professionalSummary: data.professionalSummary || '',
      specializations: Array.isArray(data.specializations) ? data.specializations : [],
      careerHighlights: data.careerHighlights || ''
    };
    
    setFormData(newFormData);
  }, [data]);

  // No auto-save - data is only saved when Continue button is clicked

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSpecializationToggle = (specialization: string) => {
    setFormData(prev => {
      const newSpecializations = (prev.specializations || []).includes(specialization)
        ? (prev.specializations || []).filter((s: string) => s !== specialization)
        : [...(prev.specializations || []), specialization];
      
      return {
        ...prev,
        specializations: newSpecializations
      };
    });
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!(formData.professionalSummary || '').trim()) {
      newErrors.professionalSummary = 'Professional summary is required';
    } else if ((formData.professionalSummary || '').trim().length < 50) {
      newErrors.professionalSummary = 'Professional summary should be at least 50 characters';
    } else if ((formData.professionalSummary || '').trim().length > 1000) {
      newErrors.professionalSummary = 'Professional summary should be less than 1000 characters';
    }

    if (!formData.specializations || formData.specializations.length === 0) {
      newErrors.specializations = 'Please select at least one specialization';
    } else if (formData.specializations && formData.specializations.length > 5) {
      newErrors.specializations = 'Please select no more than 5 specializations';
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


  const wordCount = (formData.professionalSummary || '').trim().split(/\s+/).filter(word => word.length > 0).length;

  return (
    <div className="space-y-8">
      {/* Professional Summary */}
      <div>
        <label htmlFor="professionalSummary" className="block text-sm font-medium text-gray-700 mb-2">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-gray-500" />
            <span>Professional Summary *</span>
          </div>
        </label>
        <textarea
          id="professionalSummary"
          name="professionalSummary"
          value={formData.professionalSummary}
          onChange={handleInputChange}
          placeholder="Write a brief summary of your professional background, expertise, and what drives your work. This will be the first thing people see on your profile..."
          rows={6}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors resize-none ${
            errors.professionalSummary ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        <div className="mt-2 flex justify-between items-center">
          <div>
            {errors.professionalSummary && (
              <p className="text-sm text-red-600">{errors.professionalSummary}</p>
            )}
          </div>
          <p className="text-sm text-gray-500">
            {wordCount} words • {(formData.professionalSummary || '').length}/1000 characters
          </p>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Tip: Include your key strengths, years of experience, and what makes you unique in your field.
        </p>
      </div>

      {/* Specializations */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          <div className="flex items-center space-x-2">
            <Lightbulb className="w-4 h-4 text-gray-500" />
            <span>Key Specializations * (Select 1-5)</span>
          </div>
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {SPECIALIZATIONS.map(specialization => (
            <button
              key={specialization}
              type="button"
              onClick={() => handleSpecializationToggle(specialization)}
              className={`px-4 py-3 text-sm font-medium rounded-lg border-2 transition-all duration-200 text-left ${
                (formData.specializations || []).includes(specialization)
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              {specialization}
            </button>
          ))}
        </div>
        {errors.specializations && (
          <p className="mt-2 text-sm text-red-600">{errors.specializations}</p>
        )}
        <p className="mt-2 text-sm text-gray-500">
          Selected: {(formData.specializations || []).length}/5 specializations
        </p>
      </div>

      {/* Career Highlights */}
      <div>
        <label htmlFor="careerHighlights" className="block text-sm font-medium text-gray-700 mb-2">
          <div className="flex items-center space-x-2">
            <User className="w-4 h-4 text-gray-500" />
            <span>Career Highlights (Optional)</span>
          </div>
        </label>
        <textarea
          id="careerHighlights"
          name="careerHighlights"
          value={formData.careerHighlights}
          onChange={handleInputChange}
          placeholder="List your top 2-3 career achievements, awards, or notable projects that showcase your impact..."
          rows={4}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors resize-none"
        />
        <p className="mt-1 text-sm text-gray-500">
          Example: "Led a team of 8 developers to deliver a $2M project 6 weeks ahead of schedule"
        </p>
      </div>


      {/* Preview Card */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Bio Preview</h3>
        <div className="bg-white rounded-lg p-6 shadow-sm space-y-4">
          <div>
            <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">Professional Summary</h4>
            <p className="text-gray-900 leading-relaxed">
              {formData.professionalSummary || 'Your professional summary will appear here...'}
            </p>
          </div>
          
          {formData.specializations && formData.specializations.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">Specializations</h4>
              <div className="flex flex-wrap gap-2">
                {(formData.specializations || []).map((spec: string) => (
                  <span key={spec} className="bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-sm font-medium">
                    {spec}
                  </span>
                ))}
              </div>
            </div>
          )}

          {formData.careerHighlights && (
            <div>
              <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">Career Highlights</h4>
              <p className="text-gray-700">
                {formData.careerHighlights}
              </p>
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
          Step 2 of 7 • Professional Bio & Summary
        </div>

        <Button 
          onClick={handleNext}
          className="flex items-center space-x-2"
        >
          <span>Continue</span>
        </Button>
      </div>
    </div>
  );
}