// Skills Benchmark API service
import { api, ApiResponse, handleApiError } from '../lib/api';

export interface SkillBenchmark {
  id: string;
  skillName: string;
  industry: string;
  role: string;
  industryAverage: number;
  juniorLevel: number;
  midLevel: number;
  seniorLevel: number;
  expertLevel: number;
  marketDemand: string;
  growthTrend: string;
  description?: string;
}

class BenchmarksService {
  async getBenchmarksForSkills(skillNames: string[]): Promise<Record<string, number>> {
    try {
      const response = await api.post<ApiResponse<SkillBenchmark[]>>('/skills-benchmark/bulk', {
        skillNames,
      });

      const benchmarks: Record<string, number> = {};

      if (response.data.success && response.data.data) {
        response.data.data.forEach((benchmark: SkillBenchmark) => {
          benchmarks[benchmark.skillName] = benchmark.industryAverage;
        });
      }

      // Fill in missing skills with fallback values
      skillNames.forEach(skillName => {
        if (!(skillName in benchmarks)) {
          benchmarks[skillName] = this.getDefaultBenchmark(skillName);
        }
      });

      return benchmarks;
    } catch (error) {
      console.error('Error fetching benchmarks:', error);
      return this.getFallbackBenchmarks(skillNames);
    }
  }

  async getBenchmarkForSkill(skillName: string): Promise<SkillBenchmark | null> {
    try {
      const response = await api.get<ApiResponse<SkillBenchmark>>(`/skills-benchmark/${encodeURIComponent(skillName)}`);
      return response.data.success ? response.data.data || null : null;
    } catch (error) {
      console.error(`Error fetching benchmark for ${skillName}:`, error);
      return null;
    }
  }

  private getFallbackBenchmarks(skillNames: string[]): Record<string, number> {
    const benchmarks: Record<string, number> = {};
    skillNames.forEach(skillName => {
      benchmarks[skillName] = this.getDefaultBenchmark(skillName);
    });
    return benchmarks;
  }

  private getDefaultBenchmark(skillName: string): number {
    // Simple fallback logic based on common skill patterns
    const lowerSkill = skillName.toLowerCase();
    
    // Popular/high-demand skills tend to have higher industry averages
    const popularSkills = ['javascript', 'python', 'react', 'node.js', 'typescript', 'sql', 'aws', 'docker', 'kubernetes', 'git'];
    if (popularSkills.some(skill => lowerSkill.includes(skill))) {
      return 72; // Higher than average for popular skills
    }
    
    // Leadership/management skills
    if (lowerSkill.includes('management') || lowerSkill.includes('leadership') || lowerSkill.includes('team')) {
      return 68;
    }
    
    // Default industry average
    return 65;
  }
}

export const benchmarksService = new BenchmarksService();