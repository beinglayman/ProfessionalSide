import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import {
  MapPin,
  Building2,
  Edit,
  Briefcase,
  GraduationCap,
  Award,
  ArrowRight,
  Target,
  Heart,
  Clock,
  Sparkles,
  ExternalLink,
  FileText,
  PenLine,
  ChevronDown,
  ChevronRight,
  LayoutGrid,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useProfile } from '../../hooks/useProfile';
import { useAuth } from '../../contexts/AuthContext';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { getAvatarUrl, handleAvatarError } from '../../utils/avatar';
import { useListCareerStories, useStoryActivityMap } from '../../hooks/useCareerStories';
import { useFollowCounts } from '../../hooks/usePublicProfile';
import {
  BRAG_DOC_CATEGORIES,
  ARCHETYPE_METADATA,
  NARRATIVE_FRAMEWORKS,
} from '../../components/career-stories/constants';
import { ToolIcon } from '../../components/career-stories/ToolIcon';
import type { CareerStory, ToolActivity } from '../../types/career-stories';
import {
  groupStoriesByQuarter,
  groupStoriesByCategory,
  formatTimeSpan,
  type QuarterGroup,
} from '../../utils/story-timeline';

export function ProfileViewPage() {
  useDocumentTitle('Profile');

  const { user } = useAuth();
  const { profile, isLoading, error, refetch } = useProfile();
  const { data: storiesData } = useListCareerStories();
  const { data: followCounts } = useFollowCounts(user?.id ?? '');

  const allStories: CareerStory[] = storiesData?.stories ?? [];
  const publishedStories = useMemo(() => allStories.filter((s) => s.isPublished), [allStories]);
  const draftStories = useMemo(() => allStories.filter((s) => !s.isPublished), [allStories]);

  // Build O(1) activity lookup from published stories
  const activityMap = useStoryActivityMap(publishedStories);

  // Group published stories by quarter (timeline view)
  const storiesByQuarter = useMemo(
    () => groupStoriesByQuarter(publishedStories, activityMap),
    [publishedStories, activityMap],
  );

  // Group published stories by brag doc category
  const storiesByCategory = useMemo(() => groupStoriesByCategory(publishedStories), [publishedStories]);

  // Story stats
  const mostRecentPublish = useMemo(() => {
    const dates = publishedStories
      .map((s) => s.publishedAt)
      .filter(Boolean)
      .sort()
      .reverse();
    return dates[0] ? new Date(dates[0]) : null;
  }, [publishedStories]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-red-600">Failed to load profile: {error}</p>
        <Button onClick={refetch}>Try Again</Button>
      </div>
    );
  }

  // No profile — nudge to onboarding
  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-semibold text-gray-900">Complete Your Profile</h1>
        <p className="text-gray-600 max-w-md text-center">
          Your professional profile is not yet set up. Complete onboarding to get started.
        </p>
        <Button asChild className="bg-purple-600 hover:bg-purple-700 text-white">
          <Link to="/onboarding">Get Started</Link>
        </Button>
      </div>
    );
  }

  const hasAboutMe =
    profile.yearsOfExperience ||
    (profile.specializations && profile.specializations.length > 0) ||
    profile.careerHighlights ||
    (profile.careerGoals && profile.careerGoals.length > 0) ||
    (profile.professionalInterests && profile.professionalInterests.length > 0);

  const hasWorkExperience = profile.workExperiences && profile.workExperiences.length > 0;
  const hasEducation = profile.education && profile.education.length > 0;
  const hasCertifications = profile.certifications && profile.certifications.length > 0;
  const hasSkills = profile.topSkills && profile.topSkills.length > 0;
  const enrichedSkills = profile.onboardingData?.skills as Array<{ name: string; proficiency: string; category: string }> | undefined;
  const hasProfessionalBackground = hasWorkExperience || hasEducation || hasCertifications || hasSkills;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* ================================================================ */}
        {/* Section 1: Profile Header                                        */}
        {/* ================================================================ */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <Link to="/me/edit" className="relative group flex-shrink-0">
                <img
                  src={getAvatarUrl(profile.avatar)}
                  alt={profile.name || 'Profile'}
                  className="h-20 w-20 rounded-full object-cover bg-gray-100 ring-2 ring-white group-hover:ring-primary-400 transition-all"
                  onError={handleAvatarError}
                />
                <div className="absolute inset-0 h-20 w-20 rounded-full bg-black/0 group-hover:bg-black/10 transition-all flex items-center justify-center">
                  <Edit className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
              <div className="min-w-0">
                <Link to="/me/edit" className="hover:text-primary-600 transition-colors">
                  <h1 className="text-2xl font-semibold text-gray-900">{profile.name}</h1>
                </Link>
                <p className="text-base text-gray-600">{profile.title}</p>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  {profile.location && (
                    <span className="inline-flex items-center gap-1 text-sm text-gray-500">
                      <MapPin className="h-3.5 w-3.5" />
                      {profile.location}
                    </span>
                  )}
                  {profile.company && (
                    <span className="inline-flex items-center gap-1 text-sm text-gray-500">
                      <Building2 className="h-3.5 w-3.5" />
                      {profile.company}
                    </span>
                  )}
                  {profile.industry && (
                    <span className="inline-flex items-center gap-1 text-sm text-gray-500">
                      <Briefcase className="h-3.5 w-3.5" />
                      {profile.industry}
                    </span>
                  )}
                  {profile.yearsOfExperience != null && profile.yearsOfExperience > 0 && (
                    <span className="inline-flex items-center gap-1 text-sm text-gray-500">
                      <Clock className="h-3.5 w-3.5" />
                      {profile.yearsOfExperience}y exp
                    </span>
                  )}
                </div>
                {followCounts && (
                  <p className="text-sm text-gray-500 mt-1.5">
                    <span className="font-semibold text-gray-700">{followCounts.followerCount}</span>{' '}
                    followers{' '}
                    <span className="mx-1">&middot;</span>{' '}
                    <span className="font-semibold text-gray-700">{followCounts.followingCount}</span>{' '}
                    following
                  </p>
                )}
              </div>
            </div>

            <Button variant="outline" asChild className="sm:px-4 px-2 flex-shrink-0">
              <Link to="/me/edit">
                <Edit className="sm:mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Edit Profile</span>
              </Link>
            </Button>
          </div>

          {profile.bio && (
            <div className="mt-4 bg-gray-50 rounded-lg p-4 border">
              <p className="text-sm text-gray-700 whitespace-pre-line">{profile.bio}</p>
            </div>
          )}
        </div>

        {/* ================================================================ */}
        {/* Section 2: About Me                                              */}
        {/* ================================================================ */}
        {hasAboutMe && (
          <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-5">
            <h2 className="text-sm font-semibold text-gray-700">About Me</h2>

            {profile.careerHighlights && (
              <div>
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3" />
                  Career Highlights
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed">{profile.careerHighlights}</p>
              </div>
            )}

            {profile.specializations && profile.specializations.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                  <Target className="h-3 w-3" />
                  Specializations
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {profile.specializations.map((spec: string, i: number) => (
                    <span key={i} className="bg-blue-50 text-blue-700 rounded-full px-2.5 py-0.5 text-xs font-medium">
                      {spec}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {profile.careerGoals && profile.careerGoals.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                  <Target className="h-3 w-3" />
                  Career Goals
                </h3>
                <ul className="space-y-1">
                  {profile.careerGoals.map((goal: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary-400 flex-shrink-0" />
                      {goal}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {profile.professionalInterests && profile.professionalInterests.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                  <Heart className="h-3 w-3" />
                  Interests
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {profile.professionalInterests.map((interest: string, i: number) => (
                    <span key={i} className="bg-purple-50 text-purple-700 rounded-full px-2.5 py-0.5 text-xs font-medium">
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================================================================ */}
        {/* Section 3: Career Stories — Stats + Drafts + By-Category          */}
        {/* ================================================================ */}
        <ProfileCareerStories
          publishedStories={publishedStories}
          draftStories={draftStories}
          activityMap={activityMap}
          storiesByQuarter={storiesByQuarter}
          storiesByCategory={storiesByCategory}
          mostRecentPublish={mostRecentPublish}
        />

        {/* ================================================================ */}
        {/* Section 4: Professional Background                               */}
        {/* ================================================================ */}
        {hasProfessionalBackground && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Professional Background</h2>
            <div className="space-y-4">

              {/* Work Experience — enriched */}
              {hasWorkExperience && (
                <div className="bg-white rounded-lg border border-gray-200 p-5">
                  <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
                    <Briefcase className="h-4 w-4 text-gray-400" />
                    Work Experience
                  </h3>
                  <div className="space-y-4">
                    {profile.workExperiences!.slice(0, 3).map((exp: any, i: number) => (
                      <div key={i} className={cn(i > 0 && 'border-t pt-4')}>
                        <p className="text-sm font-medium text-gray-900">{exp.title}</p>
                        <p className="text-xs text-gray-500">
                          {exp.company}
                          {exp.location && <> &middot; {exp.location}</>}
                          {exp.startDate && (
                            <> &middot; {exp.startDate}{exp.isCurrentRole ? ' - Present' : exp.endDate ? ` - ${exp.endDate}` : ''}</>
                          )}
                        </p>
                        {exp.description && (
                          <p className="text-xs text-gray-600 mt-1 line-clamp-3">{exp.description}</p>
                        )}
                        {exp.achievements && exp.achievements.length > 0 && (
                          <ul className="mt-1.5 space-y-0.5">
                            {exp.achievements.slice(0, 3).map((ach: string, j: number) => (
                              <li key={j} className="flex items-start gap-1.5 text-xs text-gray-600">
                                <span className="mt-1 h-1 w-1 rounded-full bg-green-400 flex-shrink-0" />
                                {ach}
                              </li>
                            ))}
                          </ul>
                        )}
                        {exp.skills && exp.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {exp.skills.slice(0, 6).map((s: string) => (
                              <span key={s} className="bg-gray-100 text-gray-600 rounded px-1.5 py-0.5 text-[10px]">
                                {s}
                              </span>
                            ))}
                            {exp.skills.length > 6 && (
                              <span className="text-[10px] text-gray-400">+{exp.skills.length - 6}</span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    {profile.workExperiences!.length > 3 && (
                      <p className="text-xs text-gray-500 italic">
                        +{profile.workExperiences!.length - 3} more position{profile.workExperiences!.length - 3 !== 1 && 's'}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Education — enriched */}
              {hasEducation && (
                <div className="bg-white rounded-lg border border-gray-200 p-5">
                  <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
                    <GraduationCap className="h-4 w-4 text-gray-400" />
                    Education
                  </h3>
                  <div className="space-y-4">
                    {profile.education!.slice(0, 2).map((edu: any, i: number) => (
                      <div key={i} className={cn(i > 0 && 'border-t pt-4')}>
                        <p className="text-sm font-medium text-gray-900">
                          {edu.degree}{edu.fieldOfStudy ? `, ${edu.fieldOfStudy}` : ''}
                        </p>
                        <p className="text-xs text-gray-500">
                          {edu.institution}
                          {edu.location && <> &middot; {edu.location}</>}
                          {edu.startYear && (
                            <> &middot; {edu.startYear}{edu.isCurrentlyStudying ? ' - Present' : edu.endYear ? ` - ${edu.endYear}` : ''}</>
                          )}
                        </p>
                        {edu.grade && (
                          <p className="text-xs text-gray-600 mt-0.5">Grade: {edu.grade}</p>
                        )}
                        {edu.description && (
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">{edu.description}</p>
                        )}
                        {edu.activities && edu.activities.length > 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            Activities: {edu.activities.join(', ')}
                          </p>
                        )}
                      </div>
                    ))}
                    {profile.education!.length > 2 && (
                      <p className="text-xs text-gray-500 italic">
                        +{profile.education!.length - 2} more
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Certifications — enriched */}
              {hasCertifications && (
                <div className="bg-white rounded-lg border border-gray-200 p-5">
                  <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
                    <Award className="h-4 w-4 text-gray-400" />
                    Certifications
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {profile.certifications!.map((cert: any, i: number) => (
                      <div key={i} className="border rounded-lg p-3">
                        <p className="text-sm font-medium text-gray-900">{cert.name}</p>
                        <p className="text-xs text-gray-500">
                          {cert.issuingOrganization}
                          {cert.issueDate && <> &middot; {cert.issueDate}</>}
                          {cert.neverExpires ? ' &middot; No Expiration' : cert.expirationDate ? ` - ${cert.expirationDate}` : ''}
                        </p>
                        {cert.description && (
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">{cert.description}</p>
                        )}
                        {cert.credentialUrl && (
                          <a
                            href={cert.credentialUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 mt-1"
                          >
                            View Credential <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Skills — enriched with proficiency when available */}
              {hasSkills && (
                <div className="bg-white rounded-lg border border-gray-200 p-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Skills</h3>
                  {enrichedSkills && enrichedSkills.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {enrichedSkills.map((skill, i) => (
                        <span
                          key={i}
                          className={cn(
                            'rounded-full px-2.5 py-0.5 text-xs font-medium',
                            skill.proficiency === 'expert' && 'bg-primary-100 text-primary-800',
                            skill.proficiency === 'advanced' && 'bg-primary-50 text-primary-700',
                            skill.proficiency === 'intermediate' && 'bg-gray-100 text-gray-700',
                            (!skill.proficiency || skill.proficiency === 'beginner') && 'bg-gray-50 text-gray-600',
                          )}
                          title={skill.proficiency ? `${skill.proficiency}${skill.category ? ` — ${skill.category}` : ''}` : undefined}
                        >
                          {skill.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {profile.topSkills!.map((skill: string) => (
                        <span
                          key={skill}
                          className="bg-primary-50 text-primary-700 rounded-full px-2.5 py-0.5 text-xs"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ProfileCareerStories({
  publishedStories,
  draftStories,
  activityMap,
  storiesByQuarter,
  storiesByCategory,
  mostRecentPublish,
}: {
  publishedStories: CareerStory[];
  draftStories: CareerStory[];
  activityMap: Map<string, ToolActivity>;
  storiesByQuarter: QuarterGroup[];
  storiesByCategory: Map<string, CareerStory[]>;
  mostRecentPublish: Date | null;
}) {
  const [storyView, setStoryView] = useState<'timeline' | 'category'>('timeline');

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Career Stories</h2>
        <div className="flex items-center gap-3">
          {publishedStories.length > 0 && (
            <div className="inline-flex items-center bg-gray-50 rounded-full p-0.5">
              {([
                { key: 'timeline' as const, label: 'Timeline', Icon: Clock },
                { key: 'category' as const, label: 'Category', Icon: LayoutGrid },
              ]).map(({ key, label, Icon }) => (
                <button
                  key={key}
                  onClick={() => setStoryView(key)}
                  aria-pressed={storyView === key}
                  className={cn(
                    'inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full transition-colors',
                    storyView === key
                      ? 'bg-white shadow-sm border text-primary-700'
                      : 'text-gray-500 hover:text-gray-700',
                  )}
                >
                  <Icon className="w-3 h-3" />
                  {label}
                </button>
              ))}
            </div>
          )}
          <Link
            to="/stories"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            View All <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Stats bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <span className="inline-flex items-center gap-1.5 text-gray-600">
          <FileText className="h-3.5 w-3.5 text-primary-500" />
          <span className="font-semibold text-gray-900">{publishedStories.length}</span> published
        </span>
        {draftStories.length > 0 && (
          <Link
            to="/stories"
            className="inline-flex items-center gap-1.5 text-gray-600 hover:text-primary-600"
          >
            <PenLine className="h-3.5 w-3.5 text-amber-500" />
            <span className="font-semibold text-gray-900">{draftStories.length}</span> draft{draftStories.length !== 1 && 's'} in progress
          </Link>
        )}
        {mostRecentPublish && (
          <span className="inline-flex items-center gap-1.5 text-gray-500 text-xs ml-auto">
            Last published {mostRecentPublish.toLocaleDateString()}
          </span>
        )}
      </div>

      {/* Conditional view: Timeline or Category */}
      {storyView === 'timeline' ? (
        <TimelineView groups={storiesByQuarter} activityMap={activityMap} />
      ) : (
        <div className="space-y-4">
          {BRAG_DOC_CATEGORIES.map((cat) => {
            const catStories = storiesByCategory.get(cat.value);
            return (
              <CategorySection
                key={cat.value}
                label={cat.label}
                description={cat.description}
                stories={catStories ?? []}
                activityMap={activityMap}
              />
            );
          })}
          {storiesByCategory.has('other') && (
            <CategorySection
              label="Other"
              description="Uncategorized stories"
              stories={storiesByCategory.get('other')!}
              activityMap={activityMap}
            />
          )}
        </div>
      )}
    </div>
  );
}

function CategorySection({
  label,
  description,
  stories,
  activityMap,
}: {
  label: string;
  description: string;
  stories: CareerStory[];
  activityMap: Map<string, ToolActivity>;
}) {
  const isEmpty = stories.length === 0;

  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <h3 className="text-sm font-semibold text-gray-700">{label}</h3>
        {!isEmpty && (
          <span className="text-[10px] font-medium text-gray-400 bg-gray-100 rounded-full px-1.5 py-0.5">
            {stories.length}
          </span>
        )}
      </div>
      <p className="text-xs text-gray-500 mb-2">{description}</p>

      {isEmpty ? (
        <Link
          to="/stories"
          className="block border border-dashed border-gray-200 rounded-lg p-4 text-center hover:border-gray-300 hover:bg-gray-50/50 transition-colors"
        >
          <p className="text-xs text-gray-400">
            No stories yet &middot; <span className="text-primary-500 font-medium">Add one</span>
          </p>
        </Link>
      ) : (
        <div>
          {stories.map((story, i) => (
            <div key={story.id} className="relative flex gap-4">
              <TimelineSpine isLast={i === stories.length - 1} />
              <div className="flex-1 min-w-0 pb-4">
                <StoryCard story={story} activityMap={activityMap} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared spine (dot + connecting line)
// ---------------------------------------------------------------------------

function TimelineSpine({ isLast }: { isLast: boolean }) {
  return (
    <div className="flex flex-col items-center flex-shrink-0 w-5">
      <div className="w-3 h-3 rounded-full mt-4 flex-shrink-0 ring-4 ring-gray-50 z-10 bg-primary-500" />
      {!isLast && <div className="w-px flex-1 bg-gray-200" />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Timeline sub-components
// ---------------------------------------------------------------------------

function TimelineView({
  groups,
  activityMap,
}: {
  groups: QuarterGroup[];
  activityMap: Map<string, ToolActivity>;
}) {
  if (groups.length === 0) {
    return (
      <Link
        to="/stories"
        className="block border border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-gray-300 hover:bg-gray-50/50 transition-colors"
      >
        <p className="text-xs text-gray-400">
          No published stories yet &middot;{' '}
          <span className="text-primary-500 font-medium">Create one</span>
        </p>
      </Link>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <QuarterSection
          key={group.label}
          group={group}
          activityMap={activityMap}
        />
      ))}
    </div>
  );
}

function QuarterSection({
  group,
  activityMap,
}: {
  group: QuarterGroup;
  activityMap: Map<string, ToolActivity>;
}) {
  const categoryLabels = useMemo(() => {
    const labels: string[] = [];
    for (const cat of BRAG_DOC_CATEGORIES) {
      if (group.categories.has(cat.value)) labels.push(cat.label);
    }
    return labels;
  }, [group.categories]);

  return (
    <div>
      {/* Quarter header */}
      <div className="flex items-center gap-3 mb-2">
        <span className="text-xs font-bold text-gray-600">{group.label}</span>
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-[10px] font-medium text-gray-400 bg-gray-100 rounded-full px-1.5 py-0.5">
          {group.stories.length}
        </span>
      </div>

      {/* Timeline spine + cards */}
      <div>
        {group.stories.map(({ story, timeRange }, i) => (
          <div key={story.id} className="relative flex gap-4">
            <TimelineSpine isLast={i === group.stories.length - 1} />
            <div className="flex-1 min-w-0 pb-4">
              <StoryCard story={story} activityMap={activityMap} />
              <p className="text-[11px] text-gray-400 mt-1 ml-1">
                {formatTimeSpan(timeRange.earliest, timeRange.latest)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Category chips */}
      {categoryLabels.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1 ml-9">
          {categoryLabels.map((label) => (
            <span
              key={label}
              className="bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 text-[10px]"
            >
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// StoryCard
// ---------------------------------------------------------------------------

function StoryCard({
  story,
  activityMap,
}: {
  story: CareerStory;
  activityMap: Map<string, ToolActivity>;
}) {
  const [expanded, setExpanded] = useState(false);
  const frameworkMeta = NARRATIVE_FRAMEWORKS[story.framework];
  const archetypeMeta = story.archetype ? ARCHETYPE_METADATA[story.archetype] : null;

  const firstSectionKey = frameworkMeta?.sections?.[0];
  const firstSection = firstSectionKey ? story.sections[firstSectionKey] : null;
  const preview = firstSection?.summary ?? '';

  // Count total unique activities across all sections
  const totalSources = useMemo(() => {
    const ids = new Set<string>();
    for (const id of story.activityIds ?? []) ids.add(id);
    for (const section of Object.values(story.sections)) {
      for (const ev of section.evidence ?? []) {
        if (ev.activityId) ids.add(ev.activityId);
      }
    }
    return ids.size;
  }, [story]);

  return (
    <div
      className={cn(
        'bg-white rounded-lg border border-gray-200 p-4 transition-colors cursor-pointer',
        expanded ? 'border-gray-300' : 'hover:border-gray-300',
      )}
      onClick={() => setExpanded((prev) => !prev)}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-gray-900">{story.title}</p>
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
        )}
      </div>

      {/* Badges */}
      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
        <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-gray-100 text-gray-600">
          {story.framework}
        </span>
        {archetypeMeta && story.archetype && (
          <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-primary-50 text-primary-700 capitalize">
            {story.archetype}
          </span>
        )}
        {story.role && (
          <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-blue-50 text-blue-700 capitalize">
            {story.role}
          </span>
        )}
        {story.visibility && story.visibility !== 'private' && (
          <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-green-50 text-green-700 capitalize">
            {story.visibility}
          </span>
        )}
      </div>

      {/* Collapsed: preview + source count */}
      {!expanded && (
        <>
          {preview && (
            <p className="text-xs text-gray-600 line-clamp-2 mt-2">{preview}</p>
          )}
          <div className="flex items-center gap-3 mt-2">
            {story.publishedAt && (
              <p className="text-xs text-gray-400">
                Published {new Date(story.publishedAt).toLocaleDateString()}
              </p>
            )}
            {totalSources > 0 && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-gray-100 text-gray-500">
                {totalSources} source{totalSources !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </>
      )}

      {/* Expanded: all sections with evidence */}
      {expanded && (
        <div className="mt-3 space-y-3" onClick={(e) => e.stopPropagation()}>
          {(frameworkMeta?.sections ?? Object.keys(story.sections)).map((sectionKey) => {
            const section = story.sections[sectionKey];
            if (!section) return null;

            const evidenceActivities = (section.evidence ?? [])
              .map((ev) => (ev.activityId ? activityMap.get(ev.activityId) : undefined))
              .filter((a): a is ToolActivity => !!a);

            return (
              <div key={sectionKey}>
                <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  {sectionKey}
                </h4>
                <p className="text-xs text-gray-700 leading-relaxed">{section.summary}</p>

                {/* Evidence citations */}
                {evidenceActivities.length > 0 && (
                  <div className="mt-1.5 pl-3 border-l border-gray-200">
                    <div className="space-y-1">
                      {evidenceActivities.slice(0, 4).map((activity) => (
                        <a
                          key={activity.id}
                          href={activity.sourceUrl || '#'}
                          target={activity.sourceUrl ? '_blank' : undefined}
                          rel={activity.sourceUrl ? 'noopener noreferrer' : undefined}
                          className={cn(
                            'flex items-center gap-1.5 py-0.5 text-[11px] text-gray-500',
                            'hover:text-gray-900 transition-colors group',
                            !activity.sourceUrl && 'cursor-default hover:text-gray-500',
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!activity.sourceUrl) e.preventDefault();
                          }}
                        >
                          <ToolIcon tool={activity.source} className="w-3.5 h-3.5 text-[7px]" />
                          <span className="truncate">{activity.title}</span>
                          {activity.sourceUrl && (
                            <ExternalLink className="h-2.5 w-2.5 flex-shrink-0 opacity-0 group-hover:opacity-100" />
                          )}
                        </a>
                      ))}
                      {evidenceActivities.length > 4 && (
                        <span className="text-[10px] text-gray-400">
                          +{evidenceActivities.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Footer: publish date + link to career stories */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            {story.publishedAt && (
              <p className="text-xs text-gray-400">
                Published {new Date(story.publishedAt).toLocaleDateString()}
              </p>
            )}
            <Link
              to="/stories"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700"
              onClick={(e) => e.stopPropagation()}
            >
              View in Career Stories <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
