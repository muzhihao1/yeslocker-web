#!/bin/bash

# YesLocker Performance Testing Suite
# Tests page load times, API response times, and resource optimization

set -e  # Exit on error

echo "⚡ YesLocker Performance Testing Suite"
echo "====================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Performance thresholds (in milliseconds)
MAX_PAGE_LOAD_TIME=3000
MAX_API_RESPONSE_TIME=2000
MAX_FIRST_CONTENTFUL_PAINT=1500
MAX_LARGEST_CONTENTFUL_PAINT=2500

# Test results tracking
PASSED=0
FAILED=0
WARNINGS=0

# Get the application URL
APP_URL=""
if [ ! -z "$1" ]; then
    APP_URL="$1"
elif command -v railway &> /dev/null && railway whoami &> /dev/null; then
    APP_URL=$(railway domain | grep -E 'https?://' | head -1 || echo "")
else
    APP_URL="http://localhost:3000"
fi

if [ -z "$APP_URL" ]; then
    echo -e "${RED}❌ Could not determine application URL${NC}"
    echo "Usage: $0 [URL] or set up Railway CLI"
    exit 1
fi

echo -e "${BLUE}🌐 Testing URL: ${APP_URL}${NC}"
echo ""

# Function to measure API response time
measure_api_response() {
    local endpoint="$1"
    local description="$2"
    local max_time="$3"
    
    echo -n "   Testing ${description}... "
    
    local start_time=$(date +%s%3N)
    local response_code=$(curl -s -w "%{http_code}" -o /dev/null "$APP_URL$endpoint" --max-time 10 || echo "000")
    local end_time=$(date +%s%3N)
    local response_time=$((end_time - start_time))
    
    if [ "$response_code" -ge 200 ] && [ "$response_code" -lt 300 ]; then
        if [ "$response_time" -le "$max_time" ]; then
            echo -e "${GREEN}✅ ${response_time}ms${NC}"
            ((PASSED++))
        elif [ "$response_time" -le $(($max_time * 150 / 100)) ]; then
            echo -e "${YELLOW}⚠️ ${response_time}ms (slow but acceptable)${NC}"
            ((WARNINGS++))
        else
            echo -e "${RED}❌ ${response_time}ms (too slow)${NC}"
            ((FAILED++))
        fi
    else
        echo -e "${RED}❌ HTTP ${response_code}${NC}"
        ((FAILED++))
    fi
}

# Function to measure page load with lighthouse (if available)
measure_page_performance() {
    local page_path="$1"
    local description="$2"
    
    echo -n "   Testing ${description} performance... "
    
    if command -v lighthouse &> /dev/null; then
        # Use Lighthouse for detailed metrics
        local lighthouse_output=$(lighthouse "$APP_URL$page_path" --only-categories=performance --quiet --chrome-flags="--headless" --output json 2>/dev/null)
        
        if [ $? -eq 0 ]; then
            local fcp=$(echo "$lighthouse_output" | jq -r '.audits["first-contentful-paint"].numericValue // 0' 2>/dev/null || echo "0")
            local lcp=$(echo "$lighthouse_output" | jq -r '.audits["largest-contentful-paint"].numericValue // 0' 2>/dev/null || echo "0")
            local performance_score=$(echo "$lighthouse_output" | jq -r '.categories.performance.score // 0' 2>/dev/null || echo "0")
            
            # Convert to milliseconds and integers
            fcp=$(echo "$fcp" | cut -d. -f1)
            lcp=$(echo "$lcp" | cut -d. -f1)
            performance_score=$(echo "$performance_score * 100" | bc -l | cut -d. -f1 2>/dev/null || echo "0")
            
            if [ "$performance_score" -ge 90 ]; then
                echo -e "${GREEN}✅ Score: ${performance_score}/100, FCP: ${fcp}ms, LCP: ${lcp}ms${NC}"
                ((PASSED++))
            elif [ "$performance_score" -ge 70 ]; then
                echo -e "${YELLOW}⚠️ Score: ${performance_score}/100, FCP: ${fcp}ms, LCP: ${lcp}ms${NC}"
                ((WARNINGS++))
            else
                echo -e "${RED}❌ Score: ${performance_score}/100, FCP: ${fcp}ms, LCP: ${lcp}ms${NC}"
                ((FAILED++))
            fi
        else
            echo -e "${YELLOW}⚠️ Lighthouse failed, using basic timing${NC}"
            measure_basic_load_time "$page_path"
        fi
    else
        measure_basic_load_time "$page_path"
    fi
}

# Function to measure basic load time with curl
measure_basic_load_time() {
    local page_path="$1"
    
    local start_time=$(date +%s%3N)
    local response_code=$(curl -s -w "%{http_code}" -o /dev/null "$APP_URL$page_path" --max-time 10 || echo "000")
    local end_time=$(date +%s%3N)
    local load_time=$((end_time - start_time))
    
    if [ "$response_code" -ge 200 ] && [ "$response_code" -lt 300 ]; then
        if [ "$load_time" -le "$MAX_PAGE_LOAD_TIME" ]; then
            echo -e "${GREEN}✅ ${load_time}ms${NC}"
            ((PASSED++))
        elif [ "$load_time" -le $(($MAX_PAGE_LOAD_TIME * 150 / 100)) ]; then
            echo -e "${YELLOW}⚠️ ${load_time}ms (acceptable)${NC}"
            ((WARNINGS++))
        else
            echo -e "${RED}❌ ${load_time}ms (too slow)${NC}"
            ((FAILED++))
        fi
    else
        echo -e "${RED}❌ HTTP ${response_code}${NC}"
        ((FAILED++))
    fi
}

