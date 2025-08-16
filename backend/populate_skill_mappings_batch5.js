const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function populateSkillMappingsBatch5() {
  try {
    console.log('🔄 Starting Batch 5: Development Focus Area Completion...\n');

    // Get all available skills to work with
    const allSkills = await prisma.skill.findMany({
      orderBy: { name: 'asc' }
    });

    console.log(`📋 Available skills in database: ${allSkills.length}`);
    console.log('');

    // Targeted skill mappings for Development work types needing skills
    const skillMappings = [
      // ARCHITECTURE - Critical areas with 0 skills
      {
        workTypeId: 'development-architecture-api-gateway-design',
        skillNames: ['API Design', 'Microservices', 'System Design', 'REST APIs']
      },
      {
        workTypeId: 'development-architecture-architecture-patterns',
        skillNames: ['System Design', 'Software Architecture', 'Design Patterns', 'Microservices']
      },
      {
        workTypeId: 'development-architecture-data-architecture',
        skillNames: ['SQL', 'Database Design', 'Data Modeling', 'System Design']
      },
      {
        workTypeId: 'development-architecture-performance-optimization',
        skillNames: ['Performance Optimization', 'System Design', 'Database Optimization', 'Caching']
      },
      {
        workTypeId: 'development-architecture-scalability-planning',
        skillNames: ['System Design', 'Microservices', 'Cloud Architecture', 'Performance Optimization']
      },
      {
        workTypeId: 'development-architecture-security-implementation',
        skillNames: ['Security', 'Network Security', 'Authentication', 'Encryption']
      },
      {
        workTypeId: 'development-architecture-system-design',
        skillNames: ['System Design', 'Software Architecture', 'Microservices', 'Cloud Architecture']
      },
      {
        workTypeId: 'development-architecture-technical-debt',
        skillNames: ['Code Review', 'Refactoring', 'Software Architecture', 'Technical Leadership']
      },

      // BACKEND - Areas needing 1 more skill
      {
        workTypeId: 'development-backend-authentication-authorization',
        skillNames: ['Node.js', 'Python', 'Java', 'Security']
      },
      {
        workTypeId: 'development-backend-integrations',
        skillNames: ['Node.js', 'Python', 'Java', 'API Design']
      },
      {
        workTypeId: 'development-backend-api-development',
        skillNames: ['REST APIs', 'API Design', 'Node.js', 'Database Design']
      },

      // BACKEND DEVELOPMENT - Areas needing 1 more skill
      {
        workTypeId: 'development-backend-development-c-sharp-development',
        skillNames: ['C#', 'ASP.NET Core', 'Microsoft Azure', 'Entity Framework']
      },
      {
        workTypeId: 'development-backend-development-java-development',
        skillNames: ['Java', 'Spring Boot', 'MySQL', 'Maven']
      },

      // CODE DOCUMENTATION - All areas with 0 skills
      {
        workTypeId: 'development-code-documentation-api-documentation',
        skillNames: ['Technical Writing', 'API Design', 'Documentation', 'REST APIs']
      },
      {
        workTypeId: 'development-code-documentation-architecture-documentation',
        skillNames: ['Technical Writing', 'Software Architecture', 'Documentation', 'System Design']
      },
      {
        workTypeId: 'development-code-documentation-code-comments-annotations',
        skillNames: ['Technical Writing', 'Code Review', 'Documentation', 'Software Development']
      },
      {
        workTypeId: 'development-code-documentation-code-standards-documentation',
        skillNames: ['Technical Writing', 'Code Review', 'Documentation', 'Best Practices']
      },
      {
        workTypeId: 'development-code-documentation-developer-guides',
        skillNames: ['Technical Writing', 'Documentation', 'Developer Experience', 'Knowledge Sharing']
      },
      {
        workTypeId: 'development-code-documentation-developer-onboarding-docs',
        skillNames: ['Technical Writing', 'Documentation', 'Training Development', 'Developer Experience']
      },
      {
        workTypeId: 'development-code-documentation-release-notes',
        skillNames: ['Technical Writing', 'Documentation', 'Product Management', 'Communication']
      },
      {
        workTypeId: 'development-code-documentation-system-diagrams',
        skillNames: ['Technical Writing', 'System Design', 'Documentation', 'Visual Design']
      },

      // DATA ENGINEERING - Critical areas with 0 skills
      {
        workTypeId: 'development-data-engineering-analytics-implementation',
        skillNames: ['Python', 'SQL', 'Data Analysis', 'Business Intelligence']
      },
      {
        workTypeId: 'development-data-engineering-big-data-processing',
        skillNames: ['Apache Spark', 'Python', 'Big Data', 'Distributed Systems']
      },
      {
        workTypeId: 'development-data-engineering-data-migration',
        skillNames: ['SQL', 'Python', 'Data Engineering', 'ETL']
      },
      {
        workTypeId: 'development-data-engineering-data-modeling',
        skillNames: ['Data Modeling', 'SQL', 'Database Design', 'Business Intelligence']
      },
      {
        workTypeId: 'development-data-engineering-data-pipeline-orchestration',
        skillNames: ['Python', 'SQL', 'Amazon Web Services', 'Apache Airflow']
      },
      {
        workTypeId: 'development-data-engineering-data-quality-validation',
        skillNames: ['Data Validation', 'Python', 'SQL', 'Data Quality']
      },
      {
        workTypeId: 'development-data-engineering-data-warehousing',
        skillNames: ['SQL', 'Data Modeling', 'ETL', 'Business Intelligence']
      },
      {
        workTypeId: 'development-data-engineering-etl-pipeline-development',
        skillNames: ['Python', 'SQL', 'ETL', 'Apache Airflow']
      },
      {
        workTypeId: 'development-data-engineering-real-time-data-pipelines',
        skillNames: ['Apache Kafka', 'Python', 'Streaming', 'Real-time Systems']
      },

      // DEVOPS - Areas needing skills
      {
        workTypeId: 'development-devops-cloud-configuration',
        skillNames: ['Amazon Web Services', 'Microsoft Azure', 'Google Cloud Platform', 'Terraform']
      },
      {
        workTypeId: 'development-devops-containerization',
        skillNames: ['Docker', 'Kubernetes', 'Container Orchestration', 'DevOps']
      },
      {
        workTypeId: 'development-devops-environment-setup',
        skillNames: ['Docker', 'Kubernetes', 'Terraform', 'Infrastructure as Code']
      },
      {
        workTypeId: 'development-devops-infrastructure-as-code',
        skillNames: ['Terraform', 'Infrastructure as Code', 'Cloud Infrastructure', 'DevOps']
      },
      {
        workTypeId: 'development-devops-monitoring-logging',
        skillNames: ['Monitoring', 'ELK Stack', 'Prometheus', 'Grafana']
      },
      {
        workTypeId: 'development-devops-security-automation',
        skillNames: ['Security', 'DevOps', 'Automation', 'Infrastructure Security']
      },

      // DEVOPS & INFRASTRUCTURE - Areas needing skills
      {
        workTypeId: 'development-devops-infrastructure-monitoring-logging',
        skillNames: ['Elasticsearch', 'Amazon Web Services', 'Monitoring', 'ELK Stack']
      },

      // DEVELOPMENT TESTING - All areas with 0 skills
      {
        workTypeId: 'development-development-testing-accessibility-testing',
        skillNames: ['Accessibility Testing', 'Quality Assurance', 'Web Accessibility', 'Testing']
      },
      {
        workTypeId: 'development-development-testing-end-to-end-testing',
        skillNames: ['End-to-End Testing', 'Test Automation', 'Quality Assurance', 'Testing Frameworks']
      },
      {
        workTypeId: 'development-development-testing-integration-testing',
        skillNames: ['Integration Testing', 'Quality Assurance', 'Test Automation', 'API Testing']
      },
      {
        workTypeId: 'development-development-testing-performance-testing',
        skillNames: ['Performance Testing', 'Load Testing', 'Quality Assurance', 'Testing Tools']
      },
      {
        workTypeId: 'development-development-testing-security-testing',
        skillNames: ['Security Testing', 'Quality Assurance', 'Penetration Testing', 'Security']
      },
      {
        workTypeId: 'development-development-testing-snapshot-testing',
        skillNames: ['Snapshot Testing', 'Test Automation', 'Quality Assurance', 'Frontend Testing']
      },
      {
        workTypeId: 'development-development-testing-test-automation-framework',
        skillNames: ['Test Automation', 'Testing Frameworks', 'Quality Assurance', 'CI/CD']
      },
      {
        workTypeId: 'development-development-testing-unit-testing',
        skillNames: ['Unit Testing', 'Test-Driven Development', 'Quality Assurance', 'Testing Frameworks']
      },

      // FRONTEND - Areas needing 1 more skill
      {
        workTypeId: 'development-frontend-cross-browser-compatibility',
        skillNames: ['JavaScript', 'CSS3', 'HTML5', 'Browser Testing']
      },
      {
        workTypeId: 'development-frontend-frontend-accessibility',
        skillNames: ['HTML5', 'CSS3', 'JavaScript', 'Web Accessibility']
      },
      {
        workTypeId: 'development-frontend-responsive-design-implementation',
        skillNames: ['Responsive Design', 'CSS3', 'HTML5', 'Media Queries']
      },

      // FRONTEND DEVELOPMENT - Areas needing 1 more skill
      {
        workTypeId: 'development-frontend-development-html5-development',
        skillNames: ['HTML5', 'CSS3', 'JavaScript', 'Web Standards']
      },

      // MACHINE LEARNING & AI - Areas needing 1 more skill
      {
        workTypeId: 'development-machine-learning-ai-computer-vision',
        skillNames: ['Python', 'TensorFlow', 'PyTorch', 'Computer Vision']
      },
      {
        workTypeId: 'development-machine-learning-ai-deep-learning',
        skillNames: ['TensorFlow', 'PyTorch', 'Python', 'Deep Learning']
      },
      {
        workTypeId: 'development-machine-learning-ai-natural-language-processing',
        skillNames: ['Python', 'TensorFlow', 'PyTorch', 'Natural Language Processing']
      },

      // MOBILE DEVELOPMENT - Areas needing skills
      {
        workTypeId: 'development-mobile-development-android-development',
        skillNames: ['Kotlin', 'Java', 'Android Development', 'Mobile Development']
      },
      {
        workTypeId: 'development-mobile-development-progressive-web-apps',
        skillNames: ['Service Workers', 'Web App Manifest', 'JavaScript', 'PWA']
      },
      {
        workTypeId: 'development-mobile-development-ios-development',
        skillNames: ['Swift', 'iOS Development', 'Xcode', 'Mobile Development']
      },
      {
        workTypeId: 'development-mobile-development-app-store-deployment',
        skillNames: ['iOS Development', 'Android Development', 'App Store Optimization', 'Mobile Deployment']
      },
      {
        workTypeId: 'development-mobile-development-cross-platform-development',
        skillNames: ['React Native', 'Flutter', 'Ionic', 'Cross-platform Development']
      },
      {
        workTypeId: 'development-mobile-development-mobile-performance-optimization',
        skillNames: ['Mobile Optimization', 'Performance Tuning', 'iOS Development', 'Android Development']
      },
      {
        workTypeId: 'development-mobile-development-mobile-security',
        skillNames: ['Mobile Security', 'iOS Development', 'Android Development', 'Security']
      },
      {
        workTypeId: 'development-mobile-development-native-android-development',
        skillNames: ['Kotlin', 'Java', 'Android Development', 'Native Development']
      },
      {
        workTypeId: 'development-mobile-development-native-ios-development',
        skillNames: ['Swift', 'iOS Development', 'Objective-C', 'Native Development']
      },
      {
        workTypeId: 'development-mobile-development-offline-support-sync',
        skillNames: ['Offline Storage', 'Data Synchronization', 'Mobile Development', 'Local Databases']
      }
    ];

    console.log(`🎯 Processing ${skillMappings.length} Development work type-skill mappings...`);
    console.log('');

    let totalMappingsAdded = 0;
    let totalMappingsSkipped = 0;
    let workTypesNotFound = 0;
    let skillsNotFound = 0;
    const missingSkills = new Set();
    const missingWorkTypes = new Set();

    for (const mapping of skillMappings) {
      // Verify work type exists
      const workType = await prisma.workType.findUnique({
        where: { id: mapping.workTypeId }
      });

      if (!workType) {
        console.log(`❌ Work type not found: ${mapping.workTypeId}`);
        workTypesNotFound++;
        missingWorkTypes.add(mapping.workTypeId);
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
          missingSkills.add(skillName);
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

    console.log('📊 BATCH 5 SUMMARY:');
    console.log(`✅ Skill mappings added: ${totalMappingsAdded}`);
    console.log(`⚠️  Skill mappings skipped (already exist): ${totalMappingsSkipped}`);
    console.log(`❌ Work types not found: ${workTypesNotFound}`);
    console.log(`❌ Skills not found in database: ${skillsNotFound}`);
    console.log('');

    if (missingSkills.size > 0) {
      console.log('🔍 Missing Skills Found:');
      Array.from(missingSkills).forEach(skill => {
        console.log(`   • ${skill}`);
      });
      console.log('');
    }

    if (missingWorkTypes.size > 0) {
      console.log('🔍 Missing Work Types Found:');
      Array.from(missingWorkTypes).forEach(workType => {
        console.log(`   • ${workType}`);
      });
      console.log('');
    }

    // Check updated Development focus area coverage
    console.log('🔍 Checking Updated Development Focus Area Coverage...');
    
    const developmentFocusArea = await prisma.focusArea.findFirst({
      where: { 
        label: {
          contains: 'Development',
          mode: 'insensitive'
        }
      },
      include: {
        workCategories: {
          include: {
            workTypes: {
              include: {
                workTypeSkills: true
              }
            }
          }
        }
      }
    });

    if (developmentFocusArea) {
      let totalDevelopmentWorkTypes = 0;
      let developmentWorkTypesWithEnoughSkills = 0;

      developmentFocusArea.workCategories.forEach(category => {
        category.workTypes.forEach(workType => {
          totalDevelopmentWorkTypes++;
          const skillCount = workType.workTypeSkills.length;
          
          if (skillCount >= 4) {
            developmentWorkTypesWithEnoughSkills++;
          }
        });
      });

      const developmentCoveragePercentage = totalDevelopmentWorkTypes > 0 ? 
        ((developmentWorkTypesWithEnoughSkills / totalDevelopmentWorkTypes) * 100).toFixed(1) : 0;

      console.log(`\n📈 Updated Development Focus Area Coverage:`);
      console.log(`   Total work types: ${totalDevelopmentWorkTypes}`);
      console.log(`   ✅ With 4+ skills: ${developmentWorkTypesWithEnoughSkills}`);
      console.log(`   ❌ With <4 skills: ${totalDevelopmentWorkTypes - developmentWorkTypesWithEnoughSkills}`);
      console.log(`   📊 Coverage percentage: ${developmentCoveragePercentage}%`);
      
      const improvement = parseFloat(developmentCoveragePercentage) - 41.9;
      console.log(`   📈 Improvement: +${improvement.toFixed(1)}%`);
    }

    console.log('');
    console.log('ℹ️  Batch 5 focuses on Development focus area completion.');
    console.log('   Targeting critical architecture, testing, and mobile areas.');
    console.log('');
    console.log('✅ Batch 5 completed successfully!');

  } catch (error) {
    console.error('❌ Error populating skill mappings:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the function
populateSkillMappingsBatch5()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });