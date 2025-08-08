# Environment Variables Multi-Platform Mapping

## Overview

This document ensures consistency across all deployment platforms: **Vercel**, **Railway**, and **Local Development**.

## Core Environment Variables

### Supabase Configuration
| Variable | Vercel | Railway | Local (.env) | Description |
|----------|--------|---------|--------------|-------------|
| `SUPABASE_URL` | ✅ Set | ✅ Required | ✅ Required | Supabase project URL |
| `SUPABASE_ANON_KEY` | ✅ Set | ✅ Required | ✅ Required | Public anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Set | ✅ Required | ✅ Required | Service role key for backend |

**Value**: `https://pjrcfvhvzqgbkqxkrmhf.supabase.co`

### SMS Service Configuration (Tencent Cloud)
| Variable | Vercel | Railway | Local (.env) | Description |
|----------|--------|---------|--------------|-------------|
| `TENCENT_SECRET_ID` | ✅ Set | ⚠️ Need to Set | ✅ Set | Tencent Cloud Access Key ID |
| `TENCENT_SECRET_KEY` | ✅ Set | ⚠️ Need to Set | ✅ Set | Tencent Cloud Secret Key |
| `TENCENT_SMS_APP_ID` | ✅ Set | ⚠️ Need to Set | ✅ Set | SMS Application ID |
| `TENCENT_SMS_SIGN_NAME` | ✅ Set | ⚠️ Need to Set | ✅ Set | SMS Signature Name |

### Application Configuration
| Variable | Vercel | Railway | Local (.env) | Description |
|----------|--------|---------|--------------|-------------|
| `NODE_ENV` | `production` | `production` | `development` | Environment mode |
| `PORT` | Auto-assigned | `3001` (API) | `3000/5173` | Service port |

### Database Configuration
| Variable | Vercel | Railway | Local (.env) | Description |
|----------|--------|---------|--------------|-------------|
| `DATABASE_URL` | N/A (Uses Supabase) | ⚠️ Railway PostgreSQL | N/A (Uses Supabase) | PostgreSQL connection string |

### Frontend-Specific Variables
| Variable | Vercel | Railway | Local (.env) | Description |
|----------|--------|---------|--------------|-------------|
| `VUE_APP_API_BASE_URL` | Auto-detect | Railway API URL | `http://localhost:3001` | Backend API endpoint |
| `VUE_APP_SUPABASE_URL` | ✅ Set | ✅ Required | ✅ Required | Frontend Supabase URL |
| `VUE_APP_SUPABASE_ANON_KEY` | ✅ Set | ✅ Required | ✅ Required | Frontend Supabase key |

## Platform-Specific Requirements

### Vercel (Current Production)
**Status**: ✅ **Fully Configured**
- All environment variables properly set
- Edge Functions deployed on Supabase
- Static frontends deployed successfully

### Railway (To Be Configured)
**Status**: ⚠️ **Needs Configuration**

#### Required Actions:
1. **Set SMS Variables**:
   ```env
   TENCENT_SECRET_ID=[Copy from Vercel]
   TENCENT_SECRET_KEY=[Copy from Vercel]
   TENCENT_SMS_APP_ID=[Copy from Vercel]
   TENCENT_SMS_SIGN_NAME=[Copy from Vercel]
   ```

2. **Configure Service URLs**:
   ```env
   VUE_APP_API_BASE_URL=https://[backend-service].railway.app
   ```

3. **Set Up PostgreSQL** (Optional - Backend service only):
   ```env
   DATABASE_URL=[Railway PostgreSQL Connection String]
   ```

### Local Development
**Status**: ✅ **Configured**
- `.env.local` file with all required variables
- Supabase local development environment
- SMS testing with development credentials

## Migration Checklist

### From Vercel to Railway

