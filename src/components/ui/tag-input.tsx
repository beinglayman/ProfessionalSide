import React, { useState, useRef, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useSearch } from '../../hooks/useSearch';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  disabled?: boolean;
  className?: string;
}

export function TagInput({
  value = [],
  onChange,
  placeholder = "Add tags...",
  maxTags = 10,
  disabled = false,
  className
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Use search hook for tag suggestions
  const { getSuggestions, suggestions, clearSuggestions } = useSearch();

  // Get suggestions when input changes
  useEffect(() => {
    if (inputValue.trim().length >= 2) {
      getSuggestions(inputValue.trim());
      setIsOpen(true);
    } else {
      clearSuggestions();
      setIsOpen(false);
    }
  }, [inputValue, getSuggestions, clearSuggestions]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    const safeValue = Array.isArray(value) ? value : [];
    if (
      trimmedTag &&
      !safeValue.includes(trimmedTag) &&
      safeValue.length < maxTags
    ) {
      onChange([...safeValue, trimmedTag]);
      setInputValue('');
      setIsOpen(false);
      clearSuggestions();
    }
  };

  const removeTag = (tagToRemove: string) => {
    const safeValue = Array.isArray(value) ? value : [];
    onChange(safeValue.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputValue.trim()) {
        addTag(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && Array.isArray(value) && value.length > 0) {
      removeTag(value[value.length - 1]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setInputValue('');
    }
  };

  // Filter suggestions to exclude already added tags
  const safeSuggestions = Array.isArray(suggestions) ? suggestions : [];
  const safeValue = Array.isArray(value) ? value : [];
  const filteredSuggestions = safeSuggestions.filter(
    suggestion => !safeValue.includes(suggestion)
  );

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className={cn(
        "min-h-[40px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm",
        "focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2",
        disabled && "cursor-not-allowed bg-gray-50 text-gray-500",
        "flex flex-wrap gap-1 items-center"
      )}>
        {/* Existing tags */}
        {(Array.isArray(value) ? value : []).map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800"
          >
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="flex-shrink-0 ml-1 h-4 w-4 rounded-full inline-flex items-center justify-center text-blue-400 hover:bg-blue-200 hover:text-blue-600 focus:outline-none focus:bg-blue-200 focus:text-blue-600"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}

        {/* Input field */}
        {!disabled && (Array.isArray(value) ? value.length : 0) < maxTags && (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (inputValue.length >= 2) {
                setIsOpen(true);
              }
            }}
            placeholder={(Array.isArray(value) ? value.length : 0) === 0 ? placeholder : ""}
            className="flex-1 min-w-[100px] border-none outline-none bg-transparent placeholder-gray-400"
            disabled={disabled}
          />
        )}

        {(Array.isArray(value) ? value.length : 0) >= maxTags && (
          <span className="text-xs text-gray-500">
            Max {maxTags} tags
          </span>
        )}
      </div>

      {/* Suggestions dropdown */}
      {isOpen && filteredSuggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-200 bg-white py-1 shadow-lg">
          {filteredSuggestions.slice(0, 8).map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => addTag(suggestion)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
            >
              <Plus className="h-3 w-3 text-gray-400" />
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}