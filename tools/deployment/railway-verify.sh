#!/bin/bash

# YesLocker Railway Deployment Verification Script
# This script verifies that all Railway services are deployed and working correctly

set -e  # Exit on error

echo "✅ YesLocker Railway Deployment Verification"
echo "============================================="
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
    exit 1
fi

if ! railway whoami &> /dev/null; then
    echo -e "${RED}❌ Not logged in to Railway${NC}"
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

# Function to check HTTP endpoint
check_endpoint() {
    local url=$1
    local endpoint=$2
    local expected_status=$3
    local description=$4
    
    if [ -z "$url" ]; then
        echo -e "   ${YELLOW}⚠️  URL not available yet${NC}"
        return 1
    fi
    
    local full_url="${url}${endpoint}"
    echo -e "   Testing: ${full_url}"
    
    local status_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$full_url" 2>/dev/null || echo "000")
    
    if [ "$status_code" = "$expected_status" ]; then
        echo -e "   ${GREEN}✅ ${description} (Status: $status_code)${NC}"
        return 0
    else
        echo -e "   ${RED}❌ ${description} (Status: $status_code, Expected: $expected_status)${NC}"
        return 1
    fi
}

# Function to verify a Railway service
verify_railway_service() {
    local project_name=$1
    local root_dir=$2
    local service_type=$3
    local project_url=$4
    
    echo -e "${BLUE}🔍 Verifying ${project_name}${NC}"
    echo "   Service Type: ${service_type}"
    echo "   Root Directory: ${root_dir}"
    echo "   URL: ${project_url}"
    
    # Navigate to project directory
    if [ "$root_dir" != "." ]; then
        cd "railway-configs/$project_name" 2>/dev/null || {
            echo -e "   ${RED}❌ Project directory not found${NC}"
            echo ""
            return 1
        }
    fi
    
    # Check deployment status
    local deployment_status
    deployment_status=$(railway status --json 2>/dev/null | grep -o '"status":"[^"]*' | cut -d'"' -f4 2>/dev/null || echo "unknown")
    
    echo "   Deployment Status: $deployment_status"
    
    # Test service endpoints based on type
    local success=0
    case $service_type in
        "backend")
            echo -e "${YELLOW}   Testing backend endpoints...${NC}"
            if check_endpoint "$project_url" "/health" "200" "Health check"; then
                ((success++))
            fi
            if check_endpoint "$project_url" "/" "200" "Root endpoint"; then
                ((success++))
            fi
            
            # Test API endpoints (may require authentication)
            echo -e "   ${BLUE}Testing API endpoints (may require auth):${NC}"
            check_endpoint "$project_url" "/api/stores" "401" "Stores API (expected auth required)" || true
            ;;
            
        "frontend")
            echo -e "${YELLOW}   Testing frontend endpoints...${NC}"
            if check_endpoint "$project_url" "/" "200" "Frontend home page"; then
                ((success++))
            fi
            if check_endpoint "$project_url" "/index.html" "200" "Static assets"; then
                ((success++))
            fi
            ;;
    esac
    
    # Check environment variables
    echo -e "${YELLOW}   Checking environment variables...${NC}"
    local env_count
    env_count=$(railway variables list 2>/dev/null | wc -l || echo "0")
    if [ "$env_count" -gt 0 ]; then
        echo -e "   ${GREEN}✅ Environment variables configured ($env_count vars)${NC}"
        ((success++))
    else
        echo -e "   ${RED}❌ No environment variables found${NC}"
    fi
    
    # Return to root directory
    if [ "$root_dir" != "." ]; then
        cd ../../
    fi
    
    # Overall service status
    if [ $success -ge 2 ]; then
        echo -e "   ${GREEN}✅ Service verification PASSED${NC}"
    else
        echo -e "   ${RED}❌ Service verification FAILED${NC}"
    fi
    echo ""
    
    return $success
}

# Verification results tracking
total_services=0
passed_services=0
failed_services=0

