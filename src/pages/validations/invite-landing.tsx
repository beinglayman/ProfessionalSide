/**
 * ExternalInviteLandingPage - Ship 4.2.
 *
 * Public route: `/invite/validate/:token`. The landing for a magic-link
 * emailed to someone who isn't on InChronicle yet. Shows who invited them
 * and for what, then:
 *   - If not logged in, sends them to /register with the token + email
 *     carried as query params so the Register page can pre-fill and
 *     auto-claim post-signup.
 *   - If already logged in (rare but possible - they may have signed up
 *     separately first), claims the invite right here and redirects to
 *     the validator view.
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ShieldCheck, Loader2, AlertTriangle, Clock } from 'lucide-react';
import { CareerStoriesService } from '../../services/career-stories.service';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/button';

function InviteFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-lg bg-white rounded-xl border border-gray-200 shadow-sm p-8">
        {children}
      </div>
    </div>
  );
}

export function ExternalInviteLandingPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [claimError, setClaimError] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['external-invite', token],
    queryFn: async () => {
      if (!token) throw new Error('Missing token');
      const res = await CareerStoriesService.getExternalInviteByToken(token);
      return res.data?.invite ?? null;
    },
    enabled: Boolean(token),
    retry: false,
  });

  const claim = useMutation({
    mutationFn: () => {
      if (!token) throw new Error('Missing token');
      return CareerStoriesService.claimExternalInvite(token);
    },
    onSuccess: (res) => {
      const storyId = res.data?.storyId;
      if (storyId) navigate(`/validate/${storyId}`, { replace: true });
    },
    onError: (err: Error) => {
      setClaimError(err.message || 'Could not claim invite');
    },
  });

  // If already authed and the invite is loaded+pending, claim automatically.
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) return;
    if (!data || data.status !== 'pending') return;
    if (claim.isPending || claim.isSuccess || claim.isError) return;
    claim.mutate();
  }, [authLoading, isAuthenticated, data, claim]);

  if (isLoading || authLoading) {
    return (
      <InviteFrame>
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      </InviteFrame>
    );
  }

  if (isError || !data) {
    return (
      <InviteFrame>
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Invite not found</h1>
            <p className="text-sm text-gray-500 mt-1">
              This link may have expired or been revoked. Ask whoever sent it to resend.
            </p>
          </div>
        </div>
      </InviteFrame>
    );
  }

  if (data.status === 'expired' || new Date(data.expiresAt) < new Date()) {
    return (
      <InviteFrame>
        <div className="flex items-start gap-3">
          <Clock className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <h1 className="text-lg font-semibold text-gray-900">This invite has expired</h1>
            <p className="text-sm text-gray-500 mt-1">
              Ask {data.inviterName} to send a fresh link.
            </p>
          </div>
        </div>
      </InviteFrame>
    );
  }

  if (data.status === 'claimed') {
    return (
      <InviteFrame>
        <div className="flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <h1 className="text-lg font-semibold text-gray-900">This invite was already used</h1>
            <p className="text-sm text-gray-500 mt-1 mb-4">
              If you validated this story already, you can find it in your inbox.
            </p>
            <Link
              to="/me/validations"
              className="text-sm font-medium text-primary-700 hover:text-primary-800"
            >
              Go to validations inbox &rarr;
            </Link>
          </div>
        </div>
      </InviteFrame>
    );
  }

  // Pending + already authed: show spinner while claim runs.
  if (isAuthenticated && claim.isPending) {
    return (
      <InviteFrame>
        <div className="flex items-center gap-3 py-6">
          <Loader2 className="h-5 w-5 animate-spin text-primary-600" />
          <p className="text-sm text-gray-600">Setting up your validation&hellip;</p>
        </div>
      </InviteFrame>
    );
  }

  if (claimError) {
    return (
      <InviteFrame>
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Could not claim invite</h1>
            <p className="text-sm text-gray-500 mt-1">{claimError}</p>
          </div>
        </div>
      </InviteFrame>
    );
  }

  // Pending + unauthed: show invite context + signup CTA.
  const registerHref = `/register?inviteToken=${encodeURIComponent(data.token)}&email=${encodeURIComponent(data.email)}`;

  return (
    <InviteFrame>
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-semibold text-primary-600 mb-3">
        <ShieldCheck className="h-3.5 w-3.5" />
        You've been asked to validate a story
      </div>

      <h1 className="text-2xl font-bold text-gray-900 leading-tight">
        {data.inviterName} wants your perspective on{' '}
        <span className="text-primary-700">&ldquo;{data.storyTitle}&rdquo;</span>
      </h1>

      <p className="text-sm text-gray-500 mt-3">
        They've asked you to review{' '}
        <span className="font-medium text-gray-700">
          {data.sectionKeys.length} section{data.sectionKeys.length === 1 ? '' : 's'}
        </span>{' '}
        because your activities show you worked on this together. Sign up to confirm,
        dispute, or suggest edits to what they've written.
      </p>

      {data.message && (
        <div className="mt-4 rounded-md bg-primary-50/60 border border-primary-100 px-3 py-2.5">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-primary-700 mb-1">
            Note from {data.inviterName}
          </p>
          <p className="text-sm text-gray-800 italic">&ldquo;{data.message}&rdquo;</p>
        </div>
      )}

      <div className="mt-6 flex items-center gap-3">
        <Button asChild className="bg-primary-600 hover:bg-primary-700 text-white">
          <Link to={registerHref}>Sign up to validate</Link>
        </Button>
        <span className="text-xs text-gray-400">
          Already have an account?{' '}
          <Link
            to={`/login?inviteToken=${encodeURIComponent(data.token)}`}
            className="text-primary-700 hover:text-primary-800 font-medium"
          >
            Log in
          </Link>
        </span>
      </div>

      <p className="mt-6 text-[11px] text-gray-400 border-t border-gray-100 pt-4">
        This invite is tied to {data.email}. It expires{' '}
        {new Date(data.expiresAt).toLocaleDateString()}.
      </p>
    </InviteFrame>
  );
}
