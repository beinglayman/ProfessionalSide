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
  Building2,
  Briefcase,
  GraduationCap,
  Award,
  BookOpen,
  Calendar,
  Star,
  Mail,
  Globe,
  Target,
} from 'lucide-react';

/* ---------- helpers ---------- */

const proficiencyWidth: Record<string, string> = {
  beginner: 'w-1/4',
  intermediate: 'w-1/2',
  advanced: 'w-3/4',
  expert: 'w-full',
};

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-serif text-sm font-bold uppercase tracking-wide border-b-2 border-primary-500 pb-1 mb-4">
      {children}
    </h2>
  );
}

/* ---------- component ---------- */

export function ProfileV3() {
  const p = mockProfile;
  const initials = getInitials(p.name);

  return (
    <div className="max-w-[1000px] mx-auto bg-white shadow-lg rounded-lg overflow-hidden border">
      <div className="flex min-h-[800px]">
        {/* ============ LEFT SIDEBAR ============ */}
        <aside className="w-[300px] bg-gray-50 p-6 border-r flex-shrink-0">
          {/* Avatar */}
          <div className="w-24 h-24 mx-auto rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-2xl font-bold">
            {initials}
          </div>

          {/* Name & Title */}
          <h1 className="text-xl font-serif font-bold text-center mt-4">{p.name}</h1>
          <p className="text-sm text-gray-600 text-center">{p.title}</p>

          <hr className="my-4 border-gray-200" />

          {/* Contact-style Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span>{p.location}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Building2 className="h-4 w-4 flex-shrink-0" />
              <span>{p.company}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Globe className="h-4 w-4 flex-shrink-0" />
              <span>{p.industry}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Briefcase className="h-4 w-4 flex-shrink-0" />
              <span>{p.yearsOfExperience} years experience</span>
            </div>
          </div>

          <hr className="my-4 border-gray-200" />

          {/* Skills with progress bars */}
          <div>
            <h3 className="font-serif text-xs font-bold uppercase tracking-wide mb-3 text-gray-700">
              Skills
            </h3>
            <div className="space-y-3">
              {p.skills.map((skill) => {
                const meta = PROFICIENCY_META[skill.proficiency];
                return (
                  <div key={skill.name}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-700 font-medium">{skill.name}</span>
                      <span className={cn('text-[10px]', meta.color)}>{meta.label}</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full bg-primary-500',
                          proficiencyWidth[skill.proficiency],
                        )}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <hr className="my-4 border-gray-200" />

          {/* Professional Interests */}
          <div>
            <h3 className="font-serif text-xs font-bold uppercase tracking-wide mb-3 text-gray-700">
              Interests
            </h3>
            <ul className="space-y-1">
              {p.professionalInterests.map((interest) => (
                <li key={interest} className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                  {interest}
                </li>
              ))}
            </ul>
          </div>

          <hr className="my-4 border-gray-200" />

          {/* Career Goals */}
          <div>
            <h3 className="font-serif text-xs font-bold uppercase tracking-wide mb-3 text-gray-700">
              Career Goals
            </h3>
            <ul className="space-y-1">
              {p.careerGoals.map((goal) => (
                <li key={goal} className="flex items-center gap-2 text-sm text-gray-600">
                  <Target className="h-3.5 w-3.5 flex-shrink-0 text-gray-500" />
                  {goal}
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* ============ RIGHT MAIN ============ */}
        <main className="flex-1 p-8">
          {/* Professional Summary */}
          <section>
            <SectionHeading>Professional Summary</SectionHeading>
            <p className="text-sm text-gray-700 leading-relaxed mb-3">{p.bio}</p>
            <ul className="space-y-1 mb-6">
              {p.highlights.map((h) => (
                <li key={h} className="flex items-start gap-2 text-sm text-gray-600">
                  <Star className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-primary-500" />
                  {h}
                </li>
              ))}
            </ul>
          </section>

          <hr className="my-5 border-gray-200" />

          {/* Experience */}
          <section>
            <SectionHeading>Experience</SectionHeading>
            <div className="space-y-5">
              {p.experience.map((exp) => (
                <div key={exp.id}>
                  <h3 className="font-semibold text-sm text-gray-900">{exp.title}</h3>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                    <Building2 className="h-3 w-3" />
                    <span>{exp.company}</span>
                    <span className="text-gray-300">|</span>
                    <MapPin className="h-3 w-3" />
                    <span>{exp.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDateRange(exp.startDate, exp.endDate)}</span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {calculateDuration(exp.startDate, exp.endDate)}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mt-2 leading-relaxed">{exp.description}</p>
                  {exp.achievements.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {exp.achievements.map((a) => (
                        <li
                          key={a}
                          className="flex items-start gap-2 text-xs text-gray-600"
                        >
                          <span className="mt-1.5 h-1 w-1 rounded-full bg-gray-400 flex-shrink-0" />
                          {a}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>

          <hr className="my-5 border-gray-200" />

          {/* Education */}
          <section>
            <SectionHeading>Education</SectionHeading>
            <div className="space-y-4">
              {p.education.map((edu) => (
                <div key={edu.id}>
                  <h3 className="font-semibold text-sm text-gray-900">
                    {edu.degree} in {edu.field}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                    <GraduationCap className="h-3 w-3" />
                    <span>{edu.institution}</span>
                    <span className="text-gray-300">|</span>
                    <span>
                      {edu.startYear} &ndash; {edu.endYear}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                    <span className="font-medium">{edu.grade}</span>
                  </div>
                  {edu.activities.length > 0 && (
                    <ul className="mt-1.5 space-y-0.5">
                      {edu.activities.map((a) => (
                        <li key={a} className="text-xs text-gray-500 flex items-start gap-2">
                          <span className="mt-1.5 h-1 w-1 rounded-full bg-gray-400 flex-shrink-0" />
                          {a}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>

          <hr className="my-5 border-gray-200" />

          {/* Certifications */}
          <section>
            <SectionHeading>Certifications</SectionHeading>
            <div className="space-y-4">
              {p.certifications.map((cert) => {
                const expiry = getCertExpiryStatus(cert.expiryDate);
                return (
                  <div key={cert.id}>
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="font-semibold text-sm text-gray-900">{cert.name}</h3>
                      <span className={cn('text-[10px] whitespace-nowrap font-medium', expiry.color)}>
                        {expiry.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                      <Award className="h-3 w-3" />
                      <span>{cert.organization}</span>
                      <span className="text-gray-300">|</span>
                      <Calendar className="h-3 w-3" />
                      <span>
                        Issued{' '}
                        {new Date(cert.issueDate).toLocaleDateString('en-US', {
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    {cert.skills.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        <span className="font-medium text-gray-600">Skills:</span>{' '}
                        {cert.skills.join(', ')}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <hr className="my-5 border-gray-200" />

          {/* Career Stories */}
          <section>
            <SectionHeading>Career Stories</SectionHeading>
            <div className="space-y-2">
              {p.careerStories.map((story) => {
                const conf = getConfidenceLevel(story.overallConfidence);
                return (
                  <div
                    key={story.id}
                    className="flex items-center justify-between gap-4 py-1.5"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <BookOpen className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                      <span className="text-sm text-gray-700 truncate">{story.title}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {story.framework}
                      </Badge>
                      <span
                        className={cn(
                          'text-[10px] font-medium px-1.5 py-0.5 rounded',
                          conf.bgColor,
                          conf.color,
                        )}
                      >
                        {conf.label} ({Math.round(story.overallConfidence * 100)}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
