import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle, XCircle, Loader2, Terminal } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useErrorConsole } from '../../contexts/ErrorConsoleContext';
import { ONBOARDING_STORAGE_KEY } from '../onboarding/steps/connect-tools';

const REDIRECT_DELAY_MS = 2000;
const ONBOARDING_RETURN_MAX_AGE_MS = 15 * 60 * 1000; // 15 minutes

export function MCPCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { captureOAuthError, openConsole } = useErrorConsole();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing authorization...');
  const [errorCode, setErrorCode] = useState<string | null>(null);

  useEffect(() => {
    const processCallback = async () => {
      const success = searchParams.get('success');
      const tool = searchParams.get('tool'); // Legacy single tool parameter
      const tools = searchParams.get('tools'); // New multiple tools parameter
      const error = searchParams.get('error');

      // Check for errors from backend redirect
      if (error) {
        setStatus('error');
        setErrorCode(error);
        const errorMessages: Record<string, string> = {
          'missing_params': 'Missing required authorization parameters',
          'invalid_state': 'Invalid authorization state',
          'callback_failed': 'Failed to process authorization',
          'invalid_callback': 'Invalid callback parameters',
          'invalid_tool': 'Invalid tool type',
          'state_mismatch': 'Authorization state mismatch',
          'oauth_exchange_failed': 'Failed to exchange authorization code',
          'admin_consent_required': 'Your organization requires admin approval for this app',
          'access_denied': 'Access was denied by the user or organization'
        };
        const errorMessage = errorMessages[error] || `Authorization failed: ${error}`;
        setMessage(errorMessage);

        // Capture to error console with full URL params for debugging
        const provider = tool || tools?.split(',')[0] || 'unknown';
        captureOAuthError(provider, error, JSON.stringify({
          message: errorMessage,
          tool,
          tools,
          allParams: Object.fromEntries(searchParams.entries()),
          url: window.location.href
        }));
        return;
      }

      // Check for success from backend redirect
      if (success === 'true' && (tool || tools)) {
        setStatus('success');

        // Invalidate the integrations cache to refetch updated status
        queryClient.invalidateQueries({ queryKey: ['mcp', 'integrations'] });

        // Determine redirect destination before setting message
        let redirectToOnboarding = false;
        const onboardingReturn = localStorage.getItem(ONBOARDING_STORAGE_KEY);
        if (onboardingReturn) {
          try {
            const parsed = JSON.parse(onboardingReturn);
            redirectToOnboarding = Date.now() - parsed.ts < ONBOARDING_RETURN_MAX_AGE_MS;
          } catch { /* malformed localStorage — fall through to default */ }
          localStorage.removeItem(ONBOARDING_STORAGE_KEY);
        }

        // Set message with correct destination
        const destination = redirectToOnboarding ? 'onboarding' : 'settings';
        if (tools) {
          const toolList = tools.split(',');
          const toolNames = toolList.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(' and ');
          setMessage(`Successfully connected ${toolNames}! Redirecting to ${destination}...`);
        } else if (tool) {
          const toolName = tool.charAt(0).toUpperCase() + tool.slice(1);
          setMessage(`Successfully connected ${toolName}! Redirecting to ${destination}...`);
        }

        // Redirect after delay
        setTimeout(() => {
          if (redirectToOnboarding) {
            navigate('/onboarding', { state: { returnToStep: 'connect-tools' } });
          } else {
            navigate('/settings', { state: { tab: 'integrations' } });
          }
        }, REDIRECT_DELAY_MS);
        return;
      }

      // If neither success nor error, something went wrong
      setStatus('error');
      setErrorCode('unknown');
      setMessage('Missing required authorization parameters');

      // Capture unknown error state
      captureOAuthError('unknown', 'missing_success_param', JSON.stringify({
        message: 'Neither success nor error param present',
        allParams: Object.fromEntries(searchParams.entries()),
        url: window.location.href
      }));
    };

    processCallback();
  }, [searchParams, navigate, queryClient, captureOAuthError]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <div className="text-center">
          {status === 'processing' && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-primary-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Connecting Your Account
              </h2>
              <p className="text-gray-600">{message}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Connection Successful!
              </h2>
              <p className="text-gray-600 mb-6">{message}</p>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Connection Failed
              </h2>
              <p className="text-gray-600 mb-4">{message}</p>
              {errorCode && (
                <p className="text-xs text-gray-400 mb-4 font-mono bg-gray-100 px-2 py-1 rounded">
                  Error code: {errorCode}
                </p>
              )}
              <div className="space-y-3">
                <Button
                  onClick={() => navigate('/settings', { state: { tab: 'integrations' } })}
                  className="w-full"
                >
                  Back to Settings
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.location.reload()}
                  className="w-full"
                >
                  Try Again
                </Button>
                <button
                  onClick={openConsole}
                  className="w-full flex items-center justify-center gap-2 text-xs text-gray-500 hover:text-gray-700 py-2"
                >
                  <Terminal size={14} />
                  View Error Details (Cmd+E)
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default MCPCallbackPage;