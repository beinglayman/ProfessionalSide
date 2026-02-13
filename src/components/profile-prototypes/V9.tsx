import {
  mockProfile,
  getInitials,
  formatDateRange,
  calculateDuration,
  PROFICIENCY_META,
  getConfidenceLevel,
  getCertExpiryStatus,
} from './mock-data';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import {
  MapPin,
  Building2,
  Users,
  Heart,
  MessageCircle,
  Share2,
  Award,
  BookOpen,
  Briefcase,
  GraduationCap,
  Star,
  ExternalLink,
  UserPlus,
  Calendar,
  ThumbsUp,
  Sparkles,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  V9 — "Social Feed"                                                 */
/*  Social-media inspired profile layout with a unified post feed      */
/* ------------------------------------------------------------------ */

type FeedPost =
  | { type: 'story'; date: number; data: (typeof mockProfile.careerStories)[number] }
  | { type: 'experience'; date: number; data: (typeof mockProfile.experience)[number] }
  | { type: 'certification'; date: number; data: (typeof mockProfile.certifications)[number] }
  | { type: 'education'; date: number; data: (typeof mockProfile.education)[number] };

function relativeDate(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays < 1) return 'today';
  if (diffDays === 1) return '1d ago';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}yr ago`;
}

export function ProfileV9() {
  const p = mockProfile;
  const initials = getInitials(p.name);
  const handle = p.name.toLowerCase().replace(/\s+/g, '');

  /* ---------------------------------------------------------------- */
  /* Build combined feed sorted most-recent-first                      */
  /* ---------------------------------------------------------------- */
  const feedPosts: FeedPost[] = [
    ...p.careerStories.map(
      (s) => ({ type: 'story' as const, date: new Date(s.publishedAt).getTime(), data: s }),
    ),
    ...p.experience.map(
      (e) => ({ type: 'experience' as const, date: new Date(e.startDate).getTime(), data: e }),
    ),
    ...p.certifications.map(
      (c) => ({ type: 'certification' as const, date: new Date(c.issueDate).getTime(), data: c }),
    ),
    ...p.education.map(
      (ed) => ({ type: 'education' as const, date: new Date(`${ed.endYear}-06-01`).getTime(), data: ed }),
    ),
  ].sort((a, b) => b.date - a.date);

  /* ---------------------------------------------------------------- */
  /* Shared sub-components                                             */
  /* ---------------------------------------------------------------- */

  const Avatar = ({ size = 'sm' }: { size?: 'sm' | 'lg' }) => (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-primary-100 shrink-0',
        size === 'lg' ? 'w-24 h-24 border-4 border-white' : 'w-10 h-10',
      )}
    >
      <span
        className={cn(
          'font-bold text-primary-700',
          size === 'lg' ? 'text-2xl' : 'text-sm',
        )}
      >
        {initials}
      </span>
    </div>
  );

  const PostHeader = ({
    icon: Icon,
    iconColor,
    timestamp,
    extra,
  }: {
    icon: React.ComponentType<{ className?: string }>;
    iconColor?: string;
    timestamp: string;
    extra?: React.ReactNode;
  }) => (
    <div className="flex items-center gap-3">
      <Avatar />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-sm">
          <span className="font-semibold text-gray-900">{p.name}</span>
          <span className="text-gray-500">@{handle}</span>
          <span className="text-gray-400">&middot;</span>
          <span className="text-gray-500">{timestamp}</span>
        </div>
        {extra && <div className="text-xs text-gray-500 mt-0.5">{extra}</div>}
      </div>
      <Icon className={cn('h-5 w-5 shrink-0', iconColor ?? 'text-gray-400')} />
    </div>
  );

  const PostFooter = ({
    reactions,
  }: {
    reactions: { icon: React.ComponentType<{ className?: string }>; count: number }[];
  }) => (
    <div className="flex items-center gap-6 pt-2 border-t border-gray-100">
      {reactions.map((r, i) => {
        const Icon = r.icon;
        return (
          <button
            key={i}
            type="button"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 transition-colors"
          >
            <Icon className="h-4 w-4" />
            <span>{r.count}</span>
          </button>
        );
      })}
    </div>
  );

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */
  return (
    <div className="mx-auto max-w-2xl pb-12 space-y-4">
      {/* ============================================================ */}
      {/* PROFILE HEADER CARD                                          */}
      {/* ============================================================ */}
      <Card className="rounded-2xl border overflow-hidden">
        {/* Banner gradient */}
        <div className="h-32 bg-gradient-to-r from-primary-500 to-primary-700" />

        <CardContent className="px-6 pb-6 pt-0">
          {/* Avatar + Follow button row */}
          <div className="flex items-end justify-between -mt-12">
            <Avatar size="lg" />
            <button
              type="button"
              className="bg-primary-500 text-white rounded-full px-6 py-2 text-sm font-semibold hover:bg-primary-600 transition-colors flex items-center gap-1.5 mt-14"
            >
              <UserPlus className="h-4 w-4" />
              Follow
            </button>
          </div>

          {/* Name & handle */}
          <div className="mt-3">
            <h1 className="text-xl font-bold text-gray-900">{p.name}</h1>
            <p className="text-sm text-gray-500">@{handle}</p>
          </div>

          {/* Title + company */}
          <p className="mt-1 text-sm text-gray-700">
            {p.title} at{' '}
            <span className="font-medium">{p.company}</span>
          </p>

          {/* Bio */}
          <p className="mt-2 text-sm text-gray-700 leading-relaxed">{p.bio}</p>

          {/* Location */}
          <div className="mt-2 flex items-center gap-1 text-sm text-gray-500">
            <MapPin className="h-3.5 w-3.5" />
            {p.location}
          </div>

          {/* Stats row */}
          <div className="mt-3 text-sm text-gray-600">
            <span className="font-semibold text-gray-900">{p.networkStats.followers}</span>{' '}
            Followers{' '}
            <span className="text-gray-400 mx-1">&middot;</span>{' '}
            <span className="font-semibold text-gray-900">{p.networkStats.following}</span>{' '}
            Following{' '}
            <span className="text-gray-400 mx-1">&middot;</span>{' '}
            <span className="font-semibold text-gray-900">{p.yearsOfExperience}</span>{' '}
            years in tech
          </div>

          {/* Specializations */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {p.specializations.map((spec) => (
              <Badge key={spec} variant="secondary" className="text-xs">
                {spec}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ============================================================ */}
      {/* SKILLS ENDORSEMENTS BAR                                      */}
      {/* ============================================================ */}
      <div className="flex gap-2 overflow-x-auto py-4 scrollbar-hide">
        {p.skills.map((skill) => {
          const meta = PROFICIENCY_META[skill.proficiency];
          const endorsements = meta.level * 12;
          const dotColor: Record<string, string> = {
            expert: 'bg-emerald-500',
            advanced: 'bg-blue-500',
            intermediate: 'bg-purple-500',
            beginner: 'bg-gray-400',
          };
          return (
            <div
              key={skill.name}
              className="flex items-center gap-2 shrink-0 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm"
            >
              <span className={cn('h-2 w-2 rounded-full shrink-0', dotColor[skill.proficiency])} />
              <span className="font-medium text-gray-800">{skill.name}</span>
              <span className="text-xs text-gray-500">{endorsements}</span>
            </div>
          );
        })}
      </div>

      {/* ============================================================ */}
      {/* FEED                                                         */}
      {/* ============================================================ */}
      <div className="flex flex-col gap-4">
        {feedPosts.map((post) => {
          const dateStr = new Date(post.date).toISOString();

          /* ---- Story post ---- */
          if (post.type === 'story') {
            const story = post.data;
            const confidence = getConfidenceLevel(story.overallConfidence);
            const likes = Math.round(story.overallConfidence * 100);
            const comments = story.sections.length;

            return (
              <Card key={`story-${story.id}`} className="rounded-xl">
                <CardContent className="p-5 space-y-3">
                  <PostHeader
                    icon={BookOpen}
                    iconColor="text-primary-500"
                    timestamp={`Published ${relativeDate(story.publishedAt)}`}
                  />

                  {/* Content */}
                  <div className="pl-[52px] space-y-2">
                    <h3 className="font-bold text-gray-900">{story.title}</h3>

                    <Badge variant="outline" className="text-xs">
                      {story.framework}
                    </Badge>

                    {story.sections.length > 0 && (
                      <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">
                        {story.sections[0].text}
                      </p>
                    )}

                    {/* Confidence bar */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">AI Confidence:</span>
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-200">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            confidence.label === 'Strong'
                              ? 'bg-emerald-500'
                              : confidence.label === 'Fair'
                                ? 'bg-amber-500'
                                : 'bg-red-500',
                          )}
                          style={{ width: `${Math.round(story.overallConfidence * 100)}%` }}
                        />
                      </div>
                      <span className={cn('text-xs font-medium', confidence.color)}>
                        {Math.round(story.overallConfidence * 100)}%
                      </span>
                    </div>

                    <PostFooter
                      reactions={[
                        { icon: Heart, count: likes },
                        { icon: MessageCircle, count: comments },
                        { icon: Share2, count: 0 },
                      ]}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          }

          /* ---- Experience milestone post ---- */
          if (post.type === 'experience') {
            const exp = post.data;
            const isCurrent = !exp.endDate;
            const duration = calculateDuration(exp.startDate, exp.endDate);

            return (
              <Card key={`exp-${exp.id}`} className="rounded-xl">
                <CardContent className="p-5 space-y-3">
                  <PostHeader
                    icon={Briefcase}
                    iconColor="text-blue-500"
                    timestamp={relativeDate(exp.startDate)}
                  />

                  {/* Content */}
                  <div className="pl-[52px] space-y-2">
                    <p className="text-sm text-gray-900">
                      <span className="font-bold">
                        {isCurrent
                          ? `Currently working as ${exp.title} at ${exp.company}`
                          : `Started as ${exp.title} at ${exp.company}`}
                      </span>
                    </p>

                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <MapPin className="h-3 w-3" />
                      <span>{exp.location}</span>
                      <span className="text-gray-300">&middot;</span>
                      <Calendar className="h-3 w-3" />
                      <span>{formatDateRange(exp.startDate, exp.endDate)}</span>
                      <Badge variant="outline" className="text-[10px]">{duration}</Badge>
                    </div>

                    <p className="text-sm text-gray-600 leading-relaxed">{exp.description}</p>

                    {/* Achievements as threaded list */}
                    {exp.achievements.length > 0 && (
                      <div className="border-l-2 border-gray-200 pl-3 space-y-1.5 mt-1">
                        {exp.achievements.map((a, i) => (
                          <div key={i} className="flex items-start gap-1.5 text-sm text-gray-600">
                            <Star className="mt-0.5 h-3 w-3 shrink-0 text-amber-400" />
                            {a}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Skills */}
                    {exp.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {exp.skills.map((s) => (
                          <Badge key={s} variant="secondary" className="text-xs">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <PostFooter
                      reactions={[
                        { icon: ThumbsUp, count: Math.floor(Math.random() * 40 + 10) },
                        { icon: MessageCircle, count: exp.achievements.length },
                        { icon: Share2, count: 0 },
                      ]}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          }

          /* ---- Certification achievement post ---- */
          if (post.type === 'certification') {
            const cert = post.data;
            const expiry = getCertExpiryStatus(cert.expiryDate);

            return (
              <Card key={`cert-${cert.id}`} className="rounded-xl">
                <CardContent className="p-5 space-y-3">
                  <PostHeader
                    icon={Award}
                    iconColor="text-amber-500"
                    timestamp={relativeDate(cert.issueDate)}
                    extra={
                      <span className="inline-flex items-center gap-1 text-amber-600">
                        <Sparkles className="h-3 w-3" />
                        Achievement unlocked
                      </span>
                    }
                  />

                  {/* Content */}
                  <div className="pl-[52px] space-y-2">
                    <p className="text-sm text-gray-900">
                      <span className="font-bold">
                        Earned {cert.name}
                      </span>{' '}
                      from {cert.organization}
                    </p>

                    {/* Cert detail card */}
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Award className="h-4 w-4 text-amber-500" />
                        <span className="text-sm font-semibold text-gray-800">{cert.name}</span>
                      </div>
                      <p className="text-xs text-gray-600">{cert.organization}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>
                          Issued{' '}
                          {new Date(cert.issueDate).toLocaleDateString('en-US', {
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                        <span className={cn('font-medium', expiry.color)}>
                          {expiry.label}
                        </span>
                      </div>
                      {cert.credentialUrl && (
                        <a
                          href={cert.credentialUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline"
                        >
                          View Credential <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>

                    {/* Skills */}
                    {cert.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {cert.skills.map((s) => (
                          <Badge key={s} variant="secondary" className="text-xs">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <PostFooter
                      reactions={[
                        { icon: Heart, count: Math.floor(Math.random() * 60 + 20) },
                        { icon: MessageCircle, count: cert.skills.length },
                        { icon: Share2, count: 0 },
                      ]}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          }

          /* ---- Education post ---- */
          if (post.type === 'education') {
            const edu = post.data;

            return (
              <Card key={`edu-${edu.id}`} className="rounded-xl">
                <CardContent className="p-5 space-y-3">
                  <PostHeader
                    icon={GraduationCap}
                    iconColor="text-purple-500"
                    timestamp={`${edu.endYear}`}
                  />

                  {/* Content */}
                  <div className="pl-[52px] space-y-2">
                    <p className="text-sm text-gray-900">
                      <span className="font-bold">
                        Graduated with {edu.degree} in {edu.field}
                      </span>{' '}
                      from {edu.institution}
                    </p>

                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <MapPin className="h-3 w-3" />
                      <span>{edu.location}</span>
                      <span className="text-gray-300">&middot;</span>
                      <span>{edu.startYear} &ndash; {edu.endYear}</span>
                    </div>

                    <p className="text-sm text-gray-600 font-medium">{edu.grade}</p>

                    {/* Activities */}
                    {edu.activities.length > 0 && (
                      <div className="space-y-1">
                        {edu.activities.map((a, i) => (
                          <div key={i} className="flex items-start gap-1.5 text-sm text-gray-600">
                            <Star className="mt-0.5 h-3 w-3 shrink-0 text-amber-400" />
                            {a}
                          </div>
                        ))}
                      </div>
                    )}

                    <PostFooter
                      reactions={[
                        { icon: ThumbsUp, count: Math.floor(Math.random() * 80 + 30) },
                        { icon: MessageCircle, count: edu.activities.length },
                        { icon: Share2, count: 0 },
                      ]}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}
