import { describe, it, expect } from 'vitest';
import {
  BREAKPOINTS,
  TIMING,
  DISPLAY_LIMITS,
  CONFIDENCE_THRESHOLDS,
  MOBILE_SHEET_MAX_HEIGHT_VH,
} from './constants';

describe('Career Stories Constants', () => {
  describe('BREAKPOINTS', () => {
    it('has valid mobile breakpoint', () => {
      expect(BREAKPOINTS.MOBILE).toBe(768);
      expect(typeof BREAKPOINTS.MOBILE).toBe('number');
    });

    it('has valid desktop breakpoint matching Tailwind lg:', () => {
      expect(BREAKPOINTS.DESKTOP).toBe(1024);
    });

    it('desktop is larger than mobile', () => {
      expect(BREAKPOINTS.DESKTOP).toBeGreaterThan(BREAKPOINTS.MOBILE);
    });
  });

  describe('TIMING', () => {
    it('has reasonable copy feedback duration', () => {
      expect(TIMING.COPY_FEEDBACK_MS).toBeGreaterThan(1000);
      expect(TIMING.COPY_FEEDBACK_MS).toBeLessThan(5000);
    });

    it('has reasonable resize debounce', () => {
      expect(TIMING.RESIZE_DEBOUNCE_MS).toBeGreaterThan(50);
      expect(TIMING.RESIZE_DEBOUNCE_MS).toBeLessThan(500);
    });
  });

  describe('DISPLAY_LIMITS', () => {
    it('tool icon limits are sensible', () => {
      expect(DISPLAY_LIMITS.TOOL_ICONS_CLUSTER).toBeGreaterThan(0);
      expect(DISPLAY_LIMITS.TOOL_ICONS_PREVIEW).toBeGreaterThan(0);
      expect(DISPLAY_LIMITS.TOOL_ICONS_CLUSTER).toBeGreaterThanOrEqual(DISPLAY_LIMITS.TOOL_ICONS_PREVIEW);
    });

    it('has multiple skeleton cards for loading state', () => {
      expect(DISPLAY_LIMITS.SKELETON_CARDS).toBeGreaterThan(1);
    });
  });

  describe('CONFIDENCE_THRESHOLDS', () => {
    it('high threshold is greater than medium', () => {
      expect(CONFIDENCE_THRESHOLDS.HIGH).toBeGreaterThan(CONFIDENCE_THRESHOLDS.MEDIUM);
    });

    it('thresholds are between 0 and 1', () => {
      expect(CONFIDENCE_THRESHOLDS.HIGH).toBeGreaterThan(0);
      expect(CONFIDENCE_THRESHOLDS.HIGH).toBeLessThanOrEqual(1);
      expect(CONFIDENCE_THRESHOLDS.MEDIUM).toBeGreaterThan(0);
      expect(CONFIDENCE_THRESHOLDS.MEDIUM).toBeLessThan(1);
    });

    it('high threshold matches 0.8 for green', () => {
      expect(CONFIDENCE_THRESHOLDS.HIGH).toBe(0.8);
    });

    it('medium threshold matches 0.5 for yellow', () => {
      expect(CONFIDENCE_THRESHOLDS.MEDIUM).toBe(0.5);
    });
  });

  describe('MOBILE_SHEET_MAX_HEIGHT_VH', () => {
    it('is a reasonable viewport height percentage', () => {
      expect(MOBILE_SHEET_MAX_HEIGHT_VH).toBeGreaterThan(50);
      expect(MOBILE_SHEET_MAX_HEIGHT_VH).toBeLessThanOrEqual(100);
    });
  });
});
