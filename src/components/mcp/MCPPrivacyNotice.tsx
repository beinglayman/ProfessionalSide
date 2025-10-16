import React from 'react';
import { Shield, Lock, Info, CheckCircle } from 'lucide-react';

interface MCPPrivacyNoticeProps {
  variant?: 'default' | 'compact' | 'detailed';
  className?: string;
}

export const MCPPrivacyNotice: React.FC<MCPPrivacyNoticeProps> = ({
  variant = 'default',
  className = ''
}) => {
  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 text-sm text-gray-600 ${className}`}>
        <Shield className="h-4 w-4 text-blue-600" />
        <span>Your data, your control. Nothing saved without approval.</span>
      </div>
    );
  }

  if (variant === 'detailed') {
    return (
      <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 mb-2">
              Your Privacy is Our Priority
            </h4>
            <div className="space-y-2 text-sm text-gray-700">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                <span>
                  <strong>Zero Data Storage:</strong> InChronicle never stores data from your external tools
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                <span>
                  <strong>On-Demand Access:</strong> Tools are only accessed when you explicitly request it
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                <span>
                  <strong>Temporary Sessions:</strong> Fetched data auto-deletes after 30 minutes
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                <span>
                  <strong>Your Control:</strong> Only the journal entries you publish are saved
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                <span>
                  <strong>Encrypted Storage:</strong> OAuth tokens are encrypted with AES-256
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div className={`border border-blue-200 bg-blue-50 rounded-lg p-4 ${className}`} role="alert">
      <div className="flex items-start gap-3">
        <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <strong className="text-gray-900">Your data, your control</strong>
          <ul className="mt-2 space-y-1 text-sm text-gray-700">
            <li>• InChronicle fetches data only when you request</li>
            <li>• No external data is stored without your approval</li>
            <li>• Only your final published entry is saved</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

interface MCPToolPrivacyNoticeProps {
  toolName: string;
  isConnected?: boolean;
  className?: string;
}

export const MCPToolPrivacyNotice: React.FC<MCPToolPrivacyNoticeProps> = ({
  toolName,
  isConnected = false,
  className = ''
}) => {
  return (
    <div className={`flex items-start gap-2 p-3 bg-gray-50 rounded-md text-sm ${className}`}>
      <Info className="h-4 w-4 text-gray-500 mt-0.5" />
      <div className="flex-1 text-gray-600">
        {isConnected ? (
          <>
            <span className="font-medium">{toolName} is connected.</span>
            {' '}We only store your authentication token (encrypted). No {toolName} data is saved.
            Data is fetched only when you request it and automatically deleted after 30 minutes.
          </>
        ) : (
          <>
            Connect your {toolName} account to import your work activity.
            {' '}InChronicle will only store an encrypted authentication token.
            No data from {toolName} will be saved without your explicit approval.
          </>
        )}
      </div>
    </div>
  );
};

interface MCPSessionNoticeProps {
  expiresAt: Date | string;
  onClear?: () => void;
  className?: string;
}

export const MCPSessionNotice: React.FC<MCPSessionNoticeProps> = ({
  expiresAt,
  onClear,
  className = ''
}) => {
  const expiryDate = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
  const minutesRemaining = Math.max(0, Math.floor((expiryDate.getTime() - Date.now()) / 60000));

  return (
    <div className={`flex items-center justify-between p-2 bg-yellow-50 border border-yellow-200 rounded text-sm ${className}`}>
      <div className="flex items-center gap-2">
        <Lock className="h-4 w-4 text-yellow-600" />
        <span className="text-yellow-800">
          Temporary data • Auto-deletes in {minutesRemaining} minutes
        </span>
      </div>
      {onClear && (
        <button
          onClick={onClear}
          className="text-yellow-700 hover:text-yellow-900 underline text-sm"
        >
          Clear now
        </button>
      )}
    </div>
  );
};