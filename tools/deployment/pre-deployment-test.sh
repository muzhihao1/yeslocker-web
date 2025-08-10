#!/bin/bash

# YesLocker Pre-deployment Validation Test
# Tests all deployment components without requiring Railway login

set -e  # Exit on error

echo "🧪 YesLocker Pre-deployment Validation Test"
echo "==========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results tracking
PASSED=0
FAILED=0

# Function to run a test
run_test() {
    local test_name="$1"
    local command="$2"
    
    echo -n "   Testing ${test_name}... "
    
    if eval "$command" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ PASS${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}"
        ((FAILED++))
        return 1
    fi
}

# Function to run a test with output
run_test_with_output() {
    local test_name="$1"
    local command="$2"
    local expected_output="$3"
    
    echo -n "   Testing ${test_name}... "
    
    local output=$(eval "$command" 2>&1)
    if [[ "$output" == *"$expected_output"* ]]; then
        echo -e "${GREEN}✅ PASS${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}"
        echo "   Expected: $expected_output"
        echo "   Got: $output"
        ((FAILED++))
        return 1
    fi
}

echo -e "${BLUE}🔍 Environment Prerequisites${NC}"
echo "=========================="

run_test "Node.js version >= 18" "node -v | grep -E 'v1[89]|v[2-9][0-9]'"
run_test "npm version >= 8" "npm -v | grep -E '[89]|[1-9][0-9]'"
run_test "Railway CLI installed" "command -v railway"

echo ""
echo -e "${BLUE}📦 Project Structure${NC}"
echo "==================="

run_test "package.json exists" "[ -f package.json ]"
run_test "server/package.json exists" "[ -f server/package.json ]"
run_test "vite.config.ts exists" "[ -f vite.config.ts ]"
run_test "railway.json exists" "[ -f railway.json ]"

echo ""
echo -e "${BLUE}🛠️ Deployment Scripts${NC}"
echo "===================="

run_test "railway-setup-v2.sh executable" "[ -x tools/deployment/railway-setup-v2.sh ]"
run_test "railway-env-config-v2.sh executable" "[ -x tools/deployment/railway-env-config-v2.sh ]"
run_test "railway-deploy-verify.sh executable" "[ -x tools/deployment/railway-deploy-verify.sh ]"
run_test "init-pg.js exists" "[ -f server/database/init-pg.js ]"

echo ""
echo -e "${BLUE}🗄️ Database Migration Files${NC}"
echo "========================="

run_test "PostgreSQL schema exists" "[ -f server/database/schema-postgresql.sql ]"
run_test "PostgreSQL seed data exists" "[ -f server/database/seed-postgresql.sql ]"
run_test "Schema file not empty" "[ -s server/database/schema-postgresql.sql ]"
run_test "Seed file not empty" "[ -s server/database/seed-postgresql.sql ]"

echo ""
echo -e "${BLUE}🏗️ Build Process${NC}"
echo "=============="

echo -n "   Testing frontend build... "
if npm run build >/dev/null 2>&1; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASSED++))
    
    # Check if dist directory was created
    echo -n "   Testing build output... "
    if [ -d "dist" ] && [ -f "dist/index.html" ]; then
        echo -e "${GREEN}✅ PASS${NC}"
        ((PASSED++))
    else
        echo -e "${RED}❌ FAIL (no dist output)${NC}"
        ((FAILED++))
    fi
else
    echo -e "${RED}❌ FAIL${NC}"
    ((FAILED++))
fi

echo ""
echo -e "${BLUE}📄 Configuration Files${NC}"
echo "==================="

run_test ".env.example exists" "[ -f .env.example ]"
run_test "DEPLOYMENT_CHECKLIST.md exists" "[ -f DEPLOYMENT_CHECKLIST.md ]"
run_test "DEPLOYMENT_EXECUTION_GUIDE.md exists" "[ -f DEPLOYMENT_EXECUTION_GUIDE.md ]"

echo ""
echo -e "${BLUE}🔧 Script Content Validation${NC}"
echo "=========================="

run_test "railway.json has correct schema" "grep -q '\"\$schema\": \"https://railway.app/railway.schema.json\"' railway.json"
run_test "railway.json has build command" "grep -q 'buildCommand.*npm' railway.json"
run_test "Schema creates users table" "grep -q 'CREATE TABLE users' server/database/schema-postgresql.sql"
run_test "Seed has admin data" "grep -q 'INSERT INTO admins' server/database/seed-postgresql.sql"

echo ""
echo -e "${BLUE}📊 Test Results Summary${NC}"
echo "======================="
echo -e "Total Tests: $((PASSED + FAILED))"
echo -e "${GREEN}Passed: ${PASSED}${NC}"
echo -e "${RED}Failed: ${FAILED}${NC}"

echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All pre-deployment tests passed!${NC}"
    echo ""
    echo -e "${BLUE}✅ Ready for Railway deployment${NC}"
    echo ""
    echo -e "${YELLOW}📋 Next Steps:${NC}"
    echo "1. Login to Railway: railway login"
    echo "2. Run setup script: ./tools/deployment/railway-setup-v2.sh"
    echo "3. Follow DEPLOYMENT_EXECUTION_GUIDE.md"
    echo ""
    exit 0
else
    echo -e "${RED}❌ Pre-deployment tests failed.${NC}"
    echo ""
    echo -e "${YELLOW}🔧 Please fix the following issues:${NC}"
    if [ $FAILED -gt 0 ]; then
        echo "- Check failed tests above"
        echo "- Ensure all required files exist"
        echo "- Verify script permissions"
        echo "- Run 'npm install' if needed"
    fi
    echo ""
    exit 1
fi