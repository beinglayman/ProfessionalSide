import React from 'react';
import { ChevronRight, User, BookOpen, Award, Target, GraduationCap, Clock, TrendingUp, ChevronDown, Plus, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Category {
  name: string;
  icon: React.ElementType;
  progress: number;
  total: number;
  completed: number;
}

interface ProfileCompletenessProps {
  overallProgress: number;
  categories: Category[];
  recommendations: string[];
  timeToComplete: string;
  impactStats: string;
}

export function ProfileCompleteness({
  overallProgress,
  categories = [
    { name: 'Basic Info', icon: User, progress: 100, total: 5, completed: 5 },
    { name: 'Education', icon: GraduationCap, progress: 75, total: 4, completed: 3 },
    { name: 'Skills', icon: Target, progress: 50, total: 10, completed: 5 },
    { name: 'Experience', icon: BookOpen, progress: 33, total: 3, completed: 1 }
  ],
  recommendations = ['Add your work experience', 'Upload a profile picture', 'Add more skills'],
  timeToComplete = '~5 minutes to 90%',
  impactStats = 'Profiles with 90%+ completion get 40% more views',
}: ProfileCompletenessProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const getProgressColor = (progress: number) => {
    if (progress <= 25) return 'text-red-500 bg-red-500';
    if (progress <= 50) return 'text-orange-500 bg-orange-500';
    if (progress <= 75) return 'text-yellow-500 bg-yellow-500';
    return 'text-green-500 bg-green-500';
  };

  const getTextColor = (progress: number) => {
    if (progress <= 25) return 'text-red-500';
    if (progress <= 50) return 'text-orange-500';
    if (progress <= 75) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getBackgroundColor = (progress: number) => {
    if (progress <= 25) return 'bg-red-50';
    if (progress <= 50) return 'bg-orange-50';
    if (progress <= 75) return 'bg-yellow-50';
    return 'bg-green-50';
  };

  // Prioritize recommendations
  const sortedRecommendations = [...recommendations].sort((a, b) => {
    // Put quick wins first
    if (a.includes('skills') && !b.includes('skills')) return -1;
    if (!a.includes('skills') && b.includes('skills')) return 1;
    return 0;
  });

  return (
    
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
      
      <div className="flex items-start justify-between">
        <div>
      
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <User className="mr-2 h-5 w-5 text-primary-500" />
            Profile Completeness
          </h2>
          <p className="text-sm text-gray-500">Complete your profile to maximize opportunities</p>
        </div>

        
      </div>

      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Circular Progress */}
        <div className="flex flex-col items-center justify-center">
          <CircularProgress 
            progress={overallProgress} 
            getProgressColor={getProgressColor} 
          />
          
          
        </div>

        {/* Categories and Recommendations */}
        <div className="flex flex-col justify-between">
          {/* Top Categories */}
          <div>
            
            <div className="space-y-3 mt-4">
              {categories.slice(0, 3).map((category, index) => (
                <div key={index} className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className={cn(
                      "p-1.5 rounded-md mr-2",
                      getBackgroundColor(category.progress)
                    )}>
                      <category.icon className={cn("h-4 w-4", getTextColor(category.progress))} />
                    </div>
                    <div>
                      <div className="text-sm font-medium">{category.name}</div>
                      <div className="text-xs text-gray-500">{category.completed} of {category.total} completed</div>
                    </div>
                  </div>
                  <div className="w-16">
                    <div className="h-1.5 w-full bg-gray-100 rounded-full">
                      <div 
                        className={cn("h-full rounded-full transition-all duration-500", getProgressColor(category.progress))}
                        style={{ width: `${category.progress}%` }} 
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            
          </div>
          
          {/* Quick Actions */}
          
        </div>
      </div>
      
      {/* Expanded Categories */}
      {isExpanded && (
        <div className="mt-6 border-t pt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">All Categories</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categories.map((category, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className={cn(
                    "p-1.5 rounded-md mr-2",
                    getBackgroundColor(category.progress)
                  )}>
                    <category.icon className={cn("h-4 w-4", getTextColor(category.progress))} />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{category.name}</div>
                    <div className="text-xs text-gray-500">{category.completed} of {category.total}</div>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-right">{category.progress}%</div>
                  <div className="h-1.5 w-16 bg-gray-200 rounded-full mt-1">
                    <div 
                      className={cn("h-full rounded-full", getProgressColor(category.progress))}
                      style={{ width: `${category.progress}%` }} 
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      

      {/* Impact Stats as a badge */}
          <div className="mt-10 bg-blue-50 text-blue-700 px-3 py-2.5 rounded-full text-xs font-medium flex items-center">
            <TrendingUp className="mr-1 h-4 w-4" />
            {impactStats}
          </div>
      {/* Time Estimate */}
      <div className="mt-4 flex items-center justify-between rounded-lg bg-gray-50 p-4">
        
        <div className="flex items-center space-x-2">
          <Clock className="h-5 w-5 text-gray-500" />
          <span className="text-sm text-gray-700">{timeToComplete}</span>
        </div>
        <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-500 disabled:pointer-events-none disabled:opacity-50 bg-primary-500 text-white hover:bg-primary-600 h-8 px-3 py-2">
          <Plus className="mr-2 h-4 w-4" />
          Add Skills (+5%)
        </button>
      </div>
    </div>
  );
}

// Extracted CircularProgress into its own component for cleaner code
function CircularProgress({ progress, getProgressColor }) {
  // Make the circle responsive by using percentages and viewport units
  const progressCircleSize = "min(30vw, 160px)"; // Responsive size, capped at 160px
  const progressCircleStroke = 6; // Slightly thicker for better visibility
  const progressCircleRadius = 44; // Fixed radius for calculation simplicity
  const progressCircleCircumference = 2 * Math.PI * progressCircleRadius;
  const progressOffset = progressCircleCircumference - (progress / 100) * progressCircleCircumference;

  // Get background color based on progress
  const getBgColor = (progress) => {
    if (progress <= 25) return 'bg-red-50';
    if (progress <= 50) return 'bg-orange-50';
    if (progress <= 75) return 'bg-yellow-50';
    return 'bg-green-50';
  };

  return (
    <div className={cn(
      "relative flex items-center justify-center rounded-full p-3", 
      getBgColor(progress)
    )} style={{ width: progressCircleSize, height: progressCircleSize }}>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r={progressCircleRadius}
          strokeWidth={progressCircleStroke}
          className="fill-none stroke-gray-200"
        />
        {/* Progress circle with gradient */}
        <circle
          cx="50"
          cy="50"
          r={progressCircleRadius}
          strokeWidth={progressCircleStroke}
          className={cn(
            'fill-none stroke-current transition-all duration-500 ease-in-out',
            getProgressColor(progress)
          )}
          style={{
            strokeDasharray: progressCircleCircumference,
            strokeDashoffset: progressOffset,
            filter: "drop-shadow(0px 1px 2px rgba(0, 0, 0, 0.1))",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl md:text-4xl font-bold text-primary-500">{progress}%</span>
        <span className="text-xs text-gray-500 mt-1">completed</span>
      </div>
    </div>
  );
}