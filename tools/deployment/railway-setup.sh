#!/bin/bash

# YesLocker Railway Project Setup Script
# This script automates the creation of 3 Railway services using Railway CLI

set -e  # Exit on error

echo "🚀 YesLocker Railway Project Setup"
echo "===================================="
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

# Function to create a Railway project
create_railway_project() {
    local project_name=$1
    local root_dir=$2
    local description=$3
    local start_command=$4
    local build_command=$5
    
    echo -e "${BLUE}📦 Creating project: ${project_name}${NC}"
    echo "   Root directory: ${root_dir}"
    echo "   Description: ${description}"
    echo ""
    
    # Create new directory for this service if it doesn't exist
    if [ "$root_dir" != "." ]; then
        mkdir -p "railway-configs/$project_name"
        cd "railway-configs/$project_name"
    fi
    
    # Initialize Railway project
    echo "y" | railway init --name "$project_name" || true
    
    # Set build and start commands if provided
    if [ ! -z "$build_command" ]; then
        railway variables set BUILD_COMMAND="$build_command"
    fi
    
    if [ ! -z "$start_command" ]; then
        railway variables set START_COMMAND="$start_command"
    fi
    
    # Set root directory
    if [ "$root_dir" != "." ]; then
        railway variables set ROOT_DIRECTORY="$root_dir"
    fi
    
    # Get the project URL
    PROJECT_URL=$(railway status --json 2>/dev/null | grep -o '"url":"[^"]*' | cut -d'"' -f4 || echo "")
    
    echo -e "${GREEN}✅ Created: ${project_name}${NC}"
    if [ ! -z "$PROJECT_URL" ]; then
        echo -e "   URL: ${PROJECT_URL}"
    fi
    echo ""
    
    # Return to root directory
    if [ "$root_dir" != "." ]; then
        cd ../../
    fi
    
    # Store project info
    echo "${project_name}|${PROJECT_URL}|${root_dir}" >> railway-projects.txt
}

# Create the main projects directory
mkdir -p railway-configs
rm -f railway-projects.txt

echo -e "${BLUE}🏗️  Creating Railway Projects${NC}"
echo ""

# 1. Backend API Service (created first as others depend on it)
echo -e "${YELLOW}[1/3] Creating Backend API Service...${NC}"
create_railway_project \
    "yeslocker-backend-api" \
    "server" \
    "YesLocker Backend API - Node.js Express server with PostgreSQL" \
    "npm run start:pg" \
    "npm install"

# 2. Admin Frontend Service  
echo -e "${YELLOW}[2/3] Creating Admin Frontend Service...${NC}"
create_railway_project \
    "yeslocker-admin-frontend" \
    "admin" \
    "YesLocker Admin Panel - Vue.js H5 admin interface" \
    "npm start" \
    "npm install && npm run build:h5"

# 3. User Frontend Service
echo -e "${YELLOW}[3/3] Creating User Frontend Service...${NC}"  
create_railway_project \
    "yeslocker-user-frontend" \
    "." \
    "YesLocker User App - Vue.js H5 user-facing application" \
    "npm start" \
    "npm install && npm run build:h5"

echo -e "${GREEN}🎉 All Railway projects created successfully!${NC}"
echo ""

# Display created projects
if [ -f railway-projects.txt ]; then
    echo -e "${BLUE}📋 Created Projects Summary:${NC}"
    echo "=================================="
    while IFS='|' read -r name url root; do
        echo "• $name"
        echo "  Root: $root"
        if [ ! -z "$url" ]; then
            echo "  URL:  $url"
        fi
        echo ""
    done < railway-projects.txt
fi

echo -e "${YELLOW}⚠️  Next Steps:${NC}"
echo "1. Run ./railway-env-config.sh to set environment variables"
echo "2. Run ./railway-deploy.sh to deploy all services"  
echo "3. Run ./railway-verify.sh to verify deployments"
echo ""
echo -e "${BLUE}📖 Manual Configuration:${NC}"
echo "If you need to configure manually:"
echo "• Railway Dashboard: https://railway.app/dashboard"
echo "• Follow the RAILWAY_DEPLOYMENT_GUIDE.md for detailed instructions"