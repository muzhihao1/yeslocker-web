#!/usr/bin/env node

/**
 * YesLocker Browser Compatibility Testing Suite
 * Tests functionality across different browsers and devices
 */

const puppeteer = require('puppeteer');
const { execSync } = require('child_process');

// Test configuration
const TEST_CONFIG = {
    url: process.env.APP_URL || 'http://localhost:3000',
    timeout: 30000,
    browsers: [
        { name: 'Chrome', product: 'chrome' },
        { name: 'Firefox', product: 'firefox' },
        { name: 'Safari', product: 'safari' }, // Will skip on non-macOS
        { name: 'Edge', product: 'chrome' } // Uses Chromium engine
    ],
    devices: [
        'iPhone 12',
        'iPad',
        'Samsung Galaxy S20',
        'Desktop 1920x1080'
    ],
    testPages: [
        { path: '/', name: 'Home Page' },
        { path: '/auth/login', name: 'Login Page' },
        { path: '/auth/register', name: 'Register Page' },
        { path: '/user/apply', name: 'Apply Page' }
    ]
};

// Test results tracking
let testResults = {
    passed: 0,
    failed: 0,
    skipped: 0,
    details: []
};

// Console colors
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

function log(color, message) {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

// Check if required dependencies are available
function checkDependencies() {
    console.log('🔍 Checking test dependencies...');
    
    try {
        require('puppeteer');
        log('green', '✅ Puppeteer available');
        return true;
    } catch (error) {
        log('red', '❌ Puppeteer not found');
        console.log('Please install with: npm install --save-dev puppeteer');
        return false;
    }
}

// Test basic page functionality
async function testPageFunctionality(page, pageName) {
    try {
        // Wait for page to load
        await page.waitForLoadState('networkidle', { timeout: 10000 });
        
        // Check for critical elements
        const tests = [
            {
                name: 'Page title exists',
                test: () => page.title(),
                validate: (result) => result && result.length > 0
            },
            {
                name: 'No JavaScript errors',
                test: async () => {
                    const errors = await page.evaluate(() => window.__jsErrors || []);
                    return errors;
                },
                validate: (result) => !result || result.length === 0
            },
            {
                name: 'Main content visible',
                test: () => page.locator('body').isVisible(),
                validate: (result) => result
            },
            {
                name: 'Navigation elements present',
                test: () => page.locator('nav, .nav, [role="navigation"]').count(),
                validate: (result) => result > 0
            }
        ];
        
        const results = [];
        for (const test of tests) {
            try {
                const result = await test.test();
                const passed = test.validate(result);
                results.push({
                    name: test.name,
                    passed,
                    result: passed ? 'PASS' : `FAIL: ${result}`
                });
            } catch (error) {
                results.push({
                    name: test.name,
                    passed: false,
                    result: `ERROR: ${error.message}`
                });
            }
        }
        
        return results;
    } catch (error) {
        return [{
            name: 'Page Load',
            passed: false,
            result: `ERROR: ${error.message}`
        }];
    }
}

// Test responsive design
async function testResponsiveDesign(page, device) {
    try {
        if (device === 'Desktop 1920x1080') {
            await page.setViewportSize({ width: 1920, height: 1080 });
        } else {
            await page.emulate(puppeteer.devices[device]);
        }
        
        // Check viewport meta tag
        const viewportMeta = await page.locator('meta[name="viewport"]').getAttribute('content');
        const hasViewport = viewportMeta && viewportMeta.includes('width=device-width');
        
        // Check if content is visible without horizontal scroll
        const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
        const viewportWidth = await page.evaluate(() => window.innerWidth);
        const noHorizontalScroll = bodyWidth <= viewportWidth + 20; // 20px tolerance
        
        // Check for responsive elements
        const hasMediaQueries = await page.evaluate(() => {
            const stylesheets = Array.from(document.styleSheets);
            return stylesheets.some(sheet => {
                try {
                    const rules = Array.from(sheet.cssRules);
                    return rules.some(rule => rule.type === CSSRule.MEDIA_RULE);
                } catch (e) {
                    return false;
                }
            });
        });
        
        return {
            hasViewport,
            noHorizontalScroll,
            hasMediaQueries,
            bodyWidth,
            viewportWidth
        };
    } catch (error) {
        return {
            error: error.message
        };
    }
}

// Test form functionality
async function testFormFunctionality(page) {
    const forms = await page.locator('form').count();
    if (forms === 0) return { hasForm: false };
    
    try {
        // Test first form
        const form = page.locator('form').first();
        const inputs = await form.locator('input').count();
        const buttons = await form.locator('button, input[type="submit"]').count();
        
        // Check for proper labels
        const labels = await form.locator('label').count();
        const properLabeling = labels >= inputs * 0.5; // At least 50% of inputs should have labels
        
        return {
            hasForm: true,
            inputCount: inputs,
            buttonCount: buttons,
            properLabeling
        };
    } catch (error) {
        return {
            hasForm: true,
            error: error.message
        };
    }
}

// Test accessibility basics
async function testAccessibility(page) {
    try {
        const tests = {
            hasH1: await page.locator('h1').count() > 0,
            hasAltTexts: await page.evaluate(() => {
                const images = Array.from(document.querySelectorAll('img'));
                return images.length === 0 || images.every(img => img.alt !== undefined);
            }),
            hasSkipLink: await page.locator('a[href="#main"], a[href="#content"]').count() > 0,
            hasLangAttribute: await page.locator('html[lang]').count() > 0,
            colorContrast: 'manual', // Requires specialized tools
            keyboardNavigation: 'manual' // Requires manual testing
        };
        
        return tests;
    } catch (error) {
        return { error: error.message };
    }
}

// Main browser test function
async function runBrowserTest(browserConfig, device) {
    const testName = `${browserConfig.name} on ${device}`;
    log('blue', `\n🧪 Testing: ${testName}`);
    
    // Skip Safari on non-macOS systems
    if (browserConfig.name === 'Safari' && process.platform !== 'darwin') {
        log('yellow', '⚠️ Skipping Safari (not available on this platform)');
        testResults.skipped++;
        return;
    }
    
    let browser;
    let page;
    
    try {
        // Launch browser
        const browserOptions = {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        };
        
        if (browserConfig.product === 'firefox') {
            browser = await puppeteer.launch({ 
                ...browserOptions, 
                product: 'firefox' 
            });
        } else {
            browser = await puppeteer.launch(browserOptions);
        }
        
        page = await browser.newPage();
        
        // Set up error tracking
        await page.evaluateOnNewDocument(() => {
            window.__jsErrors = [];
            window.addEventListener('error', (e) => {
                window.__jsErrors.push(e.message);
            });
        });
        
        // Test each page
        for (const testPage of TEST_CONFIG.testPages) {
            log('blue', `   Testing ${testPage.name}...`);
            
            try {
                await page.goto(`${TEST_CONFIG.url}${testPage.path}`, {
                    waitUntil: 'networkidle0',
                    timeout: TEST_CONFIG.timeout
                });
                
                // Run functionality tests
                const functionality = await testPageFunctionality(page, testPage.name);
                const responsive = await testResponsiveDesign(page, device);
                const forms = await testFormFunctionality(page);
                const accessibility = await testAccessibility(page);
                
                // Collect results
                const pageResults = {
                    testName,
                    page: testPage.name,
                    functionality,
                    responsive,
                    forms,
                    accessibility,
                    timestamp: new Date().toISOString()
                };
                
                testResults.details.push(pageResults);
                
                // Count passes/fails
                const functionalityPasses = functionality.filter(t => t.passed).length;
                const functionalityTotal = functionality.length;
                
                if (functionalityPasses === functionalityTotal) {
                    log('green', `   ✅ ${testPage.name}: All tests passed`);
                    testResults.passed++;
                } else {
                    log('red', `   ❌ ${testPage.name}: ${functionalityPasses}/${functionalityTotal} tests passed`);
                    testResults.failed++;
                }
                
                // Wait between pages
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                log('red', `   ❌ ${testPage.name}: ${error.message}`);
                testResults.failed++;
            }
        }
        
    } catch (error) {
        log('red', `❌ Failed to test ${testName}: ${error.message}`);
        testResults.failed++;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Generate test report
function generateReport() {
    console.log('\n📊 Browser Compatibility Test Report');
    console.log('====================================');
    console.log(`Total Tests: ${testResults.passed + testResults.failed + testResults.skipped}`);
    log('green', `Passed: ${testResults.passed}`);
    log('red', `Failed: ${testResults.failed}`);
    log('yellow', `Skipped: ${testResults.skipped}`);
    
    if (testResults.details.length > 0) {
        console.log('\n📋 Detailed Results:');
        
        testResults.details.forEach((result, index) => {
            console.log(`\n${index + 1}. ${result.testName} - ${result.page}`);
            
            // Functionality results
            result.functionality.forEach(test => {
                const status = test.passed ? '✅' : '❌';
                console.log(`   ${status} ${test.name}`);
                if (!test.passed) {
                    console.log(`      ${test.result}`);
                }
            });
            
            // Responsive design results
            if (result.responsive && !result.responsive.error) {
                const responsive = result.responsive;
                console.log(`   📱 Viewport: ${responsive.hasViewport ? '✅' : '❌'}`);
                console.log(`   📱 No H-Scroll: ${responsive.noHorizontalScroll ? '✅' : '❌'}`);
                console.log(`   📱 Media Queries: ${responsive.hasMediaQueries ? '✅' : '❌'}`);
            }
            
            // Form results
            if (result.forms && result.forms.hasForm) {
                console.log(`   📝 Form Elements: ${result.forms.inputCount} inputs, ${result.forms.buttonCount} buttons`);
                console.log(`   📝 Proper Labeling: ${result.forms.properLabeling ? '✅' : '❌'}`);
            }
            
            // Accessibility results
            if (result.accessibility && !result.accessibility.error) {
                const a11y = result.accessibility;
                console.log(`   ♿ H1 Present: ${a11y.hasH1 ? '✅' : '❌'}`);
                console.log(`   ♿ Alt Texts: ${a11y.hasAltTexts ? '✅' : '❌'}`);
                console.log(`   ♿ Lang Attribute: ${a11y.hasLangAttribute ? '✅' : '❌'}`);
            }
        });
    }
    
    // Recommendations
    if (testResults.failed > 0) {
        console.log('\n🔧 Recommendations:');
        console.log('• Fix failed functionality tests');
        console.log('• Ensure proper viewport meta tag');
        console.log('• Implement responsive design with media queries');
        console.log('• Add proper form labels for accessibility');
        console.log('• Test manually on actual devices');
    }
    
    console.log('\n');
    
    // Exit with appropriate code
    return testResults.failed === 0 ? 0 : 1;
}

// Main execution
async function main() {
    console.log('🌐 YesLocker Browser Compatibility Testing Suite');
    console.log('===============================================');
    
    if (!checkDependencies()) {
        process.exit(1);
    }
    
    console.log(`📱 Testing URL: ${TEST_CONFIG.url}`);
    console.log(`🧪 Testing ${TEST_CONFIG.browsers.length} browsers on ${TEST_CONFIG.devices.length} devices`);
    
    // Test each browser/device combination
    for (const browser of TEST_CONFIG.browsers) {
        for (const device of TEST_CONFIG.devices) {
            await runBrowserTest(browser, device);
        }
    }
    
    // Generate final report
    const exitCode = generateReport();
    process.exit(exitCode);
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
    process.exit(1);
});

// Run if this is the main module
if (require.main === module) {
    main().catch(error => {
        console.error('Test suite failed:', error);
        process.exit(1);
    });
}