import { describe, it, expect } from 'vitest';
import { TOOL_METADATA, ToolKey, getToolName } from './tools';
import { TOOL_ICONS, ToolType } from '../types/career-stories';
import { SUPPORTED_SOURCES } from '../types/activity';

describe('TOOL_METADATA', () => {
  it('has all expected tool keys', () => {
    const keys = Object.keys(TOOL_METADATA);
    // Core dev/project tools
    expect(keys).toContain('github');
    expect(keys).toContain('jira');
    expect(keys).toContain('confluence');
    // Communication
    expect(keys).toContain('slack');
    expect(keys).toContain('outlook');
    // Design
    expect(keys).toContain('figma');
    // Google granular keys (hyphen convention)
    expect(keys).toContain('google');
    expect(keys).toContain('google-calendar');
    expect(keys).toContain('google-docs');
    expect(keys).toContain('google-drive');
    expect(keys).toContain('google-meet');
    expect(keys).toContain('google-sheets');
    // MCP aggregate key (underscore convention)
    expect(keys).toContain('google_workspace');
    // Fallback
    expect(keys).toContain('generic');
  });

  it('each entry has name, color, and description', () => {
    Object.entries(TOOL_METADATA).forEach(([key, meta]) => {
      expect(meta.name, `${key}.name`).toBeTruthy();
      expect(meta.color, `${key}.color`).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(meta.description, `${key}.description`).toBeTruthy();
    });
  });

  it('has at least 15 tools registered', () => {
    expect(Object.keys(TOOL_METADATA).length).toBeGreaterThanOrEqual(15);
  });
});

describe('getToolName', () => {
  it('returns display name for known tools', () => {
    expect(getToolName('github')).toBe('GitHub');
    expect(getToolName('jira')).toBe('Jira');
    expect(getToolName('google-calendar')).toBe('Google Calendar');
    expect(getToolName('google_workspace')).toBe('Google Workspace');
  });

  it('returns raw key as fallback for unknown tools', () => {
    expect(getToolName('nonexistent-tool')).toBe('nonexistent-tool');
    expect(getToolName('')).toBe('');
  });
});

describe('Derived maps stay in sync with TOOL_METADATA', () => {
  describe('TOOL_ICONS (career-stories)', () => {
    it('every TOOL_ICONS key exists in TOOL_METADATA', () => {
      Object.keys(TOOL_ICONS).forEach((key) => {
        expect(
          TOOL_METADATA[key as ToolKey],
          `TOOL_ICONS key "${key}" not found in TOOL_METADATA`
        ).toBeDefined();
      });
    });

    it('every TOOL_ICONS entry derives name and color from TOOL_METADATA', () => {
      (Object.keys(TOOL_ICONS) as ToolType[]).forEach((key) => {
        const icon = TOOL_ICONS[key];
        const meta = TOOL_METADATA[key as ToolKey];
        expect(icon.name, `${key}.name`).toBe(meta.name);
        expect(icon.color, `${key}.color`).toBe(meta.color);
      });
    });
  });

  describe('SUPPORTED_SOURCES (activity)', () => {
    it('every SUPPORTED_SOURCES key exists in TOOL_METADATA', () => {
      Object.keys(SUPPORTED_SOURCES).forEach((key) => {
        expect(
          TOOL_METADATA[key as ToolKey],
          `SUPPORTED_SOURCES key "${key}" not found in TOOL_METADATA`
        ).toBeDefined();
      });
    });

    it('every SUPPORTED_SOURCES entry derives displayName and color from TOOL_METADATA', () => {
      Object.entries(SUPPORTED_SOURCES).forEach(([key, source]) => {
        const meta = TOOL_METADATA[key as ToolKey];
        expect(source.displayName, `${key}.displayName`).toBe(meta.name);
        expect(source.color, `${key}.color`).toBe(meta.color);
      });
    });
  });
});
