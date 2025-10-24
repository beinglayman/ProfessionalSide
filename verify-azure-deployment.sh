#!/bin/bash

# Azure Deployment Verification Script
# Run this after completing database reset in SSH session

BACKEND_URL="https://ps-backend-1758551070.azurewebsites.net"

echo "=========================================="
echo "Azure Backend Deployment Verification"
echo "=========================================="
echo ""

# 1. Health Check
echo "1. Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "${BACKEND_URL}/health")
HEALTH_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | sed '$d')

if [ "$HEALTH_CODE" = "200" ]; then
    echo "✅ Health check passed"
    echo "   Response: $HEALTH_BODY"
else
    echo "❌ Health check failed (HTTP $HEALTH_CODE)"
    echo "   Response: $HEALTH_BODY"
fi
echo ""

# 2. API Version Check
echo "2. Testing API version endpoint..."
API_RESPONSE=$(curl -s -w "\n%{http_code}" "${BACKEND_URL}/api/v1")
API_CODE=$(echo "$API_RESPONSE" | tail -n1)
API_BODY=$(echo "$API_RESPONSE" | sed '$d')

if [ "$API_CODE" = "200" ]; then
    echo "✅ API endpoint accessible"
    echo "   Response: $API_BODY"
else
    echo "❌ API endpoint failed (HTTP $API_CODE)"
    echo "   Response: $API_BODY"
fi
echo ""

# 3. Test User Registration (should work with clean DB)
echo "3. Testing user registration..."
TIMESTAMP=$(date +%s)
TEST_EMAIL="test${TIMESTAMP}@example.com"

REG_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    "${BACKEND_URL}/api/v1/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"Test123!\",\"name\":\"Test User\"}")

REG_CODE=$(echo "$REG_RESPONSE" | tail -n1)
REG_BODY=$(echo "$REG_RESPONSE" | sed '$d')

if [ "$REG_CODE" = "201" ] || [ "$REG_CODE" = "200" ]; then
    echo "✅ User registration works"
    echo "   Created user: $TEST_EMAIL"
    echo "   Response: $REG_BODY"
else
    echo "❌ User registration failed (HTTP $REG_CODE)"
    echo "   Response: $REG_BODY"
fi
echo ""

# 4. Check Reference Data Seeded
echo "4. Testing reference data availability..."
SKILLS_RESPONSE=$(curl -s -w "\n%{http_code}" "${BACKEND_URL}/api/v1/skills")
SKILLS_CODE=$(echo "$SKILLS_RESPONSE" | tail -n1)
SKILLS_BODY=$(echo "$SKILLS_RESPONSE" | sed '$d')

if [ "$SKILLS_CODE" = "200" ]; then
    SKILLS_COUNT=$(echo "$SKILLS_BODY" | grep -o '"id"' | wc -l | xargs)
    if [ "$SKILLS_COUNT" -gt "0" ]; then
        echo "✅ Reference data seeded ($SKILLS_COUNT skills found)"
    else
        echo "⚠️  Skills endpoint works but no data found"
    fi
else
    echo "❌ Skills endpoint failed (HTTP $SKILLS_CODE)"
fi
echo ""

echo "=========================================="
echo "Verification Complete"
echo "=========================================="
