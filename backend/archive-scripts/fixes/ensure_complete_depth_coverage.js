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

async function ensureCompleteDepthCoverage() {
  try {
    console.log('🎯 ENSURING COMPLETE DEPTH-FIRST COVERAGE ACROSS ALL 8 FOCUS AREAS');
    console.log('📅 Timestamp:', new Date().toISOString());
    console.log('🎯 Target: Every focus area → every category → at least one work type → at least one skill');
    console.log('');

    // Target focus areas for depth coverage
    const targetFocusAreas = [
      'Design', 'Development', 'Leadership', 'Marketing', 
      'Operations', 'Product Management', 'Sales', 'Strategy'
    ];

    console.log('🔍 PHASE 1: COMPREHENSIVE ANALYSIS OF ALL FOCUS AREAS...\n');

    const incompleteCategories = [];
    let totalAnalyzed = 0;
    let totalComplete = 0;
    
    for (const focusAreaName of targetFocusAreas) {
      console.log(`📊 Analyzing ${focusAreaName} Focus Area...`);
      
      const focusArea = await prisma.focusArea.findFirst({
        where: { 
          label: { contains: focusAreaName, mode: 'insensitive' }
        },
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
        }
      });

      if (!focusArea) {
        console.log(`   ❌ Focus area not found: ${focusAreaName}`);
        continue;
      }

      let categoriesWithSkills = 0;
      
      for (const category of focusArea.workCategories) {
        totalAnalyzed++;
        let categoryHasSkills = false;
        let bestWorkType = null;
        let maxSkills = 0;
        
        for (const workType of category.workTypes) {
          if (workType.workTypeSkills.length > 0) {
            categoryHasSkills = true;
            if (workType.workTypeSkills.length > maxSkills) {
              maxSkills = workType.workTypeSkills.length;
              bestWorkType = workType;
            }
          }
        }
        
        if (categoryHasSkills) {
          categoriesWithSkills++;
          totalComplete++;
          console.log(`   ✅ ${category.label}: ${maxSkills} skills (${bestWorkType.label})`);
        } else {
          console.log(`   ❌ ${category.label}: NO SKILLS (${category.workTypes.length} work types)`);
          
          // Find the best work type to add skills to
          let targetWorkType = category.workTypes[0]; // Default to first
          if (category.workTypes.length > 1) {
            // Prefer work types with more descriptive names
            targetWorkType = category.workTypes.find(wt => 
              wt.label.toLowerCase().includes('management') ||
              wt.label.toLowerCase().includes('strategy') ||
              wt.label.toLowerCase().includes('development')
            ) || category.workTypes[0];
          }
          
          if (targetWorkType) {
            incompleteCategories.push({
              focusAreaName,
              focusAreaId: focusArea.id,
              categoryId: category.id,
              categoryLabel: category.label,
              workTypeId: targetWorkType.id,
              workTypeLabel: targetWorkType.label
            });
          }
        }
      }

      const coverage = focusArea.workCategories.length > 0 ? 
        ((categoriesWithSkills / focusArea.workCategories.length) * 100).toFixed(1) : 0;
      
      console.log(`   📈 ${focusAreaName}: ${categoriesWithSkills}/${focusArea.workCategories.length} categories (${coverage}%)`);
      console.log('');
    }

    console.log('📋 ANALYSIS SUMMARY:');
    console.log(`📊 Total categories analyzed: ${totalAnalyzed}`);
    console.log(`✅ Categories with skills: ${totalComplete}`);
    console.log(`❌ Categories missing skills: ${incompleteCategories.length}`);
    console.log(`📈 Overall depth coverage: ${totalAnalyzed > 0 ? ((totalComplete / totalAnalyzed) * 100).toFixed(1) : 0}%`);
    console.log('');

    if (incompleteCategories.length === 0) {
      console.log('🎉 ALL FOCUS AREAS ALREADY HAVE COMPLETE DEPTH COVERAGE!');
      console.log('✅ Every category in every focus area has at least one work type with skills');
      return;
    }

    console.log(`🔧 PHASE 2: ADDING SKILLS TO ${incompleteCategories.length} INCOMPLETE CATEGORIES...\n`);

    // Get all existing skills for reference
    const allSkills = await prisma.skill.findMany({
      orderBy: { name: 'asc' }
    });

    console.log(`📋 Available skills: ${allSkills.length}`);
    console.log('');

    // Define strategic skills for each focus area
    const focusAreaSkills = {
      'Design': ['Visual Design', 'User Experience', 'Design Systems', 'UI Design', 'Creative Direction'],
      'Development': ['Software Development', 'Programming', 'Web Development', 'Mobile Development', 'System Architecture'],
      'Leadership': ['Leadership', 'Team Management', 'Strategic Planning', 'People Management', 'Executive Leadership'],
      'Marketing': ['Marketing Strategy', 'Digital Marketing', 'Brand Management', 'Content Marketing', 'Market Research'],
      'Operations': ['Operations Management', 'Process Improvement', 'Supply Chain Management', 'Quality Management', 'Project Management'],
      'Product Management': ['Product Strategy', 'Product Development', 'Product Analytics', 'Product Planning', 'User Research'],
      'Sales': ['Sales Strategy', 'Account Management', 'Customer Success', 'Sales Operations', 'Business Development'],
      'Strategy': ['Business Strategy', 'Strategic Analysis', 'Strategic Planning', 'Corporate Strategy', 'Innovation Strategy']
    };

    let totalSkillsCreated = 0;
    let totalMappingsCreated = 0;

    for (const incomplete of incompleteCategories) {
      console.log(`📌 Processing: ${incomplete.focusAreaName} > ${incomplete.categoryLabel}`);
      console.log(`   🎯 Target work type: ${incomplete.workTypeLabel}`);

      // Get relevant skills for this focus area
      const relevantSkills = focusAreaSkills[incomplete.focusAreaName] || ['General Skills'];
      
      // Add category-specific skills based on category name
      const categoryKeywords = incomplete.categoryLabel.toLowerCase();
      const categorySpecificSkills = [];
      
      if (categoryKeywords.includes('management')) categorySpecificSkills.push('Management');
      if (categoryKeywords.includes('strategy')) categorySpecificSkills.push('Strategic Planning');
      if (categoryKeywords.includes('design')) categorySpecificSkills.push('Design');
      if (categoryKeywords.includes('development')) categorySpecificSkills.push('Development');
      if (categoryKeywords.includes('marketing')) categorySpecificSkills.push('Marketing');
      if (categoryKeywords.includes('sales')) categorySpecificSkills.push('Sales');
      if (categoryKeywords.includes('operations')) categorySpecificSkills.push('Operations');
      if (categoryKeywords.includes('analytics')) categorySpecificSkills.push('Analytics');
      if (categoryKeywords.includes('data')) categorySpecificSkills.push('Data Analysis');
      if (categoryKeywords.includes('quality')) categorySpecificSkills.push('Quality Assurance');
      if (categoryKeywords.includes('process')) categorySpecificSkills.push('Process Improvement');
      if (categoryKeywords.includes('project')) categorySpecificSkills.push('Project Management');

      // Combine skills: focus area skills + category specific + category label as skill
      const skillsToAdd = [
        ...relevantSkills.slice(0, 2), // First 2 focus area skills
        ...categorySpecificSkills,
        incomplete.categoryLabel // Category name as a skill
      ];

      // Remove duplicates and limit to 4 skills
      const uniqueSkills = [...new Set(skillsToAdd)].slice(0, 4);

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
            allSkills.push(skill); // Add to cache
            totalSkillsCreated++;
            console.log(`   🔧 Created skill: ${skillName}`);
          } catch (error) {
            if (error.code === 'P2002') {
              // Skill exists, try to find it
              skill = await prisma.skill.findFirst({
                where: { name: skillName }
              });
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

        // Check if mapping already exists
        const existingMapping = await prisma.workTypeSkill.findUnique({
          where: {
            workTypeId_skillId: {
              workTypeId: incomplete.workTypeId,
              skillId: skill.id
            }
          }
        });

        if (existingMapping) {
          console.log(`   ⚠️  Already mapped: ${skillName}`);
          continue;
        }

        // Create the mapping
        try {
          await prisma.workTypeSkill.create({
            data: {
              workTypeId: incomplete.workTypeId,
              skillId: skill.id
            }
          });

          console.log(`   ✅ Mapped: ${skillName}`);
          totalMappingsCreated++;
        } catch (error) {
          console.log(`   ❌ Failed to map ${skillName}: ${error.message}`);
        }
      }
      console.log('');
    }

    console.log('📊 DEPTH COVERAGE COMPLETION SUMMARY:');
    console.log(`✅ Skills created: ${totalSkillsCreated}`);
    console.log(`✅ Skill mappings created: ${totalMappingsCreated}`);
    console.log(`📋 Categories processed: ${incompleteCategories.length}`);
    console.log('');

    console.log('🔍 PHASE 3: FINAL VERIFICATION OF COMPLETE DEPTH COVERAGE...\n');
    
    // Final verification for all 8 focus areas
    let finalCompleteCategories = 0;
    let finalTotalCategories = 0;
    let finalCompleteFocusAreas = 0;
    
    for (const focusAreaName of targetFocusAreas) {
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
        
        focusArea.workCategories.forEach(category => {
          finalTotalCategories++;
          const hasSkills = category.workTypes.some(wt => wt.workTypeSkills.length > 0);
          if (hasSkills) {
            categoriesWithSkills++;
            finalCompleteCategories++;
          }
        });

        const hasTrueDepthCoverage = categoriesWithSkills === focusArea.workCategories.length;
        if (hasTrueDepthCoverage) {
          finalCompleteFocusAreas++;
        }

        const coverage = focusArea.workCategories.length > 0 ? 
          ((categoriesWithSkills / focusArea.workCategories.length) * 100).toFixed(1) : 0;

        console.log(`📈 ${focusAreaName}: ${categoriesWithSkills}/${focusArea.workCategories.length} categories (${coverage}%) ${hasTrueDepthCoverage ? '✅' : '❌'}`);
      }
    }

    console.log('');
    console.log('🎊 FINAL DEPTH COVERAGE RESULTS:');
    console.log(`✅ Focus areas with complete depth coverage: ${finalCompleteFocusAreas}/8`);
    console.log(`✅ Total categories with skills: ${finalCompleteCategories}/${finalTotalCategories}`);
    console.log(`📈 Overall depth coverage: ${finalTotalCategories > 0 ? ((finalCompleteCategories / finalTotalCategories) * 100).toFixed(1) : 0}%`);
    console.log('');

    if (finalCompleteFocusAreas === 8) {
      console.log('🎉 SUCCESS: COMPLETE DEPTH-FIRST COVERAGE ACHIEVED!');
      console.log('✅ Every focus area → every category → at least one work type → at least one skill');
      console.log('🎯 All 8 primary focus areas now have true depth coverage');
    } else {
      console.log(`⚠️  PROGRESS: ${finalCompleteFocusAreas}/8 focus areas have complete depth coverage`);
      console.log('📝 Some categories may need additional attention');
    }

    // Final statistics
    const finalSkillCount = await prisma.skill.count();
    const finalMappingCount = await prisma.workTypeSkill.count();
    console.log('');
    console.log('📊 DATABASE STATISTICS:');
    console.log(`📋 Total skills: ${finalSkillCount}`);
    console.log(`🔗 Total skill mappings: ${finalMappingCount}`);

  } catch (error) {
    console.error('❌ Error ensuring complete depth coverage:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the function
ensureCompleteDepthCoverage()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });