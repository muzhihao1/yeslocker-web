#!/bin/bash

# YesLocker Railway Project Setup Script v2
# Updated for Vue 3 + Express + PostgreSQL architecture

set -e  # Exit on error

echo "🚀 YesLocker Railway Project Setup v2"
echo "====================================="
echo "Architecture: Vue 3 + Express + PostgreSQL"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo -e "${RED}❌ Railway CLI is not installed${NC}"
    echo "Please install it first:"
    echo "npm install -g @railway/cli"
    echo "or"
    echo "brew install railway"
    exit 1
fi

# Check if user is logged in
if ! railway whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged in to Railway${NC}"
    echo "Please log in first:"
    echo "railway login"
    exit 1
fi

echo -e "${GREEN}✅ Railway CLI is ready${NC}"
echo ""

echo -e "${BLUE}🏗️  Setting up Railway Project${NC}"
echo ""

# Step 1: Initialize Railway project from root
echo -e "${YELLOW}[1/4] Initializing Railway project...${NC}"
railway init yeslocker-production || echo "Project may already exist"

# Step 2: Add PostgreSQL plugin
echo -e "${YELLOW}[2/4] Adding PostgreSQL database...${NC}"
echo "Please add PostgreSQL plugin manually in Railway dashboard:"
echo "1. Go to https://railway.app/dashboard"
echo "2. Select your yeslocker-production project"
echo "3. Click 'New Service' -> 'Database' -> 'PostgreSQL'"
echo "4. Wait for the database to be ready"
echo ""
read -p "Press Enter when PostgreSQL plugin is ready..."

# Step 3: Set up environment variables
echo -e "${YELLOW}[3/4] Configuring environment variables...${NC}"

# Production environment variables
railway variables set NODE_ENV=production
railway variables set PORT=3000

# API configuration
railway variables set VITE_API_BASE_URL=\${RAILWAY_PUBLIC_DOMAIN}

echo -e "${GREEN}✅ Basic environment variables set${NC}"

# Step 4: Create railway.toml for monorepo structure
echo -e "${YELLOW}[4/4] Creating Railway configuration...${NC}"

cat > railway.toml << 'EOF'
[build]
builder = "nixpacks"
buildCommand = "npm install && cd server && npm install && cd .. && npm run build"

[deploy]
startCommand = "cd server && npm run start:pg"
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 10

[environments.production.variables]
NODE_ENV = "production"

[[services]]
name = "backend"
source = "server"
[[services.variables]]
PORT = 3001

[[services]]
name = "frontend"
source = "."
[[services.variables]]
PORT = 3000
EOF

echo -e "${GREEN}✅ Railway configuration created${NC}"

echo ""
echo -e "${GREEN}🎉 Railway project setup completed!${NC}"
echo ""

echo -e "${BLUE}📋 Next Steps:${NC}"
echo "=================================="
echo "1. Database Setup:"
echo "   • Copy DATABASE_URL from Railway dashboard"
echo "   • Run: railway variables set DATABASE_URL=<your-database-url>"
echo ""
echo "2. Initialize Database Schema:"
echo "   • railway run node server/database/init-pg.js"
echo ""
echo "3. Deploy:"
echo "   • railway up"
echo ""
echo "4. Verify deployment:"
echo "   • Check health endpoints at your Railway domain"
echo ""

echo -e "${YELLOW}⚠️  Manual Configuration Required:${NC}"
echo "1. Add PostgreSQL plugin in Railway dashboard"
echo "2. Set DATABASE_URL environment variable"
echo "3. Optionally add custom domain"
echo ""
echo -e "${BLUE}📖 Railway Dashboard: https://railway.app/dashboard${NC}"