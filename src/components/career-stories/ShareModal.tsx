import React, { useState } from 'react';
import { Copy, Check, Link2, Clock, Eye } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { ConfirmationDialog } from '../ui/confirmation-dialog';
import { useToast } from '../../contexts/ToastContext';
import { usePragmaLinks, useCreatePragmaLink, useRevokePragmaLink } from '../../hooks/usePragmaLinks';
import type { PragmaLink } from '../../services/pragma-link.service';

type Tier = 'public' | 'recruiter' | 'mentor';

const TIER_OPTIONS: { value: Tier; label: string; hint: string }[] = [
  { value: 'public', label: 'Anyone (preview)', hint: 'A summary of your story — no sources or annotations' },
  { value: 'recruiter', label: 'Recruiter (full story)', hint: 'Full story with evidence and metrics' },
  { value: 'mentor', label: 'Mentor (with notes)', hint: 'Full story with your annotations visible' },
];

const EXPIRY_OPTIONS = [
  { label: '7 days', value: 7 },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
  { label: 'Never', value: 0 },
];

const TIER_COLORS: Record<Tier, string> = {
  public: 'bg-gray-100 text-gray-700',
  recruiter: 'bg-blue-50 text-blue-700',
  mentor: 'bg-purple-50 text-purple-700',
};

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  storyId: string;
  storyTitle: string;
}

async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Fallback for HTTP / iframe / permission-denied
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}

