import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../utils/auth.utils';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create organizations
  const techCorp = await prisma.organization.create({
    data: {
      name: 'TechCorp Solutions',
      domain: 'techcorp.com',
      description: 'Leading technology solutions company'
    }
  });

  // Create workspaces
  const frontendWorkspace = await prisma.workspace.create({
    data: {
      name: 'Frontend Innovation',
      description: 'Building cutting-edge user interfaces',
      organizationId: techCorp.id
    }
  });

  const designWorkspace = await prisma.workspace.create({
    data: {
      name: 'Design System',
      description: 'Creating consistent design experiences',
      organizationId: techCorp.id
    }
  });

  // Create skills
  const skills = await Promise.all([
    prisma.skill.create({ data: { name: 'React.js', category: 'Technical' } }),
    prisma.skill.create({ data: { name: 'TypeScript', category: 'Technical' } }),
    prisma.skill.create({ data: { name: 'UI/UX Design', category: 'Technical' } }),
    prisma.skill.create({ data: { name: 'Node.js', category: 'Technical' } }),
    prisma.skill.create({ data: { name: 'Custom Hook Patterns', category: 'Technical' } }),
    prisma.skill.create({ data: { name: 'Responsive Design', category: 'Technical' } }),
    prisma.skill.create({ data: { name: 'JavaScript', category: 'Technical' } }),
    prisma.skill.create({ data: { name: 'CSS', category: 'Technical' } }),
    prisma.skill.create({ data: { name: 'HTML', category: 'Technical' } }),
    prisma.skill.create({ data: { name: 'Leadership', category: 'Soft' } }),
  ]);

  // Create users with hashed passwords
  const hashedPassword = await hashPassword('password123');

  // Sarah Chen - Main user from frontend
  const sarah = await prisma.users.create({
    data: {
      name: 'Sarah Chen',
      email: 'sarah.chen@techcorp.com',
      password: hashedPassword,
      title: 'Senior Frontend Developer',
      bio: 'Passionate frontend developer with expertise in React and modern web technologies. Focused on creating exceptional user experiences and mentoring junior developers.',
      location: 'San Francisco, CA',
      company: 'TechCorp Inc.',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
      profile: {
        create: {
          profileCompleteness: 85,
          showEmail: false,
          showLocation: true,
          showCompany: true,
          experience: JSON.stringify([
            {
              company: 'TechCorp Inc.',
              title: 'Senior Frontend Developer',
              period: 'Mar 2022 - Present',
              description: 'Lead frontend development for core products, optimizing React applications and mentoring junior developers.',
              achievements: [
                'Improved site loading speed by 65% through performance optimizations',
                'Created company-wide design system with 35+ reusable components',
                'Led migration from JavaScript to TypeScript across 3 product lines'
              ]
            },
            {
              company: 'WebSolutions LLC',
              title: 'Frontend Developer',
              period: 'Jan 2020 - Feb 2022',
              description: 'Developed responsive web applications and components using React and modern JavaScript.',
              achievements: [
                'Implemented CI/CD pipeline reducing deployment time by 40%',
                'Built custom React hooks library adopted by entire development team',
                'Collaborated with design team to implement accessibility improvements'
              ]
            }
          ]),
          education: JSON.stringify([
            {
              institution: 'University of California, Berkeley',
              degree: 'B.S. Computer Science',
              period: '2014 - 2018',
              highlights: 'Focused on human-computer interaction and web technologies. Graduated with honors.'
            }
          ]),
          certifications: JSON.stringify([
            {
              name: 'AWS Certified Developer - Associate',
              issuer: 'Amazon Web Services',
              date: 'Jan 2024',
              expiration: 'Jan 2027'
            }
          ]),
          languages: JSON.stringify([
            { name: 'English', proficiency: 'Native' },
            { name: 'Mandarin Chinese', proficiency: 'Fluent' },
            { name: 'Spanish', proficiency: 'Intermediate' }
          ])
        }
      }
    }
  });

  // Emily Chen - Collaborator
  const emily = await prisma.users.create({
    data: {
      name: 'Emily Chen',
      email: 'emily.chen@techcorp.com',
      password: hashedPassword,
      title: 'Frontend Engineer',
      location: 'San Francisco, CA',
      company: 'TechCorp Inc.',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop',
      profile: {
        create: {
          profileCompleteness: 70
        }
      }
    }
  });

  // Alex Wong - Designer
  const alex = await prisma.users.create({
    data: {
      name: 'Alex Wong',
      email: 'alex.wong@techcorp.com',
      password: hashedPassword,
      title: 'UX Designer',
      location: 'San Francisco, CA',
      company: 'TechCorp Inc.',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
      profile: {
        create: {
          profileCompleteness: 65
        }
      }
    }
  });

  // Sarah Johnson - Tech Lead
  const sarahJ = await prisma.users.create({
    data: {
      name: 'Sarah Johnson',
      email: 'sarah.johnson@techcorp.com',
      password: hashedPassword,
      title: 'Tech Lead',
      location: 'San Francisco, CA',
      company: 'TechCorp Inc.',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
      profile: {
        create: {
          profileCompleteness: 80
        }
      }
    }
  });

  // Marcus Williams - Engineering Manager
  const marcus = await prisma.users.create({
    data: {
      name: 'Marcus Williams',
      email: 'marcus.williams@techcorp.com',
      password: hashedPassword,
      title: 'Engineering Manager',
      location: 'San Francisco, CA',
      company: 'TechCorp Inc.',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
      profile: {
        create: {
          profileCompleteness: 75
        }
      }
    }
  });

  // Jason Park - Design Lead
  const jason = await prisma.users.create({
    data: {
      name: 'Jason Park',
      email: 'jason.park@techcorp.com',
      password: hashedPassword,
      title: 'Design Lead',
      location: 'San Francisco, CA',
      company: 'TechCorp Inc.',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
      profile: {
        create: {
          profileCompleteness: 70
        }
      }
    }
  });

  // Create workspace memberships
  await Promise.all([
    prisma.workspaceMember.create({
      data: { userId: sarah.id, workspaceId: frontendWorkspace.id, role: 'admin' }
    }),
    prisma.workspaceMember.create({
      data: { userId: emily.id, workspaceId: frontendWorkspace.id, role: 'member' }
    }),
    prisma.workspaceMember.create({
      data: { userId: alex.id, workspaceId: frontendWorkspace.id, role: 'member' }
    }),
    prisma.workspaceMember.create({
      data: { userId: sarahJ.id, workspaceId: frontendWorkspace.id, role: 'admin' }
    }),
    prisma.workspaceMember.create({
      data: { userId: marcus.id, workspaceId: frontendWorkspace.id, role: 'admin' }
    }),
    prisma.workspaceMember.create({
      data: { userId: sarah.id, workspaceId: designWorkspace.id, role: 'member' }
    }),
    prisma.workspaceMember.create({
      data: { userId: jason.id, workspaceId: designWorkspace.id, role: 'admin' }
    })
  ]);

  // Add skills to Sarah
  await Promise.all([
    prisma.usersSkill.create({
      data: {
        userId: sarah.id,
        skillId: skills.find(s => s.name === 'React.js')!.id,
        level: 'expert',
        endorsements: 42,
        projects: 15,
        yearsOfExp: 5,
        startDate: new Date('2020-01-15')
      }
    }),
    prisma.usersSkill.create({
      data: {
        userId: sarah.id,
        skillId: skills.find(s => s.name === 'TypeScript')!.id,
        level: 'advanced',
        endorsements: 38,
        projects: 12,
        yearsOfExp: 4,
        startDate: new Date('2020-06-01')
      }
    }),
    prisma.usersSkill.create({
      data: {
        userId: sarah.id,
        skillId: skills.find(s => s.name === 'UI/UX Design')!.id,
        level: 'intermediate',
        endorsements: 25,
        projects: 8,
        yearsOfExp: 3,
        startDate: new Date('2021-03-15')
      }
    }),
    prisma.usersSkill.create({
      data: {
        userId: sarah.id,
        skillId: skills.find(s => s.name === 'Node.js')!.id,
        level: 'intermediate',
        endorsements: 20,
        projects: 6,
        yearsOfExp: 2,
        startDate: new Date('2021-09-01')
      }
    })
  ]);

  // Create journal entries
  const journalEntry1 = await prisma.journalEntry.create({
    data: {
      title: 'Built Custom React Hook Library',
      description: 'Developed a comprehensive library of 12 custom React hooks to standardize common functionality across all projects.',
      fullContent: 'Developed a comprehensive library of 12 custom React hooks to standardize common functionality across all projects. The library includes hooks for local storage, API calls, form validation, and state management. This initiative has significantly improved code reusability and development efficiency across our frontend teams.',
      abstractContent: 'Created a reusable React hooks library that standardized functionality across multiple projects, improving development efficiency and code quality.',
      authorId: sarah.id,
      workspaceId: frontendWorkspace.id,
      visibility: 'network',
      isPublished: true,
      publishedAt: new Date('2025-02-15'),
      category: 'Engineering',
      tags: ['react', 'typescript', 'hooks'],
      skills: ['React.js', 'TypeScript', 'Custom Hook Patterns'],
      collaborators: {
        create: [
          { userId: emily.id, role: 'Frontend Engineer' },
          { userId: alex.id, role: 'UX Designer' }
        ]
      },
      reviewers: {
        create: [
          { userId: sarahJ.id, department: 'Tech Lead' },
          { userId: marcus.id, department: 'Engineering Manager' }
        ]
      },
      artifacts: {
        create: [
          {
            name: 'custom-hooks.ts',
            type: 'code',
            url: 'https://github.com/techcorp/hooks-library',
            size: '12 KB'
          },
          {
            name: 'hooks-documentation.pdf',
            type: 'document',
            url: 'https://example.com/docs/hooks-documentation.pdf',
            size: '2.4 MB'
          }
        ]
      },
      outcomes: {
        create: [
          {
            category: 'performance',
            title: 'Reduced code duplication',
            description: 'Eliminated 60% of duplicate code across React projects through reusable hooks.',
            metrics: JSON.stringify({
              before: '40%',
              after: '90%',
              improvement: '+50%',
              trend: 'up'
            })
          },
          {
            category: 'technical',
            title: 'Improved development efficiency',
            description: 'Standardized common patterns and reduced development time for new features.',
            highlight: 'TypeScript support with full type safety'
          }
        ]
      }
    }
  });

  const journalEntry2 = await prisma.journalEntry.create({
    data: {
      title: 'Implemented Responsive Design System',
      description: 'Created a comprehensive responsive design system with breakpoints and flexible components.',
      fullContent: 'Created a comprehensive responsive design system with 35+ reusable components, ensuring mobile-first approach and WCAG AA compliance across all components. The system includes a complete color palette, typography scale, spacing system, and component library.',
      abstractContent: 'Developed a scalable design system that standardized UI components across multiple products, improving consistency and development velocity.',
      authorId: sarah.id,
      workspaceId: designWorkspace.id,
      visibility: 'workspace',
      isPublished: true,
      publishedAt: new Date('2025-01-25'),
      category: 'Design',
      tags: ['design-system', 'ui', 'accessibility'],
      skills: ['UI/UX Design', 'React.js', 'Responsive Design'],
      collaborators: {
        create: [
          { userId: jason.id, role: 'Design Lead' }
        ]
      },
      reviewers: {
        create: [
          { userId: marcus.id, department: 'Engineering Manager' }
        ]
      },
      artifacts: {
        create: [
          {
            name: 'component-library-screenshot.png',
            type: 'design',
            url: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&h=600&fit=crop',
            size: '3.2 MB'
          }
        ]
      },
      outcomes: {
        create: [
          {
            category: 'user-experience',
            title: 'Improved accessibility',
            description: 'Achieved 100% WCAG AA compliance across all components.',
            highlight: 'WCAG AA compliant'
          }
        ]
      }
    }
  });

  // Create some likes and appreciates
  await Promise.all([
    prisma.journalLike.create({
      data: { entryId: journalEntry1.id, userId: emily.id }
    }),
    prisma.journalLike.create({
      data: { entryId: journalEntry1.id, userId: alex.id }
    }),
    prisma.journalLike.create({
      data: { entryId: journalEntry1.id, userId: sarahJ.id }
    }),
    prisma.journalAppreciate.create({
      data: { entryId: journalEntry1.id, userId: marcus.id }
    }),
    prisma.journalAppreciate.create({
      data: { entryId: journalEntry2.id, userId: jason.id }
    })
  ]);

  // Create some goals
  const goal1 = await prisma.goal.create({
    data: {
      title: 'E-commerce Platform Performance Optimization',
      description: 'Improve site loading speed and reduce bounce rate through comprehensive performance optimization.',
      targetDate: new Date('2025-03-31'),
      progress: 75,
      category: 'Performance',
      visibility: 'workspace',
      userId: sarah.id,
      workspaceId: frontendWorkspace.id,
      milestones: {
        create: [
          {
            title: 'Performance audit completed',
            completed: true,
            completedDate: new Date('2025-02-01'),
            order: 1
          },
          {
            title: 'Critical performance fixes implemented',
            completed: true,
            completedDate: new Date('2025-02-15'),
            order: 2
          },
          {
            title: 'Load testing and optimization',
            completed: false,
            targetDate: new Date('2025-03-15'),
            order: 3
          }
        ]
      }
    }
  });

  // Create achievements
  await Promise.all([
    prisma.achievement.create({
      data: {
        title: 'E-commerce Platform Performance Optimization',
        description: 'Improved site loading speed by 65% and reduced bounce rate by 28%, resulting in 15% increase in conversion rate',
        impact: 'Improved site loading speed by 65% and reduced bounce rate by 28%, resulting in 15% increase in conversion rate',
        skills: ['React.js', 'TypeScript'],
        status: 'completed',
        backgroundColor: '#5D259F',
        userId: sarah.id,
        achievedAt: new Date('2025-02-15'),
        attestations: {
          create: [
            {
              attesterId: marcus.id,
              comment: 'Outstanding performance optimization work that significantly improved user experience.'
            },
            {
              attesterId: sarahJ.id,
              comment: 'Excellent technical execution and measurable business impact.'
            }
          ]
        }
      }
    }),
    prisma.achievement.create({
      data: {
        title: 'Design System Component Library Development',
        description: 'Created 35+ reusable components that reduced development time by 40% and ensured consistent UX across products',
        impact: 'Created 35+ reusable components that reduced development time by 40% and ensured consistent UX across products',
        skills: ['React.js', 'UI/UX Design'],
        status: 'completed',
        backgroundColor: '#5D259F',
        userId: sarah.id,
        achievedAt: new Date('2025-01-15'),
        attestations: {
          create: [
            {
              attesterId: jason.id,
              comment: 'Fantastic collaboration on the design system. Sarah brought excellent technical insights.'
            }
          ]
        }
      }
    })
  ]);

  // Create some analytics entries
  await Promise.all([
    ...Array.from({ length: 245 }, (_, i) => 
      prisma.journalEntryAnalytics.create({
        data: {
          entryId: journalEntry1.id,
          userId: i % 4 === 0 ? emily.id : i % 3 === 0 ? alex.id : null,
          engagementType: 'view',
          readTime: Math.floor(Math.random() * 300) + 60,
          viewedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
        }
      })
    ),
    ...Array.from({ length: 156 }, (_, i) => 
      prisma.journalEntryAnalytics.create({
        data: {
          entryId: journalEntry2.id,
          userId: i % 3 === 0 ? jason.id : i % 4 === 0 ? marcus.id : null,
          engagementType: 'view',
          readTime: Math.floor(Math.random() * 200) + 45,
          viewedAt: new Date(Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000)
        }
      })
    )
  ]);

  // Create network connections
  await Promise.all([
    prisma.networkConnection.create({
      data: {
        senderId: sarah.id,
        receiverId: emily.id,
        status: 'accepted',
        tier: 'core',
        context: 'workspace-collaborator',
        autoAdded: true,
        sharedWorkspaces: [frontendWorkspace.id]
      }
    }),
    prisma.networkConnection.create({
      data: {
        senderId: sarah.id,
        receiverId: alex.id,
        status: 'accepted',
        tier: 'core',
        context: 'workspace-collaborator',
        autoAdded: true,
        sharedWorkspaces: [frontendWorkspace.id]
      }
    }),
    prisma.networkConnection.create({
      data: {
        senderId: sarah.id,
        receiverId: jason.id,
        status: 'accepted',
        tier: 'extended',
        context: 'followed-professional',
        autoAdded: false,
        sharedWorkspaces: [designWorkspace.id]
      }
    })
  ]);

  // Create network policies
  await Promise.all([
    prisma.networkPolicy.create({
      data: {
        userId: sarah.id,
        autoAddPolicy: 'auto-extended',
        coreRequirements: ['direct-collaboration'],
        notifyOnConnection: true,
        notifyOnPromotion: true,
        allowAutoAdd: true
      }
    }),
    prisma.networkPolicy.create({
      data: {
        userId: emily.id,
        autoAddPolicy: 'auto-core',
        coreRequirements: ['direct-collaboration'],
        notifyOnConnection: true,
        notifyOnPromotion: true,
        allowAutoAdd: true
      }
    })
  ]);

  console.log('✅ Database seeding completed successfully!');
  console.log(`👤 Created ${6} users`);
  console.log(`🏢 Created ${1} organization with ${2} workspaces`);
  console.log(`📝 Created ${2} journal entries with full metadata`);
  console.log(`🎯 Created ${1} goal with milestones`);
  console.log(`🏆 Created ${2} achievements with attestations`);
  console.log(`🔗 Created ${3} network connections`);
  console.log(`📊 Created ${401} analytics entries`);
  console.log('');
  console.log('🔑 Test Login Credentials:');
  console.log('Email: sarah.chen@techcorp.com');
  console.log('Password: password123');
  console.log('');
  console.log('🌐 Other test users:');
  console.log('- emily.chen@techcorp.com');
  console.log('- alex.wong@techcorp.com'); 
  console.log('- sarah.johnson@techcorp.com');
  console.log('- marcus.williams@techcorp.com');
  console.log('- jason.park@techcorp.com');
  console.log('(All with password: password123)');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });