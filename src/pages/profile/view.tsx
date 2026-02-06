import { useMemo } from 'react';
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
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useProfile } from '../../hooks/useProfile';
import { useAuth } from '../../contexts/AuthContext';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { getAvatarUrl, handleAvatarError } from '../../utils/avatar';
import { useListCareerStories } from '../../hooks/useCareerStories';
import { useFollowCounts } from '../../hooks/usePublicProfile';
import {
  BRAG_DOC_CATEGORIES,
  ARCHETYPE_METADATA,
  NARRATIVE_FRAMEWORKS,
} from '../../components/career-stories/constants';
import type { CareerStory, BragDocCategory } from '../../types/career-stories';

export function ProfileViewPage() {
  useDocumentTitle('Profile');

  const { user } = useAuth();
  const { profile, isLoading, error, refetch } = useProfile();
  const { data: storiesData } = useListCareerStories();
  const { data: followCounts } = useFollowCounts(user?.id ?? '');

  const allStories: CareerStory[] = (storiesData as any)?.stories ?? [];
  const publishedStories = allStories.filter((s) => s.isPublished);
  const draftStories = allStories.filter((s) => !s.isPublished);

  // Group published stories by brag doc category
  const storiesByCategory = useMemo(() => {
    const map = new Map<BragDocCategory | 'other', CareerStory[]>();
    for (const story of publishedStories) {
      const key = story.category ?? 'other';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(story);
    }
    return map;
  }, [publishedStories]);

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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ================================================================ */}
        {/* Section 1: Profile Header                                        */}
        {/* ================================================================ */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <Link to="/profile/edit" className="relative group flex-shrink-0">
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
                <Link to="/profile/edit" className="hover:text-primary-600 transition-colors">
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
              <Link to="/profile/edit">
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
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Career Stories</h2>
            <Link
              to="/career-stories"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              View All <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Stats bar */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <span className="inline-flex items-center gap-1.5 text-gray-600">
              <FileText className="h-3.5 w-3.5 text-primary-500" />
              <span className="font-semibold text-gray-900">{publishedStories.length}</span> published
            </span>
            {draftStories.length > 0 && (
              <Link
                to="/career-stories"
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

          {/* Category breakdown — always show all categories as brag-doc scaffold */}
          <div className="space-y-4">
            {BRAG_DOC_CATEGORIES.map((cat) => {
              const catStories = storiesByCategory.get(cat.value);
              return (
                <CategorySection
                  key={cat.value}
                  label={cat.label}
                  description={cat.description}
                  stories={catStories ?? []}
                />
              );
            })}
            {storiesByCategory.has('other') && (
              <CategorySection
                label="Other"
                description="Uncategorized stories"
                stories={storiesByCategory.get('other')!}
              />
            )}
          </div>
        </div>

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

function CategorySection({
  label,
  description,
  stories,
}: {
  label: string;
  description: string;
  stories: CareerStory[];
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
          to="/career-stories"
          className="block border border-dashed border-gray-200 rounded-lg p-4 text-center hover:border-gray-300 hover:bg-gray-50/50 transition-colors"
        >
          <p className="text-xs text-gray-400">
            No stories yet &middot; <span className="text-primary-500 font-medium">Add one</span>
          </p>
        </Link>
      ) : (
        <div className="space-y-2">
          {stories.map((story) => (
            <StoryCard key={story.id} story={story} />
          ))}
        </div>
      )}
    </div>
  );
}

function StoryCard({ story }: { story: CareerStory }) {
  const frameworkMeta = NARRATIVE_FRAMEWORKS[story.framework];
  const archetypeMeta = story.archetype ? ARCHETYPE_METADATA[story.archetype] : null;

  const firstSectionKey = frameworkMeta?.sections?.[0];
  const firstSection = firstSectionKey ? story.sections[firstSectionKey] : null;
  const preview = firstSection?.summary ?? '';

  return (
    <Link
      to="/career-stories"
      className="block bg-white rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors"
    >
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

      {preview && (
        <p className="text-xs text-gray-600 line-clamp-2 mt-2">{preview}</p>
      )}

      {story.publishedAt && (
        <p className="text-xs text-gray-400 mt-2">
          Published {new Date(story.publishedAt).toLocaleDateString()}
        </p>
      )}
    </Link>
  );
}
