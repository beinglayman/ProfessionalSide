import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js';
import { Radar } from 'react-chartjs-2';
import { Button } from '../ui/button';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

interface Skill {
  name: string;
  value: number;
  category: 'Technical' | 'Soft' | 'Leadership';
}

interface SkillPeriod {
  label: string;
  skills: Skill[];
}

interface SkillsGrowthProps {
  periods: SkillPeriod[];
  benchmarks: Record<string, number>;
}

export function SkillsGrowth({ periods, benchmarks }: SkillsGrowthProps) {
  const [currentPeriodIndex, setCurrentPeriodIndex] = useState(0);

  const handlePrevious = () => {
    setCurrentPeriodIndex((prev) => (prev > 0 ? prev - 1 : prev));
  };

  const handleNext = () => {
    setCurrentPeriodIndex((prev) => (prev < periods.length - 1 ? prev + 1 : prev));
  };

  const currentPeriod = periods[currentPeriodIndex];
  const previousPeriod = currentPeriodIndex < periods.length - 1 ? periods[currentPeriodIndex + 1] : null;

  const skillNames = Array.from(new Set(periods.flatMap(p => p.skills.map(s => s.name))));

  const chartData = {
    labels: skillNames,
    datasets: [
      {
        label: currentPeriod.label,
        data: skillNames.map(name => {
          const skill = currentPeriod.skills.find(s => s.name === name);
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
      previousPeriod && {
        label: previousPeriod.label,
        data: skillNames.map(name => {
          const skill = previousPeriod.skills.find(s => s.name === name);
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
        data: skillNames.map(name => benchmarks[name] || 0),
        backgroundColor: 'transparent',
        borderColor: 'rgba(0, 0, 0, 0.5)',
        borderWidth: 1,
        borderDash: [5, 5],
        pointStyle: 'dash',
        pointRadius: 0,
      },
    ].filter(Boolean),
  };

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
            size: 12,
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

  const categories = ['Technical', 'Soft', 'Leadership'] as const;
  const categoryColors = {
    Technical: 'bg-blue-500',
    Soft: 'bg-green-500',
    Leadership: 'bg-purple-500',
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Skills Growth</h2>
          <p className="text-sm text-gray-500">Track your skill development over time</p>
        </div>
        
        {/* Time Period Navigation - Moved here from below */}
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevious}
            disabled={currentPeriodIndex === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium text-gray-700 min-w-20 text-center">{currentPeriod.label}</span>
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

      <div className="mt-6">
        {/* Radar Chart */}
        <div className="h-[400px] w-full">
          <Radar data={chartData} options={chartOptions} />
        </div>

      
      </div>
    </div>
  );
}