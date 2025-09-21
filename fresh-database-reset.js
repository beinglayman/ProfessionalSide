#!/usr/bin/env node
/**
 * Fresh Database Reset Script for Production
 * This script will reset the database and run clean migrations
 */

const { PrismaClient, Prisma } = require('@prisma/client');
const { execSync } = require('child_process');

const prisma = new PrismaClient();

async function resetDatabase() {
  try {
    console.log('🚀 Starting fresh database reset...');
    
    // Drop all tables to start fresh
    console.log('🗑️  Dropping all existing tables...');
    
    // Get all table names
    const tables = await prisma.$queryRaw`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public';
    `;
    
    console.log(`Found ${tables.length} tables to drop`);
    
    // Drop tables in reverse order to handle dependencies
    for (const table of tables.reverse()) {
      try {
        await prisma.$executeRaw`DROP TABLE IF EXISTS ${Prisma.raw(`"${table.tablename}"`)} CASCADE;`;
        console.log(`✅ Dropped table: ${table.tablename}`);
      } catch (error) {
        console.log(`⚠️  Could not drop ${table.tablename}:`, error.message);
      }
    }
    
    console.log('🔄 Running fresh migration...');
    
    // Run Prisma migrations from scratch
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    
    console.log('🌱 Running database seed...');
    
    // Run seed to populate reference data
    execSync('npm run db:seed', { stdio: 'inherit' });
    
    console.log('✅ Fresh database reset complete!');
    
  } catch (error) {
    console.error('❌ Error resetting database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

resetDatabase();