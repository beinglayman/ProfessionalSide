# InChronicle Azure Deployment Guide

## Architecture Overview

InChronicle is deployed on Azure with the following components:
- **Frontend**: Azure Web App (Container) - React/Vite app
- **Backend**: Azure Web App (Container) - Node.js/Express API
- **Database**: Azure PostgreSQL Flexible Server
- **Storage**: Azure Storage Account (File Share for uploads)
- **Registry**: Azure Container Registry (ACR)
- **CI/CD**: GitHub Actions

## Prerequisites

1. Azure CLI installed (`az --version` should show 2.50+)
2. Azure subscription with appropriate permissions
3. GitHub repository with secrets configured
4. Docker (for local testing)

## Production Environment

### Current Production URLs
- **Frontend**: https://ps-frontend-1758551070.azurewebsites.net
- **Backend API**: https://ps-backend-1758551070.azurewebsites.net/api/v1
- **Health Check**: https://ps-backend-1758551070.azurewebsites.net/health

### Resource Group
- **Name**: `ps-prod-rg`
- **Region**: `eastus`

## Initial Provisioning

The infrastructure is provisioned using the `infra/azure-provision.sh` script.

### Setup Steps

1. **Configure Infrastructure Variables**:
   ```bash
   cd infra
   cp .env.example .env
   # Edit .env with your values
   ```

2. **Login to Azure**:
   ```bash
   az login
   ```

3. **Run Provisioning Script**:
   ```bash
   ./azure-provision.sh
   ```

This creates:
- Resource Group
- Container Registry (ACR)
- PostgreSQL Flexible Server
- Storage Account with file share
- App Service Plan (Linux, B1)
- Backend Web App with managed identity
- Frontend Web App with managed identity
- Role assignments for ACR pull

## Environment Variables

### Backend App Settings (Azure Web App)

Backend environment variables are stored as **App Settings** in the Azure Web App, not in repository files.

#### View Current Settings:
```bash
az webapp config appsettings list \
  -g ps-prod-rg \
  -n ps-backend-1758551070
```

#### Set/Update Settings:
```bash
az webapp config appsettings set \
  -g ps-prod-rg \
  -n ps-backend-1758551070 \
  --settings KEY=value KEY2=value2
```

#### Required Settings:
```bash
NODE_ENV=production
PORT=3002
WEBSITES_PORT=3002
DATABASE_URL=postgresql://...
FRONTEND_URL=https://ps-frontend-1758551070.azurewebsites.net
CORS_ORIGINS=https://ps-frontend-1758551070.azurewebsites.net
UPLOAD_DIR=/app/uploads
UPLOAD_VOLUME_PATH=/app/uploads
MAX_FILE_SIZE=10485760
EMERGENCY_ENABLE=false
```

#### Optional Settings:
```bash
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@inchronicle.com

# Azure OpenAI
AZURE_OPENAI_API_KEY=your-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_API_VERSION=2024-10-21
AZURE_OPENAI_DEPLOYMENT=gpt-4

# Internal API Key
INTERNAL_API_KEY=your-internal-api-key
```

### Frontend Build-Time Variables

Frontend uses Vite, which bakes environment variables at **build time** via ACR build arguments.

#### Current Configuration:
```bash
VITE_API_URL=https://ps-backend-1758551070.azurewebsites.net/api/v1
```

#### To Change Frontend API URL:
Rebuild the frontend image with new build arg:
```bash
az acr build \
  --registry <ACR_NAME> \
  --image inchronicle-frontend:latest \
  --build-arg VITE_API_URL=https://new-backend-url/api/v1 \
  .
```

## CI/CD with GitHub Actions

### GitHub Repository Secrets

The following secrets must be configured in GitHub repository settings:

```bash
AZURE_CREDENTIALS          # Service principal JSON for Azure login
AZ_RG                      # ps-prod-rg
ACR_NAME                   # Your ACR name
BACKEND_APPNAME            # ps-backend-1758551070
FRONTEND_APPNAME           # ps-frontend-1758551070
VITE_API_URL              # https://ps-backend-1758551070.azurewebsites.net/api/v1
```

### Workflows

#### Backend Deployment (`.github/workflows/deploy-backend.yml`)
- **Triggers**: Push to `main` with changes in `backend/**`
- **Process**:
  1. Build backend Docker image in ACR
  2. Update Web App container image
  3. Restart Web App

#### Frontend Deployment (`.github/workflows/deploy-frontend.yml`)
- **Triggers**: Push to `main` with changes in `src/**`, `public/**`, or `package.json`
- **Process**:
  1. Create `.env.production` with `VITE_API_URL`
  2. Build frontend Docker image in ACR
  3. Update Web App container image
  4. Set ports and restart

### Manual Deployment

#### Deploy Backend:
```bash
cd backend
az acr build \
  --registry <ACR_NAME> \
  --image inchronicle-backend:latest \
  .

az webapp config container set \
  -g ps-prod-rg \
  -n ps-backend-1758551070 \
  --docker-custom-image-name <ACR_NAME>.azurecr.io/inchronicle-backend:latest

az webapp restart -g ps-prod-rg -n ps-backend-1758551070
```

#### Deploy Frontend:
```bash
echo "VITE_API_URL=https://ps-backend-1758551070.azurewebsites.net/api/v1" > .env.production

az acr build \
  --registry <ACR_NAME> \
  --image inchronicle-frontend:latest \
  .

az webapp config container set \
  -g ps-prod-rg \
  -n ps-frontend-1758551070 \
  --docker-custom-image-name <ACR_NAME>.azurecr.io/inchronicle-frontend:latest

az webapp restart -g ps-prod-rg -n ps-frontend-1758551070
```

