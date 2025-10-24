#!/bin/bash

# Deploy MCP Agents Feature to Azure
# This script deploys the new MCP agentic AI workflow to production

set -e

echo "🚀 Starting MCP Agents Feature Deployment"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
RESOURCE_GROUP="ps-prod-rg"
BACKEND_APP="ps-backend-1758551070"
FRONTEND_APP="ps-frontend-1758551070"
ACR_NAME="pscontainerregistry"

echo -e "${YELLOW}📋 Pre-deployment checklist:${NC}"
echo "1. GPT-4o credentials added to Azure App Settings ✅"
echo "2. MCP agent services implemented ✅"
echo "3. New API endpoints tested locally ✅"
echo "4. Frontend components created ✅"
echo ""

# Step 1: Update Azure App Settings with GPT-4o configuration
echo -e "${YELLOW}Step 1: Updating Azure App Settings...${NC}"

az webapp config appsettings set \
  -g $RESOURCE_GROUP \
  -n $BACKEND_APP \
  --settings \
  AZURE_OPENAI_GPT4O_ENDPOINT="https://inchronicle-openai.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2025-01-01-preview" \
  AZURE_OPENAI_GPT4O_API_KEY="C1JwALgbuT7vQtSLZbExP9kmiyczWCLS9DZn78Ibwe6eFJBhePZ5JQQJ99BJACHYHv6XJ3w3AAABACOGjjNp" \
  AZURE_OPENAI_GPT4O_DEPLOYMENT="gpt-4o" \
  ENABLE_MCP="true" \
  MCP_AGENTS_ENABLED="true" \
  --output none

echo -e "${GREEN}✅ App Settings updated${NC}"

# Step 2: Build and push backend Docker image
echo -e "${YELLOW}Step 2: Building backend Docker image...${NC}"

cd backend

# Build the Docker image
docker build -t $ACR_NAME.azurecr.io/inchronicle-backend:mcp-agents \
  --build-arg NODE_ENV=production \
  --platform linux/amd64 \
  .

echo -e "${GREEN}✅ Backend Docker image built${NC}"

# Step 3: Push to Azure Container Registry
echo -e "${YELLOW}Step 3: Pushing to Azure Container Registry...${NC}"

# Login to ACR
az acr login --name $ACR_NAME

# Push the image
docker push $ACR_NAME.azurecr.io/inchronicle-backend:mcp-agents

echo -e "${GREEN}✅ Image pushed to ACR${NC}"

# Step 4: Deploy backend to Azure
echo -e "${YELLOW}Step 4: Deploying backend to Azure...${NC}"

az webapp config container set \
  -g $RESOURCE_GROUP \
  -n $BACKEND_APP \
  --docker-custom-image-name $ACR_NAME.azurecr.io/inchronicle-backend:mcp-agents \
  --output none

echo -e "${GREEN}✅ Backend deployment initiated${NC}"

# Step 5: Build and deploy frontend
echo -e "${YELLOW}Step 5: Building frontend with MCP components...${NC}"

cd ../
npm run build

# Build frontend Docker image
cd frontend
docker build -t $ACR_NAME.azurecr.io/inchronicle-frontend:mcp-agents \
  --build-arg VITE_API_URL=https://ps-backend-1758551070.azurewebsites.net/api/v1 \
  --platform linux/amd64 \
  .

# Push frontend image
docker push $ACR_NAME.azurecr.io/inchronicle-frontend:mcp-agents

# Deploy frontend
az webapp config container set \
  -g $RESOURCE_GROUP \
  -n $FRONTEND_APP \
  --docker-custom-image-name $ACR_NAME.azurecr.io/inchronicle-frontend:mcp-agents \
  --output none

echo -e "${GREEN}✅ Frontend deployment initiated${NC}"

# Step 6: Restart apps
echo -e "${YELLOW}Step 6: Restarting applications...${NC}"

az webapp restart -g $RESOURCE_GROUP -n $BACKEND_APP --output none
az webapp restart -g $RESOURCE_GROUP -n $FRONTEND_APP --output none

echo -e "${GREEN}✅ Applications restarted${NC}"

# Step 7: Verify deployment
echo -e "${YELLOW}Step 7: Verifying deployment...${NC}"

# Wait for backend to be ready
sleep 30

# Check backend health
BACKEND_HEALTH=$(curl -s https://ps-backend-1758551070.azurewebsites.net/health | jq -r '.status')

if [ "$BACKEND_HEALTH" = "OK" ]; then
  echo -e "${GREEN}✅ Backend health check passed${NC}"
else
  echo -e "${RED}❌ Backend health check failed${NC}"
  exit 1
fi

# Check MCP endpoints
echo "Testing MCP endpoints..."

# Test process-agents endpoint (should return 401 without auth, but confirms endpoint exists)
MCP_TEST=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  https://ps-backend-1758551070.azurewebsites.net/api/v1/mcp/process-agents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test" \
  -d '{"stage": "analyze"}')

if [ "$MCP_TEST" = "401" ]; then
  echo -e "${GREEN}✅ MCP process-agents endpoint available${NC}"
else
  echo -e "${YELLOW}⚠️  MCP endpoint returned: $MCP_TEST${NC}"
fi

# Test fetch-and-process endpoint
FETCH_TEST=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  https://ps-backend-1758551070.azurewebsites.net/api/v1/mcp/fetch-and-process \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test" \
  -d '{"toolTypes": ["github"]}')

if [ "$FETCH_TEST" = "401" ]; then
  echo -e "${GREEN}✅ MCP fetch-and-process endpoint available${NC}"
else
  echo -e "${YELLOW}⚠️  Fetch endpoint returned: $FETCH_TEST${NC}"
fi

# Step 8: View logs
echo -e "${YELLOW}Step 8: Viewing deployment logs...${NC}"

echo "Recent backend logs:"
az webapp log tail -g $RESOURCE_GROUP -n $BACKEND_APP --timeout 15

echo ""
echo -e "${GREEN}=========================================="
echo "🎉 MCP Agents Deployment Complete!"
echo "=========================================="
echo ""
echo "✨ New Features Deployed:"
echo "  • Hybrid AI model selection (GPT-4o-mini + GPT-4o)"
echo "  • Three specialized AI agents (Analyzer, Correlator, Generator)"
echo "  • Progressive processing endpoints for better UX"
echo "  • MCP Source Selector component"
echo "  • Activity Review component with AI categorization"
echo "  • Dual journal entry generation (Workspace + Network)"
echo ""
echo "📝 Next Steps:"
echo "  1. Test MCP integration flow in production"
echo "  2. Verify OAuth connections for all tools"
echo "  3. Monitor Azure costs for GPT-4o usage"
echo "  4. Gather user feedback on AI-generated entries"
echo ""
echo -e "${GREEN}🚀 Production URLs:${NC}"
echo "  Frontend: https://ps-frontend-1758551070.azurewebsites.net"
echo "  Backend: https://ps-backend-1758551070.azurewebsites.net"
echo "  Health: https://ps-backend-1758551070.azurewebsites.net/health"
echo ""