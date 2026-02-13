import { useState } from 'react';
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
  Code2,
  Users,
  Target,
  Calendar,
  ExternalLink,
  Star,
  ChevronRight,
} from 'lucide-react';

import type { SkillCategory } from './mock-data';

/* ------------------------------------------------------------------ */
/*  V6 — "Split Bio + Tabs"                                           */
/*  Left panel bio + right panel tabbed interface                      */
/* ------------------------------------------------------------------ */

const TABS = [
  { key: 'experience', label: 'Experience', icon: Briefcase },
  { key: 'education', label: 'Education & Certs', icon: GraduationCap },
  { key: 'skills', label: 'Skills', icon: Code2 },
  { key: 'stories', label: 'Career Stories', icon: BookOpen },
] as const;

export function ProfileV6() {
  const p = mockProfile;
  const initials = getInitials(p.name);
  const [activeTab, setActiveTab] = useState<string>('experience');

  /* Group skills by category */
  const skillsByCategory = p.skills.reduce<Record<SkillCategory, typeof p.skills>>(
    (acc, skill) => {
      (acc[skill.category] ??= []).push(skill);
      return acc;
    },
    {} as Record<SkillCategory, typeof p.skills>,
  );

  /* Proficiency level -> bar width */
  const levelToWidth = (level: number) =>
    ({ 1: '25%', 2: '50%', 3: '75%', 4: '100%' })[level] ?? '0%';

  return (
    <div className="mx-auto max-w-6xl pb-12">
      <div className="flex gap-6">
        {/* ============================================================ */}
        {/* LEFT PANEL — Bio & Stats                                     */}
        {/* ============================================================ */}
        <div className="w-[35%] shrink-0">
          <Card className="sticky top-4">
            <CardContent className="p-6 space-y-0">
              {/* Avatar */}
              <div className="flex justify-center">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary-100">
                  <span className="text-2xl font-bold text-primary-700">{initials}</span>
                </div>
              </div>

              {/* Name & Title */}
              <div className="mt-4 text-center">
                <h1 className="text-xl font-bold text-gray-900">{p.name}</h1>
                <p className="mt-1 text-sm text-gray-600">{p.title}</p>
                <div className="mt-2 flex justify-center">
                  <Badge variant="secondary" className="inline-flex items-center gap-1 text-xs">
                    <Building2 className="h-3 w-3" />
                    {p.company}
                  </Badge>
                </div>
              </div>

              {/* Location */}
              <div className="mt-3 flex items-center justify-center gap-1 text-sm text-gray-500">
                <MapPin className="h-3.5 w-3.5" />
                {p.location}
              </div>

              {/* Divider */}
              <div className="border-t my-4" />

              {/* Bio */}
              <p className="text-sm text-gray-700 leading-relaxed">{p.bio}</p>

              {/* Divider */}
              <div className="border-t my-4" />

              {/* Network Stats */}
              <div className="flex items-center justify-center gap-6">
                <div className="flex items-center gap-1.5 text-sm text-gray-700">
                  <Users className="h-4 w-4 text-gray-500" />
                  <span className="font-semibold">{p.networkStats.followers}</span>
                  <span className="text-gray-500">followers</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-gray-700">
                  <Users className="h-4 w-4 text-gray-500" />
                  <span className="font-semibold">{p.networkStats.following}</span>
                  <span className="text-gray-500">following</span>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t my-4" />

              {/* Career Goals */}
              <div>
                <h3 className="mb-2 text-sm font-semibold text-gray-900">Career Goals</h3>
                <div className="space-y-2">
                  {p.careerGoals.map((goal, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                      <Target className="h-3.5 w-3.5 shrink-0 text-primary-500" />
                      {goal}
                    </div>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="border-t my-4" />

              {/* Profile Completeness */}
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-gray-900">Profile Completeness</span>
                  <span className="font-semibold text-primary-700">
                    {p.profileCompleteness.overall}%
                  </span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-primary-500 transition-all"
                    style={{ width: `${p.profileCompleteness.overall}%` }}
                  />
                </div>

                <div className="mt-3 space-y-2">
                  {p.profileCompleteness.byCategory.map((cat) => (
                    <div key={cat.category}>
                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <span>{cat.category}</span>
                        <span>{cat.percentage}%</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                        <div
                          className="h-full rounded-full bg-primary-400 transition-all"
                          style={{ width: `${cat.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ============================================================ */}
        {/* RIGHT PANEL — Tabbed Content                                 */}
        {/* ============================================================ */}
        <div className="flex-1 min-w-0">
          {/* Tab Bar */}
          <div className="flex border-b border-gray-200">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'flex items-center gap-1.5 px-4 py-3 text-sm transition-colors -mb-px',
                    isActive
                      ? 'border-b-2 border-primary-500 text-primary-600 font-semibold'
                      : 'text-gray-500 hover:text-gray-700',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="mt-6">
            {/* ---- Experience Tab ---- */}
            {activeTab === 'experience' && (
              <div className="space-y-4">
                {p.experience.map((exp) => {
                  const duration = calculateDuration(exp.startDate, exp.endDate);
                  return (
                    <Card key={exp.id}>
                      <CardContent className="p-5 space-y-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <h4 className="font-semibold text-lg text-gray-900">{exp.title}</h4>
                            <p className="mt-0.5 text-sm text-gray-600">
                              {exp.company} &middot; {exp.location}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>{formatDateRange(exp.startDate, exp.endDate)}</span>
                            <Badge variant="outline" className="text-xs">
                              {duration}
                            </Badge>
                          </div>
                        </div>

                        <p className="text-sm text-gray-600 leading-relaxed">{exp.description}</p>

                        {exp.achievements.length > 0 && (
                          <ul className="space-y-1 text-sm text-gray-600">
                            {exp.achievements.map((a, i) => (
                              <li key={i} className="flex items-start gap-1.5">
                                <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-500" />
                                {a}
                              </li>
                            ))}
                          </ul>
                        )}

                        {exp.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {exp.skills.map((s) => (
                              <Badge key={s} variant="secondary" className="text-xs">
                                {s}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* ---- Education & Certs Tab ---- */}
            {activeTab === 'education' && (
              <div className="space-y-6">
                {/* Education */}
                <div>
                  <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
                    <GraduationCap className="h-5 w-5 text-primary-600" />
                    Education
                  </h3>
                  <div className="space-y-4">
                    {p.education.map((edu) => (
                      <Card key={edu.id}>
                        <CardContent className="p-5 space-y-2">
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
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Certifications */}
                <div>
                  <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
                    <Award className="h-5 w-5 text-primary-600" />
                    Certifications
                  </h3>
                  <div className="space-y-4">
                    {p.certifications.map((cert) => {
                      const expiry = getCertExpiryStatus(cert.expiryDate);
                      return (
                        <Card key={cert.id}>
                          <CardContent className="p-5 space-y-2">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <h4 className="font-semibold text-gray-900">{cert.name}</h4>
                              <span className={cn('text-xs font-medium', expiry.color)}>
                                {expiry.label}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">{cert.organization}</p>
                            <p className="text-xs text-gray-500">
                              Issued{' '}
                              {new Date(cert.issueDate).toLocaleDateString('en-US', {
                                month: 'short',
                                year: 'numeric',
                              })}
                              {cert.expiryDate &&
                                ` · Expires ${new Date(cert.expiryDate).toLocaleDateString('en-US', {
                                  month: 'short',
                                  year: 'numeric',
                                })}`}
                            </p>
                            {cert.skills.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {cert.skills.map((s) => (
                                  <Badge key={s} variant="secondary" className="text-xs">
                                    {s}
                                  </Badge>
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
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ---- Skills Tab ---- */}
            {activeTab === 'skills' && (
              <div className="space-y-6">
                {(
                  Object.entries(skillsByCategory) as [SkillCategory, typeof p.skills][]
                ).map(([category, skills]) => {
                  const catMeta = SKILL_CATEGORY_META[category];
                  return (
                    <div key={category}>
                      <div className="mb-3">
                        <Badge
                          className={cn(
                            'text-xs border-transparent',
                            catMeta.color,
                            catMeta.bgColor,
                          )}
                        >
                          {catMeta.label}
                        </Badge>
                      </div>
                      <div className="space-y-3">
                        {skills.map((skill) => {
                          const meta = PROFICIENCY_META[skill.proficiency];
                          return (
                            <div key={skill.name} className="flex items-center gap-3">
                              <span className="w-28 shrink-0 text-sm font-medium text-gray-700">
                                {skill.name}
                              </span>
                              <Badge
                                className={cn(
                                  'text-xs border-transparent',
                                  meta.color,
                                  meta.bgColor,
                                )}
                              >
                                {meta.label}
                              </Badge>
                              <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
                                <div
                                  className="h-full rounded-full bg-primary-500 transition-all"
                                  style={{ width: levelToWidth(meta.level) }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ---- Career Stories Tab ---- */}
            {activeTab === 'stories' && (
              <div className="space-y-4">
                {p.careerStories.map((story) => {
                  const confidence = getConfidenceLevel(story.overallConfidence);
                  return (
                    <Card key={story.id}>
                      <CardContent className="p-5 space-y-3">
                        <h4 className="font-semibold text-lg text-gray-900 leading-snug">
                          {story.title}
                        </h4>

                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {story.framework}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {story.archetype}
                          </Badge>
                        </div>

                        {/* Overall Confidence */}
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-500">Confidence</span>
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
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
                          <Badge
                            className={cn(
                              'text-xs border-transparent',
                              confidence.color,
                              confidence.bgColor,
                            )}
                          >
                            {confidence.label} ({Math.round(story.overallConfidence * 100)}%)
                          </Badge>
                        </div>

                        {/* Section Previews */}
                        <div className="space-y-2">
                          {story.sections.map((section) => (
                            <div key={section.key} className="text-sm">
                              <span className="font-medium text-gray-700">{section.label}: </span>
                              <span className="text-gray-600 line-clamp-2">{section.text}</span>
                            </div>
                          ))}
                        </div>

                        {/* Tools */}
                        {story.tools.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {story.tools.map((tool) => (
                              <Badge
                                key={tool}
                                variant="outline"
                                className="text-[10px] text-gray-500"
                              >
                                {tool}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* Published Date */}
                        <p className="text-xs text-gray-500">
                          Published{' '}
                          {new Date(story.publishedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
