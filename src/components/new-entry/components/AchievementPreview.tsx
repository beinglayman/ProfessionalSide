import React from 'react';
import { Trophy, Award, Star, Badge } from 'lucide-react';
import { AchievementPreviewProps } from '../types/newEntryTypes';
import { getAchievementTypeDisplayName } from '../utils/formUtils';

export const AchievementPreview: React.FC<AchievementPreviewProps> = ({
  achievementType,
  achievementTitle,
  achievementDescription
}) => {
  const getAchievementIcon = () => {
    switch (achievementType) {
      case 'certification':
        return <Award className="w-5 h-5 text-blue-600" />;
      case 'award':
        return <Trophy className="w-5 h-5 text-yellow-600" />;
      case 'milestone':
        return <Star className="w-5 h-5 text-purple-600" />;
      case 'recognition':
        return <Badge className="w-5 h-5 text-green-600" />;
      default:
        return <Trophy className="w-5 h-5 text-gray-600" />;
    }
  };

  const getAchievementColor = () => {
    switch (achievementType) {
      case 'certification':
        return 'bg-blue-50 border-blue-200';
      case 'award':
        return 'bg-yellow-50 border-yellow-200';
      case 'milestone':
        return 'bg-purple-50 border-purple-200';
      case 'recognition':
        return 'bg-green-50 border-green-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  if (!achievementType || !achievementTitle) {
    return null;
  }

  return (
    <div className={`border rounded-lg p-4 ${getAchievementColor()}`}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          {getAchievementIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
              Achievement
            </span>
            <span className="text-xs text-gray-500">
              {getAchievementTypeDisplayName(achievementType)}
            </span>
          </div>
          <h4 className="text-sm font-semibold text-gray-900 mb-1">
            {achievementTitle}
          </h4>
          {achievementDescription && (
            <p className="text-sm text-gray-700">
              {achievementDescription}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};