import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../contexts/AuthContext';
import { InvitationService, SystemSettings, InvitationTokenValidation } from '../../services/invitation.service';

export function RegisterPage() {
  const [searchParams] = useSearchParams();
  const invitationToken = searchParams.get('token');
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Invitation system state
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  const [tokenValidation, setTokenValidation] = useState<InvitationTokenValidation | null>(null);
  const [isCheckingToken, setIsCheckingToken] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  
  const { register, isLoading } = useAuth();
  const navigate = useNavigate();

  // Check system settings and validate token on mount
  useEffect(() => {
    const checkSystemAndToken = async () => {
      try {
        // Always fetch system settings
        const settingsResponse = await InvitationService.getSystemSettings();
        if (settingsResponse.success && settingsResponse.data) {
          setSystemSettings(settingsResponse.data);
        }
        
        // If there's an invitation token, validate it
        if (invitationToken) {
          setIsCheckingToken(true);
          const tokenResponse = await InvitationService.validateInvitationToken(invitationToken);
          if (tokenResponse.success && tokenResponse.data) {
            setTokenValidation(tokenResponse.data);
            // Pre-fill email if token is valid
            if (tokenResponse.data.valid && tokenResponse.data.email) {
              setFormData(prev => ({ ...prev, email: tokenResponse.data.email! }));
            }
          }
        }
      } catch (error) {
        console.error('Error checking system settings or token:', error);
      } finally {
        setIsLoadingSettings(false);
        setIsCheckingToken(false);
      }
    };
    
    checkSystemAndToken();
  }, [invitationToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Check if invitation is required but not provided/valid
    if (systemSettings?.invitationOnlyMode && !invitationToken) {
      setError('An invitation is required to register. Please use the invitation link provided to you.');
      return;
    }
    
    if (systemSettings?.invitationOnlyMode && invitationToken && (!tokenValidation || !tokenValidation.valid)) {
      setError('The invitation token is invalid or has expired. Please request a new invitation.');
      return;
    }

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    // Check password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
    if (!passwordRegex.test(formData.password)) {
      setError('Password must contain at least one lowercase letter, one uppercase letter, and one number');
      return;
    }

    try {
      const registerData = {
        name: 'User', // Temporary name, will be set during onboarding
        email: formData.email,
        password: formData.password,
        ...(invitationToken && { invitationToken })
      };

      await register(registerData);
      // Registration successful, redirect to onboarding wizard
      navigate('/onboarding');
    } catch (error: any) {
      console.error('Registration error:', error);
      setError(error.message || 'An error occurred during registration. Please try again.');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Show loading state while checking settings
  if (isLoadingSettings) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
          <span className="text-gray-600">Loading...</span>
        </div>
      </div>
    );
  }

  // Show invitation required message if invitation-only mode is on and no valid token
  if (systemSettings?.invitationOnlyMode && !invitationToken) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <AlertCircle className="mx-auto h-16 w-16 text-amber-500" />
            <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
              Invitation Required
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              InChronicle is currently invite-only. You need an invitation to create an account.
            </p>
            <div className="mt-6 space-y-4">
              <p className="text-sm text-gray-500">
                Don't have an invitation? You can request one:
              </p>
              <Button 
                onClick={() => navigate('/request-invitation')}
                className="w-full"
              >
                Request an Invitation
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

  // Show invalid token message
  if (invitationToken && tokenValidation && !tokenValidation.valid) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <AlertCircle className="mx-auto h-16 w-16 text-red-500" />
            <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
              Invalid Invitation
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              This invitation link is invalid or has expired.
            </p>
            <div className="mt-6 space-y-4">
              <Button 
                onClick={() => navigate('/request-invitation')}
                className="w-full"
              >
                Request a New Invitation
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
            Create your professional account
          </h2>
          
          {/* Show invitation status */}
          {invitationToken && isCheckingToken && (
            <div className="mt-4 flex items-center justify-center space-x-2 text-sm text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Validating invitation...</span>
            </div>
          )}
          
          {invitationToken && tokenValidation?.valid && (
            <div className="mt-4 rounded-md bg-green-50 p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div className="text-sm">
                  <p className="font-medium text-green-800">
                    Welcome! You've been invited by {tokenValidation.inviter?.name}
                  </p>
                  <p className="text-green-700">
                    Your email ({tokenValidation.email}) has been pre-filled.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <p className="mt-2 text-center text-sm text-gray-600">
            {systemSettings?.invitationOnlyMode ? (
              invitationToken ? (
                "Complete your registration using this invitation."
              ) : (
                "InChronicle is currently invite-only."
              )
            ) : (
              "Join InChronicle to document your professional journey. We'll collect your profile details in the next step."
            )}
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
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                disabled={invitationToken && tokenValidation?.valid}
                className={`mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm ${
                  invitationToken && tokenValidation?.valid ? 'bg-gray-50' : ''
                }`}
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter your professional email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative mt-1">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 pr-10 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
                  value={formData.password}
                  onChange={handleInputChange}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Must be at least 8 characters with uppercase, lowercase, and number
              </p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <div className="relative mt-1">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 pr-10 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </div>
        </form>

      </div>
    </div>
  );
}