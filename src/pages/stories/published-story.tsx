import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, StickyNote, FileText, Printer, AlertTriangle } from 'lucide-react';
import { usePublishedStory } from '../../hooks/usePublicProfile';
import { useAuth } from '../../contexts/AuthContext';
import { NARRATIVE_FRAMEWORKS, ARCHETYPE_METADATA, BRAG_DOC_CATEGORIES } from '../../components/career-stories/constants';
import { ToolIcon } from '../../components/career-stories/ToolIcon';
import { StoryEvidenceView } from '../../components/career-stories/StoryEvidenceView';
import { EvidenceToggle } from '../../components/career-stories/EvidenceToggle';
import { useEvidenceToggle } from '../../hooks/useEvidenceToggle';
import type { StorySource, ToolType } from '../../types/career-stories';
import { cn } from '../../lib/utils';

function SourceItem({ source, isOwner }: { source: StorySource; isOwner?: boolean }) {
  const isExcluded = !!source.excludedAt;
  const isWizardAnswer = source.sourceType === 'wizard_answer';

  return (
    <div className={cn(
      'flex items-start gap-2 py-1.5 text-xs',
      isExcluded && 'opacity-40 line-through',
    )}>
      {source.toolType ? (
        <ToolIcon tool={source.toolType as ToolType} className="h-4 w-4 shrink-0 mt-0.5" />
      ) : source.sourceType === 'user_note' ? (
        <StickyNote className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
      ) : (
        <FileText className="h-3.5 w-3.5 text-gray-400 shrink-0 mt-0.5" />
      )}
      <div className="min-w-0 flex-1">
        <span className="text-gray-700">{source.label}</span>
        {isOwner && isWizardAnswer && (
          <span className="ml-1.5 text-[10px] text-gray-400 italic">wizard answer</span>
        )}
        {isOwner && isExcluded && (
          <span className="ml-1.5 text-[10px] text-gray-400 italic">excluded</span>
        )}
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

export default function PublishedStoryPage() {
  const { storyId } = useParams<{ storyId: string }>();
  const { data, isLoading, isError } = usePublishedStory(storyId!);
  const { user } = useAuth();
  const [evidenceOn, , toggleEvidence] = useEvidenceToggle();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (isError || !data?.data?.story) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">Story not found or is private.</p>
        <Link to="/" className="text-primary-600 hover:underline text-sm">
          Go home
        </Link>
      </div>
    );
  }

  const { story, author, isOwner } = data.data;
  const frameworkMeta = NARRATIVE_FRAMEWORKS[story.framework as keyof typeof NARRATIVE_FRAMEWORKS];
  const archetypeMeta = story.archetype ? ARCHETYPE_METADATA[story.archetype] : null;
  const categoryMeta = story.category ? BRAG_DOC_CATEGORIES.find(c => c.value === story.category) : null;
  const sectionKeys = frameworkMeta?.sections ?? Object.keys(story.sections);
  const sources: StorySource[] = story.sources ?? [];
  const coverage = story.sourceCoverage;

  // Group sources by section key
  const sourcesBySection = new Map<string, StorySource[]>();
  for (const s of sources) {
    const arr = sourcesBySection.get(s.sectionKey) ?? [];
    arr.push(s);
    sourcesBySection.set(s.sectionKey, arr);
  }

  // Author mode: richer layout with serif typography and full metadata
  if (isOwner) {
    return (
      <div className="min-h-screen bg-white">
        {/* Sticky action bar — hidden when printing */}
        <header className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-100 print:hidden">
          <div className={cn(
            'mx-auto px-6 py-3 flex items-center justify-between transition-[max-width] duration-300',
            evidenceOn ? 'max-w-[1280px]' : 'max-w-[720px]',
          )}>
            <Link
              to="/stories"
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Stories
            </Link>
            <div className="flex items-center gap-3">
              {!story.isPublished && (
                <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-amber-50 text-amber-700 uppercase tracking-wide">
                  Draft
                </span>
              )}
              <EvidenceToggle on={evidenceOn} onToggle={toggleEvidence} />
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
              >
                <Printer className="h-3.5 w-3.5" />
                Print
              </button>
            </div>
          </div>
        </header>

        {/* Content column */}
        <main className={cn(
          'mx-auto px-6 sm:px-8 py-12 sm:py-16 print:max-w-full print:px-8 print:py-4 transition-[max-width] duration-300',
          evidenceOn ? 'max-w-[1280px]' : 'max-w-[720px]',
        )}>
          {/* Title */}
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-gray-900 leading-tight tracking-tight">
            {story.title}
          </h1>

          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap mt-4">
            {frameworkMeta && (
              <span className="px-2 py-0.5 text-xs font-semibold rounded bg-gray-100 text-gray-600">
                {story.framework}
              </span>
            )}
            {archetypeMeta && story.archetype && (
              <span className="px-2 py-0.5 text-xs font-semibold rounded bg-primary-50 text-primary-700 capitalize">
                {story.archetype}
              </span>
            )}
            {categoryMeta && (
              <span className="px-2 py-0.5 text-xs font-semibold rounded bg-blue-50 text-blue-700">
                {categoryMeta.label}
              </span>
            )}
          </div>

          {/* Date + coverage */}
          <div className="mt-3 text-xs text-gray-400">
            {story.generatedAt && (
              <span>Generated {new Date(story.generatedAt).toLocaleDateString()}</span>
            )}
            {coverage && coverage.total > 0 && (
              <span className="ml-3">
                {coverage.sourced} of {coverage.total} sections sourced
              </span>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 my-8" />

          {/* Sections - Evidence view (Tufte two-column) or clean reading view */}
          {evidenceOn ? (
            <StoryEvidenceView
              story={story}
              sectionKeys={sectionKeys}
              sourcesBySection={sourcesBySection}
              isOwner
            />
          ) : (
            <div className="space-y-10">
              {sectionKeys.map((key: string) => {
                const section = story.sections[key];
                if (!section) return null;
                const sectionLabel = key.charAt(0).toUpperCase() + key.slice(1);
                const sectionSources = sourcesBySection.get(key) ?? [];
                const vagueMetrics = coverage?.vagueMetrics?.filter(v => v.sectionKey === key) ?? [];
                const ungrounded = coverage?.ungroundedClaims?.filter(v => v.sectionKey === key) ?? [];

                return (
                  <div key={key}>
                    <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-400 mb-3">
                      {sectionLabel}
                    </h2>
                    {section.summary ? (
                      <p className="font-serif text-lg text-gray-800 leading-relaxed whitespace-pre-wrap">
                        {section.summary}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-400 italic">No content yet</p>
                    )}

                    {/* Vague metrics + ungrounded claims (author only) */}
                    {(vagueMetrics.length > 0 || ungrounded.length > 0) && (
                      <div className="mt-3 space-y-1.5">
                        {vagueMetrics.map((v, i) => (
                          <div key={`vm-${i}`} className="flex items-start gap-1.5 text-xs text-amber-600">
                            <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                            <span>Vague metric: &ldquo;{v.match}&rdquo; — {v.suggestion}</span>
                          </div>
                        ))}
                        {ungrounded.map((v, i) => (
                          <div key={`ug-${i}`} className="flex items-start gap-1.5 text-xs text-amber-600">
                            <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                            <span>Ungrounded: &ldquo;{v.match}&rdquo; — {v.suggestion}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Sources */}
                    {sectionSources.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-gray-100">
                        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1.5">
                          Sources
                        </p>
                        <div className="space-y-0.5">
                          {sectionSources.map((s) => (
                            <SourceItem key={s.id} source={s} isOwner />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer metadata */}
          <div className="mt-16 pt-6 border-t border-gray-200 text-xs text-gray-400 print:mt-8">
            <div className="flex items-center gap-4 flex-wrap">
              {story.activityIds && story.activityIds.length > 0 && (
                <span>{story.activityIds.length} {story.activityIds.length === 1 ? 'activity' : 'activities'}</span>
              )}
              {story.publishedAt && (
                <span>Published {new Date(story.publishedAt).toLocaleDateString()}</span>
              )}
              <span className="text-gray-300">AI-enhanced</span>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Public view — original layout for non-owners
  return (
    <div className="min-h-screen bg-gray-50">
      <div className={cn(
        'mx-auto px-4 py-8 transition-[max-width] duration-300',
        evidenceOn ? 'max-w-[1280px]' : 'max-w-2xl',
      )}>
        {/* Back link + evidence toggle */}
        <div className="flex items-center justify-between mb-6">
          {author ? (
            <Link
              to={`/profile/${author.id}`}
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              View profile
            </Link>
          ) : <span />}
          <EvidenceToggle on={evidenceOn} onToggle={toggleEvidence} />
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
        <h1 className="text-xl font-bold text-gray-900 mb-2">{story.title}</h1>
        <div className="flex items-center gap-1.5 flex-wrap mb-4">
          {frameworkMeta && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-gray-100 text-gray-600">
              {story.framework}
            </span>
          )}
          {archetypeMeta && story.archetype && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-primary-50 text-primary-700 capitalize">
              {story.archetype}
            </span>
          )}
          {categoryMeta && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-blue-50 text-blue-700">
              {categoryMeta.label}
            </span>
          )}
        </div>

        {/* Source coverage header */}
        {coverage && coverage.total > 0 && (
          <p className="text-xs text-gray-500 mb-6">
            {coverage.sourced} of {coverage.total} sections have sources
          </p>
        )}

        {/* Sections */}
        {evidenceOn ? (
          <StoryEvidenceView
            story={story}
            sectionKeys={sectionKeys}
            sourcesBySection={sourcesBySection}
          />
        ) : (
          <div className="space-y-6">
            {sectionKeys.map((key: string) => {
              const section = story.sections[key];
              if (!section) return null;
              const sectionLabel = key.charAt(0).toUpperCase() + key.slice(1);
              const sectionSources = sourcesBySection.get(key) ?? [];

              return (
                <div key={key} className="bg-white rounded-lg border border-gray-200 p-5">
                  <h2 className="text-sm font-semibold text-gray-800 mb-2">{sectionLabel}</h2>
                  {section.summary && (
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {section.summary}
                    </p>
                  )}

                  {/* Sources for this section */}
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
              );
            })}
          </div>
        )}

        {/* Published date */}
        {story.publishedAt && (
          <p className="text-xs text-gray-400 mt-6 text-center">
            Published {new Date(story.publishedAt).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
}
