import React, { useState, useEffect, useCallback } from 'react';
import { Button } from './button';
import { cn } from '../../lib/utils';
import { Check, X, Loader2, ExternalLink } from 'lucide-react';

interface ProfileUrlInputProps {
  value: string;
  onChange: (value: string) => void;
  onSave: (value: string) => Promise<void>;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

interface ValidationResult {
  isValid: boolean;
  isAvailable?: boolean;
  error?: string;
  isChecking?: boolean;
}

export function ProfileUrlInput({ 
  value, 
  onChange, 
  onSave, 
  className, 
  placeholder = "your-profile-url",
  disabled = false 
}: ProfileUrlInputProps) {
  const [inputValue, setInputValue] = useState(value);
  const [validation, setValidation] = useState<ValidationResult>({ isValid: true });
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Debounced validation
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  const validateUrl = useCallback(async (url: string) => {
    if (!url || url === value) {
      setValidation({ isValid: true });
      setHasChanges(url !== value);
      return;
    }

    // Client-side validation first
    if (url.length < 3) {
      setValidation({ isValid: false, error: 'Profile URL must be at least 3 characters' });
      setHasChanges(true);
      return;
    }

    if (url.length > 50) {
      setValidation({ isValid: false, error: 'Profile URL must be less than 50 characters' });
      setHasChanges(true);
      return;
    }

    if (!/^[a-z0-9-]+$/.test(url)) {
      setValidation({ isValid: false, error: 'Only lowercase letters, numbers, and hyphens allowed' });
      setHasChanges(true);
      return;
    }

    if (url.includes('--')) {
      setValidation({ isValid: false, error: 'Cannot contain consecutive hyphens' });
      setHasChanges(true);
      return;
    }

    if (url.startsWith('-') || url.endsWith('-')) {
      setValidation({ isValid: false, error: 'Cannot start or end with a hyphen' });
      setHasChanges(true);
      return;
    }

    // Server-side validation for availability
    setValidation({ isValid: true, isChecking: true });
    setHasChanges(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3002/api/v1'}/users/profile-url/check/${encodeURIComponent(url)}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('inchronicle_access_token')}`
          }
        }
      );

      if (response.ok) {
        const result = await response.json();
        setValidation({
          isValid: result.data.available,
          isAvailable: result.data.available,
          error: result.data.error
        });
      } else {
        setValidation({ isValid: false, error: 'Failed to check availability' });
      }
    } catch (error) {
      setValidation({ isValid: false, error: 'Failed to check availability' });
    }
  }, [value]);

  // Handle input change with debouncing
  const handleInputChange = (newValue: string) => {
    setInputValue(newValue);
    
    // Clear existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Set new timer for validation
    const timer = setTimeout(() => {
      validateUrl(newValue);
    }, 500);
    
    setDebounceTimer(timer);
  };

  // Handle save
  const handleSave = async () => {
    if (!validation.isValid || !hasChanges) return;

    setIsSaving(true);
    try {
      await onSave(inputValue);
      onChange(inputValue);
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save profile URL:', error);
      setValidation({ isValid: false, error: 'Failed to save profile URL' });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    setInputValue(value);
    setHasChanges(false);
    setValidation({ isValid: true });
  };

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  // Generate preview URL
  const previewUrl = inputValue ? `${window.location.origin}/u/${inputValue}` : '';

  const getStatusIcon = () => {
    if (validation.isChecking) {
      return <Loader2 className="h-4 w-4 animate-spin text-gray-400" />;
    }
    if (validation.isValid && validation.isAvailable !== undefined) {
      return validation.isAvailable 
        ? <Check className="h-4 w-4 text-green-500" />
        : <X className="h-4 w-4 text-red-500" />;
    }
    if (!validation.isValid) {
      return <X className="h-4 w-4 text-red-500" />;
    }
    return null;
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          Profile URL
        </label>
        
        <div className="relative">
          <div className="flex items-center">
            <span className="inline-flex items-center px-3 py-2 border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm rounded-l-md">
              {window.location.origin}/u/
            </span>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value.toLowerCase())}
              placeholder={placeholder}
              disabled={disabled}
              className={cn(
                "flex-1 px-3 py-2 border border-gray-300 rounded-r-md text-sm",
                "focus:ring-2 focus:ring-primary-500 focus:border-primary-500",
                "disabled:bg-gray-50 disabled:text-gray-500",
                !validation.isValid && "border-red-500 focus:ring-red-500 focus:border-red-500"
              )}
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              {getStatusIcon()}
            </div>
          </div>
        </div>

        {/* Validation message */}
        {validation.error && (
          <p className="text-sm text-red-600">
            {validation.error}
          </p>
        )}

        {/* Success message with preview */}
        {validation.isValid && validation.isAvailable && inputValue && (
          <div className="space-y-1">
            <p className="text-sm text-green-600">
              ✓ Available! Your profile will be accessible at:
            </p>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                {previewUrl}
              </code>
              {inputValue && (
                <button
                  onClick={() => window.open(previewUrl, '_blank')}
                  className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700"
                >
                  <ExternalLink className="h-3 w-3" />
                  Preview
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      {hasChanges && (
        <div className="flex items-center gap-2">
          <Button
            onClick={handleSave}
            disabled={!validation.isValid || isSaving || validation.isChecking}
            size="sm"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              'Save'
            )}
          </Button>
          <Button
            onClick={handleCancel}
            variant="outline"
            size="sm"
            disabled={isSaving}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}