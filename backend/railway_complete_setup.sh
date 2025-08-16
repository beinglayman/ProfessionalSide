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
echo "📌 Step 2.5: Fixing empty Operations categories..."
if npm run fix:empty-operations; then
    echo "✅ Empty Operations categories fixed"
else
    echo "❌ Empty Operations categories fix failed, but continuing..."
fi

echo ""
echo "📌 Step 2.6: Adding skills to new work types..."
if npm run add-skills-new-work-types; then
    echo "✅ Skills added to new work types"
else
    echo "❌ Adding skills to new work types failed, but continuing..."
fi

echo ""
echo "📌 Step 3: Ensuring complete depth-first coverage across ALL focus areas..."
if npm run ensure:complete-depth; then
    echo "✅ Complete depth coverage ensured"
else
    echo "❌ Depth coverage failed, but continuing..."
fi

echo ""
echo "📌 Step 4: SPECIFIC FIX - Supply Chain skill mappings..."
if npm run fix:supply-chain-skills; then
    echo "✅ Supply Chain skill mappings completed"
else
    echo "❌ Supply Chain skill mapping failed, but continuing..."
fi

echo ""
echo "🔍 Step 5: Final verification of Supply Chain coverage..."
if npm run diagnose:supply-chain; then
    echo "✅ Supply Chain verification passed"
else
    echo "⚠️  Supply Chain verification shows missing mappings"
fi

echo ""
echo "🚀 Step 6: COMPREHENSIVE FIX - ALL unmapped work types..."
if npm run fix:all-unmapped; then
    echo "✅ All unmapped work types fixed"
else
    echo "❌ Comprehensive fix failed, but continuing..."
fi

echo ""
echo "🔍 Step 7: Final verification of complete coverage..."
if npm run analyze:all-unmapped; then
    echo "✅ 100% work type coverage achieved"
else
    echo "⚠️  Some work types still need mapping"
fi

echo ""
echo "🔍 Step 8: Checking for empty work categories..."
if npm run check:railway-empty-categories; then
    echo "✅ All work categories have work types"
else
    echo "⚠️  Some work categories are empty"
fi

echo ""
echo "🎉 Railway complete setup finished!"
echo "✅ Ready to start application server"