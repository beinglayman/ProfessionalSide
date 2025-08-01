import { z } from 'zod';

// Update user profile schema
export const updateProfileSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .trim()
    .optional(),
  title: z.string()
    .min(2, 'Title must be at least 2 characters')
    .max(200, 'Title must be less than 200 characters')
    .trim()
    .optional(),
  bio: z.string()
    .max(1000, 'Bio must be less than 1000 characters')
    .trim()
    .optional(),
  location: z.string()
    .max(200, 'Location must be less than 200 characters')
    .trim()
    .optional(),
  company: z.string()
    .max(200, 'Company name must be less than 200 characters')
    .trim()
    .optional(),
  industry: z.string()
    .max(100, 'Industry must be less than 100 characters')
    .trim()
    .optional(),
  yearsOfExperience: z.number()
    .min(0, 'Years of experience must be 0 or greater')
    .max(60, 'Years of experience must be less than 60')
    .optional(),
  avatar: z.string()
    .url('Avatar must be a valid URL')
    .optional(),
  // Privacy settings
  showEmail: z.boolean().optional(),
  showLocation: z.boolean().optional(),
  showCompany: z.boolean().optional(),
  // Professional info (relational data)
  workExperiences: z.array(z.object({
    id: z.string().optional(),
    company: z.string(),
    title: z.string(),
    location: z.string().optional(),
    startDate: z.string(), // YYYY-MM format
    endDate: z.string().nullable().optional(),
    isCurrentRole: z.boolean().optional(),
    description: z.string(),
    achievements: z.array(z.string()).optional(),
    skills: z.array(z.string()).optional()
  }).refine((data) => {
    // If it's a current role, endDate can be null/undefined
    if (data.isCurrentRole) {
      return true;
    }
    // If it's not a current role, endDate should be provided
    return data.endDate != null && data.endDate.trim() !== '';
  }, {
    message: "End date is required for non-current roles",
    path: ["endDate"]
  })).optional(),
  education: z.array(z.object({
    id: z.string().optional(),
    institution: z.string(),
    degree: z.string(),
    fieldOfStudy: z.string().optional(),
    location: z.string().optional(),
    startYear: z.string(),
    endYear: z.string().optional(),
    isCurrentlyStudying: z.boolean().optional(),
    grade: z.string().optional(),
    description: z.string().optional(),
    activities: z.array(z.string()).optional()
  })).optional(),
  certifications: z.array(z.object({
    id: z.string().optional(),
    name: z.string(),
    issuingOrganization: z.string(),
    issueDate: z.string(), // YYYY-MM format
    expirationDate: z.string().optional(),
    credentialId: z.string().optional(),
    credentialUrl: z.string().optional(),
    neverExpires: z.boolean().optional(),
    description: z.string().optional(),
    skills: z.array(z.string()).optional()
  })).optional(),
  languages: z.array(z.object({
    language: z.string(),
    proficiency: z.string()
  })).optional()
});

// Add user skill schema
export const addUserSkillSchema = z.object({
  skillName: z.string()
    .min(1, 'Skill name is required')
    .max(100, 'Skill name must be less than 100 characters')
    .trim(),
  category: z.string()
    .min(1, 'Category is required')
    .max(50, 'Category must be less than 50 characters')
    .trim(),
  level: z.enum(['beginner', 'intermediate', 'advanced', 'expert'], {
    errorMap: () => ({ message: 'Level must be beginner, intermediate, advanced, or expert' })
  }),
  yearsOfExp: z.number()
    .min(0, 'Years of experience must be 0 or greater')
    .max(50, 'Years of experience must be less than 50')
    .optional()
    .default(0),
  projects: z.number()
    .min(0, 'Number of projects must be 0 or greater')
    .optional()
    .default(0),
  startDate: z.string()
    .datetime('Invalid start date format')
    .optional(),
  isVisible: z.boolean()
    .optional()
    .default(true)
});

// Update user skill schema
export const updateUserSkillSchema = z.object({
  level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional(),
  yearsOfExp: z.number()
    .min(0, 'Years of experience must be 0 or greater')
    .max(50, 'Years of experience must be less than 50')
    .optional(),
  projects: z.number()
    .min(0, 'Number of projects must be 0 or greater')
    .optional(),
  startDate: z.string()
    .datetime('Invalid start date format')
    .optional(),
  isVisible: z.boolean().optional()
});

// Search users schema
export const searchUsersSchema = z.object({
  query: z.string()
    .min(1, 'Search query is required')
    .max(200, 'Search query must be less than 200 characters')
    .trim(),
  skills: z.array(z.string()).optional(),
  location: z.string().optional(),
  company: z.string().optional(),
  page: z.number().min(1).optional().default(1),
  limit: z.number().min(1).max(100).optional().default(20)
});

// Get user profile schema (for public profiles)
export const getUserProfileSchema = z.object({
  userId: z.string().cuid('Invalid user ID format')
});

// Professional experience schema (for JSON validation)
export const workExperienceSchema = z.object({
  company: z.string().min(1, 'Company is required'),
  title: z.string().min(1, 'Title is required'),
  period: z.string().min(1, 'Period is required'),
  description: z.string().optional(),
  achievements: z.array(z.string()).optional().default([]),
  current: z.boolean().optional().default(false)
});

// Education schema
export const educationSchema = z.object({
  institution: z.string().min(1, 'Institution is required'),
  degree: z.string().min(1, 'Degree is required'),
  period: z.string().min(1, 'Period is required'),
  highlights: z.string().optional(),
  gpa: z.string().optional()
});

// Certification schema
export const certificationSchema = z.object({
  name: z.string().min(1, 'Certification name is required'),
  issuer: z.string().min(1, 'Issuer is required'),
  date: z.string().min(1, 'Date is required'),
  expiration: z.string().optional(),
  credentialId: z.string().optional(),
  credentialUrl: z.string().url().optional()
});

// Language schema
export const languageSchema = z.object({
  name: z.string().min(1, 'Language name is required'),
  proficiency: z.enum(['Native', 'Fluent', 'Advanced', 'Intermediate', 'Basic'])
});

// Type exports
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type AddUserSkillInput = z.infer<typeof addUserSkillSchema>;
export type UpdateUserSkillInput = z.infer<typeof updateUserSkillSchema>;
export type SearchUsersInput = z.infer<typeof searchUsersSchema>;
export type GetUserProfileInput = z.infer<typeof getUserProfileSchema>;
export type WorkExperience = z.infer<typeof workExperienceSchema>;
export type Education = z.infer<typeof educationSchema>;
export type Certification = z.infer<typeof certificationSchema>;
export type Language = z.infer<typeof languageSchema>;