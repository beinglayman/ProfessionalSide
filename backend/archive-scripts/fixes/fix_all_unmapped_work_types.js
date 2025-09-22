const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

// Helper function to generate skill slug
function generateSkillSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .replace(/^-+|-+$/g, '');
}

// Helper function to extract meaningful skills from work type label
function generateSkillsFromWorkType(workTypeLabel, categoryLabel, focusAreaLabel) {
  const skills = new Set();
  
  // Add focus area as primary skill
  skills.add(focusAreaLabel);
  
  // Add category-derived skills
  if (categoryLabel !== focusAreaLabel) {
    skills.add(categoryLabel);
  }
  
  // Extract skills from work type label
  const workTypeWords = workTypeLabel.toLowerCase();
  
  // Common skill patterns
  if (workTypeWords.includes('management')) skills.add('Management');
  if (workTypeWords.includes('strategy')) skills.add('Strategy');
  if (workTypeWords.includes('planning')) skills.add('Planning');
  if (workTypeWords.includes('design')) skills.add('Design');
  if (workTypeWords.includes('development')) skills.add('Development');
  if (workTypeWords.includes('analysis')) skills.add('Analysis');
  if (workTypeWords.includes('testing')) skills.add('Testing');
  if (workTypeWords.includes('implementation')) skills.add('Implementation');
  if (workTypeWords.includes('optimization')) skills.add('Optimization');
  if (workTypeWords.includes('automation')) skills.add('Automation');
  if (workTypeWords.includes('security')) skills.add('Security');
  if (workTypeWords.includes('data')) skills.add('Data Analysis');
  if (workTypeWords.includes('api')) skills.add('API Development');
  if (workTypeWords.includes('mobile')) skills.add('Mobile Development');
  if (workTypeWords.includes('frontend')) skills.add('Frontend Development');
  if (workTypeWords.includes('backend')) skills.add('Backend Development');
  if (workTypeWords.includes('ui')) skills.add('UI Design');
  if (workTypeWords.includes('ux')) skills.add('User Experience');
  if (workTypeWords.includes('research')) skills.add('Research');
  if (workTypeWords.includes('marketing')) skills.add('Marketing');
  if (workTypeWords.includes('sales')) skills.add('Sales');
  if (workTypeWords.includes('customer')) skills.add('Customer Relations');
  if (workTypeWords.includes('business')) skills.add('Business Analysis');
  if (workTypeWords.includes('project')) skills.add('Project Management');
  if (workTypeWords.includes('process')) skills.add('Process Improvement');
  if (workTypeWords.includes('quality')) skills.add('Quality Assurance');
  if (workTypeWords.includes('performance')) skills.add('Performance Analysis');
  if (workTypeWords.includes('monitoring')) skills.add('Monitoring');
  if (workTypeWords.includes('compliance')) skills.add('Compliance');
  if (workTypeWords.includes('risk')) skills.add('Risk Management');
  if (workTypeWords.includes('finance')) skills.add('Financial Analysis');
  if (workTypeWords.includes('accounting')) skills.add('Accounting');
  if (workTypeWords.includes('legal')) skills.add('Legal Analysis');
  if (workTypeWords.includes('hr') || workTypeWords.includes('human')) skills.add('Human Resources');
  if (workTypeWords.includes('talent')) skills.add('Talent Management');
  if (workTypeWords.includes('recruitment')) skills.add('Recruitment');
  if (workTypeWords.includes('training')) skills.add('Training & Development');
  if (workTypeWords.includes('communication')) skills.add('Communication');
  if (workTypeWords.includes('documentation')) skills.add('Documentation');
  if (workTypeWords.includes('integration')) skills.add('System Integration');
  if (workTypeWords.includes('architecture')) skills.add('System Architecture');
  if (workTypeWords.includes('infrastructure')) skills.add('Infrastructure Management');
  if (workTypeWords.includes('cloud')) skills.add('Cloud Computing');
  if (workTypeWords.includes('devops')) skills.add('DevOps');
  if (workTypeWords.includes('database')) skills.add('Database Management');
  if (workTypeWords.includes('network')) skills.add('Network Management');
  
  // Add work type label itself as a skill if it's descriptive
  if (workTypeLabel.length > 3 && !workTypeLabel.toLowerCase().includes('work')) {
    skills.add(workTypeLabel);
  }
  
  // Ensure we have at least 2-3 skills
  const skillArray = Array.from(skills);
  if (skillArray.length < 2) {
    skillArray.push('General Skills');
  }
  
  return skillArray.slice(0, 4); // Limit to 4 skills max
}

