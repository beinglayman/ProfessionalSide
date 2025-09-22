# 🚂 Railway Volume Setup - Step by Step

## Current Issue
Avatars are being uploaded but URLs are using HTTP instead of HTTPS, causing load failures. Also, files are lost on deployment without persistent storage.

## Solution: Railway Volumes + Environment Variables

### Step 1: Add Environment Variables to Railway

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Select your **backend service** (api.inchronicle.com)
3. Go to **Variables** tab
4. Add these missing variables:

```bash
API_BASE_URL=https://api.inchronicle.com
UPLOAD_VOLUME_PATH=/app/uploads
```

### Step 2: Add Persistent Volume

1. In the same backend service, go to **Settings** → **Volumes**
2. Click **"Add Volume"**
3. Configure:
   - **Mount Path**: `/app/uploads`
   - **Size**: 1GB
   - **Name**: `avatar-storage`
4. Click **"Add Volume"**

### Step 3: Deploy

Railway will automatically redeploy with:
- ✅ HTTPS avatar URLs
- ✅ Persistent file storage
- ✅ Proper CORS headers

## What This Fixes

1. **HTTP → HTTPS**: `API_BASE_URL` forces HTTPS for all avatar URLs
2. **Persistent Storage**: Volume ensures avatars survive deployments
3. **Path Configuration**: `UPLOAD_VOLUME_PATH` tells app where to store files

## After Setup

- New uploads will use HTTPS URLs
- All files will persist across deployments
- Frontend will auto-convert old HTTP URLs to HTTPS
- Broken avatar links will fallback to default avatar

## Verification

Check Railway Status page: `/railway`
- Should show API_BASE_URL as configured
- Avatar uploads should work without errors
- Images should load properly with HTTPS URLs