#### Step 1: Export Environment Variables
```bash
# Copy these values from Vercel dashboard:
SUPABASE_URL=https://pjrcfvhvzqgbkqxkrmhf.supabase.co
SUPABASE_ANON_KEY=[Copy from Vercel]
SUPABASE_SERVICE_ROLE_KEY=[Copy from Vercel]
TENCENT_SECRET_ID=[Copy from Vercel]
TENCENT_SECRET_KEY=[Copy from Vercel]
TENCENT_SMS_APP_ID=[Copy from Vercel]
TENCENT_SMS_SIGN_NAME=[Copy from Vercel]
```

#### Step 2: Configure Railway Services
1. **User Frontend Service**:
   ```env
   NODE_ENV=production
   VUE_APP_SUPABASE_URL=https://pjrcfvhvzqgbkqxkrmhf.supabase.co
   VUE_APP_SUPABASE_ANON_KEY=[Supabase Anon Key]
   VUE_APP_API_BASE_URL=https://[api-service].railway.app
   ```

2. **Admin Frontend Service**:
   ```env
   NODE_ENV=production
   VUE_APP_SUPABASE_URL=https://pjrcfvhvzqgbkqxkrmhf.supabase.co
   VUE_APP_SUPABASE_ANON_KEY=[Supabase Anon Key]
   VUE_APP_API_BASE_URL=https://[api-service].railway.app
   ```

3. **Backend API Service**:
   ```env
   NODE_ENV=production
   PORT=3001
   SUPABASE_URL=https://pjrcfvhvzqgbkqxkrmhf.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=[Service Role Key]
   TENCENT_SECRET_ID=[SMS Secret ID]
   TENCENT_SECRET_KEY=[SMS Secret Key]
   TENCENT_SMS_APP_ID=[SMS App ID]
   TENCENT_SMS_SIGN_NAME=[SMS Sign Name]
   DATABASE_URL=[Railway PostgreSQL URL - Optional]
   ```

#### Step 3: Update Inter-Service Communication
After Railway deployment, update frontend services to use Railway API URLs:
```env
VUE_APP_API_BASE_URL=https://yeslocker-api-production.railway.app
```

## Security Best Practices

### Variable Management
1. **Never commit** `.env` files to repository
2. **Use Railway dashboard** to set sensitive variables
3. **Rotate keys** regularly (quarterly)
4. **Monitor access** logs for suspicious activity

### Access Control
1. **Separate keys** for different environments
2. **Minimum permissions** for service accounts
3. **Regular audits** of environment variable access
4. **Backup and recovery** procedures for critical vars

## Testing Environment Variables

### Verification Commands
```bash
# Check local environment
echo $SUPABASE_URL

# Test API connectivity
curl -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
     "$SUPABASE_URL/rest/v1/stores?select=*"

# Verify SMS service (if configured)
node -e "console.log('SMS Config:', process.env.TENCENT_SMS_APP_ID ? 'OK' : 'MISSING')"
```

### Health Check Endpoints
- **Frontend Health**: `GET /` → Should return HTML
- **API Health**: `GET /health` → Should return JSON status
- **Supabase Health**: `GET $SUPABASE_URL/rest/v1/` → Should return schema

## Troubleshooting

### Common Issues
1. **CORS Errors**: Check `VUE_APP_API_BASE_URL` matches deployed API
2. **Auth Failures**: Verify Supabase keys are correctly set
3. **SMS Failures**: Confirm Tencent credentials are valid
4. **DB Connection**: Check `DATABASE_URL` format and permissions

### Debug Steps
1. **Log environment variables** (without exposing secrets)
2. **Test each service independently**
3. **Verify cross-platform communication**
4. **Check Railway service logs**

## Monitoring & Alerts

### Key Metrics
- **Environment variable changes** (audit log)
- **Service startup failures** (config issues)
- **Cross-service communication errors**
- **Authentication failures**

### Alert Conditions
- **Missing environment variables** on startup
- **Invalid credentials** errors
- **Service-to-service communication failures**
- **Unexpected environment changes**