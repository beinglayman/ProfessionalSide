const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function populateSkillMappingsBatch3() {
  try {
    console.log('🔄 Starting Batch 3: Complete Design Focus Area Coverage...\n');

    // Get all available skills to work with
    const allSkills = await prisma.skill.findMany({
      orderBy: { name: 'asc' }
    });

    console.log(`📋 Available skills in database: ${allSkills.length}`);
    console.log('');

    // Comprehensive skill mappings for ALL Design work types
    const skillMappings = [
      // DESIGN - Brand Design (completing remaining mappings)
      {
        workTypeId: 'design-brand-design-brand-identity-design',
        skillNames: ['Adobe Illustrator', 'Adobe Photoshop', 'Figma', 'Brand Strategy', 'Typography', 'Creative Strategy']
      },
      {
        workTypeId: 'design-brand-design-brand-guidelines',
        skillNames: ['Adobe Illustrator', 'Figma', 'Brand Strategy', 'Typography', 'Design Systems', 'Technical Writing']
      },
      {
        workTypeId: 'design-brand-design-brand-strategy',
        skillNames: ['Brand Strategy', 'Market Research', 'Competitive Strategy', 'Strategic Analysis', 'Market Analysis']
      },
      {
        workTypeId: 'design-brand-design-brand-messaging-design',
        skillNames: ['Content Marketing', 'Brand Strategy', 'Communication', 'Creative Strategy', 'Typography', 'Design Thinking']
      },
      {
        workTypeId: 'design-brand-design-brand-application',
        skillNames: ['Adobe Illustrator', 'Adobe Photoshop', 'Figma', 'Brand Strategy', 'Typography', 'Design Systems']
      },
      {
        workTypeId: 'design-brand-design-brand-consistency',
        skillNames: ['Brand Strategy', 'Quality Assurance', 'Design Systems', 'Figma', 'Documentation', 'Process Improvement']
      },
      {
        workTypeId: 'design-brand-design-brand-evolution',
        skillNames: ['Brand Strategy', 'Market Research', 'Creative Strategy', 'Adobe Illustrator', 'Strategic Analysis', 'Innovation Management']
      },
      {
        workTypeId: 'design-brand-design-brand-experience-design',
        skillNames: ['User Experience Design', 'Brand Strategy', 'Figma', 'User Research', 'Design Thinking', 'Design Systems']
      },

      // DESIGN - Collaboration (completing remaining mappings)
      {
        workTypeId: 'design-collaboration-stakeholder-presentations',
        skillNames: ['Presentation Skills', 'Figma', 'Communication', 'Project Management', 'Design Thinking', 'Adobe Illustrator']
      },
      {
        workTypeId: 'design-collaboration-design-reviews-critiques',
        skillNames: ['Design Leadership', 'Communication', 'Mentoring', 'Quality Assurance', 'Design Thinking', 'Feedback Management']
      },
      {
        workTypeId: 'design-collaboration-cross-functional-alignment',
        skillNames: ['Project Management', 'Communication', 'Agile Methodology', 'Leadership', 'Stakeholder Management', 'Team Leadership']
      },
      {
        workTypeId: 'design-collaboration-design-workshops-facilitation',
        skillNames: ['Workshop Facilitation', 'Design Thinking', 'Communication', 'Leadership', 'Creative Strategy', 'Team Leadership']
      },
      {
        workTypeId: 'design-collaboration-developer-collaboration',
        skillNames: ['HTML5', 'CSS3', 'JavaScript', 'Figma', 'Technical Writing', 'API Design']
      },
      {
        workTypeId: 'design-collaboration-handoff-to-development',
        skillNames: ['Figma', 'Sketch', 'Zeplin', 'CSS3', 'HTML5', 'Design Systems']
      },
      {
        workTypeId: 'design-collaboration-design-advocacy',
        skillNames: ['Communication', 'Leadership', 'Presentation Skills', 'Design Thinking', 'Strategic Planning', 'Design Leadership']
      },
      {
        workTypeId: 'design-collaboration-design-documentation',
        skillNames: ['Technical Writing', 'Figma', 'Confluence', 'Documentation', 'Design Systems', 'Process Improvement']
      },

      // DESIGN - Design Systems (completing all mappings)
      {
        workTypeId: 'design-design-systems-component-library-design',
        skillNames: ['Figma', 'Design Systems', 'React', 'CSS3', 'HTML5', 'JavaScript']
      },
      {
        workTypeId: 'design-design-systems-design-tokens',
        skillNames: ['Design Systems', 'CSS3', 'JSON', 'Figma', 'Sass', 'Frontend Development']
      },
      {
        workTypeId: 'design-design-systems-component-design',
        skillNames: ['Figma', 'React', 'HTML5', 'CSS3', 'Design Systems', 'JavaScript']
      },
      {
        workTypeId: 'design-design-systems-design-system-governance',
        skillNames: ['Design Leadership', 'Process Improvement', 'Documentation', 'Quality Assurance', 'Team Leadership', 'Strategic Planning']
      },
      {
        workTypeId: 'design-design-systems-design-system-maintenance',
        skillNames: ['Design Systems', 'Figma', 'Quality Assurance', 'Documentation', 'Version Control', 'Process Improvement']
      },
      {
        workTypeId: 'design-design-systems-design-system-adoption',
        skillNames: ['Change Management', 'Training Development', 'Communication', 'Design Leadership', 'Workshop Facilitation', 'Team Leadership']
      },
      {
        workTypeId: 'design-design-systems-design-system-evolution',
        skillNames: ['Innovation Management', 'Design Systems', 'Strategic Planning', 'User Research', 'Design Thinking', 'Leadership']
      },
      {
        workTypeId: 'design-design-systems-style-guide-creation',
        skillNames: ['Typography', 'Brand Strategy', 'Design Systems', 'Figma', 'Technical Writing', 'Adobe Illustrator']
      },

      // DESIGN - Graphic Design
      {
        workTypeId: 'design-graphic-design-print-design',
        skillNames: ['Adobe InDesign', 'Adobe Photoshop', 'Adobe Illustrator', 'Typography', 'Print Production', 'Color Theory']
      },
      {
        workTypeId: 'design-graphic-design-digital-graphics',
        skillNames: ['Adobe Photoshop', 'Adobe Illustrator', 'Figma', 'Digital Design', 'Web Graphics', 'Brand Strategy']
      },
      {
        workTypeId: 'design-graphic-design-logo-design',
        skillNames: ['Adobe Illustrator', 'Brand Strategy', 'Typography', 'Creative Strategy', 'Adobe Photoshop', 'Vector Graphics']
      },
      {
        workTypeId: 'design-graphic-design-illustration',
        skillNames: ['Adobe Illustrator', 'Adobe Photoshop', 'Digital Illustration', 'Creative Strategy', 'Typography', 'Color Theory']
      },
      {
        workTypeId: 'design-graphic-design-layout-design',
        skillNames: ['Adobe InDesign', 'Typography', 'Layout Design', 'Adobe Photoshop', 'Print Production', 'Figma']
      },
      {
        workTypeId: 'design-graphic-design-marketing-collateral',
        skillNames: ['Adobe InDesign', 'Adobe Photoshop', 'Brand Strategy', 'Marketing', 'Typography', 'Creative Strategy']
      },
      {
        workTypeId: 'design-graphic-design-packaging-design',
        skillNames: ['Adobe Illustrator', 'Adobe Photoshop', 'Packaging Design', 'Brand Strategy', 'Print Production', 'Creative Strategy']
      },
      {
        workTypeId: 'design-graphic-design-typography',
        skillNames: ['Typography', 'Adobe InDesign', 'Font Design', 'Brand Strategy', 'Layout Design', 'Creative Strategy']
      },

      // DESIGN - Industrial Design
      {
        workTypeId: 'design-industrial-design-product-design',
        skillNames: ['CAD Software', 'Product Design', 'Industrial Design', '3D Modeling', 'Prototyping', 'Design Thinking']
      },
      {
        workTypeId: 'design-industrial-design-prototyping',
        skillNames: ['Prototyping', '3D Printing', 'CAD Software', 'Product Design', 'Testing', 'Manufacturing']
      },
      {
        workTypeId: 'design-industrial-design-concept-development',
        skillNames: ['Design Thinking', 'Concept Development', 'Sketching', 'Creative Strategy', 'Innovation Management', 'User Research']
      },
      {
        workTypeId: 'design-industrial-design-materials-research',
        skillNames: ['Materials Science', 'Research', 'Product Design', 'Sustainability', 'Manufacturing', 'Innovation Management']
      },
      {
        workTypeId: 'design-industrial-design-manufacturing-design',
        skillNames: ['Manufacturing', 'CAD Software', 'Product Design', 'Process Improvement', 'Quality Management', 'Supply Chain Management']
      },
      {
        workTypeId: 'design-industrial-design-ergonomics',
        skillNames: ['Ergonomics', 'Human Factors', 'User Research', 'Product Design', 'Testing', 'Design Thinking']
      },
      {
        workTypeId: 'design-industrial-design-sustainability-design',
        skillNames: ['Sustainability', 'Eco-Design', 'Materials Science', 'Product Design', 'Life Cycle Assessment', 'Innovation Management']
      },
      {
        workTypeId: 'design-industrial-design-cad-modeling',
        skillNames: ['CAD Software', '3D Modeling', 'Technical Drawing', 'Product Design', 'Engineering', 'Prototyping']
      },

      // DESIGN - Interaction Design
      {
        workTypeId: 'design-interaction-design-user-interface-design',
        skillNames: ['User Interface Design', 'Figma', 'Sketch', 'User Experience Design', 'Prototyping', 'Design Systems']
      },
      {
        workTypeId: 'design-interaction-design-user-experience-design',
        skillNames: ['User Experience Design', 'User Research', 'Prototyping', 'Figma', 'Design Thinking', 'Usability Testing']
      },
      {
        workTypeId: 'design-interaction-design-prototyping',
        skillNames: ['Prototyping', 'Figma', 'InVision', 'User Experience Design', 'Design Thinking', 'User Interface Design']
      },
      {
        workTypeId: 'design-interaction-design-user-research',
        skillNames: ['User Research', 'User Testing', 'Data Analysis', 'Research Methods', 'Design Thinking', 'User Experience Design']
      },
      {
        workTypeId: 'design-interaction-design-information-architecture',
        skillNames: ['Information Architecture', 'User Experience Design', 'Site Mapping', 'User Research', 'Content Strategy', 'Navigation Design']
      },
      {
        workTypeId: 'design-interaction-design-usability-testing',
        skillNames: ['Usability Testing', 'User Research', 'Data Analysis', 'User Experience Design', 'Testing', 'Research Methods']
      },
      {
        workTypeId: 'design-interaction-design-accessibility-design',
        skillNames: ['Accessibility', 'WCAG', 'User Experience Design', 'Inclusive Design', 'User Interface Design', 'Design Systems']
      },
      {
        workTypeId: 'design-interaction-design-mobile-app-design',
        skillNames: ['Mobile Design', 'User Interface Design', 'Figma', 'iOS Design', 'Android Design', 'User Experience Design']
      },

      // DESIGN - Motion Design
      {
        workTypeId: 'design-motion-design-animation',
        skillNames: ['After Effects', 'Animation', 'Motion Graphics', 'Video Editing', 'Cinema 4D', 'Creative Strategy']
      },
      {
        workTypeId: 'design-motion-design-video-editing',
        skillNames: ['Video Editing', 'Premiere Pro', 'After Effects', 'Color Correction', 'Audio Editing', 'Storytelling']
      },
      {
        workTypeId: 'design-motion-design-motion-graphics',
        skillNames: ['Motion Graphics', 'After Effects', 'Animation', 'Typography', 'Brand Strategy', 'Creative Strategy']
      },
      {
        workTypeId: 'design-motion-design-3d-animation',
        skillNames: ['3D Animation', 'Cinema 4D', 'Blender', '3D Modeling', 'Animation', 'Rendering']
      },
      {
        workTypeId: 'design-motion-design-ui-animation',
        skillNames: ['UI Animation', 'After Effects', 'Principle', 'Figma', 'User Interface Design', 'Motion Graphics']
      },
      {
        workTypeId: 'design-motion-design-storytelling',
        skillNames: ['Storytelling', 'Creative Strategy', 'Video Production', 'Content Strategy', 'Brand Strategy', 'Communication']
      },
      {
        workTypeId: 'design-motion-design-visual-effects',
        skillNames: ['Visual Effects', 'After Effects', 'Compositing', 'Motion Graphics', 'Video Editing', '3D Animation']
      },
      {
        workTypeId: 'design-motion-design-explainer-videos',
        skillNames: ['Explainer Videos', 'Animation', 'Storytelling', 'After Effects', 'Content Strategy', 'Creative Strategy']
      }
    ];

    console.log(`🎯 Processing ${skillMappings.length} work type-skill mappings in Batch 3...`);
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

    console.log('📊 BATCH 3 SUMMARY:');
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

    // Verify Design focus area coverage
    console.log('🔍 Checking Design Focus Area Coverage...');
    
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
                workTypeSkills: {
                  include: {
                    skill: true
                  }
                }
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
        console.log(`\n📂 ${category.label}:`);
        category.workTypes.forEach(workType => {
          totalDesignWorkTypes++;
          const skillCount = workType.workTypeSkills.length;
          const hasEnough = skillCount >= 4;
          
          if (hasEnough) {
            designWorkTypesWithEnoughSkills++;
          }

          const status = hasEnough ? '✅' : '❌';
          console.log(`   ${status} ${workType.label}: ${skillCount} skills`);
        });
      });

      const designCoveragePercentage = totalDesignWorkTypes > 0 ? 
        ((designWorkTypesWithEnoughSkills / totalDesignWorkTypes) * 100).toFixed(1) : 0;

      console.log(`\n📈 Design Focus Area Coverage:`);
      console.log(`   Total work types: ${totalDesignWorkTypes}`);
      console.log(`   ✅ With 4+ skills: ${designWorkTypesWithEnoughSkills}`);
      console.log(`   ❌ With <4 skills: ${totalDesignWorkTypes - designWorkTypesWithEnoughSkills}`);
      console.log(`   📊 Coverage percentage: ${designCoveragePercentage}%`);
    }

    console.log('');
    console.log('ℹ️  Batch 3 focuses on comprehensive Design focus area coverage.');
    console.log('   Ready for Batch 4: Development focus area completion.');
    console.log('');
    console.log('✅ Batch 3 completed successfully!');

  } catch (error) {
    console.error('❌ Error populating skill mappings:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the function
populateSkillMappingsBatch3()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });