import { PrismaClient } from '@prisma/client';
import {
  UpdateProfileInput,
  AddUserSkillInput,
  UpdateUserSkillInput,
  SearchUsersInput,
  WorkExperience,
  Education,
  Certification,
  Language
} from '../types/user.types';

const prisma = new PrismaClient();

export class UserService {
  /**
   * Calculate profile completeness percentage
   */
  private calculateProfileCompleteness(user: any): number {
    let completeness = 0;
    const maxScore = 100;
    
    // Basic info (40 points)
    if (user.name) completeness += 10;
    if (user.email) completeness += 10;
    if (user.title) completeness += 10;
    if (user.bio) completeness += 10;
    
    // Contact info (20 points)
    if (user.location) completeness += 10;
    if (user.company) completeness += 10;
    
    // Professional info (30 points)
    if (user.workExperiences && user.workExperiences.length > 0) completeness += 10;
    if (user.education && user.education.length > 0) completeness += 10;
    if (user.certifications && user.certifications.length > 0) completeness += 5;
    if (user.languages && user.languages.length > 0) completeness += 5;
    
    // Skills (10 points)
    if (user.skills && user.skills.length > 0) completeness += 10;
    
    return Math.min(completeness, maxScore);
  }

  /**
   * Get user profile by ID
   */
  async getUserProfile(userId: string, requestingUserId?: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId, isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        title: true,
        bio: true,
        location: true,
        company: true,
        industry: true,
        yearsOfExperience: true,
        avatar: true,
        profileUrl: true,
        createdAt: true,
        profile: {
          select: {
            profileCompleteness: true,
            joinedDate: true,
            lastActiveAt: true,
            showEmail: true,
            showLocation: true,
            showCompany: true
          }
        },
        workExperiences: {
          orderBy: { startDate: 'desc' }
        },
        education: {
          orderBy: { startYear: 'desc' }
        },
        certifications: {
          orderBy: { issueDate: 'desc' }
        },
        languages: {
          orderBy: { createdAt: 'asc' }
        },
        skills: {
          where: { isVisible: true },
          include: {
            skill: {
              select: {
                id: true,
                name: true,
                category: true
              }
            }
          },
          orderBy: { endorsements: 'desc' }
        },
        workspaceMemberships: {
          where: { isActive: true },
          include: {
            workspace: {
              select: {
                id: true,
                name: true,
                description: true
              }
            }
          }
        },
        achievements: {
          orderBy: { achievedAt: 'desc' },
          take: 10,
          include: {
            attestations: {
              include: {
                attester: {
                  select: {
                    id: true,
                    name: true,
                    avatar: true
                  }
                }
              }
            }
          }
        },
        goals: {
          where: {
            visibility: 'network' // Simplified filter until userId column exists
          },
          select: {
            id: true,
            title: true,
            description: true,
            targetDate: true,
            completed: true,
            completedDate: true,
            progress: true,
            category: true,
            priority: true,
            status: true,
            visibility: true,
            createdAt: true,
            updatedAt: true
            // Temporarily exclude assignedToId, reviewerId, userId, workspaceId until migration
          },
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Apply privacy settings
    const isOwnProfile = userId === requestingUserId;
    if (!isOwnProfile) {
      // Hide private information based on user preferences
      if (!user.profile?.showEmail) {
        user.email = '';
      }
      if (!user.profile?.showLocation) {
        user.location = null;
      }
      if (!user.profile?.showCompany) {
        user.company = null;
      }
    }

    return user;
  }

  /**
   * Update user profile with relational data
   */
  async updateProfile(userId: string, data: UpdateProfileInput) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { 
        profile: true, 
        skills: true,
        workExperiences: true,
        education: true,
        certifications: true,
        languages: true
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Start transaction for atomic updates
    const result = await prisma.$transaction(async (tx) => {
      // Update basic user info
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.title && { title: data.title }),  
          ...(data.bio !== undefined && { bio: data.bio }),
          ...(data.location !== undefined && { location: data.location }),
          ...(data.company !== undefined && { company: data.company }),
          ...(data.industry !== undefined && { industry: data.industry }),
          ...(data.yearsOfExperience !== undefined && { yearsOfExperience: data.yearsOfExperience }),
          ...(data.avatar !== undefined && { avatar: data.avatar }),
          profile: {
            update: {
              ...(data.showEmail !== undefined && { showEmail: data.showEmail }),
              ...(data.showLocation !== undefined && { showLocation: data.showLocation }),
              ...(data.showCompany !== undefined && { showCompany: data.showCompany })
            }
          }
        }
      });

