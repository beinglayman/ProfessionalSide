#!/bin/bash

echo "🚀 RAILWAY COMPLETE SETUP: Reference Data + Depth Coverage"
echo "📅 Timestamp: $(date)"
echo "🔗 Database URL configured: $(test -n "$DATABASE_URL" && echo "true" || echo "false")"
echo ""

echo "📌 Step 1: Seeding reference data (focus areas, categories, work types)..."
if npm run db:seed-reference; then
    echo "✅ Reference data seeding completed"
else
    echo "❌ Reference data seeding failed, but continuing..."
fi

echo ""
echo "📌 Step 2: Creating missing Operations work types..."
if npm run fix:operations-work-types; then
    echo "✅ Operations work types created"
else
    echo "❌ Operations work types creation failed, but continuing..."
fi

echo ""
echo "📌 Step 3: Running comprehensive depth-first coverage..."
if npm run fix:complete-depth; then
    echo "✅ Depth coverage completed"
else
    echo "❌ Depth coverage failed, but continuing..."
fi

echo ""
echo "🎉 Railway complete setup finished!"
echo "✅ Ready to start application server"