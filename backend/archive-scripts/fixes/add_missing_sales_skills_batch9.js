const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

function generateSkillSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

async function addMissingSalesSkillsBatch9() {
  try {
    console.log('🔄 Adding Missing Sales Skills from Batch 9...\n');

    // Missing skills identified from Batch 9 (Sales focus area)
    const missingSkills = [
      // Core sales and business skills
      'Data Analysis',
      'Business Planning',
      'Meeting Management',
      'Executive Communication',
      'Relationship Building',
      'Trust Building',
      'Customer Retention',
      'Contract Management',
      'Upselling',
      'Cross-selling',
      'Revenue Growth',
      'Deal Structuring',
      'Industry Analysis',
      'Market Expansion',
      'Go-to-Market Strategy',
      'Strategic Partnerships',
      'Alliance Management',
      
      // Channel and partner management
      'Partner Enablement',
      'Channel Management',
      'Sales Training',
      'Partner Recruitment',
      'Channel Development',
      'Analytics',
      'Partner Management',
      'Program Development',
      'Channel Strategy',
      'Program Management',
      
      // Customer success and retention
      'Customer Onboarding',
      'Revenue Expansion',
      'Account Growth',
      
      // Enterprise and complex sales
      'Complex Sales',
      'Deal Management',
      'Enterprise Sales',
      'Contract Negotiation',
      'Legal Negotiation',
      'Solution Selling',
      'Consultative Selling',
      'Value Selling',
      'Relationship Mapping',
      'Decision Maker Analysis',
      'Strategic Selling',
      
      // Sales operations and tools
      'CRM Management',
      'Data Entry',
      'Sales Operations',
      'Process Optimization',
      
      // Lead generation and qualification
      'Lead Qualification',
      'Inside Sales',
      'Sales Development',
      'Customer Research',
      'Phone Sales',
      'Cold Calling',
      'Telephone Communication',
      
      // Product demonstrations and presentations
      'Product Demonstrations',
      'Virtual Presentations',
      'Remote Selling',
      'Sales Presentations',
      'Technical Demonstrations',
      
      // Sales techniques and closing
      'Closing Techniques',
      'Sales Closing',
      'Discovery Calls',
      'Needs Analysis',
      'Sales Negotiation',
      'Contract Terms',
      'Objection Handling',
      'Sales Skills',
      'Persuasion',
      
      // Proposal and value communication
      'Proposal Writing',
      'Business Writing',
      'Value Proposition',
      'ROI Analysis',
      
      // Prospecting and outbound sales
      'Appointment Setting',
      'Prospecting',
      'Cold Outreach',
      'Prospect Research',
      'Outbound Sales',
      'Sales Campaigns',
      'Sales Prospecting',
      'Target Market Analysis',
      
      // Sales analytics and forecasting
      'Pipeline Analysis',
      'Revenue Forecasting',
      'Territory Management',
      'Geographic Analysis',
      'Resource Allocation',
      
      // Account and customer research
      'Account Research',
      'Marketing Qualified Leads',
      'Lead Nurturing',
      'Customer Communication',
      
      // Networking and social selling
      'Networking',
      'Professional Networking',
      'Industry Events',
      'Social Selling',
      'LinkedIn Sales',
      'Digital Prospecting'
    ];

    // Remove duplicates and sort
    const uniqueSkills = [...new Set(missingSkills)].sort();

    console.log(`📝 Processing ${uniqueSkills.length} unique missing Sales skills...`);
    console.log('');

    // Get existing skills to avoid duplicates
    const existingSkills = await prisma.skill.findMany({
      select: { name: true, id: true }
    });

    const existingSkillNames = new Set(existingSkills.map(skill => skill.name.toLowerCase()));

    let skillsAdded = 0;
    let skillsSkipped = 0;
    const addedSkills = [];
    const skippedSkills = [];

    for (const skillName of uniqueSkills) {
      // Check if skill already exists (case-insensitive)
      if (existingSkillNames.has(skillName.toLowerCase())) {
        console.log(`⚠️  Skill already exists: ${skillName}`);
        skillsSkipped++;
        skippedSkills.push(skillName);
        continue;
      }

      // Generate unique slug
      let baseSlug = generateSkillSlug(skillName);
      let finalSlug = baseSlug;
      let counter = 1;

      // Check for slug conflicts and generate unique slug
      let slugExists = true;
      while (slugExists) {
        const existingWithSlug = await prisma.skill.findUnique({
          where: { id: finalSlug }
        });

        if (!existingWithSlug) {
          slugExists = false;
        } else {
          finalSlug = `${baseSlug}-${counter}`;
          counter++;
        }
      }

      try {
        // Create the skill
        const newSkill = await prisma.skill.create({
          data: {
            id: finalSlug,
            name: skillName
          }
        });

        console.log(`✅ Added skill: ${skillName} (ID: ${finalSlug})`);
        skillsAdded++;
        addedSkills.push({ name: skillName, id: finalSlug });

      } catch (error) {
        console.log(`❌ Failed to add skill ${skillName}: ${error.message}`);
      }
    }

    console.log('');
    console.log('📊 MISSING SALES SKILLS ADDITION SUMMARY:');
    console.log(`✅ Skills added: ${skillsAdded}`);
    console.log(`⚠️  Skills skipped (already exist): ${skillsSkipped}`);
    console.log(`📋 Total processed: ${uniqueSkills.length}`);
    console.log('');

    if (addedSkills.length > 0) {
      console.log('🆕 NEWLY ADDED SALES SKILLS:');
      addedSkills.forEach(skill => {
        console.log(`   • ${skill.name} (${skill.id})`);
      });
      console.log('');
    }

    if (skippedSkills.length > 0) {
      console.log('⚠️  SKIPPED SKILLS (Already Exist):');
      skippedSkills.slice(0, 10).forEach(skill => {
        console.log(`   • ${skill}`);
      });
      if (skippedSkills.length > 10) {
        console.log(`   ... and ${skippedSkills.length - 10} more`);
      }
      console.log('');
    }

    // Get updated total skills count
    const totalSkillsAfter = await prisma.skill.count();
    console.log(`📈 Total skills in database after addition: ${totalSkillsAfter}`);
    
    console.log('');
    console.log('ℹ️  These skills were identified as missing during Batch 9 Sales focus area mapping.');
    console.log('   Adding them enables more comprehensive Sales work type-skill mappings.');
    console.log('');
    console.log('✅ Missing Sales skills addition completed successfully!');

  } catch (error) {
    console.error('❌ Error adding missing Sales skills:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the function
addMissingSalesSkillsBatch9()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });