/**
 * PragmaLinkPage render regression tests
 *
 * Catches the hooks-ordering bug (React error #310) where useMemo was called
 * after early returns, causing "Rendered more hooks than during the previous render."
 * The fix: all derived state + useMemo must be above early returns.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Polyfill IntersectionObserver for jsdom (framer-motion whileInView uses it)
if (typeof IntersectionObserver === 'undefined') {
  (globalThis as any).IntersectionObserver = class {
    constructor(private cb: IntersectionObserverCallback) {}
    observe() { /* noop */ }
    unobserve() { /* noop */ }
    disconnect() { /* noop */ }
  };
}

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

let mockResolveReturn: {
  data: any;
  isLoading: boolean;
  isError: boolean;
  error: any;
};

vi.mock('../../hooks/usePragmaLinks', () => ({
  useResolvePragmaLink: () => mockResolveReturn,
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: false }),
}));

// Stub rough-notation to avoid DOM measurement in jsdom
vi.mock('rough-notation', () => ({
  annotate: () => ({ show: vi.fn(), remove: vi.fn(), hide: vi.fn() }),
}));

const MOCK_STORY = {
  content: {
    id: 'story-1',
    title: 'Migrated auth service to OAuth2',
    framework: 'STAR',
    archetype: 'architect',
    category: 'projects',
    publishedAt: '2026-01-15T00:00:00Z',
    sections: {
      situation: { summary: 'Legacy auth was password-only.' },
      task: { summary: 'Migrate 50K users to OAuth2 without downtime.' },
      action: { summary: 'Built feature-flagged dual-auth bridge.' },
      result: { summary: 'Zero-downtime migration, 40% fewer support tickets.' },
    },
    sources: [
      { id: 's1', label: 'PR #1234', sectionKey: 'action', toolType: 'github', sourceType: 'activity', url: null, annotation: null },
    ],
    annotations: [
      {
        id: 'a1', storyId: 'story-1', derivationId: null, sectionKey: 'result',
        startOffset: 0, endOffset: 15, annotatedText: 'Zero-downtime',
        style: 'highlight', color: 'amber', note: 'Key achievement',
        createdAt: '2026-01-15', updatedAt: '2026-01-15',
      },
    ],
    sourceCoverage: { total: 4, sourced: 1 },
  },
  tier: 'mentor' as const,
  author: { id: 'u1', name: 'Jane Doe', title: 'Staff Engineer', company: 'Acme', avatar: null },
};