## Database Management

### Connect to PostgreSQL
```bash
# Get connection string from App Settings
az webapp config appsettings list \
  -g ps-prod-rg \
  -n ps-backend-1758551070 \
  --query "[?name=='DATABASE_URL'].value" -o tsv

# Connect using psql
psql "<connection-string>"
```

### Run Migrations
Migrations run automatically on backend startup via the `migrate-and-start.js` script.

To run manually:
```bash
az webapp ssh -g ps-prod-rg -n ps-backend-1758551070
cd /app
npx prisma migrate deploy
```

### Seed Reference Data
```bash
az webapp ssh -g ps-prod-rg -n ps-backend-1758551070
cd /app
npm run db:seed-reference
```

## File Storage (Uploads)

### Azure Files Mount
Backend has Azure Files mounted at `/app/uploads`:
- **Storage Account**: `psstorage1758551070`
- **Share Name**: `uploads`
- **Mount Path**: `/app/uploads`

### Access Files
```bash
# List files in uploads
az storage file list \
  --account-name psstorage1758551070 \
  --share-name uploads \
  --path avatars

# Download file
az storage file download \
  --account-name psstorage1758551070 \
  --share-name uploads \
  --path avatars/filename.jpg \
  --dest ./local-file.jpg
```

## Monitoring & Debugging

### View Logs
```bash
# Backend logs
az webapp log tail -g ps-prod-rg -n ps-backend-1758551070

# Frontend logs
az webapp log tail -g ps-prod-rg -n ps-frontend-1758551070

# Download logs
az webapp log download -g ps-prod-rg -n ps-backend-1758551070
```

### SSH into Container
```bash
# Backend
az webapp ssh -g ps-prod-rg -n ps-backend-1758551070

# Frontend
az webapp ssh -g ps-prod-rg -n ps-frontend-1758551070
```

### Check Health
```bash
# Backend health endpoint
curl https://ps-backend-1758551070.azurewebsites.net/health

# Check app status
az webapp show -g ps-prod-rg -n ps-backend-1758551070 --query state
```

## Scaling & Performance

### Scale Up (Vertical)
```bash
# Change to Premium tier
az appservice plan update \
  -g ps-prod-rg \
  -n ps-app-plan \
  --sku P1V2
```

### Scale Out (Horizontal)
```bash
# Add instances
az appservice plan update \
  -g ps-prod-rg \
  -n ps-app-plan \
  --number-of-workers 3
```

### Auto-scaling
```bash
az monitor autoscale create \
  -g ps-prod-rg \
  --resource ps-app-plan \
  --resource-type Microsoft.Web/serverfarms \
  --min-count 1 \
  --max-count 5 \
  --count 1
```

## Troubleshooting

### Common Issues

#### 1. Container fails to start
- Check logs: `az webapp log tail`
- Verify environment variables are set
- Check Docker image exists in ACR

#### 2. Database connection fails
- Verify DATABASE_URL is correct
- Check PostgreSQL firewall rules allow Azure services
- Test connection from Web App SSH

#### 3. File uploads fail
- Verify Azure Files mount is configured
- Check UPLOAD_VOLUME_PATH environment variable
- Ensure storage account key is correct

#### 4. Frontend shows old API URL
- Remember: VITE_API_URL is baked at build time
- Rebuild frontend image with correct build arg
- Check .env.production was created before build

#### 5. CORS errors
- Verify CORS_ORIGINS includes frontend URL
- Check FRONTEND_URL setting
- Ensure both use https://

## Cost Management

### Current Pricing (Estimated)
- **App Service Plan (B1)**: ~$13/month
- **PostgreSQL Flexible Server (B1ms)**: ~$12/month
- **Storage Account**: ~$0.50/month
- **Container Registry (Basic)**: ~$5/month
- **Total**: ~$30/month

### Cost Optimization Tips
1. Use B-series for development/staging
2. Stop non-production environments when not in use
3. Monitor storage usage and clean old files
4. Use Reserved Instances for production (saves 30-40%)

## Disaster Recovery

### Backup Strategy
1. **Database**: Azure PostgreSQL automated backups (7-35 days)
2. **Files**: Azure Files has snapshot capability
3. **Configuration**: Infrastructure as code in `infra/`

### Restore Database
```bash
az postgres flexible-server restore \
  -g ps-prod-rg \
  -n ps-postgres-server-restored \
  --source-server ps-postgres-server \
  --restore-point-in-time "2025-01-15T10:00:00Z"
```

## Security Best Practices

1. **Use Managed Identities**: Already configured for ACR pull
2. **Key Vault**: Consider moving secrets to Azure Key Vault
3. **Private Endpoints**: For production, use VNet integration
4. **SSL/TLS**: Azure handles certificates automatically
5. **Firewall Rules**: Restrict PostgreSQL to Azure services only
6. **Environment Variables**: Never commit secrets to Git
7. **RBAC**: Use role-based access control for Azure resources

## Local Development

See `backend/.env.example` for local development configuration.

```bash
# Frontend
npm run dev  # Runs on http://localhost:5173

# Backend
cd backend
npm run dev  # Runs on http://localhost:3002
```

## Support & References

- [Azure Web Apps Documentation](https://docs.microsoft.com/azure/app-service/)
- [Azure PostgreSQL Documentation](https://docs.microsoft.com/azure/postgresql/)
- [Azure Container Registry Documentation](https://docs.microsoft.com/azure/container-registry/)
- [GitHub Actions Azure Deploy](https://github.com/Azure/actions)
