/**
 * Emphasis Renderer
 *
 * Extracted from NarrativeSection — renders text with emphasis patterns:
 * - Metrics: bold + brand purple (highest priority)
 * - Design patterns: uppercase + subtle bg + tooltip
 * - Technical terms: dotted underline + tooltip
 * - Action verbs: bold italic (shows ownership)
 * - Emphasis words: solid underline (stress when speaking)
 *
 * Used by NarrativeSection (stories) and AnnotatedText (derivations).
 */

import React from 'react';
import { DELIVERY_CUES } from './constants';

// Design patterns, methodologies, and techniques (green highlight - golden nuggets)
export const designPatterns: Record<string, string> = {
  // Database patterns
  'shadow table': 'Safe migration pattern - write to both tables during transition',
  'blue-green deployment': 'Zero-downtime deployment with instant rollback',
  'canary release': 'Gradual rollout to subset of users first',
  'feature flag': 'Toggle features without deployment',
  'circuit breaker': 'Prevent cascade failures in distributed systems',
  'bulkhead pattern': 'Isolate failures to prevent system-wide impact',
  'saga pattern': 'Manage distributed transactions across services',
  'cqrs': 'Separate read and write models for scalability',
  'event sourcing': 'Store state changes as sequence of events',
  'strangler fig': 'Gradually replace legacy system',
  // Architecture patterns
  'domain-driven design': 'Model software around business domains',
  'hexagonal architecture': 'Ports and adapters for testability',
  'clean architecture': 'Dependency rule - inner layers don\'t know outer',
  'event-driven': 'Async communication via events',
  'pub-sub': 'Publisher-subscriber messaging pattern',
  'api gateway': 'Single entry point for microservices',
  'service mesh': 'Infrastructure layer for service-to-service communication',
  'sidecar pattern': 'Deploy helper container alongside main container',
  // Data patterns
  'write-ahead log': 'Durability pattern for databases',
  'read replica': 'Scale reads by replicating data',
  'sharding': 'Horizontal partitioning for scale',
  'denormalization': 'Trade storage for query performance',
  'materialized view': 'Pre-computed query results',
  'change data capture': 'Track and propagate data changes',
  'eventual consistency': 'Data converges over time, not instantly',
  // Testing & quality
  'test-driven development': 'Write tests before code',
  'behavior-driven development': 'Tests in business language',
  'contract testing': 'Verify API contracts between services',
  'chaos engineering': 'Deliberately inject failures to test resilience',
  'load shedding': 'Gracefully degrade under heavy load',
  // Process patterns
  'trunk-based development': 'Short-lived branches, frequent integration',
  'gitflow': 'Branch model with develop/release/hotfix',
  'pair programming': 'Two developers, one workstation',
  'mob programming': 'Whole team works together on one task',
  'blameless postmortem': 'Learn from failures without blame',
};

// Technical terms with definitions (dotted underline + tooltip)
export const technicalTerms: Record<string, string> = {
  'api': 'Application Programming Interface',
  'aws': 'Amazon Web Services',
  'gcp': 'Google Cloud Platform',
  'azure': 'Microsoft Azure',
  'ci/cd': 'Continuous Integration/Deployment',
  'docker': 'Container platform',
  'kubernetes': 'Container orchestration',
  'k8s': 'Kubernetes',
  'react': 'Frontend framework',
  'node': 'JavaScript runtime',
  'python': 'Programming language',
  'golang': 'Go programming language',
  'rust': 'Systems programming language',
  'sql': 'Database query language',
  'nosql': 'Non-relational databases',
  'postgresql': 'Relational database',
  'mysql': 'Relational database',
  'mongodb': 'Document database',
  'redis': 'In-memory cache',
  'kafka': 'Distributed streaming platform',
  'rabbitmq': 'Message broker',
  'elasticsearch': 'Search and analytics engine',
  'graphql': 'API query language',
  'grpc': 'High-performance RPC framework',
  'rest': 'API architecture style',
  'microservices': 'Distributed architecture',
  'monolith': 'Single-deployment architecture',
  'terraform': 'Infrastructure as code',
  'ansible': 'Configuration management',
  'jenkins': 'CI/CD automation',
  'github actions': 'CI/CD platform',
  'agile': 'Iterative development',
  'scrum': 'Agile framework',
  'kanban': 'Visual workflow management',
  'sprint': 'Time-boxed iteration',
  'mvp': 'Minimum Viable Product',
  'kpi': 'Key Performance Indicator',
  'okr': 'Objectives and Key Results',
  'saas': 'Software as a Service',
  'paas': 'Platform as a Service',
  'iaas': 'Infrastructure as a Service',
  'latency': 'Response time delay',
  'throughput': 'Processing capacity',
  'scalability': 'Growth handling ability',
  'availability': 'Uptime reliability',
  'sla': 'Service Level Agreement',
  'slo': 'Service Level Objective',
  'sli': 'Service Level Indicator',
  'p99': '99th percentile latency',
  'rps': 'Requests per second',
  'qps': 'Queries per second',
};

