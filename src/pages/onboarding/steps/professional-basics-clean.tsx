// Production-ready professional basics step
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../../../components/ui/button';
import { MapPin, Building2, Camera, Upload, X } from 'lucide-react';
import { productionOnboardingService } from '../../../services/onboarding-production.service';
import { OnboardingData } from '../../../services/onboarding.service';

interface ProfessionalBasicsProps {
  data: Record<string, unknown>;
  onUpdate: (data: Record<string, unknown>) => Promise<void>;
  onNext: () => Promise<void>;
  onPrevious: () => Promise<void>;
  isFirstStep: boolean;
  isLastStep?: boolean;
}

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

// No debounce needed since we only save on Continue button click

export function ProfessionalBasicsStepClean({
  data,
  onUpdate,
  onNext,
  onPrevious,
  isFirstStep
}: ProfessionalBasicsProps) {
  const [formData, setFormData] = useState({
    ...data,
    // Override any null/undefined values with appropriate defaults
    fullName: data.fullName || '',
    currentTitle: data.currentTitle || '',
    currentCompany: data.currentCompany || '',
    industry: data.industry || '',
    yearsOfExperience: data.yearsOfExperience || '',
    location: data.location || '',
    profileImageUrl: data.profileImageUrl || ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string>('');

  // Update form data when new data is received (for prepopulation)
  useEffect(() => {
    console.log('🔄 Professional Basics: Received data prop:', data);
    console.log('🔍 Professional Basics: Data keys:', Object.keys(data || {}));
    console.log('🔍 Professional Basics: fullName value:', data?.fullName);
    console.log('🔍 Professional Basics: name value:', data?.name);
    console.log('🔍 Professional Basics: currentTitle value:', data?.currentTitle);
    console.log('🔍 Professional Basics: title value:', data?.title);
    console.log('🔍 Professional Basics: currentCompany value:', data?.currentCompany);
    console.log('🔍 Professional Basics: company value:', data?.company);
    
    const newFormData = {
      ...data,
      // Override any null/undefined values with appropriate defaults
      fullName: data?.fullName || data?.name || '',
      currentTitle: data?.currentTitle || data?.title || '',
      currentCompany: data?.currentCompany || data?.company || '',
      industry: data?.industry || '',
      yearsOfExperience: data?.yearsOfExperience || '',
      location: data?.location || '',
      profileImageUrl: data?.profileImageUrl || data?.avatar || ''
    };
    
    console.log('🔄 Professional Basics: Setting form data to:', newFormData);
    console.log('🖼️ Professional Basics: Image URL status - formData:', newFormData.profileImageUrl, 'preview:', previewImageUrl);
    setFormData(newFormData);
  }, [data]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (previewImageUrl) {
        URL.revokeObjectURL(previewImageUrl);
        console.log('🧹 Professional Basics: Cleaned up preview URL on unmount');
      }
    };
  }, [previewImageUrl]);

  // No auto-save - data is only saved when Continue button is clicked

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Convert yearsOfExperience to number
    const processedValue = name === 'yearsOfExperience' ? Number(value) : value;
    
    setFormData(prev => ({ ...prev, [name]: processedValue }));
    
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
    if (formData.yearsOfExperience === null || formData.yearsOfExperience === undefined || formData.yearsOfExperience === '') {
      newErrors.yearsOfExperience = 'Years of experience is required';
    }
    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('🔄 Professional Basics: Image upload initiated');
    const file = e.target.files?.[0];
    if (!file) {
      console.log('❌ Professional Basics: No file selected');
      return;
    }

    console.log('🔍 Professional Basics: File selected:', {
      name: file.name,
      size: file.size,
      type: file.type,
      sizeInMB: (file.size / (1024 * 1024)).toFixed(2)
    });

    // Validate file
    if (!file.type.startsWith('image/')) {
      console.log('❌ Professional Basics: Invalid file type:', file.type);
      setErrors(prev => ({ ...prev, profileImage: 'Please select a valid image file' }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      console.log('❌ Professional Basics: File too large:', file.size);
      setErrors(prev => ({ ...prev, profileImage: 'Image size must be less than 5MB' }));
      return;
    }

    console.log('✅ Professional Basics: File validation passed, creating preview and starting upload');
    
    // Create immediate preview using blob URL
    const previewUrl = URL.createObjectURL(file);
    setPreviewImageUrl(previewUrl);
    setImageLoadError(false);
    console.log('✅ Professional Basics: Preview URL created:', previewUrl);
    
    setIsImageUploading(true);
    
    try {
      console.log('🔄 Professional Basics: Calling onboardingCleanService.uploadProfileImage');
      const imageUrl = await productionOnboardingService.uploadProfileImage(file);
      console.log('✅ Professional Basics: Upload successful, received URL:', imageUrl);
      
      // Update form data with the uploaded URL
      setFormData(prev => ({ ...prev, profileImageUrl: imageUrl }));
      
      // Clean up the blob URL since we now have the uploaded URL
      URL.revokeObjectURL(previewUrl);
      setPreviewImageUrl('');
      
      setErrors(prev => ({ ...prev, profileImage: '' }));
      console.log('✅ Professional Basics: Form data updated with uploaded image URL');
    } catch (error) {
      console.error('❌ Professional Basics: Image upload failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('❌ Professional Basics: Error details:', errorMessage);
      
      // Keep the preview URL so user can still see their selected image
      console.log('🔄 Professional Basics: Keeping preview URL due to upload failure');
      
      setErrors(prev => ({ 
        ...prev, 
        profileImage: `Failed to upload image: ${errorMessage}. Preview shown, will retry on save.` 
      }));
    } finally {
      setIsImageUploading(false);
      console.log('🔄 Professional Basics: Upload process completed');
    }
  };

  const cleanFormDataForAPI = (data: any) => {
    const cleaned = { ...data };
    
    // Remove blob URLs and invalid data
    if (cleaned.profileImageUrl && !cleaned.profileImageUrl.startsWith('http')) {
      delete cleaned.profileImageUrl;
    }
    
    // Ensure yearsOfExperience is a number or undefined
    if (cleaned.yearsOfExperience) {
      cleaned.yearsOfExperience = parseInt(cleaned.yearsOfExperience.toString());
      if (isNaN(cleaned.yearsOfExperience)) {
        delete cleaned.yearsOfExperience;
      }
    }
    
    // Remove empty strings
    Object.keys(cleaned).forEach(key => {
      if (cleaned[key] === '') {
        delete cleaned[key];
      }
    });
    
    console.log('🧹 Professional Basics: Cleaned data for API:', cleaned);
    return cleaned;
  };

  const handleNext = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      console.log('💾 Saving onboarding data on Continue button click...');
      console.log('📊 Form data being saved:', formData);
      
      // If there's a preview image but no uploaded URL, try to upload again
      if (previewImageUrl && !formData.profileImageUrl) {
        console.log('🔄 Professional Basics: Retry uploading image before saving...');
        try {
          // Get the file from the input (if still available)
          const fileInput = document.getElementById('image-upload') as HTMLInputElement;
          const file = fileInput?.files?.[0];
          
          if (file) {
            console.log('🔄 Professional Basics: Retrying image upload...');
            const imageUrl = await productionOnboardingService.uploadProfileImage(file);
            console.log('✅ Professional Basics: Retry upload successful:', imageUrl);
            
            // Update form data with the uploaded URL
            const updatedFormData = { ...formData, profileImageUrl: imageUrl };
            setFormData(updatedFormData);
            
            // Clean up preview URL
            URL.revokeObjectURL(previewImageUrl);
            setPreviewImageUrl('');
            
            // Save the updated data with the uploaded image URL
            const cleanedData = cleanFormDataForAPI(updatedFormData);
            await onUpdate(cleanedData);
          } else {
            console.log('⚠️ Professional Basics: No file available for retry, proceeding without image');
            const cleanedData = cleanFormDataForAPI(formData);
            await onUpdate(cleanedData);
          }
        } catch (retryError) {
          console.error('❌ Professional Basics: Retry upload failed:', retryError);
          // Proceed anyway - user can upload later
          const cleanedData = cleanFormDataForAPI(formData);
          await onUpdate(cleanedData);
        }
      } else {
        // Normal save
        const cleanedData = cleanFormDataForAPI(formData);
        await onUpdate(cleanedData);
      }
      
      console.log('✅ Data saved successfully, proceeding to next step');
      await onNext();
    } catch (error) {
      console.error('❌ Professional Basics: Failed to proceed to next step:', error);
      console.error('❌ Professional Basics: Error type:', typeof error);
      console.error('❌ Professional Basics: Error message:', error instanceof Error ? error.message : String(error));
      console.error('❌ Professional Basics: Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      // Log current form state for debugging
      console.error('❌ Professional Basics: Form data at time of error:', formData);
      console.error('❌ Professional Basics: Preview image URL:', previewImageUrl);
      console.error('❌ Professional Basics: Is image uploading:', isImageUploading);
      
      const errorMessage = error instanceof Error 
        ? `Save failed: ${error.message}` 
        : 'Failed to save data. Please try again.';
        
      setErrors({ general: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Let's start with the basics
        </h2>
        <p className="text-sm text-gray-600">
          Tell us about your current role to personalize your experience
        </p>
      </div>

      {/* Error Message */}
      {errors.general && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-600">{errors.general}</p>
        </div>
      )}

      {/* Main Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form Fields */}
        <div className="space-y-6">
          {/* Profile Photo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Profile Photo (Optional)
            </label>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className={`w-16 h-16 rounded-full border-2 overflow-hidden bg-gray-50 flex items-center justify-center ${
                  previewImageUrl ? 'border-blue-400' : 'border-gray-300'
                }`}>
                  {(formData.profileImageUrl || previewImageUrl) && !imageLoadError ? (
                    <img
                      src={formData.profileImageUrl || previewImageUrl}
                      alt="Profile"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const currentSrc = formData.profileImageUrl || previewImageUrl;
                        console.error('Failed to load profile image:', currentSrc);
                        console.error('Image load error details:', e);
                        setImageLoadError(true);
                      }}
                      onLoad={() => {
                        setImageLoadError(false);
                        console.log('✅ Image loaded successfully:', formData.profileImageUrl || previewImageUrl);
                      }}
                    />
                  ) : (
                    <Camera className="w-6 h-6 text-gray-400" />
                  )}
                  {previewImageUrl && !formData.profileImageUrl && (
                    <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white text-xs px-1 py-0.5 rounded-full">
                      Preview
                    </div>
                  )}
                </div>
                {isImageUploading && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  </div>
                )}
              </div>
              <div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isImageUploading}
                  onClick={() => document.getElementById('image-upload')?.click()}
                  className={`flex items-center space-x-2 ${
                    previewImageUrl ? 'border-blue-400 text-blue-600' : ''
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  <span>
                    {isImageUploading 
                      ? 'Uploading...' 
                      : previewImageUrl 
                        ? 'Change Photo' 
                        : 'Upload Photo'
                    }
                  </span>
                </Button>
                <p className="text-xs text-gray-500 mt-1">JPG, PNG or GIF • Max 5MB</p>
                {errors.profileImage && (
                  <p className="text-xs text-red-600 mt-1">{errors.profileImage}</p>
                )}
              </div>
              <input
                id="image-upload"
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
          </div>
        </div>

        {/* Preview */}
        <div>
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Profile Preview</h3>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-start space-x-4">
                <div className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center border-2 border-gray-300">
                  {(formData.profileImageUrl || previewImageUrl) && !imageLoadError ? (
                    <img
                      src={formData.profileImageUrl || previewImageUrl}
                      alt="Profile preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const currentSrc = formData.profileImageUrl || previewImageUrl;
                        console.error('Failed to load profile preview image:', currentSrc);
                        console.error('Preview image load error details:', e);
                        setImageLoadError(true);
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">
                        {formData.fullName ? formData.fullName.charAt(0).toUpperCase() : '?'}
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
          disabled={isFirstStep || isLoading}
        >
          Previous
        </Button>

        <div className="text-center text-xs text-gray-500">
          Step 1 of 7 • Professional Basics
        </div>

        <Button 
          onClick={handleNext}
          disabled={isLoading}
          className="flex items-center space-x-2"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Saving...</span>
            </>
          ) : (
            <span>Continue</span>
          )}
        </Button>
      </div>
    </div>
  );
}