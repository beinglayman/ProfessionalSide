import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within, cleanup, act } from '@testing-library/react';
import React from 'react';
import { ErrorConsole } from './ErrorConsole';
import { ErrorConsoleProvider, useErrorConsole } from '../../contexts/ErrorConsoleContext';

// Helper to render with provider
const renderWithProvider = (ui: React.ReactElement) => {
  return render(<ErrorConsoleProvider>{ui}</ErrorConsoleProvider>);
};

// Component to open console and add test data
const TestHarness: React.FC<{
  autoOpen?: boolean;
  addErrors?: number;
  addTraces?: number;
}> = ({ autoOpen = true, addErrors = 0, addTraces = 0 }) => {
  const { openConsole, captureError, startTrace, endTrace, failTrace } = useErrorConsole();
  const initialized = React.useRef(false);

  React.useLayoutEffect(() => {
    // Prevent double-initialization in StrictMode
    if (initialized.current) return;
    initialized.current = true;

    if (autoOpen) {
      openConsole();
    }

    for (let i = 0; i < addErrors; i++) {
      captureError({
        source: `TestSource${i}`,
        message: `Test error message ${i}`,
        severity: i % 2 === 0 ? 'error' : 'warn',
      });
    }

    for (let i = 0; i < addTraces; i++) {
      const traceId = startTrace({
        method: i % 2 === 0 ? 'GET' : 'POST',
        url: `/api/test/${i}`,
      });
      if (i % 3 === 0) {
        failTrace(traceId, { message: 'Test error' }, { status: 500, statusText: 'Server Error' });
      } else {
        endTrace(traceId, { status: 200, statusText: 'OK', data: { id: i } });
      }
    }
  }, [autoOpen, addErrors, addTraces, openConsole, captureError, startTrace, endTrace, failTrace]);

  return <ErrorConsole />;
};