// Action verbs that show ownership (italic)
export const actionVerbs = [
  'led', 'built', 'designed', 'implemented', 'created', 'developed',
  'architected', 'optimized', 'refactored', 'deployed', 'launched',
  'managed', 'owned', 'drove', 'spearheaded', 'established',
  'reduced', 'increased', 'improved', 'eliminated', 'automated',
  'migrated', 'scaled', 'integrated', 'streamlined', 'transformed',
];

/**
 * Render text with emphasis patterns: metrics, design patterns, tech terms,
 * action verbs, and delivery-cue emphasis words.
 *
 * @param text       The raw text to render
 * @param showEmphasis  Whether to show action verbs / emphasis / design patterns
 * @param sectionKey Optional section key (for delivery-cue emphasis words)
 */
export function renderEmphasisContent(
  text: string,
  showEmphasis: boolean,
  sectionKey?: string
): React.ReactNode[] {
  // Pattern 1: Metrics (bold + highlight) — always active
  const metricPattern = /(\d+(?:\.\d+)?[%xX]|\$\d+(?:,\d{3})*(?:\.\d+)?[KMB]?|\d+(?:,\d{3})*(?:\.\d+)?\s*(?:hours?|days?|weeks?|months?|minutes?|seconds?|ms|users?|customers?|engineers?|teams?|requests?|queries?))/i;

  // Pattern 2: Action verbs (bold indigo)
  const actionPattern = showEmphasis
    ? new RegExp(`\\b(${actionVerbs.join('|')})\\b`, 'i')
    : null;

  // Pattern 3: Emphasis words from delivery cues (underline)
  const deliveryCue = sectionKey ? DELIVERY_CUES[sectionKey.toLowerCase()] : undefined;
  const emphasisWords = showEmphasis && deliveryCue?.emphasis
    ? deliveryCue.emphasis.filter(w => w.length > 1 && !actionVerbs.includes(w.toLowerCase()))
    : [];
  const emphasisPattern = emphasisWords.length > 0
    ? new RegExp(`\\b(${emphasisWords.join('|')})\\b`, 'i')
    : null;

  // Pattern 4: Design patterns (green highlight - golden nuggets)
  const patternKeys = Object.keys(designPatterns).sort((a, b) => b.length - a.length);
  const patternRegex = showEmphasis && patternKeys.length > 0
    ? new RegExp(`(${patternKeys.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'i')
    : null;

  // Pattern 5: Technical terms (dotted underline)
  const techTermKeys = Object.keys(technicalTerms).sort((a, b) => b.length - a.length);
  const techPattern = new RegExp(`\\b(${techTermKeys.join('|')})\\b`, 'i');

  // Split by metrics first (highest priority)
  const parts = text.split(metricPattern);

  return parts.map((part, idx) => {
    // Metrics: bold + brand purple + wider tracking
    if (metricPattern.test(part)) {
      return (
        <mark key={idx} className="font-bold text-primary-700 tracking-wide bg-primary-50 px-0.5 rounded-sm" title="Key metric">
          {part}
        </mark>
      );
    }

    // Process remaining text through other patterns
    let processedParts: React.ReactNode[] = [part];

    // Design patterns: green highlight with tooltip (golden nuggets)
    const applyDesignPatterns = (parts: React.ReactNode[]): React.ReactNode[] => {
      if (!patternRegex) return parts;
      const newParts: React.ReactNode[] = [];
      parts.forEach((p, pIdx) => {
        if (typeof p !== 'string') {
          newParts.push(p);
          return;
        }
        const subParts = p.split(patternRegex);
        subParts.forEach((subPart, subIdx) => {
          const lowerPart = subPart.toLowerCase();
          if (designPatterns[lowerPart]) {
            newParts.push(
              <span key={`${idx}-pat-${pIdx}-${subIdx}`} className="relative group/pattern cursor-help">
                <span className="font-medium text-gray-900 uppercase text-[0.85em] tracking-wide bg-primary-50/60 border-b border-primary-300 px-0.5 rounded-sm">{subPart}</span>
                <span className="absolute bottom-full left-0 mb-1 hidden group-hover/pattern:block z-20 px-2 py-1 text-[10px] bg-gray-900 text-white rounded max-w-[200px] shadow-lg">
                  <span className="font-semibold">Pattern:</span> {designPatterns[lowerPart]}
                </span>
              </span>
            );
          } else {
            newParts.push(subPart);
          }
        });
      });
      return newParts;
    };

    // Technical terms: dotted underline + tooltip
    const applyTechTerms = (parts: React.ReactNode[]): React.ReactNode[] => {
      const newParts: React.ReactNode[] = [];
      parts.forEach((p, pIdx) => {
        if (typeof p !== 'string') {
          newParts.push(p);
          return;
        }
        const subParts = p.split(techPattern);
        subParts.forEach((subPart, subIdx) => {
          const lowerPart = subPart.toLowerCase();
          if (technicalTerms[lowerPart]) {
            newParts.push(
              <span key={`${idx}-tech-${pIdx}-${subIdx}`} className="relative group/term cursor-help">
                <span className="border-b border-dotted border-gray-500">{subPart}</span>
                <span className="absolute bottom-full left-0 mb-1 hidden group-hover/term:block z-20 px-2 py-1 text-[10px] bg-gray-900 text-white rounded whitespace-nowrap shadow-lg">
                  {technicalTerms[lowerPart]}
                </span>
              </span>
            );
          } else {
            newParts.push(subPart);
          }
        });
      });
      return newParts;
    };

    // Action verbs: bold + colored (shows ownership)
    const applyActionVerbs = (parts: React.ReactNode[]): React.ReactNode[] => {
      if (!actionPattern) return parts;
      const newParts: React.ReactNode[] = [];
      parts.forEach((p, pIdx) => {
        if (typeof p !== 'string') {
          newParts.push(p);
          return;
        }
        const subParts = p.split(actionPattern);
        subParts.forEach((subPart, subIdx) => {
          if (actionPattern.test(subPart)) {
            newParts.push(
              <strong key={`${idx}-act-${pIdx}-${subIdx}`} className="font-semibold italic text-primary-800/80" title="Action verb - shows ownership">
                {subPart}
              </strong>
            );
          } else {
            newParts.push(subPart);
          }
        });
      });
      return newParts;
    };

    // Emphasis words: solid underline (stress when speaking)
    const applyEmphasis = (parts: React.ReactNode[]): React.ReactNode[] => {
      if (!emphasisPattern) return parts;
      const newParts: React.ReactNode[] = [];
      parts.forEach((p, pIdx) => {
        if (typeof p !== 'string') {
          newParts.push(p);
          return;
        }
        const subParts = p.split(emphasisPattern);
        subParts.forEach((subPart, subIdx) => {
          if (emphasisPattern.test(subPart)) {
            newParts.push(
              <span key={`${idx}-em-${pIdx}-${subIdx}`} className="underline decoration-primary-300 decoration-1 underline-offset-2" title="Emphasize">
                {subPart}
              </span>
            );
          } else {
            newParts.push(subPart);
          }
        });
      });
      return newParts;
    };

    // Apply patterns in order: design patterns → tech terms → action verbs → emphasis
    processedParts = applyDesignPatterns(processedParts);
    processedParts = applyTechTerms(processedParts);
    processedParts = applyActionVerbs(processedParts);
    processedParts = applyEmphasis(processedParts);

    return <React.Fragment key={idx}>{processedParts}</React.Fragment>;
  });
}