echo -e "${BLUE}📊 API Performance Tests${NC}"
echo "======================="

measure_api_response "/health" "Health Check API" $MAX_API_RESPONSE_TIME
measure_api_response "/stores-lockers" "Stores API" $MAX_API_RESPONSE_TIME

echo ""
echo -e "${BLUE}🌐 Page Load Performance Tests${NC}"
echo "=============================="

measure_page_performance "/" "Home Page"
measure_page_performance "/auth/login" "Login Page"
measure_page_performance "/auth/register" "Register Page"

echo ""
echo -e "${BLUE}📦 Resource Optimization Tests${NC}"
echo "=============================="

# Test static assets
echo -n "   Testing logo.svg optimization... "
logo_response=$(curl -s -I "$APP_URL/logo.svg" | grep -i "content-length" | awk '{print $2}' | tr -d '\r')
if [ ! -z "$logo_response" ] && [ "$logo_response" -lt 50000 ]; then
    echo -e "${GREEN}✅ ${logo_response} bytes${NC}"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠️ ${logo_response} bytes (could be optimized)${NC}"
    ((WARNINGS++))
fi

# Test gzip compression
echo -n "   Testing gzip compression... "
if curl -s -H "Accept-Encoding: gzip" -I "$APP_URL/" | grep -i "content-encoding.*gzip" > /dev/null; then
    echo -e "${GREEN}✅ Enabled${NC}"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠️ Not enabled (should enable for better performance)${NC}"
    ((WARNINGS++))
fi

# Test caching headers
echo -n "   Testing cache headers... "
cache_control=$(curl -s -I "$APP_URL/logo.svg" | grep -i "cache-control" | head -1)
if echo "$cache_control" | grep -E "(max-age|public)" > /dev/null; then
    echo -e "${GREEN}✅ Properly configured${NC}"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠️ Could be improved${NC}"
    ((WARNINGS++))
fi

echo ""
echo -e "${BLUE}🔍 Network Performance Tests${NC}"
echo "==========================="

# Test under slow network conditions (simulate with timeout)
echo -n "   Testing under slow network conditions... "
slow_start_time=$(date +%s%3N)
slow_response=$(curl -s -m 5 --limit-rate 50K "$APP_URL/" -w "%{http_code}" -o /dev/null)
slow_end_time=$(date +%s%3N)
slow_load_time=$((slow_end_time - slow_start_time))

if [ "$slow_response" -eq 200 ] && [ "$slow_load_time" -le 8000 ]; then
    echo -e "${GREEN}✅ ${slow_load_time}ms (graceful degradation)${NC}"
    ((PASSED++))
elif [ "$slow_response" -eq 200 ]; then
    echo -e "${YELLOW}⚠️ ${slow_load_time}ms (slow but functional)${NC}"
    ((WARNINGS++))
else
    echo -e "${RED}❌ Failed or timed out${NC}"
    ((FAILED++))
fi

echo ""
echo -e "${BLUE}📱 Mobile Performance Considerations${NC}"
echo "==================================="

# Test viewport meta tag
echo -n "   Testing mobile viewport configuration... "
viewport_meta=$(curl -s "$APP_URL/" | grep -i "viewport")
if echo "$viewport_meta" | grep -E "(width=device-width|initial-scale)" > /dev/null; then
    echo -e "${GREEN}✅ Mobile viewport configured${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ Mobile viewport not properly configured${NC}"
    ((FAILED++))
fi

# Test responsive images
echo -n "   Testing responsive design elements... "
css_response=$(curl -s "$APP_URL/" | grep -E "(media|@media)")
if [ ! -z "$css_response" ]; then
    echo -e "${GREEN}✅ Responsive design detected${NC}"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠️ Limited responsive design detected${NC}"
    ((WARNINGS++))
fi

echo ""
echo -e "${BLUE}📊 Performance Test Results${NC}"
echo "=========================="
echo -e "Total Tests: $((PASSED + FAILED + WARNINGS))"
echo -e "${GREEN}Passed: ${PASSED}${NC}"
echo -e "${YELLOW}Warnings: ${WARNINGS}${NC}"
echo -e "${RED}Failed: ${FAILED}${NC}"

echo ""

# Performance recommendations
if [ $WARNINGS -gt 0 ] || [ $FAILED -gt 0 ]; then
    echo -e "${YELLOW}🔧 Performance Recommendations:${NC}"
    echo ""
    
    if [ $FAILED -gt 0 ]; then
        echo "Critical Issues:"
        echo "• Check failed tests above for immediate fixes needed"
        echo "• Optimize slow API endpoints"
        echo "• Review page load optimization"
    fi
    
    if [ $WARNINGS -gt 0 ]; then
        echo "Optimization Opportunities:"
        echo "• Enable gzip compression on server"
        echo "• Implement proper cache headers"
        echo "• Optimize static assets (images, fonts)"
        echo "• Consider implementing CDN"
        echo "• Review mobile responsiveness"
    fi
    echo ""
fi

# Overall assessment
if [ $FAILED -eq 0 ] && [ $WARNINGS -le 2 ]; then
    echo -e "${GREEN}🎉 Excellent performance! Ready for production.${NC}"
    exit 0
elif [ $FAILED -eq 0 ]; then
    echo -e "${YELLOW}⚠️ Good performance with room for improvement.${NC}"
    exit 0
else
    echo -e "${RED}❌ Performance issues detected. Please optimize before production.${NC}"
    exit 1
fi