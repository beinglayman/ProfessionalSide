const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedWorkTypeSkillMappings() {
  console.log('🔗 Starting Work Type-Skills mapping seeding...\n');

  try {
    // Get all work types and skills first
    console.log('📥 Fetching all work types and skills...');
    const [workTypes, skills] = await Promise.all([
      prisma.workType.findMany({ select: { id: true } }),
      prisma.skill.findMany({ select: { id: true } })
    ]);

    console.log(`Found ${workTypes.length} work types and ${skills.length} skills\n`);

    // Create Sets for fast lookup
    const skillIds = new Set(skills.map(s => s.id));
    const workTypeIds = new Set(workTypes.map(wt => wt.id));

    // Work type short IDs to skill IDs mapping
    const workTypeToSkills = {
      // Frontend Development
      'ui-implementation': ['react', 'vue', 'angular', 'javascript', 'typescript', 'html5', 'css3'],
      'state-management': ['react', 'vue', 'angular', 'javascript', 'typescript'],
      'frontend-performance': ['javascript', 'typescript', 'webpack', 'vite'],
      'user-experience-logic': ['javascript', 'typescript', 'react', 'vue'],
      'animations-transitions': ['css3', 'javascript', 'framer', 'after-effects'],
      'responsive-design-implementation': ['css3', 'html5', 'sass', 'javascript'],
      'cross-browser-compatibility': ['javascript', 'css3', 'html5'],
      'frontend-accessibility': ['html5', 'css3', 'javascript'],

      // Backend Development
      'api-development': ['nodejs', 'python', 'java', 'go', 'express', 'fastapi'],
      'database-work': ['sql', 'postgresql', 'mysql', 'mongodb', 'redis'],
      'business-logic-implementation': ['nodejs', 'python', 'java', 'go', 'javascript'],
      'third-party-integrations': ['nodejs', 'python', 'java'],
      'authentication-authorization': ['nodejs', 'python', 'java'],
      'caching-strategies': ['redis', 'nodejs', 'python', 'java'],
      'background-jobs-queues': ['nodejs', 'python', 'java', 'redis'],
      'microservices-architecture': ['docker', 'kubernetes', 'nodejs', 'java', 'go'],

      // DevOps
      'ci-pipeline-development': ['jenkins', 'github-actions', 'gitlab-ci', 'docker'],
      'cd-pipeline-development': ['docker', 'kubernetes', 'terraform'],
      'environment-provisioning': ['docker', 'kubernetes', 'terraform'],
      'containerization': ['docker', 'kubernetes'],
      'infrastructure-as-code': ['terraform', 'ansible'],

      // Design
      'wireframing': ['figma', 'sketch', 'adobe-xd'],
      'prototyping': ['figma', 'sketch', 'principle', 'framer'],
      'ui-mockups': ['figma', 'sketch', 'photoshop'],
      'user-interviews': ['user-research'],
      'usability-testing': ['user-research'],
      'user-flows': ['figma', 'sketch'],
      'journey-mapping': ['figma', 'user-research'],
      'iconography': ['illustrator', 'figma', 'sketch'],
      'typography': ['figma', 'sketch', 'photoshop'],
      'component-design': ['figma', 'sketch'],
      'pattern-library': ['figma', 'sketch'],
      'design-tokens': ['figma'],

      // Product
      'market-research': ['market-research', 'competitive-analysis'],
      'roadmap-planning': ['product-management'],
      'okr-goal-setting': ['product-management'],
      'competitive-analysis': ['competitive-analysis', 'market-research'],
      'customer-interviews': ['user-research'],
      'problem-validation': ['user-research', 'product-management'],

      // Marketing
      'seo-optimization': ['seo', 'digital-marketing'],
      'sem-campaigns': ['sem', 'digital-marketing'],
      'content-creation': ['content-marketing'],
      'social-media-marketing': ['social-media-marketing', 'digital-marketing'],
      'email-campaigns': ['email-marketing', 'digital-marketing'],
      'conversion-optimization': ['conversion-optimization', 'marketing-analytics'],

      // Sales
      'prospecting': ['lead-generation', 'sales-strategy'],
      'demo-presentation': ['communication', 'sales-strategy'],
      'negotiation': ['negotiation', 'sales-strategy'],
      'closing': ['sales-strategy', 'negotiation'],
      'account-management': ['account-management', 'customer-relationship-management'],
      'sales-forecasting': ['sales-forecasting', 'sales-strategy']
    };

    // Collect all mappings to insert
    const mappingsToInsert = [];

    console.log('🔍 Processing work type-skill mappings...');

    for (const [shortId, skillIdsList] of Object.entries(workTypeToSkills)) {
      // Find work types that end with this short ID
      const matchingWorkTypes = workTypes.filter(wt =>
        wt.id.endsWith(`-${shortId}`) || wt.id === shortId
      );

      for (const workType of matchingWorkTypes) {
        for (const skillId of skillIdsList) {
          // Only add if skill exists
          if (skillIds.has(skillId)) {
            mappingsToInsert.push({
              workTypeId: workType.id,
              skillId: skillId
            });
          }
        }
      }
    }

    console.log(`📊 Prepared ${mappingsToInsert.length} work type-skill mappings`);
    console.log('💾 Inserting mappings in batch...\n');

    // Batch insert with skipDuplicates
    const result = await prisma.workTypeSkill.createMany({
      data: mappingsToInsert,
      skipDuplicates: true
    });

    console.log(`✅ Successfully created ${result.count} work type-skill mappings!`);

    // Final count
    const totalMappings = await prisma.workTypeSkill.count();
    console.log(`📈 Total mappings in database: ${totalMappings}\n`);

  } catch (error) {
    console.error('❌ Error seeding work type-skill mappings:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedWorkTypeSkillMappings();
