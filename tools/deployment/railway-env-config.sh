#!/bin/bash

# YesLocker Railway Environment Variables Configuration Script
# This script sets up all required environment variables for Railway services

set -e  # Exit on error

echo "🔧 YesLocker Railway Environment Configuration"
echo "=============================================="
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
    echo "Please run ./railway-setup.sh first"
    exit 1
fi

if ! railway whoami &> /dev/null; then
    echo -e "${RED}❌ Not logged in to Railway${NC}"
    echo "Please run: railway login"
    exit 1
fi

# Check if projects were created
if [ ! -f railway-projects.txt ]; then
    echo -e "${RED}❌ Railway projects not found${NC}"
    echo "Please run ./railway-setup.sh first"
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
    echo -e "${GREEN}✅ Environment variables loaded${NC}"
else
    echo -e "${YELLOW}⚠️  .env.local not found, you'll need to set variables manually${NC}"
fi

echo ""

# Function to set environment variables for a Railway project
configure_railway_service() {
    local project_name=$1
    local root_dir=$2
    local service_type=$3
    
    echo -e "${BLUE}🔧 Configuring ${project_name} (${service_type})${NC}"
    echo "   Root directory: ${root_dir}"
    
    # Navigate to project directory
    if [ "$root_dir" != "." ]; then
        cd "railway-configs/$project_name"
    fi
    
    # Set common environment variables for all services
    echo "   Setting common variables..."
    railway variables set NODE_ENV=production || echo "Warning: Could not set NODE_ENV"
    railway variables set SUPABASE_URL="${SUPABASE_URL:-https://pjrcfvhvzqgbkqxkrmhf.supabase.co}" || echo "Warning: Could not set SUPABASE_URL"
    
    # Set service-specific environment variables
    case $service_type in
        "backend")
            echo "   Setting backend-specific variables..."
            railway variables set PORT=3001 || echo "Warning: Could not set PORT"
            railway variables set SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY}" || echo "Warning: Could not set SUPABASE_SERVICE_ROLE_KEY"
            
            # SMS Configuration (if available)
            if [ ! -z "$TENCENT_SECRET_ID" ]; then
                railway variables set TENCENT_SECRET_ID="${TENCENT_SECRET_ID}" || echo "Warning: Could not set TENCENT_SECRET_ID"
            fi
            if [ ! -z "$TENCENT_SECRET_KEY" ]; then
                railway variables set TENCENT_SECRET_KEY="${TENCENT_SECRET_KEY}" || echo "Warning: Could not set TENCENT_SECRET_KEY"
            fi
            if [ ! -z "$TENCENT_SMS_APP_ID" ]; then
                railway variables set TENCENT_SMS_APP_ID="${TENCENT_SMS_APP_ID}" || echo "Warning: Could not set TENCENT_SMS_APP_ID"
            fi
            if [ ! -z "$TENCENT_SMS_SIGN_NAME" ]; then
                railway variables set TENCENT_SMS_SIGN_NAME="${TENCENT_SMS_SIGN_NAME}" || echo "Warning: Could not set TENCENT_SMS_SIGN_NAME"
            fi
            
            # Get PostgreSQL database URL from Railway (if PostgreSQL plugin is added)
            echo "   Note: Add PostgreSQL plugin in Railway dashboard if needed"
            ;;
            
        "frontend")
            echo "   Setting frontend-specific variables..."
            railway variables set VUE_APP_SUPABASE_URL="${SUPABASE_URL:-https://pjrcfvhvzqgbkqxkrmhf.supabase.co}" || echo "Warning: Could not set VUE_APP_SUPABASE_URL"
            railway variables set VUE_APP_SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY}" || echo "Warning: Could not set VUE_APP_SUPABASE_ANON_KEY"
            
            # Backend API URL will be set after backend is deployed
            echo "   Note: VUE_APP_API_BASE_URL will be set after backend deployment"
            ;;
    esac
    
    # Return to root directory
    if [ "$root_dir" != "." ]; then
        cd ../../
    fi
    
    echo -e "${GREEN}✅ ${project_name} configured${NC}"
    echo ""
}

# Configure each Railway service
echo -e "${BLUE}🔧 Configuring Railway Services${NC}"
echo ""

# Read projects and configure them
backend_url=""
while IFS='|' read -r name url root; do
    case $name in
        "yeslocker-backend-api")
            configure_railway_service "$name" "$root" "backend"
            backend_url="$url"
            ;;
        "yeslocker-admin-frontend")
            configure_railway_service "$name" "$root" "frontend"
            ;;
        "yeslocker-user-frontend")
            configure_railway_service "$name" "$root" "frontend"
            ;;
    esac
done < railway-projects.txt

# Update frontend services with backend API URL if available
if [ ! -z "$backend_url" ]; then
    echo -e "${BLUE}🔗 Updating frontend services with backend API URL${NC}"
    echo "   Backend API URL: $backend_url"
    
    # Update admin frontend
    cd railway-configs/yeslocker-admin-frontend
    railway variables set VUE_APP_API_BASE_URL="$backend_url" || echo "Warning: Could not set API URL for admin"
    cd ../../
    
    # Update user frontend  
    cd railway-configs/yeslocker-user-frontend
    railway variables set VUE_APP_API_BASE_URL="$backend_url" || echo "Warning: Could not set API URL for user"
    cd ../../
    
    echo -e "${GREEN}✅ Frontend services updated with backend URL${NC}"
    echo ""
fi

# Display configuration summary
echo -e "${BLUE}📋 Configuration Summary${NC}"
echo "========================="
echo ""

while IFS='|' read -r name url root; do
    echo -e "${YELLOW}${name}${NC}"
    if [ "$root" != "." ]; then
        cd "railway-configs/$name"
    fi
    
    echo "Variables configured:"
    railway variables list 2>/dev/null | head -10 || echo "   Could not list variables"
    echo ""
    
    if [ "$root" != "." ]; then
        cd ../../
    fi
done < railway-projects.txt

echo -e "${GREEN}🎉 Environment configuration completed!${NC}"
echo ""
echo -e "${YELLOW}⚠️  Manual Steps Required:${NC}"
echo "1. Add PostgreSQL plugin to backend service (if needed)"
echo "2. Verify all environment variables in Railway dashboard"
echo "3. Run ./railway-deploy.sh to deploy services"
echo "4. Update frontend API URLs after backend deployment"
echo ""
echo -e "${BLUE}📖 Additional Configuration:${NC}"
echo "• Railway Dashboard: https://railway.app/dashboard"
echo "• Environment variables can also be set via Railway dashboard"
echo "• Check ENVIRONMENT_VARIABLES_MAPPING.md for detailed requirements"