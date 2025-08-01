import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../../../components/ui/button';
import { MapPin, Building2, Camera, Upload, X } from 'lucide-react';
import { onboardingApiService } from '../../../services/onboarding-api.service';

interface ProfessionalBasicsProps {
  data: Record<string, unknown>;
  onUpdate: (data: Record<string, unknown>) => Promise<void>;
  onNext: () => Promise<void>;
  onPrevious: () => Promise<void>;
  isFirstStep: boolean;
  isLastStep?: boolean;
}

// Industry options
const INDUSTRIES = [
  'Technology',
  'Healthcare',
  'Finance',
  'Education',
  'Manufacturing',
  'Retail',
  'Consulting',
  'Media & Entertainment',
  'Real Estate',
  'Transportation',
  'Energy',
  'Government',
  'Non-profit',
  'Other'
];

export function ProfessionalBasicsStep({ 
  data, 
  onUpdate, 
  onNext, 
  onPrevious, 
  isFirstStep
}: ProfessionalBasicsProps) {
  const [formData, setFormData] = useState({
    fullName: data.fullName || '',
    currentTitle: data.currentTitle || '',
    currentCompany: data.currentCompany || '',
    industry: data.industry || '',
    yearsOfExperience: data.yearsOfExperience || '',
    location: data.location || '',
    profileImage: data.profileImage || null,
    profileImageUrl: data.profileImageUrl || '',
    ...data
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [imagePreview, setImagePreview] = useState<string>(data.profileImageUrl || '');
  const [isInitialized, setIsInitialized] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update form data when data prop changes (for pre-population)
  // Only run once when data first arrives
  useEffect(() => {
    if (data && Object.keys(data).length > 0 && !isInitialized) {
      setFormData({
        fullName: data.fullName || '',
        currentTitle: data.currentTitle || '',
        currentCompany: data.currentCompany || '',
        industry: data.industry || '',
        yearsOfExperience: data.yearsOfExperience || '',
        location: data.location || '',
        profileImage: data.profileImage || null,
        profileImageUrl: data.profileImageUrl || '',
        ...data
      });
      setImagePreview(data.profileImageUrl || '');
      setIsInitialized(true);
    }
  }, [data, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      const updateData = async () => {
        try {
          // Validate required fields before sending to API
          const hasMinValidData = formData.fullName && formData.fullName.length >= 2 &&
                                  formData.currentTitle && formData.currentTitle.length >= 2;
          
          if (!hasMinValidData) {
            return;
          }
          
          await onUpdate(formData);
          
          // Dispatch custom event to notify profile view of data change
          window.dispatchEvent(new CustomEvent('onboardingDataChanged', {
            detail: { 
              step: 'professional-basics',
              data: formData,
              profileImageUrl: formData.profileImageUrl 
            }
          }));
          
          // Also dispatch profileUpdated event for additional listeners
          window.dispatchEvent(new CustomEvent('profileUpdated', {
            detail: { source: 'onboarding-professional-basics' }
          }));
        } catch (error) {
          // Handle error silently in production
        }
      };
      
      // Use longer debounce for text fields, immediate for image changes
      const delay = formData.profileImageUrl !== imagePreview ? 100 : 1500;
      const timeoutId = setTimeout(updateData, delay);
      return () => clearTimeout(timeoutId);
    }
  }, [formData, onUpdate, isInitialized, imagePreview]);

  // Keep image preview in sync with form data
  useEffect(() => {
    if (formData.profileImageUrl && formData.profileImageUrl !== imagePreview) {
      setImagePreview(formData.profileImageUrl);
    }
  }, [formData.profileImageUrl, imagePreview]);

  // Save data on component unmount as a safeguard
  useEffect(() => {
    return () => {
      if (isInitialized && formData.fullName) {
        onUpdate(formData).catch(() => {
          // Handle error silently
        });
      }
    };
  }, [formData, onUpdate, isInitialized]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!formData.currentTitle.trim()) {
      newErrors.currentTitle = 'Current title is required';
    }

    if (!formData.currentCompany.trim()) {
      newErrors.currentCompany = 'Current company is required';
    }

    if (!formData.industry) {
      newErrors.industry = 'Industry is required';
    }

    if (!formData.yearsOfExperience && formData.yearsOfExperience !== 0) {
      newErrors.yearsOfExperience = 'Years of experience is required';
    } else if (formData.yearsOfExperience < 0 || formData.yearsOfExperience > 50) {
      newErrors.yearsOfExperience = 'Please enter a valid number of years (0-50)';
    }

    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({ ...prev, profileImage: 'Please select a valid image file' }));
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, profileImage: 'Image size must be less than 5MB' }));
        return;
      }

      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);

      try {
        // Upload image to server and get permanent URL
        const imageUrl = await onboardingApiService.uploadProfileImage(file);
        
        setFormData(prev => ({
          ...prev,
          profileImage: file,
          profileImageUrl: imageUrl
        }));
        
        // Update preview to use the permanent URL
        setImagePreview(imageUrl);
        
        // Dispatch immediate event for image upload
        window.dispatchEvent(new CustomEvent('onboardingDataChanged', {
          detail: { 
            step: 'professional-basics', 
            profileImageUrl: imageUrl, 
            type: 'imageUpload',
            data: { ...formData, profileImageUrl: imageUrl }
          }
        }));
        
        // Also dispatch profileUpdated event
        window.dispatchEvent(new CustomEvent('profileUpdated', {
          detail: { source: 'onboarding-image-upload' }
        }));
      } catch (error) {
        // Handle upload error
        
        // Fallback to data URL
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          setFormData(prev => ({
            ...prev,
            profileImage: file,
            profileImageUrl: dataUrl
          }));
          // Update preview to use the same data URL
          setImagePreview(dataUrl);
        };
        reader.readAsDataURL(file);
      }

      // Clear any previous errors
      setErrors(prev => ({ ...prev, profileImage: '' }));
    }
  };

  const handleImageRemove = () => {
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview('');
    setFormData(prev => ({
      ...prev,
      profileImage: null,
      profileImageUrl: ''
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerImageUpload = () => {
    fileInputRef.current?.click();
  };

  const handleNext = async () => {
    if (validateForm()) {
      try {
        // Explicitly save the current form data before proceeding
        await onUpdate(formData);
        
        // Dispatch event to notify profile view of the final save
        window.dispatchEvent(new CustomEvent('onboardingDataChanged', {
          detail: { 
            step: 'professional-basics', 
            data: formData,
            type: 'step-complete',
            action: 'continue'
          }
        }));
        
        window.dispatchEvent(new CustomEvent('profileUpdated', {
          detail: { source: 'onboarding-step-complete' }
        }));
        
        // Now proceed to next step
        await onNext();
      } catch (error) {
        // Handle navigation error
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Let's start with the basics</h2>
        <p className="text-sm text-gray-600">Tell us about your current role to personalize your experience</p>
      </div>

      {/* Main Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form Fields */}
        <div className="space-y-6">
          {/* Profile Photo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Profile Photo (Optional)</label>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div 
                  className="w-16 h-16 rounded-full border-2 border-gray-300 overflow-hidden bg-gray-50 flex items-center justify-center cursor-pointer hover:border-primary-300 transition-colors"
                  onClick={triggerImageUpload}
                >
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Camera className="w-6 h-6 text-gray-400" />
                  )}
                </div>
                {imagePreview && (
                  <button
                    onClick={handleImageRemove}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={triggerImageUpload}
                  className="flex items-center space-x-2"
                >
                  <Upload className="w-4 h-4" />
                  <span>{imagePreview ? 'Change Photo' : 'Upload Photo'}</span>
                </Button>
                <p className="text-xs text-gray-500 mt-1">JPG, PNG or GIF • Max 5MB</p>
                {errors.profileImage && (
                  <p className="text-xs text-red-600 mt-1">{errors.profileImage}</p>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Full Name */}
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
              Full Name *
            </label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
              placeholder="e.g., Sarah Johnson"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                errors.fullName ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.fullName && (
              <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>
            )}
          </div>

          {/* Job Title */}
          <div>
            <label htmlFor="currentTitle" className="block text-sm font-medium text-gray-700 mb-2">
              Current Job Title *
            </label>
            <input
              type="text"
              id="currentTitle"
              name="currentTitle"
              value={formData.currentTitle}
              onChange={handleInputChange}
              placeholder="e.g., Senior Software Engineer"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                errors.currentTitle ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.currentTitle && (
              <p className="mt-1 text-sm text-red-600">{errors.currentTitle}</p>
            )}
          </div>

          {/* Company */}
          <div>
            <label htmlFor="currentCompany" className="block text-sm font-medium text-gray-700 mb-2">
              Current Company *
            </label>
            <input
              type="text"
              id="currentCompany"
              name="currentCompany"
              value={formData.currentCompany}
              onChange={handleInputChange}
              placeholder="e.g., TechCorp Inc."
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                errors.currentCompany ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.currentCompany && (
              <p className="mt-1 text-sm text-red-600">{errors.currentCompany}</p>
            )}
          </div>

          {/* Industry & Experience */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-2">
                Industry *
              </label>
              <select
                id="industry"
                name="industry"
                value={formData.industry}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                  errors.industry ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select your industry</option>
                {INDUSTRIES.map(industry => (
                  <option key={industry} value={industry}>{industry}</option>
                ))}
              </select>
              {errors.industry && (
                <p className="mt-1 text-sm text-red-600">{errors.industry}</p>
              )}
            </div>

            <div>
              <label htmlFor="yearsOfExperience" className="block text-sm font-medium text-gray-700 mb-2">
                Years of Experience *
              </label>
              <input
                type="number"
                id="yearsOfExperience"
                name="yearsOfExperience"
                value={formData.yearsOfExperience}
                onChange={handleInputChange}
                placeholder="5"
                min="0"
                max="50"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                  errors.yearsOfExperience ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.yearsOfExperience && (
                <p className="mt-1 text-sm text-red-600">{errors.yearsOfExperience}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Enter 0 if you're just starting your career
              </p>
            </div>
          </div>

          {/* Location */}
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
              Location *
            </label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              placeholder="e.g., San Francisco, CA or Remote"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                errors.location ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.location && (
              <p className="mt-1 text-sm text-red-600">{errors.location}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              City, State/Country or "Remote" if you work remotely
            </p>
          </div>
        </div>

        {/* Preview */}
        <div>
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Profile Preview</h3>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-start space-x-4">
                <div className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center border-2 border-gray-300">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Profile preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">
                        {formData.currentTitle ? formData.currentTitle.charAt(0).toUpperCase() : '?'}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{formData.fullName || 'Your Name'}</h4>
                  <p className="text-primary-600 font-medium text-sm">
                    {formData.currentTitle || 'Your Job Title'}
                  </p>
                  <div className="mt-2 space-y-1 text-xs text-gray-600">
                    <div className="flex items-center space-x-1">
                      <Building2 className="w-3 h-3" />
                      <span>{formData.currentCompany || 'Your Company'}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-3 h-3" />
                      <span>{formData.location || 'Your Location'}</span>
                    </div>
                  </div>
                  {(formData.industry || formData.yearsOfExperience) && (
                    <div className="mt-2">
                      <span className="bg-primary-100 text-primary-700 px-2 py-1 rounded-full text-xs font-medium">
                        {formData.industry || 'Industry'} • {formData.yearsOfExperience || '0'} years exp.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
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
          Step 1 of 7 • Professional Basics
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