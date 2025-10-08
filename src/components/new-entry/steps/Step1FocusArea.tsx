import React from 'react';
import { cn } from '../../../lib/utils';
import { Step1Props } from '../types/newEntryTypes';

interface FocusAreaItemProps {
  focusArea: Step1Props['focusAreas'][0];
  isSelected: boolean;
  onSelect: (focusAreaId: number) => void;
}

const FocusAreaItem: React.FC<FocusAreaItemProps> = ({ focusArea, isSelected, onSelect }) => (
  <label
    className={cn(
      "flex items-start space-x-3 rounded-lg border p-4 cursor-pointer transition-colors",
      isSelected
        ? "bg-primary-50 border-primary-300"
        : "border-gray-300 hover:bg-gray-50"
    )}
  >
    <input
      type="radio"
      name="focusArea"
      value={focusArea.id}
      checked={isSelected}
      onChange={() => onSelect(focusArea.id)}
      className="mt-1"
    />
    <div>
      <div className="font-medium text-gray-900">{focusArea.name}</div>
      <div className="text-sm text-gray-600">{focusArea.description}</div>
    </div>
  </label>
);

interface CategorySectionProps {
  categories: Step1Props['focusAreas'][0]['categories'];
  selectedCategoryIds: number[];
  onCategoryToggle: (categoryId: number) => void;
}

const CategorySection: React.FC<CategorySectionProps> = ({
  categories,
  selectedCategoryIds,
  onCategoryToggle
}) => (
  <div className="mt-6">
    <h3 className="text-sm font-medium text-gray-900 mb-3">Select Categories</h3>
    <div className="space-y-2">
      {categories.map(category => (
        <label
          key={category.id}
          className={cn(
            "flex items-start space-x-3 rounded-lg border p-3 cursor-pointer transition-colors",
            selectedCategoryIds.includes(category.id)
              ? "bg-blue-50 border-blue-300"
              : "border-gray-200 hover:bg-gray-50"
          )}
        >
          <input
            type="checkbox"
            checked={selectedCategoryIds.includes(category.id)}
            onChange={() => onCategoryToggle(category.id)}
            className="mt-1"
          />
          <div>
            <div className="font-medium text-gray-800">{category.name}</div>
            <div className="text-xs text-gray-600">{category.description}</div>
          </div>
        </label>
      ))}
    </div>
  </div>
);

interface WorkTypeSectionProps {
  workTypes: Step1Props['focusAreas'][0]['categories'][0]['workTypes'];
  selectedWorkTypeIds: number[];
  onWorkTypeToggle: (workTypeId: number) => void;
}

const WorkTypeSection: React.FC<WorkTypeSectionProps> = ({
  workTypes,
  selectedWorkTypeIds,
  onWorkTypeToggle
}) => (
  <div className="mt-6">
    <h3 className="text-sm font-medium text-gray-900 mb-3">Select Work Types</h3>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {workTypes.map(workType => (
        <label
          key={workType.id}
          className={cn(
            "flex items-start space-x-3 rounded-lg border p-3 cursor-pointer transition-colors",
            selectedWorkTypeIds.includes(workType.id)
              ? "bg-green-50 border-green-300"
              : "border-gray-200 hover:bg-gray-50"
          )}
        >
          <input
            type="checkbox"
            checked={selectedWorkTypeIds.includes(workType.id)}
            onChange={() => onWorkTypeToggle(workType.id)}
            className="mt-1"
          />
          <div>
            <div className="font-medium text-gray-800">{workType.name}</div>
            <div className="text-xs text-gray-600">{workType.description}</div>
          </div>
        </label>
      ))}
    </div>
  </div>
);

export const Step1FocusArea: React.FC<Step1Props> = ({
  formData,
  setFormData,
  validationErrors,
  focusAreas
}) => {
  const selectedFocusArea = focusAreas.find(fa => fa.id === formData.focusAreaId);
  const availableCategories = selectedFocusArea?.categories || [];
  const availableWorkTypes = availableCategories
    .filter(cat => formData.selectedCategoryIds.includes(cat.id))
    .flatMap(cat => cat.workTypes);

  const handleFocusAreaSelect = (focusAreaId: number) => {
    setFormData({
      ...formData,
      focusAreaId,
      selectedCategoryIds: [],
      selectedWorkTypeIds: [],
      selectedSkillIds: []
    });
  };

  const handleCategoryToggle = (categoryId: number) => {
    const newSelectedCategoryIds = formData.selectedCategoryIds.includes(categoryId)
      ? formData.selectedCategoryIds.filter(id => id !== categoryId)
      : [...formData.selectedCategoryIds, categoryId];

    // Remove work types that belong to unselected categories
    const validWorkTypeIds = formData.selectedWorkTypeIds.filter(wtId => {
      const workType = availableCategories
        .find(cat => newSelectedCategoryIds.includes(cat.id))
        ?.workTypes.find(wt => wt.id === wtId);
      return !!workType;
    });

    setFormData({
      ...formData,
      selectedCategoryIds: newSelectedCategoryIds,
      selectedWorkTypeIds: validWorkTypeIds,
      selectedSkillIds: [] // Reset skills when categories change
    });
  };

  const handleWorkTypeToggle = (workTypeId: number) => {
    const newSelectedWorkTypeIds = formData.selectedWorkTypeIds.includes(workTypeId)
      ? formData.selectedWorkTypeIds.filter(id => id !== workTypeId)
      : [...formData.selectedWorkTypeIds, workTypeId];

    setFormData({
      ...formData,
      selectedWorkTypeIds: newSelectedWorkTypeIds,
      selectedSkillIds: [] // Reset skills when work types change
    });
  };

  if (focusAreas.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-lg font-semibold mb-2">Step 1 of 7</h2>
          <p className="text-sm text-gray-600">Select Your Focus Area</p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-yellow-800">
            <h3 className="text-sm font-medium">No focus areas available</h3>
            <p className="text-sm mt-1">
              Reference data needs to be seeded in the database. Please ensure the reference tables
              (focus_areas, work_categories, work_types, skills) are populated with data.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-lg font-semibold mb-2">Step 1 of 7</h2>
        <p className="text-sm text-gray-600">Select Your Focus Area</p>
      </div>

      {/* Focus Area Selection */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-900">Choose your primary focus area</h3>
        {focusAreas.map(focusArea => (
          <FocusAreaItem
            key={focusArea.id}
            focusArea={focusArea}
            isSelected={formData.focusAreaId === focusArea.id}
            onSelect={handleFocusAreaSelect}
          />
        ))}
        {validationErrors.focusAreaId && (
          <p className="text-red-600 text-sm">{validationErrors.focusAreaId}</p>
        )}
      </div>

      {/* Category Selection */}
      {selectedFocusArea && (
        <CategorySection
          categories={availableCategories}
          selectedCategoryIds={formData.selectedCategoryIds}
          onCategoryToggle={handleCategoryToggle}
        />
      )}
      {validationErrors.selectedCategoryIds && (
        <p className="text-red-600 text-sm">{validationErrors.selectedCategoryIds}</p>
      )}

      {/* Work Type Selection */}
      {availableWorkTypes.length > 0 && (
        <WorkTypeSection
          workTypes={availableWorkTypes}
          selectedWorkTypeIds={formData.selectedWorkTypeIds}
          onWorkTypeToggle={handleWorkTypeToggle}
        />
      )}
      {validationErrors.selectedWorkTypeIds && (
        <p className="text-red-600 text-sm">{validationErrors.selectedWorkTypeIds}</p>
      )}
    </div>
  );
};