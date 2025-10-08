import React, { useState } from 'react';
import { Search, Plus, X, Check } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Step6Props } from '../types/newEntryTypes';

interface SkillItemProps {
  skill: Step6Props['availableSkills'][0];
  isSelected: boolean;
  onToggle: (skillId: number) => void;
}

const SkillItem: React.FC<SkillItemProps> = ({ skill, isSelected, onToggle }) => (
  <button
    type="button"
    onClick={() => onToggle(skill.id)}
    className={cn(
      "flex items-center justify-between w-full text-left p-3 rounded-lg border transition-all duration-200",
      isSelected
        ? "bg-primary-50 border-primary-300 text-primary-800"
        : "bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50"
    )}
  >
    <div className="flex-1 min-w-0">
      <div className="font-medium">{skill.name}</div>
      {skill.workTypeId && (
        <div className="text-xs text-gray-500 mt-1">
          Specialized skill
        </div>
      )}
    </div>
    <div className={cn(
      "flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
      isSelected
        ? "bg-primary-500 border-primary-500 text-white"
        : "border-gray-300"
    )}>
      {isSelected && <Check className="w-4 h-4" />}
    </div>
  </button>
);

interface SelectedSkillTagProps {
  skill: Step6Props['availableSkills'][0];
  onRemove: (skillId: number) => void;
}

const SelectedSkillTag: React.FC<SelectedSkillTagProps> = ({ skill, onRemove }) => (
  <div className="flex items-center space-x-2 bg-primary-100 text-primary-800 px-3 py-1 rounded-full text-sm">
    <span className="font-medium">{skill.name}</span>
    <button
      type="button"
      onClick={() => onRemove(skill.id)}
      className="text-primary-600 hover:text-primary-800 transition-colors"
    >
      <X className="w-4 h-4" />
    </button>
  </div>
);

export const Step6Skills: React.FC<Step6Props> = ({
  formData,
  setFormData,
  validationErrors,
  availableSkills,
  onSkillSearch
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllSkills, setShowAllSkills] = useState(false);

  // Filter skills based on selected work types and search query
  const filteredSkills = React.useMemo(() => {
    let skills = availableSkills;

    // Filter by work types if any are selected
    if (formData.selectedWorkTypeIds.length > 0) {
      skills = skills.filter(skill =>
        !skill.workTypeId || formData.selectedWorkTypeIds.includes(skill.workTypeId)
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      skills = skills.filter(skill =>
        skill.name.toLowerCase().includes(query)
      );
    }

    return skills;
  }, [availableSkills, formData.selectedWorkTypeIds, searchQuery]);

  // Get selected skills
  const selectedSkills = availableSkills.filter(skill =>
    formData.selectedSkillIds.includes(skill.id)
  );

  // Skills to display (limit to 20 unless showing all)
  const displayedSkills = showAllSkills ? filteredSkills : filteredSkills.slice(0, 20);

  const handleSkillToggle = (skillId: number) => {
    const isSelected = formData.selectedSkillIds.includes(skillId);
    const newSelectedSkillIds = isSelected
      ? formData.selectedSkillIds.filter(id => id !== skillId)
      : [...formData.selectedSkillIds, skillId];

    setFormData({
      ...formData,
      selectedSkillIds: newSelectedSkillIds
    });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSkillSearch(query);
  };

  const removeSkill = (skillId: number) => {
    setFormData({
      ...formData,
      selectedSkillIds: formData.selectedSkillIds.filter(id => id !== skillId)
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-lg font-semibold mb-2">Step 6 of 7</h2>
        <p className="text-sm text-gray-600">
          Select the skills you applied or developed
        </p>
      </div>

      {/* Selected Skills */}
      {selectedSkills.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-900">
            Selected Skills ({selectedSkills.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {selectedSkills.map(skill => (
              <SelectedSkillTag
                key={skill.id}
                skill={skill}
                onRemove={removeSkill}
              />
            ))}
          </div>
        </div>
      )}

      {validationErrors.selectedSkillIds && (
        <p className="text-red-600 text-sm">{validationErrors.selectedSkillIds}</p>
      )}

      {/* Skill Search */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-900">Find Skills</h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search for skills..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Available Skills */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">
            Available Skills
            {filteredSkills.length > 0 && (
              <span className="ml-1 text-gray-500">({filteredSkills.length})</span>
            )}
          </h3>
          {filteredSkills.length > 20 && !showAllSkills && (
            <button
              type="button"
              onClick={() => setShowAllSkills(true)}
              className="text-sm text-primary-600 hover:text-primary-800 transition-colors"
            >
              Show all skills
            </button>
          )}
        </div>

        {filteredSkills.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchQuery.trim() ? (
              <div className="space-y-2">
                <p>No skills found matching "{searchQuery}"</p>
                <p className="text-sm">Try adjusting your search terms</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p>No skills available</p>
                <p className="text-sm">Skills will appear based on your selected focus area and work types</p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {displayedSkills.map(skill => (
              <SkillItem
                key={skill.id}
                skill={skill}
                isSelected={formData.selectedSkillIds.includes(skill.id)}
                onToggle={handleSkillToggle}
              />
            ))}
          </div>
        )}

        {filteredSkills.length > 20 && showAllSkills && (
          <div className="text-center pt-4">
            <button
              type="button"
              onClick={() => setShowAllSkills(false)}
              className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Show fewer skills
            </button>
          </div>
        )}
      </div>

      {/* Skills Guidelines */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">
          Skill Selection Tips
        </h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Select 3-8 skills that are most relevant to your entry</li>
          <li>• Include both technical and soft skills when applicable</li>
          <li>• Choose skills you actually used or developed, not just ones you know</li>
          <li>• Skills help others discover your expertise and experiences</li>
        </ul>
      </div>

      {/* Skill Categories */}
      {formData.selectedWorkTypeIds.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-2">
            Skills Based on Your Work Types
          </h3>
          <p className="text-sm text-gray-600">
            The skills shown are filtered based on your selected work types. If you don't see a skill you need,
            try adjusting your work type selections in Step 1 or use the search function.
          </p>
        </div>
      )}
    </div>
  );
};