describe('ErrorConsole', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    // Mock clipboard for all tests
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  describe('Rendering', () => {
    it('does not render when closed', () => {
      renderWithProvider(<TestHarness autoOpen={false} />);
      expect(screen.queryByText('Debug Console')).not.toBeInTheDocument();
    });

    it('renders when open', () => {
      renderWithProvider(<TestHarness autoOpen={true} />);
      expect(screen.getByText('Debug Console')).toBeInTheDocument();
    });

    it('shows Errors and Traces tabs', () => {
      renderWithProvider(<TestHarness autoOpen={true} />);
      expect(screen.getByRole('button', { name: /errors/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /traces/i })).toBeInTheDocument();
    });

    it('shows empty state when no errors', () => {
      renderWithProvider(<TestHarness autoOpen={true} addErrors={0} />);
      expect(screen.getByText('No errors captured')).toBeInTheDocument();
    });

    it('shows error items when errors exist', () => {
      renderWithProvider(<TestHarness autoOpen={true} addErrors={2} />);
      expect(screen.getByText('Test error message 0')).toBeInTheDocument();
      expect(screen.getByText('Test error message 1')).toBeInTheDocument();
    });
  });

  describe('Tab Switching', () => {
    it('switches to Traces tab', () => {
      renderWithProvider(<TestHarness autoOpen={true} addTraces={2} />);

      const tracesTab = screen.getByRole('button', { name: /traces/i });
      fireEvent.click(tracesTab);

      expect(screen.getByText('/api/test/0')).toBeInTheDocument();
    });

    it('shows empty trace state when no traces', () => {
      renderWithProvider(<TestHarness autoOpen={true} addTraces={0} />);

      const tracesTab = screen.getByRole('button', { name: /traces/i });
      fireEvent.click(tracesTab);

      expect(screen.getByText('No API requests captured')).toBeInTheDocument();
    });
  });

  describe('Filtering', () => {
    it('filters errors by severity', () => {
      renderWithProvider(<TestHarness autoOpen={true} addErrors={4} />);

      // All errors visible initially
      expect(screen.getByText('Test error message 0')).toBeInTheDocument();
      expect(screen.getByText('Test error message 1')).toBeInTheDocument();

      // Filter to only errors (even indices are 'error', odd are 'warn')
      const filterSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(filterSelect, { target: { value: 'error' } });

      // Only error severity should be visible
      expect(screen.getByText('Test error message 0')).toBeInTheDocument();
      expect(screen.getByText('Test error message 2')).toBeInTheDocument();
      expect(screen.queryByText('Test error message 1')).not.toBeInTheDocument();
    });
  });

  describe('Search', () => {
    it('filters errors by search query', () => {
      renderWithProvider(<TestHarness autoOpen={true} addErrors={3} />);

      const searchInput = screen.getByPlaceholderText('Search errors...');
      fireEvent.change(searchInput, { target: { value: 'message 1' } });

      expect(screen.queryByText('Test error message 0')).not.toBeInTheDocument();
      expect(screen.getByText('Test error message 1')).toBeInTheDocument();
      expect(screen.queryByText('Test error message 2')).not.toBeInTheDocument();
    });

    it('search is case insensitive', () => {
      renderWithProvider(<TestHarness autoOpen={true} addErrors={2} />);

      const searchInput = screen.getByPlaceholderText('Search errors...');
      fireEvent.change(searchInput, { target: { value: 'TESTSOURCE0' } });

      expect(screen.getByText('Test error message 0')).toBeInTheDocument();
    });
  });

  describe('Clear', () => {
    it('clears errors when Clear button clicked on Errors tab', () => {
      renderWithProvider(<TestHarness autoOpen={true} addErrors={2} />);

      expect(screen.getByText('Test error message 0')).toBeInTheDocument();

      const clearButton = screen.getByTitle('Clear errors');
      fireEvent.click(clearButton);

      expect(screen.getByText('No errors captured')).toBeInTheDocument();
    });
  });

  describe('Export', () => {
    it('calls export functionality when Export button clicked', () => {
      renderWithProvider(<TestHarness autoOpen={true} addErrors={1} />);

      // Just verify the button exists and can be clicked
      const exportButton = screen.getByTitle('Export all as JSON');
      expect(exportButton).toBeInTheDocument();

      // Click should not throw
      expect(() => fireEvent.click(exportButton)).not.toThrow();
    });
  });

  describe('Simulate Menu', () => {
    it('opens simulate menu on click', () => {
      renderWithProvider(<TestHarness autoOpen={true} />);

      const simulateButton = screen.getByTitle('Simulate errors for testing');
      fireEvent.click(simulateButton);

      expect(screen.getByText('Frontend Errors')).toBeInTheDocument();
      expect(screen.getByText('API Errors')).toBeInTheDocument();
      expect(screen.getByText('console.error')).toBeInTheDocument();
    });

    it('closes simulate menu after clicking toggle again', () => {
      renderWithProvider(<TestHarness autoOpen={true} />);

      const simulateButton = screen.getByTitle('Simulate errors for testing');

      // Open menu
      fireEvent.click(simulateButton);
      expect(screen.getByText('Frontend Errors')).toBeInTheDocument();

      // Close menu by clicking toggle again
      fireEvent.click(simulateButton);
      expect(screen.queryByText('Frontend Errors')).not.toBeInTheDocument();
    });
  });

  describe('Error Item', () => {
    it('expands error details on click', () => {
      renderWithProvider(<TestHarness autoOpen={true} addErrors={1} />);

      // Initially collapsed - URL should not be visible
      expect(screen.queryByText(/URL:/)).not.toBeInTheDocument();

      // Click on the error item to expand
      const errorItem = screen.getByText('Test error message 0');
      fireEvent.click(errorItem);

      // Now URL should be visible
      expect(screen.getByText(/URL:/)).toBeInTheDocument();
    });

    it('copies error to clipboard on copy button click', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: writeTextMock },
        writable: true,
        configurable: true,
      });

      renderWithProvider(<TestHarness autoOpen={true} addErrors={1} />);

      const copyButton = screen.getByTitle('Copy error details');
      fireEvent.click(copyButton);

      // Wait for async clipboard operation
      await vi.waitFor(() => {
        expect(writeTextMock).toHaveBeenCalled();
      });

      const copiedData = JSON.parse(writeTextMock.mock.calls[0][0] as string);
      expect(copiedData.message).toBe('Test error message 0');
    });
  });

  describe('Trace Item', () => {
    it('shows method and URL', () => {
      renderWithProvider(<TestHarness autoOpen={true} addTraces={2} />);

      fireEvent.click(screen.getByRole('button', { name: /traces/i }));

      expect(screen.getByText('GET')).toBeInTheDocument();
      expect(screen.getByText('POST')).toBeInTheDocument();
      expect(screen.getByText('/api/test/0')).toBeInTheDocument();
      expect(screen.getByText('/api/test/1')).toBeInTheDocument();
    });

    it('shows status code badges', () => {
      renderWithProvider(<TestHarness autoOpen={true} addTraces={3} />);

      fireEvent.click(screen.getByRole('button', { name: /traces/i }));

      // Trace 0 is failed (500), traces 1 and 2 are success (200)
      expect(screen.getByText('500')).toBeInTheDocument();
      expect(screen.getAllByText('200')).toHaveLength(2);
    });

    it('expands trace details on click', () => {
      renderWithProvider(<TestHarness autoOpen={true} addTraces={1} />);

      fireEvent.click(screen.getByRole('button', { name: /traces/i }));

      // Click on trace to expand
      fireEvent.click(screen.getByText('/api/test/0'));

      // Should show Response section
      expect(screen.getByText('Response')).toBeInTheDocument();
    });
  });

  describe('Error and Trace Counts', () => {
    it('shows error count badge', () => {
      renderWithProvider(<TestHarness autoOpen={true} addErrors={5} />);

      // Should show count on Errors tab
      const errorsTab = screen.getByRole('button', { name: /errors/i });
      expect(within(errorsTab).getByText('5')).toBeInTheDocument();
    });

    it('shows trace count badge', () => {
      renderWithProvider(<TestHarness autoOpen={true} addTraces={3} />);

      // Should show count on Traces tab
      const tracesTab = screen.getByRole('button', { name: /traces/i });
      expect(within(tracesTab).getByText('3')).toBeInTheDocument();
    });

    it('shows severity breakdown badges', () => {
      renderWithProvider(<TestHarness autoOpen={true} addErrors={4} />);

      // 2 errors (indices 0, 2) and 2 warnings (indices 1, 3)
      expect(screen.getByText('2 err')).toBeInTheDocument();
      expect(screen.getByText('2 warn')).toBeInTheDocument();
    });
  });

  describe('Keyboard shortcut hint', () => {
    it('shows Cmd+E hint', () => {
      renderWithProvider(<TestHarness autoOpen={true} />);
      expect(screen.getByText('Cmd+E')).toBeInTheDocument();
    });
  });

  describe('Footer', () => {
    it('shows capture description for errors tab', () => {
      renderWithProvider(<TestHarness autoOpen={true} />);
      expect(
        screen.getByText(/console\.error, console\.warn, unhandled exceptions/)
      ).toBeInTheDocument();
    });

    it('shows capture description for traces tab', () => {
      renderWithProvider(<TestHarness autoOpen={true} />);

      fireEvent.click(screen.getByRole('button', { name: /traces/i }));

      expect(
        screen.getByText(/All API requests with full request\/response data/)
      ).toBeInTheDocument();
    });
  });
});
