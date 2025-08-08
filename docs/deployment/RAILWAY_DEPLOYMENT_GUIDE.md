# YesLocker Railway Deployment Guide

## Overview

YesLocker requires **3 separate Railway services** for full deployment:

1. **User Frontend Service** - Static hosting for user-facing H5 app
2. **Admin Frontend Service** - Static hosting for admin panel 
3. **Backend API Service** - Node.js server with PostgreSQL

## Architecture Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  User Frontend  │    │ Admin Frontend  │    │  Backend API    │
│   (Railway)     │    │   (Railway)     │    │   (Railway)     │
│                 │    │                 │    │                 │
│ Static H5 Files │    │ Static H5 Files │    │ Node.js + PG    │
│ Port: 3000      │    │ Port: 3000      │    │ Port: 3001      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────────┐
                    │  Supabase Platform  │
                    │  Edge Functions ✅  │
                    │  Database ✅        │
                    └─────────────────────┘
```

## Railway Service Configuration

### 1. User Frontend Service

**Repository Root**: `/` (main project)
**Railway Configuration**: `/railway.json`

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install && npm run build:h5"
  },
  "deploy": {
    "startCommand": "npm start",
    "numReplicas": 1,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### 2. Admin Frontend Service

**Repository Root**: `/admin`
**Railway Configuration**: `/admin/railway.json`

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install && npm run build:h5"
  },
  "deploy": {
    "startCommand": "npm start",
    "numReplicas": 1,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  },
  "healthcheck": {
    "path": "/",
    "port": 3000
  }
}
```

### 3. Backend API Service

**Repository Root**: `/server`
**Railway Configuration**: `/server/railway.json`

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install"
  },
  "deploy": {
    "startCommand": "npm run start:pg",
    "numReplicas": 1,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  },
  "healthcheck": {
    "path": "/health",
    "port": 3001
  }
}
```

## Required Environment Variables

Each Railway service needs these environment variables configured:

### All Services (Shared)
```env
NODE_ENV=production
SUPABASE_URL=https://pjrcfvhvzqgbkqxkrmhf.supabase.co
SUPABASE_ANON_KEY=[Supabase Anonymous Key]
SUPABASE_SERVICE_ROLE_KEY=[Supabase Service Role Key]
```

### Backend API Service Only
```env
DATABASE_URL=[Railway PostgreSQL Connection String]
PORT=3001
TENCENT_SECRET_ID=[SMS Service ID]
TENCENT_SECRET_KEY=[SMS Service Key]
TENCENT_SMS_APP_ID=[SMS App ID]
TENCENT_SMS_SIGN_NAME=[SMS Signature]
```

### Frontend Services Only
```env
VUE_APP_API_BASE_URL=[Backend API Service URL from Railway]
VUE_APP_SUPABASE_URL=https://pjrcfvhvzqgbkqxkrmhf.supabase.co
VUE_APP_SUPABASE_ANON_KEY=[Supabase Anonymous Key]
```

## Deployment Steps

### Step 1: Create Railway Projects

1. **Create 3 separate projects** on Railway dashboard
2. **Connect each to the GitHub repository** with different root directories:
   - Project 1: Root directory `/` (User Frontend)
   - Project 2: Root directory `/admin` (Admin Frontend)  
   - Project 3: Root directory `/server` (Backend API)

### Step 2: Configure Database

1. **Add PostgreSQL plugin** to Backend API service
2. **Copy DATABASE_URL** from Railway to environment variables
3. **Run database migrations** (optional, as Supabase is primary DB)

### Step 3: Set Environment Variables

Configure all required environment variables for each service as listed above.

### Step 4: Deploy Services

1. **Deploy in order**: Backend API → Admin Frontend → User Frontend
2. **Verify health checks** are passing
3. **Test inter-service communication**

## Service URLs & Ports

After deployment, services will be accessible at:

- **User Frontend**: `https://[user-service].railway.app` (Port 3000)
- **Admin Frontend**: `https://[admin-service].railway.app` (Port 3000)  
- **Backend API**: `https://[api-service].railway.app` (Port 3001)

## Health Check Endpoints

- **User Frontend**: `GET /` (Static files)
- **Admin Frontend**: `GET /` (Static files)
- **Backend API**: `GET /health` (JSON response)

## Monitoring & Logs

Railway provides built-in monitoring for:
- **CPU/Memory usage**
- **Request metrics**  
- **Application logs**
- **Deployment history**

## Troubleshooting

### Common Issues

1. **Build Failures**: Check node_modules and dependency versions
2. **Port Conflicts**: Ensure each service uses correct port
3. **Environment Variables**: Verify all required vars are set
4. **Cross-Origin Errors**: Configure CORS in backend API
5. **Database Connections**: Verify PostgreSQL connection string

### Debug Commands

```bash
# Check service logs
railway logs [service-name]

# Check environment variables
railway variables list

# Restart service
railway up --detach

# Connect to PostgreSQL
railway connect postgres
```

## Security Considerations

1. **Environment Variables**: Never commit secrets to repository
2. **CORS Configuration**: Restrict origins to deployed domains
3. **HTTPS Only**: Ensure all communication uses HTTPS
4. **Rate Limiting**: Configure rate limits on API endpoints
5. **Access Control**: Use proper authentication tokens

## Cost Optimization

1. **Scale Appropriately**: Start with 1 replica per service
2. **Monitor Usage**: Use Railway metrics to optimize resources  
3. **Database Optimization**: Use connection pooling for PostgreSQL
4. **Static Assets**: Consider CDN for static frontend assets

## Maintenance

### Regular Tasks

- **Monitor service health** via Railway dashboard
- **Update dependencies** in package.json files
- **Check security vulnerabilities** with npm audit
- **Review application logs** for errors
- **Update environment variables** as needed

### Scaling Considerations

- **Horizontal Scaling**: Increase replicas during high traffic
- **Vertical Scaling**: Upgrade service resources if needed
- **Database Scaling**: Monitor PostgreSQL performance
- **CDN Integration**: Add CloudFlare or similar for static assets

## Support & Documentation

- **Railway Docs**: https://docs.railway.app/
- **Supabase Integration**: Already configured and working ✅
- **Project GitHub**: Repository with all configurations
- **Health Monitoring**: Built-in Railway dashboard metrics