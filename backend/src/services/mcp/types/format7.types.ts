import { MCPToolType } from '../../../types/mcp.types';

export interface Collaborator {
  id: string;
  name: string;
  initials: string;
  avatar: string | null;
  color: string;
  role: string;
  department: string;
}

export interface Evidence {
  type: string;
  url: string;
  title: string;
  links: string[];
  metadata: Record<string, any>;
}

export interface Format7Activity {
  id: string;
  source: MCPToolType;
  type: string;
  action: string;
  description: string;
  timestamp: string;
  evidence: Evidence;
  related_activities: string[];
  technologies: string[];
  collaborators: Collaborator[];
  reviewers: Collaborator[];
  importance: 'high' | 'medium' | 'low';
  metadata?: Record<string, any>;
}

export interface Format7JournalEntry {
  entry_metadata: {
    title: string;
    date: string;
    type: 'achievement' | 'learning' | 'challenge' | 'reflection';
    workspace: string;
    privacy: 'private' | 'team' | 'network' | 'public';
    isAutomated: boolean;
    created_at: string;
  };

  context: {
    date_range: {
      start: string;
      end: string;
    };
    sources_included: MCPToolType[];
    total_activities: number;
    primary_focus: string;
  };

  activities: Format7Activity[];

  summary: {
    total_time_range_hours: number;
    activities_by_type: Record<string, number>;
    activities_by_source: Record<string, number>;
    unique_collaborators: Collaborator[];
    unique_reviewers: Collaborator[];
    technologies_used: string[];
    skills_demonstrated: string[];
  };

  correlations: Array<{
    id: string;
    type: string;
    activities: string[];
    description: string;
    confidence: number;
    evidence: string;
  }>;

  artifacts: Array<{
    activity_id?: string;
    type: string;
    title: string;
    url: string;
    source: MCPToolType;
    importance: 'high' | 'medium' | 'low';
    description: string;
  }>;
}
