import React, { useState, useEffect } from 'react';
import { Button } from '../../../components/ui/button';
import { GraduationCap, Plus, X, Calendar, MapPin, Building2 } from 'lucide-react';

interface EducationProps {
  data: any;
  onUpdate: (data: any) => Promise<void>;
  onNext: () => Promise<void>;
  onPrevious: () => Promise<void>;
  isFirstStep: boolean;
  isLastStep: boolean;
}

interface Education {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy: string;
  location: string;
  startYear: string;
  endYear: string;
  isCurrentlyStudying: boolean;
  grade: string;
  description: string;
  activities: string[];
}

const DEGREE_TYPES = [
  'High School Diploma',
  'Associate Degree',
  'Bachelor\'s Degree',
  'Master\'s Degree',
  'Doctoral Degree (PhD)',
  'Professional Degree (JD, MD, etc.)',
  'Certificate',
  'Diploma',
  'Other'
];

const GRADE_TYPES = [
  'GPA (4.0 scale)',
  'GPA (10.0 scale)',
  'Percentage',
  'First Class',
  'Second Class Upper',
  'Second Class Lower',
  'Third Class',
  'Pass',
  'Distinction',
  'Merit',
  'Other'
];

// Premium institutions list - these will get special styling
const PREMIUM_INSTITUTIONS = [
  // Ivy League & Top US Universities
  'Harvard University', 'Stanford University', 'MIT', 'Massachusetts Institute of Technology',
  'Yale University', 'Princeton University', 'Columbia University', 'University of Pennsylvania',
  'Cornell University', 'Brown University', 'Dartmouth College', 'University of Chicago',
  'California Institute of Technology', 'Caltech', 'Carnegie Mellon University', 'Duke University',
  'Northwestern University', 'Johns Hopkins University', 'Washington University in St. Louis',
  'Vanderbilt University', 'Rice University', 'University of Notre Dame', 'Georgetown University',
  'University of California, Berkeley', 'UCLA', 'University of California, Los Angeles',
  'University of Michigan', 'University of Virginia', 'New York University', 'NYU',
  
  // Top UK Universities
  'University of Oxford', 'Oxford University', 'University of Cambridge', 'Cambridge University',
  'Imperial College London', 'London School of Economics', 'LSE', 'University College London',
  'UCL', 'King\'s College London', 'University of Edinburgh', 'University of Manchester',
  'University of Warwick', 'University of Bristol', 'University of Glasgow',
  
  // Top Canadian Universities
  'University of Toronto', 'McGill University', 'University of British Columbia', 'UBC',
  'University of Waterloo', 'Queen\'s University', 'University of Alberta',
  
  // Top Australian Universities
  'University of Melbourne', 'Australian National University', 'University of Sydney',
  'University of Queensland', 'Monash University', 'University of New South Wales',
  
  // Top European Universities
  'ETH Zurich', 'University of Zurich', 'Sorbonne University', 'Technical University of Munich',
  'University of Copenhagen', 'KTH Royal Institute of Technology', 'Delft University of Technology',
  
  // Top Asian Universities
  'National University of Singapore', 'NUS', 'Nanyang Technological University', 'NTU',
  'University of Tokyo', 'Kyoto University', 'Seoul National University', 'Peking University',
  'Tsinghua University', 'Hong Kong University of Science and Technology', 'HKUST',
  
  // Top Business Schools
  'Wharton School', 'Harvard Business School', 'Stanford Graduate School of Business',
  'MIT Sloan School of Management', 'Kellogg School of Management', 'Columbia Business School',
  'Booth School of Business', 'Tuck School of Business', 'Haas School of Business',
  'London Business School', 'INSEAD', 'IE Business School',
  
  // Top Indian Institutes - Engineering & Technology
  'IIT Madras', 'IIT Delhi', 'IIT Bombay', 'IIT Kanpur', 'IIT Kharagpur', 'IIT Roorkee',
  'IIT Guwahati', 'IIIT Hyderabad', 'BITS Pilani', 'NIT Trichy', 'VIT Vellore',
  'Jadavpur University', 'Delhi Technological University', 'NSUT', 'Manipal Institute of Technology',
  
  // Top Indian Business Schools & Management Institutes
  'IIM Ahmedabad', 'IIM Bangalore', 'IIM Calcutta', 'IIM Lucknow', 'IIM Kozhikode',
  'IIM Indore', 'XLRI', 'SPJIMR', 'ISB', 'FMS', 'MDI Gurgaon', 'IIFT Delhi',
  'NMIMS Mumbai', 'JBIMS Mumbai', 'IMT Ghaziabad', 'Great Lakes Chennai'
];

export function EducationStep({ 
  data, 
  onUpdate, 
  onNext, 
  onPrevious, 
  isFirstStep, 
  isLastStep 
}: EducationProps) {
  const [formData, setFormData] = useState({
    education: data.education || [],
    ...data
  });

  const [editingEducation, setEditingEducation] = useState<Education | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isInitialized, setIsInitialized] = useState(false);

  // Update form data when data prop changes (for pre-population)
  useEffect(() => {
    const newFormData = {
      education: Array.isArray(data.education) ? data.education : [],
      ...data
    };
    
    setFormData(newFormData);
    setIsInitialized(true);
  }, [data]);

  const emptyEducation: Education = {
    id: '',
    institution: '',
    degree: '',
    fieldOfStudy: '',
    location: '',
    startYear: '',
    endYear: '',
    isCurrentlyStudying: false,
    grade: '',
    description: '',
    activities: []
  };

  // No auto-save - data is only saved when Continue button is clicked

  const addEducation = () => {
    setEditingEducation({ ...emptyEducation, id: Date.now().toString() });
    setShowForm(true);
    setErrors({});
  };

  const editEducation = (education: Education) => {
    setEditingEducation(education);
    setShowForm(true);
    setErrors({});
  };

  const removeEducation = (educationId: string) => {
    setFormData(prev => ({
      ...prev,
      education: (prev.education || []).filter((edu: Education) => edu.id !== educationId)
    }));
  };

  const saveEducation = () => {
    if (!editingEducation || !validateEducation()) return;

    setFormData(prev => ({
      ...prev,
      education: (prev.education || []).find((edu: Education) => edu.id === editingEducation.id)
        ? (prev.education || []).map((edu: Education) => 
            edu.id === editingEducation.id ? editingEducation : edu
          )
        : [...(prev.education || []), editingEducation]
    }));

    setShowForm(false);
    setEditingEducation(null);
    setErrors({});
  };

  const cancelEdit = () => {
    setShowForm(false);
    setEditingEducation(null);
    setErrors({});
  };

  const updateEducationField = (field: keyof Education, value: any) => {
    if (!editingEducation) return;
    
    setEditingEducation(prev => prev ? { ...prev, [field]: value } : null);
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const addActivity = () => {
    if (!editingEducation) return;
    updateEducationField('activities', [...editingEducation.activities, '']);
  };

  const updateActivity = (index: number, value: string) => {
    if (!editingEducation) return;
    const newActivities = [...editingEducation.activities];
    newActivities[index] = value;
    updateEducationField('activities', newActivities);
  };

  const removeActivity = (index: number) => {
    if (!editingEducation) return;
    const newActivities = editingEducation.activities.filter((_, i) => i !== index);
    updateEducationField('activities', newActivities);
  };

  const validateEducation = () => {
    if (!editingEducation) return false;
    
    const newErrors: Record<string, string> = {};

    if (!editingEducation.institution.trim()) {
      newErrors.institution = 'Institution name is required';
    }

    if (!editingEducation.degree.trim()) {
      newErrors.degree = 'Degree type is required';
    }

    if (!editingEducation.fieldOfStudy.trim()) {
      newErrors.fieldOfStudy = 'Field of study is required';
    }

    if (!editingEducation.startYear) {
      newErrors.startYear = 'Start year is required';
    }

    if (!editingEducation.isCurrentlyStudying && !editingEducation.endYear) {
      newErrors.endYear = 'End year is required (or mark as currently studying)';
    }

    if (editingEducation.startYear && editingEducation.endYear && 
        parseInt(editingEducation.startYear) > parseInt(editingEducation.endYear)) {
      newErrors.endYear = 'End year must be after start year';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.education || formData.education.length === 0) {
      newErrors.education = 'Please add at least one education entry';
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

  const formatYearRange = (startYear: string, endYear: string, isCurrentlyStudying: boolean) => {
    const end = isCurrentlyStudying ? 'Present' : endYear;
    return `${startYear} - ${end}`;
  };

  const getCurrentYear = () => new Date().getFullYear();
  const getYearOptions = () => {
    const currentYear = getCurrentYear();
    const years = [];
    for (let year = currentYear + 5; year >= currentYear - 50; year--) {
      years.push(year.toString());
    }
    return years;
  };

  const isPremiumInstitution = (institution: string) => {
    const institutionLower = institution.toLowerCase();
    return PREMIUM_INSTITUTIONS.some(premium => 
      institutionLower.includes(premium.toLowerCase()) || 
      premium.toLowerCase().includes(institutionLower)
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900">
          <div className="flex items-center space-x-2">
            <GraduationCap className="w-5 h-5 text-gray-500" />
            <span>Education</span>
          </div>
        </h3>
        <p className="text-gray-600 mt-1">Add your educational background and qualifications</p>
      </div>

      {/* Education List */}
      <div className="space-y-4">
        {(formData.education || []).map((education: Education) => {
          const isPremium = isPremiumInstitution(education.institution);
          return (
            <div key={education.id} className={`border rounded-lg p-6 ${
              isPremium 
                ? 'border-2 border-yellow-400 bg-gradient-to-r from-yellow-50 to-orange-50 shadow-lg' 
                : 'border-gray-200'
            }`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-start space-x-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      isPremium 
                        ? 'bg-gradient-to-br from-yellow-500 to-orange-600' 
                        : 'bg-gradient-to-br from-blue-500 to-purple-600'
                    }`}>
                      <GraduationCap className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-lg font-semibold text-gray-900">{education.degree}</h4>
                        {isPremium && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
                            Premium
                          </span>
                        )}
                      </div>
                      <p className="text-blue-600 font-medium">{education.fieldOfStudy}</p>
                      <p className={`font-medium ${isPremium ? 'text-orange-600' : 'text-primary-600'}`}>{education.institution}</p>
                      <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>{formatYearRange(education.startYear, education.endYear, education.isCurrentlyStudying)}</span>
                        </div>
                        {education.location && (
                          <div className="flex items-center space-x-1">
                            <MapPin className="w-4 h-4" />
                            <span>{education.location}</span>
                          </div>
                        )}
                        {education.grade && (
                          <div className="flex items-center space-x-1">
                            <span className="font-medium">Grade: {education.grade}</span>
                          </div>
                        )}
                      </div>
                      {education.description && (
                        <p className="mt-3 text-gray-700 leading-relaxed">
                          {education.description}
                        </p>
                      )}
                      {education.activities.length > 0 && (
                        <div className="mt-3">
                          <h5 className="text-sm font-medium text-gray-900 mb-2">Activities & Societies</h5>
                          <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                            {education.activities.filter(activity => activity.trim()).map((activity, index) => (
                              <li key={index}>{activity}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <Button variant="outline" size="sm" onClick={() => editEducation(education)}>
                    Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => removeEducation(education.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}

        {(!formData.education || formData.education.length === 0) && !showForm && (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <GraduationCap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No education added yet</h3>
            <p className="text-gray-600 mb-4">Add your educational background to complete your profile.</p>
          </div>
        )}

        {errors.education && (
          <p className="text-sm text-red-600">{errors.education}</p>
        )}
      </div>

      {/* Add Education Button */}
      {!showForm && (
        <Button onClick={addEducation} className="w-full flex items-center justify-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Add Education</span>
        </Button>
      )}

      {/* Education Form */}
      {showForm && editingEducation && (
        <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
          <h4 className="text-lg font-semibold text-gray-900 mb-6">
            {editingEducation.id && (formData.education || []).find((edu: Education) => edu.id === editingEducation.id) 
              ? 'Edit Education' 
              : 'Add Education'
            }
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Institution */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Institution/School *
              </label>
              <input
                type="text"
                value={editingEducation.institution}
                onChange={(e) => updateEducationField('institution', e.target.value)}
                placeholder="e.g., University of California, Berkeley"
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                  errors.institution ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.institution && <p className="mt-1 text-sm text-red-600">{errors.institution}</p>}
            </div>

            {/* Degree */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Degree Type *
              </label>
              <select
                value={editingEducation.degree}
                onChange={(e) => updateEducationField('degree', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                  errors.degree ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select degree type</option>
                {DEGREE_TYPES.map(degree => (
                  <option key={degree} value={degree}>{degree}</option>
                ))}
              </select>
              {errors.degree && <p className="mt-1 text-sm text-red-600">{errors.degree}</p>}
            </div>

            {/* Field of Study */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Field of Study *
              </label>
              <input
                type="text"
                value={editingEducation.fieldOfStudy}
                onChange={(e) => updateEducationField('fieldOfStudy', e.target.value)}
                placeholder="e.g., Computer Science, Business Administration"
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                  errors.fieldOfStudy ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.fieldOfStudy && <p className="mt-1 text-sm text-red-600">{errors.fieldOfStudy}</p>}
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <input
                type="text"
                value={editingEducation.location}
                onChange={(e) => updateEducationField('location', e.target.value)}
                placeholder="e.g., Berkeley, CA or Online"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              />
            </div>

            {/* Start Year */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Year *
              </label>
              <select
                value={editingEducation.startYear}
                onChange={(e) => updateEducationField('startYear', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                  errors.startYear ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select start year</option>
                {getYearOptions().map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              {errors.startYear && <p className="mt-1 text-sm text-red-600">{errors.startYear}</p>}
            </div>

            {/* Currently Studying Checkbox */}
            <div className="md:col-span-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={editingEducation.isCurrentlyStudying}
                  onChange={(e) => {
                    updateEducationField('isCurrentlyStudying', e.target.checked);
                    if (e.target.checked) {
                      updateEducationField('endYear', '');
                    }
                  }}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700">I am currently studying here</span>
              </label>
            </div>

            {/* End Year */}
            {!editingEducation.isCurrentlyStudying && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Year *
                </label>
                <select
                  value={editingEducation.endYear}
                  onChange={(e) => updateEducationField('endYear', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                    errors.endYear ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select end year</option>
                  {getYearOptions().map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
                {errors.endYear && <p className="mt-1 text-sm text-red-600">{errors.endYear}</p>}
              </div>
            )}

            {/* Grade */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Grade/GPA (Optional)
              </label>
              <input
                type="text"
                value={editingEducation.grade}
                onChange={(e) => updateEducationField('grade', e.target.value)}
                placeholder="e.g., 3.8/4.0, First Class, 85%"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              />
            </div>
          </div>

          {/* Description */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={editingEducation.description}
              onChange={(e) => updateEducationField('description', e.target.value)}
              placeholder="Describe relevant coursework, projects, thesis, or other details..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors resize-none"
            />
          </div>

          {/* Activities */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Activities & Societies (Optional)
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addActivity}
                className="flex items-center space-x-1"
              >
                <Plus className="w-3 h-3" />
                <span>Add Activity</span>
              </Button>
            </div>
            
            {editingEducation.activities.map((activity, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={activity}
                  onChange={(e) => updateActivity(index, e.target.value)}
                  placeholder="e.g., Computer Science Society, Debate Team, Student Government"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeActivity(index)}
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
            <Button onClick={saveEducation}>
              Save Education
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
          Step 5 of 7 • Education
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