      // Handle work experiences
      if (data.workExperiences) {
        console.log('🔧 Backend: Processing work experiences:', data.workExperiences.length, 'items');
        console.log('🔧 Backend: Work experiences data:', data.workExperiences);
        
        // Delete existing experiences
        await tx.workExperience.deleteMany({
          where: { userId }
        });
        
        // Create new experiences
        if (data.workExperiences.length > 0) {
          const experiencesToCreate = data.workExperiences.map(exp => ({
            userId,
            company: exp.company,
            title: exp.title,
            location: exp.location || '',
            startDate: exp.startDate,
            endDate: exp.endDate,
            isCurrentRole: exp.isCurrentRole || false,
            description: exp.description,
            achievements: exp.achievements || [],
            skills: exp.skills || []
          }));
          
          console.log('🔧 Backend: Creating experiences:', experiencesToCreate);
          
          await tx.workExperience.createMany({
            data: experiencesToCreate
          });
          
          console.log('✅ Backend: Work experiences created successfully');
        }
      }

      // Handle education
      if (data.education) {
        await tx.education.deleteMany({
          where: { userId }
        });
        
        if (data.education.length > 0) {
          await tx.education.createMany({
            data: data.education.map(edu => ({
              userId,
              institution: edu.institution,
              degree: edu.degree,
              fieldOfStudy: edu.fieldOfStudy || '',
              location: edu.location || '',
              startYear: edu.startYear,
              endYear: edu.endYear,
              isCurrentlyStudying: edu.isCurrentlyStudying || false,
              grade: edu.grade || '',
              description: edu.description || '',
              activities: edu.activities || []
            }))
          });
        }
      }

      // Handle certifications  
      if (data.certifications) {
        await tx.certification.deleteMany({
          where: { userId }
        });
        
        if (data.certifications.length > 0) {
          await tx.certification.createMany({
            data: data.certifications.map(cert => ({
              userId,
              name: cert.name,
              issuingOrganization: cert.issuingOrganization,
              issueDate: cert.issueDate,
              expirationDate: cert.expirationDate,
              credentialId: cert.credentialId || '',
              credentialUrl: cert.credentialUrl || '',
              neverExpires: cert.neverExpires || false,
              description: cert.description || '',
              skills: cert.skills || []
            }))
          });
        }
      }

      // Handle languages
      if (data.languages) {
        await tx.userLanguage.deleteMany({
          where: { userId }
        });
        
        if (data.languages.length > 0) {
          await tx.userLanguage.createMany({
            data: data.languages.map(lang => ({
              userId,
              language: lang.language,
              proficiency: lang.proficiency
            }))
          });
        }
      }

      return updatedUser;
    });

    // Get the complete updated profile
    const completeProfile = await this.getUserProfile(userId, userId);
    
    // Update profile completeness
    const completeness = this.calculateProfileCompleteness(completeProfile);
    await prisma.userProfile.update({
      where: { userId },
      data: { profileCompleteness: completeness }
    });

    // Return the complete profile
    return await this.getUserProfile(userId, userId);
  }

  /**
   * Add skill to user
   */
  async addUserSkill(userId: string, data: AddUserSkillInput) {
    // Find or create skill
    let skill = await prisma.skill.findFirst({
      where: { name: { equals: data.skillName, mode: 'insensitive' } }
    });

    if (!skill) {
      skill = await prisma.skill.create({
        data: {
          id: data.skillName.toLowerCase().replace(/\s+/g, '-'),
          name: data.skillName,
          category: data.category
        }
      });
    }

    // Check if user already has this skill
    const existingUserSkill = await prisma.userSkill.findUnique({
      where: {
        userId_skillId: {
          userId,
          skillId: skill.id
        }
      }
    });

    if (existingUserSkill) {
      throw new Error('You already have this skill');
    }

    // Add skill to user
    const userSkill = await prisma.userSkill.create({
      data: {
        userId,
        skillId: skill.id,
        level: data.level,
        yearsOfExp: data.yearsOfExp,
        projects: data.projects,
        startDate: data.startDate ? new Date(data.startDate) : null,
        isVisible: data.isVisible
      },
      include: {
        skill: true
      }
    });

    // Update profile completeness
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true, skills: true }
    });
    
    if (user) {
      const completeness = this.calculateProfileCompleteness(user);
      await prisma.userProfile.update({
        where: { userId },
        data: { profileCompleteness: completeness }
      });
    }

    return userSkill;
  }

  /**
   * Update user skill
   */
  async updateUserSkill(userId: string, skillId: string, data: UpdateUserSkillInput) {
    const userSkill = await prisma.userSkill.findUnique({
      where: {
        userId_skillId: {
          userId,
          skillId
        }
      }
    });

    if (!userSkill) {
      throw new Error('Skill not found');
    }

    return prisma.userSkill.update({
      where: {
        userId_skillId: {
          userId,
          skillId
        }
      },
      data: {
        ...(data.level && { level: data.level }),
        ...(data.yearsOfExp !== undefined && { yearsOfExp: data.yearsOfExp }),
        ...(data.projects !== undefined && { projects: data.projects }),
        ...(data.startDate && { startDate: new Date(data.startDate) }),
        ...(data.isVisible !== undefined && { isVisible: data.isVisible })
      },
      include: {
        skill: true
      }
    });
  }

  /**
   * Remove user skill
   */
  async removeUserSkill(userId: string, skillId: string) {
    const userSkill = await prisma.userSkill.findUnique({
      where: {
        userId_skillId: {
          userId,
          skillId
        }
      }
    });

    if (!userSkill) {
      throw new Error('Skill not found');
    }

    return prisma.userSkill.delete({
      where: {
        userId_skillId: {
          userId,
          skillId
        }
      }
    });
  }

  /**
   * Search users
   */
  async searchUsers(data: SearchUsersInput, requestingUserId?: string) {
    const { query, skills, location, company, page, limit } = data;
    const skip = (page - 1) * limit;

    const where: any = {
      isActive: true,
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { title: { contains: query, mode: 'insensitive' } },
        { bio: { contains: query, mode: 'insensitive' } },
        { company: { contains: query, mode: 'insensitive' } }
      ]
    };

    if (location) {
      where.location = { contains: location, mode: 'insensitive' };
    }

    if (company) {
      where.company = { contains: company, mode: 'insensitive' };
    }

    if (skills && skills.length > 0) {
      where.skills = {
        some: {
          skill: {
            name: { in: skills, mode: 'insensitive' }
          },
          isVisible: true
        }
      };
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          title: true,
          location: true,
          company: true,
          avatar: true,
          profile: {
            select: {
              showLocation: true,
              showCompany: true
            }
          },
          skills: {
            where: { isVisible: true },
            take: 5,
            include: {
              skill: {
                select: {
                  name: true,
                  category: true
                }
              }
            },
            orderBy: { endorsements: 'desc' }
          }
        },
        skip,
        take: limit,
        orderBy: [
          { profile: { lastActiveAt: 'desc' } },
          { name: 'asc' }
        ]
      }),
      prisma.user.count({ where })
    ]);

    // Apply privacy settings
    const filteredUsers = users.map(user => ({
      ...user,
      location: user.profile?.showLocation ? user.location : null,
      company: user.profile?.showCompany ? user.company : null,
      profile: undefined // Remove profile from response
    }));

    return {
      users: filteredUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get user skills
   */
  async getUserSkills(userId: string) {
    return prisma.userSkill.findMany({
      where: { userId },
      include: {
        skill: true
      },
      orderBy: [
        { endorsements: 'desc' },
        { skill: { name: 'asc' } }
      ]
    });
  }

  /**
   * Get all available skills
   */
  async getAllSkills() {
    return prisma.skill.findMany({
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ]
    });
  }

  /**
   * Endorse user skill
   */
  async endorseUserSkill(userId: string, skillId: string, endorserId: string) {
    if (userId === endorserId) {
      throw new Error('You cannot endorse your own skills');
    }

    const userSkill = await prisma.userSkill.findUnique({
      where: {
        userId_skillId: {
          userId,
          skillId
        }
      }
    });

    if (!userSkill) {
      throw new Error('Skill not found');
    }

    // Increment endorsement count
    return prisma.userSkill.update({
      where: {
        userId_skillId: {
          userId,
          skillId
        }
      },
      data: {
        endorsements: { increment: 1 }
      },
      include: {
        skill: true
      }
    });
  }

  /**
   * Request data export
   */
  async requestDataExport(userId: string, options: any) {
    const exportId = `export_${userId}_${Date.now()}`;
    
    // For demo purposes, we'll simulate the export process
    // In production, this would queue a background job
    const exportRequest = {
      exportId,
      status: 'processing' as const,
      createdAt: new Date().toISOString(),
      estimatedCompletionTime: new Date(Date.now() + 3000).toISOString() // 3 seconds from now
    };

    // Simulate processing by gathering user data
    const userData = await this.getUserDataForExport(userId);
    
    // In production, save this to a DataExport table and queue background processing
    // For demo, we'll just return the export info
    return {
      success: true,
      data: exportRequest
    };
  }

  /**
   * Check export status
   */
  async checkExportStatus(userId: string, exportId: string) {
    // For demo purposes, we'll simulate that exports are ready after 3 seconds
    const isReady = exportId.includes(userId); // Simple check for demo
    
    return {
      exportId,
      status: isReady ? 'completed' : 'processing',
      downloadUrl: isReady ? `/api/users/export-data/${exportId}/download` : undefined,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Download export data
   */
  async downloadExportData(userId: string, exportId: string) {
    // Verify the export belongs to the user
    if (!exportId.includes(userId)) {
      throw new Error('Export not found');
    }

    // For demo purposes, we'll create a simple JSON file
    const userData = await this.getUserDataForExport(userId);
    const exportData = JSON.stringify(userData, null, 2);
    
    // In production, this would be a zip file created during the background job
    // For demo, we'll return a simple response
    return {
      filePath: Buffer.from(exportData).toString('base64'), // Base64 encoded for demo
      fileName: `inchronicle-data-export-${new Date().toISOString().split('T')[0]}.json`
    };
  }

  /**
   * Delete user profile
   */
  async deleteUserProfile(userId: string) {
    // Use a transaction to ensure all related data is deleted
    await prisma.$transaction(async (tx) => {
      // Delete related data first (due to foreign key constraints)
      await tx.userSkill.deleteMany({ where: { userId } });
      await tx.workExperience.deleteMany({ where: { userId } });
      await tx.education.deleteMany({ where: { userId } });
      await tx.certification.deleteMany({ where: { userId } });
      // await tx.language.deleteMany({ where: { userId } }); // Comment out if languages table doesn't exist
      
      // Remove user from workspaces
      await tx.workspaceMember.deleteMany({ where: { userId } });
      
      // Soft delete the user
      await tx.user.update({
        where: { id: userId },
        data: { 
          isActive: false,
          email: `deleted_${userId}@deleted.com`, // Anonymize email
          name: 'Deleted User'
        }
      });
    });
  }

  /**
   * Get privacy settings
   */
  async getPrivacySettings(userId: string) {
    // Use findFirst to handle cases where profile might not exist
    const profile = await prisma.userProfile.findFirst({
      where: { userId },
      select: {
        profileVisibility: true,
        showEmail: true,
        showLocation: true,
        showCompany: true,
        showConnections: true,
        allowSearchEngineIndexing: true
      }
    });

    // Return default values if profile doesn't exist
    return {
      profileVisibility: profile?.profileVisibility ?? 'network',
      showEmail: profile?.showEmail ?? false,
      showLocation: profile?.showLocation ?? true,
      showCompany: profile?.showCompany ?? true,
      showConnections: profile?.showConnections ?? true,
      allowSearchEngineIndexing: profile?.allowSearchEngineIndexing ?? false
    };
  }

  /**
   * Update privacy settings
   */
  async updatePrivacySettings(userId: string, settings: any) {
    const updatedProfile = await prisma.userProfile.upsert({
      where: { userId },
      create: {
        userId,
        profileVisibility: settings.profileVisibility ?? 'network',
        showEmail: settings.showEmail ?? false,
        showLocation: settings.showLocation ?? true,
        showCompany: settings.showCompany ?? true,
        showConnections: settings.showConnections ?? true,
        allowSearchEngineIndexing: settings.allowSearchEngineIndexing ?? false
      },
      update: {
        profileVisibility: settings.profileVisibility,
        showEmail: settings.showEmail,
        showLocation: settings.showLocation,
        showCompany: settings.showCompany,
        showConnections: settings.showConnections,
        allowSearchEngineIndexing: settings.allowSearchEngineIndexing
      }
    });

    return {
      profileVisibility: updatedProfile.profileVisibility,
      showEmail: updatedProfile.showEmail,
      showLocation: updatedProfile.showLocation,
      showCompany: updatedProfile.showCompany,
      showConnections: updatedProfile.showConnections,
      allowSearchEngineIndexing: updatedProfile.allowSearchEngineIndexing
    };
  }

  /**
   * Get user data for export (private helper method)
   */
  private async getUserDataForExport(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        workExperiences: true,
        education: true,
        certifications: true,
        // languages: true, // Comment out if languages table doesn't exist
        skills: {
          include: {
            skill: true
          }
        }
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    return {
      profile: {
        id: user.id,
        name: user.name,
        email: user.email,
        title: user.title,
        bio: user.bio,
        location: user.location,
        company: user.company,
        industry: user.industry,
        yearsOfExperience: user.yearsOfExperience,
        avatar: user.avatar,
        createdAt: user.createdAt,
        profile: user.profile
      },
      workExperiences: user.workExperiences,
      education: user.education,
      certifications: user.certifications,
      // languages: user.languages, // Comment out if languages table doesn't exist
      skills: user.skills.map(us => ({
        skill: us.skill.name,
        category: us.skill.category,
        level: us.level,
        endorsements: us.endorsements,
        yearsOfExp: us.yearsOfExp
      })),
      exportedAt: new Date().toISOString(),
      exportVersion: '1.0'
    };
  }
}