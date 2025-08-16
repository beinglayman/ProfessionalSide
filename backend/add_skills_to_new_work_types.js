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

async function addSkillsToNewWorkTypes() {
  try {
    console.log('🔧 ADDING SKILLS TO NEW WORK TYPES');
    console.log('📅 Timestamp:', new Date().toISOString());
    console.log('🎯 Goal: Ensure new Process Improvement and Quality Assurance work types have skills');
    console.log('');

    // Define skill mappings for Process Improvement work types
    const processImprovementSkillMappings = [
      {
        workTypeId: 'operations-process-analysis',
        skills: ['Operations Management', 'Process Improvement', 'Analysis', 'Process Mapping']
      },
      {
        workTypeId: 'operations-process-optimization',
        skills: ['Operations Management', 'Process Improvement', 'Optimization', 'Efficiency Analysis']
      },
      {
        workTypeId: 'operations-workflow-design',
        skills: ['Operations Management', 'Process Improvement', 'Workflow Design', 'Implementation']
      },
      {
        workTypeId: 'operations-automation-initiatives',
        skills: ['Operations Management', 'Process Improvement', 'Automation', 'Project Management']
      },
      {
        workTypeId: 'operations-lean-methodology',
        skills: ['Operations Management', 'Process Improvement', 'Lean Manufacturing', 'Continuous Improvement']
      },
      {
        workTypeId: 'operations-six-sigma',
        skills: ['Operations Management', 'Process Improvement', 'Six Sigma', 'Quality Management']
      },
      {
        workTypeId: 'operations-continuous-improvement',
        skills: ['Operations Management', 'Process Improvement', 'Continuous Improvement', 'Change Management']
      },
      {
        workTypeId: 'operations-efficiency-metrics',
        skills: ['Operations Management', 'Process Improvement', 'Performance Analysis', 'KPI Management']
      }
    ];

    // Define skill mappings for Quality Assurance work types
    const qualityAssuranceSkillMappings = [
      {
        workTypeId: 'operations-qa-testing-protocols',
        skills: ['Operations Management', 'Quality Assurance', 'Testing', 'Protocol Development']
      },
      {
        workTypeId: 'operations-qa-standards-compliance',
        skills: ['Operations Management', 'Quality Assurance', 'Compliance', 'Standards Management']
      },
      {
        workTypeId: 'operations-qa-inspection-procedures',
        skills: ['Operations Management', 'Quality Assurance', 'Quality Control', 'Inspection']
      },
      {
        workTypeId: 'operations-qa-control-systems',
        skills: ['Operations Management', 'Quality Assurance', 'Quality Control', 'Systems Management']
      },
      {
        workTypeId: 'operations-qa-documentation',
        skills: ['Operations Management', 'Quality Assurance', 'Documentation', 'Record Keeping']
      },
      {
        workTypeId: 'operations-qa-training-programs',
        skills: ['Operations Management', 'Quality Assurance', 'Training & Development', 'Program Management']
      },
      {
        workTypeId: 'operations-qa-audit-management',
        skills: ['Operations Management', 'Quality Assurance', 'Audit Management', 'Compliance']
      },
      {
        workTypeId: 'operations-qa-corrective-actions',
        skills: ['Operations Management', 'Quality Assurance', 'Problem Solving', 'Corrective Action']
      }
    ];

    const allMappings = [...processImprovementSkillMappings, ...qualityAssuranceSkillMappings];

    // Get all existing skills
    const allSkills = await prisma.skill.findMany();
    console.log(`📋 Found ${allSkills.length} existing skills`);
    console.log('');

    let totalSkillsCreated = 0;
    let totalMappingsCreated = 0;
    let processedWorkTypes = 0;

    console.log('🔧 Processing skill mappings for new work types...');
    console.log('');

    for (const mapping of allMappings) {
      // Check if work type exists
      const workType = await prisma.workType.findUnique({
        where: { id: mapping.workTypeId },
        include: {
          workTypeSkills: {
            include: { skill: true }
          }
        }
      });

      if (!workType) {
        console.log(`⚠️  Work type not found: ${mapping.workTypeId}`);
        continue;
      }

      console.log(`📌 Processing: ${workType.label} (${workType.id})`);
      processedWorkTypes++;

      // Check if already has skills
      if (workType.workTypeSkills.length > 0) {
        console.log(`   ✅ Already has ${workType.workTypeSkills.length} skills`);
        console.log('');
        continue;
      }

      // Add skills
      for (const skillName of mapping.skills) {
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
        } catch (error) {
          if (error.code === 'P2002') {
            console.log(`   ⚠️  Already mapped: ${skillName}`);
          } else {
            console.log(`   ❌ Failed to map ${skillName}: ${error.message}`);
          }
        }
      }
      console.log('');
    }

    console.log('📊 SKILL MAPPING SUMMARY:');
    console.log(`✅ Work types processed: ${processedWorkTypes}`);
    console.log(`✅ Skills created: ${totalSkillsCreated}`);
    console.log(`✅ Skill mappings created: ${totalMappingsCreated}`);
    console.log('');

    console.log('🎉 SUCCESS: New work types now have skill mappings!');
    console.log('✅ Process Improvement and Quality Assurance categories are complete');

  } catch (error) {
    console.error('❌ Error adding skills to new work types:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the function
addSkillsToNewWorkTypes()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });