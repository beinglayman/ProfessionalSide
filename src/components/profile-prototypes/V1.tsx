import {
  mockProfile,
  getInitials,
  formatDateRange,
  calculateDuration,
  PROFICIENCY_META,
  SKILL_CATEGORY_META,
  getConfidenceLevel,
  getCertExpiryStatus,
} from './mock-data';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import {
  MapPin,
  Building2,
  Briefcase,
  GraduationCap,
  Award,
  BookOpen,
  Users,
  Star,
  Calendar,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';

import type { SkillCategory } from './mock-data';

/* ------------------------------------------------------------------ */
/*  V1 — "LinkedIn Classic"                                            */
/*  Traditional professional profile with stacked section cards        */
/* ------------------------------------------------------------------ */

export function ProfileV1() {
  const p = mockProfile;
  const initials = getInitials(p.name);

  /* Group skills by category */
  const skillsByCategory = p.skills.reduce<Record<SkillCategory, typeof p.skills>>(
    (acc, skill) => {
      (acc[skill.category] ??= []).push(skill);
      return acc;
    },
    {} as Record<SkillCategory, typeof p.skills>,
  );

  /* Proficiency level -> bar width */
  const levelToWidth = (level: number) => ({ 1: '25%', 2: '50%', 3: '75%', 4: '100%' })[level] ?? '0%';

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
      {/* ---- Hero Banner + Avatar ---- */}
      <div className="relative">
        <div className="h-36 rounded-t-xl bg-gradient-to-r from-primary-600 to-primary-800" />

        <div className="px-6">
          {/* Avatar overlapping the banner */}
          <div className="-mt-14 flex items-end gap-5">
            <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-white bg-white shadow-md">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary-100">
                <span className="text-3xl font-bold text-primary-700">{initials}</span>
              </div>
            </div>
          </div>

          {/* Name / Title / Company / Location */}
          <div className="mt-4 space-y-1">
            <h1 className="text-2xl font-bold text-gray-900">{p.name}</h1>
            <p className="text-lg text-gray-600">{p.title}</p>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
              <span className="inline-flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                {p.company}
              </span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {p.location}
              </span>
              <span className="inline-flex items-center gap-1">
                <Briefcase className="h-4 w-4" />
                {p.industry}
              </span>
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-4 flex flex-wrap items-center gap-6 text-sm">
            <span className="text-gray-700">
              <strong>{p.yearsOfExperience}</strong> yrs experience
            </span>
            <span className="text-gray-700">
              <strong>{p.skills.length}</strong> skills
            </span>
            <span className="text-gray-700">
              <strong>{p.careerStories.length}</strong> stories published
            </span>
            <span className="inline-flex items-center gap-1 text-gray-700">
              <Users className="h-4 w-4" />
              <strong>{p.networkStats.followers}</strong> followers
            </span>
            <span className="text-gray-500">
              <strong>{p.networkStats.following}</strong> following
            </span>
          </div>

          {/* Profile Completeness */}
          <div className="mt-5 mb-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">Profile Completeness</span>
              <span className="font-semibold text-primary-700">{p.profileCompleteness.overall}%</span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-primary-500 transition-all"
                style={{ width: `${p.profileCompleteness.overall}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ---- About ---- */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="h-5 w-5 text-primary-600" />
            About
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-700 leading-relaxed">{p.bio}</p>

          {p.highlights.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-semibold text-gray-900">Highlights</h4>
              <ul className="list-disc space-y-1 pl-5 text-sm text-gray-600">
                {p.highlights.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {p.specializations.map((s) => (
              <Badge key={s} variant="secondary">{s}</Badge>
            ))}
            {p.professionalInterests.map((interest) => (
              <Badge key={interest} variant="outline">{interest}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ---- Experience ---- */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Briefcase className="h-5 w-5 text-primary-600" />
            Experience
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {p.experience.map((exp) => {
            const duration = calculateDuration(exp.startDate, exp.endDate);
            return (
              <div key={exp.id} className="relative border-l-2 border-gray-200 pl-5">
                <div className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-primary-500" />
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h4 className="font-semibold text-gray-900">{exp.title}</h4>
                    <p className="text-sm text-gray-600">
                      {exp.company} &middot; {exp.location}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{formatDateRange(exp.startDate, exp.endDate)}</span>
                    <Badge variant="outline" className="text-xs">{duration}</Badge>
                  </div>
                </div>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">{exp.description}</p>

                {exp.achievements.length > 0 && (
                  <ul className="mt-2 space-y-1 text-sm text-gray-600">
                    {exp.achievements.map((a, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-500" />
                        {a}
                      </li>
                    ))}
                  </ul>
                )}

                {exp.skills.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {exp.skills.map((s) => (
                      <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* ---- Education ---- */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <GraduationCap className="h-5 w-5 text-primary-600" />
            Education
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {p.education.map((edu) => (
            <div key={edu.id} className="space-y-1">
              <h4 className="font-semibold text-gray-900">
                {edu.degree} in {edu.field}
              </h4>
              <p className="text-sm text-gray-600">
                {edu.institution} &middot; {edu.location}
              </p>
              <p className="text-sm text-gray-500">
                {edu.startYear} &ndash; {edu.endYear} &middot; {edu.grade}
              </p>
              {edu.activities.length > 0 && (
                <ul className="mt-1 space-y-0.5 text-sm text-gray-500">
                  {edu.activities.map((a, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <Star className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                      {a}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ---- Skills ---- */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Star className="h-5 w-5 text-primary-600" />
            Skills
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {(Object.entries(skillsByCategory) as [SkillCategory, typeof p.skills][]).map(
            ([category, skills]) => {
              const catMeta = SKILL_CATEGORY_META[category];
              return (
                <div key={category}>
                  <h4 className={cn('mb-2 text-sm font-semibold', catMeta.color)}>
                    {catMeta.label}
                  </h4>
                  <div className="space-y-2.5">
                    {skills.map((skill) => {
                      const meta = PROFICIENCY_META[skill.proficiency];
                      const barColors: Record<number, string> = {
                        1: 'bg-gray-400',
                        2: 'bg-blue-400',
                        3: 'bg-purple-400',
                        4: 'bg-emerald-400',
                      };
                      return (
                        <div key={skill.name} className="flex items-center gap-3">
                          <span className="w-28 shrink-0 text-sm text-gray-700">{skill.name}</span>
                          <Badge
                            className={cn('text-xs border-transparent', meta.color, meta.bgColor)}
                          >
                            {meta.label}
                          </Badge>
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200">
                            <div
                              className={cn('h-full rounded-full', barColors[meta.level])}
                              style={{ width: levelToWidth(meta.level) }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            },
          )}
        </CardContent>
      </Card>

      {/* ---- Certifications ---- */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Award className="h-5 w-5 text-primary-600" />
            Certifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {p.certifications.map((cert) => {
            const expiry = getCertExpiryStatus(cert.expiryDate);
            return (
              <div key={cert.id} className="space-y-1.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h4 className="font-semibold text-gray-900">{cert.name}</h4>
                  <span className={cn('text-xs font-medium', expiry.color)}>{expiry.label}</span>
                </div>
                <p className="text-sm text-gray-600">{cert.organization}</p>
                <p className="text-xs text-gray-500">
                  Issued {new Date(cert.issueDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  {cert.expiryDate &&
                    ` · Expires ${new Date(cert.expiryDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`}
                </p>
                {cert.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {cert.skills.map((s) => (
                      <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                    ))}
                  </div>
                )}
                {cert.credentialUrl && (
                  <a
                    href={cert.credentialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline"
                  >
                    Show Credential <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* ---- Career Stories ---- */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="h-5 w-5 text-primary-600" />
            Career Stories
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {p.careerStories.map((story) => {
            const confidence = getConfidenceLevel(story.overallConfidence);
            return (
              <Card key={story.id} className="border-gray-100">
                <CardContent className="p-4 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h4 className="font-semibold text-gray-900 leading-snug">{story.title}</h4>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-xs">{story.framework}</Badge>
                      <Badge variant="secondary" className="text-xs">{story.archetype}</Badge>
                      <Badge className={cn('text-xs border-transparent', confidence.color, confidence.bgColor)}>
                        {confidence.label}
                      </Badge>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500">
                    Published{' '}
                    {new Date(story.publishedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>

                  <div className="space-y-2">
                    {story.sections.map((section) => (
                      <div key={section.key} className="text-sm">
                        <span className="font-medium text-gray-700">{section.label}: </span>
                        <span className="text-gray-600">{section.text}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
