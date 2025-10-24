# Azure Deployment Status - Database Reset

**Date**: October 8, 2025
**Objective**: Reset Azure production database with fresh schema after fixing naming mismatches

## ✅ Completed Steps

### 1. Fresh Migration Generated
- Removed all old migrations
- Generated new migration: `20251008180224_init_fresh_schema`
- Migration contains 1141 lines of SQL
- All table naming and schema issues fixed

### 2. Database Successfully Reset
- Connected to Azure PostgreSQL from localhost
- Ran `prisma migrate reset` successfully
- All tables dropped and recreated with correct schema
- Database URL: `pspg1758551070.postgres.database.azure.com:5432/psdbprod`

### 3. Minimal Reference Data Seeded
- 8 Focus Areas seeded successfully:
  - Engineering, Product, Design, Marketing
  - Sales, Operations, Finance, People

### 4. Docker Image Built and Deployed
- Built correct backend image (not frontend!)
- Pushed to ACR: `psacr1758551070.azurecr.io/inchronicle-backend:latest`
- Image digest: `sha256:7a62f760a087dfa0161fb31ab4c86af085fc5da0acc2937350f7d4fa445e362d`
- **Important**: Currently running WITHOUT auto-migrations in CMD

### 5. Git Commit Created
- Commit hash: `8fa658c`
- Message: "Reset database: fresh migration after schema fixes"
- Force pushed to main branch

## ⚠️ Current Issues

### Backend Not Starting
The backend container is failing to start and listen on port 3002. Possible causes:

1. **Missing required reference data** - App may need WorkCategories, WorkTypes, or Skills
2. **Startup errors** - TypeScript/Node errors preventing app from running
3. **Database connection issues** - Though connection string is correct
4. **Missing environment variables** - PORT, NODE_ENV, etc.

### Current Dockerfile Configuration
The Dockerfile CMD has been temporarily modified:
```dockerfile
# TEMPORARY: Auto-migrations disabled
CMD ["sh", "-c", "NODE_ENV=production npx tsx src/app.ts"]
```

**Original (should be restored)**:
```dockerfile
CMD ["sh", "-c", "npm run db:migrate:deploy && NODE_ENV=production npx tsx src/app.ts"]
```

## 📋 Next Steps to Complete

### 1. Add Complete Reference Data
Run full seed script from localhost:
```bash
cd backend
export DATABASE_URL='postgresql://psuser:wVnjV5pfU9SnY4IV68hmdFZFhzFSon8@pspg1758551070.postgres.database.azure.com:5432/psdbprod?sslmode=require'
npm run db:seed-reference
```

Or use the minimal seed for quick testing:
```bash
cd backend
export DATABASE_URL='postgresql://psuser:wVnjV5pfU9SnY4IV68hmdFZFhzFSon8@pspg1758551070.postgres.database.azure.com:5432/psdbprod?sslmode=require'
node minimal-seed.cjs
```

### 2. Debug Backend Startup
Once seeding completes, try to access Azure logs to see why the backend isn't starting:
```bash
# In Azure Portal:
# - Go to App Service → ps-backend-1758551070
# - Click "Log stream" in left sidebar
# - Look for startup errors

# Or via CLI (if it works):
az webapp log tail -g ps-prod-rg -n ps-backend-1758551070
```

### 3. Restore Auto-Migrations in Dockerfile
Once backend starts successfully, restore automatic migrations:

```bash
cd backend
# Edit Dockerfile line 28 back to:
CMD ["sh", "-c", "npm run db:migrate:deploy && NODE_ENV=production npx tsx src/app.ts"]

# Rebuild and push
az acr build --registry psacr1758551070 --resource-group ps-prod-rg \
  --image inchronicle-backend:latest --file Dockerfile .

# Restart
az webapp restart -g ps-prod-rg -n ps-backend-1758551070
```

### 4. Verify Deployment
Run the verification script:
```bash
./verify-azure-deployment.sh
```

Or manually test:
```bash
# Health check
curl https://ps-backend-1758551070.azurewebsites.net/health

# API version
curl https://ps-backend-1758551070.azurewebsites.net/api/v1

# Test registration
curl -X POST https://ps-backend-1758551070.azurewebsites.net/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","name":"Test User"}'
```

### 5. Setup GitHub Actions (Optional)
If you want automated deployments, add these GitHub Secrets:
- `AZURE_CREDENTIALS` - Service principal credentials
- `ACR_NAME` - `psacr1758551070`
- `AZ_RG` - `ps-prod-rg`
- `BACKEND_APPNAME` - `ps-backend-1758551070`

## 🔧 Troubleshooting Commands

### Check App Status
```bash
az webapp show -g ps-prod-rg -n ps-backend-1758551070 \
  --query "{state:state, usageState:usageState}"
```

### Check Environment Variables
```bash
az webapp config appsettings list -g ps-prod-rg -n ps-backend-1758551070
```

### SSH into Container (when running)
```bash
az webapp ssh -g ps-prod-rg -n ps-backend-1758551070
```

### Check Database Tables
```bash
cd backend
export DATABASE_URL='postgresql://psuser:wVnjV5pfU9SnY4IV68hmdFZFhzFSon8@pspg1758551070.postgres.database.azure.com:5432/psdbprod?sslmode=require'

# Using Prisma Studio
npx prisma studio

# Or via SQL query
node -e "
const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();
p.\$queryRaw\`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name\`
  .then(r => console.table(r))
  .finally(() => p.\$disconnect());
"
```

## 📝 Files Modified

1. `/backend/Dockerfile` - Temporarily disabled auto-migrations
2. `/backend/prisma/migrations/20251008180224_init_fresh_schema/migration.sql` - Fresh migration
3. `/backend/minimal-seed.cjs` - Quick seed script for testing
4. `/verify-azure-deployment.sh` - Deployment verification script

## 🎯 Success Criteria

- [ ] Backend health endpoint returns HTTP 200
- [ ] User registration works
- [ ] Focus areas API returns data
- [ ] Frontend can connect to backend
- [ ] All database tables exist with correct schema
- [ ] Reference data fully seeded
- [ ] Auto-migrations restored in Dockerfile

## 📌 Important Notes

- **Database schema is now correct** ✅
- **No production data was lost** (database was empty)
- **Fresh start with clean migrations** ✅
- **Backend image is correct** (not frontend!) ✅
- **Seeding may take 5-10 minutes** for full reference data

---

**Last Updated**: October 8, 2025, 2:00 PM
**Next Action**: Complete reference data seeding and debug backend startup
