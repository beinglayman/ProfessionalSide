import React from 'react';
import { Trophy, BookOpen, Zap, MessageSquare } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Step2Props } from '../types/newEntryTypes';

interface EntryTypeOption {
  value: 'achievement' | 'learning' | 'challenge' | 'reflection';
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
}

const entryTypeOptions: EntryTypeOption[] = [
  {
    value: 'achievement',
    label: 'Achievement',
    description: 'Celebrate a milestone, completion, or recognition you\'ve earned',
    icon: Trophy,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-300'
  },
  {
    value: 'learning',
    label: 'Learning',
    description: 'Document new skills, knowledge, or insights you\'ve gained',
    icon: BookOpen,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300'
  },
  {
    value: 'challenge',
    label: 'Challenge',
    description: 'Record obstacles you\'ve overcome or problems you\'ve solved',
    icon: Zap,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-300'
  },
  {
    value: 'reflection',
    label: 'Reflection',
    description: 'Share thoughts, insights, or retrospective analysis',
    icon: MessageSquare,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-300'
  }
];

interface EntryTypeCardProps {
  option: EntryTypeOption;
  isSelected: boolean;
  onSelect: (entryType: EntryTypeOption['value']) => void;
}

const EntryTypeCard: React.FC<EntryTypeCardProps> = ({ option, isSelected, onSelect }) => {
  const IconComponent = option.icon;

  return (
    <label
      className={cn(
        "flex items-start space-x-4 rounded-lg border-2 p-4 cursor-pointer transition-all duration-200",
        isSelected
          ? `${option.bgColor} ${option.borderColor} shadow-md`
          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
      )}
    >
      <input
        type="radio"
        name="entryType"
        value={option.value}
        checked={isSelected}
        onChange={() => onSelect(option.value)}
        className="sr-only"
      />

      <div className={cn(
        "flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center",
        isSelected ? option.bgColor : "bg-gray-100"
      )}>
        <IconComponent className={cn(
          "w-6 h-6",
          isSelected ? option.color : "text-gray-500"
        )} />
      </div>

      <div className="flex-1 min-w-0">
        <div className={cn(
          "font-semibold text-lg",
          isSelected ? option.color : "text-gray-900"
        )}>
          {option.label}
        </div>
        <p className="text-sm text-gray-600 mt-1 leading-relaxed">
          {option.description}
        </p>
      </div>

      {isSelected && (
        <div className="flex-shrink-0">
          <div className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center",
            option.color.replace('text-', 'bg-').replace('-600', '-100'),
            option.color
          )}>
            <div className="w-3 h-3 bg-current rounded-full"></div>
          </div>
        </div>
      )}
    </label>
  );
};

export const Step2EntryType: React.FC<Step2Props> = ({
  formData,
  setFormData,
  validationErrors
}) => {
  const handleEntryTypeSelect = (entryType: EntryTypeOption['value']) => {
    setFormData({
      ...formData,
      entryType,
      // Reset achievement fields when switching away from achievement
      achievementType: entryType === 'achievement' ? formData.achievementType : '',
      achievementTitle: entryType === 'achievement' ? formData.achievementTitle : '',
      achievementDescription: entryType === 'achievement' ? formData.achievementDescription : ''
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-lg font-semibold mb-2">Step 2 of 7</h2>
        <p className="text-sm text-gray-600">Choose the type of entry you want to create</p>
      </div>

      <div className="space-y-4">
        {entryTypeOptions.map(option => (
          <EntryTypeCard
            key={option.value}
            option={option}
            isSelected={formData.entryType === option.value}
            onSelect={handleEntryTypeSelect}
          />
        ))}
      </div>

      {validationErrors.entryType && (
        <p className="text-red-600 text-sm text-center">{validationErrors.entryType}</p>
      )}

      {formData.entryType && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-900 mb-2">
            Creating an {formData.entryType} entry
          </h3>
          <p className="text-sm text-gray-600">
            {formData.entryType === 'achievement' &&
              "You'll be able to add achievement details like awards, certifications, or milestones in the next steps."
            }
            {formData.entryType === 'learning' &&
              "You'll document what you learned, how you learned it, and how you plan to apply this knowledge."
            }
            {formData.entryType === 'challenge' &&
              "You'll describe the challenge you faced, how you approached it, and what you learned from overcoming it."
            }
            {formData.entryType === 'reflection' &&
              "You'll share your thoughts, insights, and analysis about your professional experiences."
            }
          </p>
        </div>
      )}
    </div>
  );
};