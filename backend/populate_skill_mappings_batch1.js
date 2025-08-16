const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function populateSkillMappingsBatch1() {
  try {
    console.log('🔄 Starting systematic skill mapping population - Batch 1 (Design & Development)...\n');

    // First, let's get all available skills to work with
    const allSkills = await prisma.skill.findMany({
      orderBy: { name: 'asc' }
    });

    console.log(`📋 Available skills in database: ${allSkills.length}`);
    console.log('');

    // Define comprehensive skill mappings for Design and Development focus areas
    const skillMappings = [
      // DESIGN FOCUS AREA - Brand Design
      {
        workTypeId: 'design-brand-design-brand-identity-design',
        skillNames: ['Adobe Illustrator', 'Adobe Photoshop', 'Figma', 'Brand Strategy']
      },
      {
        workTypeId: 'design-brand-design-brand-guidelines',
        skillNames: ['Adobe Illustrator', 'Figma', 'Brand Strategy', 'Typography']
      },
      {
        workTypeId: 'design-brand-design-brand-strategy',
        skillNames: ['Brand Strategy', 'Market Research', 'Competitive Analysis', 'Creative Strategy']
      },
      {
        workTypeId: 'design-brand-design-brand-messaging-design',
        skillNames: ['Content Marketing', 'Brand Strategy', 'Communication', 'Creative Strategy']
      },
      {
        workTypeId: 'design-brand-design-brand-application',
        skillNames: ['Adobe Illustrator', 'Adobe Photoshop', 'Figma', 'Brand Strategy']
      },
      {
        workTypeId: 'design-brand-design-brand-consistency',
        skillNames: ['Brand Strategy', 'Quality Assurance', 'Design Systems', 'Figma']
      },
      {
        workTypeId: 'design-brand-design-brand-evolution',
        skillNames: ['Brand Strategy', 'Market Research', 'Creative Strategy', 'Adobe Illustrator']
      },
      {
        workTypeId: 'design-brand-design-brand-experience-design',
        skillNames: ['User Experience Design', 'Brand Strategy', 'Figma', 'User Research']
      },

      // DESIGN FOCUS AREA - Design Collaboration
      {
        workTypeId: 'design-collaboration-stakeholder-presentations',
        skillNames: ['Presentation Skills', 'Figma', 'Communication', 'Project Management']
      },
      {
        workTypeId: 'design-collaboration-design-reviews-critiques',
        skillNames: ['Design Leadership', 'Communication', 'Mentoring', 'Quality Assurance']
      },
      {
        workTypeId: 'design-collaboration-cross-functional-alignment',
        skillNames: ['Project Management', 'Communication', 'Agile Methodology', 'Leadership']
      },
      {
        workTypeId: 'design-collaboration-design-workshops-facilitation',
        skillNames: ['Workshop Facilitation', 'Design Thinking', 'Communication', 'Leadership']
      },
      {
        workTypeId: 'design-collaboration-developer-collaboration',
        skillNames: ['HTML5', 'CSS3', 'JavaScript', 'Figma']
      },
      {
        workTypeId: 'design-collaboration-handoff-to-development',
        skillNames: ['Figma', 'Sketch', 'Zeplin', 'CSS3']
      },
      {
        workTypeId: 'design-collaboration-design-advocacy',
        skillNames: ['Communication', 'Leadership', 'Presentation Skills', 'Design Thinking']
      },
      {
        workTypeId: 'design-collaboration-design-documentation',
        skillNames: ['Technical Writing', 'Figma', 'Confluence', 'Documentation']
      },

      // DESIGN FOCUS AREA - Design Systems (sample mappings)
      {
        workTypeId: 'design-design-systems-component-library-design',
        skillNames: ['Figma', 'Design Systems', 'React', 'CSS3']
      },
      {
        workTypeId: 'design-design-systems-design-tokens',
        skillNames: ['Design Systems', 'CSS3', 'JSON', 'Figma']
      },
      {
        workTypeId: 'design-design-systems-component-design',
        skillNames: ['Figma', 'React', 'HTML5', 'CSS3']
      },
      {
        workTypeId: 'design-design-systems-design-system-governance',
        skillNames: ['Design Leadership', 'Process Improvement', 'Documentation', 'Quality Assurance']
      },

      // DEVELOPMENT FOCUS AREA - Backend Development
      {
        workTypeId: 'development-backend-development-api-development',
        skillNames: ['Node.js', 'Express.js', 'REST APIs', 'MongoDB']
      },
      {
        workTypeId: 'development-backend-development-node-js-development',
        skillNames: ['Node.js', 'Express.js', 'JavaScript', 'MongoDB']
      },
      {
        workTypeId: 'development-backend-development-python-development',
        skillNames: ['Python', 'Django', 'Flask', 'PostgreSQL']
      },
      {
        workTypeId: 'development-backend-development-java-development',
        skillNames: ['Java', 'Spring Boot', 'Maven', 'MySQL']
      },
      {
        workTypeId: 'development-backend-development-microservices-development',
        skillNames: ['Docker', 'Kubernetes', 'Node.js', 'API Design']
      },
      {
        workTypeId: 'development-backend-development-database-development',
        skillNames: ['SQL', 'PostgreSQL', 'MySQL', 'Database Design']
      },
      {
        workTypeId: 'development-backend-development-go-development',
        skillNames: ['Go', 'Docker', 'REST APIs', 'PostgreSQL']
      },
      {
        workTypeId: 'development-backend-development-ruby-development',
        skillNames: ['Ruby', 'Ruby on Rails', 'PostgreSQL', 'Redis']
      },
      {
        workTypeId: 'development-backend-development-php-development',
        skillNames: ['PHP', 'Laravel', 'MySQL', 'Composer']
      },
      {
        workTypeId: 'development-backend-development-c-sharp-development',
        skillNames: ['C#', 'ASP.NET Core', 'Entity Framework', 'SQL Server']
      },

      // DEVELOPMENT FOCUS AREA - Frontend Development
      {
        workTypeId: 'development-frontend-development-react-development',
        skillNames: ['React', 'JavaScript', 'HTML5', 'CSS3']
      },
      {
        workTypeId: 'development-frontend-development-vue-js-development',
        skillNames: ['Vue.js', 'JavaScript', 'HTML5', 'CSS3']
      },
      {
        workTypeId: 'development-frontend-development-angular-development',
        skillNames: ['Angular', 'TypeScript', 'RxJS', 'HTML5']
      },
      {
        workTypeId: 'development-frontend-development-javascript-development',
        skillNames: ['JavaScript', 'ES6', 'DOM Manipulation', 'Web APIs']
      },
      {
        workTypeId: 'development-frontend-development-typescript-development',
        skillNames: ['TypeScript', 'JavaScript', 'Node.js', 'React']
      },
      {
        workTypeId: 'development-frontend-development-html5-development',
        skillNames: ['HTML5', 'CSS3', 'JavaScript', 'Responsive Design']
      },
      {
        workTypeId: 'development-frontend-development-css-scss-development',
        skillNames: ['CSS3', 'SCSS', 'Responsive Design', 'Flexbox']
      },
      {
        workTypeId: 'development-frontend-development-responsive-web-design',
        skillNames: ['CSS3', 'HTML5', 'Media Queries', 'Flexbox']
      },
      {
        workTypeId: 'development-frontend-development-single-page-applications',
        skillNames: ['React', 'Vue.js', 'Angular', 'JavaScript']
      },
      {
        workTypeId: 'development-frontend-development-progressive-web-apps',
        skillNames: ['Service Workers', 'Web App Manifest', 'JavaScript', 'HTML5']
      },

      // DEVELOPMENT FOCUS AREA - DevOps & Infrastructure
      {
        workTypeId: 'development-devops-infrastructure-ci-cd-pipeline-development',
        skillNames: ['Jenkins', 'GitLab CI', 'Docker', 'Kubernetes']
      },
      {
        workTypeId: 'development-devops-infrastructure-cloud-infrastructure',
        skillNames: ['Amazon Web Services', 'Terraform', 'Docker', 'Kubernetes']
      },
      {
        workTypeId: 'development-devops-infrastructure-container-orchestration',
        skillNames: ['Kubernetes', 'Docker', 'Helm', 'Container Security']
      },
      {
        workTypeId: 'development-devops-infrastructure-infrastructure-as-code',
        skillNames: ['Terraform', 'CloudFormation', 'Ansible', 'AWS CDK']
      },
      {
        workTypeId: 'development-devops-infrastructure-database-administration',
        skillNames: ['PostgreSQL', 'MySQL', 'Database Optimization', 'Backup and Recovery']
      },
      {
        workTypeId: 'development-devops-infrastructure-security-operations',
        skillNames: ['Security Scanning', 'Container Security', 'Network Security', 'Compliance']
      },
      {
        workTypeId: 'development-devops-infrastructure-site-reliability-engineering',
        skillNames: ['Monitoring', 'Alerting', 'Incident Response', 'Performance Optimization']
      },
      {
        workTypeId: 'development-devops-infrastructure-monitoring-logging',
        skillNames: ['Prometheus', 'Grafana', 'ELK Stack', 'CloudWatch']
      },

      // DEVELOPMENT FOCUS AREA - Data Engineering
      {
        workTypeId: 'development-data-engineering-etl-pipeline-development',
        skillNames: ['Python', 'Apache Airflow', 'SQL', 'Data Pipeline']
      },
      {
        workTypeId: 'development-data-engineering-big-data-technologies',
        skillNames: ['Apache Spark', 'Hadoop', 'Kafka', 'Scala']
      },
      {
        workTypeId: 'development-data-engineering-data-warehouse-design',
        skillNames: ['SQL', 'Data Modeling', 'ETL', 'Business Intelligence']
      },
      {
        workTypeId: 'development-data-engineering-real-time-data-processing',
        skillNames: ['Apache Kafka', 'Apache Storm', 'Python', 'Streaming']
      },
      {
        workTypeId: 'development-data-engineering-cloud-data-platforms',
        skillNames: ['Amazon Web Services', 'Google Cloud Platform', 'Azure', 'Snowflake']
      },
      {
        workTypeId: 'development-data-engineering-stream-processing',
        skillNames: ['Apache Kafka', 'Apache Flink', 'Python', 'Real-time Analytics']
      },
      {
        workTypeId: 'development-data-engineering-data-quality-management',
        skillNames: ['Data Validation', 'SQL', 'Python', 'Data Profiling']
      },
      {
        workTypeId: 'development-data-engineering-data-pipeline-orchestration',
        skillNames: ['Apache Airflow', 'Luigi', 'Python', 'Workflow Management']
      }
    ];

    console.log(`🎯 Processing ${skillMappings.length} work type-skill mappings in Batch 1...`);
    console.log('');

    let totalMappingsAdded = 0;
    let totalMappingsSkipped = 0;
    let workTypesNotFound = 0;
    let skillsNotFound = 0;

    for (const mapping of skillMappings) {
      // Verify work type exists
      const workType = await prisma.workType.findUnique({
        where: { id: mapping.workTypeId }
      });

      if (!workType) {
        console.log(`❌ Work type not found: ${mapping.workTypeId}`);
        workTypesNotFound++;
        continue;
      }

      console.log(`📌 Processing work type: ${workType.label}`);

      for (const skillName of mapping.skillNames) {
        // Find the skill by name (case-insensitive)
        const skill = allSkills.find(s => 
          s.name.toLowerCase() === skillName.toLowerCase()
        );

        if (!skill) {
          console.log(`   ⚠️  Skill not found in database: "${skillName}"`);
          skillsNotFound++;
          continue;
        }

        // Check if mapping already exists
        const existingMapping = await prisma.workTypeSkill.findUnique({
          where: {
            workTypeId_skillId: {
              workTypeId: mapping.workTypeId,
              skillId: skill.id
            }
          }
        });

        if (existingMapping) {
          console.log(`   ⚠️  Mapping already exists: ${skillName}`);
          totalMappingsSkipped++;
          continue;
        }

        // Create the mapping
        try {
          await prisma.workTypeSkill.create({
            data: {
              workTypeId: mapping.workTypeId,
              skillId: skill.id
            }
          });

          console.log(`   ✅ Added skill mapping: ${skillName}`);
          totalMappingsAdded++;
        } catch (error) {
          console.log(`   ❌ Failed to add mapping for ${skillName}: ${error.message}`);
        }
      }
      console.log('');
    }

    console.log('📊 BATCH 1 SUMMARY:');
    console.log(`✅ Skill mappings added: ${totalMappingsAdded}`);
    console.log(`⚠️  Skill mappings skipped (already exist): ${totalMappingsSkipped}`);
    console.log(`❌ Work types not found: ${workTypesNotFound}`);
    console.log(`❌ Skills not found in database: ${skillsNotFound}`);
    console.log('');

    // Quick verification of progress
    console.log('🔍 Checking progress on some updated work types...');
    
    const sampleChecks = [
      'development-backend-development-react-development',
      'development-frontend-development-react-development', 
      'design-brand-design-brand-strategy'
    ];

    for (const workTypeId of sampleChecks) {
      const workTypeWithSkills = await prisma.workType.findUnique({
        where: { id: workTypeId },
        include: {
          workTypeSkills: {
            include: {
              skill: true
            }
          }
        }
      });

      if (workTypeWithSkills) {
        console.log(`✅ ${workTypeWithSkills.label}: ${workTypeWithSkills.workTypeSkills.length} skills`);
        workTypeWithSkills.workTypeSkills.forEach(wts => {
          console.log(`   • ${wts.skill.name}`);
        });
      }
    }

    console.log('');
    console.log('ℹ️  Batch 1 focuses on Design and Development foundation skills.');
    console.log('   Next batches will cover Finance, HR, Marketing, Operations, etc.');
    console.log('');
    console.log('✅ Batch 1 completed successfully!');

  } catch (error) {
    console.error('❌ Error populating skill mappings:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the function
populateSkillMappingsBatch1()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });