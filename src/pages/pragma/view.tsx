import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { ExternalLink, StickyNote, FileText, AlertCircle, Link2Off, Clock } from 'lucide-react';
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (isError || !data) {
    const axiosErr = error as { response?: { data?: { error?: string } }; message?: string };
    const errorMsg = axiosErr?.response?.data?.error || axiosErr?.message || '';

    if (errorMsg.includes('revoked')) {
      return (
        <ErrorPage
          icon={<Link2Off className="h-6 w-6" />}
          title="Link Revoked"
          message="This share link has been revoked. Contact the author if you need access."
        />
      );
    }
    if (errorMsg.includes('expired')) {
      return (
        <ErrorPage
          icon={<Clock className="h-6 w-6" />}
          title="Link Expired"
          message="This share link has expired. Contact the author for a new link."
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
      <div className={hasMentorAnnotations ? 'max-w-4xl mx-auto px-4 py-8' : 'max-w-2xl mx-auto px-4 py-8'}>
        {/* Tier badge */}
        <div className="flex items-center gap-2 mb-6">
          <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-primary-50 text-primary-700">
            {TIER_LABELS[tier] || tier}
          </span>
          {tier === 'public' && (
            <span className="text-[11px] text-gray-400">
              This is a preview. The author may share a link with full access.
            </span>
          )}
        </div>

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
                        annotations={hasMentorAnnotations ? annotations : []}
                        hoveredAnnotationId={hoveredAnnotationId}
                        onHoverAnnotation={setHoveredAnnotationId}
                      />
                    ) : (
                      <>
                        <h2 className="text-sm font-semibold text-gray-800 mb-2">{sectionLabel}</h2>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
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

        {/* Footer */}
        <div className="mt-8 text-center">
          {content.publishedAt && (
            <p className="text-xs text-gray-400">
              Published {new Date(content.publishedAt).toLocaleDateString()}
            </p>
          )}
          <p className="text-xs text-gray-400 mt-2">
            Shared via <span className="font-medium text-gray-500">inchronicle</span>
          </p>
        </div>
      </div>
    </div>
  );
}
