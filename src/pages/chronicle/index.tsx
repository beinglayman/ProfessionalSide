import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Building2, BookOpen } from 'lucide-react';
import { api, API_BASE_URL } from '../../lib/api';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import {
  NARRATIVE_FRAMEWORKS,
  ARCHETYPE_METADATA,
} from '../../components/career-stories/constants';

interface ChronicleUser {
  name: string;
  title: string | null;
  company: string | null;
  avatar: string | null;
  profileUrl: string | null;
}

interface ChronicleStory {
  id: string;
  title: string;
  framework: string;
  archetype: string | null;
  category: string | null;
  role: string | null;
  sections: Record<string, { summary?: string }>;
  publishedAt: string | null;
}

interface ChronicleData {
  user: ChronicleUser;
  stories: ChronicleStory[];
  meta: { allowSearchEngineIndexing: boolean };
}

declare global {
  interface Window {
    __CHRONICLE_DATA__?: ChronicleData;
  }
}

type PageState =
  | { status: 'loading' }
  | { status: 'loaded'; data: ChronicleData }
  | { status: 'private' }
  | { status: 'not-found' };

export default function ChroniclePage() {
  const { slug } = useParams<{ slug: string }>();
  const [state, setState] = useState<PageState>({ status: 'loading' });

  useEffect(() => {
    if (!slug) {
      setState({ status: 'not-found' });
      return;
    }

    // Check for SSR-hydrated data
    if (window.__CHRONICLE_DATA__ && window.__CHRONICLE_DATA__.user?.profileUrl === slug) {
      setState({ status: 'loaded', data: window.__CHRONICLE_DATA__ });
      delete window.__CHRONICLE_DATA__; // Prevent stale data on SPA navigation
      return;
    }

    // Client-side fetch for SPA navigation
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(`/users/chronicle/${slug}`);
        if (cancelled) return;
        if (res.data?.success && res.data.data) {
          setState({ status: 'loaded', data: res.data.data });
        } else {
          setState({ status: 'not-found' });
        }
      } catch (err: any) {
        if (cancelled) return;
        if (err?.response?.status === 404) {
          setState({ status: 'not-found' });
        } else {
          setState({ status: 'not-found' });
        }
      }
    })();

    return () => { cancelled = true; };
  }, [slug]);

  // Set document title
  const pageTitle =
    state.status === 'loaded'
      ? `${state.data.user.name} — Career Chronicle`
      : state.status === 'private'
        ? 'Private Profile'
        : 'Career Chronicle';
  useDocumentTitle(pageTitle);

  if (state.status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (state.status === 'private') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 px-4">
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center max-w-md">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">This profile is private</h1>
          <p className="text-sm text-gray-600">The owner has restricted access to their Career Chronicle.</p>
        </div>
        <ChronicleFooter />
      </div>
    );
  }

  if (state.status === 'not-found') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 px-4">
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center max-w-md">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Page not found</h1>
          <p className="text-sm text-gray-600">This Career Chronicle doesn't exist or has been removed.</p>
        </div>
        <ChronicleFooter />
      </div>
    );
  }

  const { user, stories } = state.data;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Hero: Identity */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-start gap-4">
            <img
              src={user.avatar || '/default-avatar.svg'}
              alt={user.name}
              className="h-20 w-20 rounded-full object-cover bg-gray-100 shrink-0"
            />
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold text-gray-900">{user.name}</h1>
              {user.title && <p className="text-base text-gray-600 mt-0.5">{user.title}</p>}
              {user.company && (
                <span className="inline-flex items-center gap-1 text-sm text-gray-500 mt-1">
                  <Building2 className="h-3.5 w-3.5" />
                  {user.company}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Published Stories */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-gray-400" />
            Published Stories
          </h2>
          {stories.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <p className="text-sm text-gray-500">No stories published yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {stories.map((story) => (
                <ChronicleStoryCard key={story.id} story={story} />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <ChronicleFooter />
      </div>
    </div>
  );
}

function ChronicleStoryCard({ story }: { story: ChronicleStory }) {
  const frameworkMeta = NARRATIVE_FRAMEWORKS[story.framework as keyof typeof NARRATIVE_FRAMEWORKS];
  const archetypeMeta = story.archetype ? ARCHETYPE_METADATA[story.archetype] : null;

  // Get first section summary as preview
  const firstSectionKey = frameworkMeta?.sections?.[0];
  const firstSection = firstSectionKey ? story.sections[firstSectionKey] : null;
  const preview = firstSection?.summary ?? '';

  return (
    <Link to={`/s/${story.id}`} className="block">
      <div className="bg-white rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors">
        <p className="text-sm font-medium text-gray-900">{story.title}</p>

        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-gray-100 text-gray-600">
            {story.framework}
          </span>
          {archetypeMeta && story.archetype && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-primary-50 text-primary-700 capitalize">
              {story.archetype}
            </span>
          )}
          {story.category && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-amber-50 text-amber-700 capitalize">
              {story.category.replace('-', ' ')}
            </span>
          )}
          {story.role && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-blue-50 text-blue-700 capitalize">
              {story.role}
            </span>
          )}
        </div>

        {preview && (
          <p className="text-xs text-gray-600 line-clamp-2 mt-2 whitespace-pre-line">{preview}</p>
        )}

        {story.publishedAt && (
          <p className="text-xs text-gray-400 mt-2">
            Published {new Date(story.publishedAt).toLocaleDateString()}
          </p>
        )}
      </div>
    </Link>
  );
}

function ChronicleFooter() {
  return (
    <div className="text-center py-4">
      <p className="text-xs text-gray-400">
        Powered by{' '}
        <a
          href="https://inchronicle.com"
          className="text-primary-600 hover:text-primary-700 font-medium"
          target="_blank"
          rel="noopener noreferrer"
        >
          inchronicle
        </a>
        {' '}&mdash;{' '}
        <a
          href="https://inchronicle.com/register"
          className="text-primary-600 hover:text-primary-700"
        >
          Create your Career Chronicle
        </a>
      </p>
    </div>
  );
}
