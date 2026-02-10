import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

interface DeliveryHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeliveryHelpModal: React.FC<DeliveryHelpModalProps> = ({ isOpen, onClose }) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg p-0 gap-0">
        <DialogHeader className="px-5 py-4 border-b border-gray-100 space-y-0">
          <DialogTitle className="text-base font-semibold text-gray-900">Practice Mode Guide</DialogTitle>
        </DialogHeader>

        <div className="px-5 py-4 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* Delivery Markers */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Delivery Markers</h4>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Opening Cue</p>
                  <p className="text-xs text-gray-500">How to start each section — set your tone, energy, and pace.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Transition Cue</p>
                  <p className="text-xs text-gray-500">When to pause before moving to the next section. Let key points land.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Typography Pattern */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Text Styling</h4>
            <div className="space-y-2.5">
              <div className="flex items-center gap-3">
                <mark className="font-bold bg-amber-100 text-amber-900 px-1 rounded-sm text-sm">40%</mark>
                <div className="flex-1">
                  <span className="text-sm text-gray-900">Metrics</span>
                  <span className="text-xs text-gray-500 ml-2">— memorize these</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <mark className="bg-emerald-100 text-emerald-800 font-medium px-1 rounded-sm text-sm">pattern</mark>
                <div className="flex-1">
                  <span className="text-sm text-gray-900">Patterns</span>
                  <span className="text-xs text-gray-500 ml-2">— golden nuggets</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <strong className="font-semibold text-indigo-700 text-sm">built</strong>
                <div className="flex-1">
                  <span className="text-sm text-gray-900">Actions</span>
                  <span className="text-xs text-gray-500 ml-2">— ownership</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="border-b border-dotted border-gray-500 text-sm">API</span>
                <div className="flex-1">
                  <span className="text-sm text-gray-900">Tech</span>
                  <span className="text-xs text-gray-500 ml-2">— hover for info</span>
                </div>
              </div>
            </div>
          </div>

          {/* Pro Tips */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Pro Tips</h4>
            <ul className="space-y-1.5 text-xs text-gray-600">
              <li>• <strong>2-minute rule:</strong> Keep each story under 2 minutes initially</li>
              <li>• <strong>Pause power:</strong> Strategic pauses show confidence, not hesitation</li>
              <li>• <strong>Numbers first:</strong> Lead with impact metrics when asked "tell me about..."</li>
              <li>• <strong>Practice out loud:</strong> Reading silently is not the same as speaking</li>
            </ul>
          </div>
        </div>

        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            Got it
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
