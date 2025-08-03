#!/usr/bin/env node

/**
 * Script to fix HTTPS localhost avatar URLs to HTTP in development
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixLocalhostAvatarUrls() {
  console.log('🔧 Fixing HTTPS localhost avatar URLs to HTTP...');
  
  try {
    // Find all users with HTTPS localhost avatar URLs
    const usersWithHttpsLocalhost = await prisma.user.findMany({
      where: {
        avatar: {
          startsWith: 'https://localhost'
        }
      },
      select: {
        id: true,
        avatar: true,
        name: true
      }
    });

    console.log(`📊 Found ${usersWithHttpsLocalhost.length} users with HTTPS localhost avatar URLs`);

    if (usersWithHttpsLocalhost.length === 0) {
      console.log('✅ No HTTPS localhost avatar URLs found.');
      return;
    }

    // Update each user's avatar URL from HTTPS to HTTP for localhost
    for (const user of usersWithHttpsLocalhost) {
      const httpUrl = user.avatar.replace('https://localhost', 'http://localhost');
      
      await prisma.user.update({
        where: { id: user.id },
        data: { avatar: httpUrl }
      });

      console.log(`✅ Updated ${user.name || user.id}: ${user.avatar} → ${httpUrl}`);
    }

    console.log(`🎉 Successfully updated ${usersWithHttpsLocalhost.length} avatar URLs to HTTP localhost`);
    
  } catch (error) {
    console.error('❌ Error updating avatar URLs:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
fixLocalhostAvatarUrls()
  .then(() => {
    console.log('🚀 Localhost avatar URL fix completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fix failed:', error);
    process.exit(1);
  });