import { useState } from 'react';
import {
  mockProfile,
  getInitials,
  formatDateRange,
  calculateDuration,
  PROFICIENCY_META,
  SKILL_CATEGORY_META,
  getConfidenceLevel,
} from './mock-data';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import {
  MapPin,
  Briefcase,
  GraduationCap,
  Award,
  BookOpen,
  Code2,
  Calendar,
  Users,
  ChevronLeft,
  ChevronRight,
  Star,
  Target,
} from 'lucide-react';

import type { SkillProficiency } from './mock-data';

/* ------------------------------------------------------------------ */
/*  V5 — "Bento Mosaic"                                                */
/*  Asymmetric bento grid layout with mixed tile sizes                 */
/* ------------------------------------------------------------------ */

const PROFICIENCY_SIZE: Record<SkillProficiency, string> = {
  expert: 'px-4 py-2 text-sm font-semibold',
  advanced: 'px-3 py-1.5 text-sm',
  intermediate: 'px-3 py-1 text-xs',
  beginner: 'px-2 py-1 text-xs',
};

export function ProfileV5() {
  const p = mockProfile;
  const initials = getInitials(p.name);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const activeStory = p.careerStories[activeStoryIndex];
  const storyConfidence = getConfidenceLevel(activeStory.overallConfidence);

  const prevStory = () =>
    setActiveStoryIndex((i) => (i === 0 ? p.careerStories.length - 1 : i - 1));
  const nextStory = () =>
    setActiveStoryIndex((i) => (i === p.careerStories.length - 1 ? 0 : i + 1));

  const completeness = p.profileCompleteness.overall;

  return (
    <div className="mx-auto max-w-5xl pb-12">
      <div className="grid grid-cols-4 grid-rows-[auto] gap-4">
        {/* ============================================================ */}
        {/* ROW 1 + ROW 2 — Bio tile (large, spans 2 cols x 2 rows)      */}
        {/* ============================================================ */}
        <div className="col-span-2 row-span-2 rounded-2xl bg-gradient-to-br from-primary-50 to-white p-6 shadow-sm border border-gray-100">
          <div className="flex items-start gap-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary-100">
              <span className="text-2xl font-bold text-primary-700">{initials}</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-gray-900">{p.name}</h1>
              <p className="text-base text-gray-600">
                {p.title} at {p.company}
              </p>
              <span className="mt-1 inline-flex items-center gap-1 text-sm text-gray-500">
                <MapPin className="h-3.5 w-3.5" />
                {p.location}
              </span>
            </div>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-gray-700">{p.bio}</p>

          <div className="mt-4 space-y-1.5">
            {p.highlights.map((h, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-gray-600">
                <Star className="mt-0.5 h-3 w-3 shrink-0 text-amber-400" />
                {h}
              </div>
            ))}
          </div>
        </div>

        {/* ============================================================ */}
        {/* ROW 1 — Stat tile: Years Experience                          */}
        {/* ============================================================ */}
        <div className="col-span-1 flex flex-col items-start justify-between rounded-2xl bg-primary-500 p-5 text-white shadow-sm">
          <Briefcase className="h-6 w-6 opacity-80" />
          <div className="mt-auto">
            <span className="text-4xl font-bold leading-none">{p.yearsOfExperience}</span>
            <p className="mt-1 text-sm font-medium opacity-90">Years Experience</p>
          </div>
        </div>

        {/* ============================================================ */}
        {/* ROW 1 — Stat tile: Skills Count                              */}
        {/* ============================================================ */}
        <div className="col-span-1 flex flex-col items-start justify-between rounded-2xl bg-emerald-500 p-5 text-white shadow-sm">
          <Code2 className="h-6 w-6 opacity-80" />
          <div className="mt-auto">
            <span className="text-4xl font-bold leading-none">{p.skills.length}</span>
            <p className="mt-1 text-sm font-medium opacity-90">Skills</p>
          </div>
        </div>

        {/* ============================================================ */}
        {/* ROW 2 — Stat tile: Stories Count                             */}
        {/* ============================================================ */}
        <div className="col-span-1 flex flex-col items-start justify-between rounded-2xl bg-amber-500 p-5 text-white shadow-sm">
          <BookOpen className="h-6 w-6 opacity-80" />
          <div className="mt-auto">
            <span className="text-4xl font-bold leading-none">{p.careerStories.length}</span>
            <p className="mt-1 text-sm font-medium opacity-90">Career Stories</p>
          </div>
        </div>

        {/* ============================================================ */}
        {/* ROW 2 — Stat tile: Certifications Count                      */}
        {/* ============================================================ */}
        <div className="col-span-1 flex flex-col items-start justify-between rounded-2xl bg-blue-500 p-5 text-white shadow-sm">
          <Award className="h-6 w-6 opacity-80" />
          <div className="mt-auto">
            <span className="text-4xl font-bold leading-none">{p.certifications.length}</span>
            <p className="mt-1 text-sm font-medium opacity-90">Certifications</p>
          </div>
        </div>

        {/* ============================================================ */}
        {/* ROW 3 + ROW 4 — Experience tile (medium, spans 2 cols x 2)   */}
        {/* ============================================================ */}
        <Card className="col-span-2 row-span-2 overflow-hidden">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-gray-900">Experience</h2>
            </div>
            <div className="space-y-5">
              {p.experience.map((exp) => {
                const duration = calculateDuration(exp.startDate, exp.endDate);
                return (
                  <div key={exp.id} className="space-y-1">
                    <h4 className="font-semibold text-gray-900">{exp.title}</h4>
                    <p className="text-sm text-gray-600">{exp.company}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDateRange(exp.startDate, exp.endDate)}</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {duration}
                      </Badge>
                    </div>
                    <ul className="mt-1.5 space-y-1">
                      {exp.achievements.slice(0, 2).map((a, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-1.5 text-xs text-gray-600"
                        >
                          <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-primary-400" />
                          {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* ============================================================ */}
        {/* ROW 3 — Skills Cloud tile                                    */}
        {/* ============================================================ */}
        <Card className="col-span-2 overflow-hidden">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <Code2 className="h-5 w-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-gray-900">Skills</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {p.skills.map((skill) => {
                const catMeta = SKILL_CATEGORY_META[skill.category];
                const sizeClass = PROFICIENCY_SIZE[skill.proficiency];
                return (
                  <span
                    key={skill.name}
                    className={cn(
                      'inline-flex items-center rounded-full border-transparent',
                      catMeta.bgColor,
                      catMeta.color,
                      sizeClass,
                    )}
                  >
                    {skill.name}
                  </span>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* ============================================================ */}
        {/* ROW 4 — Career Stories Carousel tile                         */}
        {/* ============================================================ */}
        <Card className="col-span-2 overflow-hidden">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary-600" />
                <h2 className="text-lg font-semibold text-gray-900">Career Stories</h2>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={prevStory}
                  className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                  aria-label="Previous story"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={nextStory}
                  className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                  aria-label="Next story"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <h3 className="text-sm font-semibold text-gray-900 leading-snug">
              {activeStory.title}
            </h3>

            <div className="mt-2 flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {activeStory.framework}
              </Badge>
              <Badge
                className={cn(
                  'text-xs border-transparent',
                  storyConfidence.color,
                  storyConfidence.bgColor,
                )}
              >
                {storyConfidence.label}
              </Badge>
            </div>

            {/* Confidence bar */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Confidence</span>
                <span>{Math.round(activeStory.overallConfidence * 100)}%</span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${activeStory.overallConfidence * 100}%` }}
                />
              </div>
            </div>

            {/* Section previews (first 2) */}
            <div className="mt-3 space-y-2">
              {activeStory.sections.slice(0, 2).map((section) => (
                <div key={section.key} className="text-xs">
                  <span className="font-medium text-gray-700">{section.label}: </span>
                  <span className="text-gray-500">{section.text}</span>
                </div>
              ))}
            </div>

            {/* Dot indicators */}
            <div className="mt-4 flex items-center justify-center gap-1.5">
              {p.careerStories.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveStoryIndex(i)}
                  className={cn(
                    'h-2 rounded-full transition-all duration-200',
                    i === activeStoryIndex
                      ? 'w-5 bg-primary-500'
                      : 'w-2 bg-gray-300 hover:bg-gray-400',
                  )}
                  aria-label={`Go to story ${i + 1}`}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ============================================================ */}
        {/* ROW 5 — Education tile (medium, spans 2 cols)                */}
        {/* ============================================================ */}
        <Card className="col-span-2 overflow-hidden">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-gray-900">Education</h2>
            </div>
            <div className="space-y-4">
              {p.education.map((edu) => (
                <div
                  key={edu.id}
                  className="flex items-start justify-between gap-3 rounded-lg bg-gray-50 p-3"
                >
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-gray-900">
                      {edu.degree} in {edu.field}
                    </h4>
                    <p className="text-xs text-gray-600">{edu.institution}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {edu.startYear} &ndash; {edu.endYear}
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    {edu.grade}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ============================================================ */}
        {/* ROW 5 — Profile Completeness tile (small, 1 col)             */}
        {/* ============================================================ */}
        <Card className="col-span-1 overflow-hidden">
          <CardContent className="flex flex-col items-center justify-center p-5">
            <div className="mb-3 flex items-center gap-1.5">
              <Target className="h-4 w-4 text-primary-600" />
              <span className="text-xs font-semibold text-gray-700">Completeness</span>
            </div>
            {/* Circular progress using conic-gradient */}
            <div
              className="relative flex h-24 w-24 items-center justify-center rounded-full"
              style={{
                background: `conic-gradient(
                  var(--color-primary-500) ${completeness * 3.6}deg,
                  #e5e7eb ${completeness * 3.6}deg
                )`,
              }}
            >
              <div className="flex h-18 w-18 items-center justify-center rounded-full bg-white">
                <span className="text-xl font-bold text-gray-900">{completeness}%</span>
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              {completeness}% Complete
            </p>
          </CardContent>
        </Card>

        {/* ============================================================ */}
        {/* ROW 5 — Network tile (small, 1 col)                          */}
        {/* ============================================================ */}
        <Card className="col-span-1 overflow-hidden">
          <CardContent className="flex flex-col items-center justify-center p-5">
            <Users className="h-8 w-8 text-primary-500" />
            <div className="mt-3 text-center space-y-2">
              <div>
                <span className="text-2xl font-bold text-gray-900">
                  {p.networkStats.followers}
                </span>
                <p className="text-xs text-gray-500">Followers</p>
              </div>
              <div className="h-px w-10 mx-auto bg-gray-200" />
              <div>
                <span className="text-2xl font-bold text-gray-900">
                  {p.networkStats.following}
                </span>
                <p className="text-xs text-gray-500">Following</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