export function ShareModal({ isOpen, onClose, storyId, storyTitle }: ShareModalProps) {
  const [tier, setTier] = useState<Tier>('recruiter');
  const [label, setLabel] = useState('');
  const [expiryDays, setExpiryDays] = useState(30);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<PragmaLink | null>(null);
  const [showAllRevoked, setShowAllRevoked] = useState(false);

  const { success, error } = useToast();
  const { data: links = [], isLoading } = usePragmaLinks(storyId);
  const createMutation = useCreatePragmaLink();
  const revokeMutation = useRevokePragmaLink(storyId);

  const activeLinks = links.filter((l) => !l.revokedAt);
  const revokedLinks = links.filter((l) => l.revokedAt);
  const isLimitReached = activeLinks.length >= 20;

  const handleCreate = async () => {
    const expiresAt = expiryDays > 0
      ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString()
      : undefined;

    try {
      const response = await createMutation.mutateAsync({
        storyId,
        tier,
        label: label.trim() || undefined,
        expiresAt,
      });

      if (response.success && response.data) {
        await copyToClipboard(response.data.url);
        success('Link created', 'URL copied to clipboard');
        setLabel('');
      } else {
        error('Failed to create link', response.error || 'Unknown error');
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } }; message?: string };
      const msg = axiosErr.response?.data?.error || axiosErr.message || 'Failed to create link';
      error('Error', msg);
    }
  };

  const handleCopyUrl = async (link: PragmaLink) => {
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/p/${link.shortCode}?t=${link.token}`;
    await copyToClipboard(url);
    setCopiedLinkId(link.id);
    setTimeout(() => setCopiedLinkId(null), 2000);
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    try {
      await revokeMutation.mutateAsync(revokeTarget.id);
      setRevokeTarget(null);
    } catch {
      error('Failed to revoke link');
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Share Link
            </DialogTitle>
            <DialogDescription className="truncate">
              {storyTitle}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-5 pr-1">
            {/* Create new link form */}
            <div className="rounded-lg border border-gray-200 p-4 space-y-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Create New Link</p>

              {/* Tier selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-700">Who is this for?</label>
                <div className="flex gap-2">
                  {TIER_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setTier(opt.value)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-xs font-medium transition-all border',
                        tier === opt.value
                          ? 'border-primary-500 bg-primary-50 text-primary-700 ring-1 ring-primary-200'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-gray-500">
                  {TIER_OPTIONS.find((o) => o.value === tier)?.hint}
                </p>
              </div>

              {/* Label */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Label (optional)</label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !createMutation.isPending && !isLimitReached) handleCreate(); }}
                  placeholder="e.g. Acme Corp - Jane Smith"
                  maxLength={100}
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-400 focus:border-primary-400"
                />
              </div>

              {/* Expiry */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Expires</label>
                <select
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-400 focus:border-primary-400 bg-white"
                >
                  {EXPIRY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Create button */}
              <div className="flex justify-end">
                <Button
                  onClick={handleCreate}
                  disabled={createMutation.isPending || isLimitReached}
                  size="sm"
                  title={isLimitReached ? 'Maximum links reached. Revoke an existing link to create a new one.' : undefined}
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Link'}
                </Button>
              </div>
            </div>

            {/* Active links */}
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-500" />
              </div>
            ) : (
              <>
                {activeLinks.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Active Links ({activeLinks.length})
                    </p>
                    <div className="space-y-2">
                      {activeLinks.map((link) => (
                        <LinkItem
                          key={link.id}
                          link={link}
                          copiedLinkId={copiedLinkId}
                          onCopy={() => handleCopyUrl(link)}
                          onRevoke={() => setRevokeTarget(link)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {revokedLinks.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Revoked ({revokedLinks.length})
                    </p>
                    <div className="space-y-1">
                      {(showAllRevoked ? revokedLinks : revokedLinks.slice(0, 3)).map((link) => (
                        <div key={link.id} className="flex items-center gap-2 py-1 text-xs text-gray-400">
                          <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', TIER_COLORS[link.tier])}>
                            {link.tier}
                          </span>
                          {link.label && <span className="line-through">{link.label}</span>}
                          <span className="ml-auto">
                            revoked {formatRelativeTime(link.revokedAt!)}
                          </span>
                        </div>
                      ))}
                      {revokedLinks.length > 3 && !showAllRevoked && (
                        <button
                          onClick={() => setShowAllRevoked(true)}
                          className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          Show {revokedLinks.length - 3} more
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {links.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">
                    No share links yet. Create one above.
                  </p>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={!!revokeTarget}
        onOpenChange={(open) => !open && setRevokeTarget(null)}
        title="Revoke Share Link"
        description={`Anyone with this link will no longer be able to view the story${revokeTarget?.label ? ` (${revokeTarget.label})` : ''}.`}
        variant="destructive"
        confirmLabel="Revoke"
        onConfirm={handleRevoke}
        isLoading={revokeMutation.isPending}
      />
    </>
  );
}

function LinkItem({
  link,
  copiedLinkId,
  onCopy,
  onRevoke,
}: {
  link: PragmaLink;
  copiedLinkId: string | null;
  onCopy: () => void;
  onRevoke: () => void;
}) {
  const isCopied = copiedLinkId === link.id;
  const isExpired = link.expiresAt && new Date(link.expiresAt) < new Date();

  return (
    <div className="rounded-md border border-gray-200 px-3 py-2.5 space-y-1.5">
      <div className="flex items-center gap-2">
        <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium capitalize', TIER_COLORS[link.tier])}>
          {link.tier}
        </span>
        {link.label && (
          <span className="text-xs font-medium text-gray-700 truncate">{link.label}</span>
        )}
        {isExpired && (
          <span className="text-[10px] text-amber-600 font-medium">expired</span>
        )}
      </div>
      <p className="text-[11px] text-gray-400 truncate">
        {window.location.host}/p/{link.shortCode}...
      </p>

      <div className="flex items-center gap-3 text-[11px] text-gray-400">
        <span>Created {formatRelativeTime(link.createdAt)}</span>
        <span className="flex items-center gap-0.5">
          <Eye className="h-3 w-3" />
          {link.views} {link.views === 1 ? 'view' : 'views'}
        </span>
        {link.lastViewedAt && (
          <span>Last: {formatRelativeTime(link.lastViewedAt)}</span>
        )}
        {link.expiresAt && !isExpired && (
          <span className="flex items-center gap-0.5">
            <Clock className="h-3 w-3" />
            Expires {formatRelativeTime(link.expiresAt)}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={onCopy}
          disabled={!!isExpired}
          className={cn(
            'inline-flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors',
            isExpired
              ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
              : isCopied
                ? 'bg-green-50 text-green-600'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
          )}
        >
          {isCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {isCopied ? 'Copied' : 'Copy URL'}
        </button>
        <button
          onClick={onRevoke}
          className="inline-flex items-center px-2 py-1 rounded text-xs text-red-500 hover:bg-red-50 transition-colors"
        >
          Revoke
        </button>
      </div>
    </div>
  );
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;

  // Future dates (for expiry)
  if (diffMs < 0) {
    const absDiff = Math.abs(diffMs);
    const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'today';
    if (days === 1) return 'tomorrow';
    if (days < 30) return `in ${days}d`;
    return `in ${Math.floor(days / 30)}mo`;
  }

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}
