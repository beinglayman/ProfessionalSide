const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function addMissingSkillsBatch2() {
  try {
    console.log('🔄 Adding missing skills to database - Batch 2 (Skill Enrichment)...\n');

    // Define missing skills identified from Batch 1 analysis
    const missingSkills = [
      // Brand & Design Skills
      { name: 'Brand Strategy', category: 'Design' },
      { name: 'Typography', category: 'Design' },
      { name: 'Design Systems', category: 'Design' },
      { name: 'User Experience Design', category: 'Design' },
      { name: 'Design Leadership', category: 'Design' },
      { name: 'Creative Strategy', category: 'Design' },
      { name: 'Design Thinking', category: 'Design' },
      { name: 'Presentation Skills', category: 'Soft Skills' },
      { name: 'Workshop Facilitation', category: 'Soft Skills' },

      // Technical Development Skills
      { name: 'REST APIs', category: 'Backend Development' },
      { name: 'Database Design', category: 'Database' },
      { name: 'API Design', category: 'Backend Development' },
      { name: 'Maven', category: 'Java' },
      { name: 'Composer', category: 'PHP' },
      { name: 'JSON', category: 'Data Formats' },
      { name: 'Responsive Design', category: 'Frontend Development' },
      { name: 'SCSS', category: 'Frontend Development' },
      { name: 'Flexbox', category: 'CSS' },
      { name: 'Media Queries', category: 'CSS' },
      { name: 'ES6', category: 'JavaScript' },
      { name: 'RxJS', category: 'Angular' },
      { name: 'DOM Manipulation', category: 'JavaScript' },
      { name: 'Web APIs', category: 'Frontend Development' },

      // Frontend Advanced
      { name: 'Service Workers', category: 'Progressive Web Apps' },
      { name: 'Web App Manifest', category: 'Progressive Web Apps' },

      // DevOps & Infrastructure
      { name: 'GitLab CI', category: 'CI/CD' },
      { name: 'Helm', category: 'Kubernetes' },
      { name: 'Container Security', category: 'Security' },
      { name: 'CloudFormation', category: 'AWS' },
      { name: 'AWS CDK', category: 'AWS' },
      { name: 'Database Optimization', category: 'Database' },
      { name: 'Backup and Recovery', category: 'Database' },
      { name: 'Network Security', category: 'Security' },
      { name: 'Security Scanning', category: 'Security' },

      // Monitoring & Observability
      { name: 'Prometheus', category: 'Monitoring' },
      { name: 'Grafana', category: 'Monitoring' },
      { name: 'ELK Stack', category: 'Logging' },
      { name: 'CloudWatch', category: 'AWS' },
      { name: 'Monitoring', category: 'DevOps' },
      { name: 'Alerting', category: 'DevOps' },
      { name: 'Incident Response', category: 'DevOps' },
      { name: 'Performance Optimization', category: 'Performance' },

      // Data Engineering & Big Data
      { name: 'Apache Airflow', category: 'Data Engineering' },
      { name: 'Apache Storm', category: 'Big Data' },
      { name: 'Apache Flink', category: 'Stream Processing' },
      { name: 'Hadoop', category: 'Big Data' },
      { name: 'Kafka', category: 'Streaming' },
      { name: 'Data Pipeline', category: 'Data Engineering' },
      { name: 'ETL', category: 'Data Engineering' },
      { name: 'Data Modeling', category: 'Data Engineering' },
      { name: 'Business Intelligence', category: 'Analytics' },
      { name: 'Streaming', category: 'Data Engineering' },
      { name: 'Real-time Analytics', category: 'Analytics' },
      { name: 'Data Validation', category: 'Data Quality' },
      { name: 'Data Profiling', category: 'Data Quality' },
      { name: 'Workflow Management', category: 'Data Engineering' },
      { name: 'Luigi', category: 'Data Engineering' },

      // Cloud Platforms
      { name: 'Azure', category: 'Cloud Platforms' },
      { name: 'Snowflake', category: 'Data Warehousing' },

      // Documentation & Communication
      { name: 'Technical Writing', category: 'Documentation' },
      { name: 'Documentation', category: 'Documentation' },
      { name: 'Confluence', category: 'Collaboration Tools' },

      // Finance Skills (preparing for future batches)
      { name: 'Financial Modeling', category: 'Finance' },
      { name: 'Financial Analysis', category: 'Finance' },
      { name: 'Budget Planning', category: 'Finance' },
      { name: 'Variance Analysis', category: 'Finance' },
      { name: 'Cost Accounting', category: 'Finance' },
      { name: 'Investment Analysis', category: 'Finance' },
      { name: 'Risk Assessment', category: 'Finance' },
      { name: 'Cash Flow Analysis', category: 'Finance' },

      // HR Skills (preparing for future batches)
      { name: 'Talent Acquisition', category: 'HR' },
      { name: 'Performance Management', category: 'HR' },
      { name: 'Employee Relations', category: 'HR' },
      { name: 'Compensation Analysis', category: 'HR' },
      { name: 'Training Development', category: 'HR' },
      { name: 'HR Analytics', category: 'HR' },
      { name: 'Organizational Development', category: 'HR' },
      { name: 'Succession Planning', category: 'HR' },

      // Marketing Skills (preparing for future batches)
      { name: 'Digital Marketing', category: 'Marketing' },
      { name: 'Social Media Marketing', category: 'Marketing' },
      { name: 'Email Marketing', category: 'Marketing' },
      { name: 'Marketing Analytics', category: 'Marketing' },
      { name: 'Campaign Management', category: 'Marketing' },
      { name: 'Brand Management', category: 'Marketing' },
      { name: 'Customer Segmentation', category: 'Marketing' },
      { name: 'Marketing Automation', category: 'Marketing' },

      // Sales Skills
      { name: 'Sales Process', category: 'Sales' },
      { name: 'Lead Generation', category: 'Sales' },
      { name: 'Customer Relationship Management', category: 'Sales' },
      { name: 'Sales Analytics', category: 'Sales' },
      { name: 'Negotiation', category: 'Sales' },
      { name: 'Account Management', category: 'Sales' },
      { name: 'Pipeline Management', category: 'Sales' },
      { name: 'Sales Forecasting', category: 'Sales' },

      // Operations Skills
      { name: 'Process Improvement', category: 'Operations' },
      { name: 'Supply Chain Management', category: 'Operations' },
      { name: 'Vendor Management', category: 'Operations' },
      { name: 'Quality Management', category: 'Operations' },
      { name: 'Inventory Management', category: 'Operations' },
      { name: 'Logistics', category: 'Operations' },
      { name: 'Procurement', category: 'Operations' },

      // Leadership Skills  
      { name: 'Team Leadership', category: 'Leadership' },
      { name: 'Strategic Planning', category: 'Leadership' },
      { name: 'Change Management', category: 'Leadership' },
      { name: 'Decision Making', category: 'Leadership' },
      { name: 'Conflict Resolution', category: 'Leadership' },
      { name: 'Coaching', category: 'Leadership' },
      { name: 'Performance Leadership', category: 'Leadership' },

      // Legal Skills
      { name: 'Contract Law', category: 'Legal' },
      { name: 'Regulatory Compliance', category: 'Legal' },
      { name: 'Legal Research', category: 'Legal' },
      { name: 'Intellectual Property Law', category: 'Legal' },
      { name: 'Employment Law', category: 'Legal' },
      { name: 'Corporate Law', category: 'Legal' },
      { name: 'Litigation Management', category: 'Legal' },

      // Product Management Skills
      { name: 'Product Strategy', category: 'Product Management' },
      { name: 'Product Analytics', category: 'Product Management' },
      { name: 'Roadmap Planning', category: 'Product Management' },
      { name: 'Feature Prioritization', category: 'Product Management' },
      { name: 'Stakeholder Management', category: 'Product Management' },
      { name: 'A/B Testing', category: 'Product Management' },
      { name: 'User Story Writing', category: 'Product Management' },

      // Strategy Skills
      { name: 'Strategic Analysis', category: 'Strategy' },
      { name: 'Business Strategy', category: 'Strategy' },
      { name: 'Market Analysis', category: 'Strategy' },
      { name: 'Competitive Strategy', category: 'Strategy' },
      { name: 'Digital Transformation', category: 'Strategy' },
      { name: 'Innovation Management', category: 'Strategy' },
      { name: 'Partnership Strategy', category: 'Strategy' }
    ];

    console.log(`🎯 Adding ${missingSkills.length} missing skills to database...`);
    console.log('');

    let skillsAdded = 0;
    let skillsSkipped = 0;

    for (const skill of missingSkills) {
      // Check if skill already exists (case-insensitive)
      const existingSkill = await prisma.skill.findFirst({
        where: {
          name: {
            equals: skill.name,
            mode: 'insensitive'
          }
        }
      });

      if (existingSkill) {
        console.log(`⚠️  Skill already exists: ${skill.name}`);
        skillsSkipped++;
        continue;
      }

      // Create the skill with proper ID generation
      try {
        // Generate a slug-based ID for consistency
        const skillId = skill.name
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
          .replace(/\s+/g, '-') // Replace spaces with hyphens
          .replace(/-+/g, '-') // Replace multiple hyphens with single
          .trim();

        await prisma.skill.create({
          data: {
            id: skillId,
            name: skill.name,
            category: skill.category
          }
        });

        console.log(`✅ Added skill: ${skill.name} (${skill.category})`);
        skillsAdded++;
      } catch (error) {
        console.log(`❌ Failed to add skill ${skill.name}: ${error.message}`);
      }
    }

    console.log('');
    console.log('📊 BATCH 2 SUMMARY:');
    console.log(`✅ Skills added: ${skillsAdded}`);
    console.log(`⚠️  Skills skipped (already exist): ${skillsSkipped}`);
    console.log('');

    // Verify total skill count
    const totalSkills = await prisma.skill.count();
    console.log(`📈 Total skills in database: ${totalSkills}`);
    console.log('');

    // Show skill distribution by category
    console.log('📋 Skills by category:');
    const skillsByCategory = await prisma.skill.groupBy({
      by: ['category'],
      _count: {
        category: true
      },
      orderBy: {
        _count: {
          category: 'desc'
        }
      }
    });

    skillsByCategory.forEach(cat => {
      console.log(`   ${cat.category || 'Uncategorized'}: ${cat._count.category} skills`);
    });

    console.log('');
    console.log('ℹ️  Skill database enriched for comprehensive work type mappings.');
    console.log('   Ready for Batch 3: Complete Design focus area coverage.');
    console.log('');
    console.log('✅ Batch 2 completed successfully!');

  } catch (error) {
    console.error('❌ Error adding missing skills:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the function
addMissingSkillsBatch2()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });