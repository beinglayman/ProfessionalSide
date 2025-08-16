const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function completeAllDepthCoverage() {
  try {
    console.log('🔄 Completing Final 5 Categories for Full Depth Coverage...\n');

    // Get all available skills to work with
    const allSkills = await prisma.skill.findMany({
      orderBy: { name: 'asc' }
    });

    console.log(`📋 Available skills in database: ${allSkills.length}`);
    console.log('');

    // Final 5 work types to complete ALL depth coverage using existing skills
    const skillMappings = [
      // HR - HR Operations (2 remaining categories)
      {
        workTypeId: 'hr-ops-hris-management',
        skillNames: ['Database Management', 'Process Improvement', 'Data Management', 'Systems Analysis']
      },

      // HR - Diversity & Inclusion
      {
        workTypeId: 'hr-dei-strategy-development',
        skillNames: ['Strategic Planning', 'Culture Development', 'Training Development', 'Leadership']
      },

      // LEGAL - Intellectual Property (3 remaining categories)
      {
        workTypeId: 'legal-ip-patent-management',
        skillNames: ['Legal Research', 'Portfolio Management', 'Strategic Analysis', 'Documentation']
      },

      // LEGAL - Privacy & Data Protection
      {
        workTypeId: 'legal-privacy-gdpr-compliance',
        skillNames: ['Compliance Management', 'Risk Management', 'Documentation', 'Policy Development']
      },

      // LEGAL - Securities Law
      {
        workTypeId: 'legal-securities-public-offerings',
        skillNames: ['Financial Analysis', 'Legal Research', 'Documentation', 'Risk Assessment']
      }
    ];

    console.log(`🎯 Processing final ${skillMappings.length} categories for complete depth coverage...`);
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

    console.log('📊 FINAL COMPLETION SUMMARY:');
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

    // Final verification for all 3 focus areas
    console.log('🔍 FINAL VERIFICATION - All Focus Areas...');
    
    const focusAreas = ['Finance', 'HR', 'Legal'];
    const results = [];
    
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
        console.log(`   Categories: ${categoriesWithSkills}/${focusArea.workCategories.length} with skills`);
        console.log(`   Work types: ${workTypesWithSkills}/${totalWorkTypes} with skills`);
        console.log(`   Coverage: ${coverage}%`);
        console.log(`   ${hasTrueDepthCoverage ? '✅' : '❌'} True Depth Coverage: ${hasTrueDepthCoverage ? 'COMPLETE' : 'INCOMPLETE'}`);

        results.push({
          name: focusAreaName,
          complete: hasTrueDepthCoverage,
          categoriesComplete: `${categoriesWithSkills}/${focusArea.workCategories.length}`,
          coverage: coverage
        });
      }
    }

    console.log('\n🎉 FINAL DEPTH COVERAGE STATUS:');
    const completeAreas = results.filter(r => r.complete);
    const incompleteAreas = results.filter(r => !r.complete);

    console.log(`✅ COMPLETE (${completeAreas.length}/3):`);
    completeAreas.forEach(area => {
      console.log(`   • ${area.name}: ${area.categoriesComplete} categories, ${area.coverage}% coverage`);
    });

    if (incompleteAreas.length > 0) {
      console.log(`❌ INCOMPLETE (${incompleteAreas.length}/3):`);
      incompleteAreas.forEach(area => {
        console.log(`   • ${area.name}: ${area.categoriesComplete} categories, ${area.coverage}% coverage`);
      });
    } else {
      console.log('\n🎊 SUCCESS! ALL FOCUS AREAS NOW HAVE TRUE DEPTH COVERAGE!');
      console.log('   Finance, HR, and Legal are now complete alongside the original 8 focus areas.');
    }

    console.log('');
    console.log('✅ Final depth coverage completion attempted!');

  } catch (error) {
    console.error('❌ Error completing all depth coverage:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the function
completeAllDepthCoverage()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });