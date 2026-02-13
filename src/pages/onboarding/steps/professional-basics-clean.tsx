import React, { useState, useEffect } from 'react';
import { Button } from '../../../components/ui/button';
import { Camera, Upload } from 'lucide-react';
import { productionOnboardingService } from '../../../services/onboarding-production.service';

interface ProfessionalBasicsProps {
  data: Record<string, unknown>;
  onUpdate: (data: Record<string, unknown>) => Promise<void>;
  onNext: () => Promise<void>;
  onPrevious: () => Promise<void>;
  isFirstStep: boolean;
  isLastStep?: boolean;
}

const ROLES = [
  'Individual Contributor',
  'Team Lead',
  'Manager',
  'Senior Manager',
  'Director',
  'VP',
  'C-Suite',
  'Founder',
  'Freelancer / Consultant',
  'Other',
];

export function ProfessionalBasicsStepClean({
  data,
  onUpdate,
  onNext,
  isFirstStep,
}: ProfessionalBasicsProps) {
  const [formData, setFormData] = useState({
    fullName: (data.fullName as string) || (data.name as string) || '',
    currentTitle: (data.currentTitle as string) || (data.title as string) || '',
    currentCompany: (data.currentCompany as string) || (data.company as string) || '',
    role: (data.role as string) || '',
    profileImageUrl: (data.profileImageUrl as string) || (data.avatar as string) || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string>('');

  useEffect(() => {
    setFormData({
      fullName: (data?.fullName as string) || (data?.name as string) || '',
      currentTitle: (data?.currentTitle as string) || (data?.title as string) || '',
      currentCompany: (data?.currentCompany as string) || (data?.company as string) || '',
      role: (data?.role as string) || '',
      profileImageUrl: (data?.profileImageUrl as string) || (data?.avatar as string) || '',
    });
  }, [data]);

  useEffect(() => {
    return () => {
      if (previewImageUrl) {
        URL.revokeObjectURL(previewImageUrl);
      }
    };
  }, [previewImageUrl]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }
    if (!formData.role) {
      newErrors.role = 'Role is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({ ...prev, profileImage: 'Please select a valid image file' }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, profileImage: 'Image size must be less than 5MB' }));
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setPreviewImageUrl(previewUrl);
    setImageLoadError(false);
    setIsImageUploading(true);

    try {
      const imageUrl = await productionOnboardingService.uploadProfileImage(file);
      setFormData(prev => ({ ...prev, profileImageUrl: imageUrl }));
      URL.revokeObjectURL(previewUrl);
      setPreviewImageUrl('');
      setErrors(prev => ({ ...prev, profileImage: '' }));
    } catch (error) {
      setErrors(prev => ({
        ...prev,
        profileImage: 'Failed to upload image. You can try again later.',
      }));
    } finally {
      setIsImageUploading(false);
    }
  };

  const cleanFormDataForAPI = (formDataToClean: typeof formData) => {
    const cleaned: Record<string, unknown> = { ...formDataToClean };

    // Remove blob URLs
    if (typeof cleaned.profileImageUrl === 'string' && !(cleaned.profileImageUrl as string).startsWith('http')) {
      delete cleaned.profileImageUrl;
    }

    // Remove empty strings
    Object.keys(cleaned).forEach(key => {
      if (cleaned[key] === '') {
        delete cleaned[key];
      }
    });

    return cleaned;
  };

  const handleNext = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const cleanedData = cleanFormDataForAPI(formData);
      await onUpdate(cleanedData);
      await onNext();
    } catch (error) {
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
      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          What's your name?
        </h2>
        <p className="text-sm text-gray-600">
          Just the basics so we know who you are
        </p>
      </div>

      {errors.general && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-600">{errors.general}</p>
        </div>
      )}

      <div className="max-w-md mx-auto space-y-6">
        {/* Profile Photo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Profile Photo <span className="text-gray-400 font-normal">(optional)</span>
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
                    onError={() => setImageLoadError(true)}
                    onLoad={() => setImageLoadError(false)}
                  />
                ) : (
                  <Camera className="w-6 h-6 text-gray-400" />
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
              >
                <Upload className="w-4 h-4 mr-2" />
                <span>{isImageUploading ? 'Uploading...' : 'Upload Photo'}</span>
              </Button>
              <p className="text-xs text-gray-500 mt-1">JPG, PNG or GIF — Max 5MB</p>
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
            Full Name <span className="text-red-500">*</span>
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

        {/* Role */}
        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
            Role <span className="text-red-500">*</span>
          </label>
          <select
            id="role"
            name="role"
            value={formData.role}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
              errors.role ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Select your role</option>
            {ROLES.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
          {errors.role && (
            <p className="mt-1 text-sm text-red-600">{errors.role}</p>
          )}
        </div>

        {/* Job Title */}
        <div>
          <label htmlFor="currentTitle" className="block text-sm font-medium text-gray-700 mb-2">
            Job Title <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            id="currentTitle"
            name="currentTitle"
            value={formData.currentTitle}
            onChange={handleInputChange}
            placeholder="e.g., Senior Software Engineer"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
          />
        </div>

        {/* Company */}
        <div>
          <label htmlFor="currentCompany" className="block text-sm font-medium text-gray-700 mb-2">
            Company <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            id="currentCompany"
            name="currentCompany"
            value={formData.currentCompany}
            onChange={handleInputChange}
            placeholder="e.g., TechCorp Inc."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-200">
        <div />
        <div className="text-center text-xs text-gray-500">
          Step 1 of 2
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
