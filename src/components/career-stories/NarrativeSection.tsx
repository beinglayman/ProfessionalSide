import React, { useRef, useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  DELIVERY_CUES,
  SECTION_COACHING,
  SECTION_FIX,
} from './constants';
import type { StoryAnnotation } from '../../types/career-stories';
import { splitTextByAnnotations } from './annotation-utils';
import { useRoughAnnotations } from '../../hooks/useRoughAnnotations';

interface NarrativeSectionProps {
  sectionKey: string;
  label: string;
  content: string;
  confidence: number;
  isEditing: boolean;
  editValue: string;
  onEditChange: (value: string) => void;
  isFirst?: boolean;
  showCoaching?: boolean;
  showDeliveryCues?: boolean;
  showEmphasis?: boolean;
  hideHeader?: boolean;
  annotations?: StoryAnnotation[];
  onAnnotationClick?: (annotationId: string, element: HTMLElement) => void;
  hoveredAnnotationId?: string | null;
  onHoverAnnotation?: (annotationId: string | null) => void;
}

// Design patterns, methodologies, and techniques (green highlight - golden nuggets)
const designPatterns: Record<string, string> = {
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
const technicalTerms: Record<string, string> = {
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
const actionVerbs = [
  'led', 'built', 'designed', 'implemented', 'created', 'developed',
  'architected', 'optimized', 'refactored', 'deployed', 'launched',
  'managed', 'owned', 'drove', 'spearheaded', 'established',
  'reduced', 'increased', 'improved', 'eliminated', 'automated',
  'migrated', 'scaled', 'integrated', 'streamlined', 'transformed',
];

export const NarrativeSection: React.FC<NarrativeSectionProps> = ({
  sectionKey,
  label,
  content,
  confidence,
  isEditing,
  editValue,
  onEditChange,
  isFirst = false,
  showCoaching = false,
  showDeliveryCues = false,
  showEmphasis = true,
  hideHeader = false,
  annotations = [],
  onAnnotationClick,
  hoveredAnnotationId,
  onHoverAnnotation,
}) => {
  const [showTip, setShowTip] = useState(false);
  const contentRef = useRef<HTMLParagraphElement>(null);

  // Filter annotations for this section
  const sectionAnnotations = annotations.filter((a) => a.sectionKey === sectionKey);

  // Apply rough-notation SVG overlays after DOM mount
  useRoughAnnotations(contentRef, sectionAnnotations, content);
  const coaching = SECTION_COACHING[sectionKey.toLowerCase()];
  const deliveryCue = DELIVERY_CUES[sectionKey.toLowerCase()];

  // Render content with typography pattern
  const renderContent = (text: string) => {
    // Pattern 1: Metrics (bold + highlight)
    // NOTE: Using 'i' flag only (not 'gi') for split/test patterns to avoid lastIndex state bug.
    const metricPattern = /(\d+(?:\.\d+)?[%xX]|\$\d+(?:,\d{3})*(?:\.\d+)?[KMB]?|\d+(?:,\d{3})*(?:\.\d+)?\s*(?:hours?|days?|weeks?|months?|minutes?|seconds?|ms|users?|customers?|engineers?|teams?|requests?|queries?))/i;

    // Pattern 2: Action verbs (bold indigo)
    const actionPattern = showEmphasis
      ? new RegExp(`\\b(${actionVerbs.join('|')})\\b`, 'i')
      : null;

    // Pattern 3: Emphasis words from delivery cues (underline)
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
      // Color = brand only (background reserved for user annotations)
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
  };

  // Confidence rating label + tooltip text
  const ratingLabel = confidence >= 0.75 ? 'Strong' : confidence >= 0.5 ? 'Fair' : confidence >= 0.3 ? 'Weak' : 'Missing';
  const ratingClass = confidence >= 0.75 ? 'bg-emerald-50 text-emerald-700' : confidence >= 0.5 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600';
  const ratingTooltip = confidence >= 0.75
    ? `Strong section — specific details, clear ownership, quantified impact.`
    : confidence >= 0.5
    ? `Fair section — has structure but needs more specifics. ${coaching?.tip || 'Add concrete numbers and details.'}`
    : confidence >= 0.3
    ? `Weak section — too vague for interviews. ${coaching?.tip || 'Be specific about what YOU did and the measurable result.'}`
    : `Missing content — this section needs to be filled in. ${coaching?.tip || 'Add details to strengthen your story.'}`;

  return (
    <div className="relative">
      {/* Section header row — Datawrapper style: label + rating badge */}
      {!hideHeader && (
        <div className="flex items-center justify-between pb-3 mb-4 border-b-2 border-gray-200">
          <div className="flex items-center gap-2.5">
            <span className="text-[12px] font-bold uppercase tracking-[1px] text-gray-500">{label}</span>
            {showCoaching && coaching && (
              <button
                onClick={() => setShowTip(!showTip)}
                className={cn(
                  'inline-flex items-center gap-1 text-[11px] rounded px-1.5 py-0.5 transition-colors',
                  showTip
                    ? 'bg-amber-100 text-amber-700'
                    : 'text-gray-400 hover:text-amber-600 hover:bg-amber-50'
                )}
                aria-expanded={showTip}
              >
                <Lightbulb className="w-3 h-3" />
                <span className="hidden sm:inline">Review</span>
              </button>
            )}
          </div>
          <span
            className={cn('text-[11px] font-semibold px-2.5 py-0.5 rounded cursor-help', ratingClass)}
            title={ratingTooltip}
          >
            {ratingLabel}
          </span>
        </div>
      )}

      {/* Coach review panel — callout box style (matches journal Achievement/Reasoning boxes) */}
      {showTip && coaching && (
        <div className="mb-4 bg-amber-50 border border-amber-100 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span className="text-sm font-medium text-amber-800">Interview Coach</span>
          </div>
          <ul className="space-y-1.5 ml-6">
            <li className="text-xs text-amber-700 leading-relaxed">
              {coaching.tip}
            </li>
            <li className="text-xs text-amber-700 leading-relaxed">
              {coaching.interviewNote}
            </li>
          </ul>
          <div className="mt-3 ml-6 pt-2 border-t border-amber-200/60">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600">How to fix</span>
            <p className="text-xs text-gray-700 leading-relaxed mt-0.5">
              {SECTION_FIX[sectionKey.toLowerCase()] || 'Be specific and quantify wherever possible.'}
            </p>
          </div>
        </div>
      )}

      {/* Content */}
      {isEditing ? (
        <div>
          <textarea
            value={editValue}
            onChange={(e) => onEditChange(e.target.value)}
            className={cn(
              'w-full p-3.5 border border-gray-200 rounded text-[14px] resize-none',
              'focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
              'bg-white transition-shadow'
            )}
            rows={4}
            placeholder={`Describe the ${label.toLowerCase()}...`}
          />
          {coaching && (
            <p className="mt-2 text-[11px] text-gray-500 italic">
              {coaching.tip}
            </p>
          )}
        </div>
      ) : (
        <div className="relative">
          {/* Opening delivery cue */}
          {showDeliveryCues && deliveryCue && (
            <div className="mb-2.5 text-[10px] text-gray-400 italic flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {deliveryCue.openingCue}
            </div>
          )}

          <p ref={contentRef} className="text-[15px] leading-[1.75] text-gray-800">
            {sectionAnnotations.length > 0
              ? splitTextByAnnotations(content, sectionAnnotations).map((seg, i) =>
                  seg.annotationId ? (
                    <span
                      key={`ann-${seg.annotationId}`}
                      data-annotation-id={seg.annotationId}
                      className={cn(
                        'cursor-pointer transition-shadow duration-150 rounded-sm',
                        hoveredAnnotationId === seg.annotationId && 'shadow-[0_0_0_2px_rgba(180,83,9,0.45)]'
                      )}
                      onClick={(e) => onAnnotationClick?.(seg.annotationId!, e.currentTarget)}
                      onMouseEnter={() => onHoverAnnotation?.(seg.annotationId!)}
                      onMouseLeave={() => onHoverAnnotation?.(null)}
                    >
                      {renderContent(seg.text)}
                    </span>
                  ) : (
                    <React.Fragment key={`seg-${i}`}>{renderContent(seg.text)}</React.Fragment>
                  )
                )
              : renderContent(content)}
          </p>

          {/* Closing delivery cue */}
          {showDeliveryCues && deliveryCue && (
            <div className="mt-2.5 text-[10px] text-gray-400 italic flex items-center gap-1.5 justify-end">
              {deliveryCue.closingCue}
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
