import { z } from 'zod';

// Onboarding data validation schemas
export const createOnboardingDataSchema = z.object({
  // Step 1: About You
  fullName: z.string().optional(),
  currentTitle: z.string().optional(),
  currentCompany: z.string().optional(),
  role: z.string().optional(),
  profileImageUrl: z.string().url().optional(),

  // Step 2: Connected Tools
  connectedTools: z.array(z.string()).default([]),

  // Legacy fields (kept for backward compatibility with existing data)
  location: z.string().optional(),
  industry: z.string().optional(),
  yearsOfExperience: z.number().int().min(0).max(50).optional(),
  professionalSummary: z.string().max(2000).optional(),
  specializations: z.array(z.string()).default([]),
  careerHighlights: z.string().max(1000).optional(),
  skills: z.array(z.object({
    name: z.string(),
    proficiency: z.string(),
    category: z.string().optional()
  })).optional(),
  topSkills: z.array(z.string()).default([]),
  workExperiences: z.array(z.object({
    company: z.string(),
    title: z.string(),
    location: z.string().optional(),
    startDate: z.string(),
    endDate: z.string().optional(),
    isCurrentRole: z.boolean().default(false),
    description: z.string(),
    achievements: z.array(z.string()).default([]),
    skills: z.array(z.string()).default([])
  })).optional(),
  education: z.array(z.object({
    institution: z.string(),
    degree: z.string(),
    fieldOfStudy: z.string().optional(),
    location: z.string().optional(),
    startYear: z.string(),
    endYear: z.string().optional(),
    isCurrentlyStudying: z.boolean().default(false),
    grade: z.string().optional(),
    description: z.string().optional(),
    activities: z.array(z.string()).default([])
  })).optional(),
  certifications: z.array(z.object({
    name: z.string(),
    issuingOrganization: z.string(),
    issueDate: z.string(),
    expirationDate: z.string().optional(),
    credentialId: z.string().optional(),
    credentialUrl: z.string().optional(),
    neverExpires: z.boolean().default(false),
    description: z.string().optional(),
    skills: z.array(z.string()).default([])
  })).optional(),
  careerGoals: z.array(z.string()).default([]),
  professionalInterests: z.array(z.string()).default([]),

  // Metadata
  currentStep: z.number().int().min(0).max(2).default(0),
  isCompleted: z.boolean().default(false)
});

export const updateOnboardingDataSchema = createOnboardingDataSchema.partial();

export const updateOnboardingStepSchema = z.object({
  currentStep: z.number().int().min(0).max(2)
});

export const completeOnboardingSchema = z.object({
  isCompleted: z.boolean()
});

// TypeScript types
export type CreateOnboardingDataInput = z.infer<typeof createOnboardingDataSchema>;
export type UpdateOnboardingDataInput = z.infer<typeof updateOnboardingDataSchema>;
export type UpdateOnboardingStepInput = z.infer<typeof updateOnboardingStepSchema>;
export type CompleteOnboardingInput = z.infer<typeof completeOnboardingSchema>;

// Response types
export interface OnboardingDataResponse {
  id: string;
  userId: string;
  fullName?: string | null;
  currentTitle?: string | null;
  currentCompany?: string | null;
  role?: string | null;
  location?: string | null;
  industry?: string | null;
  yearsOfExperience?: number | null;
  profileImageUrl?: string | null;
  connectedTools?: string[];
  professionalSummary?: string | null;
  specializations: string[];
  careerHighlights?: string | null;
  skills?: any;
  topSkills: string[];
  workExperiences?: any;
  education?: any;
  certifications?: any;
  careerGoals: string[];
  professionalInterests: string[];
  currentStep: number;
  isCompleted: boolean;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}