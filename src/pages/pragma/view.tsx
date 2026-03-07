import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { ExternalLink, StickyNote, FileText, AlertCircle, Link2Off, Clock, ChevronDown, ArrowRight, Sparkles } from 'lucide-react';
import { motion, MotionConfig } from 'framer-motion';
import { annotate, type Annotation as RNAnnotation } from 'rough-notation';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { useResolvePragmaLink } from '../../hooks/usePragmaLinks';
import { NARRATIVE_FRAMEWORKS, ARCHETYPE_METADATA, BRAG_DOC_CATEGORIES } from '../../components/career-stories/constants';
import { NarrativeSection } from '../../components/career-stories/NarrativeSection';
import { MarginColumn } from '../../components/career-stories/MarginColumn';
import { ToolIcon } from '../../components/career-stories/ToolIcon';
import { SectionIcon } from '../../components/career-stories/SectionIcon';
import type { ToolType, StoryAnnotation } from '../../types/career-stories';
import type { PragmaResolveResponse } from '../../services/pragma-link.service';

const TIER_LABELS: Record<string, string> = {
  public: 'Preview',
  recruiter: 'Full Story',
  mentor: 'Full Story + Annotations',
};

// Framer-motion variants
const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.15 },
  },
};

const sectionVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
  },
};

const heroVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] },
  },
};

const ctaVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1], delay: 0.3 },
  },
};

const badgeVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1 },
};

