# InChronicle Railway Deployment Guide

## Prerequisites
1. [Railway account](https://railway.app) (free tier available)
2. GitHub repository with your code
3. This project pushed to GitHub

## Step 1: Deploy Backend + Database

1. **Go to [Railway](https://railway.app) and sign in**
2. **Create New Project** → **Deploy from GitHub repo**
3. **Select your repository**
4. **Railway will detect the backend automatically**

### Configure Backend Service:
1. **Add PostgreSQL Database**:
   - Click "New Service" → "Database" → "PostgreSQL"
   - Railway automatically creates `DATABASE_URL` variable

2. **Set Environment Variables** (in Railway dashboard):
   ```
   NODE_ENV=production
   JWT_SECRET=your-super-secure-jwt-secret-here
   JWT_REFRESH_SECRET=your-super-secure-refresh-secret-here
   JWT_EXPIRES_IN=15m
   JWT_REFRESH_EXPIRES_IN=7d
   API_PORT=3002
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   MAX_FILE_SIZE=10485760
   LOG_LEVEL=info
   SESSION_SECRET=your-session-secret-here
   ```

3. **Configure Root Directory**:
   - Set Root Directory to `/backend`
   - Railway will auto-detect package.json and build

### Your backend will be available at:
`https://your-project-name.up.railway.app`

## Step 2: Deploy Frontend

1. **Create another service** in the same Railway project
2. **Connect to same GitHub repo**
3. **Configure frontend service**:
   - Set Root Directory to `/` (root of repo)
   - Set Build Command: `npm run build`
   - Set Start Command: `npm run preview`

### Set Frontend Environment Variables:
```
VITE_API_URL=https://your-backend-url.up.railway.app/api/v1
```

### Your frontend will be available at:
`https://your-frontend-name.up.railway.app`

## Step 3: Update CORS Settings

After deployment, update backend environment variables:
```
FRONTEND_URL=https://your-frontend-url.up.railway.app
CORS_ORIGINS=https://your-frontend-url.up.railway.app
```

## Step 4: Database Setup

The database will auto-migrate on first deployment. If you need to seed data:

1. **Connect to Railway PostgreSQL** using provided connection string
2. **Run seed commands** if needed

## Team Access

**Share these URLs with your team:**
- **App**: `https://your-frontend-name.up.railway.app`
- **API**: `https://your-backend-name.up.railway.app`
- **Health Check**: `https://your-backend-name.up.railway.app/health`

## Monitoring

**Railway provides:**
- ✅ Real-time logs
- ✅ Metrics dashboard  
- ✅ Deploy history
- ✅ Environment variables management
- ✅ Custom domain support

## Cost Estimate

**Railway Free Tier:**
- $5/month credit (enough for testing)
- Sleep after 30min inactivity (hobby tier)
- Upgrade to $5/month for always-on services

## Troubleshooting

### Common Issues:
1. **Build fails**: Check if all dependencies are in package.json
2. **Database connection**: Verify DATABASE_URL is set
3. **CORS errors**: Update FRONTEND_URL environment variable
4. **404 errors**: Check Root Directory settings

### Logs Access:
- Railway dashboard → Your Service → View Logs
- Real-time logs during deployment and runtime