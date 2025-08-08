#!/bin/bash

# YesLocker Railway Master Deployment Script
# This script orchestrates the complete Railway deployment process

set -e  # Exit on error

echo "🚀 YesLocker Railway Master Deployment"
echo "======================================"
echo ""
echo "This script will:"
echo "1. Create Railway projects"
echo "2. Configure environment variables"  
echo "3. Deploy all services"
echo "4. Verify deployments"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "${BLUE}🔍 Checking Prerequisites${NC}"
echo ""

# Check Railway CLI
if ! command -v railway &> /dev/null; then
    echo -e "${RED}❌ Railway CLI is not installed${NC}"
    echo "Please install it first:"
    echo ""
    echo "Option 1 - npm:"
    echo "  npm install -g @railway/cli"
    echo ""
    echo "Option 2 - Homebrew (macOS):"
    echo "  brew install railway"
    echo ""
    echo "Option 3 - Direct download:"
    echo "  Visit: https://railway.app/cli"
    echo ""
    exit 1
fi

# Check Railway login
if ! railway whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged in to Railway${NC}"
    echo "Please log in first:"
    echo "  railway login"
    echo ""
    echo "This will open your browser to authenticate with Railway."
    echo "After login, run this script again."
    exit 1
fi

echo -e "${GREEN}✅ Railway CLI ready${NC}"

# Check environment file
if [ ! -f .env.local ]; then
    echo -e "${YELLOW}⚠️  .env.local not found${NC}"
    echo "For automatic environment configuration, create .env.local with:"
    echo "  SUPABASE_URL=..."
    echo "  SUPABASE_ANON_KEY=..."
    echo "  SUPABASE_SERVICE_ROLE_KEY=..."
    echo "  TENCENT_SECRET_ID=... (optional for SMS)"
    echo "  TENCENT_SECRET_KEY=... (optional for SMS)"
    echo ""
    echo "You can also set these manually in Railway dashboard later."
    echo ""
fi

echo -e "${GREEN}✅ Prerequisites checked${NC}"
echo ""

# Confirm deployment
echo -e "${YELLOW}🚨 Deployment Confirmation${NC}"
echo "This will create 3 Railway services:"
echo "• yeslocker-user-frontend (User H5 App)"
echo "• yeslocker-admin-frontend (Admin Panel)"
echo "• yeslocker-backend-api (Node.js API Server)"
echo ""
read -p "Continue with deployment? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 0
fi

echo ""

# Step 1: Create Railway Projects
echo -e "${BLUE}[1/4] Creating Railway Projects${NC}"
echo "==============================="
echo ""

if [ -f railway-projects.txt ]; then
    echo -e "${YELLOW}⚠️  Railway projects already exist${NC}"
    echo "Found existing railway-projects.txt"
    read -p "Recreate projects? (y/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -f railway-projects.txt
        rm -rf railway-configs/
        ./railway-setup.sh
    else
        echo "Using existing projects..."
    fi
else
    ./railway-setup.sh
fi

echo ""

# Step 2: Configure Environment Variables
echo -e "${BLUE}[2/4] Configuring Environment Variables${NC}"
echo "======================================="
echo ""

./railway-env-config.sh

echo ""

# Step 3: Deploy Services
echo -e "${BLUE}[3/4] Deploying Services${NC}"
echo "========================="
echo ""

# Deploy services in order (backend first, then frontends)
services_deployed=0
total_services=3

while IFS='|' read -r name url root; do
    echo -e "${YELLOW}Deploying ${name}...${NC}"
    echo "   Root directory: $root"
    
    # Navigate to project directory
    if [ "$root" != "." ]; then
        cd "railway-configs/$name" || {
            echo -e "${RED}❌ Project directory not found: $name${NC}"
            continue
        }
    fi
    
    # Deploy the service
    echo "   Running deployment..."
    if railway up --detach; then
        echo -e "${GREEN}✅ ${name} deployment initiated${NC}"
        ((services_deployed++))
    else
        echo -e "${RED}❌ ${name} deployment failed${NC}"
    fi
    
    # Return to root directory
    if [ "$root" != "." ]; then
        cd ../../
    fi
    
    echo ""
done < railway-projects.txt

echo -e "${GREEN}✅ Services Deployment Summary${NC}"
echo "Deployed: $services_deployed/$total_services services"
echo ""

# Wait for deployments to complete
echo -e "${YELLOW}⏳ Waiting for deployments to complete...${NC}"
echo "This may take 2-5 minutes per service."
echo ""

sleep_time=30
max_wait=300  # 5 minutes max wait
waited=0

while [ $waited -lt $max_wait ]; do
    echo "Waiting... ($waited/${max_wait}s)"
    sleep $sleep_time
    waited=$((waited + sleep_time))
    
    # Check if any deployment is ready
    deployments_ready=0
    while IFS='|' read -r name url root; do
        if [ "$root" != "." ]; then
            cd "railway-configs/$name" 2>/dev/null || continue
        fi
        
        status=$(railway status --json 2>/dev/null | grep -o '"status":"[^"]*' | cut -d'"' -f4 2>/dev/null || echo "unknown")
        if [ "$status" = "SUCCESS" ] || [ "$status" = "DEPLOYED" ]; then
            ((deployments_ready++))
        fi
        
        if [ "$root" != "." ]; then
            cd ../../
        fi
    done < railway-projects.txt
    
    if [ $deployments_ready -ge 2 ]; then
        echo -e "${GREEN}✅ Deployments appear ready${NC}"
        break
    fi
done

echo ""

# Step 4: Verify Deployments
echo -e "${BLUE}[4/4] Verifying Deployments${NC}"
echo "============================"
echo ""

# Run verification script
if ./railway-verify.sh; then
    echo ""
    echo -e "${GREEN}🎉 RAILWAY DEPLOYMENT SUCCESSFUL!${NC}"
    echo ""
    echo -e "${BLUE}📋 Next Steps:${NC}"
    echo "1. Visit the service URLs to test functionality"
    echo "2. Configure custom domains (optional)"
    echo "3. Set up monitoring and alerts"
    echo "4. Update DNS records if needed"
    echo ""
    
    echo -e "${BLUE}🌐 Your YesLocker Services:${NC}"
    while IFS='|' read -r name url root; do
        echo "• $(echo $name | sed 's/yeslocker-//'): $url"
    done < railway-projects.txt
    
else
    echo ""
    echo -e "${RED}❌ DEPLOYMENT VERIFICATION FAILED${NC}"
    echo ""
    echo -e "${BLUE}🔧 Troubleshooting:${NC}"
    echo "1. Check Railway dashboard for errors"
    echo "2. Review service logs: railway logs [service]"
    echo "3. Verify environment variables"
    echo "4. Check build configurations"
    echo ""
    echo "Manual verification may be needed."
fi

echo ""
echo -e "${BLUE}📖 Documentation:${NC}"
echo "• Deployment Guide: RAILWAY_DEPLOYMENT_GUIDE.md"
echo "• Environment Variables: ENVIRONMENT_VARIABLES_MAPPING.md"
echo "• Railway Dashboard: https://railway.app/dashboard"
echo ""
echo -e "${GREEN}✨ YesLocker is now deployed on Railway! ✨${NC}"