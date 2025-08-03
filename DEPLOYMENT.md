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
   JWT_SECRET=8f7e6d5c4b3a2918f7e6d5c4b3a2918f7e6d5c4b3a29
   JWT_REFRESH_SECRET=9g8f7e6d5c4b3a2919g8f7e6d5c4b3a2919g8f7e6d5c4b
   JWT_EXPIRES_IN=15m
   JWT_REFRESH_EXPIRES_IN=7d
   API_PORT=3002
   API_BASE_URL=https://professionalside-production.up.railway.app
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   MAX_FILE_SIZE=10485760
   LOG_LEVEL=info
   SESSION_SECRET=h9i8j7k6l5m4n3o2p1q0r9s8t7u6v5w4x3y2z1a0b9c8d7
   ```

3. **Configure Root Directory**:
   - Set Root Directory to `/backend`
   - Railway will auto-detect package.json and build

4. **Add Persistent Volume for Avatars**:
   - Go to **Settings** → **Volumes**
   - Click **"Add Volume"**
   - Configure:
     - **Mount Path**: `/app/uploads`
     - **Size**: 1GB (or as needed)
     - **Name**: `avatar-storage`
   - Add environment variable: `UPLOAD_VOLUME_PATH=/app/uploads`

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

## ✅ Persistent File Storage with Railway Volumes

**Railway Volumes provide persistent storage** - uploaded avatars will survive deployments when properly configured:

- ✅ Native Railway solution (no external services needed)
- ✅ Automatic backups and scaling
- ✅ Fast local file access
- ✅ Survives deployments and restarts

**Setup**: Follow Step 4 above to add the volume to your backend service.

## Troubleshooting

### Common Issues:
1. **Build fails**: Check if all dependencies are in package.json
2. **Database connection**: Verify DATABASE_URL is set
3. **CORS errors**: Update FRONTEND_URL environment variable
4. **404 errors**: Check Root Directory settings
5. **Avatar images not loading**: 
   - Check API_BASE_URL is set correctly
   - Verify CORS_ORIGINS includes frontend URL
   - Ensure Railway Volume is properly mounted at `/app/uploads`
   - Check UPLOAD_VOLUME_PATH environment variable is set

### Logs Access:
- Railway dashboard → Your Service → View Logs
- Real-time logs during deployment and runtime