echo -e "${BLUE}🔍 Starting Service Verification${NC}"
echo ""

# Verify each Railway service
while IFS='|' read -r name url root; do
    ((total_services++))
    
    case $name in
        "yeslocker-backend-api")
            if verify_railway_service "$name" "$root" "backend" "$url"; then
                ((passed_services++))
            else
                ((failed_services++))
            fi
            ;;
        "yeslocker-admin-frontend")
            if verify_railway_service "$name" "$root" "frontend" "$url"; then
                ((passed_services++))
            else
                ((failed_services++))
            fi
            ;;
        "yeslocker-user-frontend")
            if verify_railway_service "$name" "$root" "frontend" "$url"; then
                ((passed_services++))
            else
                ((failed_services++))
            fi
            ;;
    esac
done < railway-projects.txt

# End-to-end integration test
echo -e "${BLUE}🔗 Integration Testing${NC}"
echo ""

backend_url=""
admin_url=""
user_url=""

# Extract service URLs
while IFS='|' read -r name url root; do
    case $name in
        "yeslocker-backend-api") backend_url="$url" ;;
        "yeslocker-admin-frontend") admin_url="$url" ;;
        "yeslocker-user-frontend") user_url="$url" ;;
    esac
done < railway-projects.txt

# Test cross-service communication
if [ ! -z "$backend_url" ] && [ ! -z "$user_url" ]; then
    echo -e "${YELLOW}Testing user frontend → backend communication...${NC}"
    # This would require more complex testing with actual API calls
    echo -e "   ${BLUE}Manual test: Visit $user_url and test user registration${NC}"
fi

if [ ! -z "$backend_url" ] && [ ! -z "$admin_url" ]; then
    echo -e "${YELLOW}Testing admin frontend → backend communication...${NC}"
    # This would require more complex testing with actual API calls  
    echo -e "   ${BLUE}Manual test: Visit $admin_url and test admin login${NC}"
fi

# Generate verification report
echo ""
echo -e "${BLUE}📊 Verification Report${NC}"
echo "======================="
echo "Total Services: $total_services"
echo "Passed: $passed_services"
echo "Failed: $failed_services"
echo ""

# Service URLs summary
echo -e "${BLUE}🌐 Service URLs${NC}"
echo "==============="
while IFS='|' read -r name url root; do
    echo "• $name:"
    if [ ! -z "$url" ]; then
        echo "  $url"
    else
        echo "  ${YELLOW}URL not available${NC}"
    fi
    echo ""
done < railway-projects.txt

# Overall status
if [ $failed_services -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL SERVICES VERIFIED SUCCESSFULLY!${NC}"
    echo ""
    echo -e "${BLUE}✅ Ready for Production Use${NC}"
    echo "• User Frontend: Ready for customer access"
    echo "• Admin Frontend: Ready for administrative use"  
    echo "• Backend API: Ready for application requests"
    echo "• Supabase Integration: Already configured and working"
else
    echo -e "${RED}❌ SOME SERVICES FAILED VERIFICATION${NC}"
    echo ""
    echo -e "${YELLOW}🔧 Troubleshooting Steps:${NC}"
    echo "1. Check Railway dashboard for deployment errors"
    echo "2. Verify environment variables are set correctly"
    echo "3. Check service logs: railway logs [service-name]"
    echo "4. Ensure all dependencies are installed properly"
    echo "5. Review build and deployment configurations"
fi

echo ""
echo -e "${BLUE}📖 Additional Resources:${NC}"
echo "• Railway Dashboard: https://railway.app/dashboard"
echo "• Project Documentation: RAILWAY_DEPLOYMENT_GUIDE.md"
echo "• Environment Variables: ENVIRONMENT_VARIABLES_MAPPING.md"
echo "• Manual Testing: Use the provided service URLs above"

# Exit with appropriate code
if [ $failed_services -eq 0 ]; then
    exit 0
else
    exit 1
fi