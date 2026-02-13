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
  Quote,
  Star,
  Calendar,
  Users,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  V7 — "Magazine Feature"                                            */
/*  Editorial magazine spread layout with oversized typography,        */
/*  pull-quotes, and generous whitespace                               */
/* ------------------------------------------------------------------ */

export function ProfileV7() {
  const p = mockProfile;
  const initials = getInitials(p.name);

  /* Extract the first sentence from bio for pull-quote */
  const firstSentence = p.bio.split(/(?<=\.)\s+/)[0];

  /* Featured story = first story; remaining stories = the rest */
  const featuredStory = p.careerStories[0];
  const remainingStories = p.careerStories.slice(1);

  /* Format published date */
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

  return (
    <div className="mx-auto max-w-4xl pb-16">
      {/* ================================================================ */}
      {/* 1. HERO SECTION                                                   */}
      {/* ================================================================ */}
      <section className="py-12">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary-600">
          Profile Feature
        </p>

        <h1 className="mt-4 text-5xl font-bold tracking-tight text-gray-900">
          {p.name}
        </h1>

        <p className="mt-3 text-xl text-gray-500">
          {p.title} at {p.company}
        </p>

        <div className="mt-4 h-0.5 w-20 bg-primary-500" />
      </section>

      {/* ================================================================ */}
      {/* 2. TWO-COLUMN INTRO SECTION                                       */}
      {/* ================================================================ */}
      <section className="grid grid-cols-3 gap-8">
        {/* ---- Left column: Pull-quote + bio + highlights ---- */}
        <div className="col-span-2">
          {/* Pull-quote */}
          <blockquote className="my-6 border-l-4 border-primary-400 pl-6">
            <div className="relative">
              <Quote className="absolute -left-1 -top-2 h-6 w-6 text-primary-300 opacity-60" />
              <p className="font-serif text-2xl italic text-gray-700">
                {firstSentence}
              </p>
            </div>
          </blockquote>

          {/* Full bio */}
          <p className="mt-6 text-base leading-relaxed text-gray-600">
            {p.bio}
          </p>

          {/* Highlights */}
          <ul className="mt-8 space-y-3">
            {p.highlights.map((h, i) => (
              <li key={i} className="flex items-start gap-3 text-gray-700">
                <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-500" />
                <span className="text-sm leading-relaxed">{h}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* ---- Right column: "At a Glance" sidebar ---- */}
        <div className="col-span-1">
          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-5">
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                At a Glance
              </h3>

              {/* Avatar */}
              <div className="mb-5 flex justify-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-100">
                  <span className="text-xl font-bold text-primary-700">
                    {initials}
                  </span>
                </div>
              </div>

              {/* Info rows */}
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="h-4 w-4 flex-shrink-0 text-gray-400" />
                  <span className="font-medium text-gray-500">Location</span>
                  <span className="ml-auto text-gray-800">{p.location}</span>
                </div>

                <div className="flex items-center gap-2 text-gray-600">
                  <Building2 className="h-4 w-4 flex-shrink-0 text-gray-400" />
                  <span className="font-medium text-gray-500">Industry</span>
                  <span className="ml-auto text-gray-800">{p.industry}</span>
                </div>

                <div className="flex items-center gap-2 text-gray-600">
                  <Briefcase className="h-4 w-4 flex-shrink-0 text-gray-400" />
                  <span className="font-medium text-gray-500">Experience</span>
                  <span className="ml-auto text-gray-800">
                    {p.yearsOfExperience} years
                  </span>
                </div>

                <div className="flex items-center gap-2 text-gray-600">
                  <Users className="h-4 w-4 flex-shrink-0 text-gray-400" />
                  <span className="font-medium text-gray-500">Followers</span>
                  <span className="ml-auto text-gray-800">
                    {p.networkStats.followers}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-gray-600">
                  <Users className="h-4 w-4 flex-shrink-0 text-gray-400" />
                  <span className="font-medium text-gray-500">Following</span>
                  <span className="ml-auto text-gray-800">
                    {p.networkStats.following}
                  </span>
                </div>
              </div>

              {/* Profile completeness circular indicator */}
              <div className="mt-6 flex flex-col items-center border-t border-gray-100 pt-5">
                <div className="relative flex h-16 w-16 items-center justify-center">
                  <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                      className="text-gray-100"
                    />
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeDasharray={`${(p.profileCompleteness.overall / 100) * 2 * Math.PI * 28} ${2 * Math.PI * 28}`}
                      strokeLinecap="round"
                      className="text-primary-500"
                    />
                  </svg>
                  <span className="absolute text-sm font-bold text-gray-700">
                    {p.profileCompleteness.overall}%
                  </span>
                </div>
                <span className="mt-2 text-xs text-gray-400">
                  Profile Complete
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ================================================================ */}
      {/* 3. FEATURED STORY SECTION                                         */}
      {/* ================================================================ */}
      {featuredStory && (
        <section className="-mx-4 mt-12 rounded-xl bg-gray-50 px-4 py-8">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary-600">
            Featured Story
          </p>

          <h2 className="mt-3 text-2xl font-bold text-gray-900">
            {featuredStory.title}
          </h2>

          <div className="mt-3 flex flex-wrap gap-2">
            <Badge
              variant="outline"
              className="border-primary-200 bg-primary-50 text-primary-700"
            >
              {featuredStory.framework}
            </Badge>
            <Badge
              variant="outline"
              className="border-gray-200 bg-white text-gray-600"
            >
              {featuredStory.archetype}
            </Badge>
          </div>

          {/* Sections as editorial paragraphs */}
          <div className="mt-6 space-y-5">
            {featuredStory.sections.map((section) => {
              const confidence = getConfidenceLevel(section.confidence);
              return (
                <div key={section.key}>
                  <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                    {section.label}
                  </h4>
                  <p className="mt-1 text-base leading-relaxed text-gray-700">
                    {section.text}
                    <span
                      className={cn(
                        'ml-2 inline-block rounded px-1.5 py-0.5 text-xs font-medium',
                        confidence.bgColor,
                        confidence.color,
                      )}
                    >
                      {Math.round(section.confidence * 100)}%
                    </span>
                  </p>
                </div>
              );
            })}
          </div>

          <p className="mt-6 flex items-center gap-1.5 text-xs text-gray-400">
            <Calendar className="h-3.5 w-3.5" />
            Published {fmtDate(featuredStory.publishedAt)}
          </p>
        </section>
      )}

      {/* ================================================================ */}
      {/* 4. SKILLS / EXPERTISE SECTION                                     */}
      {/* ================================================================ */}
      <section className="py-8">
        <h2 className="mb-6 text-xs font-semibold uppercase tracking-[0.3em] text-gray-900">
          Expertise
        </h2>

        <div className="space-y-3">
          {p.skills.map((skill) => {
            const meta = PROFICIENCY_META[skill.proficiency];
            return (
              <div key={skill.name} className="flex items-center gap-4">
                <span className="w-32 text-sm font-medium text-gray-700">
                  {skill.name}
                </span>
                <div className="flex gap-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        'h-3 w-3 rounded-full',
                        i < meta.level ? 'bg-primary-500' : 'bg-gray-200',
                      )}
                    />
                  ))}
                </div>
                <span
                  className={cn('text-xs font-medium', meta.color)}
                >
                  {meta.label}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ================================================================ */}
      {/* 5. EXPERIENCE / CAREER PATH SECTION                               */}
      {/* ================================================================ */}
      <section className="py-8">
        <h2 className="mb-6 text-xs font-semibold uppercase tracking-[0.3em] text-gray-900">
          Career Path
        </h2>

        <div className="flex gap-4 overflow-x-auto pb-4">
          {p.experience.map((exp) => (
            <Card
              key={exp.id}
              className="w-64 min-w-[16rem] flex-shrink-0 border-gray-200 shadow-sm"
            >
              <CardContent className="p-4">
                <h3 className="text-sm font-bold text-gray-900">
                  {exp.company}
                </h3>
                <p className="mt-0.5 text-sm text-gray-600">{exp.title}</p>
                <p className="mt-1 text-xs text-gray-400">
                  {formatDateRange(exp.startDate, exp.endDate)}
                  <span className="ml-1 text-gray-300">
                    ({calculateDuration(exp.startDate, exp.endDate)})
                  </span>
                </p>

                {exp.achievements.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {exp.achievements.slice(0, 2).map((ach, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-1.5 text-xs leading-snug text-gray-600"
                      >
                        <ArrowRight className="mt-0.5 h-3 w-3 flex-shrink-0 text-primary-400" />
                        {ach}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ================================================================ */}
      {/* 6. EDUCATION & CERTIFICATIONS                                     */}
      {/* ================================================================ */}
      <section className="py-8">
        <div className="grid grid-cols-2 gap-8">
          {/* ---- Education ---- */}
          <div>
            <h2 className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-gray-900">
              <GraduationCap className="h-4 w-4 text-gray-500" />
              Education
            </h2>

            <div className="space-y-5">
              {p.education.map((edu) => (
                <div key={edu.id}>
                  <h3 className="text-sm font-bold text-gray-900">
                    {edu.degree} in {edu.field}
                  </h3>
                  <p className="mt-0.5 text-sm text-gray-600">
                    {edu.institution}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {edu.startYear} - {edu.endYear}
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-gray-500">
                    {edu.grade}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* ---- Certifications ---- */}
          <div>
            <h2 className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-gray-900">
              <Award className="h-4 w-4 text-gray-500" />
              Certifications
            </h2>

            <div className="space-y-5">
              {p.certifications.map((cert) => {
                const expiry = getCertExpiryStatus(cert.expiryDate);
                return (
                  <div key={cert.id}>
                    <h3 className="text-sm font-bold text-gray-900">
                      {cert.name}
                    </h3>
                    <p className="mt-0.5 text-sm text-gray-600">
                      {cert.organization}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-xs',
                          expiry.color,
                          expiry.color.includes('red')
                            ? 'border-red-200 bg-red-50'
                            : expiry.color.includes('amber')
                              ? 'border-amber-200 bg-amber-50'
                              : 'border-emerald-200 bg-emerald-50',
                        )}
                      >
                        {expiry.label}
                      </Badge>
                    </div>
                    {cert.skills.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {cert.skills.map((s) => (
                          <span
                            key={s}
                            className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* 7. MORE STORIES STRIP                                             */}
      {/* ================================================================ */}
      {remainingStories.length > 0 && (
        <section className="border-t border-gray-200 py-8">
          <h2 className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-gray-900">
            <BookOpen className="h-4 w-4 text-gray-500" />
            More Stories
          </h2>

          <div className="space-y-3">
            {remainingStories.map((story) => {
              const confidence = getConfidenceLevel(story.overallConfidence);
              return (
                <div
                  key={story.id}
                  className="flex items-center gap-4 rounded-lg border border-gray-100 bg-white px-4 py-3 transition-colors hover:bg-gray-50"
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-medium text-gray-900">
                      {story.title}
                    </h3>
                  </div>

                  <Badge
                    variant="outline"
                    className="flex-shrink-0 border-primary-200 bg-primary-50 text-xs text-primary-700"
                  >
                    {story.framework}
                  </Badge>

                  <span
                    className={cn(
                      'flex-shrink-0 rounded px-2 py-0.5 text-xs font-medium',
                      confidence.bgColor,
                      confidence.color,
                    )}
                  >
                    {Math.round(story.overallConfidence * 100)}%
                  </span>

                  <span className="flex-shrink-0 text-xs text-gray-400">
                    {fmtDate(story.publishedAt)}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
