import React from 'react';
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
  Briefcase,
  GraduationCap,
  Award,
  BookOpen,
  Calendar,
  Star,
  Users,
  Code2,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  V10 — "Career Timeline"                                            */
/*  Vertical timeline combining ALL career events chronologically      */
/* ------------------------------------------------------------------ */

type TimelineEvent = {
  id: string;
  type: 'experience' | 'education' | 'certification' | 'story';
  date: string;
  title: string;
  subtitle: string;
  content: React.ReactNode;
};

const TYPE_CONFIG = {
  experience: {
    color: 'bg-blue-500',
    ring: 'ring-blue-100',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-700',
    label: 'Experience',
    Icon: Briefcase,
  },
  education: {
    color: 'bg-emerald-500',
    ring: 'ring-emerald-100',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    label: 'Education',
    Icon: GraduationCap,
  },
  certification: {
    color: 'bg-amber-500',
    ring: 'ring-amber-100',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-700',
    label: 'Certification',
    Icon: Award,
  },
  story: {
    color: 'bg-purple-500',
    ring: 'ring-purple-100',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-700',
    label: 'Career Story',
    Icon: BookOpen,
  },
} as const;

export function ProfileV10() {
  const p = mockProfile;
  const initials = getInitials(p.name);

  /* ── Build combined timeline events ── */
  const events: TimelineEvent[] = [];

  // Experience events
  for (const exp of p.experience) {
    events.push({
      id: exp.id,
      type: 'experience',
      date: exp.startDate,
      title: `${exp.title} at ${exp.company}`,
      subtitle: exp.location,
      content: (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">{exp.description}</p>
          <p className="flex items-center gap-1 text-xs text-gray-400">
            <Calendar className="h-3 w-3" />
            {formatDateRange(exp.startDate, exp.endDate)} &middot;{' '}
            {calculateDuration(exp.startDate, exp.endDate)}
          </p>
          {exp.achievements.length > 0 && (
            <ul className="space-y-1">
              {exp.achievements.map((ach, i) => (
                <li
                  key={i}
                  className="flex items-start gap-1.5 text-xs text-gray-500"
                >
                  <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-blue-400" />
                  {ach}
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap gap-1 pt-1">
            {exp.skills.map((skill) => (
              <Badge
                key={skill}
                variant="outline"
                className="border-blue-200 bg-blue-50/50 text-xs font-normal text-blue-600"
              >
                {skill}
              </Badge>
            ))}
          </div>
        </div>
      ),
    });
  }

  // Education events
  for (const edu of p.education) {
    events.push({
      id: edu.id,
      type: 'education',
      date: `${edu.endYear}-06-01`,
      title: `${edu.degree} in ${edu.field}`,
      subtitle: edu.institution,
      content: (
        <div className="space-y-2">
          <p className="text-sm text-gray-500">
            {edu.startYear} &ndash; {edu.endYear} &middot; {edu.location}
          </p>
          <p className="text-sm text-gray-600">{edu.grade}</p>
          {edu.activities.length > 0 && (
            <ul className="space-y-1">
              {edu.activities.map((act, i) => (
                <li
                  key={i}
                  className="flex items-start gap-1.5 text-xs text-gray-500"
                >
                  <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-emerald-400" />
                  {act}
                </li>
              ))}
            </ul>
          )}
        </div>
      ),
    });
  }

  // Certification events
  for (const cert of p.certifications) {
    const expiry = getCertExpiryStatus(cert.expiryDate);
    events.push({
      id: cert.id,
      type: 'certification',
      date: cert.issueDate,
      title: cert.name,
      subtitle: cert.organization,
      content: (
        <div className="space-y-2">
          <p className="flex items-center gap-1 text-xs text-gray-400">
            <Calendar className="h-3 w-3" />
            Issued{' '}
            {new Date(cert.issueDate).toLocaleDateString('en-US', {
              month: 'short',
              year: 'numeric',
            })}
          </p>
          <p className={cn('text-xs font-medium', expiry.color)}>
            {expiry.label}
          </p>
          <div className="flex flex-wrap gap-1">
            {cert.skills.map((skill) => (
              <Badge
                key={skill}
                variant="outline"
                className="border-amber-200 bg-amber-50/50 text-xs font-normal text-amber-600"
              >
                {skill}
              </Badge>
            ))}
          </div>
          <a
            href={cert.credentialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700"
          >
            View credential
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      ),
    });
  }

  // Career Story events
  for (const story of p.careerStories) {
    const confidence = getConfidenceLevel(story.overallConfidence);
    const firstSection = story.sections[0];
    events.push({
      id: story.id,
      type: 'story',
      date: story.publishedAt,
      title: story.title,
      subtitle: `${story.framework} \u00B7 ${story.archetype}`,
      content: (
        <div className="space-y-2">
          <p className="text-xs text-gray-400">
            Published{' '}
            {new Date(story.publishedAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
          <div className="flex items-center gap-2">
            <Star className="h-3 w-3 text-purple-400" />
            <span className={cn('text-xs font-medium', confidence.color)}>
              {confidence.label} ({Math.round(story.overallConfidence * 100)}%)
            </span>
          </div>
          {/* Confidence bar */}
          <div className="h-1.5 w-full rounded-full bg-gray-200">
            <div
              className={cn(
                'h-1.5 rounded-full',
                story.overallConfidence >= 0.8
                  ? 'bg-emerald-500'
                  : story.overallConfidence >= 0.6
                    ? 'bg-amber-500'
                    : 'bg-red-500',
              )}
              style={{ width: `${story.overallConfidence * 100}%` }}
            />
          </div>
          {firstSection && (
            <p className="text-xs leading-relaxed text-gray-500">
              {firstSection.text}
            </p>
          )}
        </div>
      ),
    });
  }

  // Sort descending by date (newest first)
  events.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  /* ── Render ── */
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4">
        {/* ── Profile Header ── */}
        <div className="border-b border-gray-200 py-8 text-center">
          {/* Avatar */}
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary-100 text-primary-700">
            <span className="text-2xl font-semibold">{initials}</span>
          </div>

          {/* Name */}
          <h1 className="mt-3 text-2xl font-bold text-gray-900">{p.name}</h1>

          {/* Title + Company */}
          <p className="mt-1 flex items-center justify-center gap-1.5 text-gray-600">
            <Building2 className="h-4 w-4" />
            {p.title} at {p.company}
          </p>

          {/* Location */}
          <p className="mt-1 flex items-center justify-center gap-1 text-sm text-gray-500">
            <MapPin className="h-3.5 w-3.5" />
            {p.location}
          </p>

          {/* Stats row */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <Badge
              variant="outline"
              className="border-gray-200 text-xs font-normal text-gray-500"
            >
              <Briefcase className="mr-1 h-3 w-3" />
              {p.yearsOfExperience} yrs exp
            </Badge>
            <Badge
              variant="outline"
              className="border-gray-200 text-xs font-normal text-gray-500"
            >
              <Code2 className="mr-1 h-3 w-3" />
              {p.skills.length} skills
            </Badge>
            <Badge
              variant="outline"
              className="border-gray-200 text-xs font-normal text-gray-500"
            >
              <BookOpen className="mr-1 h-3 w-3" />
              {p.careerStories.length} stories
            </Badge>
            <Badge
              variant="outline"
              className="border-gray-200 text-xs font-normal text-gray-500"
            >
              <Award className="mr-1 h-3 w-3" />
              {p.certifications.length} certifications
            </Badge>
            <Badge
              variant="outline"
              className="border-gray-200 text-xs font-normal text-gray-500"
            >
              <Users className="mr-1 h-3 w-3" />
              {p.networkStats.followers} followers
            </Badge>
          </div>
        </div>

        {/* ── Timeline ── */}
        <div className="relative mx-auto mb-8 mt-8 max-w-4xl">
          {/* Central spine */}
          <div className="absolute bottom-0 left-1/2 top-0 w-0.5 -translate-x-1/2 bg-gray-200" />

          {events.map((event, idx) => {
            const config = TYPE_CONFIG[event.type];
            const TypeIcon = config.Icon;
            const isLeft = idx % 2 === 0;

            return (
              <div key={event.id} className="relative mb-8">
                {/* Timeline dot */}
                <div
                  className={cn(
                    'absolute left-1/2 top-6 z-10 h-4 w-4 -translate-x-1/2 rounded-full ring-4',
                    config.color,
                    config.ring,
                  )}
                />

                {/* Type icon next to dot */}
                <div
                  className={cn(
                    'absolute top-5 z-10',
                    isLeft
                      ? 'left-[calc(50%+14px)]'
                      : 'right-[calc(50%+14px)]',
                  )}
                >
                  <TypeIcon
                    className={cn('h-4 w-4', config.badgeText)}
                  />
                </div>

                {/* Event card */}
                <div
                  className={cn(
                    'w-[calc(50%-28px)]',
                    isLeft
                      ? 'mr-[calc(50%+28px)]'
                      : 'ml-[calc(50%+28px)]',
                  )}
                >
                  <Card className="shadow-sm transition-shadow hover:shadow-md">
                    <CardContent className="p-4">
                      {/* Type badge + date row */}
                      <div
                        className={cn(
                          'flex items-center gap-2',
                          isLeft ? 'justify-end' : 'justify-start',
                        )}
                      >
                        <Badge
                          className={cn(
                            'text-xs font-medium',
                            config.badgeBg,
                            config.badgeText,
                          )}
                        >
                          {config.label}
                        </Badge>
                        <span className="text-xs text-gray-400">
                          {new Date(event.date).toLocaleDateString('en-US', {
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>

                      {/* Title */}
                      <p
                        className={cn(
                          'mt-2 font-semibold text-gray-900',
                          isLeft ? 'text-right' : 'text-left',
                        )}
                      >
                        {event.title}
                      </p>

                      {/* Subtitle */}
                      <p
                        className={cn(
                          'text-sm text-gray-500',
                          isLeft ? 'text-right' : 'text-left',
                        )}
                      >
                        {event.subtitle}
                      </p>

                      {/* Content */}
                      <div
                        className={cn(
                          'mt-3',
                          isLeft ? 'text-right' : 'text-left',
                        )}
                      >
                        {event.content}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Skills Summary ── */}
        <div className="mx-auto max-w-4xl border-t border-gray-200 pb-12 pt-8">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Code2 className="h-5 w-5 text-gray-400" />
            Skills Acquired
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {p.skills.map((skill) => {
              const meta = PROFICIENCY_META[skill.proficiency];
              return (
                <Badge
                  key={skill.name}
                  className={cn(
                    'text-xs font-medium',
                    meta.bgColor,
                    meta.color,
                  )}
                >
                  {skill.name}
                  <span className="ml-1 opacity-60">{meta.label}</span>
                </Badge>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
