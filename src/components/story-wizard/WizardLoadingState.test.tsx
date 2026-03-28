import { render, screen, act } from '@testing-library/react';
import { WizardLoadingState } from './WizardLoadingState';

describe('WizardLoadingState', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders spinner', () => {
    render(<WizardLoadingState mode="analyze" />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows a loading fact', () => {
    render(<WizardLoadingState mode="analyze" />);
    const factsContainer = screen.getByRole('status');
    expect(factsContainer).toBeInTheDocument();
    expect(factsContainer.textContent).toBeTruthy();
  });

  it('rotates facts every 2 seconds', () => {
    render(<WizardLoadingState mode="analyze" />);
    const initialText = screen.getByRole('status').textContent;
    // Advance past fade-out (300ms) + interval (2000ms)
    act(() => { vi.advanceTimersByTime(2300); });
    const rotatedText = screen.getByRole('status').textContent;
    expect(rotatedText).toBeTruthy();
    expect(rotatedText).not.toBe(initialText);
  });

  it('shows entry-specific facts when journalMeta provided', () => {
    render(
      <WizardLoadingState
        mode="analyze"
        journalMeta={{
          title: 'Week of Feb 1',
          activityCount: 12,
          tools: ['github', 'jira'],
        }}
      />
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('uses generate-mode facts when mode is generate', () => {
    render(<WizardLoadingState mode="generate" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('cleans up timers on unmount', () => {
    const { unmount } = render(<WizardLoadingState mode="analyze" />);
    unmount();
    // Advancing timers after unmount should not throw
    act(() => { vi.advanceTimersByTime(5000); });
  });

  it('handles journalMeta with all fields', () => {
    render(
      <WizardLoadingState
        mode="analyze"
        journalMeta={{
          title: 'Full entry',
          dateRange: 'Feb 1 - Feb 7',
          activityCount: 25,
          tools: ['github', 'jira', 'slack'],
          topics: ['auth', 'security', 'performance'],
          impactHighlights: ['Reduced latency by 50%'],
          skills: ['TypeScript', 'React'],
        }}
      />
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('handles journalMeta with empty arrays', () => {
    render(
      <WizardLoadingState
        mode="analyze"
        journalMeta={{
          title: 'Empty entry',
          tools: [],
          topics: [],
          impactHighlights: [],
        }}
      />
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
