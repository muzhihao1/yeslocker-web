#!/bin/bash

# YesLocker Railway Deployment Verification Script
# Tests all critical endpoints after deployment

set -e  # Exit on error

echo "🔍 YesLocker Railway Deployment Verification"
echo "==========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get Railway domain
RAILWAY_DOMAIN=$(railway domain | grep -E 'https?://' | head -1 || echo "")

if [ -z "$RAILWAY_DOMAIN" ]; then
    echo -e "${RED}❌ Could not detect Railway domain${NC}"
    echo "Please check your Railway deployment first"
    exit 1
fi

echo -e "${BLUE}🌐 Testing domain: ${RAILWAY_DOMAIN}${NC}"
echo ""

# Function to test endpoint
test_endpoint() {
    local url=$1
    local expected_status=$2
    local description=$3
    local method=${4:-GET}
    local data=${5:-}
    
    echo -n "   Testing ${description}... "
    
    if [ "$method" = "POST" ] && [ ! -z "$data" ]; then
        response=$(curl -s -w "%{http_code}" -X POST \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$url" -o /dev/null)
    else
        response=$(curl -s -w "%{http_code}" "$url" -o /dev/null)
    fi
    
    if [ "$response" = "$expected_status" ]; then
        echo -e "${GREEN}✅ OK (${response})${NC}"
        return 0
    else
        echo -e "${RED}❌ Failed (${response}, expected ${expected_status})${NC}"
        return 1
    fi
}

# Function to test JSON endpoint with response validation
test_json_endpoint() {
    local url=$1
    local description=$2
    local method=${3:-GET}
    local data=${4:-}
    
    echo -n "   Testing ${description}... "
    
    if [ "$method" = "POST" ] && [ ! -z "$data" ]; then
        response=$(curl -s -X POST \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$url")
    else
        response=$(curl -s "$url")
    fi
    
    # Check if response is valid JSON
    if echo "$response" | jq . >/dev/null 2>&1; then
        echo -e "${GREEN}✅ OK (Valid JSON)${NC}"
        return 0
    else
        echo -e "${RED}❌ Failed (Invalid JSON)${NC}"
        echo "   Response: $response"
        return 1
    fi
}

# Track test results
PASSED=0
FAILED=0

echo -e "${BLUE}🔍 Frontend Tests${NC}"
echo "=================="

# Test 1: Frontend root
if test_endpoint "$RAILWAY_DOMAIN" 200 "Frontend root"; then
    ((PASSED++))
else
    ((FAILED++))
fi

# Test 2: Frontend static assets
if test_endpoint "$RAILWAY_DOMAIN/logo.svg" 200 "Static assets (logo)"; then
    ((PASSED++))
else
    ((FAILED++))
fi

echo ""
echo -e "${BLUE}🔍 Backend API Tests${NC}"
echo "==================="

# Test 3: Health check
if test_json_endpoint "$RAILWAY_DOMAIN/health" "Health check"; then
    ((PASSED++))
else
    ((FAILED++))
fi

# Test 4: Stores endpoint
if test_json_endpoint "$RAILWAY_DOMAIN/stores-lockers" "Stores and lockers API"; then
    ((PASSED++))
else
    ((FAILED++))
fi

# Test 5: Auth register endpoint (should return error for missing data)
if test_endpoint "$RAILWAY_DOMAIN/auth-register" 400 "Auth register validation" "POST" '{}'; then
    ((PASSED++))
else
    ((FAILED++))
fi

# Test 6: Auth login endpoint (should return error for missing data)
if test_endpoint "$RAILWAY_DOMAIN/auth-login" 400 "Auth login validation" "POST" '{}'; then
    ((FAILED++))
else
    ((FAILED++))
fi

# Test 7: Admin login endpoint (should return error for missing data)
if test_endpoint "$RAILWAY_DOMAIN/admin-login" 400 "Admin login validation" "POST" '{}'; then
    ((PASSED++))
else
    ((FAILED++))
fi

echo ""
echo -e "${BLUE}🔍 Database Connectivity Test${NC}"
echo "============================="

# Test database connectivity by trying to get stores
echo -n "   Testing database connectivity... "
stores_response=$(curl -s "$RAILWAY_DOMAIN/stores-lockers")

if echo "$stores_response" | jq -e '.success == true' >/dev/null 2>&1; then
    echo -e "${GREEN}✅ OK (Database connected)${NC}"
    ((PASSED++))
    
    # Check if we have test data
    stores_count=$(echo "$stores_response" | jq '.data | length' 2>/dev/null || echo "0")
    if [ "$stores_count" -gt 0 ]; then
        echo "   📊 Found $stores_count stores in database"
    else
        echo -e "${YELLOW}   ⚠️  No stores found - database may need seeding${NC}"
    fi
else
    echo -e "${RED}❌ Failed (Database connection issue)${NC}"
    ((FAILED++))
fi

echo ""
echo -e "${BLUE}📊 Test Results Summary${NC}"
echo "======================="
echo -e "Total Tests: $((PASSED + FAILED))"
echo -e "${GREEN}Passed: ${PASSED}${NC}"
echo -e "${RED}Failed: ${FAILED}${NC}"

echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! Deployment is successful.${NC}"
    echo ""
    echo -e "${BLUE}🚀 Your YesLocker application is ready at:${NC}"
    echo -e "${BLUE}   ${RAILWAY_DOMAIN}${NC}"
    echo ""
    echo -e "${BLUE}📋 Available Endpoints:${NC}"
    echo "   Frontend: $RAILWAY_DOMAIN"
    echo "   API Health: $RAILWAY_DOMAIN/health"
    echo "   Stores: $RAILWAY_DOMAIN/stores-lockers"
    echo "   Admin Login: $RAILWAY_DOMAIN/admin-login"
    echo ""
    
    # Check if database needs initialization
    if [ "$stores_count" = "0" ]; then
        echo -e "${YELLOW}⚠️  Database appears empty. To initialize:${NC}"
        echo "   railway run node server/database/init-pg.js"
        echo ""
    fi
    
    exit 0
else
    echo -e "${RED}❌ Deployment verification failed.${NC}"
    echo ""
    echo -e "${YELLOW}🔧 Troubleshooting Steps:${NC}"
    echo "1. Check Railway deployment logs: railway logs"
    echo "2. Verify environment variables: railway variables"
    echo "3. Ensure PostgreSQL plugin is added and connected"
    echo "4. Check if database is initialized"
    echo ""
    echo -e "${BLUE}🔗 Railway Dashboard: https://railway.app/dashboard${NC}"
    
    exit 1
fi