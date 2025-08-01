import React, { useState, useEffect } from 'react';
import { Button } from '../../../components/ui/button';
import { Briefcase, Plus, X, Upload, Calendar, Building2, MapPin } from 'lucide-react';

interface WorkExperienceProps {
  data: any;
  onUpdate: (data: any) => Promise<void>;
  onNext: () => Promise<void>;
  onPrevious: () => Promise<void>;
  isFirstStep: boolean;
  isLastStep: boolean;
}

interface WorkExperience {
  id: string;
  title: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  isCurrentRole: boolean;
  description: string;
  achievements: string[];
  skills: string[];
}

const EMPLOYMENT_TYPES = [
  'Full-time',
  'Part-time',
  'Contract',
  'Freelance',
  'Internship',
  'Volunteer'
];

export function WorkExperienceStep({ 
  data, 
  onUpdate, 
  onNext, 
  onPrevious, 
  isFirstStep, 
  isLastStep 
}: WorkExperienceProps) {
  const [formData, setFormData] = useState({
    workExperiences: data.workExperiences || [],
    ...data
  });

  const [editingExperience, setEditingExperience] = useState<WorkExperience | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isInitialized, setIsInitialized] = useState(false);

  // Update form data when data prop changes (for pre-population)
  useEffect(() => {
    const newFormData = {
      workExperiences: Array.isArray(data.workExperiences) ? data.workExperiences : [],
      ...data
    };
    
    setFormData(newFormData);
    setIsInitialized(true);
  }, [data]);

  const emptyExperience: WorkExperience = {
    id: '',
    title: '',
    company: '',
    location: '',
    startDate: '',
    endDate: '',
    isCurrentRole: false,
    description: '',
    achievements: [],
    skills: []
  };

  // No auto-save - data is only saved when Continue button is clicked

  const addExperience = () => {
    setEditingExperience({ ...emptyExperience, id: Date.now().toString() });
    setShowForm(true);
    setErrors({});
  };

  const editExperience = (experience: WorkExperience) => {
    setEditingExperience(experience);
    setShowForm(true);
    setErrors({});
  };

  const removeExperience = (experienceId: string) => {
    setFormData(prev => ({
      ...prev,
      workExperiences: (prev.workExperiences || []).filter((exp: WorkExperience) => exp.id !== experienceId)
    }));
  };

  const saveExperience = () => {
    if (!editingExperience || !validateExperience()) return;

    setFormData(prev => ({
      ...prev,
      workExperiences: (prev.workExperiences || []).find((exp: WorkExperience) => exp.id === editingExperience.id)
        ? (prev.workExperiences || []).map((exp: WorkExperience) => 
            exp.id === editingExperience.id ? editingExperience : exp
          )
        : [...(prev.workExperiences || []), editingExperience]
    }));

    setShowForm(false);
    setEditingExperience(null);
    setErrors({});
  };

  const cancelEdit = () => {
    setShowForm(false);
    setEditingExperience(null);
    setErrors({});
  };

  const updateExperienceField = (field: keyof WorkExperience, value: any) => {
    if (!editingExperience) return;
    
    setEditingExperience(prev => prev ? { ...prev, [field]: value } : null);
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const addAchievement = () => {
    if (!editingExperience) return;
    updateExperienceField('achievements', [...editingExperience.achievements, '']);
  };

  const updateAchievement = (index: number, value: string) => {
    if (!editingExperience) return;
    const newAchievements = [...editingExperience.achievements];
    newAchievements[index] = value;
    updateExperienceField('achievements', newAchievements);
  };

  const removeAchievement = (index: number) => {
    if (!editingExperience) return;
    const newAchievements = editingExperience.achievements.filter((_, i) => i !== index);
    updateExperienceField('achievements', newAchievements);
  };

  const validateExperience = () => {
    if (!editingExperience) return false;
    
    const newErrors: Record<string, string> = {};

    if (!editingExperience.title.trim()) {
      newErrors.title = 'Job title is required';
    }

    if (!editingExperience.company.trim()) {
      newErrors.company = 'Company name is required';
    }

    if (!editingExperience.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (!editingExperience.isCurrentRole && !editingExperience.endDate) {
      newErrors.endDate = 'End date is required (or mark as current role)';
    }

    if (editingExperience.startDate && editingExperience.endDate && 
        new Date(editingExperience.startDate) > new Date(editingExperience.endDate)) {
      newErrors.endDate = 'End date must be after start date';
    }

    if (!editingExperience.description.trim()) {
      newErrors.description = 'Job description is required';
    } else if (editingExperience.description.trim().length < 50) {
      newErrors.description = 'Please provide a more detailed description (at least 50 characters)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.workExperiences || formData.workExperiences.length === 0) {
      newErrors.workExperiences = 'Please add at least one work experience';
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
        // Handle navigation error
      }
    }
  };

  const handleCVImport = () => {
    // TODO: Implement CV import functionality
    alert('CV import feature coming soon! For now, please add your work experience manually.');
  };

  const formatDateRange = (startDate: string, endDate: string, isCurrentRole: boolean) => {
    const start = new Date(startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const end = isCurrentRole ? 'Present' : new Date(endDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    return `${start} - ${end}`;
  };

  return (
    <div className="space-y-8">
      {/* Header with CV Import */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            <div className="flex items-center space-x-2">
              <Briefcase className="w-5 h-5 text-gray-500" />
              <span>Work Experience</span>
            </div>
          </h3>
          <p className="text-gray-600 mt-1">Add your professional work history</p>
        </div>
        
        <Button
          variant="outline"
          onClick={handleCVImport}
          className="flex items-center space-x-2"
        >
          <Upload className="w-4 h-4" />
          <span>Import from CV</span>
        </Button>
      </div>

      {/* Experience List */}
      <div className="space-y-4">
        {(formData.workExperiences || []).map((experience: WorkExperience) => (
          <div key={experience.id} className="border border-gray-200 rounded-lg p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-gray-900">{experience.title}</h4>
                    <p className="text-primary-600 font-medium">{experience.company}</p>
                    <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDateRange(experience.startDate, experience.endDate, experience.isCurrentRole)}</span>
                      </div>
                      {experience.location && (
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-4 h-4" />
                          <span>{experience.location}</span>
                        </div>
                      )}
                    </div>
                    <p className="mt-3 text-gray-700 leading-relaxed">
                      {experience.description}
                    </p>
                    {experience.achievements.length > 0 && (
                      <div className="mt-3">
                        <h5 className="text-sm font-medium text-gray-900 mb-2">Key Achievements</h5>
                        <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                          {experience.achievements.filter(achievement => achievement.trim()).map((achievement, index) => (
                            <li key={index}>{achievement}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2 ml-4">
                <Button variant="outline" size="sm" onClick={() => editExperience(experience)}>
                  Edit
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => removeExperience(experience.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}

        {(!formData.workExperiences || formData.workExperiences.length === 0) && !showForm && (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No work experience added yet</h3>
            <p className="text-gray-600 mb-4">Start building your professional profile by adding your work history.</p>
          </div>
        )}

        {errors.workExperiences && (
          <p className="text-sm text-red-600">{errors.workExperiences}</p>
        )}
      </div>

      {/* Add Experience Button */}
      {!showForm && (
        <Button onClick={addExperience} className="w-full flex items-center justify-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Add Work Experience</span>
        </Button>
      )}

      {/* Experience Form */}
      {showForm && editingExperience && (
        <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
          <h4 className="text-lg font-semibold text-gray-900 mb-6">
            {editingExperience.id && (formData.workExperiences || []).find((exp: WorkExperience) => exp.id === editingExperience.id) 
              ? 'Edit Work Experience' 
              : 'Add Work Experience'
            }
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Job Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Job Title *
              </label>
              <input
                type="text"
                value={editingExperience.title}
                onChange={(e) => updateExperienceField('title', e.target.value)}
                placeholder="e.g., Senior Software Engineer"
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                  errors.title ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
            </div>

            {/* Company */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company *
              </label>
              <input
                type="text"
                value={editingExperience.company}
                onChange={(e) => updateExperienceField('company', e.target.value)}
                placeholder="e.g., TechCorp Inc."
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                  errors.company ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.company && <p className="mt-1 text-sm text-red-600">{errors.company}</p>}
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <input
                type="text"
                value={editingExperience.location}
                onChange={(e) => updateExperienceField('location', e.target.value)}
                placeholder="e.g., San Francisco, CA or Remote"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              />
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={editingExperience.startDate ? editingExperience.startDate.split('-')[1] : ''}
                  onChange={(e) => {
                    const year = editingExperience.startDate ? editingExperience.startDate.split('-')[0] : new Date().getFullYear().toString();
                    const month = e.target.value;
                    if (month) {
                      updateExperienceField('startDate', `${year}-${month}`);
                    }
                  }}
                  className={`px-3 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                    errors.startDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Month</option>
                  <option value="01">January</option>
                  <option value="02">February</option>
                  <option value="03">March</option>
                  <option value="04">April</option>
                  <option value="05">May</option>
                  <option value="06">June</option>
                  <option value="07">July</option>
                  <option value="08">August</option>
                  <option value="09">September</option>
                  <option value="10">October</option>
                  <option value="11">November</option>
                  <option value="12">December</option>
                </select>
                <select
                  value={editingExperience.startDate ? editingExperience.startDate.split('-')[0] : ''}
                  onChange={(e) => {
                    const month = editingExperience.startDate ? editingExperience.startDate.split('-')[1] : '01';
                    const year = e.target.value;
                    if (year) {
                      updateExperienceField('startDate', `${year}-${month}`);
                    }
                  }}
                  className={`px-3 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                    errors.startDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Year</option>
                  {Array.from({ length: 50 }, (_, i) => {
                    const year = new Date().getFullYear() - i;
                    return (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    );
                  })}
                </select>
              </div>
              {errors.startDate && <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>}
              <p className="mt-1 text-xs text-gray-500">Select the month and year you started this role</p>
            </div>

            {/* Current Role Checkbox */}
            <div className="md:col-span-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={editingExperience.isCurrentRole}
                  onChange={(e) => {
                    updateExperienceField('isCurrentRole', e.target.checked);
                    if (e.target.checked) {
                      updateExperienceField('endDate', '');
                    }
                  }}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700">This is my current role</span>
              </label>
            </div>

            {/* Quick Duration Helper */}
            {editingExperience.startDate && !editingExperience.isCurrentRole && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quick Duration (Optional)
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: '6 months', months: 6 },
                    { label: '1 year', months: 12 },
                    { label: '2 years', months: 24 },
                    { label: '3 years', months: 36 },
                    { label: '5 years', months: 60 }
                  ].map((duration) => (
                    <button
                      key={duration.label}
                      type="button"
                      onClick={() => {
                        const startDate = new Date(editingExperience.startDate);
                        const endDate = new Date(startDate);
                        endDate.setMonth(endDate.getMonth() + duration.months);
                        updateExperienceField('endDate', endDate.toISOString().substring(0, 7));
                      }}
                      className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
                    >
                      {duration.label}
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-xs text-gray-500">Click to automatically set end date based on common durations</p>
              </div>
            )}

            {/* End Date */}
            {!editingExperience.isCurrentRole && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={editingExperience.endDate ? editingExperience.endDate.split('-')[1] : ''}
                    onChange={(e) => {
                      const year = editingExperience.endDate ? editingExperience.endDate.split('-')[0] : new Date().getFullYear().toString();
                      const month = e.target.value;
                      if (month) {
                        updateExperienceField('endDate', `${year}-${month}`);
                      }
                    }}
                    className={`px-3 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                      errors.endDate ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Month</option>
                    <option value="01">January</option>
                    <option value="02">February</option>
                    <option value="03">March</option>
                    <option value="04">April</option>
                    <option value="05">May</option>
                    <option value="06">June</option>
                    <option value="07">July</option>
                    <option value="08">August</option>
                    <option value="09">September</option>
                    <option value="10">October</option>
                    <option value="11">November</option>
                    <option value="12">December</option>
                  </select>
                  <select
                    value={editingExperience.endDate ? editingExperience.endDate.split('-')[0] : ''}
                    onChange={(e) => {
                      const month = editingExperience.endDate ? editingExperience.endDate.split('-')[1] : '01';
                      const year = e.target.value;
                      if (year) {
                        updateExperienceField('endDate', `${year}-${month}`);
                      }
                    }}
                    className={`px-3 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                      errors.endDate ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Year</option>
                    {Array.from({ length: 50 }, (_, i) => {
                      const year = new Date().getFullYear() - i;
                      return (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      );
                    })}
                  </select>
                </div>
                {errors.endDate && <p className="mt-1 text-sm text-red-600">{errors.endDate}</p>}
                <p className="mt-1 text-xs text-gray-500">Select the month and year you ended this role</p>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Job Description *
            </label>
            <textarea
              value={editingExperience.description}
              onChange={(e) => updateExperienceField('description', e.target.value)}
              placeholder="Describe your role, responsibilities, and key contributions..."
              rows={4}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors resize-none ${
                errors.description ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
            <p className="mt-1 text-sm text-gray-500">
              Include your main responsibilities and the impact you made in this role.
            </p>
          </div>

          {/* Achievements */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Key Achievements (Optional)
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addAchievement}
                className="flex items-center space-x-1"
              >
                <Plus className="w-3 h-3" />
                <span>Add Achievement</span>
              </Button>
            </div>
            
            {editingExperience.achievements.map((achievement, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={achievement}
                  onChange={(e) => updateAchievement(index, e.target.value)}
                  placeholder="e.g., Increased team productivity by 40% through process improvements"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeAchievement(index)}
                  className="text-red-600"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
            <Button variant="outline" onClick={cancelEdit}>
              Cancel
            </Button>
            <Button onClick={saveExperience}>
              Save Experience
            </Button>
          </div>
        </div>
      )}

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
          Step 4 of 7 • Work Experience
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