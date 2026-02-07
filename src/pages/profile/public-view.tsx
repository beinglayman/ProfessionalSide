import { useParams, Link } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import {
  MapPin,
  Building2,
  UserPlus,
  UserCheck,
  ArrowLeft,
  Briefcase,
  GraduationCap,
  Award,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import {
  usePublicProfile,
  usePublishedStories,
  useFollowStatus,
  useFollowCounts,
  useToggleFollow,
} from '../../hooks/usePublicProfile';
import {
  BRAG_DOC_CATEGORIES,
  ARCHETYPE_METADATA,
  NARRATIVE_FRAMEWORKS,
} from '../../components/career-stories/constants';
import type { CareerStory, BragDocCategory } from '../../types/career-stories';

export function PublicProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser } = useAuth();
  const isOwnProfile = currentUser?.id === userId;

  const { data: profile, isLoading, isError } = usePublicProfile(userId!);
  const { data: stories = [] } = usePublishedStories(userId!);
  const { data: followStatus } = useFollowStatus(userId!);
  const { data: followCounts } = useFollowCounts(userId!);
  const toggleFollow = useToggleFollow(userId!);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-600">Profile not found</p>
        <Link to="/network">
          <Button variant="outline">Back to Network</Button>
        </Link>
      </div>
    );
  }

  // Group stories by brag doc category
  const storiesByCategory = new Map<BragDocCategory | 'other', CareerStory[]>();
  for (const story of stories) {
    const key = story.category ?? 'other';
    if (!storiesByCategory.has(key)) storiesByCategory.set(key, []);
    storiesByCategory.get(key)!.push(story);
  }

  const hasWorkExperience = profile.workExperiences && profile.workExperiences.length > 0;
  const hasEducation = profile.education && profile.education.length > 0;
  const hasCertifications = profile.certifications && profile.certifications.length > 0;
  const hasSkills = profile.topSkills && profile.topSkills.length > 0;
  const hasProfessionalBackground = hasWorkExperience || hasEducation || hasCertifications || hasSkills;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Link
          to="/network"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Network
        </Link>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Section 1: Profile Header */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <img
                src={profile.avatar || '/default-avatar.svg'}
                alt={profile.name}
                className="h-20 w-20 rounded-full object-cover bg-gray-100"
              />
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">{profile.name}</h1>
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

            {!isOwnProfile && followStatus && (
              <Button
                variant={followStatus.isFollowing ? 'outline' : 'default'}
                size="sm"
                onClick={() => toggleFollow.mutate(followStatus.isFollowing)}
                disabled={toggleFollow.isPending}
              >
                {followStatus.isFollowing ? (
                  <>
                    <UserCheck className="h-4 w-4 mr-1.5" />
                    Following
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-1.5" />
                    Follow
                  </>
                )}
              </Button>
            )}
          </div>

          {profile.bio && (
            <div className="mt-4 bg-gray-50 rounded-lg p-4 border">
              <p className="text-sm text-gray-700 whitespace-pre-line">{profile.bio}</p>
            </div>
          )}
        </div>

        {/* Section 2: Career Stories */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Career Stories</h2>
          {stories.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <p className="text-sm text-gray-500">No published stories yet.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {BRAG_DOC_CATEGORIES.map((cat) => {
                const catStories = storiesByCategory.get(cat.value);
                if (!catStories || catStories.length === 0) return null;
                return (
                  <CategorySection
                    key={cat.value}
                    label={cat.label}
                    description={cat.description}
                    stories={catStories}
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
          )}
        </div>

        {/* Section 3: Professional Background */}
        {hasProfessionalBackground && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Professional Background</h2>
            <div className="space-y-4">
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
                          {exp.startDate && (
                            <> &middot; {exp.startDate}{exp.isCurrentRole ? ' - Present' : exp.endDate ? ` - ${exp.endDate}` : ''}</>
                          )}
                        </p>
                        {exp.description && (
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">{exp.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
                          {edu.startYear && (
                            <> &middot; {edu.startYear}{edu.isCurrentlyStudying ? ' - Present' : edu.endYear ? ` - ${edu.endYear}` : ''}</>
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {hasSkills && (
                <div className="bg-white rounded-lg border border-gray-200 p-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Skills</h3>
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
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CategorySection({
  label,
  description,
  stories,
}: {
  label: string;
  description: string;
  stories: CareerStory[];
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700">{label}</h3>
      <p className="text-xs text-gray-500 mb-2">{description}</p>
      <div className="space-y-2">
        {stories.map((story) => (
          <StoryCard key={story.id} story={story} />
        ))}
      </div>
    </div>
  );
}

function StoryCard({ story }: { story: CareerStory }) {
  const frameworkMeta = NARRATIVE_FRAMEWORKS[story.framework];
  const archetypeMeta = story.archetype ? ARCHETYPE_METADATA[story.archetype] : null;

  // Get first section summary as preview
  const firstSectionKey = frameworkMeta?.sections?.[0];
  const firstSection = firstSectionKey ? story.sections[firstSectionKey] : null;
  const preview = firstSection?.summary ?? '';

  return (
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
        {story.role && (
          <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-blue-50 text-blue-700 capitalize">
            {story.role}
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
    </div>
  );
}
