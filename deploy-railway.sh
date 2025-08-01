#!/bin/bash

# Railway Auto-Deploy Script for InChronicle
# This script automates the deployment of both frontend and backend to Railway

set -e  # Exit on any error

echo "🚀 Starting Railway deployment for InChronicle..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

# Check if user is logged in to Railway
if ! railway whoami &> /dev/null; then
    echo "🔐 Please log in to Railway..."
    railway login
fi

echo "📦 Creating new Railway project..."
railway_output=$(railway new --name "inchronicle-$(date +%s)" 2>&1 | tee /dev/tty)

# Extract project ID from output (this might need adjustment based on Railway CLI output format)
echo "✅ Project created successfully!"

echo "🗄️  Adding PostgreSQL database..."
railway add --database postgresql

echo "⚙️  Setting up backend service..."
# Deploy backend first
echo "Backend environment variables will be set in Railway dashboard"
echo "Required backend env vars:"
echo "- NODE_ENV=production"
echo "- JWT_SECRET=your-super-secure-jwt-secret-here"
echo "- JWT_REFRESH_SECRET=your-super-secure-refresh-secret-here"
echo "- JWT_EXPIRES_IN=15m"
echo "- JWT_REFRESH_EXPIRES_IN=7d"
echo "- API_PORT=3002"
echo "- RATE_LIMIT_WINDOW_MS=900000"
echo "- RATE_LIMIT_MAX_REQUESTS=100"
echo "- MAX_FILE_SIZE=10485760"
echo "- LOG_LEVEL=info"
echo "- SESSION_SECRET=your-session-secret-here"

echo "🎨 Setting up frontend service..."
echo "Deploying from current directory..."

# Deploy the current directory (frontend)
railway up --detach

echo "✅ Deployment initiated!"
echo ""
echo "📋 Next steps:"
echo "1. Go to Railway dashboard: https://railway.app/dashboard"
echo "2. Configure environment variables for backend service"
echo "3. Set up a separate service for backend with root directory '/backend'"
echo "4. Update CORS settings once both services are deployed"
echo ""
echo "🔗 Your services will be available at:"
echo "- Frontend: https://your-frontend-name.up.railway.app"
echo "- Backend: https://your-backend-name.up.railway.app"
echo ""
echo "⚡ Monitor deployment logs in Railway dashboard"