function renderPage(path = '/p/abc12345?t=token123') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/p/:shortCode" element={<PragmaLinkPageLazy />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// Lazy import so vi.mock takes effect before module loads
let PragmaLinkPageLazy: React.ComponentType;
beforeEach(async () => {
  const mod = await import('./view');
  PragmaLinkPageLazy = mod.default;
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PragmaLinkPage rendering', () => {
  beforeEach(() => {
    mockResolveReturn = {
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    };
  });

  it('renders loading skeleton without crashing', () => {
    renderPage();
    // Loading skeleton has animated pulse placeholders
    const pulses = document.querySelectorAll('.animate-pulse');
    expect(pulses.length).toBeGreaterThan(0);
  });

  it('transitions from loading to loaded without hooks error (regression: #310)', () => {
    // First render: loading state
    const { rerender, container } = renderPage();

    // Transition to loaded state — this would throw "Rendered more hooks"
    // if useMemo was still after early returns
    mockResolveReturn = {
      data: MOCK_STORY,
      isLoading: false,
      isError: false,
      error: null,
    };

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    rerender(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/p/abc12345?t=token123']}>
          <Routes>
            <Route path="/p/:shortCode" element={<PragmaLinkPageLazy />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // Should render the story title — not crash
    expect(screen.getByText('Migrated auth service to OAuth2')).toBeTruthy();
  });

  it('renders error state for revoked link', () => {
    mockResolveReturn = {
      data: undefined,
      isLoading: false,
      isError: true,
      error: { response: { status: 410, data: { error: 'This share link has been revoked' } } },
    };

    renderPage();
    expect(screen.getByText('Link Revoked')).toBeTruthy();
  });

  it('renders error state for expired link', () => {
    mockResolveReturn = {
      data: undefined,
      isLoading: false,
      isError: true,
      error: { response: { status: 410, data: { error: 'This share link has expired' } } },
    };

    renderPage();
    expect(screen.getByText('Link Expired')).toBeTruthy();
  });

  it('renders error state for 403 forbidden', () => {
    mockResolveReturn = {
      data: undefined,
      isLoading: false,
      isError: true,
      error: { response: { status: 403, data: { error: 'Invalid access token' } } },
    };

    renderPage();
    expect(screen.getByText('Access Denied')).toBeTruthy();
  });

  it('renders generic error for unknown failures', () => {
    mockResolveReturn = {
      data: undefined,
      isLoading: false,
      isError: true,
      error: { response: { status: 500 } },
    };

    renderPage();
    expect(screen.getByText('Not Available')).toBeTruthy();
  });

  it('renders mentor tier with annotations and margin column', () => {
    mockResolveReturn = {
      data: MOCK_STORY,
      isLoading: false,
      isError: false,
      error: null,
    };

    renderPage();
    expect(screen.getByText('Full Story + Annotations')).toBeTruthy();
    expect(screen.getByText('Migrated auth service to OAuth2')).toBeTruthy();
    // Source coverage bar should show
    expect(screen.getByText('1/4 sections sourced')).toBeTruthy();
  });

  it('renders recruiter tier without annotations', () => {
    mockResolveReturn = {
      data: {
        ...MOCK_STORY,
        tier: 'recruiter',
        content: { ...MOCK_STORY.content, annotations: [] },
      },
      isLoading: false,
      isError: false,
      error: null,
    };

    renderPage();
    expect(screen.getByText('Full Story')).toBeTruthy();
    // No margin annotations
    expect(screen.queryByText('Author Notes')).toBeNull();
  });

  it('renders public tier with CTA and truncated preview', () => {
    mockResolveReturn = {
      data: {
        ...MOCK_STORY,
        tier: 'public',
        content: {
          ...MOCK_STORY.content,
          sources: [],
          annotations: [],
          sourceCoverage: undefined,
        },
      },
      isLoading: false,
      isError: false,
      error: null,
    };

    renderPage();
    expect(screen.getByText('Preview')).toBeTruthy();
    expect(screen.getByText('Want the complete story?')).toBeTruthy();
    // No source coverage bar for public
    expect(screen.queryByText(/sections sourced/)).toBeNull();
  });

  it('renders story without archetype or category gracefully', () => {
    mockResolveReturn = {
      data: {
        ...MOCK_STORY,
        content: { ...MOCK_STORY.content, archetype: null, category: null },
      },
      isLoading: false,
      isError: false,
      error: null,
    };

    renderPage();
    // Should still render title — no crash from null archetype/category
    expect(screen.getByText('Migrated auth service to OAuth2')).toBeTruthy();
  });

  it('handles SHARE framework with 5 sections', () => {
    mockResolveReturn = {
      data: {
        ...MOCK_STORY,
        content: {
          ...MOCK_STORY.content,
          framework: 'SHARE',
          sections: {
            situation: { summary: 'Context.' },
            hindrances: { summary: 'Obstacles.' },
            actions: { summary: 'What we did.' },
            results: { summary: 'Outcome.' },
            evaluation: { summary: 'Reflection.' },
          },
          sources: [],
          annotations: [],
        },
      },
      isLoading: false,
      isError: false,
      error: null,
    };

    renderPage();
    expect(screen.getByText('Situation')).toBeTruthy();
    expect(screen.getByText('Hindrances')).toBeTruthy();
    expect(screen.getByText('Actions')).toBeTruthy();
    expect(screen.getByText('Results')).toBeTruthy();
    expect(screen.getByText('Evaluation')).toBeTruthy();
  });
});
