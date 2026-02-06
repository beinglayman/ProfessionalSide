import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ArchetypeSelector } from './ArchetypeSelector';

const mockAlternatives = [
  { archetype: 'firefighter' as const, confidence: 0.6 },
  { archetype: 'multiplier' as const, confidence: 0.4 },
];

describe('ArchetypeSelector', () => {
  it('renders trigger with selected archetype', () => {
    render(
      <ArchetypeSelector
        value="architect"
        onChange={() => {}}
        detected="architect"
        alternatives={mockAlternatives}
      />
    );
    expect(screen.getByTestId('archetype-selector')).toHaveTextContent('Architect');
  });

  it('opens dropdown on click', async () => {
    const user = userEvent.setup();
    render(
      <ArchetypeSelector
        value="architect"
        onChange={() => {}}
        detected="architect"
        alternatives={mockAlternatives}
      />
    );
    await user.click(screen.getByTestId('archetype-selector'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('shows detected + alternatives in default view', async () => {
    const user = userEvent.setup();
    render(
      <ArchetypeSelector
        value="architect"
        onChange={() => {}}
        detected="architect"
        alternatives={mockAlternatives}
      />
    );
    await user.click(screen.getByTestId('archetype-selector'));
    // "Architect" appears in trigger + dropdown, so use getAllByText
    expect(screen.getAllByText('Architect').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Firefighter')).toBeInTheDocument();
    expect(screen.getByText('Multiplier')).toBeInTheDocument();
  });

  it('calls onChange when an option is selected', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <ArchetypeSelector
        value="architect"
        onChange={onChange}
        detected="architect"
        alternatives={mockAlternatives}
      />
    );
    await user.click(screen.getByTestId('archetype-selector'));
    await user.click(screen.getByText('Firefighter'));
    expect(onChange).toHaveBeenCalledWith('firefighter');
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    render(
      <ArchetypeSelector
        value="architect"
        onChange={() => {}}
        detected="architect"
        alternatives={mockAlternatives}
      />
    );
    await user.click(screen.getByTestId('archetype-selector'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('shows all archetypes when "Show all" is clicked', async () => {
    const user = userEvent.setup();
    render(
      <ArchetypeSelector
        value="architect"
        onChange={() => {}}
        detected="architect"
        alternatives={mockAlternatives}
      />
    );
    await user.click(screen.getByTestId('archetype-selector'));
    await user.click(screen.getByText(/show all/i));
    expect(screen.getByText('Pioneer')).toBeInTheDocument();
    expect(screen.getByText('Detective')).toBeInTheDocument();
    expect(screen.getByText('Diplomat')).toBeInTheDocument();
  });

  it('closes dropdown on click outside', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <div data-testid="outside">Outside</div>
        <ArchetypeSelector
          value="architect"
          onChange={() => {}}
          detected="architect"
          alternatives={mockAlternatives}
        />
      </div>
    );
    await user.click(screen.getByTestId('archetype-selector'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    await user.click(screen.getByTestId('outside'));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('resets showAll state when reopened', async () => {
    const user = userEvent.setup();
    render(
      <ArchetypeSelector
        value="architect"
        onChange={() => {}}
        detected="architect"
        alternatives={mockAlternatives}
      />
    );
    // Open, show all, close via Escape
    await user.click(screen.getByTestId('archetype-selector'));
    await user.click(screen.getByText(/show all/i));
    expect(screen.getByText('Pioneer')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    // Reopen — should show default view (not "show all")
    await user.click(screen.getByTestId('archetype-selector'));
    expect(screen.queryByText('Pioneer')).not.toBeInTheDocument();
    expect(screen.getByText(/show all/i)).toBeInTheDocument();
  });

  it('handles empty alternatives gracefully', async () => {
    const user = userEvent.setup();
    render(
      <ArchetypeSelector
        value="architect"
        onChange={() => {}}
        detected="architect"
        alternatives={[]}
      />
    );
    await user.click(screen.getByTestId('archetype-selector'));
    // Should only show the detected archetype
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(1);
  });

  it('does not open when disabled', async () => {
    const user = userEvent.setup();
    render(
      <ArchetypeSelector
        value="architect"
        onChange={() => {}}
        detected="architect"
        alternatives={mockAlternatives}
        disabled
      />
    );
    await user.click(screen.getByTestId('archetype-selector'));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('shows archetype descriptions in dropdown', async () => {
    const user = userEvent.setup();
    render(
      <ArchetypeSelector
        value="architect"
        onChange={() => {}}
        detected="architect"
        alternatives={mockAlternatives}
      />
    );
    await user.click(screen.getByTestId('archetype-selector'));
    expect(screen.getByText('Designs lasting solutions')).toBeInTheDocument();
    expect(screen.getByText('Crisis response')).toBeInTheDocument();
  });
});
