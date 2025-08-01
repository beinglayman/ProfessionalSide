import React, { useState, useEffect } from 'react';
import { Button } from '../../../components/ui/button';
import { Target, Plus, X, Star } from 'lucide-react';

interface SkillsExpertiseProps {
  data: any;
  onUpdate: (data: any) => Promise<void>;
  onNext: () => Promise<void>;
  onPrevious: () => Promise<void>;
  isFirstStep: boolean;
  isLastStep: boolean;
}

// Predefined skills categories
const SKILL_CATEGORIES = {
  'Programming Languages': [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'C++', 'Go', 'Rust', 'PHP', 'Ruby', 'Swift', 'Kotlin'
  ],
  'Frontend Technologies': [
    'React', 'Angular', 'Vue.js', 'Next.js', 'Svelte', 'HTML/CSS', 'Tailwind CSS', 'Material UI', 'Bootstrap'
  ],
  'Backend Technologies': [
    'Node.js', 'Express.js', 'Django', 'Flask', 'Spring Boot', 'ASP.NET', 'Laravel', 'Ruby on Rails'
  ],
  'Databases': [
    'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch', 'Cassandra', 'SQLite', 'Oracle'
  ],
  'Cloud & DevOps': [
    'AWS', 'Azure', 'Google Cloud', 'Docker', 'Kubernetes', 'Jenkins', 'GitLab CI', 'Terraform', 'Ansible'
  ],
  'Data & Analytics': [
    'SQL', 'Pandas', 'NumPy', 'R', 'Tableau', 'Power BI', 'Apache Spark', 'TensorFlow', 'PyTorch'
  ],
  'Mobile Development': [
    'React Native', 'Flutter', 'iOS Development', 'Android Development', 'Xamarin', 'Ionic'
  ],
  'Design & UX': [
    'Figma', 'Adobe XD', 'Sketch', 'Photoshop', 'Illustrator', 'InVision', 'Principle', 'Framer'
  ],
  'Product Management': [
    'Product Strategy', 'Product Planning', 'Product Roadmap', 'User Research', 'Market Analysis', 'Product Analytics', 'A/B Testing', 'Stakeholder Management', 'Product Launch', 'Feature Prioritization', 'Product-Market Fit', 'Growth Strategy'
  ],
  'Project Management': [
    'Agile', 'Scrum', 'Kanban', 'Jira', 'Asana', 'Trello', 'Monday.com', 'Linear'
  ],
  'Soft Skills': [
    'Leadership', 'Team Management', 'Communication', 'Problem Solving', 'Strategic Thinking', 'Mentoring'
  ]
};

const PROFICIENCY_LEVELS = [
  { value: 'beginner', label: 'Beginner', description: 'Learning the basics' },
  { value: 'intermediate', label: 'Intermediate', description: 'Comfortable with most concepts' },
  { value: 'advanced', label: 'Advanced', description: 'Deep expertise and experience' },
  { value: 'expert', label: 'Expert', description: 'Industry-recognized expertise' }
];

interface Skill {
  name: string;
  proficiency: string;
  category?: string;
}

