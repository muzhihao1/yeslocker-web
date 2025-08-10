#!/bin/bash

# YesLocker Railway Environment Configuration v2
# Updated for Express + PostgreSQL architecture

set -e  # Exit on error

echo "🔧 YesLocker Railway Environment Configuration v2"
echo "================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Railway CLI is installed and logged in
if ! command -v railway &> /dev/null; then
    echo -e "${RED}❌ Railway CLI is not installed${NC}"
    echo "Please install with: npm install -g @railway/cli"
    exit 1
fi

if ! railway whoami &> /dev/null; then
    echo -e "${RED}❌ Not logged in to Railway${NC}"
    echo "Please run: railway login"
    exit 1
fi

echo -e "${GREEN}✅ Railway CLI is ready${NC}"
echo ""

# Load environment variables from .env.local if it exists
if [ -f .env.local ]; then
    echo -e "${BLUE}📄 Loading environment variables from .env.local${NC}"
    set -a
    source .env.local
    set +a
    echo -e "${GREEN}✅ Environment variables loaded from .env.local${NC}"
else
    echo -e "${YELLOW}⚠️  .env.local not found, using manual configuration${NC}"
fi

echo ""

echo -e "${BLUE}🔧 Setting Production Environment Variables${NC}"
echo "============================================="

# Core application settings
echo "Setting core application variables..."
railway variables set NODE_ENV=production
railway variables set PORT=3000

# Frontend API configuration
echo "Setting frontend API configuration..."
RAILWAY_DOMAIN=$(railway domain | grep -E 'https?://' | head -1 || echo "")
if [ ! -z "$RAILWAY_DOMAIN" ]; then
    railway variables set VITE_API_BASE_URL="$RAILWAY_DOMAIN"
    echo "✅ API base URL set to: $RAILWAY_DOMAIN"
else
    echo "⚠️  Could not detect Railway domain. Please set VITE_API_BASE_URL manually"
    echo "   Example: railway variables set VITE_API_BASE_URL=https://your-app.railway.app"
fi

# Database configuration
echo ""
echo -e "${BLUE}💾 Database Configuration${NC}"
echo "Make sure you've added PostgreSQL plugin in Railway dashboard"
echo "The DATABASE_URL will be automatically set by Railway when you add PostgreSQL"

# Check if DATABASE_URL exists
DATABASE_URL_EXISTS=$(railway variables | grep -c "DATABASE_URL" || echo "0")
if [ "$DATABASE_URL_EXISTS" -gt 0 ]; then
    echo "✅ DATABASE_URL is already configured"
else
    echo "⚠️  DATABASE_URL not found. Please:"
    echo "   1. Add PostgreSQL plugin in Railway dashboard"
    echo "   2. Wait for the plugin to initialize"
    echo "   3. DATABASE_URL will be auto-set by Railway"
fi

# Optional: SMS Configuration (if available in .env.local)
echo ""
echo -e "${BLUE}📱 Optional: SMS Configuration${NC}"
if [ ! -z "$TENCENT_SECRET_ID" ] && [ ! -z "$TENCENT_SECRET_KEY" ]; then
    echo "Setting Tencent SMS configuration..."
    railway variables set TENCENT_SECRET_ID="$TENCENT_SECRET_ID"
    railway variables set TENCENT_SECRET_KEY="$TENCENT_SECRET_KEY"
    
    if [ ! -z "$TENCENT_SMS_APP_ID" ]; then
        railway variables set TENCENT_SMS_APP_ID="$TENCENT_SMS_APP_ID"
    fi
    
    if [ ! -z "$TENCENT_SMS_SIGN_NAME" ]; then
        railway variables set TENCENT_SMS_SIGN_NAME="$TENCENT_SMS_SIGN_NAME"
    fi
    
    echo "✅ SMS configuration set"
else
    echo "⚠️  SMS configuration not found in .env.local"
    echo "   This is optional - the app will work without SMS"
    echo "   To add SMS later, set: TENCENT_SECRET_ID, TENCENT_SECRET_KEY, etc."
fi

echo ""
echo -e "${GREEN}🎉 Environment configuration completed!${NC}"
echo ""

echo -e "${BLUE}📋 Configuration Summary:${NC}"
echo "=========================="
echo "Core Settings:"
echo "  ✅ NODE_ENV=production"
echo "  ✅ PORT=3000"
if [ ! -z "$RAILWAY_DOMAIN" ]; then
    echo "  ✅ VITE_API_BASE_URL=$RAILWAY_DOMAIN"
fi

echo ""
echo "Database:"
if [ "$DATABASE_URL_EXISTS" -gt 0 ]; then
    echo "  ✅ DATABASE_URL (configured)"
else
    echo "  ⚠️  DATABASE_URL (needs PostgreSQL plugin)"
fi

echo ""
echo "SMS (Optional):"
if [ ! -z "$TENCENT_SECRET_ID" ]; then
    echo "  ✅ Tencent SMS (configured)"
else
    echo "  ⚠️  Tencent SMS (not configured)"
fi

echo ""
echo -e "${YELLOW}🚀 Next Steps:${NC}"
echo "1. Ensure PostgreSQL plugin is added in Railway dashboard"
echo "2. Initialize database: railway run node server/database/init-pg.js"
echo "3. Deploy: railway up"
echo "4. Test endpoints at your Railway domain"
echo ""
echo -e "${BLUE}🔗 Railway Dashboard: https://railway.app/dashboard${NC}"