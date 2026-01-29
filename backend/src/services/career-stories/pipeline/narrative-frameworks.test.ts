/**
 * Narrative Frameworks Tests
 *
 * Tests for framework registry and recommendation logic.
 */

import { describe, it, expect } from 'vitest';
import {
  NARRATIVE_FRAMEWORKS,
  getAllFrameworks,
  getFramework,
  recommendFrameworks,
  QUESTION_TO_FRAMEWORK,
} from './narrative-frameworks';
import { NarrativeFrameworkType } from './types';

describe('Narrative Frameworks', () => {
  describe('NARRATIVE_FRAMEWORKS', () => {
    it('contains all 8 framework types', () => {
      const types: NarrativeFrameworkType[] = [
        'STAR', 'STARL', 'CAR', 'PAR', 'SAR', 'SOAR', 'SHARE', 'CARL',
      ];

      for (const type of types) {
        expect(NARRATIVE_FRAMEWORKS[type]).toBeDefined();
        expect(NARRATIVE_FRAMEWORKS[type].type).toBe(type);
      }
    });

    it('each framework has required fields', () => {
      for (const framework of Object.values(NARRATIVE_FRAMEWORKS)) {
        expect(framework.name).toBeTruthy();
        expect(framework.tagline).toBeTruthy();
        expect(framework.description).toBeTruthy();
        expect(framework.componentOrder.length).toBeGreaterThan(0);
        expect(framework.bestFor.length).toBeGreaterThan(0);
        expect(framework.componentDefinitions.length).toBeGreaterThan(0);
        expect(framework.example.context).toBeTruthy();
        expect(framework.example.components.length).toBe(framework.componentOrder.length);
      }
    });

    it('component definitions match component order', () => {
      for (const framework of Object.values(NARRATIVE_FRAMEWORKS)) {
        const definedNames = framework.componentDefinitions.map((c) => c.name);
        expect(definedNames).toEqual(framework.componentOrder);
      }
    });

    it('example components match component order', () => {
      for (const framework of Object.values(NARRATIVE_FRAMEWORKS)) {
        const exampleNames = framework.example.components.map((c) => c.name);
        expect(exampleNames).toEqual(framework.componentOrder);
      }
    });
  });

  describe('getAllFrameworks', () => {
    it('returns all 8 frameworks', () => {
      const frameworks = getAllFrameworks();
      expect(frameworks).toHaveLength(8);
    });

    it('returns array of framework definitions', () => {
      const frameworks = getAllFrameworks();
      for (const fw of frameworks) {
        expect(fw.type).toBeDefined();
        expect(fw.componentDefinitions).toBeDefined();
      }
    });
  });

  describe('getFramework', () => {
    it('returns correct framework by type', () => {
      const star = getFramework('STAR');
      expect(star.type).toBe('STAR');
      expect(star.componentOrder).toEqual(['situation', 'task', 'action', 'result']);

      const carl = getFramework('CARL');
      expect(carl.type).toBe('CARL');
      expect(carl.componentOrder).toEqual(['context', 'action', 'result', 'learning']);
    });

    it('returns framework with UI content', () => {
      const star = getFramework('STAR');
      expect(star.tagline).toBeTruthy();
      expect(star.example).toBeDefined();
      expect(star.recommendWhen).toBeDefined();
    });
  });

  describe('recommendFrameworks', () => {
    it('recommends STAR for software engineer role', () => {
      const recommendations = recommendFrameworks({ role: 'Software Engineer' });
      expect(recommendations).toContain('STAR');
    });

    it('recommends CARL for failure story type', () => {
      const recommendations = recommendFrameworks({ storyType: 'Failure' });
      expect(recommendations).toContain('CARL');
      expect(recommendations).toContain('STARL');
    });

    it('recommends SOAR for Product Manager role', () => {
      const recommendations = recommendFrameworks({ role: 'Product Manager' });
      expect(recommendations).toContain('SOAR');
    });

    it('recommends PAR for technical interview', () => {
      const recommendations = recommendFrameworks({ interviewType: 'Technical' });
      expect(recommendations).toContain('PAR');
      expect(recommendations).toContain('CAR');
    });

    it('recommends SHARE for leadership interview', () => {
      const recommendations = recommendFrameworks({ interviewType: 'Leadership' });
      expect(recommendations).toContain('SHARE');
    });

    it('combines multiple context factors', () => {
      const recommendations = recommendFrameworks({
        role: 'Engineering Manager',
        interviewType: 'Behavioral',
        storyType: 'Team building',
      });
      // Multiple frameworks can match - SHARE and STARL both match manager + behavioral
      expect(recommendations).toContain('SHARE');
      expect(recommendations).toContain('STARL');
      expect(recommendations.length).toBeGreaterThan(1);
    });

    it('returns empty array for no matches', () => {
      const recommendations = recommendFrameworks({
        role: 'Astronaut',
        interviewType: 'Space Mission',
        storyType: 'Zero Gravity',
      });
      expect(recommendations).toHaveLength(0);
    });

    it('handles partial context', () => {
      const byRoleOnly = recommendFrameworks({ role: 'Software Engineer' });
      expect(byRoleOnly.length).toBeGreaterThan(0);

      const byTypeOnly = recommendFrameworks({ storyType: 'Achievement' });
      expect(byTypeOnly.length).toBeGreaterThan(0);
    });

    it('is case-insensitive', () => {
      const lower = recommendFrameworks({ role: 'software engineer' });
      const upper = recommendFrameworks({ role: 'SOFTWARE ENGINEER' });
      expect(lower).toEqual(upper);
    });
  });

  describe('QUESTION_TO_FRAMEWORK', () => {
    it('maps common interview questions', () => {
      expect(QUESTION_TO_FRAMEWORK['Tell me about yourself']).toBe('SAR');
      expect(QUESTION_TO_FRAMEWORK['Tell me about a time you failed']).toBe('CARL');
      expect(QUESTION_TO_FRAMEWORK['Tell me about a technical problem']).toBe('PAR');
      expect(QUESTION_TO_FRAMEWORK['Walk me through a project']).toBe('STAR');
    });

    it('maps failure questions to CARL', () => {
      expect(QUESTION_TO_FRAMEWORK['Tell me about a time you failed']).toBe('CARL');
      expect(QUESTION_TO_FRAMEWORK['Tell me about a mistake']).toBe('CARL');
    });

    it('maps leadership questions to SHARE', () => {
      expect(QUESTION_TO_FRAMEWORK['Tell me about a time you led']).toBe('SHARE');
    });

    it('maps learning questions to STARL', () => {
      expect(QUESTION_TO_FRAMEWORK['What did you learn from']).toBe('STARL');
    });
  });

  describe('framework content quality', () => {
    it('STAR example has quantified result', () => {
      const star = getFramework('STAR');
      const result = star.example.components.find((c) => c.name === 'result');
      expect(result?.text).toMatch(/\d+%|\d+ms|\d+ ?(users?|weeks?)/i);
    });

    it('CARL example shows learning from failure', () => {
      const carl = getFramework('CARL');
      const learning = carl.example.components.find((c) => c.name === 'learning');
      expect(learning?.text).toBeTruthy();
      expect(carl.example.components.find((c) => c.name === 'result')?.text).toContain('corrupted');
    });

    it('SHARE example has collaboration focus', () => {
      const share = getFramework('SHARE');
      expect(share.bestFor).toContain('Collaboration stories');
      expect(share.example.context).toContain('team');
    });

    it('component prompts are helpful', () => {
      for (const framework of Object.values(NARRATIVE_FRAMEWORKS)) {
        for (const comp of framework.componentDefinitions) {
          expect(comp.prompt).toBeTruthy();
          expect(comp.prompt.endsWith('?') || comp.prompt.endsWith('.')).toBe(true);
        }
      }
    });
  });
});