export function SkillsExpertiseStep({ 
  data, 
  onUpdate, 
  onNext, 
  onPrevious, 
  isFirstStep, 
  isLastStep 
}: SkillsExpertiseProps) {
  const [formData, setFormData] = useState({
    skills: data.skills || [],
    topSkills: data.topSkills || [],
    ...data
  });

  const [selectedCategory, setSelectedCategory] = useState('Programming Languages');
  const [customSkill, setCustomSkill] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isInitialized, setIsInitialized] = useState(false);

  // Update form data when data prop changes (for pre-population)
  // Only run once when data first arrives
  useEffect(() => {
    if (data && Object.keys(data).length > 0 && !isInitialized) {
      setFormData({
        skills: data.skills || [],
        topSkills: data.topSkills || [],
        ...data
      });
      setIsInitialized(true);
    }
  }, [data, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      const updateData = async () => {
        try {
          await onUpdate(formData);
        } catch (error) {
          // Handle error silently
        }
      };
      
      // Debounce the API calls to prevent excessive calls while typing
      const timeoutId = setTimeout(updateData, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [formData, onUpdate, isInitialized]);

  const addSkill = (skillName: string, category?: string) => {
    if (formData.skills.find((skill: Skill) => skill.name === skillName)) {
      return; // Skill already exists
    }

    const newSkill: Skill = {
      name: skillName,
      proficiency: 'intermediate',
      category: category || 'Custom'
    };

    setFormData(prev => {
      const newSkills = [...prev.skills, newSkill];
      const newTopSkills = [...prev.topSkills];
      
      // Automatically mark as top skill if we have less than 5 top skills
      if (newTopSkills.length < 5 && !newTopSkills.includes(skillName)) {
        newTopSkills.push(skillName);
      }
      
      return {
        ...prev,
        skills: newSkills,
        topSkills: newTopSkills
      };
    });
  };

  const removeSkill = (skillName: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter((skill: Skill) => skill.name !== skillName),
      topSkills: prev.topSkills.filter((name: string) => name !== skillName)
    }));
  };

  const updateSkillProficiency = (skillName: string, proficiency: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.map((skill: Skill) =>
        skill.name === skillName ? { ...skill, proficiency } : skill
      )
    }));
  };

  const toggleTopSkill = (skillName: string) => {
    setFormData(prev => ({
      ...prev,
      topSkills: prev.topSkills.includes(skillName)
        ? prev.topSkills.filter((name: string) => name !== skillName)
        : prev.topSkills.length < 5
        ? [...prev.topSkills, skillName]
        : prev.topSkills
    }));
  };

  const addCustomSkill = () => {
    if (customSkill.trim() && !formData.skills.find((skill: Skill) => skill.name === customSkill.trim())) {
      addSkill(customSkill.trim());
      setCustomSkill('');
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (formData.skills.length === 0) {
      newErrors.skills = 'Please add at least one skill';
    } else if (formData.skills.length > 20) {
      newErrors.skills = 'Please limit to 20 skills maximum';
    }

    if (formData.topSkills.length === 0) {
      newErrors.topSkills = 'Please select at least one top skill';
    } else if (formData.topSkills.length > 5) {
      newErrors.topSkills = 'Please select no more than 5 top skills';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (validateForm()) {
      try {
        await onNext();
      } catch (error) {
        // Handle navigation error
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* Skills Selection */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          <div className="flex items-center space-x-2">
            <Target className="w-5 h-5 text-gray-500" />
            <span>Add Your Skills</span>
          </div>
        </h3>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.keys(SKILL_CATEGORIES).map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                selectedCategory === category
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Skills in Selected Category */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mb-6">
          {SKILL_CATEGORIES[selectedCategory as keyof typeof SKILL_CATEGORIES].map(skill => (
            <button
              key={skill}
              onClick={() => addSkill(skill, selectedCategory)}
              disabled={formData.skills.find((s: Skill) => s.name === skill)}
              className={`px-3 py-2 text-sm rounded-lg border transition-colors text-left ${
                formData.skills.find((s: Skill) => s.name === skill)
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-primary-500 hover:bg-primary-50'
              }`}
            >
              {skill}
              {formData.skills.find((s: Skill) => s.name === skill) && (
                <span className="ml-2 text-green-500">✓</span>
              )}
            </button>
          ))}
        </div>

        {/* Custom Skill Input */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={customSkill}
            onChange={(e) => setCustomSkill(e.target.value)}
            placeholder="Add a custom skill..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            onKeyPress={(e) => e.key === 'Enter' && addCustomSkill()}
          />
          <Button 
            onClick={addCustomSkill} 
            disabled={!customSkill.trim()}
            className="flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add</span>
          </Button>
        </div>

        {errors.skills && (
          <p className="text-sm text-red-600 mb-4">{errors.skills}</p>
        )}
      </div>

      {/* Added Skills with Proficiency */}
      {formData.skills.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Your Skills ({formData.skills.length}/20)
          </h3>
          <div className="space-y-3">
            {formData.skills.map((skill: Skill) => (
              <div key={skill.name} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-4 flex-1">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{skill.name}</h4>
                    {skill.category && (
                      <p className="text-sm text-gray-500">{skill.category}</p>
                    )}
                  </div>
                  
                  <select
                    value={skill.proficiency}
                    onChange={(e) => updateSkillProficiency(skill.name, e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary-500"
                  >
                    {PROFICIENCY_LEVELS.map(level => (
                      <option key={level.value} value={level.value}>
                        {level.label}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => toggleTopSkill(skill.name)}
                    disabled={!formData.topSkills.includes(skill.name) && formData.topSkills.length >= 5}
                    className={`p-2 rounded transition-colors ${
                      formData.topSkills.includes(skill.name)
                        ? 'text-yellow-500 bg-yellow-50'
                        : 'text-gray-400 hover:text-yellow-500'
                    }`}
                    title="Mark as top skill"
                  >
                    <Star className={`w-4 h-4 ${formData.topSkills.includes(skill.name) ? 'fill-current' : ''}`} />
                  </button>
                </div>

                <button
                  onClick={() => removeSkill(skill.name)}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {errors.topSkills && (
            <p className="text-sm text-red-600 mt-2">{errors.topSkills}</p>
          )}
          <p className="text-sm text-gray-500 mt-2">
            ⭐ Top skills ({formData.topSkills.length}/5): These will be prominently displayed on your profile
          </p>
        </div>
      )}


      {/* Skills Preview */}
      {formData.skills.length > 0 && (
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Skills Preview</h3>
          <div className="bg-white rounded-lg p-6 shadow-sm space-y-4">
            {formData.topSkills.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Top Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {formData.topSkills.map((skillName: string) => {
                    const skill = formData.skills.find((s: Skill) => s.name === skillName);
                    return (
                      <span key={skillName} className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1">
                        <Star className="w-3 h-3 fill-current" />
                        <span>{skillName}</span>
                        <span className="text-yellow-600">({skill?.proficiency})</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">All Skills</h4>
              <div className="flex flex-wrap gap-2">
                {formData.skills
                  .filter((skill: Skill) => !formData.topSkills.includes(skill.name))
                  .map((skill: Skill) => (
                    <span key={skill.name} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                      {skill.name} ({skill.proficiency})
                    </span>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-200">
        <Button 
          variant="outline" 
          onClick={onPrevious} 
          disabled={isFirstStep}
          className="flex items-center space-x-2"
        >
          <span>Previous</span>
        </Button>

        <div className="text-center text-xs text-gray-500">
          Step 3 of 7 • Skills & Expertise
        </div>

        <Button 
          onClick={handleNext}
          className="flex items-center space-x-2"
        >
          <span>Continue</span>
        </Button>
      </div>
    </div>
  );
}