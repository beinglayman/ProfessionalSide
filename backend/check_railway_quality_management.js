const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

// IMPORTANT: Always use Railway production database
const prisma = new PrismaClient();

async function checkRailwayQualityManagement() {
  try {
    console.log('🚂 CHECKING RAILWAY PRODUCTION: Operations > Quality Management');
    console.log('📅 Timestamp:', new Date().toISOString());
    console.log('🔗 Database URL configured:', process.env.DATABASE_URL ? 'YES (Railway)' : 'NO - USING LOCAL');
    console.log('');

    if (!process.env.DATABASE_URL) {
      console.log('❌ ERROR: DATABASE_URL not configured - cannot connect to Railway');
      console.log('💡 Make sure Railway environment variables are loaded');
      return;
    }

    // Get Quality Management category in Operations from Railway
    const qualityManagementCategory = await prisma.workCategory.findFirst({
      where: {
        id: 'operations-quality-management'
      },
      include: {
        focusArea: true,
        workTypes: {
          include: {
            workTypeSkills: {
              include: { skill: true }
            }
          },
          orderBy: { label: 'asc' }
        }
      }
    });

    if (!qualityManagementCategory) {
      console.log('❌ Operations > Quality Management category not found in Railway database');
      return;
    }

    console.log(`✅ Found in Railway: ${qualityManagementCategory.focusArea.label} > ${qualityManagementCategory.label}`);
    console.log(`📋 Work types in Railway: ${qualityManagementCategory.workTypes.length}`);
    console.log('');

    if (qualityManagementCategory.workTypes.length === 0) {
      console.log('❌ No work types found in Railway Quality Management category');
      return;
    }

    console.log('🚂 RAILWAY PRODUCTION - QUALITY MANAGEMENT WORK TYPES:');
    console.log('');

    qualityManagementCategory.workTypes.forEach((workType, index) => {
      const skillCount = workType.workTypeSkills.length;
      const skills = workType.workTypeSkills.map(wts => wts.skill.name);
      
      console.log(`${index + 1}. ${workType.label}`);
      console.log(`   🆔 ID: ${workType.id}`);
      console.log(`   📊 Skills in Railway: ${skillCount}`);
      
      if (skillCount > 0) {
        console.log(`   ✅ Railway mapped skills: ${skills.join(', ')}`);
      } else {
        console.log(`   ❌ No skills mapped in Railway production`);
      }
      console.log('');
    });

    // Summary
    const workTypesWithSkills = qualityManagementCategory.workTypes.filter(wt => wt.workTypeSkills.length > 0).length;
    const workTypesWithoutSkills = qualityManagementCategory.workTypes.length - workTypesWithSkills;

    console.log('📈 RAILWAY PRODUCTION - QUALITY MANAGEMENT SUMMARY:');
    console.log(`📊 Total work types: ${qualityManagementCategory.workTypes.length}`);
    console.log(`✅ Work types with skills: ${workTypesWithSkills}`);
    console.log(`❌ Work types without skills: ${workTypesWithoutSkills}`);
    console.log(`📈 Coverage: ${qualityManagementCategory.workTypes.length > 0 ? ((workTypesWithSkills / qualityManagementCategory.workTypes.length) * 100).toFixed(1) : 0}%`);

    if (workTypesWithSkills === qualityManagementCategory.workTypes.length) {
      console.log('🎉 All Quality Management work types have skills mapped in Railway!');
    } else {
      console.log('⚠️  Some Quality Management work types need skill mapping in Railway');
    }

  } catch (error) {
    console.error('❌ Error checking Railway Quality Management:', error);
    if (error.message.includes('connect')) {
      console.log('💡 Connection issue - check if Railway DATABASE_URL is correct');
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkRailwayQualityManagement();