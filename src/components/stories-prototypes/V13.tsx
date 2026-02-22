'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import {
  mockStories,
  CATEGORY_META,
  FRAMEWORK_META,
  ARCHETYPE_META,
  SECTION_COLORS,
  getConfidenceLevel,
} from './mock-data';
import {
  GitBranch,
  KanbanSquare,
  Hash,
  FileText,
  Figma,
  Video,
  Check,
  ChevronRight,
  Clock,
  RotateCcw,
  Play,
  Eye,
  BookOpen,
  Target,
} from 'lucide-react';

function ToolIcon({ tool, className }: { tool: string; className?: string }) {
  const icons: Record<string, React.ReactNode> = {
    github: <GitBranch className={className} />,
    jira: <KanbanSquare className={className} />,
    confluence: <FileText className={className} />,
    slack: <Hash className={className} />,
    figma: <Figma className={className} />,
    'google-meet': <Video className={className} />,
  };
  return <>{icons[tool] || <FileText className={className} />}</>;
}

const BEHAVIORAL_QUESTIONS: Record<string, string> = {
  's1': 'Tell me about a time you led a major security initiative across platforms.',
  's2': 'Describe a situation where you significantly improved application performance.',
  's3': 'Tell me about a time you designed infrastructure to handle a critical scaling challenge.',
  's4': 'Give me an example of how you\'ve developed junior team members.',
  's5': 'Describe a time you invested in professional development that benefited your team.',
  's6': 'Tell me about a time you communicated a complex technical strategy to a broad audience.',
};

type Mode = 'browse' | 'practice';

export function StoriesV13() {
  const [mode, setMode] = useState<Mode>('browse');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [browseFlipped, setBrowseFlipped] = useState<Set<string>>(new Set());

  const currentStory = mockStories[currentIndex];

  // Timer effect for practice mode
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (mode === 'practice' && isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [mode, isTimerRunning]);

  // Reset timer when changing stories in practice mode
  useEffect(() => {
    if (mode === 'practice') {
      setTimerSeconds(0);
      setIsFlipped(false);
      setIsTimerRunning(true);
    }
  }, [currentIndex, mode]);

  // Start timer when entering practice mode
  useEffect(() => {
    if (mode === 'practice') {
      setIsTimerRunning(true);
      setIsFlipped(false);
    } else {
      setIsTimerRunning(false);
    }
  }, [mode]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleModeSwitch = (newMode: Mode) => {
    setMode(newMode);
    if (newMode === 'practice') {
      setCurrentIndex(0);
      setIsFlipped(false);
      setTimerSeconds(0);
      setIsTimerRunning(true);
    } else {
      setIsTimerRunning(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < mockStories.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else {
      setCurrentIndex(mockStories.length - 1);
    }
  };

  const handleRevealAnswer = () => {
    setIsFlipped(true);
    setIsTimerRunning(false);
  };

  const handleMarkCompleted = () => {
    setCompletedIds((prev) => new Set([...prev, currentStory.id]));
  };

  const handleBrowseFlip = (storyId: string) => {
    setBrowseFlipped((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(storyId)) {
        newSet.delete(storyId);
      } else {
        newSet.add(storyId);
      }
      return newSet;
    });
  };

  const handleRestart = () => {
    setCompletedIds(new Set());
    setCurrentIndex(0);
    setIsFlipped(false);
    setTimerSeconds(0);
    setIsTimerRunning(true);
  };

  const progressPercentage = (completedIds.size / mockStories.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
              <Target className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Interview Prep
            </h1>
          </div>
          <p className="text-slate-600 text-lg">
            Practice your behavioral interview stories with flashcard coaching
          </p>
        </div>

        {/* Mode Toggle */}
        <Card className="border-2">
          <CardContent className="p-4">
            <div className="flex gap-2">
              <button
                onClick={() => handleModeSwitch('browse')}
                className={cn(
                  'flex-1 py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2',
                  mode === 'browse'
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg scale-105'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                <BookOpen className="w-5 h-5" />
                Browse Mode
              </button>
              <button
                onClick={() => handleModeSwitch('practice')}
                className={cn(
                  'flex-1 py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2',
                  mode === 'practice'
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg scale-105'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                <Play className="w-5 h-5" />
                Practice Mode
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Practice Mode Progress */}
        {mode === 'practice' && (
          <Card className="border-2 border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-indigo-600" />
                  <span className="font-semibold text-slate-700">
                    Progress: {completedIds.size} / {mockStories.length} completed
                  </span>
                </div>
                <button
                  onClick={handleRestart}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition-colors text-sm font-medium"
                >
                  <RotateCcw className="w-4 h-4" />
                  Restart
                </button>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-500 rounded-full"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Browse Mode */}
        {mode === 'browse' && (
          <div className="space-y-4">
            {mockStories.map((story) => {
              const isFlippedBrowse = browseFlipped.has(story.id);
              const question = BEHAVIORAL_QUESTIONS[story.id] || 'Tell me about this experience.';
              const isCompleted = completedIds.has(story.id);

              return (
                <Card
                  key={story.id}
                  className={cn(
                    'border-2 transition-all duration-300 cursor-pointer hover:shadow-lg',
                    isCompleted ? 'border-green-300 bg-green-50/50' : 'border-slate-200 hover:border-indigo-300'
                  )}
                  onClick={() => handleBrowseFlip(story.id)}
                >
                  <CardContent className="p-6 space-y-4">
                    {/* Question Side */}
                    {!isFlippedBrowse && (
                      <div className="space-y-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="bg-indigo-100 text-indigo-700 border-indigo-300">
                                Question
                              </Badge>
                              {isCompleted && (
                                <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                                  <Check className="w-3 h-3 mr-1" />
                                  Practiced
                                </Badge>
                              )}
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 leading-relaxed">
                              {question}
                            </h3>
                          </div>
                          <div className="p-2 rounded-lg bg-indigo-100">
                            <Eye className="w-5 h-5 text-indigo-600" />
                          </div>
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                          <Badge variant="outline" className="bg-slate-100">
                            {FRAMEWORK_META[story.framework]?.label || story.framework}
                          </Badge>
                          <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300">
                            {ARCHETYPE_META[story.archetype]?.emoji} {ARCHETYPE_META[story.archetype]?.label}
                          </Badge>
                          <div className="flex items-center gap-1 text-sm text-slate-500">
                            {story.tools.slice(0, 3).map((tool) => (
                              <div key={tool} className="p-1">
                                <ToolIcon tool={tool} className="w-3.5 h-3.5" />
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-center pt-4 text-sm text-slate-500 border-t border-slate-200">
                          <ChevronRight className="w-4 h-4 mr-1" />
                          Click to reveal answer
                        </div>
                      </div>
                    )}

                    {/* Answer Side */}
                    {isFlippedBrowse && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                              Answer
                            </Badge>
                            <Badge
                              variant="outline"
                              className={cn(
                                getConfidenceLevel(story.overallConfidence).color,
                                'font-semibold'
                              )}
                            >
                              {story.overallConfidence}% confidence
                            </Badge>
                          </div>
                          <div className="text-sm text-slate-500">
                            {story.wordCount} words
                          </div>
                        </div>

                        <div className="space-y-3">
                          <h4 className="font-bold text-lg text-slate-800">{story.title}</h4>
                          {story.sections.map((section) => (
                            <div
                              key={section.key}
                              className={cn(
                                'border-l-4 pl-4 py-2 space-y-2',
                                SECTION_COLORS[section.key] || 'border-slate-300'
                              )}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-sm text-slate-700 uppercase tracking-wide">
                                  {section.label}
                                </span>
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      'text-xs',
                                      getConfidenceLevel(section.confidence).color
                                    )}
                                  >
                                    {section.confidence}%
                                  </Badge>
                                  <span className="text-xs text-slate-500">
                                    {section.sourceCount} {section.sourceCount === 1 ? 'source' : 'sources'}
                                  </span>
                                </div>
                              </div>
                              <p className="text-slate-700 leading-relaxed">{section.text}</p>
                            </div>
                          ))}
                        </div>

                        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200">
                          <Badge variant="outline" className="bg-slate-100">
                            {CATEGORY_META[story.category]?.emoji} {CATEGORY_META[story.category]?.label}
                          </Badge>
                          {story.tools.map((tool) => (
                            <Badge key={tool} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              <ToolIcon tool={tool} className="w-3 h-3 mr-1" />
                              {tool}
                            </Badge>
                          ))}
                        </div>

                        <div className="flex items-center justify-center pt-2 text-sm text-slate-500">
                          <ChevronRight className="w-4 h-4 mr-1 rotate-180" />
                          Click to hide answer
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Practice Mode */}
        {mode === 'practice' && (
          <div className="space-y-4">
            {/* Timer Card */}
            <Card className="border-2 border-indigo-300 bg-gradient-to-r from-indigo-100 to-purple-100">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-indigo-600" />
                    <span className="font-semibold text-slate-700">Time Elapsed:</span>
                    <span className="text-2xl font-bold text-indigo-600 font-mono">
                      {formatTime(timerSeconds)}
                    </span>
                  </div>
                  <div className="text-sm text-slate-600">
                    Card {currentIndex + 1} of {mockStories.length}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Question/Answer Card */}
            <Card
              className={cn(
                'border-2 transition-all duration-300',
                isFlipped
                  ? 'border-green-300 bg-gradient-to-br from-green-50 to-emerald-50 shadow-xl'
                  : 'border-indigo-300 bg-gradient-to-br from-indigo-50 to-purple-50 shadow-xl'
              )}
            >
              <CardContent className="p-8 min-h-[400px] flex flex-col">
                {/* Question Side */}
                {!isFlipped && (
                  <div className="flex-1 flex flex-col justify-center space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="bg-indigo-100 text-indigo-700 border-indigo-300 px-3 py-1">
                          Behavioral Question
                        </Badge>
                        {completedIds.has(currentStory.id) && (
                          <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                            <Check className="w-3 h-3 mr-1" />
                            Practiced
                          </Badge>
                        )}
                      </div>

                      <h2 className="text-3xl font-bold text-slate-800 leading-relaxed">
                        {BEHAVIORAL_QUESTIONS[currentStory.id] || 'Tell me about this experience.'}
                      </h2>

                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300">
                          {ARCHETYPE_META[currentStory.archetype]?.emoji} {ARCHETYPE_META[currentStory.archetype]?.label}
                        </Badge>
                        <Badge variant="outline" className="bg-slate-100">
                          {FRAMEWORK_META[currentStory.framework]?.label || currentStory.framework}
                        </Badge>
                      </div>
                    </div>

                    <div className="border-t border-indigo-200 pt-6 space-y-4">
                      <p className="text-slate-600 italic">
                        Take a moment to think through your answer using the {FRAMEWORK_META[currentStory.framework]?.label} framework.
                        When you're ready, reveal the suggested answer below.
                      </p>
                      <button
                        onClick={handleRevealAnswer}
                        className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center gap-2"
                      >
                        <Eye className="w-6 h-6" />
                        Reveal Answer
                      </button>
                    </div>
                  </div>
                )}

                {/* Answer Side */}
                {isFlipped && (
                  <div className="flex-1 flex flex-col space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 px-3 py-1">
                          Sample Answer
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn(
                            getConfidenceLevel(currentStory.overallConfidence).color,
                            'font-semibold'
                          )}
                        >
                          {currentStory.overallConfidence}% confidence
                        </Badge>
                      </div>

                      <h3 className="text-xl font-bold text-slate-800">{currentStory.title}</h3>

                      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                        {currentStory.sections.map((section) => (
                          <div
                            key={section.key}
                            className={cn(
                              'border-l-4 pl-4 py-2 space-y-1.5 bg-white/50 rounded-r-lg',
                              SECTION_COLORS[section.key] || 'border-slate-300'
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-xs text-slate-700 uppercase tracking-wide">
                                {section.label}
                              </span>
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'text-xs',
                                    getConfidenceLevel(section.confidence).color
                                  )}
                                >
                                  {section.confidence}%
                                </Badge>
                                <span className="text-xs text-slate-500">
                                  {section.sourceCount} {section.sourceCount === 1 ? 'src' : 'srcs'}
                                </span>
                              </div>
                            </div>
                            <p className="text-slate-700 text-sm leading-relaxed">{section.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-green-200 pt-4 space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="bg-slate-100 text-xs">
                          {CATEGORY_META[currentStory.category]?.emoji} {CATEGORY_META[currentStory.category]?.label}
                        </Badge>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                          {currentStory.wordCount} words
                        </Badge>
                        {currentStory.tools.slice(0, 3).map((tool) => (
                          <Badge key={tool} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                            <ToolIcon tool={tool} className="w-3 h-3 mr-1" />
                            {tool}
                          </Badge>
                        ))}
                      </div>

                      {!completedIds.has(currentStory.id) && (
                        <button
                          onClick={handleMarkCompleted}
                          className="w-full py-2 px-4 rounded-lg bg-green-500 text-white font-semibold hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                        >
                          <Check className="w-4 h-4" />
                          Mark as Practiced
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Navigation Controls */}
            <div className="flex gap-3">
              <button
                onClick={handlePrevious}
                className="flex-1 py-3 px-4 rounded-lg bg-white border-2 border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
              >
                <ChevronRight className="w-5 h-5 rotate-180" />
                Previous
              </button>
              <button
                onClick={handleNext}
                className="flex-1 py-3 px-4 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                Next
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Footer Stats */}
        <Card className="border-2 border-slate-200">
          <CardContent className="p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="space-y-1">
                <div className="text-2xl font-bold text-indigo-600">{mockStories.length}</div>
                <div className="text-xs text-slate-600 uppercase tracking-wide">Total Stories</div>
              </div>
              <div className="space-y-1 border-x border-slate-200">
                <div className="text-2xl font-bold text-green-600">{completedIds.size}</div>
                <div className="text-xs text-slate-600 uppercase tracking-wide">Practiced</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-purple-600">
                  {Math.round(progressPercentage)}%
                </div>
                <div className="text-xs text-slate-600 uppercase tracking-wide">Complete</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
