#!/bin/bash

echo "🚀 Running database fixes inside Railway environment..."
echo "📅 Timestamp: $(date)"
echo "🔗 Database URL configured: $(test -n "$DATABASE_URL" && echo "true" || echo "false")"
echo ""

echo "📌 Step 1: Fix Supply Chain visibility..."
if node fix_supply_chain_visibility_railway.js; then
    echo "✅ Supply Chain fix completed"
else
    echo "❌ Supply Chain fix failed, continuing..."
fi

echo ""
echo "📌 Step 2: Ensure depth coverage..."
if node ensure_depth_coverage_railway.js; then
    echo "✅ Depth coverage completed"
else
    echo "❌ Depth coverage failed, continuing..."
fi

echo ""
echo "🎉 Railway database fixes completed!"
echo "✅ Ready to start application server"