// Extract key metrics from text for rough-notation highlights
export function extractMetricSpans(text: string): Array<{ text: string; start: number; end: number }> {
  const pattern = /(?<=[\s(]|^)(\d+[%xX]|\$[\d,.]+[KMB]?|\d+\s*(?:hours?|days?|weeks?|months?|users?|customers?|teams?))(?=[\s,.\-;:!?)']|$)/gi;
  const spans: Array<{ text: string; start: number; end: number }> = [];
  let match;
  while ((match = pattern.exec(text)) !== null) {
    spans.push({ text: match[0], start: match.index, end: match.index + match[0].length });
  }
  return spans;
}

// Render text with imperative rough-notation highlights on metrics
function HighlightedText({ text, show }: { text: string; show: boolean }) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const instancesRef = useRef<RNAnnotation[]>([]);

  useEffect(() => {
    if (!containerRef.current || !show) return;

    // Clean up previous
    for (const inst of instancesRef.current) inst.remove();
    instancesRef.current = [];

    const spans = containerRef.current.querySelectorAll<HTMLElement>('[data-metric]');
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    spans.forEach((el, i) => {
      const a = annotate(el, {
        type: 'highlight',
        color: 'rgba(139, 92, 246, 0.15)',
        animationDuration: 600,
        multiline: true,
      });
      instancesRef.current.push(a);
      timeouts.push(setTimeout(() => a.show(), 300 + i * 200));
    });

    return () => {
      timeouts.forEach(clearTimeout);
      for (const inst of instancesRef.current) inst.remove();
      instancesRef.current = [];
    };
  }, [show, text]);

  const metrics = extractMetricSpans(text);
  if (metrics.length === 0) {
    return <span>{text}</span>;
  }

  const parts: React.ReactNode[] = [];
  let lastIdx = 0;
  metrics.forEach((m, i) => {
    if (m.start > lastIdx) {
      parts.push(<span key={`t-${i}`}>{text.slice(lastIdx, m.start)}</span>);
    }
    parts.push(
      <span key={`rn-${i}`} data-metric className="font-semibold text-gray-900">
        {m.text}
      </span>
    );
    lastIdx = m.end;
  });
  if (lastIdx < text.length) {
    parts.push(<span key="t-end">{text.slice(lastIdx)}</span>);
  }
  return <span ref={containerRef}>{parts}</span>;
}

function SourceItem({ source }: { source: PragmaResolveResponse['content']['sources'][0] }) {
  return (
    <div className="flex items-start gap-2.5 py-2 text-xs group">
      <div className="mt-0.5 shrink-0">
        {source.toolType ? (
          <ToolIcon tool={source.toolType as ToolType} className="h-4 w-4" />
        ) : source.sourceType === 'user_note' ? (
          <StickyNote className="h-3.5 w-3.5 text-amber-500" />
        ) : (
          <FileText className="h-3.5 w-3.5 text-gray-400" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <span className="text-gray-600 leading-snug">{source.label}</span>
        {source.annotation && (
          <p className="text-gray-400 italic mt-0.5 leading-snug">{source.annotation}</p>
        )}
      </div>
      {source.url && (
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-violet-500 hover:text-violet-600 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}

function MobileAnnotations({ annotations, sectionKey }: { annotations: StoryAnnotation[]; sectionKey: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const sectionAnnotations = annotations.filter(
    (a) => a.sectionKey === sectionKey && (a.note || a.style === 'aside')
  );
  if (sectionAnnotations.length === 0) return null;

  return (
    <div className="lg:hidden mt-4 pt-4 border-t border-gray-100">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 text-[11px] font-medium text-violet-600 hover:text-violet-700 transition-colors"
      >
        <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        Author Notes ({sectionAnnotations.length})
      </button>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-2 space-y-2 overflow-hidden"
        >
          {sectionAnnotations.map((ann) => (
            <div key={ann.id} className="text-[11px] text-gray-500 border-l-2 border-violet-200 pl-2.5 py-1">
              {ann.annotatedText && (
                <span className="text-gray-400 italic">&ldquo;{ann.annotatedText}&rdquo; &mdash; </span>
              )}
              {ann.note}
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

function ErrorPage({ icon, title, message }: { icon: React.ReactNode; title: string; message: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="max-w-sm text-center space-y-4"
      >
        <div className="mx-auto w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400">
          {icon}
        </div>
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
        <p className="text-sm text-gray-500 leading-relaxed">{message}</p>
        <p className="text-xs text-gray-400 pt-6">
          Powered by <span className="font-semibold text-gray-500">InChronicle</span>
        </p>
      </motion.div>
    </div>
  );
}

export default function PragmaLinkPage() {
  const { shortCode } = useParams<{ shortCode: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('t') || undefined;
  const [hoveredAnnotationId, setHoveredAnnotationId] = useState<string | null>(null);
  const [showAnnotations, setShowAnnotations] = useState(false);

  const { isAuthenticated } = useAuth();
  const { data, isLoading, isError, error } = useResolvePragmaLink(shortCode, token);

  // Trigger rough-notation animations after mount
  useEffect(() => {
    const timer = setTimeout(() => setShowAnnotations(true), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!data) return;
    const parts = [data.content.title];
    if (data.author?.name) parts.push(data.author.name);
    parts.push('InChronicle');
    document.title = parts.join(' — ');
    return () => { document.title = 'InChronicle'; };
  }, [data]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <header className="border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="h-5 w-24 bg-gray-200 rounded animate-pulse" />
            <div className="h-6 w-20 bg-gray-100 rounded-full animate-pulse" />
          </div>
        </header>
        <div className="max-w-3xl mx-auto px-6 py-12 space-y-8">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-gray-200 animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
              <div className="h-3 w-44 bg-gray-100 rounded animate-pulse" />
            </div>
          </div>
          <div className="h-8 w-3/4 bg-gray-200 rounded animate-pulse" />
          <div className="space-y-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-6 space-y-3">
                <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
                <div className="space-y-2.5">
                  <div className="h-3 w-full bg-gray-100 rounded animate-pulse" />
                  <div className="h-3 w-5/6 bg-gray-100 rounded animate-pulse" />
                  <div className="h-3 w-2/3 bg-gray-100 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    const axiosErr = error as { response?: { status?: number; data?: { error?: string } }; message?: string };
    const status = axiosErr?.response?.status;
    const errorMsg = axiosErr?.response?.data?.error || '';

    if (status === 410 && errorMsg.toLowerCase().includes('revoked')) {
      return <ErrorPage icon={<Link2Off className="h-6 w-6" />} title="Link Revoked" message="This share link has been revoked. Contact the author if you need access." />;
    }
    if (status === 410 && errorMsg.toLowerCase().includes('expired')) {
      return <ErrorPage icon={<Clock className="h-6 w-6" />} title="Link Expired" message="This share link has expired. Contact the author for a new link." />;
    }
    if (status === 403) {
      return <ErrorPage icon={<AlertCircle className="h-6 w-6" />} title="Access Denied" message="You don't have permission to view this story." />;
    }
    return <ErrorPage icon={<AlertCircle className="h-6 w-6" />} title="Not Available" message="This story is no longer available." />;
  }

  const { content, tier, author } = data;
  const frameworkMeta = NARRATIVE_FRAMEWORKS[content.framework as keyof typeof NARRATIVE_FRAMEWORKS];
  const archetypeMeta = content.archetype ? ARCHETYPE_METADATA[content.archetype] : null;
  const categoryMeta = content.category ? BRAG_DOC_CATEGORIES.find(c => c.value === content.category) : null;
  const sectionKeys = frameworkMeta?.sections ?? Object.keys(content.sections);
  const sources = content.sources ?? [];
  const annotations: StoryAnnotation[] = (content.annotations ?? []) as StoryAnnotation[];
  const hasMentorAnnotations = tier === 'mentor' && annotations.length > 0;
  const isPublic = tier === 'public';

  const sourcesBySection = useMemo(() => {
    const map = new Map<string, typeof sources>();
    for (const s of sources) {
      const arr = map.get(s.sectionKey) ?? [];
      arr.push(s);
      map.set(s.sectionKey, arr);
    }
    return map;
  }, [sources]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50">
      {/* Branded header — sticky, glassy */}
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-10"
      >
        <div className={cn(
          'flex items-center justify-between px-6 py-3',
          hasMentorAnnotations ? 'max-w-4xl mx-auto' : 'max-w-3xl mx-auto'
        )}>
          <Link
            to={isAuthenticated ? '/dashboard' : '/'}
            className="flex items-center gap-2 text-sm font-bold text-gray-800 tracking-tight hover:text-violet-600 transition-colors"
          >
            <span className="text-violet-600 text-xs font-black">IN</span>
            CHRONICLE
          </Link>
          <div className="flex items-center gap-3">
            <span className={cn(
              'px-2.5 py-1 text-[10px] font-semibold rounded-full uppercase tracking-wider',
              isPublic
                ? 'bg-gray-100 text-gray-500'
                : tier === 'mentor'
                  ? 'bg-violet-100 text-violet-700'
                  : 'bg-emerald-50 text-emerald-700'
            )}>
              {TIER_LABELS[tier] || tier}
            </span>
            {!isAuthenticated && (
              <Link
                to="/login"
                className="text-xs font-medium text-violet-600 hover:text-violet-700 transition-colors"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </motion.header>

      <div className={cn(
        'px-6 py-10',
        hasMentorAnnotations ? 'max-w-4xl mx-auto' : 'max-w-3xl mx-auto'
      )}>
        {/* Hero section — author + title */}
        <motion.div
          variants={heroVariants}
          initial="hidden"
          animate="visible"
          className="mb-10"
        >
          {/* Author */}
          {author && (
            <div className="flex items-center gap-3.5 mb-6">
              {author.avatar ? (
                <img src={author.avatar} alt={author.name} className="h-12 w-12 rounded-full ring-2 ring-white shadow-sm" />
              ) : (
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
                  {author.name?.charAt(0) ?? '?'}
                </div>
              )}
              <div>
                <p className="text-base font-semibold text-gray-900">{author.name}</p>
                {(author.title || author.company) && (
                  <p className="text-sm text-gray-500">
                    {[author.title, author.company].filter(Boolean).join(' at ')}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight leading-tight mb-4">
            {content.title}
          </h1>

          {/* Badges — stagger in */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06, delayChildren: 0.2 } } }}
            className="flex items-center gap-2 flex-wrap"
          >
            {archetypeMeta && content.archetype && (
              <motion.span
                variants={badgeVariants}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-full bg-violet-50 text-violet-700 capitalize"
              >
                {content.archetype}
              </motion.span>
            )}
            {categoryMeta && (
              <motion.span
                variants={badgeVariants}
                className="px-2.5 py-1 text-[11px] font-medium rounded-full bg-blue-50 text-blue-700"
              >
                {categoryMeta.label}
              </motion.span>
            )}
            {frameworkMeta && (
              <motion.span
                variants={badgeVariants}
                className="px-2.5 py-1 text-[11px] font-medium rounded-full bg-gray-100 text-gray-600 uppercase tracking-wider"
              >
                {content.framework}
              </motion.span>
            )}
          </motion.div>
        </motion.div>

        {/* Source coverage indicator */}
        {content.sourceCoverage && content.sourceCoverage.total > 0 && !isPublic && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-2 mb-8"
          >
            <div className="flex gap-0.5">
              {Array.from({ length: content.sourceCoverage.total }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.4 + i * 0.05, duration: 0.3 }}
                  className={cn(
                    'h-1.5 w-6 rounded-full origin-left',
                    i < content.sourceCoverage!.sourced ? 'bg-emerald-400' : 'bg-gray-200'
                  )}
                />
              ))}
            </div>
            <span className="text-xs text-gray-400">
              {content.sourceCoverage.sourced}/{content.sourceCoverage.total} sections sourced
            </span>
          </motion.div>
        )}

        {/* Sections — staggered reveal */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-5"
        >
          {sectionKeys.map((key: string) => {
            const section = content.sections[key];
            if (!section) return null;
            const sectionLabel = key.charAt(0).toUpperCase() + key.slice(1);
            const sectionSources = sourcesBySection.get(key) ?? [];

            return (
              <motion.div
                key={key}
                variants={sectionVariants}
                className={cn(
                  'rounded-xl border bg-white overflow-hidden',
                  isPublic
                    ? 'border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200'
                    : 'border-gray-100 shadow-sm'
                )}
              >
                <div className={hasMentorAnnotations ? 'flex gap-0' : ''}>
                  <div className="flex-1 min-w-0 p-6">
                    {/* Section header with SVG icon */}
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-violet-50 text-violet-500">
                        <SectionIcon sectionKey={key} className="w-4 h-4" />
                      </div>
                      <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">
                        {sectionLabel}
                      </h2>
                    </div>

                    {/* Content */}
                    {!isPublic ? (
                      <NarrativeSection
                        sectionKey={key}
                        label={sectionLabel}
                        content={section.summary || ''}
                        confidence={1}
                        isEditing={false}
                        editValue=""
                        onEditChange={() => {}}
                        showCoaching={false}
                        showEmphasis={true}
                        hideHeader={true}
                        hideConfidence={true}
                        annotations={hasMentorAnnotations ? annotations : []}
                        hoveredAnnotationId={hoveredAnnotationId}
                        onHoverAnnotation={setHoveredAnnotationId}
                      />
                    ) : (
                      <div className="text-[15px] text-gray-700 leading-relaxed whitespace-pre-wrap">
                        <HighlightedText text={section.summary || ''} show={showAnnotations} />
                      </div>
                    )}

                    {/* Sources (recruiter + mentor) */}
                    {sectionSources.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-50">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-300 mb-2">
                          Evidence
                        </p>
                        <div className="space-y-0.5">
                          {sectionSources.map((s) => (
                            <SourceItem key={s.id} source={s} />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Mobile annotations */}
                    {hasMentorAnnotations && (
                      <MobileAnnotations annotations={annotations} sectionKey={key} />
                    )}
                  </div>

                  {/* Margin column for mentor */}
                  {hasMentorAnnotations && (
                    <MarginColumn
                      annotations={annotations}
                      sectionKey={key}
                      annotateMode={false}
                      hoveredAnnotationId={hoveredAnnotationId}
                      onHoverAnnotation={setHoveredAnnotationId}
                    />
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Public tier CTA — compelling, integrated */}
        {isPublic && (
          <motion.div
            variants={ctaVariants}
            initial="hidden"
            animate="visible"
            className="mt-10 relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 p-8 sm:p-10 text-white"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-5 w-5 text-violet-200" />
                <span className="text-xs font-semibold uppercase tracking-widest text-violet-200">
                  Full Access
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold mb-2">
                Want the complete story?
              </h3>
              <p className="text-sm text-violet-200 leading-relaxed max-w-md mb-6">
                {author?.name ? (
                  <>Ask <span className="text-white font-medium">{author.name}</span> for a full-access link to see evidence, sources, and author annotations.</>
                ) : (
                  <>Ask the author for a full-access link to see evidence, sources, and author annotations.</>
                )}
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate('/register')}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-violet-700 text-sm font-semibold rounded-lg hover:bg-violet-50 transition-colors shadow-lg shadow-violet-900/20"
                >
                  Build your own career story
                  <ArrowRight className="h-4 w-4" />
                </motion.button>
                {!isAuthenticated && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate('/login')}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white/10 text-white text-sm font-medium rounded-lg hover:bg-white/20 transition-colors backdrop-blur-sm"
                  >
                    Already have an account? Sign in
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="mt-12 pt-8 border-t border-gray-100 text-center space-y-2"
        >
          {content.publishedAt && (
            <p className="text-xs text-gray-400">
              Published {new Date(content.publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          )}
          <p className="text-xs text-gray-400">
            <Link to="/" className="font-semibold text-gray-500 hover:text-violet-600 transition-colors">InChronicle</Link>
            {' '}&middot;{' '}
            Career stories backed by evidence
          </p>
        </motion.footer>
      </div>
      </div>
    </MotionConfig>
  );
}
