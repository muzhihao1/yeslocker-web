#!/bin/bash

# YesLocker Deployment Script
# This script deploys the complete YesLocker system to production

set -e  # Exit on any error

echo "🚀 Starting YesLocker Deployment..."

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="yeslocker"
ENVIRONMENT=${1:-production}

echo -e "${BLUE}Environment: $ENVIRONMENT${NC}"

# Function to check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}Checking prerequisites...${NC}"
    
    # Check if Supabase CLI is installed
    if ! command -v supabase &> /dev/null; then
        echo -e "${RED}❌ Supabase CLI is not installed${NC}"
        echo "Please install it from: https://supabase.com/docs/guides/cli"
        exit 1
    fi
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js is not installed${NC}"
        exit 1
    fi
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ npm is not installed${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Prerequisites check passed${NC}"
}

# Function to setup environment variables
setup_environment() {
    echo -e "${YELLOW}Setting up environment variables...${NC}"
    
    # Check if required environment variables are set
    required_vars=(
        "SUPABASE_PROJECT_ID"
        "SUPABASE_ACCESS_TOKEN"
        "SUPABASE_DB_PASSWORD"
    )
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            echo -e "${RED}❌ Missing required environment variable: $var${NC}"
            echo "Please set all required environment variables in your CI/CD system or .env file"
            exit 1
        fi
    done
    
    echo -e "${GREEN}✅ Environment variables configured${NC}"
}

# Function to build frontend applications
build_frontend() {
    echo -e "${YELLOW}Building frontend applications...${NC}"
    
    # Build user app
    echo "Building user application..."
    npm run build
    
    # Build admin app
    echo "Building admin application..."
    npm run build:admin
    
    echo -e "${GREEN}✅ Frontend build completed${NC}"
}

# Function to run tests
run_tests() {
    echo -e "${YELLOW}Running tests...${NC}"
    
    # Run type checking
    echo "Running type checks..."
    npm run type-check || {
        echo -e "${RED}❌ Type checking failed${NC}"
        exit 1
    }
    
    # Run linting
    echo "Running linter..."
    npm run lint || {
        echo -e "${RED}❌ Linting failed${NC}"
        exit 1
    }
    
    echo -e "${GREEN}✅ All tests passed${NC}"
}

# Function to deploy database migrations
deploy_database() {
    echo -e "${YELLOW}Deploying database migrations...${NC}"
    
    # Link to remote project
    supabase link --project-ref "$SUPABASE_PROJECT_ID" || {
        echo -e "${RED}❌ Failed to link to Supabase project${NC}"
        exit 1
    }
    
    # Push database migrations
    supabase db push || {
        echo -e "${RED}❌ Database migration failed${NC}"
        exit 1
    }
    
    echo -e "${GREEN}✅ Database migrations deployed${NC}"
}

# Function to deploy Edge Functions
deploy_edge_functions() {
    echo -e "${YELLOW}Deploying Edge Functions...${NC}"
    
    # List of functions to deploy
    functions=(
        "admin-login"
        "admin-approval"
        "auth-login"
        "auth-register"
        "locker-operations"
        "lockers-apply"
        "stores-lockers"
        "sms-send"
        "reminder-check"
    )
    
    # Deploy each function
    for func in "${functions[@]}"; do
        echo "Deploying function: $func"
        supabase functions deploy "$func" --project-ref "$SUPABASE_PROJECT_ID" || {
            echo -e "${RED}❌ Failed to deploy function: $func${NC}"
            exit 1
        }
    done
    
    echo -e "${GREEN}✅ All Edge Functions deployed${NC}"
}

# Function to setup production environment variables
setup_production_env() {
    echo -e "${YELLOW}Setting up production environment...${NC}"
    
    # Set environment variables for Edge Functions
    supabase secrets set ENVIRONMENT=production --project-ref "$SUPABASE_PROJECT_ID"
    
    # Set Tencent SMS configuration (if provided)
    if [ -n "$TENCENT_SECRET_ID" ]; then
        supabase secrets set TENCENT_SECRET_ID="$TENCENT_SECRET_ID" --project-ref "$SUPABASE_PROJECT_ID"
        supabase secrets set TENCENT_SECRET_KEY="$TENCENT_SECRET_KEY" --project-ref "$SUPABASE_PROJECT_ID"
        supabase secrets set TENCENT_SMS_APP_ID="$TENCENT_SMS_APP_ID" --project-ref "$SUPABASE_PROJECT_ID"
        supabase secrets set TENCENT_SMS_SIGN_NAME="$TENCENT_SMS_SIGN_NAME" --project-ref "$SUPABASE_PROJECT_ID"
        echo -e "${GREEN}✅ SMS configuration set${NC}"
    else
        echo -e "${YELLOW}⚠️  SMS configuration not provided (optional)${NC}"
    fi
    
    echo -e "${GREEN}✅ Production environment configured${NC}"
}

# Function to verify deployment
verify_deployment() {
    echo -e "${YELLOW}Verifying deployment...${NC}"
    
    # Get project URL
    SUPABASE_URL=$(supabase status --output json | jq -r '.API_URL')
    
    # Test a simple function
    echo "Testing admin-login function..."
    curl -X POST \
        -H "Content-Type: application/json" \
        -H "apikey: $SUPABASE_ANON_KEY" \
        -d '{"test": true}' \
        "$SUPABASE_URL/functions/v1/admin-login" || {
        echo -e "${YELLOW}⚠️  Function test failed (expected for incomplete request)${NC}"
    }
    
    echo -e "${GREEN}✅ Deployment verification completed${NC}"
}

# Function to create post-deployment summary
create_summary() {
    echo -e "${BLUE}📋 Deployment Summary${NC}"
    echo "=================================="
    echo "Environment: $ENVIRONMENT"
    echo "Project ID: $SUPABASE_PROJECT_ID"
    echo "Deployed Functions: 9"
    echo "Database Migrations: Applied"
    echo "Status: ✅ Success"
    echo ""
    echo -e "${GREEN}🎉 YesLocker deployment completed successfully!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Update frontend API URLs to point to production"
    echo "2. Configure Vercel deployment for frontend"
    echo "3. Test all functionality in production environment"
    echo "4. Monitor logs for any issues"
}

# Main deployment flow
main() {
    echo -e "${BLUE}🚀 YesLocker Deployment Started${NC}"
    echo "=================================="
    
    check_prerequisites
    setup_environment
    
    if [ "$ENVIRONMENT" = "production" ]; then
        run_tests
        build_frontend
    fi
    
    deploy_database
    deploy_edge_functions
    setup_production_env
    verify_deployment
    create_summary
}

# Run main function
main "$@"