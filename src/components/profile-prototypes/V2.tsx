import {
  mockProfile,
  getInitials,
  formatDateRange,
  calculateDuration,
  PROFICIENCY_META,
  getConfidenceLevel,
  getCertExpiryStatus,
} from './mock-data';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import {
  MapPin,
  Briefcase,
  GraduationCap,
  Award,
  BookOpen,
  Star,
  Calendar,
  ExternalLink,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// V2 — Portfolio Showcase
// A creative portfolio feel with hero, tag cloud, timeline, and scroll cards.
// ---------------------------------------------------------------------------

export function ProfileV2() {
  const profile = mockProfile;

  // Featured story = highest confidence
  const featuredStory = [...profile.careerStories].sort(
    (a, b) => b.overallConfidence - a.overallConfidence,
  )[0];

  // Remaining stories (excluding the featured one)
  const otherStories = profile.careerStories.filter(
    (s) => s.id !== featuredStory.id,
  );

  return (
    <div className="mx-auto max-w-5xl space-y-10 p-6">
      {/* ----------------------------------------------------------------- */}
      {/* 1. Hero Section                                                    */}
      {/* ----------------------------------------------------------------- */}
      <section className="relative min-h-[280px] overflow-hidden rounded-2xl bg-gradient-to-br from-primary-700 via-primary-800 to-gray-900 p-8">
        {/* Decorative background sparkles */}
        <Sparkles className="absolute right-6 top-6 h-24 w-24 text-white/10" />

        <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-end">
          {/* Avatar */}
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-white/20 text-2xl font-bold text-white">
            {getInitials(profile.name)}
          </div>

          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-white">{profile.name}</h1>
            <p className="text-lg text-white/80">
              {profile.title} at {profile.company}
            </p>
            <p className="max-w-2xl text-sm leading-relaxed text-white/70">
              {profile.bio}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Badge
                variant="secondary"
                className="border-white/20 bg-white/15 text-white"
              >
                <MapPin className="mr-1 h-3 w-3" />
                {profile.location}
              </Badge>
              <Badge
                variant="secondary"
                className="border-white/20 bg-white/15 text-white"
              >
                <Briefcase className="mr-1 h-3 w-3" />
                {profile.yearsOfExperience} yrs experience
              </Badge>
              <Badge
                variant="secondary"
                className="border-white/20 bg-white/15 text-white"
              >
                <Star className="mr-1 h-3 w-3" />
                {profile.industry}
              </Badge>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* 2. Featured Story                                                  */}
      {/* ----------------------------------------------------------------- */}
      <section>
        <div className="mb-4 flex items-center gap-2 text-sm font-medium text-primary-700">
          <Sparkles className="h-4 w-4" />
          Featured Story
        </div>

        <Card className="border-primary-200 bg-primary-50/50">
          <CardHeader>
            <CardTitle className="text-xl">{featuredStory.title}</CardTitle>
            <div className="flex flex-wrap gap-2 pt-1">
              <Badge variant="outline" className="text-xs">
                {featuredStory.framework}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {featuredStory.archetype}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Confidence bar */}
            {(() => {
              const cl = getConfidenceLevel(featuredStory.overallConfidence);
              return (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Confidence</span>
                    <span className={cn('font-semibold', cl.color)}>
                      {cl.label} &mdash;{' '}
                      {Math.round(featuredStory.overallConfidence * 100)}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                      className={cn('h-full rounded-full', cl.bgColor)}
                      style={{
                        width: `${featuredStory.overallConfidence * 100}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })()}

            {/* First 2 section previews */}
            <div className="grid gap-3 sm:grid-cols-2">
              {featuredStory.sections.slice(0, 2).map((sec) => (
                <div
                  key={sec.key}
                  className="rounded-lg border border-primary-100 bg-white p-3"
                >
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary-600">
                    {sec.label}
                  </p>
                  <p className="text-sm leading-relaxed text-gray-700">
                    {sec.text}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-1 pt-1 text-xs font-medium text-primary-600">
              Read full story <ArrowRight className="h-3 w-3" />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* 3. Skills Tag Cloud                                                */}
      {/* ----------------------------------------------------------------- */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Star className="h-5 w-5 text-primary-600" />
          Skills
        </h2>

        <div className="flex flex-wrap items-baseline gap-3">
          {profile.skills.map((skill) => {
            const meta = PROFICIENCY_META[skill.proficiency];
            const sizeClasses: Record<string, string> = {
              expert: 'text-lg font-bold text-primary-700',
              advanced: 'text-base font-semibold text-primary-600',
              intermediate: 'text-sm text-gray-700',
              beginner: 'text-xs text-gray-500',
            };

            // Slight pseudo-random rotation to give a "cloud" feel,
            // derived deterministically from the skill name length.
            const rotations = [
              '-rotate-2',
              'rotate-1',
              '-rotate-1',
              'rotate-2',
              'rotate-0',
            ];
            const rotation =
              rotations[skill.name.length % rotations.length];

            return (
              <span
                key={skill.name}
                className={cn(
                  'inline-block rounded-lg px-3 py-1 transition-transform hover:scale-110',
                  meta.bgColor,
                  sizeClasses[skill.proficiency],
                  rotation,
                )}
                title={`${meta.label} — ${skill.category}`}
              >
                {skill.name}
              </span>
            );
          })}
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* 4. Experience Timeline                                             */}
      {/* ----------------------------------------------------------------- */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Briefcase className="h-5 w-5 text-primary-600" />
          Experience
        </h2>

        <div className="relative border-l-2 border-primary-200 pl-6">
          {profile.experience.map((exp, idx) => (
            <div
              key={exp.id}
              className={cn(
                'relative pb-8',
                idx === profile.experience.length - 1 && 'pb-0',
              )}
            >
              {/* Dot on the line */}
              <span className="absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 border-primary-400 bg-white" />

              <div className="space-y-1">
                <h3 className="text-base font-semibold text-gray-900">
                  {exp.title}
                </h3>
                <p className="text-sm text-gray-600">
                  {exp.company} &middot; {exp.location}
                </p>
                <p className="flex items-center gap-1 text-xs text-gray-500">
                  <Calendar className="h-3 w-3" />
                  {formatDateRange(exp.startDate, exp.endDate)}
                  <span className="text-gray-400">
                    ({calculateDuration(exp.startDate, exp.endDate)})
                  </span>
                </p>
                <p className="pt-1 text-sm leading-relaxed text-gray-600">
                  {exp.description}
                </p>
                {exp.achievements.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="mt-2 text-xs"
                  >
                    {exp.achievements.length} achievement
                    {exp.achievements.length > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* 5. Certifications Grid                                             */}
      {/* ----------------------------------------------------------------- */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Award className="h-5 w-5 text-primary-600" />
          Certifications
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {profile.certifications.map((cert) => {
            const status = getCertExpiryStatus(cert.expiryDate);
            return (
              <Card key={cert.id} className="flex flex-col">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold leading-snug">
                    {cert.name}
                  </CardTitle>
                  <p className="text-xs text-gray-500">{cert.organization}</p>
                </CardHeader>
                <CardContent className="mt-auto space-y-3">
                  <Badge
                    variant="outline"
                    className={cn('text-xs', status.color)}
                  >
                    {status.label}
                  </Badge>

                  <div className="flex flex-wrap gap-1">
                    {cert.skills.map((sk) => (
                      <span
                        key={sk}
                        className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600"
                      >
                        {sk}
                      </span>
                    ))}
                  </div>

                  <a
                    href={cert.credentialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline"
                  >
                    View credential
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* 6. Career Stories — horizontal scroll                              */}
      {/* ----------------------------------------------------------------- */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
          <BookOpen className="h-5 w-5 text-primary-600" />
          Career Stories
        </h2>

        <div className="flex gap-4 overflow-x-auto pb-4">
          {otherStories.map((story) => {
            const cl = getConfidenceLevel(story.overallConfidence);
            return (
              <Card
                key={story.id}
                className="w-72 min-w-[18rem] shrink-0"
              >
                <CardHeader className="pb-2">
                  <CardTitle className="line-clamp-2 text-sm font-semibold leading-snug">
                    {story.title}
                  </CardTitle>
                  <div className="flex items-center gap-2 pt-1">
                    <Badge variant="outline" className="text-[10px]">
                      {story.framework}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      {story.archetype}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Confidence gauge */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-gray-500">Confidence</span>
                      <span className={cn('font-semibold', cl.color)}>
                        {Math.round(story.overallConfidence * 100)}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                      <div
                        className={cn('h-full rounded-full', cl.bgColor)}
                        style={{
                          width: `${story.overallConfidence * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Tools */}
                  <div className="flex flex-wrap gap-1">
                    {story.tools.map((tool) => (
                      <span
                        key={tool}
                        className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-1 text-xs font-medium text-primary-600">
                    Read story <ArrowRight className="h-3 w-3" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* 7. Education                                                       */}
      {/* ----------------------------------------------------------------- */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
          <GraduationCap className="h-5 w-5 text-primary-600" />
          Education
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          {profile.education.map((edu) => (
            <Card key={edu.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">
                  {edu.degree} in {edu.field}
                </CardTitle>
                <p className="text-xs text-gray-500">
                  {edu.institution} &middot; {edu.location}
                </p>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Calendar className="h-3 w-3" />
                  {edu.startYear} &ndash; {edu.endYear}
                  <span className="ml-auto text-gray-400">{edu.grade}</span>
                </div>

                {edu.activities.length > 0 && (
                  <ul className="space-y-1 text-xs text-gray-600">
                    {edu.activities.map((act, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary-400" />
                        {act}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
