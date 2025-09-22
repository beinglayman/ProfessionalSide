#!/usr/bin/env node

/**
 * Script to update existing HTTP avatar URLs to HTTPS in the database
 * This fixes the mixed content issue for existing users
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixAvatarUrls() {
  console.log('🔧 Starting avatar URL migration from HTTP to HTTPS...');
  
  try {
    // Find all users with HTTP avatar URLs
    const usersWithHttpAvatars = await prisma.user.findMany({
      where: {
        avatar: {
          startsWith: 'http://api.inchronicle.com'
        }
      },
      select: {
        id: true,
        avatar: true,
        name: true
      }
    });

    console.log(`📊 Found ${usersWithHttpAvatars.length} users with HTTP avatar URLs`);

    if (usersWithHttpAvatars.length === 0) {
      console.log('✅ No HTTP avatar URLs found. All URLs are already HTTPS.');
      return;
    }

    // Update each user's avatar URL from HTTP to HTTPS
    for (const user of usersWithHttpAvatars) {
      const httpsUrl = user.avatar.replace('http://', 'https://');
      
      await prisma.user.update({
        where: { id: user.id },
        data: { avatar: httpsUrl }
      });

      console.log(`✅ Updated ${user.name || user.id}: ${user.avatar} → ${httpsUrl}`);
    }

    console.log(`🎉 Successfully updated ${usersWithHttpAvatars.length} avatar URLs to HTTPS`);
    
  } catch (error) {
    console.error('❌ Error updating avatar URLs:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
fixAvatarUrls()
  .then(() => {
    console.log('🚀 Avatar URL migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });