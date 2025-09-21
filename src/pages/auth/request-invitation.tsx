import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { InvitationService } from '../../services/invitation.service';

export function RequestInvitationPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    organization: '',
    linkedinUrl: '',
    message: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [requestsEnabled, setRequestsEnabled] = useState(true);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  
  const navigate = useNavigate();

  // Check if invitation requests are enabled
  useEffect(() => {
    const checkRequestsEnabled = async () => {
      try {
        const response = await InvitationService.getRequestsEnabled();
        if (response.success && response.data) {
          setRequestsEnabled(response.data.enabled);
        }
      } catch (error) {
        console.error('Error checking requests status:', error);
      } finally {
        setIsCheckingStatus(false);
      }
    };
    
    checkRequestsEnabled();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Basic validation
    if (!formData.name.trim() || !formData.email.trim() || !formData.role.trim() || !formData.organization.trim()) {
      setError('Please fill in all required fields');
      setIsLoading(false);
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      setIsLoading(false);
      return;
    }

    // LinkedIn URL validation (if provided)
    if (formData.linkedinUrl && !formData.linkedinUrl.includes('linkedin.com')) {
      setError('Please enter a valid LinkedIn URL');
      setIsLoading(false);
      return;
    }

    try {
      const requestData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        role: formData.role.trim(),
        organization: formData.organization.trim(),
        ...(formData.linkedinUrl.trim() && { linkedinUrl: formData.linkedinUrl.trim() }),
        ...(formData.message.trim() && { message: formData.message.trim() })
      };

      const response = await InvitationService.createInvitationRequest(requestData);
      
      if (response.success) {
        setSuccess(true);
        // Clear form
        setFormData({
          name: '',
          email: '',
          role: '',
          organization: '',
          linkedinUrl: '',
          message: ''
        });
      } else {
        setError(response.error || 'Failed to submit invitation request');
      }
    } catch (error: any) {
      console.error('Request submission error:', error);
      setError(error.message || 'An error occurred while submitting your request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Loading state
  if (isCheckingStatus) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
          <span className="text-gray-600">Loading...</span>
        </div>
      </div>
    );
  }

  // Requests disabled
  if (!requestsEnabled) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <AlertCircle className="mx-auto h-16 w-16 text-amber-500" />
            <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
              Requests Temporarily Disabled
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Invitation requests are temporarily disabled. Please check back later.
            </p>
            <div className="mt-6">
              <Button onClick={() => navigate('/')} className="w-full">
                Back to Home
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
            <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
              Request Submitted!
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Thank you for your interest in InChronicle. We've received your invitation request and will review it shortly.
            </p>
            <p className="mt-4 text-sm text-gray-500">
              You'll receive an email notification once your request has been reviewed.
            </p>
            <div className="mt-6 space-y-4">
              <Button onClick={() => navigate('/')} className="w-full">
                Back to Home
              </Button>
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">
                  Sign in here
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Request an Invitation
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Tell us about yourself and we'll review your request to join InChronicle.
          </p>
          <p className="mt-1 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">
              Sign in here
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}
          
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Full Name *
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Your full name"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="your.email@company.com"
              />
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                Professional Role *
              </label>
              <input
                id="role"
                name="role"
                type="text"
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
                value={formData.role}
                onChange={handleInputChange}
                placeholder="e.g. Software Engineer, Product Manager"
              />
            </div>

            <div>
              <label htmlFor="organization" className="block text-sm font-medium text-gray-700">
                Organization *
              </label>
              <input
                id="organization"
                name="organization"
                type="text"
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
                value={formData.organization}
                onChange={handleInputChange}
                placeholder="Your company or organization"
              />
            </div>

            <div>
              <label htmlFor="linkedinUrl" className="block text-sm font-medium text-gray-700">
                LinkedIn Profile (optional)
              </label>
              <input
                id="linkedinUrl"
                name="linkedinUrl"
                type="url"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
                value={formData.linkedinUrl}
                onChange={handleInputChange}
                placeholder="https://linkedin.com/in/yourprofile"
              />
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                Tell us about yourself (optional)
              </label>
              <textarea
                id="message"
                name="message"
                rows={4}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
                value={formData.message}
                onChange={handleInputChange}
                placeholder="Why are you interested in InChronicle? What are your professional goals?"
              />
            </div>
          </div>

          <div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting Request...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Submit Request
                </>
              )}
            </Button>
          </div>
          
          <p className="text-xs text-gray-500 text-center">
            * Required fields. We'll review your request and get back to you within 24-48 hours.
          </p>
        </form>
      </div>
    </div>
  );
}