async function fixAllUnmappedWorkTypes() {
  try {
    console.log('🚀 COMPREHENSIVE FIX: ALL UNMAPPED WORK TYPES');
    console.log('📅 Timestamp:', new Date().toISOString());
    console.log('🎯 Goal: Ensure EVERY work type has at least 1 skill mapped');
    console.log('');

    // First, get all unmapped work types
    console.log('🔍 Step 1: Identifying all unmapped work types...');
    
    const allFocusAreas = await prisma.focusArea.findMany({
      include: {
        workCategories: {
          include: {
            workTypes: {
              include: {
                workTypeSkills: {
                  include: { skill: true }
                }
              }
            }
          }
        }
      },
      orderBy: { label: 'asc' }
    });

    const unmappedWorkTypes = [];
    let totalWorkTypes = 0;

    for (const focusArea of allFocusAreas) {
      for (const category of focusArea.workCategories) {
        for (const workType of category.workTypes) {
          totalWorkTypes++;
          if (workType.workTypeSkills.length === 0) {
            unmappedWorkTypes.push({
              focusAreaId: focusArea.id,
              focusAreaLabel: focusArea.label,
              categoryId: category.id,
              categoryLabel: category.label,
              workTypeId: workType.id,
              workTypeLabel: workType.label
            });
          }
        }
      }
    }

    console.log(`📊 Found ${totalWorkTypes} total work types`);
    console.log(`❌ Found ${unmappedWorkTypes.length} unmapped work types`);
    console.log(`✅ Already mapped: ${totalWorkTypes - unmappedWorkTypes.length} work types`);
    console.log('');

    if (unmappedWorkTypes.length === 0) {
      console.log('🎉 ALL WORK TYPES ALREADY HAVE SKILLS MAPPED!');
      return;
    }

    // Get all existing skills
    console.log('🔍 Step 2: Loading existing skills...');
    const allSkills = await prisma.skill.findMany({
      orderBy: { name: 'asc' }
    });
    console.log(`📋 Found ${allSkills.length} existing skills`);
    console.log('');

    console.log('🔧 Step 3: Processing unmapped work types...');
    console.log('');

    let totalSkillsCreated = 0;
    let totalMappingsCreated = 0;
    let processedCount = 0;
    let errors = 0;

    // Process in batches to avoid overwhelming the output
    const batchSize = 10;
    for (let i = 0; i < unmappedWorkTypes.length; i += batchSize) {
      const batch = unmappedWorkTypes.slice(i, i + batchSize);
      
      console.log(`📦 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(unmappedWorkTypes.length/batchSize)} (${batch.length} work types)`);
      
      for (const workType of batch) {
        try {
          processedCount++;
          
          // Generate relevant skills for this work type
          const suggestedSkills = generateSkillsFromWorkType(
            workType.workTypeLabel,
            workType.categoryLabel,
            workType.focusAreaLabel
          );

          console.log(`   📌 ${workType.focusAreaLabel} > ${workType.categoryLabel} > ${workType.workTypeLabel}`);
          console.log(`      🎯 Suggested skills: ${suggestedSkills.join(', ')}`);

          let mappedSkillsCount = 0;

          for (const skillName of suggestedSkills) {
            // Find or create skill
            let skill = allSkills.find(s => 
              s.name.toLowerCase() === skillName.toLowerCase()
            );

            if (!skill) {
              // Create missing skill
              try {
                const skillId = generateSkillSlug(skillName);
                skill = await prisma.skill.create({
                  data: {
                    id: skillId,
                    name: skillName
                  }
                });
                allSkills.push(skill); // Add to cache
                totalSkillsCreated++;
                console.log(`      🔧 Created skill: ${skillName}`);
              } catch (error) {
                if (error.code === 'P2002') {
                  // Skill exists, try to find it
                  skill = await prisma.skill.findFirst({
                    where: { name: skillName }
                  });
                  if (skill) {
                    allSkills.push(skill);
                  }
                } else {
                  console.log(`      ❌ Failed to create skill "${skillName}": ${error.message}`);
                  continue;
                }
              }
            }

            if (!skill) {
              console.log(`      ❌ Could not find or create skill: ${skillName}`);
              continue;
            }

            // Check if mapping already exists
            const existingMapping = await prisma.workTypeSkill.findUnique({
              where: {
                workTypeId_skillId: {
                  workTypeId: workType.workTypeId,
                  skillId: skill.id
                }
              }
            });

            if (existingMapping) {
              console.log(`      ⚠️  Already mapped: ${skillName}`);
              mappedSkillsCount++;
              continue;
            }

            // Create the mapping
            try {
              await prisma.workTypeSkill.create({
                data: {
                  workTypeId: workType.workTypeId,
                  skillId: skill.id
                }
              });

              console.log(`      ✅ Mapped: ${skillName}`);
              totalMappingsCreated++;
              mappedSkillsCount++;
            } catch (error) {
              console.log(`      ❌ Failed to map ${skillName}: ${error.message}`);
            }
          }

          if (mappedSkillsCount === 0) {
            console.log(`      ⚠️  WARNING: No skills mapped for this work type`);
            errors++;
          }

        } catch (error) {
          console.error(`   ❌ Error processing ${workType.workTypeLabel}: ${error.message}`);
          errors++;
        }
        
        console.log('');
      }
      
      // Progress update
      console.log(`📈 Progress: ${Math.min(i + batchSize, unmappedWorkTypes.length)}/${unmappedWorkTypes.length} work types processed`);
      console.log('');
    }

    console.log('📊 COMPREHENSIVE FIX SUMMARY:');
    console.log(`✅ Work types processed: ${processedCount}/${unmappedWorkTypes.length}`);
    console.log(`✅ Skills created: ${totalSkillsCreated}`);
    console.log(`✅ Skill mappings created: ${totalMappingsCreated}`);
    console.log(`❌ Errors encountered: ${errors}`);
    console.log('');

    // Final verification
    console.log('🔍 Step 4: Final verification...');
    
    const finalVerification = await prisma.workType.findMany({
      include: {
        workTypeSkills: true
      }
    });

    const finalUnmapped = finalVerification.filter(wt => wt.workTypeSkills.length === 0);
    const finalMapped = finalVerification.filter(wt => wt.workTypeSkills.length > 0);

    console.log('✅ FINAL RESULTS:');
    console.log(`📊 Total work types: ${finalVerification.length}`);
    console.log(`✅ Work types WITH skills: ${finalMapped.length}`);
    console.log(`❌ Work types WITHOUT skills: ${finalUnmapped.length}`);
    console.log(`📈 Final coverage: ${finalVerification.length > 0 ? ((finalMapped.length / finalVerification.length) * 100).toFixed(1) : 0}%`);
    console.log('');

    if (finalUnmapped.length === 0) {
      console.log('🎉 SUCCESS: ALL WORK TYPES NOW HAVE SKILLS MAPPED!');
      console.log('✅ Every focus area > category > work type > skill combination is complete');
    } else {
      console.log(`⚠️  WARNING: ${finalUnmapped.length} work types still need skill mapping`);
      console.log('❌ Manual review may be required for remaining unmapped work types');
    }

    // Final database statistics
    const finalSkillCount = await prisma.skill.count();
    const finalMappingCount = await prisma.workTypeSkill.count();
    console.log('');
    console.log('📊 FINAL DATABASE STATISTICS:');
    console.log(`📋 Total skills: ${finalSkillCount}`);
    console.log(`🔗 Total skill mappings: ${finalMappingCount}`);

  } catch (error) {
    console.error('❌ Error fixing unmapped work types:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the function
fixAllUnmappedWorkTypes()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });