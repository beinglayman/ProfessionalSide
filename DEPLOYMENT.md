# InChronicle Deployment Guide

> **Note**: This project has been migrated from Railway to Azure.

## Azure Deployment

For complete Azure deployment instructions, see **[AZURE_DEPLOYMENT.md](./AZURE_DEPLOYMENT.md)**.

### Quick Links

- **Full Deployment Guide**: [AZURE_DEPLOYMENT.md](./AZURE_DEPLOYMENT.md)
- **Infrastructure Provisioning**: [infra/azure-provision.sh](./infra/azure-provision.sh)
- **Environment Configuration**: [infra/.env.example](./infra/.env.example)
- **CI/CD Workflows**: [.github/workflows/](./.github/workflows/)

### Production URLs

- **Frontend**: https://ps-frontend-1758551070.azurewebsites.net
- **Backend API**: https://ps-backend-1758551070.azurewebsites.net/api/v1
- **Health Check**: https://ps-backend-1758551070.azurewebsites.net/health

### Key Azure Resources

- **Resource Group**: ps-prod-rg
- **App Service Plan**: ps-app-plan (Linux, B1)
- **Backend Web App**: ps-backend-1758551070
- **Frontend Web App**: ps-frontend-1758551070
- **Database**: Azure PostgreSQL Flexible Server
- **Storage**: Azure Files (mounted at /app/uploads)
- **Registry**: Azure Container Registry

### Local Development

See [backend/.env.example](./backend/.env.example) for local environment setup.

```bash
# Frontend
npm run dev  # http://localhost:5173

# Backend
cd backend
npm run dev  # http://localhost:3002
```

### Deployment Commands

#### Manual Deployment

```bash
# Backend
cd backend
az acr build --registry <ACR_NAME> --image inchronicle-backend:latest .
az webapp restart -g ps-prod-rg -n ps-backend-1758551070

# Frontend
az acr build --registry <ACR_NAME> --image inchronicle-frontend:latest \
  --build-arg VITE_API_URL=https://ps-backend-1758551070.azurewebsites.net/api/v1 .
az webapp restart -g ps-prod-rg -n ps-frontend-1758551070
```

#### Automated Deployment

GitHub Actions automatically deploy on push to `main` branch:
- Backend: Changes in `backend/**` trigger backend deployment
- Frontend: Changes in `src/**`, `public/**`, or `package.json` trigger frontend deployment

### Environment Variables

**Backend (Azure App Settings)**:
```bash
# View current settings
az webapp config appsettings list -g ps-prod-rg -n ps-backend-1758551070

# Update settings
az webapp config appsettings set -g ps-prod-rg -n ps-backend-1758551070 \
  --settings KEY=value
```

**Frontend (Build-time)**:
```bash
# Set via ACR build argument
--build-arg VITE_API_URL=https://ps-backend-1758551070.azurewebsites.net/api/v1
```

### Monitoring & Logs

```bash
# View logs
az webapp log tail -g ps-prod-rg -n ps-backend-1758551070

# SSH into container
az webapp ssh -g ps-prod-rg -n ps-backend-1758551070
```

### For Detailed Information

See [AZURE_DEPLOYMENT.md](./AZURE_DEPLOYMENT.md) for:
- Complete provisioning steps
- Environment variable configuration
- Database management
- CI/CD setup
- Scaling and performance
- Troubleshooting
- Cost management
- Security best practices