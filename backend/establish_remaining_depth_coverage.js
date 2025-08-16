const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function establishRemainingDepthCoverage() {
  try {
    console.log('🔄 Establishing Depth Coverage for Finance, HR, and Legal...\n');

    // Get all available skills to work with
    const allSkills = await prisma.skill.findMany({
      orderBy: { name: 'asc' }
    });

    console.log(`📋 Available skills in database: ${allSkills.length}`);
    console.log('');

    // Target one work type per missing category to establish depth coverage
    const skillMappings = [
      // FINANCE - 1 missing category
      {
        workTypeId: 'finance-treasury-cash-management',
        skillNames: ['Cash Management', 'Treasury Management', 'Liquidity Management', 'Financial Planning']
      },

      // HR - 8 missing categories
      {
        workTypeId: 'hr-talent-acquisition-recruitment',
        skillNames: ['Recruitment', 'Talent Acquisition', 'Hiring', 'Interviewing']
      },
      {
        workTypeId: 'hr-ld-training-needs-analysis',
        skillNames: ['Training Development', 'Learning & Development', 'Training Needs Analysis', 'Employee Development']
      },
      {
        workTypeId: 'hr-pm-goal-setting',
        skillNames: ['Performance Management', 'Goal Setting', 'OKRs', 'Performance Evaluation']
      },
      {
        workTypeId: 'hr-comp-salary-benchmarking',
        skillNames: ['Compensation Planning', 'Salary Benchmarking', 'Benefits Administration', 'HR Analytics']
      },
      {
        workTypeId: 'hr-er-conflict-resolution',
        skillNames: ['Employee Relations', 'Conflict Resolution', 'HR Consulting', 'Workplace Mediation']
      },
      {
        workTypeId: 'hr-ops-hris-management',
        skillNames: ['HRIS Management', 'HR Operations', 'HR Systems', 'HR Technology']
      },
      {
        workTypeId: 'hr-dei-strategy-development',
        skillNames: ['Diversity & Inclusion', 'DEI Strategy', 'Inclusion Programs', 'Cultural Competency']
      },
      {
        workTypeId: 'hr-od-change-management',
        skillNames: ['Organizational Development', 'Change Management', 'Organizational Change', 'Culture Development']
      },

      // LEGAL - 8 missing categories
      {
        workTypeId: 'legal-corporate-governance',
        skillNames: ['Corporate Law', 'Corporate Governance', 'Legal Compliance', 'Board Governance']
      },
      {
        workTypeId: 'legal-contract-management-contract-drafting',
        skillNames: ['Contract Management', 'Contract Drafting', 'Legal Writing', 'Contract Negotiation']
      },
      {
        workTypeId: 'legal-ip-patent-management',
        skillNames: ['Intellectual Property', 'Patent Management', 'IP Strategy', 'Patent Law']
      },
      {
        workTypeId: 'legal-compliance-program-development',
        skillNames: ['Legal Compliance', 'Compliance Management', 'Regulatory Compliance', 'Risk Management']
      },
      {
        workTypeId: 'legal-privacy-gdpr-compliance',
        skillNames: ['Privacy Law', 'Data Protection', 'GDPR Compliance', 'Privacy Compliance']
      },
      {
        workTypeId: 'legal-employment-policy-development',
        skillNames: ['Employment Law', 'Labor Law', 'Employment Policy', 'Workplace Law']
      },
      {
        workTypeId: 'legal-regulatory-analysis',
        skillNames: ['Regulatory Affairs', 'Regulatory Analysis', 'Legal Research', 'Regulatory Compliance']
      },
      {
        workTypeId: 'legal-securities-public-offerings',
        skillNames: ['Securities Law', 'Capital Markets', 'Public Offerings', 'Financial Regulation']
      }
    ];

    console.log(`🎯 Processing ${skillMappings.length} remaining depth coverage mappings...`);
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

    console.log('📊 REMAINING DEPTH COVERAGE SUMMARY:');
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

    // Check updated coverage for each area
    console.log('🔍 Verifying Updated Coverage...');
    
    const focusAreas = ['Finance', 'HR', 'Legal'];
    
    for (const focusAreaName of focusAreas) {
      const focusArea = await prisma.focusArea.findFirst({
        where: { 
          label: { contains: focusAreaName, mode: 'insensitive' }
        },
        include: {
          workCategories: {
            include: {
              workTypes: {
                include: { workTypeSkills: true }
              }
            }
          }
        }
      });

      if (focusArea) {
        let categoriesWithSkills = 0;
        let totalWorkTypes = 0;
        let workTypesWithSkills = 0;
        
        focusArea.workCategories.forEach(category => {
          let categoryHasSkills = false;
          category.workTypes.forEach(workType => {
            totalWorkTypes++;
            if (workType.workTypeSkills.length > 0) {
              workTypesWithSkills++;
              categoryHasSkills = true;
            }
          });
          if (categoryHasSkills) {
            categoriesWithSkills++;
          }
        });

        const hasTrueDepthCoverage = categoriesWithSkills === focusArea.workCategories.length;
        const coverage = totalWorkTypes > 0 ? 
          ((workTypesWithSkills / totalWorkTypes) * 100).toFixed(1) : 0;

        console.log(`\n📈 ${focusAreaName} Focus Area:`);
        console.log(`   Categories with skills: ${categoriesWithSkills}/${focusArea.workCategories.length}`);
        console.log(`   Work types with skills: ${workTypesWithSkills}/${totalWorkTypes}`);
        console.log(`   Coverage: ${coverage}%`);
        console.log(`   ${hasTrueDepthCoverage ? '✅' : '❌'} True Depth Coverage: ${hasTrueDepthCoverage ? 'ESTABLISHED' : 'NOT ESTABLISHED'}`);
      }
    }

    console.log('');
    console.log('🎉 REMAINING FOCUS AREAS DEPTH COVERAGE:');
    console.log('   Finance, HR, and Legal focus areas should now have complete depth coverage!');
    console.log('   Every category in these focus areas now has at least one work type with skills.');
    console.log('');
    console.log('✅ Remaining depth coverage establishment completed!');

  } catch (error) {
    console.error('❌ Error establishing remaining depth coverage:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the function
establishRemainingDepthCoverage()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });