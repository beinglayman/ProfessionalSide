import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/button';

export function MCPCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing authorization...');

  useEffect(() => {
    const processCallback = async () => {
      const success = searchParams.get('success');
      const tool = searchParams.get('tool'); // Legacy single tool parameter
      const tools = searchParams.get('tools'); // New multiple tools parameter
      const error = searchParams.get('error');

      // Check for errors from backend redirect
      if (error) {
        setStatus('error');
        const errorMessages: Record<string, string> = {
          'missing_params': 'Missing required authorization parameters',
          'invalid_state': 'Invalid authorization state',
          'callback_failed': 'Failed to process authorization',
          'invalid_callback': 'Invalid callback parameters',
          'invalid_tool': 'Invalid tool type',
          'state_mismatch': 'Authorization state mismatch',
          'oauth_exchange_failed': 'Failed to exchange authorization code'
        };
        setMessage(errorMessages[error] || `Authorization failed: ${error}`);
        return;
      }

      // Check for success from backend redirect
      if (success === 'true' && (tool || tools)) {
        setStatus('success');

        // Handle both single tool and multiple tools
        if (tools) {
          const toolList = tools.split(',');
          const toolNames = toolList.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(' and ');
          setMessage(`Successfully connected ${toolNames}! Redirecting to settings...`);
        } else if (tool) {
          const toolName = tool.charAt(0).toUpperCase() + tool.slice(1);
          setMessage(`Successfully connected ${toolName}! Redirecting to settings...`);
        }

        // Invalidate the integrations cache to refetch updated status
        queryClient.invalidateQueries({ queryKey: ['mcp', 'integrations'] });

        // Redirect to settings integrations tab after 2 seconds
        setTimeout(() => {
          navigate('/settings', { state: { tab: 'integrations' } });
        }, 2000);
        return;
      }

      // If neither success nor error, something went wrong
      setStatus('error');
      setMessage('Missing required authorization parameters');
    };

    processCallback();
  }, [searchParams, navigate, queryClient]);

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