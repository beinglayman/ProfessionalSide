import React from 'react';
import { Editor } from '../../journal/editor';
import { Step3Props } from '../types/newEntryTypes';
import { validateTitle, validateContent, validateAbstractContent } from '../utils/formValidation';
import { MCPIntegrationButton, MCPPrivacyNotice } from '../../mcp';

export const Step3Content: React.FC<Step3Props> = ({
  formData,
  setFormData,
  validationErrors,
  setValidationErrors
}) => {
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    setFormData({ ...formData, title });

    // Clear validation error when user starts typing
    if (validationErrors.title) {
      const titleError = validateTitle(title);
      setValidationErrors({
        ...validationErrors,
        title: titleError || undefined
      });
    }
  };

  const handleContentChange = (content: string) => {
    setFormData({ ...formData, content });

    // Clear validation error when user starts typing
    if (validationErrors.content) {
      const contentError = validateContent(content);
      setValidationErrors({
        ...validationErrors,
        content: contentError || undefined
      });
    }
  };

  const handleAbstractChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const abstractContent = e.target.value;
    setFormData({ ...formData, abstractContent });

    // Clear validation error when user starts typing
    if (validationErrors.abstractContent) {
      const abstractError = validateAbstractContent(abstractContent);
      setValidationErrors({
        ...validationErrors,
        abstractContent: abstractError || undefined
      });
    }
  };

  // Handle MCP data import
  const handleMCPDataImport = (data: {
    content?: string;
    artifacts?: any[];
    skills?: string[];
    collaborators?: string[];
  }) => {
    // Append imported content to existing content
    if (data.content) {
      const newContent = formData.content
        ? `${formData.content}\n\n--- Imported from External Tools ---\n${data.content}`
        : data.content;
      setFormData({ ...formData, content: newContent });
    }

    // Store artifacts and skills for later steps
    if (data.artifacts || data.skills) {
      setFormData({
        ...formData,
        content: formData.content || data.content || '',
        // These will be used in subsequent steps
        importedArtifacts: data.artifacts,
        importedSkills: data.skills
      });
    }
  };

  const getContentPlaceholder = () => {
    switch (formData.entryType) {
      case 'achievement':
        return 'Describe your achievement in detail. What did you accomplish? How did you achieve it? What impact did it have?';
      case 'learning':
        return 'Share what you learned. What new knowledge or skills did you gain? How will you apply this learning?';
      case 'challenge':
        return 'Describe the challenge you faced. What obstacles did you encounter? How did you overcome them? What did you learn?';
      case 'reflection':
        return 'Share your thoughts and insights. What are you reflecting on? What conclusions have you drawn?';
      default:
        return 'Write about your professional experience...';
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-lg font-semibold mb-2">Step 3 of 7</h2>
        <p className="text-sm text-gray-600">
          Create your {formData.entryType ? formData.entryType.toLowerCase() : 'entry'} content
        </p>
      </div>

      {/* MCP Integration Section */}
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-medium text-gray-900">Import from External Tools</h3>
            <p className="text-xs text-gray-600 mt-1">
              Fetch your recent work activity from connected tools
            </p>
          </div>
          <MCPIntegrationButton
            onDataImport={handleMCPDataImport}
            variant="compact"
          />
        </div>
        <MCPPrivacyNotice variant="compact" />
      </div>

      {/* Title Input */}
      <div className="space-y-2">
        <label htmlFor="title" className="block text-sm font-medium text-gray-900">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="title"
          value={formData.title}
          onChange={handleTitleChange}
          placeholder={`Enter a title for your ${formData.entryType || 'entry'}...`}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          maxLength={200}
        />
        <div className="flex justify-between items-center">
          {validationErrors.title && (
            <p className="text-red-600 text-sm">{validationErrors.title}</p>
          )}
          <p className="text-xs text-gray-500 ml-auto">
            {formData.title.length}/200 characters
          </p>
        </div>
      </div>

      {/* Main Content Editor */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-900">
          Content <span className="text-red-500">*</span>
        </label>
        <div className="border border-gray-300 rounded-md">
          <Editor
            content={formData.content}
            onChange={handleContentChange}
            placeholder={getContentPlaceholder()}
            className="min-h-[200px]"
          />
        </div>
        {validationErrors.content && (
          <p className="text-red-600 text-sm">{validationErrors.content}</p>
        )}
      </div>

      {/* Abstract Content (Optional) */}
      <div className="space-y-2">
        <label htmlFor="abstract" className="block text-sm font-medium text-gray-900">
          Abstract/Summary
          <span className="text-gray-500 font-normal ml-1">(Optional)</span>
        </label>
        <textarea
          id="abstract"
          value={formData.abstractContent}
          onChange={handleAbstractChange}
          placeholder="Provide a brief summary or abstract of your entry. This is useful for network visibility and quick previews."
          rows={4}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          maxLength={1000}
        />
        <div className="flex justify-between items-center">
          {validationErrors.abstractContent && (
            <p className="text-red-600 text-sm">{validationErrors.abstractContent}</p>
          )}
          <p className="text-xs text-gray-500 ml-auto">
            {formData.abstractContent.length}/1,000 characters
          </p>
        </div>
      </div>

      {/* Content Guidelines */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">
          Content Guidelines
        </h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Be specific and detailed in your descriptions</li>
          <li>• Include measurable outcomes when possible</li>
          <li>• Use clear, professional language</li>
          <li>• Focus on your role and contributions</li>
          {formData.entryType === 'achievement' && (
            <li>• Highlight the impact and significance of your achievement</li>
          )}
          {formData.entryType === 'learning' && (
            <li>• Explain how this learning will benefit your future work</li>
          )}
          {formData.entryType === 'challenge' && (
            <li>• Detail your problem-solving approach and methodology</li>
          )}
          {formData.entryType === 'reflection' && (
            <li>• Share actionable insights and lessons learned</li>
          )}
        </ul>
      </div>
    </div>
  );
};