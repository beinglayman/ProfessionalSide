import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Hash password for users
  const hashedPassword = await bcrypt.hash('password123', 12);

  // Create organizations
  const techCorp = await prisma.organization.upsert({
    where: { domain: 'techcorp.com' },
    update: {},
    create: {
      name: 'TechCorp Inc.',
      domain: 'techcorp.com',
      description: 'A leading technology company',
      logo: 'https://example.com/techcorp-logo.png'
    }
  });

  const innovateHub = await prisma.organization.upsert({
    where: { domain: 'innovatehub.io' },
    update: {},
    create: {
      name: 'Innovate Hub',
      domain: 'innovatehub.io',
      description: 'Innovation and startup incubator'
    }
  });

  // Create workspaces
  const engineeringWorkspace = await prisma.workspace.upsert({
    where: { id: 'engineering-workspace' },
    update: {},
    create: {
      id: 'engineering-workspace',
      name: 'Engineering Team',
      description: 'Software engineering and development workspace',
      organizationId: techCorp.id
    }
  });

  const productWorkspace = await prisma.workspace.upsert({
    where: { id: 'product-workspace' },
    update: {},
    create: {
      id: 'product-workspace',
      name: 'Product Team',
      description: 'Product management and design workspace',
      organizationId: techCorp.id
    }
  });

  const startupWorkspace = await prisma.workspace.upsert({
    where: { id: 'startup-workspace' },
    update: {},
    create: {
      id: 'startup-workspace',
      name: 'Startup Founders',
      description: 'Workspace for startup founders and entrepreneurs',
      organizationId: innovateHub.id
    }
  });

  // Create users
  const sarah = await prisma.user.upsert({
    where: { email: 'sarah.chen@techcorp.com' },
    update: {},
    create: {
      email: 'sarah.chen@techcorp.com',
      password: hashedPassword,
      name: 'Sarah Chen',
      title: 'Senior Software Engineer',
      company: 'TechCorp Inc.',
      location: 'San Francisco, CA',
      bio: 'Passionate about building scalable web applications and mentoring junior developers.',
      isActive: true
    }
  });

  const john = await prisma.user.upsert({
    where: { email: 'john.doe@techcorp.com' },
    update: {},
    create: {
      email: 'john.doe@techcorp.com',
      password: hashedPassword,
      name: 'John Doe',
      title: 'Product Manager',
      company: 'TechCorp Inc.',
      location: 'New York, NY',
      bio: 'Product strategist with 8 years of experience in tech startups and enterprise software.',
      isActive: true
    }
  });

  const emily = await prisma.user.upsert({
    where: { email: 'emily.johnson@innovatehub.io' },
    update: {},
    create: {
      email: 'emily.johnson@innovatehub.io',
      password: hashedPassword,
      name: 'Emily Johnson',
      title: 'Startup Founder',
      company: 'Innovate Hub',
      location: 'Austin, TX',
      bio: 'Serial entrepreneur and investor, focused on AI and machine learning startups.',
      isActive: true
    }
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@inchronicle.com' },
    update: {},
    create: {
      email: 'admin@inchronicle.com',
      password: hashedPassword,
      name: 'System Administrator',
      title: 'Platform Admin',
      company: 'InChronicle',
      location: 'Remote',
      bio: 'System administrator for the InChronicle platform.',
      isActive: true
    }
  });

  // Create user profiles
  await prisma.userProfile.upsert({
    where: { userId: sarah.id },
    update: {},
    create: {
      userId: sarah.id,
      profileCompleteness: 85,
      showEmail: false,
      showLocation: true,
      showCompany: true
    }
  });

  // Create work experiences for Sarah
  await prisma.workExperience.upsert({
    where: { id: 'sarah-exp-1' },
    update: {},
    create: {
      id: 'sarah-exp-1',
      userId: sarah.id,
      company: 'TechCorp Inc.',
      title: 'Senior Software Engineer',
      location: 'San Francisco, CA',
      startDate: '2021-03',
      isCurrentRole: true,
      description: 'Lead development of microservices architecture and mentor junior developers.',
      achievements: [
        'Led migration from monolith to microservices',
        'Mentored 5 junior developers',
        'Reduced deployment time by 50%'
      ],
      skills: ['JavaScript', 'Node.js', 'Microservices', 'Leadership']
    }
  });

  await prisma.workExperience.upsert({
    where: { id: 'sarah-exp-2' },
    update: {},
    create: {
      id: 'sarah-exp-2',
      userId: sarah.id,
      company: 'StartupXYZ',
      title: 'Full Stack Developer',
      location: 'Remote',
      startDate: '2019-06',
      endDate: '2021-02',
      isCurrentRole: false,
      description: 'Built customer-facing web applications using React and Node.js.',
      achievements: [
        'Built 3 major customer features',
        'Improved application performance by 40%'
      ],
      skills: ['React', 'Node.js', 'JavaScript', 'Full Stack']
    }
  });

  // Create education for Sarah
  await prisma.education.upsert({
    where: { id: 'sarah-edu-1' },
    update: {},
    create: {
      id: 'sarah-edu-1',
      userId: sarah.id,
      institution: 'Stanford University',
      degree: 'MS Computer Science',
      fieldOfStudy: 'Computer Science',
      location: 'Stanford, CA',
      startYear: '2017',
      endYear: '2019',
      isCurrentlyStudying: false,
      activities: ['Computer Science Graduate Association', 'AI Research Lab']
    }
  });

  await prisma.education.upsert({
    where: { id: 'sarah-edu-2' },
    update: {},
    create: {
      id: 'sarah-edu-2',
      userId: sarah.id,
      institution: 'UC Berkeley',
      degree: 'BS Computer Science',
      fieldOfStudy: 'Computer Science',
      location: 'Berkeley, CA',
      startYear: '2013',
      endYear: '2017',
      isCurrentlyStudying: false,
      activities: ['ACM Student Chapter', 'Women in Tech']
    }
  });

  await prisma.userProfile.upsert({
    where: { userId: john.id },
    update: {},
    create: {
      userId: john.id,
      profileCompleteness: 90,
      showEmail: true,
      showLocation: true,
      showCompany: true
    }
  });

  // Create work experience for John
  await prisma.workExperience.upsert({
    where: { id: 'john-exp-1' },
    update: {},
    create: {
      id: 'john-exp-1',
      userId: john.id,
      company: 'TechCorp Inc.',
      title: 'Product Manager',
      location: 'New York, NY',
      startDate: '2020-01',
      isCurrentRole: true,
      description: 'Lead product strategy and roadmap for B2B SaaS platform.',
      achievements: [
        'Increased user engagement by 25%',
        'Launched 3 major product features',
        'Reduced customer churn by 15%'
      ],
      skills: ['Product Management', 'Analytics', 'Leadership', 'Strategy']
    }
  });

  await prisma.userProfile.upsert({
    where: { userId: emily.id },
    update: {},
    create: {
      userId: emily.id,
      profileCompleteness: 80,
      showEmail: false,
      showLocation: true,
      showCompany: true
    }
  });

  // Create work experience for Emily
  await prisma.workExperience.upsert({
    where: { id: 'emily-exp-1' },
    update: {},
    create: {
      id: 'emily-exp-1',
      userId: emily.id,
      company: 'Innovate Hub',
      title: 'Startup Founder',
      location: 'Austin, TX',
      startDate: '2018-06',
      isCurrentRole: true,
      description: 'Founded and lead AI/ML startup focused on business automation.',
      achievements: [
        'Raised $2M in seed funding',
        'Acquired 50+ enterprise clients',
        'Built team of 15 engineers'
      ],
      skills: ['Entrepreneurship', 'AI/ML', 'Leadership', 'Fundraising']
    }
  });

  // Create skills
  const skills = [
    { id: 'javascript', name: 'JavaScript', category: 'Technical' },
    { id: 'react', name: 'React', category: 'Technical' },
    { id: 'nodejs', name: 'Node.js', category: 'Technical' },
    { id: 'python', name: 'Python', category: 'Technical' },
    { id: 'product-management', name: 'Product Management', category: 'Professional' },
    { id: 'leadership', name: 'Leadership', category: 'Soft' },
    { id: 'communication', name: 'Communication', category: 'Soft' },
    { id: 'machine-learning', name: 'Machine Learning', category: 'Technical' },
    { id: 'entrepreneurship', name: 'Entrepreneurship', category: 'Professional' }
  ];

  for (const skillData of skills) {
    await prisma.skill.upsert({
      where: { name: skillData.name },
      update: {},
      create: skillData
    });
  }

  // Add skills to users
  const jsSkill = await prisma.skill.findUnique({ where: { name: 'JavaScript' } });
  const reactSkill = await prisma.skill.findUnique({ where: { name: 'React' } });
  const nodeSkill = await prisma.skill.findUnique({ where: { name: 'Node.js' } });
  const pmSkill = await prisma.skill.findUnique({ where: { name: 'Product Management' } });
  const leadershipSkill = await prisma.skill.findUnique({ where: { name: 'Leadership' } });

  if (jsSkill) {
    await prisma.userSkill.upsert({
      where: { userId_skillId: { userId: sarah.id, skillId: jsSkill.id } },
      update: {},
      create: {
        userId: sarah.id,
        skillId: jsSkill.id,
        level: 'expert',
        endorsements: 15,
        yearsOfExp: 6
      }
    });
  }

  if (reactSkill) {
    await prisma.userSkill.upsert({
      where: { userId_skillId: { userId: sarah.id, skillId: reactSkill.id } },
      update: {},
      create: {
        userId: sarah.id,
        skillId: reactSkill.id,
        level: 'advanced',
        endorsements: 12,
        yearsOfExp: 4
      }
    });
  }

  if (pmSkill) {
    await prisma.userSkill.upsert({
      where: { userId_skillId: { userId: john.id, skillId: pmSkill.id } },
      update: {},
      create: {
        userId: john.id,
        skillId: pmSkill.id,
        level: 'expert',
        endorsements: 20,
        yearsOfExp: 8
      }
    });
  }

  // Create workspace memberships
  await prisma.workspaceMember.upsert({
    where: { userId_workspaceId: { userId: sarah.id, workspaceId: engineeringWorkspace.id } },
    update: {},
    create: {
      userId: sarah.id,
      workspaceId: engineeringWorkspace.id,
      role: 'admin'
    }
  });

  await prisma.workspaceMember.upsert({
    where: { userId_workspaceId: { userId: john.id, workspaceId: productWorkspace.id } },
    update: {},
    create: {
      userId: john.id,
      workspaceId: productWorkspace.id,
      role: 'owner'
    }
  });

  await prisma.workspaceMember.upsert({
    where: { userId_workspaceId: { userId: john.id, workspaceId: engineeringWorkspace.id } },
    update: {},
    create: {
      userId: john.id,
      workspaceId: engineeringWorkspace.id,
      role: 'member'
    }
  });

  await prisma.workspaceMember.upsert({
    where: { userId_workspaceId: { userId: emily.id, workspaceId: startupWorkspace.id } },
    update: {},
    create: {
      userId: emily.id,
      workspaceId: startupWorkspace.id,
      role: 'owner'
    }
  });

  // Create notification preferences
  await prisma.notificationPreferences.upsert({
    where: { userId: sarah.id },
    update: {},
    create: {
      userId: sarah.id,
      emailNotifications: true,
      pushNotifications: true,
      likes: true,
      comments: true,
      mentions: true,
      workspaceInvites: true,
      achievements: true,
      systemUpdates: true,
      digestFrequency: 'DAILY'
    }
  });

  await prisma.notificationPreferences.upsert({
    where: { userId: john.id },
    update: {},
    create: {
      userId: john.id,
      emailNotifications: true,
      pushNotifications: false,
      likes: true,
      comments: true,
      mentions: true,
      workspaceInvites: true,
      achievements: true,
      systemUpdates: false,
      digestFrequency: 'WEEKLY'
    }
  });

  // Create some sample journal entries
  const journalEntry1 = await prisma.journalEntry.create({
    data: {
      title: 'Implementing Microservices Architecture',
      description: 'Today I worked on breaking down our monolithic application into microservices. This is a major architectural shift that will improve scalability.',
      fullContent: `# Implementing Microservices Architecture

Today I worked on breaking down our monolithic application into microservices. This is a major architectural shift that will improve scalability.

## What I accomplished:
- Identified service boundaries
- Created the first user service API
- Set up Docker containers for each service
- Implemented service discovery with Consul

## Challenges faced:
- Data consistency across services
- Network latency considerations
- Service communication patterns

## Next steps:
- Implement API gateway
- Add monitoring and logging
- Plan data migration strategy

This is an exciting project that will set us up for future growth.`,
      authorId: sarah.id,
      workspaceId: engineeringWorkspace.id,
      visibility: 'workspace',
      isPublished: true,
      publishedAt: new Date(),
      category: 'Architecture',
      tags: ['microservices', 'architecture', 'scalability'],
      skills: ['Node.js', 'Docker', 'API Design']
    }
  });

  const journalEntry2 = await prisma.journalEntry.create({
    data: {
      title: 'Product Roadmap Q1 Planning',
      description: 'Completed our Q1 product roadmap planning session with the engineering team. Focused on user experience improvements and new feature development.',
      fullContent: `# Product Roadmap Q1 Planning

Completed our Q1 product roadmap planning session with the engineering team.

## Key outcomes:
- Prioritized 5 major features for Q1
- Allocated resources for technical debt reduction
- Planned user research sessions

## Features planned:
1. Advanced search functionality
2. Real-time collaboration features
3. Mobile app improvements
4. Analytics dashboard
5. API rate limiting

The team is excited about these improvements and we expect to see significant user engagement increases.`,
      authorId: john.id,
      workspaceId: productWorkspace.id,
      visibility: 'workspace',
      isPublished: true,
      publishedAt: new Date(),
      category: 'Planning',
      tags: ['roadmap', 'planning', 'features'],
      skills: ['Product Management', 'Planning']
    }
  });

  // Create some goals
  await prisma.goal.create({
    data: {
      title: 'Complete Microservices Migration',
      description: 'Successfully migrate our monolithic application to a microservices architecture by end of Q2',
      targetDate: new Date('2024-06-30'),
      progress: 25,
      category: 'Technical',
      priority: 'high',
      visibility: 'workspace',
      userId: sarah.id,
      workspaceId: engineeringWorkspace.id
    }
  });

  await prisma.goal.create({
    data: {
      title: 'Increase User Engagement by 30%',
      description: 'Implement new features and improvements to increase daily active users by 30%',
      targetDate: new Date('2024-03-31'),
      progress: 15,
      category: 'Product',
      priority: 'high',
      visibility: 'workspace',
      userId: john.id,
      workspaceId: productWorkspace.id
    }
  });

  // Create some achievements
  await prisma.achievement.create({
    data: {
      title: 'Architecture Excellence',
      description: 'Successfully designed and implemented a scalable microservices architecture',
      impact: 'Improved system scalability by 300% and reduced deployment time by 50%',
      skills: ['Architecture', 'Microservices', 'Leadership'],
      status: 'completed',
      userId: sarah.id
    }
  });

  await prisma.achievement.create({
    data: {
      title: 'Product Launch Success',
      description: 'Led the successful launch of 3 major product features in Q4',
      impact: 'Increased user engagement by 25% and reduced churn by 15%',
      skills: ['Product Management', 'Leadership', 'Analytics'],
      status: 'completed',
      userId: john.id
    }
  });

  console.log('✅ Database seeding completed successfully!');
  console.log('');
  console.log('👥 Created users:');
  console.log('   📧 sarah.chen@techcorp.com (password: password123)');
  console.log('   📧 john.doe@techcorp.com (password: password123)');
  console.log('   📧 emily.johnson@innovatehub.io (password: password123)');
  console.log('   📧 admin@inchronicle.com (password: password123) - Admin user');
  console.log('');
  console.log('🏢 Created organizations: TechCorp Inc., Innovate Hub');
  console.log('👥 Created workspaces: Engineering Team, Product Team, Startup Founders');
  console.log('📝 Created sample journal entries and goals');
  console.log('🎯 Created sample achievements');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });