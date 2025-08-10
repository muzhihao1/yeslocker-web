#!/bin/bash

# YesLocker Complete Testing Suite Runner
# Orchestrates performance, compatibility, and functionality testing

set -e  # Exit on error

echo "🧪 YesLocker Complete Testing Suite"
echo "==================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_URL=""
SKIP_BROWSER_TESTS=false
SKIP_PERFORMANCE_TESTS=false
GENERATE_REPORT=true

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --url)
            APP_URL="$2"
            shift 2
            ;;
        --skip-browser)
            SKIP_BROWSER_TESTS=true
            shift
            ;;
        --skip-performance)
            SKIP_PERFORMANCE_TESTS=true
            shift
            ;;
        --no-report)
            GENERATE_REPORT=false
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --url URL             Application URL to test (auto-detected if not provided)"
            echo "  --skip-browser        Skip browser compatibility tests"
            echo "  --skip-performance    Skip performance tests"
            echo "  --no-report          Don't generate HTML report"
            echo "  --help               Show this help"
            echo ""
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Auto-detect application URL if not provided
if [ -z "$APP_URL" ]; then
    echo "🔍 Auto-detecting application URL..."
    
    if command -v railway &> /dev/null && railway whoami &> /dev/null 2>&1; then
        APP_URL=$(railway domain | grep -E 'https?://' | head -1 || echo "")
        if [ ! -z "$APP_URL" ]; then
            echo -e "${GREEN}✅ Detected Railway URL: $APP_URL${NC}"
        fi
    fi
    
    if [ -z "$APP_URL" ]; then
        # Check if local dev server is running
        if curl -s http://localhost:3000/health > /dev/null 2>&1; then
            APP_URL="http://localhost:3000"
            echo -e "${GREEN}✅ Using local development server: $APP_URL${NC}"
        elif curl -s http://localhost:5173/ > /dev/null 2>&1; then
            APP_URL="http://localhost:5173"
            echo -e "${GREEN}✅ Using Vite dev server: $APP_URL${NC}"
        else
            echo -e "${RED}❌ Could not detect application URL${NC}"
            echo "Please provide URL with --url option or start the application"
            exit 1
        fi
    fi
fi

export APP_URL

# Create test results directory
RESULTS_DIR="test-results-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$RESULTS_DIR"

echo ""
echo -e "${BLUE}🎯 Test Configuration${NC}"
echo "===================="
echo "Application URL: $APP_URL"
echo "Results Directory: $RESULTS_DIR"
echo "Skip Browser Tests: $SKIP_BROWSER_TESTS"
echo "Skip Performance Tests: $SKIP_PERFORMANCE_TESTS"
echo ""

# Track overall results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run a test and capture results
run_test_suite() {
    local test_name="$1"
    local test_command="$2"
    local output_file="$3"
    
    echo -e "${BLUE}🚀 Running $test_name...${NC}"
    echo "Command: $test_command"
    echo ""
    
    if eval "$test_command" 2>&1 | tee "$RESULTS_DIR/$output_file"; then
        echo -e "${GREEN}✅ $test_name completed successfully${NC}"
        ((PASSED_TESTS++))
    else
        echo -e "${RED}❌ $test_name failed${NC}"
        ((FAILED_TESTS++))
    fi
    
    ((TOTAL_TESTS++))
    echo ""
}

# Start testing
echo -e "${BLUE}🚦 Starting Test Execution${NC}"
echo "========================="

# 1. Pre-deployment verification (if local)
if [[ "$APP_URL" == *"localhost"* ]]; then
    echo -e "${YELLOW}📋 Running pre-deployment tests...${NC}"
    if [ -f "./tools/deployment/pre-deployment-test.sh" ]; then
        run_test_suite "Pre-deployment Validation" "./tools/deployment/pre-deployment-test.sh" "pre-deployment.log"
    else
        echo -e "${YELLOW}⚠️ Pre-deployment test not found, skipping${NC}"
    fi
fi

# 2. Performance tests
if [ "$SKIP_PERFORMANCE_TESTS" = false ]; then
    echo -e "${YELLOW}⚡ Running performance tests...${NC}"
    run_test_suite "Performance Testing" "./tools/testing/performance-test.sh \"$APP_URL\"" "performance.log"
else
    echo -e "${YELLOW}⏭️ Skipping performance tests${NC}"
fi

# 3. Browser compatibility tests
if [ "$SKIP_BROWSER_TESTS" = false ]; then
    echo -e "${YELLOW}🌐 Running browser compatibility tests...${NC}"
    
    # Check if Node.js and required packages are available
    if command -v node &> /dev/null; then
        # Install puppeteer if not available (development dependency)
        if ! npm list puppeteer &> /dev/null; then
            echo "📦 Installing puppeteer for browser testing..."
            npm install --save-dev puppeteer &> /dev/null || echo "⚠️ Could not install puppeteer automatically"
        fi
        
        run_test_suite "Browser Compatibility" "node ./tools/testing/browser-compatibility-test.js" "browser-compatibility.log"
    else
        echo -e "${RED}❌ Node.js not found, skipping browser tests${NC}"
        echo "Install Node.js to run browser compatibility tests"
    fi
else
    echo -e "${YELLOW}⏭️ Skipping browser compatibility tests${NC}"
fi

# 4. Generate comprehensive report
if [ "$GENERATE_REPORT" = true ]; then
    echo -e "${BLUE}📊 Generating Test Report${NC}"
    echo "======================="
    
    REPORT_FILE="$RESULTS_DIR/test-report.html"
    
    cat > "$REPORT_FILE" << EOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>YesLocker Test Report - $(date)</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 20px; }
        .header { background: #f0f8ff; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .summary { display: flex; gap: 20px; margin-bottom: 30px; }
        .metric { background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #007acc; min-width: 120px; }
        .metric.success { border-left-color: #28a745; }
        .metric.warning { border-left-color: #ffc107; }
        .metric.danger { border-left-color: #dc3545; }
        .section { background: white; margin-bottom: 20px; padding: 20px; border-radius: 8px; border: 1px solid #e9ecef; }
        .log-content { background: #f8f9fa; padding: 15px; border-radius: 4px; overflow-x: auto; font-family: monospace; }
        pre { margin: 0; white-space: pre-wrap; }
        h1, h2 { color: #333; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🧪 YesLocker Test Report</h1>
        <p><strong>Generated:</strong> $(date)</p>
        <p><strong>Application URL:</strong> $APP_URL</p>
        <p><strong>Test Environment:</strong> $(uname -s) $(uname -r)</p>
    </div>
    
    <div class="summary">
        <div class="metric $([ $FAILED_TESTS -eq 0 ] && echo 'success' || echo 'danger')">
            <h3>Total Tests</h3>
            <h2>$TOTAL_TESTS</h2>
        </div>
        <div class="metric success">
            <h3>Passed</h3>
            <h2>$PASSED_TESTS</h2>
        </div>
        <div class="metric danger">
            <h3>Failed</h3>
            <h2>$FAILED_TESTS</h2>
        </div>
        <div class="metric $([ $FAILED_TESTS -eq 0 ] && echo 'success' || echo 'warning')">
            <h3>Success Rate</h3>
            <h2>$([ $TOTAL_TESTS -gt 0 ] && echo "scale=1; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc || echo "0")%</h2>
        </div>
    </div>
EOF

    # Add detailed results for each test
    for log_file in "$RESULTS_DIR"/*.log; do
        if [ -f "$log_file" ]; then
            test_name=$(basename "$log_file" .log)
            echo "    <div class=\"section\">" >> "$REPORT_FILE"
            echo "        <h2>📋 $(echo $test_name | tr '-' ' ' | tr '[:lower:]' '[:upper:]')</h2>" >> "$REPORT_FILE"
            echo "        <div class=\"log-content\">" >> "$REPORT_FILE"
            echo "            <pre>$(cat "$log_file" | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g')</pre>" >> "$REPORT_FILE"
            echo "        </div>" >> "$REPORT_FILE"
            echo "    </div>" >> "$REPORT_FILE"
        fi
    done
    
    cat >> "$REPORT_FILE" << EOF
    
    <div class="section">
        <h2>📝 Testing Notes</h2>
        <ul>
            <li>All tests were run automatically using YesLocker test suite</li>
            <li>Performance tests verify page load times and API response times</li>
            <li>Browser compatibility tests check functionality across different browsers and devices</li>
            <li>Review failed tests and optimize accordingly before production deployment</li>
        </ul>
    </div>
    
    <footer style="margin-top: 40px; text-align: center; color: #666;">
        <p>Generated by YesLocker Testing Suite</p>
    </footer>
</body>
</html>
EOF
    
    echo -e "${GREEN}✅ Test report generated: $REPORT_FILE${NC}"
    
    # Try to open the report in default browser
    if command -v open &> /dev/null; then
        open "$REPORT_FILE"
    elif command -v xdg-open &> /dev/null; then
        xdg-open "$REPORT_FILE"
    else
        echo "Open the report manually: file://$(pwd)/$REPORT_FILE"
    fi
fi

echo ""
echo -e "${BLUE}📊 Final Test Summary${NC}"
echo "==================="
echo -e "Total Test Suites: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 All tests passed! Application is ready for production.${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}❌ Some tests failed. Please review and fix issues before production.${NC}"
    echo "Check detailed results in: $RESULTS_DIR/"
    exit 1
fi