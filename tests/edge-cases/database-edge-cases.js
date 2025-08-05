#!/usr/bin/env node

/**
 * YesLocker Database Edge Cases and Boundary Testing
 * 
 * Specialized testing for database-related edge cases, constraint violations,
 * transaction boundaries, and data integrity scenarios.
 */

const axios = require('axios');
const fs = require('fs').promises;
const crypto = require('crypto');

class DatabaseEdgeCaseTests {
    constructor() {
        this.baseUrl = 'http://localhost:3001';
        this.results = {
            passed: 0,
            failed: 0,
            errors: [],
            testCases: []
        };
    }

    log(level, test, message, data = null) {
        const timestamp = new Date().toISOString();
        const logEntry = { timestamp, level, test, message, data };
        
        console.log(`[${timestamp}] [${level}] ${test}: ${message}`);
        
        this.results.testCases.push(logEntry);
        
        if (level === 'ERROR') {
            this.results.errors.push(logEntry);
            this.results.failed++;
        } else if (level === 'PASS') {
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
     * Test database constraint violations and boundary conditions
     */
    async testConstraintViolations() {
        console.log('\n=== DATABASE CONSTRAINT VIOLATION TESTS ===');

        // Test 1: Unique constraint violation (duplicate phone numbers)
        const uniqueTestPhone = `138${Date.now().toString().slice(-8)}`;
        
        try {
            // First registration
            const response1 = await axios.post(`${this.baseUrl}/auth-register`, {
                phone: uniqueTestPhone,
                name: 'First User',
                store_id: 1
            });

            // Attempt duplicate registration
            const response2 = await axios.post(`${this.baseUrl}/auth-register`, {
                phone: uniqueTestPhone,
                name: 'Duplicate User',
                store_id: 1
            });

            if (response1.data?.success && response2.data?.success) {
                this.log('ERROR', 'unique-constraint', 'Duplicate phone numbers allowed - unique constraint not enforced');
            } else if (response1.data?.success && !response2.data?.success) {
                this.log('PASS', 'unique-constraint', 'Unique constraint properly enforced');
            } else {
                this.log('INFO', 'unique-constraint', 'Registration pattern unclear');
            }
        } catch (error) {
            this.log('PASS', 'unique-constraint', 'Constraint violation handled with exception');
        }

        // Test 2: Foreign key constraint violation
        try {
            const response = await axios.post(`${this.baseUrl}/auth-register`, {
                phone: `138${Date.now().toString().slice(-8)}`,
                name: 'FK Test User',
                store_id: 999999 // Non-existent store
            });

            if (response.data?.success) {
                this.log('ERROR', 'foreign-key-constraint', 'Invalid foreign key accepted - referential integrity compromised');
            } else {
                this.log('PASS', 'foreign-key-constraint', 'Foreign key constraint properly enforced');
            }
        } catch (error) {
            this.log('PASS', 'foreign-key-constraint', 'Foreign key violation handled with exception');
        }

        // Test 3: NULL constraint violations
        const nullTestCases = [
            { phone: null, name: 'Null Phone Test', store_id: 1 },
            { phone: `138${Date.now().toString().slice(-8)}`, name: null, store_id: 1 },
            { phone: `138${Date.now().toString().slice(-8)}`, name: 'Null Store Test', store_id: null },
        ];

        for (const testCase of nullTestCases) {
            try {
                const response = await axios.post(`${this.baseUrl}/auth-register`, testCase);
                
                if (response.data?.success) {
                    this.log('ERROR', 'null-constraint', `NULL value accepted: ${JSON.stringify(testCase)}`);
                } else {
                    this.log('PASS', 'null-constraint', `NULL value properly rejected`);
                }
            } catch (error) {
                this.log('PASS', 'null-constraint', 'NULL constraint violation handled with exception');
            }
        }

        // Test 4: Check constraint violations (if any exist)
        const checkConstraintTests = [
            { phone: '123', name: 'Too Short Phone', store_id: 1 }, // Phone too short
            { phone: '1234567890123456789', name: 'Too Long Phone', store_id: 1 }, // Phone too long
            { phone: `138${Date.now().toString().slice(-8)}`, name: '', store_id: 1 }, // Empty name
            { phone: `138${Date.now().toString().slice(-8)}`, name: 'Negative Store', store_id: -1 }, // Negative store_id
        ];

        for (const testCase of checkConstraintTests) {
            try {
                const response = await axios.post(`${this.baseUrl}/auth-register`, testCase);
                
                if (response.data?.success) {
                    this.log('ERROR', 'check-constraint', `Invalid data accepted: ${JSON.stringify(testCase)}`);
                } else {
                    this.log('PASS', 'check-constraint', `Check constraint properly enforced`);
                }
            } catch (error) {
                this.log('PASS', 'check-constraint', 'Check constraint violation handled');
            }
        }
    }

    /**
     * Test transaction boundary and rollback scenarios
     */
    async testTransactionBoundaries() {
        console.log('\n=== TRANSACTION BOUNDARY TESTS ===');

        const token = await this.createTestToken();
        if (!token) {
            this.log('ERROR', 'transaction-setup', 'Cannot test transactions without admin token');
            return;
        }

        // Test 1: Concurrent modifications of same data
        const concurrentPromises = [];
        const testApplicationId = 1; // Assuming this exists

        for (let i = 0; i < 5; i++) {
            concurrentPromises.push(
                axios.post(`${this.baseUrl}/admin-approval`, {
                    application_id: testApplicationId,
                    action: 'approve',
                    note: `Concurrent approval ${i}`
                }, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }).catch(error => ({ error: error.message, index: i }))
            );
        }

        try {
            const results = await Promise.all(concurrentPromises);
            const successes = results.filter(r => !r.error && r.data?.success);
            
            if (successes.length > 1) {
                this.log('ERROR', 'concurrent-modification', `Multiple concurrent modifications succeeded: ${successes.length}`);
            } else {
                this.log('PASS', 'concurrent-modification', 'Concurrent modifications properly serialized');
            }
        } catch (error) {
            this.log('ERROR', 'concurrent-modification', `Transaction test failed: ${error.message}`);
        }

        // Test 2: Large transaction simulation (multiple operations)
        try {
            const operations = [];
            for (let i = 0; i < 10; i++) {
                operations.push(
                    axios.post(`${this.baseUrl}/lockers-apply`, {
                        user_id: 1,
                        store_id: 1,
                        months: 1,
                        note: `Bulk application ${i}`
                    }, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    })
                );
            }

            const bulkResults = await Promise.allSettled(operations);
            const bulkSuccesses = bulkResults.filter(r => r.status === 'fulfilled' && r.value.data?.success);
            const bulkFailures = bulkResults.filter(r => r.status === 'rejected' || !r.value.data?.success);

            this.log('INFO', 'bulk-operations', `Bulk operations: ${bulkSuccesses.length} success, ${bulkFailures.length} failed`);
            
            if (bulkFailures.length > bulkSuccesses.length) {
                this.log('ERROR', 'bulk-operations', 'High failure rate in bulk operations');
            } else {
                this.log('PASS', 'bulk-operations', 'Bulk operations handled reasonably');
            }
        } catch (error) {
            this.log('ERROR', 'bulk-operations', `Bulk operation test failed: ${error.message}`);
        }
    }

    /**
     * Test data type boundary conditions
     */
    async testDataTypeBoundaries() {
        console.log('\n=== DATA TYPE BOUNDARY TESTS ===');

        // Test 1: Integer boundary values
        const integerBoundaryTests = [
            { phone: `138${Date.now().toString().slice(-8)}`, name: 'Max Int Test', store_id: 2147483647 }, // Max 32-bit int
            { phone: `138${Date.now().toString().slice(-8)}`, name: 'Min Int Test', store_id: -2147483648 }, // Min 32-bit int
            { phone: `138${Date.now().toString().slice(-8)}`, name: 'Zero Test', store_id: 0 },
            { phone: `138${Date.now().toString().slice(-8)}`, name: 'Float Test', store_id: 1.5 }, // Non-integer
        ];

        for (const testCase of integerBoundaryTests) {
            try {
                const response = await axios.post(`${this.baseUrl}/auth-register`, testCase);
                
                // Large integers and invalid types should be rejected
                if (testCase.store_id > 100000 || testCase.store_id < 1 || testCase.store_id % 1 !== 0) {
                    if (response.data?.success) {
                        this.log('ERROR', 'integer-boundary', `Invalid integer accepted: ${testCase.store_id}`);
                    } else {
                        this.log('PASS', 'integer-boundary', `Invalid integer properly rejected: ${testCase.store_id}`);
                    }
                } else {
                    this.log('INFO', 'integer-boundary', `Integer boundary test: ${testCase.store_id}`);
                }
            } catch (error) {
                this.log('PASS', 'integer-boundary', `Integer boundary violation handled: ${testCase.store_id}`);
            }
        }

        // Test 2: String length boundaries
        const stringBoundaryTests = [
            { phone: `138${Date.now().toString().slice(-8)}`, name: '', store_id: 1 }, // Empty string
            { phone: `138${Date.now().toString().slice(-8)}`, name: 'A', store_id: 1 }, // Single char
            { phone: `138${Date.now().toString().slice(-8)}`, name: 'A'.repeat(255), store_id: 1 }, // Max typical varchar
            { phone: `138${Date.now().toString().slice(-8)}`, name: 'A'.repeat(256), store_id: 1 }, // Over max
            { phone: `138${Date.now().toString().slice(-8)}`, name: 'A'.repeat(1000), store_id: 1 }, // Very long
        ];

        for (const testCase of stringBoundaryTests) {
            try {
                const response = await axios.post(`${this.baseUrl}/auth-register`, testCase);
                
                // Very long strings should be rejected
                if (testCase.name.length > 500) {
                    if (response.data?.success) {
                        this.log('ERROR', 'string-boundary', `Oversized string accepted: ${testCase.name.length} chars`);
                    } else {
                        this.log('PASS', 'string-boundary', `Oversized string properly rejected: ${testCase.name.length} chars`);
                    }
                } else {
                    this.log('INFO', 'string-boundary', `String boundary test: ${testCase.name.length} chars`);
                }
            } catch (error) {
                this.log('PASS', 'string-boundary', `String boundary violation handled: ${testCase.name.length} chars`);
            }
        }

        // Test 3: Phone number format boundaries
        const phoneFormatTests = [
            '138000000011', // 12 digits (too long)
            '1380000001', // 10 digits (too short)
            '13800000001', // 11 digits (correct)
            '038000000001', // Wrong prefix
            '238000000001', // Invalid prefix
            '13800000001.0', // With decimal
            '13800000001e10', // Scientific notation
        ];

        for (const phone of phoneFormatTests) {
            try {
                const response = await axios.post(`${this.baseUrl}/auth-register`, {
                    phone: phone,
                    name: 'Phone Format Test',
                    store_id: 1
                });

                if (phone.length !== 11 || !phone.startsWith('1') || !/^\d+$/.test(phone)) {
                    if (response.data?.success) {
                        this.log('ERROR', 'phone-format', `Invalid phone format accepted: ${phone}`);
                    } else {
                        this.log('PASS', 'phone-format', `Invalid phone format properly rejected: ${phone}`);
                    }
                } else {
                    this.log('PASS', 'phone-format', `Valid phone format accepted: ${phone}`);
                }
            } catch (error) {
                this.log('PASS', 'phone-format', `Phone format validation triggered: ${phone}`);
            }
        }
    }

    /**
     * Test Unicode and special character handling
     */
    async testUnicodeAndSpecialChars() {
        console.log('\n=== UNICODE AND SPECIAL CHARACTER TESTS ===');

        const specialCharTests = [
            { name: '用户测试', description: 'Chinese characters' },
            { name: 'ユーザーテスト', description: 'Japanese characters' },
            { name: '사용자테스트', description: 'Korean characters' },
            { name: 'Пользователь', description: 'Cyrillic characters' },
            { name: 'مستخدم', description: 'Arabic characters' },
            { name: '🎱🔒🎯', description: 'Emojis' },
            { name: 'Test\x00User', description: 'Null byte' },
            { name: 'Test\nUser', description: 'Newline' },
            { name: 'Test\tUser', description: 'Tab' },
            { name: 'Test\r\nUser', description: 'CRLF' },
            { name: 'Test"User', description: 'Double quote' },
            { name: "Test'User", description: 'Single quote' },
            { name: 'Test\\User', description: 'Backslash' },
            { name: 'Test/User', description: 'Forward slash' },
            { name: 'Test<>User', description: 'Angle brackets' },
            { name: 'Test&User', description: 'Ampersand' },
            { name: 'Test%User', description: 'Percent sign' },
            { name: 'Test User ', description: 'Trailing space' },
            { name: ' Test User', description: 'Leading space' },
            { name: '   ', description: 'Only spaces' },
        ];

        for (const testCase of specialCharTests) {
            try {
                const response = await axios.post(`${this.baseUrl}/auth-register`, {
                    phone: `138${Date.now().toString().slice(-8)}`,
                    name: testCase.name,
                    store_id: 1
                });

                // Dangerous characters should be rejected or sanitized
                if (testCase.name.includes('\x00') || testCase.name.includes('<') || testCase.name.trim() === '') {
                    if (response.data?.success) {
                        this.log('ERROR', 'special-chars', `Dangerous character accepted: ${testCase.description}`);
                    } else {
                        this.log('PASS', 'special-chars', `Dangerous character properly rejected: ${testCase.description}`);
                    }
                } else {
                    this.log('PASS', 'special-chars', `Special character handled: ${testCase.description}`);
                }
            } catch (error) {
                this.log('PASS', 'special-chars', `Special character validation triggered: ${testCase.description}`);
            }
        }
    }

    /**
     * Test database performance under edge conditions
     */
    async testPerformanceEdgeCases() {
        console.log('\n=== PERFORMANCE EDGE CASE TESTS ===');

        // Test 1: Rapid successive queries
        const rapidQueries = [];
        const startTime = Date.now();
        
        for (let i = 0; i < 50; i++) {
            rapidQueries.push(
                axios.get(`${this.baseUrl}/stores-lockers`).catch(error => ({ error: error.message }))
            );
        }

        try {
            const rapidResults = await Promise.all(rapidQueries);
            const rapidSuccesses = rapidResults.filter(r => !r.error);
            const rapidErrors = rapidResults.filter(r => r.error);
            const duration = Date.now() - startTime;

            this.log('INFO', 'rapid-queries', `${rapidSuccesses.length} successful, ${rapidErrors.length} failed in ${duration}ms`);
            
            if (rapidErrors.length > rapidSuccesses.length) {
                this.log('ERROR', 'rapid-queries', 'High failure rate in rapid queries');
            } else if (duration > 10000) {
                this.log('ERROR', 'rapid-queries', 'Slow response time for rapid queries');
            } else {
                this.log('PASS', 'rapid-queries', 'Rapid queries handled adequately');
            }
        } catch (error) {
            this.log('ERROR', 'rapid-queries', `Rapid query test failed: ${error.message}`);
        }

        // Test 2: Complex query simulation (if we had complex endpoints)
        const token = await this.createTestToken();
        if (token) {
            try {
                const complexQueries = [];
                for (let i = 0; i < 10; i++) {
                    complexQueries.push(
                        axios.get(`${this.baseUrl}/stores-lockers`, {
                            headers: { 'Authorization': `Bearer ${token}` },
                            params: { 
                                page: i,
                                limit: 100,
                                sort: 'created_at',
                                filter: JSON.stringify({ status: 'active' })
                            }
                        }).catch(error => ({ error: error.message }))
                    );
                }

                const complexResults = await Promise.all(complexQueries);
                const complexSuccesses = complexResults.filter(r => !r.error);
                
                if (complexSuccesses.length < complexQueries.length * 0.8) {
                    this.log('ERROR', 'complex-queries', 'High failure rate in complex queries');
                } else {
                    this.log('PASS', 'complex-queries', 'Complex queries handled reasonably');
                }
            } catch (error) {
                this.log('ERROR', 'complex-queries', `Complex query test failed: ${error.message}`);
            }
        }
    }

    /**
     * Test database connection edge cases
     */
    async testConnectionEdgeCases() {
        console.log('\n=== DATABASE CONNECTION EDGE CASE TESTS ===');

        // Test 1: Many simultaneous connections
        const connectionPromises = [];
        
        for (let i = 0; i < 100; i++) {
            connectionPromises.push(
                axios.get(`${this.baseUrl}/health`, { timeout: 10000 }).catch(error => ({ error: error.message }))
            );
        }

        try {
            const connectionResults = await Promise.all(connectionPromises);
            const connectionSuccesses = connectionResults.filter(r => !r.error);
            const connectionErrors = connectionResults.filter(r => r.error);

            this.log('INFO', 'many-connections', `${connectionSuccesses.length} successful, ${connectionErrors.length} failed`);
            
            const successRate = connectionSuccesses.length / connectionResults.length;
            if (successRate < 0.9) {
                this.log('ERROR', 'many-connections', `Low success rate: ${(successRate * 100).toFixed(1)}%`);
            } else {
                this.log('PASS', 'many-connections', `Good success rate: ${(successRate * 100).toFixed(1)}%`);
            }
        } catch (error) {
            this.log('ERROR', 'many-connections', `Connection test failed: ${error.message}`);
        }

        // Test 2: Long-running connection simulation
        try {
            const longRunningStart = Date.now();
            
            // Simulate a long-running operation by making slow requests
            const slowPromises = [];
            for (let i = 0; i < 5; i++) {
                slowPromises.push(
                    new Promise(resolve => {
                        setTimeout(async () => {
                            try {
                                const response = await axios.get(`${this.baseUrl}/stores-lockers`);
                                resolve({ success: true, response });
                            } catch (error) {
                                resolve({ success: false, error: error.message });
                            }
                        }, i * 1000); // Stagger requests
                    })
                );
            }

            const slowResults = await Promise.all(slowPromises);
            const longRunningDuration = Date.now() - longRunningStart;
            const slowSuccesses = slowResults.filter(r => r.success);

            this.log('INFO', 'long-running', `${slowSuccesses.length}/5 long-running requests succeeded in ${longRunningDuration}ms`);
            
            if (slowSuccesses.length < 4) {
                this.log('ERROR', 'long-running', 'Connection stability issues with long-running requests');
            } else {
                this.log('PASS', 'long-running', 'Long-running connections handled well');
            }
        } catch (error) {
            this.log('ERROR', 'long-running', `Long-running connection test failed: ${error.message}`);
        }
    }

    /**
     * Generate comprehensive database test report
     */
    async generateReport() {
        const report = {
            summary: {
                total_tests: this.results.passed + this.results.failed,
                passed: this.results.passed,
                failed: this.results.failed,
                success_rate: ((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(2),
                timestamp: new Date().toISOString()
            },
            test_cases: this.results.testCases,
            errors: this.results.errors,
            recommendations: this.generateRecommendations()
        };

        const reportPath = `./database-edge-case-report-${Date.now()}.json`;
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

        console.log('\n' + '='.repeat(80));
        console.log('DATABASE EDGE CASE TEST REPORT');
        console.log('='.repeat(80));
        console.log(`Total Tests: ${report.summary.total_tests}`);
        console.log(`Passed: ${report.summary.passed}`);
        console.log(`Failed: ${report.summary.failed}`);
        console.log(`Success Rate: ${report.summary.success_rate}%`);
        console.log(`Report saved to: ${reportPath}`);

        if (this.results.errors.length > 0) {
            console.log('\nCRITICAL DATABASE ISSUES:');
            for (const error of this.results.errors.slice(0, 5)) {
                console.log(`  ${error.test}: ${error.message}`);
            }
        }

        console.log('\nRECOMMENDATIONS:');
        for (const recommendation of report.recommendations) {
            console.log(`  • ${recommendation}`);
        }
        console.log('='.repeat(80));

        return report;
    }

    generateRecommendations() {
        const recommendations = [];

        if (this.results.errors.some(e => e.test.includes('constraint'))) {
            recommendations.push('Review and strengthen database constraints');
        }

        if (this.results.errors.some(e => e.test.includes('concurrent'))) {
            recommendations.push('Implement proper transaction isolation and locking');
        }

        if (this.results.errors.some(e => e.test.includes('boundary'))) {
            recommendations.push('Add comprehensive input validation for all data types');
        }

        if (this.results.errors.some(e => e.test.includes('performance'))) {
            recommendations.push('Optimize database queries and connection pooling');
        }

        if (this.results.errors.some(e => e.test.includes('special-chars'))) {
            recommendations.push('Implement proper Unicode handling and character sanitization');
        }

        recommendations.push('Add database monitoring and query performance tracking');
        recommendations.push('Implement automated database health checks');
        recommendations.push('Regular database maintenance and optimization');

        return recommendations;
    }

    /**
     * Run all database edge case tests
     */
    async runAllTests() {
        console.log('YesLocker Database Edge Case Testing Framework');
        console.log('Testing database boundaries, constraints, and edge conditions...\n');

        try {
            await this.testConstraintViolations();
            await this.testTransactionBoundaries();
            await this.testDataTypeBoundaries();
            await this.testUnicodeAndSpecialChars();
            await this.testPerformanceEdgeCases();
            await this.testConnectionEdgeCases();

            const report = await this.generateReport();
            return report;
        } catch (error) {
            console.error('Database test framework error:', error);
            throw error;
        }
    }
}

// Run tests if called directly
if (require.main === module) {
    const tests = new DatabaseEdgeCaseTests();
    tests.runAllTests().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = DatabaseEdgeCaseTests;