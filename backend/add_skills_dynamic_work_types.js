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

async function addSkillsToDynamicWorkTypes() {
  try {
    console.log('🔧 ADDING SKILLS TO DYNAMIC WORK TYPES');
    console.log('📅 Timestamp:', new Date().toISOString());
    console.log('🎯 Goal: Add skills to all newly created work types');
    console.log('');

    // Find all work types without skills
    const workTypesWithoutSkills = await prisma.workType.findMany({
      include: {
        workCategory: {
          include: { focusArea: true }
        },
        workTypeSkills: {
          include: { skill: true }
        }
      },
      orderBy: [
        { workCategory: { focusArea: { label: 'asc' } } },
        { workCategory: { label: 'asc' } },
        { label: 'asc' }
      ]
    });

    const unmappedWorkTypes = workTypesWithoutSkills.filter(wt => wt.workTypeSkills.length === 0);
    
    console.log(`📊 Found ${workTypesWithoutSkills.length} total work types`);
    console.log(`❌ Found ${unmappedWorkTypes.length} work types without skills`);
    console.log('');

    if (unmappedWorkTypes.length === 0) {
      console.log('🎉 All work types already have skills!');
      return;
    }

    // Get all existing skills
    const allSkills = await prisma.skill.findMany();
    console.log(`📋 Found ${allSkills.length} existing skills`);
    console.log('');

    let totalSkillsCreated = 0;
    let totalMappingsCreated = 0;
    let processedWorkTypes = 0;

    console.log('🔧 Processing work types without skills...');
    console.log('');

    for (const workType of unmappedWorkTypes) {
      try {
        processedWorkTypes++;
        
        console.log(`📌 ${workType.workCategory.focusArea.label} > ${workType.workCategory.label} > ${workType.label}`);
        
        // Generate relevant skills based on context
        const suggestedSkills = [];
        
        // Add focus area as primary skill
        suggestedSkills.push(workType.workCategory.focusArea.label);
        
        // Add category as secondary skill (if different from focus area)
        if (workType.workCategory.label !== workType.workCategory.focusArea.label) {
          suggestedSkills.push(workType.workCategory.label);
        }
        
        // Extract skills from work type label
        const workTypeWords = workType.label.toLowerCase();
        
        // Common skill patterns
        if (workTypeWords.includes('management')) suggestedSkills.push('Management');
        if (workTypeWords.includes('strategy')) suggestedSkills.push('Strategy');
        if (workTypeWords.includes('planning')) suggestedSkills.push('Planning');
        if (workTypeWords.includes('analysis')) suggestedSkills.push('Analysis');
        if (workTypeWords.includes('optimization')) suggestedSkills.push('Optimization');
        if (workTypeWords.includes('improvement')) suggestedSkills.push('Process Improvement');
        if (workTypeWords.includes('quality')) suggestedSkills.push('Quality Assurance');
        if (workTypeWords.includes('testing')) suggestedSkills.push('Testing');
        if (workTypeWords.includes('audit')) suggestedSkills.push('Audit Management');
        if (workTypeWords.includes('compliance')) suggestedSkills.push('Compliance');
        if (workTypeWords.includes('documentation')) suggestedSkills.push('Documentation');
        if (workTypeWords.includes('training')) suggestedSkills.push('Training & Development');
        if (workTypeWords.includes('automation')) suggestedSkills.push('Automation');
        if (workTypeWords.includes('implementation')) suggestedSkills.push('Implementation');
        
        // Add work type label as a skill if descriptive
        if (workType.label.length > 3) {
          suggestedSkills.push(workType.label);
        }
        
        // Remove duplicates and limit to 4 skills
        const uniqueSkills = [...new Set(suggestedSkills)].slice(0, 4);
        
        console.log(`   🎯 Suggested skills: ${uniqueSkills.join(', ')}`);
        
        let mappedSkillsCount = 0;
        
        for (const skillName of uniqueSkills) {
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
              allSkills.push(skill);
              totalSkillsCreated++;
              console.log(`   🔧 Created skill: ${skillName}`);
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
                console.log(`   ❌ Failed to create skill "${skillName}": ${error.message}`);
                continue;
              }
            }
          }

          if (!skill) {
            console.log(`   ❌ Could not find or create skill: ${skillName}`);
            continue;
          }

          // Create the mapping
          try {
            await prisma.workTypeSkill.create({
              data: {
                workTypeId: workType.id,
                skillId: skill.id
              }
            });

            console.log(`   ✅ Mapped: ${skillName}`);
            totalMappingsCreated++;
            mappedSkillsCount++;
          } catch (error) {
            if (error.code === 'P2002') {
              console.log(`   ⚠️  Already mapped: ${skillName}`);
              mappedSkillsCount++;
            } else {
              console.log(`   ❌ Failed to map ${skillName}: ${error.message}`);
            }
          }
        }
        
        if (mappedSkillsCount === 0) {
          console.log(`   ⚠️  WARNING: No skills mapped for this work type`);
        }
        
        console.log('');
        
      } catch (error) {
        console.error(`   ❌ Error processing ${workType.label}: ${error.message}`);
      }
    }

    console.log('📊 DYNAMIC SKILLS MAPPING SUMMARY:');
    console.log(`✅ Work types processed: ${processedWorkTypes}`);
    console.log(`✅ Skills created: ${totalSkillsCreated}`);
    console.log(`✅ Skill mappings created: ${totalMappingsCreated}`);
    console.log('');

    // Final verification
    const finalCheck = await prisma.workType.findMany({
      include: {
        workTypeSkills: true
      }
    });

    const finalUnmapped = finalCheck.filter(wt => wt.workTypeSkills.length === 0);
    
    console.log('✅ FINAL RESULTS:');
    console.log(`📊 Total work types: ${finalCheck.length}`);
    console.log(`❌ Work types still without skills: ${finalUnmapped.length}`);
    console.log(`📈 Final skill coverage: ${finalCheck.length > 0 ? (((finalCheck.length - finalUnmapped.length) / finalCheck.length) * 100).toFixed(1) : 0}%`);
    
    if (finalUnmapped.length === 0) {
      console.log('🎉 SUCCESS: All work types now have skills!');
    }

  } catch (error) {
    console.error('❌ Error adding skills to dynamic work types:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the function
addSkillsToDynamicWorkTypes()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });