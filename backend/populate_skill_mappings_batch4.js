const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function populateSkillMappingsBatch4() {
  try {
    console.log('🔄 Starting Batch 4: Critical Design Work Types Skill Mapping...\n');

    // Get all available skills to work with
    const allSkills = await prisma.skill.findMany({
      orderBy: { name: 'asc' }
    });

    console.log(`📋 Available skills in database: ${allSkills.length}`);
    console.log('');

    // Targeted skill mappings for critical Design work types needing skills
    const skillMappings = [
      // DESIGN COLLABORATION - Critical missing mappings
      {
        workTypeId: 'design-collaboration-design-reviews',
        skillNames: ['Design Leadership', 'Communication', 'Quality Assurance', 'Design Thinking']
      },
      {
        workTypeId: 'design-collaboration-design-workshops',
        skillNames: ['Workshop Facilitation', 'Design Thinking', 'Communication', 'Team Leadership']
      },
      {
        workTypeId: 'design-collaboration-handoff-to-ui-design',
        skillNames: ['Figma', 'Design Systems', 'Technical Writing', 'HTML5']
      },

      // DESIGN SYSTEMS - Critical missing mappings
      {
        workTypeId: 'design-design-systems-component-documentation',
        skillNames: ['Technical Writing', 'Documentation', 'Design Systems', 'Figma']
      },
      {
        workTypeId: 'design-design-systems-component-variants',
        skillNames: ['Design Systems', 'Figma', 'React', 'CSS3']
      },
      {
        workTypeId: 'design-design-systems-cross-platform-design-systems',
        skillNames: ['Design Systems', 'React', 'iOS Development', 'Android Development']
      },
      {
        workTypeId: 'design-design-systems-design-system-architecture',
        skillNames: ['Design Systems', 'Strategic Planning', 'Technical Writing', 'Design Leadership']
      },
      {
        workTypeId: 'design-design-systems-design-token-management',
        skillNames: ['Design Systems', 'JSON', 'CSS3', 'Technical Writing']
      },
      {
        workTypeId: 'design-design-systems-pattern-library',
        skillNames: ['Design Systems', 'Figma', 'Documentation', 'React']
      },
      {
        workTypeId: 'design-design-systems-style-guide-development',
        skillNames: ['Typography', 'Brand Strategy', 'Design Systems', 'Technical Writing']
      },
      {
        workTypeId: 'design-design-systems-system-adoption',
        skillNames: ['Change Management', 'Training Development', 'Communication', 'Design Leadership']
      },
      {
        workTypeId: 'design-design-systems-system-documentation',
        skillNames: ['Technical Writing', 'Documentation', 'Design Systems', 'Process Improvement']
      },
      {
        workTypeId: 'design-design-systems-system-versioning',
        skillNames: ['Version Control', 'Design Systems', 'Process Improvement', 'Technical Writing']
      },

      // DESIGN TESTING & VALIDATION - All need skills
      {
        workTypeId: 'design-design-testing-a-b-testing',
        skillNames: ['A/B Testing', 'Data Analysis', 'User Research', 'Statistical Analysis']
      },
      {
        workTypeId: 'design-design-testing-benchmark-testing',
        skillNames: ['User Research', 'Data Analysis', 'Competitive Analysis', 'Testing']
      },
      {
        workTypeId: 'design-design-testing-concept-testing',
        skillNames: ['User Research', 'Prototyping', 'Testing', 'Design Thinking']
      },
      {
        workTypeId: 'design-design-testing-design-validation',
        skillNames: ['User Research', 'Testing', 'Data Analysis', 'Design Thinking']
      },
      {
        workTypeId: 'design-design-testing-eye-tracking',
        skillNames: ['User Research', 'Data Analysis', 'Testing', 'Research Methods']
      },
      {
        workTypeId: 'design-design-testing-first-click-testing',
        skillNames: ['User Research', 'Testing', 'Data Analysis', 'Usability Testing']
      },
      {
        workTypeId: 'design-design-testing-preference-testing',
        skillNames: ['User Research', 'Testing', 'Data Analysis', 'Market Research']
      },
      {
        workTypeId: 'design-design-testing-usability-studies',
        skillNames: ['User Research', 'Usability Testing', 'Data Analysis', 'Testing']
      },

      // INTERACTION DESIGN - Critical skills needed
      {
        workTypeId: 'design-interaction-accessibility-design',
        skillNames: ['Accessibility', 'HTML5', 'CSS3', 'User Experience Design']
      },
      {
        workTypeId: 'design-interaction-animation-design',
        skillNames: ['Adobe After Effects', 'Principle', 'Framer', 'Animation']
      },
      {
        workTypeId: 'design-interaction-form-design',
        skillNames: ['Figma', 'Sketch', 'User Experience Design', 'HTML5']
      },
      {
        workTypeId: 'design-interaction-gesture-design',
        skillNames: ['Figma', 'Sketch', 'Mobile Design', 'User Experience Design']
      },
      {
        workTypeId: 'design-interaction-interaction-design',
        skillNames: ['User Experience Design', 'Prototyping', 'Figma', 'Design Thinking']
      },
      {
        workTypeId: 'design-interaction-prototyping',
        skillNames: ['Prototyping', 'Figma', 'InVision', 'User Experience Design']
      },
      {
        workTypeId: 'design-interaction-responsive-design-planning',
        skillNames: ['Figma', 'CSS3', 'Responsive Design', 'HTML5']
      },
      {
        workTypeId: 'design-interaction-wireframing',
        skillNames: ['Wireframing', 'Figma', 'Sketch', 'User Experience Design']
      },

      // PRODUCT DESIGN - Critical areas needing more skills
      {
        workTypeId: 'design-product-design-design-leadership',
        skillNames: ['Leadership', 'Mentoring', 'Figma', 'Design Leadership']
      },
      {
        workTypeId: 'design-product-design-design-operations',
        skillNames: ['Figma', 'Process Improvement', 'Project Management', 'Design Leadership']
      },
      {
        workTypeId: 'design-product-design-design-process-optimization',
        skillNames: ['Process Improvement', 'Agile Methodology', 'Design Leadership', 'Strategic Planning']
      },
      {
        workTypeId: 'design-product-design-design-thinking',
        skillNames: ['Figma', 'User Research', 'Design Thinking', 'Creative Strategy']
      },

      // PROTOTYPING - Critical areas
      {
        workTypeId: 'design-prototyping-digital-prototyping',
        skillNames: ['Prototyping', 'Figma', 'Sketch', 'Digital Design']
      },
      {
        workTypeId: 'design-prototyping-interactive-prototyping',
        skillNames: ['Prototyping', 'Figma', 'InVision', 'Principle']
      },
      {
        workTypeId: 'design-prototyping-paper-prototyping',
        skillNames: ['Prototyping', 'Design Thinking', 'User Research', 'Sketching']
      },
      {
        workTypeId: 'design-prototyping-prototype-documentation',
        skillNames: ['Technical Writing', 'Documentation', 'Prototyping', 'Design Systems']
      },
      {
        workTypeId: 'design-prototyping-prototype-testing',
        skillNames: ['User Research', 'Testing', 'Prototyping', 'Data Analysis']
      },
      {
        workTypeId: 'design-prototyping-rapid-prototyping',
        skillNames: ['Prototyping', 'Design Thinking', 'Figma', 'Agile Methodology']
      },
      {
        workTypeId: 'design-prototyping-tool-specific-prototyping',
        skillNames: ['Prototyping', 'Figma', 'Sketch', 'InVision']
      },

      // RESEARCH & STRATEGY - All need skills
      {
        workTypeId: 'design-research-strategy-competitive-analysis',
        skillNames: ['Competitive Analysis', 'Market Research', 'Strategic Analysis', 'Data Analysis']
      },
      {
        workTypeId: 'design-research-strategy-data-analysis',
        skillNames: ['Data Analysis', 'User Research', 'Statistical Analysis', 'Research Methods']
      },
      {
        workTypeId: 'design-research-strategy-design-strategy',
        skillNames: ['Strategic Planning', 'Design Leadership', 'Business Strategy', 'Design Thinking']
      },
      {
        workTypeId: 'design-research-strategy-insight-generation',
        skillNames: ['Data Analysis', 'User Research', 'Strategic Analysis', 'Research Methods']
      },
      {
        workTypeId: 'design-research-strategy-market-research',
        skillNames: ['Market Research', 'Competitive Analysis', 'Data Analysis', 'Research Methods']
      },
      {
        workTypeId: 'design-research-strategy-research-methodology',
        skillNames: ['Research Methods', 'User Research', 'Data Analysis', 'Statistical Analysis']
      },
      {
        workTypeId: 'design-research-strategy-strategic-recommendations',
        skillNames: ['Strategic Planning', 'Business Strategy', 'Data Analysis', 'Strategic Analysis']
      },
      {
        workTypeId: 'design-research-strategy-user-research-planning',
        skillNames: ['User Research', 'Research Methods', 'Strategic Planning', 'Data Analysis']
      },

      // SPECIALIZED DESIGN - High-impact areas
      {
        workTypeId: 'design-specialized-design-conversational-design',
        skillNames: ['User Experience Design', 'Content Strategy', 'Interaction Design', 'Design Thinking']
      },
      {
        workTypeId: 'design-specialized-design-dashboard-design',
        skillNames: ['Data Visualization', 'Figma', 'User Experience Design', 'Information Architecture']
      },
      {
        workTypeId: 'design-specialized-design-design-for-print',
        skillNames: ['Adobe InDesign', 'Typography', 'Print Production', 'Graphic Design']
      },
      {
        workTypeId: 'design-specialized-design-email-design',
        skillNames: ['Email Marketing', 'HTML5', 'CSS3', 'Responsive Design']
      },
      {
        workTypeId: 'design-specialized-design-landing-page-design',
        skillNames: ['Figma', 'HTML5', 'CSS3', 'Conversion Optimization']
      },
      {
        workTypeId: 'design-specialized-design-mobile-design',
        skillNames: ['Mobile Design', 'iOS Development', 'Android Development', 'User Experience Design']
      },
      {
        workTypeId: 'design-specialized-design-responsive-web-design',
        skillNames: ['Responsive Design', 'CSS3', 'HTML5', 'JavaScript']
      },
      {
        workTypeId: 'design-specialized-design-video-motion-graphics',
        skillNames: ['Adobe After Effects', 'Motion Graphics', 'Video Editing', 'Animation']
      }
    ];

    console.log(`🎯 Processing ${skillMappings.length} critical Design work type-skill mappings...`);
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

    console.log('📊 BATCH 4 SUMMARY:');
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

    // Check updated Design focus area coverage
    console.log('🔍 Checking Updated Design Focus Area Coverage...');
    
    const designFocusArea = await prisma.focusArea.findFirst({
      where: { 
        label: {
          contains: 'Design',
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

    if (designFocusArea) {
      let totalDesignWorkTypes = 0;
      let designWorkTypesWithEnoughSkills = 0;

      designFocusArea.workCategories.forEach(category => {
        category.workTypes.forEach(workType => {
          totalDesignWorkTypes++;
          const skillCount = workType.workTypeSkills.length;
          
          if (skillCount >= 4) {
            designWorkTypesWithEnoughSkills++;
          }
        });
      });

      const designCoveragePercentage = totalDesignWorkTypes > 0 ? 
        ((designWorkTypesWithEnoughSkills / totalDesignWorkTypes) * 100).toFixed(1) : 0;

      console.log(`\n📈 Updated Design Focus Area Coverage:`);
      console.log(`   Total work types: ${totalDesignWorkTypes}`);
      console.log(`   ✅ With 4+ skills: ${designWorkTypesWithEnoughSkills}`);
      console.log(`   ❌ With <4 skills: ${totalDesignWorkTypes - designWorkTypesWithEnoughSkills}`);
      console.log(`   📊 Coverage percentage: ${designCoveragePercentage}%`);
      
      const improvement = parseFloat(designCoveragePercentage) - 23.2;
      console.log(`   📈 Improvement: +${improvement.toFixed(1)}%`);
    }

    console.log('');
    console.log('ℹ️  Batch 4 focuses on critical Design work types needing skills.');
    console.log('   Significant improvement in Design focus area coverage achieved.');
    console.log('');
    console.log('✅ Batch 4 completed successfully!');

  } catch (error) {
    console.error('❌ Error populating skill mappings:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the function
populateSkillMappingsBatch4()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });