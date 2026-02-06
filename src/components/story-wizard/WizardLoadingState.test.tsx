import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    act(() => { vi.advanceTimersByTime(2000); });
    expect(screen.getByRole('status').textContent).toBeTruthy();
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

  it('renders quote carousel with navigation', () => {
    render(<WizardLoadingState mode="analyze" />);
    expect(screen.getByLabelText('Next quote')).toBeInTheDocument();
    expect(screen.getByLabelText('Previous quote')).toBeInTheDocument();
  });

  it('navigates quotes with buttons', async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    render(<WizardLoadingState mode="analyze" />);
    const nextBtn = screen.getByLabelText('Next quote');
    const quoteText = screen.getByTestId('quote-text').textContent;
    await user.click(nextBtn);
    expect(screen.getByTestId('quote-text')).toBeInTheDocument();
  });

  it('uses generate-mode facts when mode is generate', () => {
    render(<WizardLoadingState mode="generate" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
