import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Settings, ArrowRight } from 'lucide-react';

interface WalkthroughCompletionScreenProps {
  onDone: () => void;
}

export function WalkthroughCompletionScreen({ onDone }: WalkthroughCompletionScreenProps) {
  const navigate = useNavigate();

  const handleConnectMore = () => {
    onDone();
    navigate('/settings?tab=integrations');
  };

  const handleGoToDashboard = () => {
    onDone();
    navigate('/dashboard');
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-8 text-center animate-in fade-in zoom-in-95 duration-300">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>

        <h2 className="text-xl font-bold text-gray-900 mb-2">
          You're all set!
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          Your career stories are building automatically. Connect more tools for
          richer stories with broader evidence.
        </p>

        <div className="space-y-3">
          <button
            onClick={handleConnectMore}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
          >
            <Settings className="w-4 h-4" />
            Connect more tools
          </button>
          <button
            onClick={handleGoToDashboard}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Go to dashboard
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
