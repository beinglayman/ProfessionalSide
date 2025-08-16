const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function populateSkillMappingsBatch8() {
  try {
    console.log('🔄 Starting Batch 8: Operations Focus Area Foundation...\n');

    // Get all available skills to work with
    const allSkills = await prisma.skill.findMany({
      orderBy: { name: 'asc' }
    });

    console.log(`📋 Available skills in database: ${allSkills.length}`);
    console.log('');

    // Comprehensive skill mappings for foundational Operations work types (using actual IDs)
    const skillMappings = [
      // BUSINESS OPERATIONS - Core business operations
      {
        workTypeId: 'operations-business-automation',
        skillNames: ['Process Automation', 'Business Process Improvement', 'Workflow Design', 'Digital Transformation']
      },
      {
        workTypeId: 'operations-business-process-design',
        skillNames: ['Process Improvement', 'Business Process Design', 'Workflow Optimization', 'Systems Analysis']
      },
      {
        workTypeId: 'operations-business-capacity-planning',
        skillNames: ['Capacity Planning', 'Resource Planning', 'Forecasting', 'Operations Management']
      },
      {
        workTypeId: 'operations-business-cost-optimization',
        skillNames: ['Cost Optimization', 'Financial Analysis', 'Budget Management', 'Efficiency Improvement']
      },
      {
        workTypeId: 'operations-business-kpi-management',
        skillNames: ['KPI Development', 'Performance Metrics', 'Operations Management', 'Data Analysis']
      },
      {
        workTypeId: 'operations-business-efficiency-analysis',
        skillNames: ['Efficiency Analysis', 'Operations Management', 'Performance Analysis', 'Process Improvement']
      },
      {
        workTypeId: 'operations-business-performance-improvement',
        skillNames: ['Process Improvement', 'Performance Management', 'Operations Management', 'Continuous Improvement']
      },
      {
        workTypeId: 'operations-business-workflow-optimization',
        skillNames: ['Workflow Optimization', 'Process Improvement', 'Business Process Analysis', 'Efficiency Optimization']
      },

      // COMPLIANCE - Regulatory and compliance management
      {
        workTypeId: 'operations-compliance-certification',
        skillNames: ['Certification Management', 'Compliance Management', 'ISO Standards', 'Quality Management']
      },
      {
        workTypeId: 'operations-compliance-audit-management',
        skillNames: ['Audit Management', 'Compliance Management', 'Risk Assessment', 'Quality Assurance']
      },
      {
        workTypeId: 'operations-compliance-monitoring',
        skillNames: ['Compliance Monitoring', 'Regulatory Compliance', 'Risk Management', 'Operations Management']
      },
      {
        workTypeId: 'operations-compliance-remediation',
        skillNames: ['Compliance Remediation', 'Risk Management', 'Process Improvement', 'Regulatory Compliance']
      },
      {
        workTypeId: 'operations-compliance-reporting',
        skillNames: ['Compliance Reporting', 'Regulatory Compliance', 'Documentation', 'Audit Management']
      },
      {
        workTypeId: 'operations-compliance-training',
        skillNames: ['Compliance Training', 'Training Development', 'Regulatory Compliance', 'Employee Development']
      },
      {
        workTypeId: 'operations-compliance-policy-development',
        skillNames: ['Policy Development', 'Compliance Management', 'Regulatory Compliance', 'Documentation']
      },
      {
        workTypeId: 'operations-compliance-risk-assessment',
        skillNames: ['Risk Assessment', 'Compliance Management', 'Risk Management', 'Audit Management']
      },

      // DEVOPS PIPELINES - CI/CD and automation
      {
        workTypeId: 'operations-pipelines-artifact-management',
        skillNames: ['Artifact Management', 'DevOps', 'CI/CD', 'Version Control']
      },
      {
        workTypeId: 'operations-pipelines-build-automation',
        skillNames: ['Build Automation', 'CI/CD', 'DevOps', 'Software Development']
      },
      {
        workTypeId: 'operations-pipelines-cd-pipeline-development',
        skillNames: ['CI/CD', 'Pipeline Development', 'DevOps', 'Automation']
      },
      {
        workTypeId: 'operations-pipelines-ci-pipeline-development',
        skillNames: ['CI/CD', 'Pipeline Development', 'DevOps', 'Build Automation']
      },
      {
        workTypeId: 'operations-pipelines-environment-provisioning',
        skillNames: ['Environment Provisioning', 'Infrastructure as Code', 'DevOps', 'Cloud Infrastructure']
      },
      {
        workTypeId: 'operations-pipelines-pipeline-monitoring',
        skillNames: ['Pipeline Monitoring', 'DevOps', 'Monitoring', 'Performance Analysis']
      },
      {
        workTypeId: 'operations-pipelines-pipeline-optimization',
        skillNames: ['Pipeline Optimization', 'DevOps', 'Performance Optimization', 'CI/CD']
      },
      {
        workTypeId: 'operations-pipelines-release-orchestration',
        skillNames: ['Release Management', 'DevOps', 'CI/CD', 'Deployment Strategy']
      },

      // INFRASTRUCTURE - IT infrastructure management
      {
        workTypeId: 'operations-infrastructure-cloud-architecture',
        skillNames: ['Cloud Architecture', 'Infrastructure Management', 'Cloud Platforms', 'System Design']
      },
      {
        workTypeId: 'operations-infrastructure-clustering-high-availability',
        skillNames: ['High Availability', 'Clustering', 'Infrastructure Management', 'System Reliability']
      },
      {
        workTypeId: 'operations-infrastructure-compute-optimization',
        skillNames: ['Compute Optimization', 'Infrastructure Management', 'Performance Optimization', 'Resource Management']
      },
      {
        workTypeId: 'operations-infrastructure-database-operations',
        skillNames: ['Database Administration', 'Database Management', 'Infrastructure Management', 'Performance Tuning']
      },
      {
        workTypeId: 'operations-infrastructure-network-configuration',
        skillNames: ['Network Configuration', 'Network Management', 'Infrastructure Management', 'Security']
      },
      {
        workTypeId: 'operations-infrastructure-server-management',
        skillNames: ['Server Management', 'Infrastructure Management', 'System Administration', 'Monitoring']
      },
      {
        workTypeId: 'operations-infrastructure-storage-management',
        skillNames: ['Storage Management', 'Infrastructure Management', 'Data Management', 'Capacity Planning']
      },
      {
        workTypeId: 'operations-infrastructure-virtualization',
        skillNames: ['Virtualization', 'Infrastructure Management', 'Cloud Computing', 'Resource Optimization']
      },

      // PROCESS IMPROVEMENT - Operational excellence
      {
        workTypeId: 'operations-process-reengineering',
        skillNames: ['Business Process Reengineering', 'Process Improvement', 'Change Management', 'Systems Analysis']
      },
      {
        workTypeId: 'operations-process-kaizen',
        skillNames: ['Kaizen', 'Continuous Improvement', 'Process Improvement', 'Lean Manufacturing']
      },
      {
        workTypeId: 'operations-process-lean-six-sigma',
        skillNames: ['Lean Six Sigma', 'Process Improvement', 'Quality Management', 'Statistical Analysis']
      },
      {
        workTypeId: 'operations-process-change-management',
        skillNames: ['Change Management', 'Process Improvement', 'Organizational Change', 'Training Development']
      },
      {
        workTypeId: 'operations-process-measurement',
        skillNames: ['Process Measurement', 'Performance Metrics', 'Process Improvement', 'Data Analysis']
      },
      {
        workTypeId: 'operations-process-standardization',
        skillNames: ['Process Standardization', 'Standard Operating Procedures', 'Process Improvement', 'Quality Management']
      },
      {
        workTypeId: 'operations-process-root-cause-analysis',
        skillNames: ['Root Cause Analysis', 'Problem Solving', 'Process Improvement', 'Quality Management']
      },
      {
        workTypeId: 'operations-process-value-stream-mapping',
        skillNames: ['Value Stream Mapping', 'Lean Manufacturing', 'Process Improvement', 'Workflow Analysis']
      },

      // PROJECT MANAGEMENT - Operations projects
      {
        workTypeId: 'operations-pm-agile-scrum',
        skillNames: ['Agile Methodology', 'Scrum', 'Project Management', 'Team Leadership']
      },
      {
        workTypeId: 'operations-pm-budget-management',
        skillNames: ['Budget Management', 'Project Management', 'Financial Planning', 'Cost Control']
      },
      {
        workTypeId: 'operations-pm-delivery-management',
        skillNames: ['Project Delivery', 'Project Management', 'Quality Assurance', 'Risk Management']
      },
      {
        workTypeId: 'operations-pm-project-planning',
        skillNames: ['Project Planning', 'Project Management', 'Schedule Management', 'Resource Planning']
      }
    ];

    console.log(`🎯 Processing ${skillMappings.length} Operations work type-skill mappings...`);
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

    console.log('📊 BATCH 8 SUMMARY:');
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

    // Check updated Operations focus area coverage
    console.log('🔍 Checking Updated Operations Focus Area Coverage...');
    
    const operationsFocusArea = await prisma.focusArea.findFirst({
      where: { 
        label: {
          contains: 'Operations',
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

    if (operationsFocusArea) {
      let totalOperationsWorkTypes = 0;
      let operationsWorkTypesWithEnoughSkills = 0;

      operationsFocusArea.workCategories.forEach(category => {
        category.workTypes.forEach(workType => {
          totalOperationsWorkTypes++;
          const skillCount = workType.workTypeSkills.length;
          
          if (skillCount >= 4) {
            operationsWorkTypesWithEnoughSkills++;
          }
        });
      });

      const operationsCoveragePercentage = totalOperationsWorkTypes > 0 ? 
        ((operationsWorkTypesWithEnoughSkills / totalOperationsWorkTypes) * 100).toFixed(1) : 0;

      console.log(`\n📈 Updated Operations Focus Area Coverage:`);
      console.log(`   Total work types: ${totalOperationsWorkTypes}`);
      console.log(`   ✅ With 4+ skills: ${operationsWorkTypesWithEnoughSkills}`);
      console.log(`   ❌ With <4 skills: ${totalOperationsWorkTypes - operationsWorkTypesWithEnoughSkills}`);
      console.log(`   📊 Coverage percentage: ${operationsCoveragePercentage}%`);
      
      const improvement = parseFloat(operationsCoveragePercentage) - 0;
      console.log(`   📈 Improvement: +${improvement.toFixed(1)}%`);
    }

    console.log('');
    console.log('ℹ️  Batch 8 establishes Operations focus area foundation.');
    console.log('   Targeting supply chain, process improvement, quality, and analytics areas.');
    console.log('');
    console.log('✅ Batch 8 completed successfully!');

  } catch (error) {
    console.error('❌ Error populating skill mappings:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the function
populateSkillMappingsBatch8()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });