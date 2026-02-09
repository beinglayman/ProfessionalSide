import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, StickyNote, FileText } from 'lucide-react';
import { usePublishedStory } from '../../hooks/usePublicProfile';
import { NARRATIVE_FRAMEWORKS, ARCHETYPE_METADATA, BRAG_DOC_CATEGORIES } from '../../components/career-stories/constants';
import { ToolIcon } from '../../components/career-stories/ToolIcon';
import type { StorySource, ToolType } from '../../types/career-stories';

// Read-only source item for public view
function SourceItem({ source }: { source: StorySource }) {
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

export default function PublishedStoryPage() {
  const { storyId } = useParams<{ storyId: string }>();
  const { data, isLoading, isError } = usePublishedStory(storyId!);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (isError || !data?.data?.story) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">Story not found or is private.</p>
        <Link to="/" className="text-primary-600 hover:underline text-sm">
          Go home
        </Link>
      </div>
    );
  }

  const { story, author } = data.data;
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Back link */}
        {author && (
          <Link
            to={`/profile/${author.id}`}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            View profile
          </Link>
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
