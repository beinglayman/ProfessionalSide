# Railway Volume Setup for Persistent Avatar Storage

## Step 1: Create Volume in Railway Dashboard

1. Go to your Railway project dashboard
2. Click on your backend service
3. Go to **Settings** → **Volumes**
4. Click **"Add Volume"**
5. Configure:
   - **Mount Path**: `/app/uploads`
   - **Size**: 1GB (or as needed)
   - **Name**: `avatar-storage`

## Step 2: Environment Variable (Optional)
Add to Railway environment variables:
```
UPLOAD_VOLUME_PATH=/app/uploads
```

## Step 3: Deploy
After adding the volume, Railway will automatically redeploy with persistent storage mounted.

## How it Works
- Volume mounts at `/app/uploads` inside the container
- All uploaded avatars persist across deployments
- Accessible via the same `/uploads/avatars/` route
- No external services required
- Railway handles backup and scaling

## Benefits
✅ Native Railway solution
✅ No external API keys needed
✅ Automatic backups
✅ Fast local file access
✅ Simple setup