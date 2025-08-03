import React from 'react';
import { differenceInMonths } from 'date-fns';
import { Sparkles, Download } from 'lucide-react';
import { Button } from '../../components/ui/button';

interface Skill {
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  endorsements: number;
  projects: number;
  startDate: Date;
}

interface SkillSummaryProps {
  selectedSkills: Skill[];
  hasJournalEntries?: boolean;
  hasOnboardingSkills?: boolean;
}

// Export profile function
const exportProfile = () => {
  // In a real implementation, this would generate a PDF or other downloadable format
  console.log('Exporting profile data...');
  
  // Create a JSON blob of sample profile data
  const profileData = JSON.stringify({ 
    name: 'Sarah Chen',
    title: 'Senior Frontend Developer',
    exportedAt: new Date().toISOString()
  }, null, 2);
  const blob = new Blob([profileData], { type: 'application/json' });
  
  // Create a download link
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Sarah_Chen_Profile.json';
  document.body.appendChild(a);
  a.click();
  
  // Clean up
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
};

function generateSkillSummary(skills: Skill[]): string {
  if (skills.length === 0) return '';
  const expertSkills = skills.filter(s => s.level === 'expert');
  const advancedSkills = skills.filter(s => s.level === 'advanced');
  const otherSkills = skills.filter(s => ['intermediate', 'beginner'].includes(s.level));
  const oldestSkillDate = new Date(
    Math.min(...skills.map(skill => skill.startDate.getTime()))
  );
  const experienceMonths = differenceInMonths(new Date(), oldestSkillDate);
  const years = Math.floor(experienceMonths / 12);
  const totalProjects = skills.reduce((sum, skill) => sum + skill.projects, 0);
  const totalEndorsements = skills.reduce((sum, skill) => sum + skill.endorsements, 0);
  let summary = '';
  // Core expertise
  if (expertSkills.length > 0) {
    const expertSkillNames = expertSkills.map(s => s.name).join(', ');
    summary += `A seasoned professional with expert-level mastery in ${expertSkillNames}. `;
  }
  // Advanced capabilities
  if (advancedSkills.length > 0) {
    const advancedSkillNames = advancedSkills.map(s => s.name).join(', ');
    summary += `Demonstrates advanced proficiency in ${advancedSkillNames}. `;
  }
  // Experience overview
  summary += `With ${years}+ years of hands-on experience, they have successfully delivered ${totalProjects} projects `;
  summary += `and earned ${totalEndorsements} peer endorsements. `;
  // Growth areas
  if (otherSkills.length > 0) {
    const growthSkills = otherSkills.map(s => s.name).join(', ');
    summary += `Currently expanding expertise in ${growthSkills}. `;
  }
  // Impact statement
  summary += `Their technical versatility and proven track record demonstrate a commitment to delivering high-quality solutions and driving technological innovation.`;
  return summary;
}

export function SkillSummary({ selectedSkills, hasJournalEntries = false, hasOnboardingSkills = false }: SkillSummaryProps) {
  const summary = selectedSkills.length === 0 
    ? "Welcome to your professional profile! Your personalized summary will appear here as you document your skills and experiences. Start by creating journal entries about your work and projects to build a comprehensive view of your expertise."
    : generateSkillSummary(selectedSkills);

  const getTipMessage = () => {
    if (selectedSkills.length > 0) {
      return "💡 Tip: Adjust your skill selection above to refine your professional summary";
    }
    if (hasJournalEntries) {
      return "💡 Tip: Select skills from the filter panel to generate a customized professional summary";
    }
    return "💡 Tip: Create your first journal entry to start building your professional story and skills profile";
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Sparkles className="h-6 w-6 text-primary-500" />
          <h3 className="text-lg font-semibold text-gray-900">
            {selectedSkills.length === 0 ? "Professional Summary" : `Professional Summary (${selectedSkills.length} skills selected)`}
          </h3>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center shadow-sm hover:shadow-md transition-all duration-200" 
          onClick={exportProfile}
        >
          <Download className="mr-1 h-4 w-4" />
          Export Profile
        </Button>
      </div>
      <div className="mt-4">
        <div className={`rounded-lg p-6 ${
          selectedSkills.length === 0 
            ? "bg-gradient-to-r from-gray-50 to-blue-50 border border-blue-100" 
            : "bg-gradient-to-r from-primary-50 to-white"
        }`}>
          <p className="text-gray-700 leading-relaxed">{summary}</p>
          <div className="mt-3 text-sm text-blue-600 font-medium">
            {getTipMessage()}
          </div>
        </div>
      </div>
    </div>
  );
}