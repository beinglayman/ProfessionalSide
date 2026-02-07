import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Users, Building2, FileText, Zap, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { useSearch } from '../../hooks/useSearch';
import { SearchResult } from '../../types/search';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}


const categoryIcons = {
  people: Users,
  workspaces: Building2,
  content: FileText,
  skills: Zap
};

const categoryLabels = {
  people: 'People',
  workspaces: 'Workspaces',
  content: 'Content',
  skills: 'Skills'
};

const connectionColors = {
  core: 'text-blue-600 bg-blue-50',
  extended: 'text-purple-600 bg-purple-50',
  following: 'text-indigo-600 bg-indigo-50',
  none: 'text-gray-600 bg-gray-50'
};

const connectionLabels = {
  core: 'Core',
  extended: 'Extended',
  following: 'Following',
  none: 'Connect'
};

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Use the search hook
  const {
    results,
    isLoading,
    error,
    search,
    getSuggestions,
    suggestions,
    clear,
    recordInteraction
  } = useSearch({ autoSearch: true, debounceMs: 300 });

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Clear search when modal closes
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      clear();
    }
  }, [isOpen, clear]);

  // Perform search when query changes
  useEffect(() => {
    if (query.trim().length >= 2) {
      search({ query });
      getSuggestions(query);
    } else {
      clear();
    }
  }, [query, search, getSuggestions, clear]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, (results?.length || 0) - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (results?.[selectedIndex]) {
            handleResultClick(results[selectedIndex]);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, onClose]);

  // Global keyboard shortcut
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        // Toggle search modal
        if (isOpen) {
          onClose();
        } else {
          // This will be handled by the parent component
          window.dispatchEvent(new CustomEvent('openSearch'));
        }
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isOpen, onClose]);


  const handleResultClick = (result: SearchResult) => {
    // Record interaction for analytics
    recordInteraction(result.id, 'click');
    
    // Navigate based on result type
    let url = '';
    switch (result.type) {
      case 'people':
        url = `/profile/${result.id}`;
        break;
      case 'workspaces':
        url = `/teams/${result.id}`;
        break;
      case 'content':
        url = `/journal/${result.id}`;
        break;
      case 'skills':
        // For skills, we might want to search for that skill
        setQuery(result.title);
        return; // Don't close modal, let user see skill-related results
    }
    
    if (url) {
      window.location.href = url;
    }
    
    onClose();
  };

  const renderResultCard = (result: SearchResult, index: number) => {
    const Icon = categoryIcons[result.type];
    const isSelected = index === selectedIndex;

    return (
      <div
        key={result.id}
        className={cn(
          "p-3 rounded-lg cursor-pointer transition-all duration-150 border",
          isSelected 
            ? "bg-primary-50 border-primary-200" 
            : "bg-white border-transparent hover:bg-gray-50"
        )}
        onClick={() => handleResultClick(result)}
        onMouseEnter={() => setSelectedIndex(index)}
      >
        <div className="flex items-start gap-3">
          {/* Avatar or Icon */}
          <div className="flex-shrink-0">
            {result.type === 'people' && 'avatar' in result && result.avatar ? (
              <img
                src={result.avatar}
                alt={result.title}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <Icon className="w-5 h-5 text-gray-600" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-medium text-gray-900 truncate">{result.title}</p>
              {result.type === 'people' && 'connectionStatus' in result && result.connectionStatus && (
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-xs font-medium",
                  connectionColors[result.connectionStatus]
                )}>
                  {connectionLabels[result.connectionStatus]}
                </span>
              )}
            </div>
            
            <p className="text-sm text-gray-600 truncate">{result.subtitle}</p>
            
            {/* Additional Info */}
            <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
              {result.type === 'people' && 'mutualConnections' in result && (
                <span>{result.mutualConnections} mutual connections</span>
              )}
              {result.type === 'workspaces' && 'memberCount' in result && (
                <span>{result.memberCount} members</span>
              )}
              {result.type === 'content' && 'author' in result && (
                <span>by {result.author.name}</span>
              )}
              {result.type === 'skills' && 'endorsements' in result && (
                <span>{result.endorsements} endorsements</span>
              )}
            </div>

            {/* Related Skills or Tags */}
            {result.type === 'skills' && 'relatedSkills' in result && result.relatedSkills && (
              <div className="flex flex-wrap gap-1 mt-2">
                {result.relatedSkills.slice(0, 3).map(skill => (
                  <span key={skill} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                    {skill}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Arrow */}
          <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
        </div>
      </div>
    );
  };

  const groupedResults = (results || []).reduce((acc, result) => {
    if (!acc[result.type]) acc[result.type] = [];
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-xl border max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search people, workspaces, content, and skills..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 text-lg font-medium placeholder-gray-400 border-none outline-none bg-transparent"
          />
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 text-xs font-medium text-gray-500 bg-gray-100 rounded border">
              ⌘K
            </kbd>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-1 h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Results */}
        <div ref={resultsRef} className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-500">Searching...</span>
            </div>
          ) : query && (results?.length || 0) === 0 ? (
            <div className="text-center py-8">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No results found</p>
              <p className="text-gray-400 text-sm">Try adjusting your search terms</p>
            </div>
          ) : query ? (
            <div className="space-y-6">
              {Object.entries(groupedResults).map(([type, typeResults]) => (
                <div key={type}>
                  <div className="flex items-center gap-2 mb-3">
                    {React.createElement(categoryIcons[type as keyof typeof categoryIcons], {
                      className: "w-4 h-4 text-gray-600"
                    })}
                    <h3 className="font-medium text-gray-900">
                      {categoryLabels[type as keyof typeof categoryLabels]} ({typeResults.length})
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {typeResults.map((result, index) => {
                      const globalIndex = results?.findIndex(r => r.id === result.id) ?? -1;
                      return renderResultCard(result, globalIndex);
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">Start typing to search</p>
              <p className="text-gray-400 text-sm">Find people, workspaces, content, and skills across your network</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {query && (results?.length || 0) > 0 && (
          <div className="border-t p-3 bg-gray-50">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Use ↑↓ to navigate, ↵ to select, esc to close</span>
              <span>{results?.length || 0} results</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}