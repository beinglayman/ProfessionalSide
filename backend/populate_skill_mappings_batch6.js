const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function populateSkillMappingsBatch6() {
  try {
    console.log('🔄 Starting Batch 6: Marketing Focus Area Foundation...\n');

    // Get all available skills to work with
    const allSkills = await prisma.skill.findMany({
      orderBy: { name: 'asc' }
    });

    console.log(`📋 Available skills in database: ${allSkills.length}`);
    console.log('');

    // Comprehensive skill mappings for high-impact Marketing work types
    const skillMappings = [
      // BRAND MANAGEMENT - Foundation brand work
      {
        workTypeId: 'marketing-brand-brand-strategy',
        skillNames: ['Brand Strategy', 'Strategic Planning', 'Market Research', 'Competitive Analysis']
      },
      {
        workTypeId: 'marketing-brand-brand-voice',
        skillNames: ['Brand Strategy', 'Content Marketing', 'Communication', 'Creative Strategy']
      },
      {
        workTypeId: 'marketing-brand-brand-guidelines',
        skillNames: ['Brand Strategy', 'Design Systems', 'Technical Writing', 'Creative Strategy']
      },
      {
        workTypeId: 'marketing-brand-brand-awareness',
        skillNames: ['Brand Strategy', 'Digital Marketing', 'Campaign Management', 'Marketing Analytics']
      },
      {
        workTypeId: 'marketing-brand-brand-assets',
        skillNames: ['Adobe Illustrator', 'Adobe Photoshop', 'Brand Strategy', 'Creative Strategy']
      },
      {
        workTypeId: 'marketing-brand-brand-monitoring',
        skillNames: ['Social Media Marketing', 'Marketing Analytics', 'Brand Strategy', 'Data Analysis']
      },
      {
        workTypeId: 'marketing-brand-brand-partnerships',
        skillNames: ['Partnership Strategy', 'Business Development', 'Brand Strategy', 'Negotiation']
      },
      {
        workTypeId: 'marketing-brand-rebranding-initiatives',
        skillNames: ['Brand Strategy', 'Change Management', 'Project Management', 'Creative Strategy']
      },

      // BRAND MARKETING - Strategic brand marketing
      {
        workTypeId: 'marketing-brand-marketing-positioning',
        skillNames: ['Brand Strategy', 'Market Research', 'Competitive Analysis', 'Strategic Planning']
      },
      {
        workTypeId: 'marketing-brand-marketing-messaging',
        skillNames: ['Brand Strategy', 'Content Marketing', 'Communication', 'Creative Strategy']
      },
      {
        workTypeId: 'marketing-brand-marketing-campaigns',
        skillNames: ['Campaign Management', 'Digital Marketing', 'Brand Strategy', 'Marketing Analytics']
      },
      {
        workTypeId: 'marketing-brand-marketing-research',
        skillNames: ['Market Research', 'Marketing Analytics', 'Brand Strategy', 'Consumer Research']
      },
      {
        workTypeId: 'marketing-brand-marketing-guidelines',
        skillNames: ['Brand Strategy', 'Technical Writing', 'Design Systems', 'Creative Strategy']
      },
      {
        workTypeId: 'marketing-brand-marketing-voice',
        skillNames: ['Brand Strategy', 'Content Marketing', 'Communication', 'Creative Strategy']
      },
      {
        workTypeId: 'marketing-brand-marketing-partnerships',
        skillNames: ['Partnership Strategy', 'Business Development', 'Brand Strategy', 'Negotiation']
      },
      {
        workTypeId: 'marketing-brand-marketing-crisis',
        skillNames: ['Crisis Management', 'Communication', 'Brand Strategy', 'Public Relations']
      },

      // CONTENT MARKETING - High-impact content areas
      {
        workTypeId: 'marketing-content-marketing-strategy',
        skillNames: ['Content Marketing', 'Strategic Planning', 'Marketing Analytics', 'SEO']
      },
      {
        workTypeId: 'marketing-content-marketing-creation',
        skillNames: ['Content Marketing', 'Copywriting', 'Creative Strategy', 'Content Production']
      },
      {
        workTypeId: 'marketing-content-marketing-distribution',
        skillNames: ['Content Marketing', 'Social Media Marketing', 'Email Marketing', 'Digital Marketing']
      },
      {
        workTypeId: 'marketing-content-marketing-analytics',
        skillNames: ['Marketing Analytics', 'Content Marketing', 'Data Analysis', 'Performance Marketing']
      },
      {
        workTypeId: 'marketing-content-marketing-seo',
        skillNames: ['SEO', 'Content Marketing', 'Keyword Research', 'Technical SEO']
      },
      {
        workTypeId: 'marketing-content-marketing-calendar',
        skillNames: ['Content Marketing', 'Project Management', 'Editorial Planning', 'Marketing Automation']
      },
      {
        workTypeId: 'marketing-content-marketing-video',
        skillNames: ['Video Marketing', 'Content Production', 'Video Editing', 'Creative Strategy']
      },
      {
        workTypeId: 'marketing-content-marketing-webinars',
        skillNames: ['Webinar Marketing', 'Content Marketing', 'Public Speaking', 'Lead Generation']
      },

      // CONTENT MARKETING (Second category) - Core content operations
      {
        workTypeId: 'marketing-content-content-strategy',
        skillNames: ['Content Marketing', 'Strategic Planning', 'Marketing Analytics', 'Customer Journey']
      },
      {
        workTypeId: 'marketing-content-content-creation',
        skillNames: ['Content Marketing', 'Copywriting', 'Creative Strategy', 'Content Production']
      },
      {
        workTypeId: 'marketing-content-blog-management',
        skillNames: ['Content Marketing', 'Blogging', 'SEO', 'Editorial Management']
      },
      {
        workTypeId: 'marketing-content-case-studies',
        skillNames: ['Case Study Writing', 'Content Marketing', 'Customer Success', 'Storytelling']
      },
      {
        workTypeId: 'marketing-content-content-distribution',
        skillNames: ['Content Marketing', 'Social Media Marketing', 'Email Marketing', 'Distribution Strategy']
      },
      {
        workTypeId: 'marketing-content-content-performance-analysis',
        skillNames: ['Marketing Analytics', 'Content Marketing', 'Performance Analysis', 'Data Analysis']
      },
      {
        workTypeId: 'marketing-content-editorial-calendar',
        skillNames: ['Editorial Planning', 'Content Marketing', 'Project Management', 'Content Strategy']
      },

      // DIGITAL MARKETING - Core digital channels
      {
        workTypeId: 'marketing-digital-marketing-strategy',
        skillNames: ['Digital Marketing', 'Strategic Planning', 'Marketing Analytics', 'Customer Acquisition']
      },
      {
        workTypeId: 'marketing-digital-marketing-campaigns',
        skillNames: ['Digital Marketing', 'Campaign Management', 'Marketing Analytics', 'Performance Marketing']
      },
      {
        workTypeId: 'marketing-digital-marketing-analytics',
        skillNames: ['Marketing Analytics', 'Digital Marketing', 'Google Analytics', 'Data Analysis']
      },
      {
        workTypeId: 'marketing-digital-paid-advertising',
        skillNames: ['Paid Advertising', 'Google Ads', 'Facebook Ads', 'Performance Marketing']
      },
      {
        workTypeId: 'marketing-digital-seo-optimization',
        skillNames: ['SEO', 'Technical SEO', 'Keyword Research', 'Content Optimization']
      },
      {
        workTypeId: 'marketing-digital-social-media-management',
        skillNames: ['Social Media Marketing', 'Content Creation', 'Community Management', 'Social Analytics']
      },
      {
        workTypeId: 'marketing-digital-email-marketing',
        skillNames: ['Email Marketing', 'Marketing Automation', 'Customer Segmentation', 'Performance Analytics']
      },
      {
        workTypeId: 'marketing-digital-conversion-optimization',
        skillNames: ['Conversion Optimization', 'A/B Testing', 'User Experience', 'Performance Marketing']
      },

      // EMAIL MARKETING - Email specialization
      {
        workTypeId: 'marketing-email-email-strategy',
        skillNames: ['Email Marketing', 'Strategic Planning', 'Customer Segmentation', 'Marketing Automation']
      },
      {
        workTypeId: 'marketing-email-email-campaigns',
        skillNames: ['Email Marketing', 'Campaign Management', 'Copywriting', 'Email Design']
      },
      {
        workTypeId: 'marketing-email-email-automation',
        skillNames: ['Email Marketing', 'Marketing Automation', 'Customer Journey', 'Lead Nurturing']
      },
      {
        workTypeId: 'marketing-email-email-analytics',
        skillNames: ['Email Marketing', 'Marketing Analytics', 'Performance Analysis', 'Data Analysis']
      },
      {
        workTypeId: 'marketing-email-newsletter-management',
        skillNames: ['Email Marketing', 'Newsletter Design', 'Content Curation', 'Subscriber Management']
      },
      {
        workTypeId: 'marketing-email-drip-campaigns',
        skillNames: ['Email Marketing', 'Marketing Automation', 'Lead Nurturing', 'Customer Journey']
      },
      {
        workTypeId: 'marketing-email-email-personalization',
        skillNames: ['Email Marketing', 'Personalization', 'Customer Segmentation', 'Dynamic Content']
      },
      {
        workTypeId: 'marketing-email-list-growth',
        skillNames: ['Email Marketing', 'Lead Generation', 'List Building', 'Conversion Optimization']
      },

      // SOCIAL MEDIA MARKETING - Social media specialization
      {
        workTypeId: 'marketing-social-media-strategy',
        skillNames: ['Social Media Marketing', 'Strategic Planning', 'Content Strategy', 'Community Building']
      },
      {
        workTypeId: 'marketing-social-media-content',
        skillNames: ['Social Media Marketing', 'Content Creation', 'Creative Strategy', 'Visual Design']
      },
      {
        workTypeId: 'marketing-social-media-advertising',
        skillNames: ['Social Media Marketing', 'Facebook Ads', 'Social Advertising', 'Performance Marketing']
      },
      {
        workTypeId: 'marketing-social-media-community',
        skillNames: ['Social Media Marketing', 'Community Management', 'Customer Engagement', 'Social Listening']
      },
      {
        workTypeId: 'marketing-social-media-analytics',
        skillNames: ['Social Media Marketing', 'Social Analytics', 'Performance Analysis', 'Data Analysis']
      },
      {
        workTypeId: 'marketing-social-media-influencer',
        skillNames: ['Influencer Marketing', 'Social Media Marketing', 'Partnership Development', 'Campaign Management']
      },
      {
        workTypeId: 'marketing-social-media-listening',
        skillNames: ['Social Listening', 'Social Media Marketing', 'Brand Monitoring', 'Sentiment Analysis']
      },
      {
        workTypeId: 'marketing-social-media-crisis',
        skillNames: ['Crisis Management', 'Social Media Marketing', 'Communication', 'Reputation Management']
      }
    ];

    console.log(`🎯 Processing ${skillMappings.length} Marketing work type-skill mappings...`);
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

    console.log('📊 BATCH 6 SUMMARY:');
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

    // Check updated Marketing focus area coverage
    console.log('🔍 Checking Updated Marketing Focus Area Coverage...');
    
    const marketingFocusArea = await prisma.focusArea.findFirst({
      where: { 
        label: {
          contains: 'Marketing',
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

    if (marketingFocusArea) {
      let totalMarketingWorkTypes = 0;
      let marketingWorkTypesWithEnoughSkills = 0;

      marketingFocusArea.workCategories.forEach(category => {
        category.workTypes.forEach(workType => {
          totalMarketingWorkTypes++;
          const skillCount = workType.workTypeSkills.length;
          
          if (skillCount >= 4) {
            marketingWorkTypesWithEnoughSkills++;
          }
        });
      });

      const marketingCoveragePercentage = totalMarketingWorkTypes > 0 ? 
        ((marketingWorkTypesWithEnoughSkills / totalMarketingWorkTypes) * 100).toFixed(1) : 0;

      console.log(`\n📈 Updated Marketing Focus Area Coverage:`);
      console.log(`   Total work types: ${totalMarketingWorkTypes}`);
      console.log(`   ✅ With 4+ skills: ${marketingWorkTypesWithEnoughSkills}`);
      console.log(`   ❌ With <4 skills: ${totalMarketingWorkTypes - marketingWorkTypesWithEnoughSkills}`);
      console.log(`   📊 Coverage percentage: ${marketingCoveragePercentage}%`);
      
      const improvement = parseFloat(marketingCoveragePercentage) - 0;
      console.log(`   📈 Improvement: +${improvement.toFixed(1)}%`);
    }

    console.log('');
    console.log('ℹ️  Batch 6 establishes Marketing focus area foundation.');
    console.log('   Targeting high-impact brand, content, digital, and social areas.');
    console.log('');
    console.log('✅ Batch 6 completed successfully!');

  } catch (error) {
    console.error('❌ Error populating skill mappings:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the function
populateSkillMappingsBatch6()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });