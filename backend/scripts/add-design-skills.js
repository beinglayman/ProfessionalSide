// Script to add missing design work type to skills mappings
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Design work type to skills mappings
const designSkillMappings = {
  // Design Testing work types
  'a-b-testing': ['figma', 'user-research', 'marketing-analytics'],
  'usability-studies': ['user-research', 'figma'],
  'design-validation': ['figma', 'user-research', 'sketch'],
  'concept-testing': ['user-research', 'figma'],
  'preference-testing': ['user-research', 'figma'],
  'benchmark-testing': ['user-research', 'competitive-analysis'],
  'first-click-testing': ['user-research', 'figma'],
  'eye-tracking': ['user-research'],
  
  // Visual Design work types
  'ui-mockups': ['figma', 'sketch', 'photoshop'],
  'style-guide-creation': ['figma', 'sketch', 'illustrator'],
  'iconography': ['illustrator', 'figma', 'sketch'],
  'illustration': ['illustrator', 'photoshop'],
  'typography': ['figma', 'sketch', 'photoshop'],
  'color-systems': ['figma', 'sketch'],
  'branding-elements': ['illustrator', 'photoshop', 'figma'],
  'data-visualization': ['figma', 'sketch'],
  
  // Interaction Design work types
  'wireframing': ['figma', 'sketch', 'adobe-xd'],
  'prototyping': ['figma', 'sketch', 'principle', 'framer'],
  'interaction-design': ['figma', 'sketch', 'adobe-xd'],
  'accessibility-design': ['figma', 'html5', 'css3'],
  'gesture-design': ['figma', 'sketch'],
  'animation-design': ['after-effects', 'principle', 'framer'],
  'responsive-design-planning': ['figma', 'css3'],
  'form-design': ['figma', 'sketch'],
  
  // Design Systems work types
  'component-design': ['figma', 'sketch'],
  'pattern-library': ['figma', 'sketch'],
  'design-tokens': ['figma'],
  'system-documentation': ['figma'],
  'design-system-governance': ['figma', 'leadership'],
  'component-variants': ['figma', 'sketch'],
  'system-adoption': ['figma', 'communication'],
  'system-versioning': ['figma'],
  
  // Design Collaboration work types
  'design-reviews': ['figma', 'communication'],
  'handoff-to-ui-design': ['figma', 'sketch'],
  'developer-collaboration': ['figma', 'communication'],
  'stakeholder-presentations': ['figma', 'communication'],
  'design-workshops': ['figma', 'leadership'],
  'cross-functional-alignment': ['communication', 'leadership'],
  'design-documentation': ['figma'],
  'design-advocacy': ['communication', 'leadership']
};

async function addDesignSkills() {
  console.log('🎨 Adding missing design work type to skills mappings...');
  
  let mappingsAdded = 0;
  let mappingsSkipped = 0;

  for (const [workTypeShortId, skillIds] of Object.entries(designSkillMappings)) {
    console.log(`\n🔍 Processing work type: ${workTypeShortId}`);
    
    // Find the work type by searching for work types that end with the short ID
    const workType = await prisma.workType.findFirst({
      where: { 
        id: { 
          endsWith: `-${workTypeShortId}` 
        } 
      }
    });
    
    if (workType) {
      console.log(`✅ Found work type: ${workType.id}`);
      
      for (const skillId of skillIds) {
        // Check if skill exists
        const skill = await prisma.skill.findUnique({
          where: { id: skillId }
        });
        
        if (skill) {
          // Check if mapping already exists
          const existingMapping = await prisma.workTypeSkill.findUnique({
            where: { 
              workTypeId_skillId: { 
                workTypeId: workType.id, 
                skillId: skill.id 
              } 
            }
          });
          
          if (!existingMapping) {
            await prisma.workTypeSkill.create({
              data: {
                workTypeId: workType.id,
                skillId: skill.id
              }
            });
            console.log(`  ➕ Added skill: ${skill.name}`);
            mappingsAdded++;
          } else {
            console.log(`  ⏭️  Skipped skill (already exists): ${skill.name}`);
            mappingsSkipped++;
          }
        } else {
          console.log(`  ❌ Skill not found: ${skillId}`);
        }
      }
    } else {
      console.log(`  ❌ Work type not found for: ${workTypeShortId}`);
    }
  }

  console.log(`\n🎯 Summary:`);
  console.log(`   ➕ Mappings added: ${mappingsAdded}`);
  console.log(`   ⏭️  Mappings skipped: ${mappingsSkipped}`);
  console.log(`\n✅ Design skills mapping completed!`);
}

async function main() {
  try {
    await addDesignSkills();
  } catch (error) {
    console.error('❌ Error adding design skills:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error('❌ Script failed:', e);
    process.exit(1);
  });