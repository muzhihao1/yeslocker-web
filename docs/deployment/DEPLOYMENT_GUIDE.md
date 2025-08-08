# YesLocker Production Deployment Guide

## 📋 Overview

This guide provides step-by-step instructions for deploying YesLocker to production using Supabase Edge Functions and Vercel.

## 🚀 Quick Start

```bash
# 1. Set environment variables
export SUPABASE_PROJECT_ID="your-project-id"
export SUPABASE_ACCESS_TOKEN="your-access-token"

# 2. Run deployment script
chmod +x deploy.sh
./deploy.sh production
```

## 📁 Project Structure

```
yeslocker/
├── src/                     # User app (H5)
├── admin/                   # Admin panel (H5)
├── supabase/
│   ├── functions/          # Edge Functions (9 functions)
│   ├── migrations/         # Database migrations
│   └── config.toml        # Supabase configuration
├── deploy.sh              # Deployment script
├── vercel.json           # Vercel configuration
└── .env.production.example # Environment template
```

## 🛠️ Prerequisites

### Software Requirements
- **Node.js** >= 16.0.0
- **npm** >= 8.0.0
- **Supabase CLI** >= 1.100.0
- **Git**

### Accounts Required
- [Supabase Account](https://supabase.com)
- [Vercel Account](https://vercel.com)
- [Tencent Cloud Account](https://cloud.tencent.com) (for SMS)

### Installation Commands

```bash
# Install Supabase CLI
npm install -g supabase

# Install Vercel CLI
npm install -g vercel

# Verify installations
supabase --version
vercel --version
```

## 🔧 Environment Setup

### 1. Create Supabase Project

```bash
# Login to Supabase
supabase login

# Create new project (or use existing)
supabase projects create yeslocker

# Get project details
supabase projects list
```

### 2. Environment Variables

Copy the example environment file:

```bash
cp .env.production.example .env.production
```

Fill in your actual values:

```env
# Required - Supabase Configuration
SUPABASE_PROJECT_ID=your-actual-project-id
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-actual-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-actual-service-role-key
SUPABASE_ACCESS_TOKEN=your-actual-access-token
SUPABASE_DB_PASSWORD=your-secure-db-password

# Optional - SMS Configuration
TENCENT_SECRET_ID=your-tencent-secret-id
TENCENT_SECRET_KEY=your-tencent-secret-key
TENCENT_SMS_APP_ID=your-sms-app-id
TENCENT_SMS_SIGN_NAME=your-sms-sign-name

# Application Configuration
NODE_ENV=production
ENVIRONMENT=production
```

### 3. Vercel Configuration

Set environment variables in Vercel dashboard:

```bash
# Link to Vercel project
vercel link

# Set environment variables
vercel env add SUPABASE_URL
vercel env add SUPABASE_ANON_KEY
# ... add all required variables
```

## 🚢 Deployment Process

### Automated Deployment (Recommended)

```bash
# Run the automated deployment script
./deploy.sh production
```

The script will:
1. ✅ Check prerequisites
2. ✅ Validate environment variables
3. ✅ Run tests and build frontend
4. ✅ Deploy database migrations
5. ✅ Deploy all Edge Functions
6. ✅ Configure production environment
7. ✅ Verify deployment

### Manual Deployment Steps

If you prefer manual deployment:

#### Step 1: Database Setup

```bash
# Link to your Supabase project
supabase link --project-ref $SUPABASE_PROJECT_ID

# Apply database migrations
supabase db push
```

#### Step 2: Deploy Edge Functions

```bash
# Deploy all functions
supabase functions deploy admin-login
supabase functions deploy admin-approval
supabase functions deploy auth-login
supabase functions deploy auth-register
supabase functions deploy locker-operations
supabase functions deploy lockers-apply
supabase functions deploy stores-lockers
supabase functions deploy sms-send
supabase functions deploy reminder-check
```

#### Step 3: Configure Secrets

```bash
# Set production environment
supabase secrets set ENVIRONMENT=production

# Set SMS configuration (if available)
supabase secrets set TENCENT_SECRET_ID="$TENCENT_SECRET_ID"
supabase secrets set TENCENT_SECRET_KEY="$TENCENT_SECRET_KEY"
supabase secrets set TENCENT_SMS_APP_ID="$TENCENT_SMS_APP_ID"
supabase secrets set TENCENT_SMS_SIGN_NAME="$TENCENT_SMS_SIGN_NAME"
```

#### Step 4: Build and Deploy Frontend

```bash
# Build user app
npm run build

# Build admin app
npm run build:admin

# Deploy to Vercel
vercel --prod
```

## 🔍 Verification

### 1. API Health Check

```bash
# Test admin login function
curl -X POST \
  -H "Content-Type: application/json" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -d '{"phone": "13800000001", "password": "admin123"}' \
  "$SUPABASE_URL/functions/v1/admin-login"
```

### 2. Frontend Access

- **User App**: https://your-domain.vercel.app
- **Admin Panel**: https://your-domain.vercel.app/admin

### 3. Database Connection

```bash
# Check database connection
supabase db status
```

## 📊 Monitoring Setup

### 1. Supabase Dashboard

Monitor your deployment at:
- https://supabase.com/dashboard/project/your-project-id

Key metrics to watch:
- API requests/minute
- Database connections
- Function invocations
- Error rates

### 2. Vercel Analytics

Enable analytics in Vercel dashboard:
- Performance metrics
- Core Web Vitals
- User analytics

### 3. Custom Monitoring

Add monitoring to your Edge Functions:

```typescript
// Add to each function
console.log('Function started:', new Date().toISOString())
console.log('Function completed:', new Date().toISOString())
```

## 🔒 Security Configuration

### 1. Database Security

- ✅ Row Level Security (RLS) enabled
- ✅ API keys properly configured
- ✅ Service role key secured

### 2. Function Security

- ✅ CORS headers configured
- ✅ Input validation implemented
- ✅ Authentication required

### 3. Frontend Security

- ✅ Security headers configured
- ✅ HTTPS enforced
- ✅ XSS protection enabled

## 🎯 Performance Optimization

### Database Optimization

```sql
-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_store_id ON applications(store_id);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_lockers_store_id ON lockers(store_id);
```

### CDN Configuration

Static assets are automatically cached by Vercel's Edge Network:
- Images: 1 year cache
- JS/CSS: 1 day cache
- API responses: No cache

## 🚨 Troubleshooting

### Common Issues

#### 1. Function Deployment Failed

```bash
# Check function logs
supabase functions logs function-name

# Redeploy specific function
supabase functions deploy function-name --debug
```

#### 2. Database Connection Issues

```bash
# Check database status
supabase db status

# Reset database connection
supabase db reset
supabase db push
```

#### 3. Frontend Build Errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Run type check
npm run type-check

# Build again
npm run build
```

#### 4. Environment Variable Issues

```bash
# Check current environment variables
vercel env ls

# Pull environment variables locally
vercel env pull .env.local
```

### Error Codes Reference

| Code | Description | Solution |
|------|-------------|----------|
| 401 | Unauthorized | Check API keys |
| 403 | Forbidden | Verify RLS policies |
| 500 | Internal Server Error | Check function logs |
| 503 | Service Unavailable | Check Supabase status |

## 📈 Scaling Considerations

### Database Scaling

- **Connections**: Default limit is 100 concurrent
- **Storage**: Starts with 500MB, auto-scales
- **Bandwidth**: 5GB included

### Function Scaling

- **Invocations**: 500,000/month included
- **Execution time**: 60s timeout
- **Memory**: 150MB default

### Frontend Scaling

- **Bandwidth**: 100GB/month included
- **Builds**: Unlimited
- **Domains**: Custom domains supported

## 🔄 CI/CD Pipeline

### GitHub Actions Example

```yaml
name: Deploy YesLocker
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Run tests
        run: npm run test
      
      - name: Deploy to production
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_PROJECT_ID: ${{ secrets.SUPABASE_PROJECT_ID }}
        run: ./deploy.sh production
```

## 📞 Support

### Resources

- **Supabase Docs**: https://supabase.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **uni-app Docs**: https://uniapp.dcloud.net.cn/

### Contact

For deployment issues:
1. Check this guide first
2. Review logs in respective platforms
3. Consult platform documentation
4. Contact platform support if needed

## ✅ Post-Deployment Checklist

- [ ] All functions deployed successfully
- [ ] Database migrations applied
- [ ] Frontend applications accessible
- [ ] Admin login working
- [ ] User registration working
- [ ] SMS service configured (if applicable)
- [ ] Performance monitoring enabled
- [ ] Security headers configured
- [ ] SSL certificates valid
- [ ] Custom domain configured (if applicable)
- [ ] Backup strategy implemented
- [ ] Team access configured

## 🔐 Production Security Checklist

- [ ] Service role key secured and not exposed
- [ ] All environment variables properly set
- [ ] RLS policies active and tested
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Input validation implemented
- [ ] Error messages don't expose sensitive info
- [ ] Logs don't contain sensitive data
- [ ] Regular security updates planned

---

**🎉 Congratulations!** Your YesLocker system is now deployed to production.

Remember to monitor your deployment and keep your dependencies updated for optimal security and performance.