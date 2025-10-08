import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/button';

export function MCPCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing authorization...');

  useEffect(() => {
    const processCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      // Check for OAuth errors
      if (error) {
        setStatus('error');
        setMessage(errorDescription || `Authorization failed: ${error}`);
        return;
      }

      // Validate we have required params
      if (!code || !state) {
        setStatus('error');
        setMessage('Missing required authorization parameters');
        return;
      }

      // The backend will handle the actual OAuth callback
      // For now, just show success and redirect
      setTimeout(() => {
        setStatus('success');
        setMessage('Successfully connected! Redirecting to settings...');

        // Redirect to settings integrations tab after 2 seconds
        setTimeout(() => {
          navigate('/settings', { state: { tab: 'integrations' } });
        }, 2000);
      }, 1500);
    };

    processCallback();
  }, [searchParams, navigate]);

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
              <p className="text-gray-600 mb-6">{message}</p>
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
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default MCPCallbackPage;