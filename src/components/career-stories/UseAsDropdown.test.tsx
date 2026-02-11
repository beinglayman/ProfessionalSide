import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UseAsDropdown, TYPE_REGISTRY } from './UseAsDropdown';
import type { StoryDerivation } from '../../types/career-stories';

// =============================================================================
// TYPE_REGISTRY unit tests
// =============================================================================

describe('TYPE_REGISTRY', () => {
  it('has 10 types total', () => {
    expect(TYPE_REGISTRY).toHaveLength(10);
  });

  it('all keys are unique', () => {
    const keys = TYPE_REGISTRY.map(t => t.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('has 6 packet types and 4 single types', () => {
    const packets = TYPE_REGISTRY.filter(t => t.kind === 'packet');
    const singles = TYPE_REGISTRY.filter(t => t.kind === 'single');
    expect(packets).toHaveLength(6);
    expect(singles).toHaveLength(4);
  });

  it('every type has all required fields', () => {
    TYPE_REGISTRY.forEach(t => {
      expect(t.key).toBeTruthy();
      expect(t.label).toBeTruthy();
      expect(t.description).toBeTruthy();
      expect(t.Icon).toBeDefined();
      expect(t.bg).toMatch(/^bg-/);
      expect(t.iconText).toMatch(/^text-/);
      expect(['single', 'packet']).toContain(t.kind);
      expect(['reviews', 'meetings', 'opportunities', 'sharing']).toContain(t.group);
    });
  });

  it('covers all 4 groups', () => {
    const groups = new Set(TYPE_REGISTRY.map(t => t.group));
    expect(groups).toEqual(new Set(['reviews', 'meetings', 'opportunities', 'sharing']));
  });

  it('packet types include the expected keys', () => {
    const packetKeys = TYPE_REGISTRY.filter(t => t.kind === 'packet').map(t => t.key);
    expect(packetKeys).toContain('promotion');
    expect(packetKeys).toContain('annual-review');
    expect(packetKeys).toContain('skip-level');
    expect(packetKeys).toContain('portfolio-brief');
    expect(packetKeys).toContain('self-assessment');
    expect(packetKeys).toContain('one-on-one');
  });

  it('single types include the expected keys', () => {
    const singleKeys = TYPE_REGISTRY.filter(t => t.kind === 'single').map(t => t.key);
    expect(singleKeys).toContain('interview');
    expect(singleKeys).toContain('linkedin');
    expect(singleKeys).toContain('resume');
    expect(singleKeys).toContain('team-share');
  });
});

// =============================================================================
// Helpers
// =============================================================================

const makeDerivation = (overrides: Partial<StoryDerivation> = {}): StoryDerivation => ({
  id: `d-${Math.random().toString(36).slice(2, 8)}`,
  kind: 'single',
  type: 'interview',
  storyIds: ['s-1'],
  text: 'Test derivation text',
  charCount: 100,
  wordCount: 20,
  creditCost: 1,
  createdAt: '2026-02-10T12:00:00Z',
  ...overrides,
});

/** Click the "Use As" trigger to open the Radix dropdown portal */
async function openDropdown() {
  const user = userEvent.setup();
  const trigger = screen.getByRole('button', { name: /use as/i });
  await user.click(trigger);
  return user;
}

// =============================================================================
// Trigger button tests (no dropdown open needed)
// =============================================================================

describe('UseAsDropdown trigger', () => {
  it('renders trigger button with "Use As" text', () => {
    render(<UseAsDropdown scope="page" onSelect={vi.fn()} />);
    expect(screen.getByText('Use As')).toBeInTheDocument();
  });

  it('shows no badge when no derivations exist', () => {
    const { container } = render(<UseAsDropdown scope="story" onSelect={vi.fn()} />);
    const badge = container.querySelector('[class*="bg-white"]');
    // No version count badge
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('shows version count badge when derivations exist', () => {
    const derivations = [
      makeDerivation({ type: 'interview', createdAt: '2026-02-10T12:00:00Z' }),
      makeDerivation({ type: 'interview', createdAt: '2026-02-09T12:00:00Z' }),
      makeDerivation({ type: 'resume', createdAt: '2026-02-08T12:00:00Z' }),
    ];

    render(
      <UseAsDropdown scope="story" singleDerivations={derivations} onSelect={vi.fn()} />,
    );

    // 3 total derivations across visible types
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});

// =============================================================================
// Dropdown content tests (requires opening the menu)
// =============================================================================

describe('UseAsDropdown scope filtering', () => {
  it('page scope shows only packet type labels', async () => {
    render(<UseAsDropdown scope="page" onSelect={vi.fn()} />);
    await openDropdown();

    expect(screen.getByText('Promotion Case')).toBeInTheDocument();
    expect(screen.getByText('Annual Review')).toBeInTheDocument();
    expect(screen.getByText('Skip-Level Brief')).toBeInTheDocument();

    expect(screen.queryByText('Interview Answer')).not.toBeInTheDocument();
    expect(screen.queryByText('Resume Bullet')).not.toBeInTheDocument();
    expect(screen.queryByText('LinkedIn Post')).not.toBeInTheDocument();
  });

  it('story scope shows only single type labels', async () => {
    render(<UseAsDropdown scope="story" onSelect={vi.fn()} />);
    await openDropdown();

    expect(screen.getByText('Interview Answer')).toBeInTheDocument();
    expect(screen.getByText('Resume Bullet')).toBeInTheDocument();
    expect(screen.getByText('LinkedIn Post')).toBeInTheDocument();
    expect(screen.getByText('Team Update')).toBeInTheDocument();

    expect(screen.queryByText('Promotion Case')).not.toBeInTheDocument();
    expect(screen.queryByText('Annual Review')).not.toBeInTheDocument();
  });
});

describe('UseAsDropdown version display', () => {
  it('shows "Ready" for type with 1 version', async () => {
    const derivations = [makeDerivation({ type: 'interview' })];
    render(<UseAsDropdown scope="story" singleDerivations={derivations} onSelect={vi.fn()} />);
    await openDropdown();

    expect(screen.getByText('Ready')).toBeInTheDocument();
  });

  it('shows "N saved" for type with multiple versions', async () => {
    const derivations = [
      makeDerivation({ type: 'interview', createdAt: '2026-02-10T12:00:00Z' }),
      makeDerivation({ type: 'interview', createdAt: '2026-02-09T12:00:00Z' }),
      makeDerivation({ type: 'interview', createdAt: '2026-02-08T12:00:00Z' }),
    ];
    render(<UseAsDropdown scope="story" singleDerivations={derivations} onSelect={vi.fn()} />);
    await openDropdown();

    expect(screen.getByText('3 saved')).toBeInTheDocument();
  });

  it('shows description for types without versions', async () => {
    render(<UseAsDropdown scope="story" onSelect={vi.fn()} />);
    await openDropdown();

    expect(screen.getByText('Ready to rehearse, ~90 sec')).toBeInTheDocument();
    expect(screen.getByText('Paste, post, done')).toBeInTheDocument();
  });

  it('shows latest date and word count for types with versions', async () => {
    const derivations = [
      makeDerivation({ type: 'interview', createdAt: '2026-02-10T12:00:00Z', wordCount: 150 }),
    ];
    render(<UseAsDropdown scope="story" singleDerivations={derivations} onSelect={vi.fn()} />);
    await openDropdown();

    expect(screen.getByText(/Feb 10/)).toBeInTheDocument();
    expect(screen.getByText(/150 words/)).toBeInTheDocument();
  });

  it('sorts versions newest-first when determining latest', async () => {
    const derivations = [
      makeDerivation({ type: 'interview', createdAt: '2026-01-01T12:00:00Z', wordCount: 100 }),
      makeDerivation({ type: 'interview', createdAt: '2026-02-10T12:00:00Z', wordCount: 200 }),
      makeDerivation({ type: 'interview', createdAt: '2026-01-15T12:00:00Z', wordCount: 150 }),
    ];
    render(<UseAsDropdown scope="story" singleDerivations={derivations} onSelect={vi.fn()} />);
    await openDropdown();

    // Should show Feb 10 (newest), not Jan 1 (first in array)
    expect(screen.getByText(/Feb 10/)).toBeInTheDocument();
    expect(screen.getByText(/200 words/)).toBeInTheDocument();
  });
});

describe('UseAsDropdown group headers', () => {
  it('displays group headers for visible groups', async () => {
    render(<UseAsDropdown scope="page" onSelect={vi.fn()} />);
    await openDropdown();

    expect(screen.getByText('For Reviews')).toBeInTheDocument();
    expect(screen.getByText('For Meetings')).toBeInTheDocument();
    expect(screen.getByText('For Opportunities')).toBeInTheDocument();
  });

  it('does not render groups with no visible items', async () => {
    // story scope has no "reviews" or "meetings" group items
    render(<UseAsDropdown scope="story" onSelect={vi.fn()} />);
    await openDropdown();

    expect(screen.queryByText('For Reviews')).not.toBeInTheDocument();
    expect(screen.queryByText('For Meetings')).not.toBeInTheDocument();
  });
});

describe('UseAsDropdown onSelect', () => {
  it('calls onSelect with correct typeKey and kind for single type', async () => {
    const onSelect = vi.fn();
    render(<UseAsDropdown scope="story" onSelect={onSelect} />);
    const user = await openDropdown();

    await user.click(screen.getByText('Resume Bullet'));
    expect(onSelect).toHaveBeenCalledWith('resume', 'single');
  });

  it('calls onSelect with correct kind for packet types', async () => {
    const onSelect = vi.fn();
    render(<UseAsDropdown scope="page" onSelect={onSelect} />);
    const user = await openDropdown();

    await user.click(screen.getByText('Skip-Level Brief'));
    expect(onSelect).toHaveBeenCalledWith('skip-level', 'packet');
  });

  it('calls onSelect even when type has existing versions', async () => {
    const onSelect = vi.fn();
    const derivations = [makeDerivation({ type: 'interview' })];
    render(
      <UseAsDropdown scope="story" singleDerivations={derivations} onSelect={onSelect} />,
    );
    const user = await openDropdown();

    await user.click(screen.getByText('Interview Answer'));
    expect(onSelect).toHaveBeenCalledWith('interview', 'single');
  });
});
