/**
 * DerivationViewModal
 *
 * Read-only modal for viewing a saved derivation with the appropriate
 * preview frame (LinkedIn post, interview answer, resume bullet, etc.).
 */

import React, { useState, useCallback } from 'react';
import { Copy, Check, Trash2, Clock } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { StoryDerivation, DerivationType } from '../../types/career-stories';
import { DerivationPreview } from './DerivationPreview';
import { DERIVATION_TYPE_META } from './constants';
import { SimpleMarkdown } from '../ui/simple-markdown';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';

interface DerivationViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  derivation: StoryDerivation;
  onDelete?: (id: string) => void;
}

const PACKET_LABELS: Record<string, string> = {
  promotion: 'Promotion Packet',
  'annual-review': 'Annual Review',
  'skip-level': 'Skip-Level Prep',
  'portfolio-brief': 'Portfolio Brief',
  'self-assessment': 'Self Assessment',
  'one-on-one': '1:1 Prep',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function DerivationViewModal({ isOpen, onClose, derivation, onDelete }: DerivationViewModalProps) {
  const [copied, setCopied] = useState(false);

  const isSingle = derivation.kind === 'single';
  const title = isSingle
    ? DERIVATION_TYPE_META[derivation.type as DerivationType]?.label || derivation.type
    : PACKET_LABELS[derivation.type] || derivation.type;

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(derivation.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [derivation.text]);

  const handleDelete = useCallback(() => {
    onDelete?.(derivation.id);
    onClose();
  }, [derivation.id, onDelete, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'px-2 py-0.5 rounded text-xs font-medium',
                isSingle ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
              )}
            >
              {isSingle ? 'Single Story' : 'Packet'}
            </span>
            <DialogTitle className="text-base">{title}</DialogTitle>
          </div>
          <DialogDescription className="flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDate(derivation.createdAt)}
            </span>
            <span>{derivation.wordCount} words</span>
            <span>{derivation.charCount} chars</span>
            {derivation.tone && (
              <span className="capitalize">{derivation.tone}</span>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Preview frame */}
        <div className="flex-1 overflow-y-auto py-4">
          {isSingle ? (
            <DerivationPreview
              derivation={derivation.type as DerivationType}
              text={derivation.text}
              isGenerating={false}
              charCount={derivation.charCount}
              wordCount={derivation.wordCount}

            />
          ) : (
            /* Packet types use markdown rendering */
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <SimpleMarkdown content={derivation.text} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1.5 rounded hover:bg-red-50"
          >
            <Trash2 className="h-3 w-3" />
            Delete
          </button>
          <Button
            size="sm"
            onClick={handleCopy}
            className={cn(copied && 'bg-green-600 hover:bg-green-700')}
          >
            {copied ? (
              <><Check className="h-3.5 w-3.5 mr-1.5" /> Copied</>
            ) : (
              <><Copy className="h-3.5 w-3.5 mr-1.5" /> Copy to clipboard</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
