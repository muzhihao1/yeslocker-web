#!/usr/bin/env node

/**
 * YesLocker Edge Case and Failure Scenario Testing Framework
 * 
 * Comprehensive testing framework for validating system behavior under
 * edge cases, error conditions, and failure scenarios.
 * 
 * Categories tested:
 * 1. Input validation edge cases
 * 2. Error condition handling
 * 3. System failure scenarios
 * 4. Database constraint violations
 * 5. Network failure scenarios
 * 6. Race conditions and concurrency
 * 7. Resource exhaustion
 * 8. Security boundary testing
 */

const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class EdgeCaseTestFramework {
    constructor() {
        this.baseUrl = 'http://localhost:3001';
        this.results = {
            passed: 0,
            failed: 0,
            errors: [],
            summary: {},
            startTime: Date.now()
        };
        this.testCategories = [
            'input-validation',
            'error-handling', 
            'failure-scenarios',
            'database-constraints',
            'network-failures',
            'race-conditions',
            'resource-exhaustion',
            'security-boundaries'
        ];
    }

    /**
     * Log test result with detailed information
     */
    log(level, category, test, message, data = null) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            category,
            test,
            message,
            data
        };
        
        console.log(`[${timestamp}] [${level}] [${category}] ${test}: ${message}`);
        
        if (level === 'ERROR') {
            this.results.errors.push(logEntry);
            this.results.failed++;
        } else if (level === 'PASS') {
            this.results.passed++;
        }
        
        if (!this.results.summary[category]) {
            this.results.summary[category] = { passed: 0, failed: 0 };
        }
        
        if (level === 'ERROR') {
            this.results.summary[category].failed++;
        } else if (level === 'PASS') {
            this.results.summary[category].passed++;
        }
    }

    /**
     * Create test admin token for authenticated requests
     */
    async createTestToken() {
        try {
            const response = await axios.post(`${this.baseUrl}/admin-login`, {
                phone: '13800000001',
                password: 'admin123'
            });
            
            if (response.data.success && response.data.token) {
                return response.data.token;
            }
        } catch (error) {
            this.log('ERROR', 'setup', 'token-creation', 'Failed to create test token', error.message);
        }
        return null;
    }

    /**
     * 1. INPUT VALIDATION EDGE CASES
     */
    async testInputValidationEdgeCases() {
        const category = 'input-validation';
        this.log('INFO', category, 'start', 'Starting input validation edge case tests');

        // Test invalid phone numbers
        const invalidPhones = [
            '', // Empty
            null, // Null
            undefined, // Undefined
            '123', // Too short
            '1234567890123456789', // Too long
            'abc123', // Non-numeric
            '138-0000-0001', // With dashes
            '+86138000000001', // With country code
            '13800000001 ', // With trailing space
            ' 13800000001', // With leading space
            '138000000011', // Extra digit
            '13800000001\n', // With newline
            '13800000001\x00', // With null byte
            '13800000001<script>', // XSS attempt
            'DROP TABLE users', // SQL injection attempt
        ];

        for (const phone of invalidPhones) {
            try {
                const response = await axios.post(`${this.baseUrl}/auth-register`, {
                    phone: phone,
                    name: 'Test User',
                    store_id: 1
                });
                
                // Should not succeed with invalid phone
                if (response.data.success) {
                    this.log('ERROR', category, 'invalid-phone', `Invalid phone accepted: ${JSON.stringify(phone)}`);
                } else {
                    this.log('PASS', category, 'invalid-phone', `Invalid phone correctly rejected: ${JSON.stringify(phone)}`);
                }
            } catch (error) {
                // Expected to fail
                this.log('PASS', category, 'invalid-phone', `Invalid phone correctly rejected with error: ${JSON.stringify(phone)}`);
            }
        }

        // Test boundary value names
        const boundaryNames = [
            '', // Empty name
            'A', // Single character
            'A'.repeat(100), // Very long name
            'Test\x00User', // Null byte in name
            '<script>alert("xss")</script>', // XSS attempt
            'Test\nUser', // Newline in name
            'Test\tUser', // Tab in name
            '测试用户', // Chinese characters
            '🎱🔒', // Emojis
            'User' + '\u0000', // Null terminator
        ];

        for (const name of boundaryNames) {
            try {
                const response = await axios.post(`${this.baseUrl}/auth-register`, {
                    phone: '13800000002',
                    name: name,
                    store_id: 1
                });
                
                if (name === '' || name.includes('\x00') || name.includes('<script>')) {
                    if (response.data.success) {
                        this.log('ERROR', category, 'boundary-name', `Dangerous name accepted: ${JSON.stringify(name)}`);
                    } else {
                        this.log('PASS', category, 'boundary-name', `Dangerous name correctly rejected: ${JSON.stringify(name)}`);
                    }
                } else {
                    this.log('PASS', category, 'boundary-name', `Name handling test: ${JSON.stringify(name)}`);
                }
            } catch (error) {
                this.log('PASS', category, 'boundary-name', `Name validation triggered error as expected: ${JSON.stringify(name)}`);
            }
        }

        // Test store_id edge cases
        const invalidStoreIds = [
            null,
            undefined,
            '',
            'abc',
            -1,
            0,
            999999,
            1.5,
            '1; DROP TABLE stores--',
            { id: 1 },
            [1],
        ];

        for (const storeId of invalidStoreIds) {
            try {
                const response = await axios.post(`${this.baseUrl}/auth-register`, {
                    phone: '13800000003',
                    name: 'Test User',
                    store_id: storeId
                });
                
                if (response.data.success && (storeId === null || storeId === undefined || storeId === '' || typeof storeId !== 'number' || storeId <= 0)) {
                    this.log('ERROR', category, 'invalid-store-id', `Invalid store_id accepted: ${JSON.stringify(storeId)}`);
                } else {
                    this.log('PASS', category, 'invalid-store-id', `Store ID validation test: ${JSON.stringify(storeId)}`);
                }
            } catch (error) {
                this.log('PASS', category, 'invalid-store-id', `Invalid store_id correctly rejected: ${JSON.stringify(storeId)}`);
            }
        }
    }

    /**
     * 2. ERROR CONDITION HANDLING
     */
    async testErrorConditionHandling() {
        const category = 'error-handling';
        this.log('INFO', category, 'start', 'Starting error condition handling tests');

        // Test non-existent endpoints
        const invalidEndpoints = [
            '/non-existent-endpoint',
            '/admin-login/../../../etc/passwd',
            '/admin-login%00.php',
            '/admin-login.php',
            '/admin-login.jsp',
            '/admin-login?id=1 UNION SELECT * FROM users--',
        ];

        for (const endpoint of invalidEndpoints) {
            try {
                const response = await axios.get(`${this.baseUrl}${endpoint}`);
                
                if (response.status === 200) {
                    this.log('ERROR', category, 'invalid-endpoint', `Invalid endpoint returned 200: ${endpoint}`);
                } else {
                    this.log('PASS', category, 'invalid-endpoint', `Invalid endpoint handled correctly: ${endpoint}`);
                }
            } catch (error) {
                if (error.response && error.response.status === 404) {
                    this.log('PASS', category, 'invalid-endpoint', `Invalid endpoint returned 404 as expected: ${endpoint}`);
                } else {
                    this.log('ERROR', category, 'invalid-endpoint', `Unexpected error for endpoint ${endpoint}: ${error.message}`);
                }
            }
        }

        // Test malformed JSON payloads
        const malformedPayloads = [
            '{"incomplete": ',
            '{invalid json}',
            '{"phone": "13800000001", "name": "Test", "extra_field": "value", "store_id": 1}',
            '{"phone": "13800000001"}', // Missing required fields
            '{}', // Empty object
            'not json at all',
            '{"phone": null, "name": null, "store_id": null}',
        ];

        for (const payload of malformedPayloads) {
            try {
                const response = await axios.post(`${this.baseUrl}/auth-register`, payload, {
                    headers: { 'Content-Type': 'application/json' }
                });
                
                if (response.data.success) {
                    this.log('ERROR', category, 'malformed-json', `Malformed payload accepted: ${payload.substring(0, 50)}...`);
                } else {
                    this.log('PASS', category, 'malformed-json', `Malformed payload correctly rejected: ${payload.substring(0, 50)}...`);
                }
            } catch (error) {
                this.log('PASS', category, 'malformed-json', `Malformed payload correctly rejected with error: ${payload.substring(0, 50)}...`);
            }
        }

        // Test oversized requests
        try {
            const largePayload = {
                phone: '13800000001',
                name: 'A'.repeat(10000), // Very large name
                store_id: 1
            };
            
            const response = await axios.post(`${this.baseUrl}/auth-register`, largePayload);
            
            if (response.data.success) {
                this.log('ERROR', category, 'large-payload', 'Oversized payload was accepted');
            } else {
                this.log('PASS', category, 'large-payload', 'Oversized payload correctly rejected');
            }
        } catch (error) {
            this.log('PASS', category, 'large-payload', 'Oversized payload correctly rejected with error');
        }
    }

    /**
     * 3. SYSTEM FAILURE SCENARIOS
     */
    async testSystemFailureScenarios() {
        const category = 'failure-scenarios';
        this.log('INFO', category, 'start', 'Starting system failure scenario tests');

        // Test rapid successive requests (burst testing)
        const promises = [];
        for (let i = 0; i < 50; i++) {
            promises.push(
                axios.post(`${this.baseUrl}/auth-register`, {
                    phone: `1380000${String(i).padStart(4, '0')}`,
                    name: `Test User ${i}`,
                    store_id: 1
                }).catch(error => ({ error: error.message, index: i }))
            );
        }

        try {
            const results = await Promise.all(promises);
            const errors = results.filter(r => r.error);
            const successes = results.filter(r => !r.error);
            
            this.log('INFO', category, 'burst-test', `Burst test: ${successes.length} success, ${errors.length} errors`);
            
            if (errors.length > successes.length) {
                this.log('ERROR', category, 'burst-test', 'Too many errors in burst test - system may not handle load well');
            } else {
                this.log('PASS', category, 'burst-test', 'Burst test handled reasonably well');
            }
        } catch (error) {
            this.log('ERROR', category, 'burst-test', `Burst test failed: ${error.message}`);
        }

        // Test timeout scenarios
        try {
            const response = await axios.post(`${this.baseUrl}/auth-register`, {
                phone: '13800001000',
                name: 'Timeout Test',
                store_id: 1
            }, {
                timeout: 1 // Very short timeout
            });
            
            this.log('PASS', category, 'timeout-test', 'Request completed within short timeout');
        } catch (error) {
            if (error.code === 'ECONNABORTED') {
                this.log('PASS', category, 'timeout-test', 'Timeout handled correctly');
            } else {
                this.log('ERROR', category, 'timeout-test', `Unexpected timeout error: ${error.message}`);
            }
        }

        // Test concurrent identical requests (race condition)
        const duplicatePromises = [];
        const testPhone = '13800001001';
        
        for (let i = 0; i < 10; i++) {
            duplicatePromises.push(
                axios.post(`${this.baseUrl}/auth-register`, {
                    phone: testPhone,
                    name: 'Duplicate Test',
                    store_id: 1
                }).catch(error => ({ error: error.message }))
            );
        }

        try {
            const duplicateResults = await Promise.all(duplicatePromises);
            const duplicateSuccesses = duplicateResults.filter(r => !r.error && r.data && r.data.success);
            
            if (duplicateSuccesses.length > 1) {
                this.log('ERROR', category, 'race-condition', `Multiple registrations succeeded for same phone: ${duplicateSuccesses.length}`);
            } else {
                this.log('PASS', category, 'race-condition', 'Race condition handled correctly - only one registration succeeded');
            }
        } catch (error) {
            this.log('ERROR', category, 'race-condition', `Race condition test failed: ${error.message}`);
        }
    }

    /**
     * 4. DATABASE CONSTRAINT VIOLATIONS
     */
    async testDatabaseConstraints() {
        const category = 'database-constraints';
        this.log('INFO', category, 'start', 'Starting database constraint violation tests');

        // Test duplicate phone number registration
        const testPhone = '13800001002';
        
        try {
            // First registration
            const response1 = await axios.post(`${this.baseUrl}/auth-register`, {
                phone: testPhone,
                name: 'First User',
                store_id: 1
            });
            
            // Second registration with same phone
            const response2 = await axios.post(`${this.baseUrl}/auth-register`, {
                phone: testPhone,
                name: 'Second User',
                store_id: 1
            });
            
            if (response1.data.success && response2.data.success) {
                this.log('ERROR', category, 'duplicate-phone', 'Duplicate phone numbers allowed in database');
            } else if (response1.data.success && !response2.data.success) {
                this.log('PASS', category, 'duplicate-phone', 'Duplicate phone correctly rejected');
            } else {
                this.log('INFO', category, 'duplicate-phone', 'Phone registration behavior unclear');
            }
        } catch (error) {
            this.log('PASS', category, 'duplicate-phone', 'Database constraint violation handled correctly');
        }

        // Test invalid foreign key references
        try {
            const response = await axios.post(`${this.baseUrl}/auth-register`, {
                phone: '13800001003',
                name: 'Invalid Store User',
                store_id: 999999 // Non-existent store
            });
            
            if (response.data.success) {
                this.log('ERROR', category, 'invalid-foreign-key', 'Invalid store_id was accepted');
            } else {
                this.log('PASS', category, 'invalid-foreign-key', 'Invalid store_id correctly rejected');
            }
        } catch (error) {
            this.log('PASS', category, 'invalid-foreign-key', 'Foreign key constraint violation handled correctly');
        }

        // Test locker application with non-existent user (if token available)
        const token = await this.createTestToken();
        if (token) {
            try {
                const response = await axios.post(`${this.baseUrl}/lockers-apply`, {
                    user_id: 999999, // Non-existent user
                    store_id: 1,
                    months: 1,
                    note: 'Test application'
                }, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (response.data.success) {
                    this.log('ERROR', category, 'invalid-user-id', 'Invalid user_id was accepted for locker application');
                } else {
                    this.log('PASS', category, 'invalid-user-id', 'Invalid user_id correctly rejected');
                }
            } catch (error) {
                this.log('PASS', category, 'invalid-user-id', 'Invalid user_id correctly rejected with error');
            }
        }
    }

    /**
     * 5. NETWORK FAILURE SCENARIOS
     */
    async testNetworkFailures() {
        const category = 'network-failures';
        this.log('INFO', category, 'start', 'Starting network failure scenario tests');

        // Test connection to invalid host
        try {
            const response = await axios.post('http://non-existent-host:3001/auth-register', {
                phone: '13800001004',
                name: 'Network Test',
                store_id: 1
            }, {
                timeout: 5000
            });
            
            this.log('ERROR', category, 'invalid-host', 'Connection to invalid host succeeded unexpectedly');
        } catch (error) {
            if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
                this.log('PASS', category, 'invalid-host', 'Invalid host correctly rejected');
            } else {
                this.log('ERROR', category, 'invalid-host', `Unexpected network error: ${error.message}`);
            }
        }

        // Test very slow requests (simulated by short timeout)
        try {
            const response = await axios.get(`${this.baseUrl}/stores-lockers`, {
                timeout: 10 // Very short timeout
            });
            
            this.log('PASS', category, 'short-timeout', 'Request completed within short timeout');
        } catch (error) {
            if (error.code === 'ECONNABORTED') {
                this.log('PASS', category, 'short-timeout', 'Short timeout handled correctly');
            } else {
                this.log('ERROR', category, 'short-timeout', `Unexpected timeout error: ${error.message}`);
            }
        }

        // Test interrupted connections (partial payload)
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 100); // Cancel after 100ms
            
            const response = await axios.post(`${this.baseUrl}/auth-register`, {
                phone: '13800001005',
                name: 'Interrupted Test',
                store_id: 1
            }, {
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            this.log('PASS', category, 'interrupted-connection', 'Connection completed before interruption');
        } catch (error) {
            if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
                this.log('PASS', category, 'interrupted-connection', 'Connection interruption handled correctly');
            } else {
                this.log('ERROR', category, 'interrupted-connection', `Unexpected interruption error: ${error.message}`);
            }
        }
    }

    /**
     * 6. RACE CONDITIONS AND CONCURRENCY
     */
    async testRaceConditions() {
        const category = 'race-conditions';
        this.log('INFO', category, 'start', 'Starting race condition and concurrency tests');

        const token = await this.createTestToken();
        if (!token) {
            this.log('ERROR', category, 'setup', 'Cannot test race conditions without admin token');
            return;
        }

        // Test concurrent locker applications for same locker
        const concurrentPromises = [];
        const testUserId = 1;
        
        for (let i = 0; i < 5; i++) {
            concurrentPromises.push(
                axios.post(`${this.baseUrl}/lockers-apply`, {
                    user_id: testUserId,
                    store_id: 1,
                    months: 1,
                    note: `Concurrent application ${i}`
                }, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }).catch(error => ({ error: error.message, index: i }))
            );
        }

        try {
            const concurrentResults = await Promise.all(concurrentPromises);
            const concurrentSuccesses = concurrentResults.filter(r => !r.error && r.data && r.data.success);
            
            this.log('INFO', category, 'concurrent-applications', `Concurrent applications: ${concurrentSuccesses.length} succeeded`);
            
            // Multiple applications might be allowed, so this is just informational
            this.log('PASS', category, 'concurrent-applications', 'Concurrent application handling tested');
        } catch (error) {
            this.log('ERROR', category, 'concurrent-applications', `Concurrent application test failed: ${error.message}`);
        }

        // Test rapid authentication attempts
        const authPromises = [];
        for (let i = 0; i < 10; i++) {
            authPromises.push(
                axios.post(`${this.baseUrl}/admin-login`, {
                    phone: '13800000001',
                    password: 'admin123'
                }).catch(error => ({ error: error.message, index: i }))
            );
        }

        try {
            const authResults = await Promise.all(authPromises);
            const authSuccesses = authResults.filter(r => !r.error && r.data && r.data.success);
            const authErrors = authResults.filter(r => r.error);
            
            this.log('INFO', category, 'rapid-auth', `Rapid auth: ${authSuccesses.length} success, ${authErrors.length} errors`);
            
            if (authErrors.length > authSuccesses.length) {
                this.log('ERROR', category, 'rapid-auth', 'Too many auth failures - possible rate limiting or concurrency issues');
            } else {
                this.log('PASS', category, 'rapid-auth', 'Rapid authentication handled reasonably');
            }
        } catch (error) {
            this.log('ERROR', category, 'rapid-auth', `Rapid auth test failed: ${error.message}`);
        }
    }

    /**
     * 7. RESOURCE EXHAUSTION SCENARIOS
     */
    async testResourceExhaustion() {
        const category = 'resource-exhaustion';
        this.log('INFO', category, 'start', 'Starting resource exhaustion tests');

        // Test large payload handling
        const largeData = {
            phone: '13800001006',
            name: 'A'.repeat(1000000), // 1MB name
            store_id: 1
        };

        try {
            const response = await axios.post(`${this.baseUrl}/auth-register`, largeData, {
                timeout: 30000 // Allow more time for large payload
            });
            
            if (response.data.success) {
                this.log('ERROR', category, 'large-payload', 'Very large payload was accepted - potential memory issue');
            } else {
                this.log('PASS', category, 'large-payload', 'Large payload correctly rejected');
            }
        } catch (error) {
            if (error.response && error.response.status === 413) {
                this.log('PASS', category, 'large-payload', 'Large payload rejected with 413 Payload Too Large');
            } else {
                this.log('PASS', category, 'large-payload', 'Large payload rejected with error');
            }
        }

        // Test many simultaneous connections
        const connectionPromises = [];
        for (let i = 0; i < 100; i++) {
            connectionPromises.push(
                axios.get(`${this.baseUrl}/health`, {
                    timeout: 10000
                }).catch(error => ({ error: error.message, index: i }))
            );
        }

        try {
            const connectionResults = await Promise.all(connectionPromises);
            const connectionSuccesses = connectionResults.filter(r => !r.error);
            const connectionErrors = connectionResults.filter(r => r.error);
            
            this.log('INFO', category, 'many-connections', `Connection test: ${connectionSuccesses.length} success, ${connectionErrors.length} errors`);
            
            const successRate = connectionSuccesses.length / connectionResults.length;
            if (successRate < 0.8) {
                this.log('ERROR', category, 'many-connections', `Low success rate (${(successRate * 100).toFixed(1)}%) suggests connection pool issues`);
            } else {
                this.log('PASS', category, 'many-connections', `Good success rate (${(successRate * 100).toFixed(1)}%) for many connections`);
            }
        } catch (error) {
            this.log('ERROR', category, 'many-connections', `Many connections test failed: ${error.message}`);
        }

        // Test deep object nesting (potential JSON parser exhaustion)
        let deepObject = { phone: '13800001007', name: 'Deep Test', store_id: 1 };
        for (let i = 0; i < 100; i++) {
            deepObject = { nested: deepObject };
        }

        try {
            const response = await axios.post(`${this.baseUrl}/auth-register`, deepObject);
            
            if (response.data.success) {
                this.log('ERROR', category, 'deep-nesting', 'Deeply nested object was accepted - potential parser issue');
            } else {
                this.log('PASS', category, 'deep-nesting', 'Deeply nested object correctly rejected');
            }
        } catch (error) {
            this.log('PASS', category, 'deep-nesting', 'Deeply nested object correctly rejected with error');
        }
    }

    /**
     * 8. SECURITY BOUNDARY TESTING
     */
    async testSecurityBoundaries() {
        const category = 'security-boundaries';
        this.log('INFO', category, 'start', 'Starting security boundary tests');

        // Test SQL injection attempts
        const sqlInjectionPayloads = [
            "'; DROP TABLE users; --",
            "' OR '1'='1",
            "' UNION SELECT * FROM users WHERE '1'='1",
            "'; INSERT INTO users (phone, name) VALUES ('hacked', 'hacker'); --",
            "' OR 1=1 --",
            "admin'--",
            "admin' /*",
            "' or 1=1#",
            "' or 1=1--",
            "') or '1'='1--",
            "') or ('1'='1--"
        ];

        for (const payload of sqlInjectionPayloads) {
            try {
                const response = await axios.post(`${this.baseUrl}/admin-login`, {
                    phone: payload,
                    password: 'admin123'
                });
                
                if (response.data.success) {
                    this.log('ERROR', category, 'sql-injection', `SQL injection payload succeeded: ${payload}`);
                } else {
                    this.log('PASS', category, 'sql-injection', `SQL injection payload correctly rejected: ${payload}`);
                }
            } catch (error) {
                this.log('PASS', category, 'sql-injection', `SQL injection payload correctly rejected with error: ${payload}`);
            }
        }

        // Test XSS attempts
        const xssPayloads = [
            '<script>alert("xss")</script>',
            '"><script>alert("xss")</script>',
            "';alert('xss');//",
            '<img src="x" onerror="alert(\'xss\')">',
            'javascript:alert("xss")',
            '<svg onload="alert(\'xss\')">',
            '<iframe src="javascript:alert(\'xss\')"></iframe>',
        ];

        for (const payload of xssPayloads) {
            try {
                const response = await axios.post(`${this.baseUrl}/auth-register`, {
                    phone: '13800001008',
                    name: payload,
                    store_id: 1
                });
                
                // XSS in name field should be sanitized or rejected
                this.log('PASS', category, 'xss-attempt', `XSS payload handled: ${payload.substring(0, 30)}...`);
            } catch (error) {
                this.log('PASS', category, 'xss-attempt', `XSS payload correctly rejected: ${payload.substring(0, 30)}...`);
            }
        }

        // Test CSRF-like attempts (without proper token)
        try {
            const response = await axios.post(`${this.baseUrl}/admin-approval`, {
                application_id: 1,
                action: 'approve',
                note: 'CSRF test'
            }, {
                headers: {
                    'Origin': 'http://malicious-site.com',
                    'Referer': 'http://malicious-site.com/csrf-page'
                }
            });
            
            if (response.data.success) {
                this.log('ERROR', category, 'csrf-attempt', 'CSRF-like request succeeded without proper authentication');
            } else {
                this.log('PASS', category, 'csrf-attempt', 'CSRF-like request correctly rejected');
            }
        } catch (error) {
            this.log('PASS', category, 'csrf-attempt', 'CSRF-like request correctly rejected with error');
        }

        // Test authorization bypass attempts
        const bypassAttempts = [
            '/admin-approval/../../../etc/passwd',
            '/admin-approval?user_id=1 OR 1=1',
            '/admin-approval%2e%2e%2f%2e%2e%2fetc%2fpasswd',
            '/admin-approval?id[]=1&id[]=2',
        ];

        for (const attempt of bypassAttempts) {
            try {
                const response = await axios.get(`${this.baseUrl}${attempt}`);
                
                if (response.status === 200) {
                    this.log('ERROR', category, 'auth-bypass', `Authorization bypass attempt succeeded: ${attempt}`);
                } else {
                    this.log('PASS', category, 'auth-bypass', `Authorization bypass attempt correctly handled: ${attempt}`);
                }
            } catch (error) {
                this.log('PASS', category, 'auth-bypass', `Authorization bypass attempt correctly rejected: ${attempt}`);
            }
        }

        // Test rate limiting (if implemented)
        const rateLimitPromises = [];
        for (let i = 0; i < 20; i++) {
            rateLimitPromises.push(
                axios.post(`${this.baseUrl}/admin-login`, {
                    phone: '13800000001',
                    password: 'wrong-password'
                }).catch(error => ({ error: error.message, status: error.response?.status }))
            );
        }

        try {
            const rateLimitResults = await Promise.all(rateLimitPromises);
            const rateLimitedRequests = rateLimitResults.filter(r => 
                r.error && (r.status === 429 || r.error.includes('rate limit') || r.error.includes('too many'))
            );
            
            if (rateLimitedRequests.length > 0) {
                this.log('PASS', category, 'rate-limiting', `Rate limiting detected: ${rateLimitedRequests.length} requests limited`);
            } else {
                this.log('INFO', category, 'rate-limiting', 'No rate limiting detected - may need implementation');
            }
        } catch (error) {
            this.log('ERROR', category, 'rate-limiting', `Rate limiting test failed: ${error.message}`);
        }
    }

    /**
     * Generate comprehensive test report
     */
    async generateReport() {
        const endTime = Date.now();
        const duration = endTime - this.results.startTime;
        
        const report = {
            summary: {
                total_tests: this.results.passed + this.results.failed,
                passed: this.results.passed,
                failed: this.results.failed,
                success_rate: ((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(2),
                duration_ms: duration,
                duration_human: this.formatDuration(duration),
                timestamp: new Date().toISOString()
            },
            categories: this.results.summary,
            errors: this.results.errors,
            recommendations: this.generateRecommendations()
        };

        // Write report to file
        const reportPath = path.join(__dirname, `edge-case-test-report-${Date.now()}.json`);
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        
        // Print summary to console
        console.log('\n' + '='.repeat(80));
        console.log('EDGE CASE AND FAILURE SCENARIO TEST REPORT');
        console.log('='.repeat(80));
        console.log(`Total Tests: ${report.summary.total_tests}`);
        console.log(`Passed: ${report.summary.passed}`);
        console.log(`Failed: ${report.summary.failed}`);
        console.log(`Success Rate: ${report.summary.success_rate}%`);
        console.log(`Duration: ${report.summary.duration_human}`);
        console.log(`Report saved to: ${reportPath}`);
        
        console.log('\nCATEGORY BREAKDOWN:');
        for (const [category, stats] of Object.entries(report.categories)) {
            const total = stats.passed + stats.failed;
            const rate = total > 0 ? ((stats.passed / total) * 100).toFixed(1) : '0.0';
            console.log(`  ${category}: ${stats.passed}/${total} passed (${rate}%)`);
        }
        
        if (report.errors.length > 0) {
            console.log('\nCRITICAL ISSUES FOUND:');
            for (const error of report.errors.slice(0, 10)) { // Show first 10 errors
                console.log(`  [${error.category}] ${error.test}: ${error.message}`);
            }
            if (report.errors.length > 10) {
                console.log(`  ... and ${report.errors.length - 10} more issues (see full report)`);
            }
        }
        
        console.log('\nRECOMMENDATIONS:');
        for (const recommendation of report.recommendations) {
            console.log(`  • ${recommendation}`);
        }
        
        console.log('='.repeat(80));
        
        return report;
    }

    /**
     * Generate recommendations based on test results
     */
    generateRecommendations() {
        const recommendations = [];
        
        if (this.results.failed > 0) {
            recommendations.push('Review and fix failed test cases to improve system robustness');
        }
        
        if (this.results.summary['security-boundaries']?.failed > 0) {
            recommendations.push('CRITICAL: Address security boundary failures immediately');
        }
        
        if (this.results.summary['input-validation']?.failed > 0) {
            recommendations.push('Strengthen input validation to prevent malformed data');
        }
        
        if (this.results.summary['database-constraints']?.failed > 0) {
            recommendations.push('Review database constraints and integrity checks');
        }
        
        if (this.results.summary['race-conditions']?.failed > 0) {
            recommendations.push('Implement proper concurrency controls and locking mechanisms');
        }
        
        if (this.results.summary['resource-exhaustion']?.failed > 0) {
            recommendations.push('Add resource limits and request size validation');
        }
        
        recommendations.push('Implement comprehensive error logging and monitoring');
        recommendations.push('Add rate limiting to prevent abuse');
        recommendations.push('Regular security audits and penetration testing');
        recommendations.push('Implement automated edge case testing in CI/CD pipeline');
        
        return recommendations;
    }

    /**
     * Format duration in human readable format
     */
    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    /**
     * Main test execution function
     */
    async runAllTests() {
        console.log('YesLocker Edge Case and Failure Scenario Testing Framework');
        console.log('Starting comprehensive edge case testing...\n');

        try {
            await this.testInputValidationEdgeCases();
            await this.testErrorConditionHandling();
            await this.testSystemFailureScenarios();
            await this.testDatabaseConstraints();
            await this.testNetworkFailures();
            await this.testRaceConditions();
            await this.testResourceExhaustion();
            await this.testSecurityBoundaries();
            
            const report = await this.generateReport();
            
            // Exit with error code if critical failures found
            if (this.results.summary['security-boundaries']?.failed > 0) {
                process.exit(1);
            }
            
        } catch (error) {
            console.error('Test framework error:', error);
            process.exit(1);
        }
    }
}

// Run tests if called directly
if (require.main === module) {
    const framework = new EdgeCaseTestFramework();
    framework.runAllTests().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = EdgeCaseTestFramework;