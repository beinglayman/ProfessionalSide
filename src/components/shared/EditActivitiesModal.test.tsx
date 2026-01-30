/**
 * EditActivitiesModal Tests
 *
 * Tests for the activity editing modal component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditActivitiesModal, EditActivitiesModalProps } from './EditActivitiesModal';
import { ToolActivity } from '../../types/career-stories';

// Mock the dialog component since it uses portal
vi.mock('../ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('EditActivitiesModal', () => {
  const mockActivities: ToolActivity[] = [
    {
      id: 'activity-1',
      source: 'github',
      sourceId: 'pr-123',
      sourceUrl: 'https://github.com/org/repo/pull/123',
      title: 'Fix authentication bug',
      description: 'Fixed login issue',
      timestamp: new Date('2024-01-15'),
      crossToolRefs: ['JIRA-456'],
    },
    {
      id: 'activity-2',
      source: 'jira',
      sourceId: 'JIRA-456',
      sourceUrl: 'https://jira.com/JIRA-456',
      title: 'Authentication bug ticket',
      description: 'Track auth bug',
      timestamp: new Date('2024-01-14'),
      crossToolRefs: [],
    },
    {
      id: 'activity-3',
      source: 'confluence',
      sourceId: 'doc-789',
      sourceUrl: 'https://confluence.com/doc/789',
      title: 'API Documentation',
      description: 'Updated API docs',
      timestamp: new Date('2024-01-13'),
      crossToolRefs: [],
    },
  ];

  const defaultProps: EditActivitiesModalProps = {
    isOpen: true,
    onClose: vi.fn(),
    currentActivityIds: ['activity-1'],
    availableActivities: mockActivities,
    onSave: vi.fn().mockResolvedValue(undefined),
    minActivities: 1,
    title: 'Edit Activities',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal when open', () => {
    render(<EditActivitiesModal {...defaultProps} />);
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByText('Edit Activities')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<EditActivitiesModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('shows current activities in the current column', () => {
    render(<EditActivitiesModal {...defaultProps} />);
    expect(screen.getByText('Current (1)')).toBeInTheDocument();
    expect(screen.getByText('Fix authentication bug')).toBeInTheDocument();
  });

  it('shows available activities in the available column', () => {
    render(<EditActivitiesModal {...defaultProps} />);
    expect(screen.getByText('Available (2)')).toBeInTheDocument();
    expect(screen.getByText('Authentication bug ticket')).toBeInTheDocument();
    expect(screen.getByText('API Documentation')).toBeInTheDocument();
  });

  it('filters available activities by search query', async () => {
    const user = userEvent.setup();
    render(<EditActivitiesModal {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText('Search activities...');
    await user.type(searchInput, 'API');

    expect(screen.getByText('API Documentation')).toBeInTheDocument();
    expect(screen.queryByText('Authentication bug ticket')).not.toBeInTheDocument();
  });

  it('adds activity to current when add button clicked', async () => {
    const user = userEvent.setup();
    render(<EditActivitiesModal {...defaultProps} />);

    // Find the add button for activity-2
    const addButtons = screen.getAllByTitle('Add to current');
    await user.click(addButtons[0]);

    // Should now show 2 current activities
    expect(screen.getByText('Current (2)')).toBeInTheDocument();
  });

  it('removes activity from current when remove button clicked', async () => {
    const user = userEvent.setup();
    render(
      <EditActivitiesModal
        {...defaultProps}
        currentActivityIds={['activity-1', 'activity-2']}
        minActivities={1}
      />
    );

    const removeButtons = screen.getAllByTitle('Remove from current');
    await user.click(removeButtons[0]);

    expect(screen.getByText('Current (1)')).toBeInTheDocument();
  });

  it('disables remove button when at minimum activities', () => {
    render(<EditActivitiesModal {...defaultProps} minActivities={1} />);

    const removeButton = screen.getByTitle('Remove from current');
    expect(removeButton).toBeDisabled();
  });

  it('calls onSave with selected activity IDs', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <EditActivitiesModal
        {...defaultProps}
        onSave={onSave}
        currentActivityIds={['activity-1']}
      />
    );

    // Add an activity
    const addButton = screen.getAllByTitle('Add to current')[0];
    await user.click(addButton);

    // Click save
    const saveButton = screen.getByText('Save Changes');
    await user.click(saveButton);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(['activity-1', 'activity-2']);
    });
  });

  it('disables save button when no changes made', () => {
    render(<EditActivitiesModal {...defaultProps} />);
    const saveButton = screen.getByText('Save Changes');
    expect(saveButton).toBeDisabled();
  });

  it('enables save button when changes made', async () => {
    const user = userEvent.setup();
    render(<EditActivitiesModal {...defaultProps} />);

    const addButton = screen.getAllByTitle('Add to current')[0];
    await user.click(addButton);

    const saveButton = screen.getByText('Save Changes');
    expect(saveButton).not.toBeDisabled();
  });

  it('calls onClose when cancel clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<EditActivitiesModal {...defaultProps} onClose={onClose} />);

    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    expect(onClose).toHaveBeenCalled();
  });

  it('shows saving state during save operation', async () => {
    const user = userEvent.setup();
    let resolvePromise: () => void;
    const savePromise = new Promise<void>((resolve) => {
      resolvePromise = resolve;
    });
    const onSave = vi.fn().mockReturnValue(savePromise);

    render(<EditActivitiesModal {...defaultProps} onSave={onSave} />);

    // Make a change
    const addButton = screen.getAllByTitle('Add to current')[0];
    await user.click(addButton);

    // Click save
    const saveButton = screen.getByText('Save Changes');
    await user.click(saveButton);

    // Should show saving state
    expect(screen.getByText('Saving...')).toBeInTheDocument();

    // Resolve the promise
    resolvePromise!();
  });

  it('shows error message on save failure', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockRejectedValue(new Error('Network error'));

    render(<EditActivitiesModal {...defaultProps} onSave={onSave} />);

    // Make a change
    const addButton = screen.getAllByTitle('Add to current')[0];
    await user.click(addButton);

    // Click save
    const saveButton = screen.getByText('Save Changes');
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('resets state when modal reopens', async () => {
    const { rerender } = render(
      <EditActivitiesModal {...defaultProps} currentActivityIds={['activity-1']} />
    );

    // Close modal
    rerender(<EditActivitiesModal {...defaultProps} isOpen={false} />);

    // Reopen with different data
    rerender(
      <EditActivitiesModal
        {...defaultProps}
        isOpen={true}
        currentActivityIds={['activity-1', 'activity-2']}
      />
    );

    expect(screen.getByText('Current (2)')).toBeInTheDocument();
  });

  it('shows empty state message for no current activities', () => {
    render(<EditActivitiesModal {...defaultProps} currentActivityIds={[]} minActivities={0} />);
    expect(screen.getByText('No activities assigned')).toBeInTheDocument();
  });

  it('shows empty state message when search yields no results', async () => {
    const user = userEvent.setup();
    render(<EditActivitiesModal {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText('Search activities...');
    await user.type(searchInput, 'nonexistent query xyz');

    expect(screen.getByText('No matching activities')).toBeInTheDocument();
  });
});
