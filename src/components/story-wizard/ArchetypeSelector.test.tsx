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
});
