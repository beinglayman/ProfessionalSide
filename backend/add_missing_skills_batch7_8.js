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

async function addMissingSkillsBatch7And8() {
  try {
    console.log('🔄 Adding Missing Skills from Batches 7 & 8...\n');

    // Missing skills identified from Batch 7 (Product Management) and Batch 8 (Operations)
    const missingSkills = [
      // From Batch 7 - Product Management skills
      'Product Analytics',
      'KPI Development', 
      'Metrics Tracking',
      'Statistical Analysis',
      'Experimentation',
      'User Behavior Analysis',
      'Funnel Analysis',
      'Conversion Optimization',
      'Retention Analysis',
      'Cohort Analysis',
      'Customer Lifecycle',
      'Dashboard Development',
      'Data Visualization',
      'KPI Tracking',
      'Predictive Analytics',
      'Machine Learning',
      'Sprint Planning',
      'Backlog Management',
      'Feature Development',
      'Requirements Analysis',
      'User Stories',
      'Release Planning',
      'Cross-functional Leadership',
      'Product Design Collaboration',
      'User Experience Design',
      'Design Thinking',
      'Testing Strategy',
      'System Design',
      'Customer Interviews',
      'Product Discovery',
      'Research Methods',
      'Concept Validation',
      'User Testing',
      'Problem Validation',
      'Opportunity Assessment',
      'Strategic Analysis',
      'Solution Design',
      'Feedback Analysis',
      'Prototype Testing',
      'Design Sprints',
      'Workshop Facilitation',
      'Stakeholder Management',
      'Presentation Skills',
      'Cross-functional Coordination',
      'Priority Management',
      'Decision Making',
      'Strategic Thinking',
      'Problem Solving',
      'Development Support',
      'Technical Communication',
      'QA Coordination',
      'Issue Triage',
      'Metrics Definition',
      'Feature Analysis',
      'Performance Analysis',
      'Customer Feedback Analysis',
      'Conversion Analysis',
      'Revenue Analysis',
      'Business Analysis',
      'Financial Analysis',
      'Requirements Documentation',
      'Systems Analysis',
      'Product Communication',
      'Marketing Communication',
      'Visual Communication',
      'Sales Enablement',
      'Marketing Materials',
      'User Documentation',
      'Knowledge Management',
      'Customer Support',
      'Video Production',
      'Content Creation',

      // From Batch 8 - Operations skills
      'Process Automation',
      'Business Process Improvement',
      'Workflow Design',
      'Digital Transformation',
      'Process Improvement',
      'Business Process Design',
      'Workflow Optimization',
      'Capacity Planning',
      'Resource Planning',
      'Forecasting',
      'Operations Management',
      'Cost Optimization',
      'Budget Management',
      'Efficiency Improvement',
      'Performance Metrics',
      'Efficiency Analysis',
      'Performance Management',
      'Continuous Improvement',
      'Business Process Analysis',
      'Efficiency Optimization',
      'Certification Management',
      'Compliance Management',
      'ISO Standards',
      'Quality Management',
      'Audit Management',
      'Risk Assessment',
      'Quality Assurance',
      'Compliance Monitoring',
      'Regulatory Compliance',
      'Risk Management',
      'Compliance Remediation',
      'Compliance Reporting',
      'Documentation',
      'Compliance Training',
      'Training Development',
      'Employee Development',
      'Policy Development',
      'Artifact Management',
      'DevOps',
      'CI/CD',
      'Version Control',
      'Build Automation',
      'Software Development',
      'Pipeline Development',
      'Automation',
      'Environment Provisioning',
      'Infrastructure as Code',
      'Cloud Infrastructure',
      'Pipeline Monitoring',
      'Monitoring',
      'Pipeline Optimization',
      'Performance Optimization',
      'Release Management',
      'Deployment Strategy',
      'Cloud Architecture',
      'Infrastructure Management',
      'Cloud Platforms',
      'High Availability',
      'Clustering',
      'System Reliability',
      'Compute Optimization',
      'Resource Management',
      'Database Administration',
      'Database Management',
      'Performance Tuning',
      'Network Configuration',
      'Network Management',
      'Security',
      'Server Management',
      'System Administration',
      'Storage Management',
      'Data Management',
      'Virtualization',
      'Cloud Computing',
      'Resource Optimization',
      'Business Process Reengineering',
      'Change Management',
      'Kaizen',
      'Lean Manufacturing',
      'Lean Six Sigma',
      'Statistical Analysis',
      'Organizational Change',
      'Process Measurement',
      'Process Standardization',
      'Standard Operating Procedures',
      'Root Cause Analysis',
      'Value Stream Mapping',
      'Workflow Analysis',
      'Agile Methodology',
      'Scrum',
      'Team Leadership',
      'Financial Planning',
      'Cost Control',
      'Project Delivery',
      'Schedule Management'
    ];

    // Remove duplicates and sort
    const uniqueSkills = [...new Set(missingSkills)].sort();

    console.log(`📝 Processing ${uniqueSkills.length} unique missing skills...`);
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
    console.log('📊 MISSING SKILLS ADDITION SUMMARY:');
    console.log(`✅ Skills added: ${skillsAdded}`);
    console.log(`⚠️  Skills skipped (already exist): ${skillsSkipped}`);
    console.log(`📋 Total processed: ${uniqueSkills.length}`);
    console.log('');

    if (addedSkills.length > 0) {
      console.log('🆕 NEWLY ADDED SKILLS:');
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
    console.log('ℹ️  These skills were identified as missing during Batches 7 & 8.');
    console.log('   Adding them enables more comprehensive work type-skill mappings.');
    console.log('');
    console.log('✅ Missing skills addition completed successfully!');

  } catch (error) {
    console.error('❌ Error adding missing skills:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the function
addMissingSkillsBatch7And8()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });