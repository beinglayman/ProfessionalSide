const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Simplified but comprehensive reference data
const data = {
  focusAreas: [
    { id: 'engineering', label: 'Engineering', description: 'Software development and technical roles' },
    { id: 'product', label: 'Product', description: 'Product management and strategy' },
    { id: 'design', label: 'Design', description: 'UX/UI and creative design' },
    { id: 'marketing', label: 'Marketing', description: 'Marketing and growth' },
    { id: 'sales', label: 'Sales', description: 'Sales and business development' },
    { id: 'operations', label: 'Operations', description: 'Operations and logistics' },
    { id: 'finance', label: 'Finance', description: 'Finance and accounting' },
    { id: 'people', label: 'People', description: 'HR and people operations' }
  ],
  
  // Categories and work types grouped by focus area
  categories: {
    engineering: [
      { 
        id: 'frontend-eng', label: 'Frontend Development',
        workTypes: ['UI Implementation', 'State Management', 'Frontend Performance', 'Responsive Design', 'Accessibility']
      },
      {
        id: 'backend-eng', label: 'Backend Development',
        workTypes: ['API Development', 'Database Design', 'Business Logic', 'Authentication', 'Caching']
      },
      {
        id: 'devops', label: 'DevOps',
        workTypes: ['CI/CD Pipeline', 'Infrastructure', 'Monitoring', 'Deployment', 'Containerization']
      },
      {
        id: 'testing', label: 'Testing & QA',
        workTypes: ['Unit Testing', 'Integration Testing', 'E2E Testing', 'Performance Testing', 'Test Automation']
      }
    ],
    product: [
      {
        id: 'product-strategy', label: 'Product Strategy',
        workTypes: ['Product Roadmap', 'Market Research', 'Competitive Analysis', 'Product Vision', 'OKRs']
      },
      {
        id: 'product-execution', label: 'Product Execution',
        workTypes: ['Feature Definition', 'User Stories', 'Sprint Planning', 'Backlog Management', 'Stakeholder Management']
      }
    ],
    design: [
      {
        id: 'ux-design', label: 'UX Design',
        workTypes: ['User Research', 'Wireframing', 'Prototyping', 'User Testing', 'Information Architecture']
      },
      {
        id: 'ui-design', label: 'UI Design',
        workTypes: ['Visual Design', 'Design Systems', 'Iconography', 'Typography', 'Color Theory']
      }
    ],
    marketing: [
      {
        id: 'growth', label: 'Growth Marketing',
        workTypes: ['SEO', 'Content Marketing', 'Email Marketing', 'Social Media', 'Analytics']
      },
      {
        id: 'brand', label: 'Brand & Communications',
        workTypes: ['Brand Strategy', 'PR', 'Content Creation', 'Copywriting', 'Community Management']
      }
    ],
    sales: [
      {
        id: 'sales-strategy', label: 'Sales Strategy',
        workTypes: ['Sales Planning', 'Territory Management', 'Pipeline Development', 'Forecasting', 'Sales Enablement']
      },
      {
        id: 'sales-execution', label: 'Sales Execution',
        workTypes: ['Prospecting', 'Demo/Presentation', 'Negotiation', 'Closing', 'Account Management']
      }
    ],
    operations: [
      {
        id: 'ops-management', label: 'Operations Management',
        workTypes: ['Process Optimization', 'Resource Planning', 'Vendor Management', 'Quality Control', 'Supply Chain']
      }
    ],
    finance: [
      {
        id: 'financial-planning', label: 'Financial Planning',
        workTypes: ['Budgeting', 'Forecasting', 'Financial Modeling', 'Cost Analysis', 'Reporting']
      }
    ],
    people: [
      {
        id: 'talent-acquisition', label: 'Talent Acquisition',
        workTypes: ['Recruiting', 'Interviewing', 'Onboarding', 'Employer Branding', 'Talent Pipeline']
      },
      {
        id: 'people-ops', label: 'People Operations',
        workTypes: ['Performance Management', 'Compensation', 'Benefits', 'Employee Relations', 'Culture']
      }
    ]
  }
};

async function seed() {
  console.log('🌱 Starting optimized reference data seeding...\n');
  
  try {
    // Step 1: Upsert Focus Areas (already done, but ensure they exist)
    console.log('📝 Ensuring Focus Areas exist...');
    for (const fa of data.focusAreas) {
      await prisma.focusArea.upsert({
        where: { id: fa.id },
        update: {},
        create: fa
      });
    }
    console.log(`✅ ${data.focusAreas.length} Focus Areas ready\n`);
    
    // Step 2: Batch insert Work Categories and Types
    console.log('📂 Seeding Work Categories and Types...');
    let totalCategories = 0;
    let totalWorkTypes = 0;
    
    for (const [focusAreaId, categories] of Object.entries(data.categories)) {
      const focusArea = await prisma.focusArea.findUnique({ where: { id: focusAreaId } });
      if (!focusArea) {
        console.log(`⚠️  Skipping ${focusAreaId} - focus area not found`);
        continue;
      }
      
      for (const category of categories) {
        // Create category
        const cat = await prisma.workCategory.upsert({
          where: { id: category.id },
          update: {},
          create: {
            id: category.id,
            label: category.label,
            focusAreaId: focusArea.id
          }
        });
        totalCategories++;
        
        // Batch create work types for this category
        const workTypesToCreate = category.workTypes.map(label => ({
          label,
          workCategoryId: cat.id
        }));
        
        await prisma.workType.createMany({
          data: workTypesToCreate,
          skipDuplicates: true
        });
        totalWorkTypes += workTypesToCreate.length;
        
        process.stdout.write(`  ${focusArea.label}: ${category.label} (${workTypesToCreate.length} types)\n`);
      }
    }
    
    console.log(`\n✅ Created ${totalCategories} categories with ${totalWorkTypes} work types\n`);
    
    // Step 3: Create common skills (batch insert)
    console.log('🎯 Seeding common skills...');
    const commonSkills = [
      // Communication
      'Written Communication', 'Verbal Communication', 'Presentation Skills', 'Active Listening', 'Negotiation',
      // Leadership
      'Team Leadership', 'Mentoring', 'Delegation', 'Strategic Thinking', 'Decision Making',
      // Technical
      'JavaScript', 'Python', 'TypeScript', 'React', 'Node.js', 'SQL', 'Git', 'Docker', 'AWS', 'API Design',
      // Product/Project
      'Project Management', 'Agile/Scrum', 'Product Strategy', 'Roadmap Planning', 'Stakeholder Management',
      // Design
      'Figma', 'Sketch', 'UI Design', 'UX Research', 'Prototyping', 'Design Systems',
      // Analysis
      'Data Analysis', 'Problem Solving', 'Critical Thinking', 'Research', 'Analytics',
      // Business
      'Business Strategy', 'Financial Analysis', 'Market Research', 'Customer Success', 'Sales'
    ];
    
    const skillsToCreate = commonSkills.map(name => ({ name }));
    await prisma.skill.createMany({
      data: skillsToCreate,
      skipDuplicates: true
    });
    
    console.log(`✅ Created ${commonSkills.length} common skills\n`);
    
    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 Seeding completed successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✓ ${data.focusAreas.length} Focus Areas`);
    console.log(`✓ ${totalCategories} Work Categories`);
    console.log(`✓ ${totalWorkTypes} Work Types`);
    console.log(`✓ ${commonSkills.length} Skills`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seed();
