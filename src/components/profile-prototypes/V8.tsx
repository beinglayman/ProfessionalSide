import { useState } from 'react';
import {
  mockProfile,
  getInitials,
  formatDateRange,
  calculateDuration,
  PROFICIENCY_META,
  getConfidenceLevel,
  getCertExpiryStatus,
} from './mock-data';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import {
  MapPin,
  Briefcase,
  GraduationCap,
  Award,
  BookOpen,
  Code2,
  ChevronDown,
  ChevronUp,
  Calendar,
  Star,
  ExternalLink,
  Users,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  V8 — "Minimal Clean"                                               */
/*  Ultra-minimal, whitespace-heavy with progressive disclosure        */
/* ------------------------------------------------------------------ */

export function ProfileV8() {
  const p = mockProfile;
  const initials = getInitials(p.name);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggle = (key: string) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  const isOpen = (key: string) => expanded[key] ?? false;

  // Extract first sentence of bio
  const firstSentence = p.bio.split(/(?<=\.)\s/)[0];

  // Count published stories
  const publishedCount = p.careerStories.length;

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6">
        {/* ── Header ── */}
        <div className="py-12 text-center">
          {/* Avatar */}
          <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-primary-50 text-primary-600">
            <span className="text-3xl font-medium">{initials}</span>
          </div>

          {/* Name */}
          <h1 className="mt-6 text-3xl font-light tracking-tight text-gray-900">
            {p.name}
          </h1>

          {/* Title + Company */}
          <p className="mt-2 text-lg text-gray-400">
            {p.title} at {p.company}
          </p>

          {/* Location */}
          <p className="mt-1 flex items-center justify-center gap-1 text-sm text-gray-400">
            <MapPin className="h-3.5 w-3.5" />
            {p.location}
          </p>

          {/* Bio — first sentence only */}
          <p className="mx-auto mt-4 max-w-xl text-gray-500">
            {firstSentence}
          </p>

          {/* Network stats */}
          <p className="mt-3 text-sm text-gray-400">
            <Users className="mr-1 inline h-3.5 w-3.5" />
            {p.networkStats.followers} followers &middot;{' '}
            {p.networkStats.following} following
          </p>
        </div>

        {/* ── Divider ── */}
        <div className="mx-auto my-8 h-px w-12 bg-gray-200" />

        {/* ── Expandable Sections ── */}
        <div className="mx-auto max-w-2xl">
          {/* ── Experience ── */}
          <button
            type="button"
            onClick={() => toggle('experience')}
            className="flex w-full items-center justify-between border-b border-gray-100 py-4"
          >
            <div className="flex items-center gap-3">
              <Briefcase className="h-5 w-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">
                Experience
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">
                {p.experience.length} positions
              </span>
              {isOpen('experience') ? (
                <ChevronUp className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              )}
            </div>
          </button>
          {isOpen('experience') && (
            <div className="space-y-8 py-6 pl-8">
              {p.experience.map((exp) => (
                <div key={exp.id}>
                  <p className="font-medium text-gray-800">{exp.title}</p>
                  <p className="text-sm text-gray-500">
                    {exp.company} &middot; {exp.location}
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-gray-400">
                    <Calendar className="h-3 w-3" />
                    {formatDateRange(exp.startDate, exp.endDate)} &middot;{' '}
                    {calculateDuration(exp.startDate, exp.endDate)}
                  </p>
                  <p className="mt-2 text-sm text-gray-600">
                    {exp.description}
                  </p>
                  {exp.achievements.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {exp.achievements.map((ach, i) => (
                        <li
                          key={i}
                          className="text-sm text-gray-500 before:mr-2 before:text-gray-300 before:content-['—']"
                        >
                          {ach}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── Education ── */}
          <button
            type="button"
            onClick={() => toggle('education')}
            className="flex w-full items-center justify-between border-b border-gray-100 py-4"
          >
            <div className="flex items-center gap-3">
              <GraduationCap className="h-5 w-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">
                Education
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">
                {p.education.length} degrees
              </span>
              {isOpen('education') ? (
                <ChevronUp className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              )}
            </div>
          </button>
          {isOpen('education') && (
            <div className="space-y-8 py-6 pl-8">
              {p.education.map((edu) => (
                <div key={edu.id}>
                  <p className="font-medium text-gray-800">
                    {edu.degree} in {edu.field}
                  </p>
                  <p className="text-sm text-gray-500">
                    {edu.institution} &middot; {edu.location}
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-gray-400">
                    <Calendar className="h-3 w-3" />
                    {edu.startYear} &ndash; {edu.endYear}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">{edu.grade}</p>
                  {edu.activities.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {edu.activities.map((act, i) => (
                        <li
                          key={i}
                          className="text-sm text-gray-500 before:mr-2 before:text-gray-300 before:content-['—']"
                        >
                          {act}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── Skills ── */}
          <button
            type="button"
            onClick={() => toggle('skills')}
            className="flex w-full items-center justify-between border-b border-gray-100 py-4"
          >
            <div className="flex items-center gap-3">
              <Code2 className="h-5 w-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Skills</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">
                {p.skills.length} skills
              </span>
              {isOpen('skills') ? (
                <ChevronUp className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              )}
            </div>
          </button>
          {isOpen('skills') && (
            <div className="space-y-3 py-6 pl-8">
              {p.skills.map((skill) => {
                const meta = PROFICIENCY_META[skill.proficiency];
                return (
                  <div
                    key={skill.name}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm text-gray-700">{skill.name}</span>
                    <span className={cn('text-xs', meta.color)}>
                      {meta.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Certifications ── */}
          <button
            type="button"
            onClick={() => toggle('certifications')}
            className="flex w-full items-center justify-between border-b border-gray-100 py-4"
          >
            <div className="flex items-center gap-3">
              <Award className="h-5 w-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">
                Certifications
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">
                {p.certifications.length} certifications
              </span>
              {isOpen('certifications') ? (
                <ChevronUp className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              )}
            </div>
          </button>
          {isOpen('certifications') && (
            <div className="space-y-8 py-6 pl-8">
              {p.certifications.map((cert) => {
                const expiry = getCertExpiryStatus(cert.expiryDate);
                return (
                  <div key={cert.id}>
                    <p className="font-medium text-gray-800">{cert.name}</p>
                    <p className="text-sm text-gray-500">
                      {cert.organization}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-gray-400">
                      <Calendar className="h-3 w-3" />
                      Issued{' '}
                      {new Date(cert.issueDate).toLocaleDateString('en-US', {
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                    <p className={cn('mt-1 text-xs', expiry.color)}>
                      {expiry.label}
                    </p>
                    <a
                      href={cert.credentialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
                    >
                      View credential
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Career Stories ── */}
          <button
            type="button"
            onClick={() => toggle('stories')}
            className="flex w-full items-center justify-between border-b border-gray-100 py-4"
          >
            <div className="flex items-center gap-3">
              <BookOpen className="h-5 w-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">
                Career Stories
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">
                {publishedCount} published
              </span>
              {isOpen('stories') ? (
                <ChevronUp className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              )}
            </div>
          </button>
          {isOpen('stories') && (
            <div className="space-y-6 py-6 pl-8">
              {p.careerStories.map((story) => {
                const confidence = getConfidenceLevel(
                  story.overallConfidence,
                );
                return (
                  <div key={story.id}>
                    <p className="font-medium text-gray-800">{story.title}</p>
                    <p className="mt-1 flex items-center gap-2 text-xs text-gray-400">
                      <Badge
                        variant="outline"
                        className="border-gray-200 text-xs font-normal text-gray-500"
                      >
                        {story.framework}
                      </Badge>
                      <span className={cn(confidence.color)}>
                        <Star className="mr-0.5 inline h-3 w-3" />
                        {confidence.label}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      Published{' '}
                      {new Date(story.publishedAt).toLocaleDateString(
                        'en-US',
                        {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        },
                      )}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Footer spacer ── */}
        <div className="py-12" />
      </div>
    </div>
  );
}
