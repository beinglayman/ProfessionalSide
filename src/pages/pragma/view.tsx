import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { ExternalLink, StickyNote, FileText, AlertCircle, Link2Off, Clock, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useResolvePragmaLink } from '../../hooks/usePragmaLinks';
import { NARRATIVE_FRAMEWORKS, ARCHETYPE_METADATA, BRAG_DOC_CATEGORIES } from '../../components/career-stories/constants';
import { NarrativeSection } from '../../components/career-stories/NarrativeSection';
import { MarginColumn } from '../../components/career-stories/MarginColumn';
import { ToolIcon } from '../../components/career-stories/ToolIcon';
import type { ToolType, StoryAnnotation } from '../../types/career-stories';
import type { PragmaResolveResponse } from '../../services/pragma-link.service';

const TIER_LABELS: Record<string, string> = {
  public: 'Preview',
  recruiter: 'Full Story',
  mentor: 'Full Story + Annotations',
};

function SourceItem({ source }: { source: PragmaResolveResponse['content']['sources'][0] }) {
  return (
    <div className="flex items-start gap-2 py-1.5 text-xs">
      {source.toolType ? (
        <ToolIcon tool={source.toolType as ToolType} className="h-4 w-4 shrink-0 mt-0.5" />
      ) : source.sourceType === 'user_note' ? (
        <StickyNote className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
      ) : (
        <FileText className="h-3.5 w-3.5 text-gray-400 shrink-0 mt-0.5" />
      )}
      <div className="min-w-0 flex-1">
        <span className="text-gray-700">{source.label}</span>
        {source.annotation && (
          <p className="text-gray-500 italic mt-0.5">{source.annotation}</p>
        )}
      </div>
      {source.url && (
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-600 hover:text-primary-700 shrink-0"
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
    <div className="lg:hidden mt-3 pt-3 border-t border-gray-100">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        Author Notes ({sectionAnnotations.length})
      </button>
      {isOpen && (
        <div className="mt-2 space-y-2">
          {sectionAnnotations.map((ann) => (
            <div key={ann.id} className="text-[11px] text-gray-500 border-l-2 border-gray-200 pl-2 py-1">
              {ann.annotatedText && (
                <span className="text-gray-400 italic">&ldquo;{ann.annotatedText}&rdquo; — </span>
              )}
              {ann.note}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ErrorPage({ icon, title, message }: { icon: React.ReactNode; title: string; message: string }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="max-w-sm text-center space-y-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
          {icon}
        </div>
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
        <p className="text-sm text-gray-500">{message}</p>
        <p className="text-xs text-gray-400 pt-4">
          Powered by <span className="font-medium text-gray-500">inchronicle</span>
        </p>
      </div>
    </div>
  );
}

export default function PragmaLinkPage() {
  const { shortCode } = useParams<{ shortCode: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('t') || undefined;
  const [hoveredAnnotationId, setHoveredAnnotationId] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useResolvePragmaLink(shortCode, token);

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
      <div className="min-h-screen bg-gray-50">
        <div className="border-b border-gray-100 bg-white">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
            <div className="h-5 w-16 bg-gray-100 rounded-full animate-pulse" />
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
          {/* Author skeleton */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse" />
            <div className="space-y-1.5">
              <div className="h-3.5 w-28 bg-gray-200 rounded animate-pulse" />
              <div className="h-3 w-40 bg-gray-100 rounded animate-pulse" />
            </div>
          </div>
          {/* Title skeleton */}
          <div className="h-6 w-3/4 bg-gray-200 rounded animate-pulse" />
          {/* Section skeletons */}
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-5 space-y-3">
              <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
              <div className="space-y-2">
                <div className="h-3 w-full bg-gray-100 rounded animate-pulse" />
                <div className="h-3 w-5/6 bg-gray-100 rounded animate-pulse" />
                <div className="h-3 w-2/3 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    const axiosErr = error as { response?: { status?: number; data?: { error?: string } }; message?: string };
    const status = axiosErr?.response?.status;
    const errorMsg = axiosErr?.response?.data?.error || '';

    if (status === 410 && errorMsg.toLowerCase().includes('revoked')) {
      return (
        <ErrorPage
          icon={<Link2Off className="h-6 w-6" />}
          title="Link Revoked"
          message="This share link has been revoked. Contact the author if you need access."
        />
      );
    }
    if (status === 410 && errorMsg.toLowerCase().includes('expired')) {
      return (
        <ErrorPage
          icon={<Clock className="h-6 w-6" />}
          title="Link Expired"
          message="This share link has expired. Contact the author for a new link."
        />
      );
    }
    if (status === 403) {
      return (
        <ErrorPage
          icon={<AlertCircle className="h-6 w-6" />}
          title="Access Denied"
          message="You don't have permission to view this story."
        />
      );
    }
    return (
      <ErrorPage
        icon={<AlertCircle className="h-6 w-6" />}
        title="Not Available"
        message="This story is no longer available."
      />
    );
  }

  const { content, tier, author } = data;
  const frameworkMeta = NARRATIVE_FRAMEWORKS[content.framework as keyof typeof NARRATIVE_FRAMEWORKS];
  const archetypeMeta = content.archetype ? ARCHETYPE_METADATA[content.archetype] : null;
  const categoryMeta = content.category ? BRAG_DOC_CATEGORIES.find(c => c.value === content.category) : null;
  const sectionKeys = frameworkMeta?.sections ?? Object.keys(content.sections);
  const sources = content.sources ?? [];
  const annotations: StoryAnnotation[] = (content.annotations ?? []) as StoryAnnotation[];
  const hasMentorAnnotations = tier === 'mentor' && annotations.length > 0;

  // Group sources by section
  const sourcesBySection = new Map<string, typeof sources>();
  for (const s of sources) {
    const arr = sourcesBySection.get(s.sectionKey) ?? [];
    arr.push(s);
    sourcesBySection.set(s.sectionKey, arr);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Branded header */}
      <header className="border-b border-gray-100 bg-white">
        <div className={cn(
          'flex items-center justify-between px-4 py-3',
          hasMentorAnnotations ? 'max-w-4xl mx-auto' : 'max-w-2xl mx-auto'
        )}>
          <span className="text-sm font-semibold text-gray-800 tracking-tight">inchronicle</span>
          <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-primary-50 text-primary-700">
            {TIER_LABELS[tier] || tier}
          </span>
        </div>
      </header>

      <div className={hasMentorAnnotations ? 'max-w-4xl mx-auto px-4 py-8' : 'max-w-2xl mx-auto px-4 py-8'}>
        {/* Public preview notice */}
        {tier === 'public' && (
          <p className="text-[11px] text-gray-400 mb-6">
            This is a preview. The author may share a link with full access.
          </p>
        )}

        {/* Author header */}
        {author && (
          <div className="flex items-center gap-3 mb-6">
            {author.avatar ? (
              <img src={author.avatar} alt={author.name} className="h-10 w-10 rounded-full" />
            ) : (
              <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-sm">
                {author.name?.charAt(0) ?? '?'}
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-gray-900">{author.name}</p>
              {(author.title || author.company) && (
                <p className="text-xs text-gray-500">
                  {[author.title, author.company].filter(Boolean).join(' at ')}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Story title + badges */}
        <h1 className="text-xl font-bold text-gray-900 mb-2">{content.title}</h1>
        <div className="flex items-center gap-1.5 flex-wrap mb-4">
          {frameworkMeta && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-gray-100 text-gray-600">
              {content.framework}
            </span>
          )}
          {archetypeMeta && content.archetype && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-primary-50 text-primary-700 capitalize">
              {content.archetype}
            </span>
          )}
          {categoryMeta && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-blue-50 text-blue-700">
              {categoryMeta.label}
            </span>
          )}
        </div>

        {/* Source coverage */}
        {content.sourceCoverage && content.sourceCoverage.total > 0 && tier !== 'public' && (
          <p className="text-xs text-gray-500 mb-6">
            {content.sourceCoverage.sourced} of {content.sourceCoverage.total} sections have sources
          </p>
        )}

        {/* Sections — with margin column for mentor tier */}
        <div className="space-y-6">
          {sectionKeys.map((key: string) => {
            const section = content.sections[key];
            if (!section) return null;
            const sectionLabel = key.charAt(0).toUpperCase() + key.slice(1);
            const sectionSources = sourcesBySection.get(key) ?? [];

            return (
              <div key={key} className="bg-white rounded-lg border border-gray-200 p-5">
                <div className={hasMentorAnnotations ? 'flex gap-0' : ''}>
                  {/* Main content column */}
                  <div className="flex-1 min-w-0">
                    {tier !== 'public' ? (
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
                        hideHeader={false}
                        hideConfidence={true}
                        annotations={hasMentorAnnotations ? annotations : []}
                        hoveredAnnotationId={hoveredAnnotationId}
                        onHoverAnnotation={setHoveredAnnotationId}
                      />
                    ) : (
                      <>
                        <h2 className="text-sm font-semibold text-gray-800 mb-2">{sectionLabel}</h2>
                        <p className="text-sm text-gray-500 whitespace-pre-wrap leading-relaxed line-clamp-3">
                          {section.summary}
                        </p>
                      </>
                    )}

                    {/* Sources (recruiter + mentor tiers) */}
                    {sectionSources.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1.5">
                          Sources
                        </p>
                        <div className="space-y-0.5">
                          {sectionSources.map((s) => (
                            <SourceItem key={s.id} source={s} />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Mobile mentor annotations (hidden on lg+, where MarginColumn shows) */}
                    {hasMentorAnnotations && (
                      <MobileAnnotations annotations={annotations} sectionKey={key} />
                    )}
                  </div>

                  {/* Margin column for mentor annotations */}
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
              </div>
            );
          })}
        </div>

        {/* Public tier CTA */}
        {tier === 'public' && (
          <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6 text-center space-y-3">
            <p className="text-sm font-medium text-gray-800">
              Want the full story?
            </p>
            <p className="text-xs text-gray-500">
              Ask {author?.name || 'the author'} for access to see the complete career story with evidence and sources.
            </p>
            <a
              href="/register"
              className="inline-block mt-2 px-4 py-2 text-xs font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-md transition-colors"
            >
              Build your own career story
            </a>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-8 pt-6 border-t border-gray-100 text-center space-y-1">
          {content.publishedAt && (
            <p className="text-xs text-gray-400">
              Published {new Date(content.publishedAt).toLocaleDateString()}
            </p>
          )}
          <p className="text-xs text-gray-400">
            <span className="font-medium text-gray-500">inchronicle</span>
            {' '}&middot;{' '}
            Career stories backed by evidence
          </p>
        </footer>
      </div>
    </div>
  );
}
