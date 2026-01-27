import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus, Target, Award } from 'lucide-react';
import { Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js';
import { Radar } from 'react-chartjs-2';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

interface Skill {
  name: string;
  value: number;
  category: 'Technical' | 'Soft' | 'Leadership' | string;
}

interface SkillPeriod {
  label: string;
  skills: Skill[];
}

interface SkillTrend {
  skill: string;
  trend: 'up' | 'down' | 'stable';
  change: number;
  period: string;
}

interface SkillsGrowthProps {
  periods: SkillPeriod[];
  benchmarks: Record<string, number>;
  trends?: SkillTrend[];
}

const CATEGORIES = ['Technical', 'Soft', 'Leadership'] as const;
type Category = typeof CATEGORIES[number];

const CATEGORY_COLORS: Record<Category, { bg: string; text: string; border: string }> = {
  Technical: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-500' },
  Soft: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-500' },
  Leadership: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-500' },
};

export function SkillsGrowth({ periods, benchmarks, trends = [] }: SkillsGrowthProps) {
  const [currentPeriodIndex, setCurrentPeriodIndex] = useState(0);
  const [selectedCategories, setSelectedCategories] = useState<Set<Category>>(
    new Set(CATEGORIES)
  );

  const handlePrevious = () => {
    setCurrentPeriodIndex((prev) => (prev > 0 ? prev - 1 : prev));
  };

  const handleNext = () => {
    setCurrentPeriodIndex((prev) => (prev < periods.length - 1 ? prev + 1 : prev));
  };

  const toggleCategory = (category: Category) => {
    setSelectedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        // Don't allow deselecting all categories
        if (newSet.size > 1) {
          newSet.delete(category);
        }
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const currentPeriod = periods[currentPeriodIndex];
  const previousPeriod = currentPeriodIndex < periods.length - 1 ? periods[currentPeriodIndex + 1] : null;

  // Filter skills by selected categories
  const filteredCurrentSkills = useMemo(() => {
    if (!currentPeriod) return [];
    return currentPeriod.skills.filter(
      skill => selectedCategories.has(skill.category as Category)
    );
  }, [currentPeriod, selectedCategories]);

  const filteredPreviousSkills = useMemo(() => {
    if (!previousPeriod) return null;
    return previousPeriod.skills.filter(
      skill => selectedCategories.has(skill.category as Category)
    );
  }, [previousPeriod, selectedCategories]);

  const skillNames = useMemo(() => {
    return filteredCurrentSkills.map(s => s.name);
  }, [filteredCurrentSkills]);

  // Calculate skill gaps (skills below benchmark)
  const skillGaps = useMemo(() => {
    if (!currentPeriod) return { below: [], above: [] };

    const below: { name: string; value: number; benchmark: number; gap: number }[] = [];
    const above: { name: string; value: number; benchmark: number; gap: number }[] = [];

    filteredCurrentSkills.forEach(skill => {
      const benchmark = benchmarks[skill.name] || 65;
      const gap = skill.value - benchmark;

      if (gap < -5) {
        below.push({ name: skill.name, value: skill.value, benchmark, gap: Math.abs(gap) });
      } else if (gap > 5) {
        above.push({ name: skill.name, value: skill.value, benchmark, gap });
      }
    });

    return {
      below: below.sort((a, b) => b.gap - a.gap).slice(0, 3),
      above: above.sort((a, b) => b.gap - a.gap).slice(0, 3)
    };
  }, [filteredCurrentSkills, benchmarks, currentPeriod]);

  const chartData = useMemo(() => ({
    labels: skillNames,
    datasets: [
      {
        label: currentPeriod?.label || 'Current',
        data: skillNames.map(name => {
          const skill = filteredCurrentSkills.find(s => s.name === name);
          return skill?.value || 0;
        }),
        backgroundColor: 'rgba(93, 37, 159, 0.2)',
        borderColor: 'rgba(93, 37, 159, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(93, 37, 159, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(93, 37, 159, 1)',
      },
      filteredPreviousSkills && {
        label: previousPeriod?.label || 'Previous',
        data: skillNames.map(name => {
          const skill = filteredPreviousSkills.find(s => s.name === name);
          return skill?.value || 0;
        }),
        backgroundColor: 'rgba(160, 160, 160, 0.2)',
        borderColor: 'rgba(160, 160, 160, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(160, 160, 160, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(160, 160, 160, 1)',
      },
      {
        label: 'Industry Benchmark',
        data: skillNames.map(name => benchmarks[name] || 65),
        backgroundColor: 'transparent',
        borderColor: 'rgba(0, 0, 0, 0.5)',
        borderWidth: 1,
        borderDash: [5, 5],
        pointStyle: 'dash',
        pointRadius: 0,
      },
    ].filter(Boolean),
  }), [skillNames, filteredCurrentSkills, filteredPreviousSkills, currentPeriod, previousPeriod, benchmarks]);

  const chartOptions = {
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
        ticks: {
          stepSize: 25,
          callback: (value: number) => `${value}%`,
        },
        pointLabels: {
          font: {
            size: 11,
          },
        },
        grid: {
          circular: true,
        },
      },
    },
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `${context.dataset.label}: ${context.raw}%`;
          },
        },
      },
    },
    maintainAspectRatio: false,
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };

  if (!currentPeriod || filteredCurrentSkills.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Skills Growth</h2>
        <p className="mt-2 text-sm text-gray-500">No skill data available yet. Add skills to your profile to start tracking growth.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      {/* Header with navigation */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Skills Growth</h2>
          <p className="text-sm text-gray-500">Track your skill development over time</p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevious}
            disabled={currentPeriodIndex === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium text-gray-700 min-w-20 text-center">
            {currentPeriod.label}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNext}
            disabled={currentPeriodIndex === periods.length - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Category Filters */}
      <div className="mt-4 flex flex-wrap gap-2">
        {CATEGORIES.map((category) => {
          const colors = CATEGORY_COLORS[category];
          const isSelected = selectedCategories.has(category);
          const skillCount = currentPeriod.skills.filter(s => s.category === category).length;

          return (
            <button
              key={category}
              onClick={() => toggleCategory(category)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                'border-2',
                isSelected
                  ? `${colors.bg} ${colors.text} ${colors.border}`
                  : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
              )}
            >
              {category} ({skillCount})
            </button>
          );
        })}
      </div>

      {/* Radar Chart */}
      <div className="mt-6 h-[350px] w-full">
        <Radar data={chartData} options={chartOptions} />
      </div>

      {/* Skill Gap Analysis */}
      {(skillGaps.below.length > 0 || skillGaps.above.length > 0) && (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {/* Growth Opportunities */}
          {skillGaps.below.length > 0 && (
            <div className="rounded-lg bg-amber-50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-5 w-5 text-amber-600" />
                <h3 className="font-medium text-amber-900">Growth Opportunities</h3>
              </div>
              <ul className="space-y-2">
                {skillGaps.below.map((skill) => (
                  <li key={skill.name} className="flex items-center justify-between text-sm">
                    <span className="text-amber-800">{skill.name}</span>
                    <span className="text-amber-600">
                      {skill.value}% <span className="text-amber-400">/ {skill.benchmark}%</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Strengths */}
          {skillGaps.above.length > 0 && (
            <div className="rounded-lg bg-emerald-50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Award className="h-5 w-5 text-emerald-600" />
                <h3 className="font-medium text-emerald-900">Your Strengths</h3>
              </div>
              <ul className="space-y-2">
                {skillGaps.above.map((skill) => (
                  <li key={skill.name} className="flex items-center justify-between text-sm">
                    <span className="text-emerald-800">{skill.name}</span>
                    <span className="text-emerald-600">
                      {skill.value}% <span className="text-emerald-400">/ {skill.benchmark}%</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Trends */}
      {trends.length > 0 && (
        <div className="mt-6 border-t pt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Recent Trends</h3>
          <div className="flex flex-wrap gap-3">
            {trends.slice(0, 5).map((trend) => (
              <div
                key={trend.skill}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full text-sm"
              >
                {getTrendIcon(trend.trend)}
                <span className="text-gray-700">{trend.skill}</span>
                {trend.change > 0 && (
                  <span className={cn(
                    'text-xs',
                    trend.trend === 'up' ? 'text-green-600' : trend.trend === 'down' ? 'text-red-600' : 'text-gray-500'
                  )}>
                    {trend.trend === 'up' ? '+' : trend.trend === 'down' ? '-' : ''}{trend.change}%
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
