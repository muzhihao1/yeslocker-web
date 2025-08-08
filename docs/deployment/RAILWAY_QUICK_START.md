# YesLocker Railway Deployment - Quick Start

## 🚀 One-Command Deployment

```bash
# Complete Railway deployment in one command
./railway-deploy.sh
```

This master script will:
1. ✅ Create 3 Railway services automatically
2. ✅ Configure all environment variables  
3. ✅ Deploy all services
4. ✅ Verify deployments are working

## 📋 Prerequisites

1. **Railway CLI Installation**:
   ```bash
   # Option 1: npm
   npm install -g @railway/cli
   
   # Option 2: Homebrew (macOS)
   brew install railway
   ```

2. **Railway Login**:
   ```bash
   railway login
   ```
   This opens your browser for authentication.

3. **Environment File** (Optional but recommended):
   Create `.env.local` with your credentials:
   ```env
   SUPABASE_URL=https://pjrcfvhvzqgbkqxkrmhf.supabase.co
   SUPABASE_ANON_KEY=[your-anon-key]
   SUPABASE_SERVICE_ROLE_KEY=[your-service-key]
   TENCENT_SECRET_ID=[your-sms-id]
   TENCENT_SECRET_KEY=[your-sms-key]
   ```

## 🛠️ Individual Scripts (Advanced)

If you prefer step-by-step control:

```bash
# Step 1: Create Railway projects
./railway-setup.sh

# Step 2: Configure environment variables
./railway-env-config.sh

# Step 3: Verify deployments
./railway-verify.sh
```

## 🌐 Expected Results

After successful deployment, you'll have:

- **User Frontend**: `https://[user-service].railway.app`
- **Admin Frontend**: `https://[admin-service].railway.app`  
- **Backend API**: `https://[api-service].railway.app`

## 🏗️ Service Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  User Frontend  │    │ Admin Frontend  │    │  Backend API    │
│   (Railway)     │    │   (Railway)     │    │   (Railway)     │
│ Static H5 Files │    │ Static H5 Files │    │ Node.js + PG    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                   ┌─────────────────────┐
                   │  Supabase Platform  │
                   │  Edge Functions ✅  │
                   └─────────────────────┘
```

## 🚨 Troubleshooting

### Common Issues

1. **Railway CLI not found**:
   ```bash
   npm install -g @railway/cli
   ```

2. **Not logged in**:
   ```bash
   railway login
   ```

3. **Deployment fails**:
   - Check Railway dashboard for errors
   - Verify environment variables are set
   - Review build configurations

4. **Services not responding**:
   - Wait 2-5 minutes for deployment completion
   - Check service logs: `railway logs [service-name]`

### Debug Commands

```bash
# Check Railway status
railway whoami

# View service logs
railway logs [service-name]

# List environment variables
railway variables list

# Check deployment status
railway status
```

## 📖 Documentation

- **Complete Guide**: [RAILWAY_DEPLOYMENT_GUIDE.md](RAILWAY_DEPLOYMENT_GUIDE.md)
- **Environment Variables**: [ENVIRONMENT_VARIABLES_MAPPING.md](ENVIRONMENT_VARIABLES_MAPPING.md)
- **Railway Dashboard**: https://railway.app/dashboard

## ✅ Verification Checklist

After deployment, verify:

- [ ] All 3 services show "ACTIVE" status in Railway dashboard
- [ ] User frontend loads at provided URL
- [ ] Admin frontend loads at provided URL  
- [ ] Backend API responds to `/health` endpoint
- [ ] Environment variables are properly set
- [ ] Services can communicate with each other

## 🎯 Success Criteria

Your deployment is successful when:

1. ✅ **All services deployed** without errors
2. ✅ **Health checks passing** for all endpoints
3. ✅ **Frontend applications loading** in browser
4. ✅ **API endpoints responding** correctly
5. ✅ **Cross-service communication** working

## 🔧 Post-Deployment

### Optional Enhancements

1. **Custom Domains**: Configure in Railway dashboard
2. **SSL Certificates**: Automatically provided by Railway
3. **Monitoring**: Set up alerts and metrics
4. **Scaling**: Adjust replicas based on traffic

### Production Readiness

- ✅ **Security**: All secrets in environment variables
- ✅ **Performance**: Optimized build configurations
- ✅ **Monitoring**: Health checks enabled
- ✅ **Scalability**: Ready for horizontal scaling

## 🆘 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review Railway documentation: https://docs.railway.app/
3. Check GitHub issues for known problems
4. Contact Railway support for platform issues

---

**🎉 Congratulations! Your YesLocker system is now running on Railway! 🎉**