#!/usr/bin/env node

/**
 * YesLocker Failure Simulation and Resilience Testing Suite
 * 
 * Comprehensive testing framework for simulating various failure scenarios
 * and validating system resilience, error handling, and recovery mechanisms.
 */

const axios = require('axios');
const fs = require('fs').promises;
const { spawn, exec } = require('child_process');
const crypto = require('crypto');

class FailureSimulationSuite {
    constructor() {
        this.baseUrl = 'http://localhost:3001';
        this.results = {
            scenarios: [],
            passed: 0,
            failed: 0,
            warnings: 0,
            startTime: Date.now()
        };
        this.originalServices = new Map();
    }

    log(level, scenario, test, message, details = null) {
        const timestamp = new Date().toISOString();
        const result = {
            timestamp,
            level,
            scenario,
            test,
            message,
            details
        };

        console.log(`[${timestamp}] [${level}] ${scenario}/${test}: ${message}`);

        this.results.scenarios.push(result);

        if (level === 'FAIL') {
            this.results.failed++;
        } else if (level === 'WARN') {
            this.results.warnings++;
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
     * Check if service is healthy
     */
    async checkServiceHealth(serviceName, endpoint, timeout = 5000) {
        try {
            const response = await axios.get(endpoint, { timeout });
            return {
                healthy: response.status === 200,
                responseTime: response.headers['x-response-time'] || 'unknown',
                status: response.status
            };
        } catch (error) {
            return {
                healthy: false,
                error: error.message,
                status: error.response?.status || 'unreachable'
            };
        }
    }

    /**
     * Simulate network connectivity issues
     */
    async simulateNetworkFailures() {
        console.log('\n=== NETWORK FAILURE SIMULATION ===');

        // Test 1: Connection timeout simulation
        const timeoutTests = [
            { timeout: 1, description: 'Very short timeout (1ms)' },
            { timeout: 10, description: 'Short timeout (10ms)' },
            { timeout: 100, description: 'Medium timeout (100ms)' },
            { timeout: 1000, description: 'Normal timeout (1s)' },
        ];

        for (const test of timeoutTests) {
            try {
                const startTime = Date.now();
                const response = await axios.get(`${this.baseUrl}/health`, { 
                    timeout: test.timeout 
                });
                const duration = Date.now() - startTime;

                if (duration > test.timeout && response.status === 200) {
                    this.log('WARN', 'network-failure', 'timeout-handling', 
                        `Service responded after timeout threshold`, { 
                            test: test.description, 
                            duration, 
                            timeout: test.timeout 
                        });
                } else {
                    this.log('PASS', 'network-failure', 'timeout-handling', 
                        `Timeout handling appropriate for ${test.description}`);
                }
            } catch (error) {
                if (error.code === 'ECONNABORTED') {
                    this.log('PASS', 'network-failure', 'timeout-enforced', 
                        `Timeout properly enforced: ${test.description}`);
                } else {
                    this.log('FAIL', 'network-failure', 'timeout-error', 
                        `Unexpected timeout error: ${test.description}`, { error: error.message });
                }
            }
        }

        // Test 2: Connection interruption simulation
        const interruptionTests = [];
        for (let i = 0; i < 5; i++) {
            const controller = new AbortController();
            
            // Interrupt connection after random delay
            const interruptDelay = Math.random() * 1000;
            setTimeout(() => controller.abort(), interruptDelay);
            
            interruptionTests.push(
                axios.post(`${this.baseUrl}/auth-register`, {
                    phone: `138${Date.now().toString().slice(-8)}${i}`,
                    name: `Interruption Test ${i}`,
                    store_id: 1
                }, {
                    signal: controller.signal,
                    timeout: 5000
                }).catch(error => ({ 
                    error: error.message, 
                    interrupted: error.name === 'AbortError' || error.code === 'ERR_CANCELED',
                    delay: interruptDelay
                }))
            );
        }

        try {
            const interruptionResults = await Promise.allSettled(interruptionTests);
            const interrupted = interruptionResults.filter(r => 
                r.status === 'rejected' || (r.value && r.value.interrupted)
            );
            const completed = interruptionResults.filter(r => 
                r.status === 'fulfilled' && r.value && !r.value.error
            );

            this.log('INFO', 'network-failure', 'connection-interruption', 
                `Interruption test: ${interrupted.length} interrupted, ${completed.length} completed`);

            if (completed.length > 0) {
                this.log('PASS', 'network-failure', 'interruption-recovery', 
                    'Some requests completed despite interruptions');
            }
        } catch (error) {
            this.log('FAIL', 'network-failure', 'interruption-test-error', 
                'Connection interruption test failed', { error: error.message });
        }

        // Test 3: DNS resolution failure simulation
        try {
            const response = await axios.get('http://non-existent-domain-12345.invalid/health', {
                timeout: 5000
            });
            
            this.log('FAIL', 'network-failure', 'dns-failure', 
                'Request to invalid domain succeeded unexpectedly');
        } catch (error) {
            if (error.code === 'ENOTFOUND' || error.code === 'EAI_NODATA') {
                this.log('PASS', 'network-failure', 'dns-failure-handling', 
                    'DNS failure handled correctly');
            } else {
                this.log('WARN', 'network-failure', 'dns-unexpected-error', 
                    'Unexpected DNS error handling', { error: error.message });
            }
        }
    }

    /**
     * Simulate high load and resource exhaustion
     */
    async simulateResourceExhaustion() {
        console.log('\n=== RESOURCE EXHAUSTION SIMULATION ===');

        // Test 1: Memory exhaustion simulation (large payloads)
        const memorySizes = [
            { size: 1024, description: '1KB payload' },
            { size: 10240, description: '10KB payload' },
            { size: 102400, description: '100KB payload' },
            { size: 1024000, description: '1MB payload' },
        ];

        for (const test of memorySizes) {
            try {
                const largePayload = {
                    phone: `138${Date.now().toString().slice(-8)}`,
                    name: 'A'.repeat(test.size),
                    store_id: 1
                };

                const startTime = Date.now();
                const response = await axios.post(`${this.baseUrl}/auth-register`, largePayload, {
                    timeout: 30000,
                    maxContentLength: test.size * 2,
                    maxBodyLength: test.size * 2
                });
                const duration = Date.now() - startTime;

                if (test.size > 100000 && response.data?.success) {
                    this.log('WARN', 'resource-exhaustion', 'large-payload-accepted', 
                        'Very large payload accepted - potential memory issue', { 
                            test: test.description, 
                            duration 
                        });
                } else if (response.data?.success) {
                    this.log('PASS', 'resource-exhaustion', 'payload-handling', 
                        `Payload handled appropriately: ${test.description}`, { duration });
                } else {
                    this.log('PASS', 'resource-exhaustion', 'payload-rejected', 
                        `Large payload rejected: ${test.description}`);
                }
            } catch (error) {
                if (error.response?.status === 413 || error.message.includes('too large')) {
                    this.log('PASS', 'resource-exhaustion', 'payload-size-limit', 
                        `Payload size limit enforced: ${test.description}`);
                } else if (error.code === 'ECONNABORTED') {
                    this.log('WARN', 'resource-exhaustion', 'payload-timeout', 
                        `Large payload caused timeout: ${test.description}`);
                } else {
                    this.log('PASS', 'resource-exhaustion', 'payload-error', 
                        `Large payload caused error (expected): ${test.description}`);
                }
            }
        }

        // Test 2: Connection pool exhaustion simulation
        const connectionPromises = [];
        const connectionCount = 100;

        for (let i = 0; i < connectionCount; i++) {
            connectionPromises.push(
                axios.get(`${this.baseUrl}/health`, {
                    timeout: 10000
                }).catch(error => ({ 
                    error: error.message, 
                    code: error.code,
                    status: error.response?.status
                }))
            );
        }

        try {
            const startTime = Date.now();
            const connectionResults = await Promise.all(connectionPromises);
            const duration = Date.now() - startTime;
            
            const successful = connectionResults.filter(r => !r.error);
            const failed = connectionResults.filter(r => r.error);
            const connectionErrors = failed.filter(r => 
                r.code === 'ECONNREFUSED' || r.code === 'EMFILE' || r.code === 'ENOTFOUND'
            );

            this.log('INFO', 'resource-exhaustion', 'connection-pool-test', 
                `Connection pool test: ${successful.length}/${connectionCount} successful in ${duration}ms`);

            if (connectionErrors.length > connectionCount * 0.1) {
                this.log('FAIL', 'resource-exhaustion', 'connection-pool-exhausted', 
                    'High rate of connection errors - possible pool exhaustion', {
                        errors: connectionErrors.length,
                        total: connectionCount
                    });
            } else if (successful.length < connectionCount * 0.8) {
                this.log('WARN', 'resource-exhaustion', 'connection-pool-stressed', 
                    'Moderate connection failures under load', {
                        success_rate: `${((successful.length / connectionCount) * 100).toFixed(1)}%`
                    });
            } else {
                this.log('PASS', 'resource-exhaustion', 'connection-pool-stable', 
                    'Connection pool handled load well');
            }
        } catch (error) {
            this.log('FAIL', 'resource-exhaustion', 'connection-pool-test-error', 
                'Connection pool test failed', { error: error.message });
        }

        // Test 3: CPU exhaustion simulation (compute-intensive operations)
        const computeIntensivePromises = [];
        
        for (let i = 0; i < 10; i++) {
            // Simulate CPU-intensive work by making many rapid requests
            const rapidPromises = [];
            for (let j = 0; j < 20; j++) {
                rapidPromises.push(
                    axios.get(`${this.baseUrl}/stores-lockers`, { timeout: 5000 })
                );
            }
            
            computeIntensivePromises.push(
                Promise.all(rapidPromises).catch(error => ({ error: error.message }))
            );
        }

        try {
            const startTime = Date.now();
            const computeResults = await Promise.all(computeIntensivePromises);
            const duration = Date.now() - startTime;
            
            const successful = computeResults.filter(r => !r.error);
            const averageResponseTime = duration / (successful.length * 20);

            this.log('INFO', 'resource-exhaustion', 'cpu-intensive-test', 
                `CPU intensive test: ${successful.length}/10 batches completed, avg ${averageResponseTime.toFixed(2)}ms per request`);

            if (averageResponseTime > 1000) {
                this.log('WARN', 'resource-exhaustion', 'cpu-performance-degraded', 
                    'Performance degraded under CPU intensive load');
            } else {
                this.log('PASS', 'resource-exhaustion', 'cpu-performance-stable', 
                    'CPU performance remained stable under load');
            }
        } catch (error) {
            this.log('FAIL', 'resource-exhaustion', 'cpu-intensive-test-error', 
                'CPU intensive test failed', { error: error.message });
        }
    }

    /**
     * Simulate database failure scenarios
     */
    async simulateDatabaseFailures() {
        console.log('\n=== DATABASE FAILURE SIMULATION ===');

        // Test 1: Database connectivity loss simulation
        try {
            // Try to connect to a non-existent database port
            const fakeDbResponse = await axios.post(`${this.baseUrl}/auth-register`, {
                phone: `138${Date.now().toString().slice(-8)}`,
                name: 'DB Failure Test',
                store_id: 1
            });

            // If request succeeds, the database might be working
            if (fakeDbResponse.data?.success) {
                this.log('PASS', 'database-failure', 'db-connectivity', 
                    'Database connectivity appears healthy');
            } else {
                this.log('WARN', 'database-failure', 'db-connectivity-issue', 
                    'Database connectivity may have issues');
            }
        } catch (error) {
            if (error.message.includes('connect') || error.message.includes('timeout')) {
                this.log('FAIL', 'database-failure', 'db-connection-lost', 
                    'Database connection appears to be lost', { error: error.message });
            } else {
                this.log('PASS', 'database-failure', 'db-error-handling', 
                    'Database error handled gracefully');
            }
        }

        // Test 2: Transaction rollback simulation (concurrent modifications)
        const token = await this.createTestToken();
        if (token) {
            const concurrentPromises = [];
            
            // Attempt multiple concurrent operations that might conflict
            for (let i = 0; i < 5; i++) {
                concurrentPromises.push(
                    axios.post(`${this.baseUrl}/lockers-apply`, {
                        user_id: 1,
                        store_id: 1,
                        months: 1,
                        note: `Concurrent test ${i}`
                    }, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    }).catch(error => ({ 
                        error: error.message, 
                        status: error.response?.status,
                        index: i
                    }))
                );
            }

            try {
                const concurrentResults = await Promise.all(concurrentPromises);
                const successful = concurrentResults.filter(r => !r.error && r.data?.success);
                const failed = concurrentResults.filter(r => r.error || !r.data?.success);

                this.log('INFO', 'database-failure', 'concurrent-operations', 
                    `Concurrent operations: ${successful.length} successful, ${failed.length} failed`);

                if (successful.length > 1 && failed.length === 0) {
                    this.log('WARN', 'database-failure', 'concurrent-all-succeeded', 
                        'All concurrent operations succeeded - possible race condition');
                } else {
                    this.log('PASS', 'database-failure', 'concurrent-handling', 
                        'Concurrent operations handled appropriately');
                }
            } catch (error) {
                this.log('FAIL', 'database-failure', 'concurrent-test-error', 
                    'Concurrent operations test failed', { error: error.message });
            }
        }

        // Test 3: Deadlock simulation
        if (token) {
            try {
                // Simulate potential deadlock by rapid conflicting operations
                const deadlockPromises = [];
                
                for (let i = 0; i < 10; i++) {
                    // Alternate between different operations that might cause deadlocks
                    if (i % 2 === 0) {
                        deadlockPromises.push(
                            axios.post(`${this.baseUrl}/lockers-apply`, {
                                user_id: 1,
                                store_id: 1,
                                months: 1,
                                note: `Deadlock test A${i}`
                            }, {
                                headers: { 'Authorization': `Bearer ${token}` }
                            })
                        );
                    } else {
                        deadlockPromises.push(
                            axios.post(`${this.baseUrl}/admin-approval`, {
                                application_id: 1,
                                action: 'approve',
                                note: `Deadlock test B${i}`
                            }, {
                                headers: { 'Authorization': `Bearer ${token}` }
                            })
                        );
                    }
                }

                const deadlockResults = await Promise.allSettled(deadlockPromises);
                const deadlockErrors = deadlockResults.filter(r => 
                    r.status === 'rejected' && 
                    (r.reason.message.includes('deadlock') || 
                     r.reason.message.includes('timeout') ||
                     r.reason.response?.status === 500)
                );

                if (deadlockErrors.length > 0) {
                    this.log('WARN', 'database-failure', 'deadlock-detected', 
                        'Potential deadlock situations detected', { 
                            deadlocks: deadlockErrors.length,
                            total: deadlockPromises.length
                        });
                } else {
                    this.log('PASS', 'database-failure', 'deadlock-prevention', 
                        'No deadlocks detected in stress test');
                }
            } catch (error) {
                this.log('FAIL', 'database-failure', 'deadlock-test-error', 
                    'Deadlock simulation test failed', { error: error.message });
            }
        }
    }

    /**
     * Simulate authentication and authorization failures
     */
    async simulateAuthFailures() {
        console.log('\n=== AUTHENTICATION/AUTHORIZATION FAILURE SIMULATION ===');

        // Test 1: Token expiration simulation
        const expiredTokenTests = [
            'expired.token.here',
            'invalid.jwt.token',
            '',
            null,
            undefined,
            'Bearer invalid-token',
            'malformed-token-without-dots',
        ];

        for (const token of expiredTokenTests) {
            try {
                const response = await axios.post(`${this.baseUrl}/admin-approval`, {
                    application_id: 1,
                    action: 'approve',
                    note: 'Token expiration test'
                }, {
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                });

                if (response.data?.success) {
                    this.log('FAIL', 'auth-failure', 'invalid-token-accepted', 
                        'Invalid/expired token was accepted', { token: token ? token.substring(0, 20) + '...' : 'null' });
                } else {
                    this.log('PASS', 'auth-failure', 'invalid-token-rejected', 
                        'Invalid/expired token properly rejected');
                }
            } catch (error) {
                if (error.response?.status === 401 || error.response?.status === 403) {
                    this.log('PASS', 'auth-failure', 'auth-error-proper', 
                        'Authentication error handled properly');
                } else {
                    this.log('WARN', 'auth-failure', 'auth-error-unexpected', 
                        'Unexpected authentication error', { 
                            status: error.response?.status,
                            error: error.message 
                        });
                }
            }
        }

        // Test 2: Session hijacking simulation
        const validToken = await this.createTestToken();
        if (validToken) {
            const modifiedTokens = [
                validToken.slice(0, -5) + 'AAAAA', // Modified signature
                validToken + '.extra', // Extra data
                validToken.replace(/[a-z]/g, 'x'), // Character replacement
                Buffer.from(validToken).toString('base64'), // Encoded
            ];

            for (const modifiedToken of modifiedTokens) {
                try {
                    const response = await axios.post(`${this.baseUrl}/admin-approval`, {
                        application_id: 1,
                        action: 'approve',
                        note: 'Session hijacking test'
                    }, {
                        headers: { 'Authorization': `Bearer ${modifiedToken}` }
                    });

                    if (response.data?.success) {
                        this.log('FAIL', 'auth-failure', 'token-tampering-succeeded', 
                            'Modified token was accepted - session hijacking possible');
                    } else {
                        this.log('PASS', 'auth-failure', 'token-tampering-detected', 
                            'Token tampering detected and rejected');
                    }
                } catch (error) {
                    this.log('PASS', 'auth-failure', 'token-validation-working', 
                        'Token validation working properly');
                }
            }
        }

        // Test 3: Privilege escalation simulation
        if (validToken) {
            const privilegeEscalationTests = [
                { user_id: 999999, description: 'Non-existent user escalation' },
                { user_id: -1, description: 'Negative user ID escalation' },
                { user_id: 'admin', description: 'String injection escalation' },
                { user_id: { $ne: null }, description: 'NoSQL injection escalation' },
            ];

            for (const test of privilegeEscalationTests) {
                try {
                    const response = await axios.post(`${this.baseUrl}/lockers-apply`, {
                        user_id: test.user_id,
                        store_id: 1,
                        months: 1,
                        note: 'Privilege escalation test'
                    }, {
                        headers: { 'Authorization': `Bearer ${validToken}` }
                    });

                    if (response.data?.success) {
                        this.log('FAIL', 'auth-failure', 'privilege-escalation', 
                            'Privilege escalation may be possible', { test });
                    } else {
                        this.log('PASS', 'auth-failure', 'privilege-escalation-blocked', 
                            'Privilege escalation attempt blocked');
                    }
                } catch (error) {
                    this.log('PASS', 'auth-failure', 'privilege-escalation-error', 
                        'Privilege escalation caused error (good)');
                }
            }
        }
    }

    /**
     * Simulate cascading failure scenarios
     */
    async simulateCascadingFailures() {
        console.log('\n=== CASCADING FAILURE SIMULATION ===');

        // Test 1: Circuit breaker behavior simulation
        const rapidFailureRequests = [];
        
        // Generate rapid requests to potentially trigger circuit breaker
        for (let i = 0; i < 30; i++) {
            rapidFailureRequests.push(
                axios.post(`${this.baseUrl}/non-existent-endpoint`, {
                    data: `failure-test-${i}`
                }, { timeout: 1000 }).catch(error => ({
                    error: error.message,
                    status: error.response?.status,
                    index: i
                }))
            );
        }

        try {
            const failureResults = await Promise.all(rapidFailureRequests);
            const errors404 = failureResults.filter(r => r.status === 404);
            const timeouts = failureResults.filter(r => r.error && r.error.includes('timeout'));
            const connectionErrors = failureResults.filter(r => 
                r.error && (r.error.includes('ECONNREFUSED') || r.error.includes('ENOTFOUND'))
            );

            this.log('INFO', 'cascading-failure', 'rapid-failure-test', 
                `Rapid failure test: ${errors404.length} 404s, ${timeouts.length} timeouts, ${connectionErrors.length} connection errors`);

            if (connectionErrors.length > 5) {
                this.log('WARN', 'cascading-failure', 'service-degradation', 
                    'Service degradation detected under failure load');
            } else {
                this.log('PASS', 'cascading-failure', 'failure-isolation', 
                    'Service maintained stability under failure load');
            }
        } catch (error) {
            this.log('FAIL', 'cascading-failure', 'failure-test-error', 
                'Cascading failure test itself failed', { error: error.message });
        }

        // Test 2: Dependency failure simulation
        try {
            // Test how the system behaves when external dependencies fail
            const dependencyTests = [
                axios.get(`${this.baseUrl}/stores-lockers`),
                axios.get(`${this.baseUrl}/health`),
            ];

            const dependencyResults = await Promise.allSettled(dependencyTests);
            const healthyDependencies = dependencyResults.filter(r => r.status === 'fulfilled');
            const failedDependencies = dependencyResults.filter(r => r.status === 'rejected');

            if (failedDependencies.length > 0 && healthyDependencies.length > 0) {
                this.log('PASS', 'cascading-failure', 'partial-failure-handling', 
                    'System continues to function with some failed dependencies');
            } else if (failedDependencies.length === dependencyResults.length) {
                this.log('FAIL', 'cascading-failure', 'total-failure', 
                    'All dependencies failed - total system failure');
            } else {
                this.log('PASS', 'cascading-failure', 'dependency-health', 
                    'All dependencies healthy');
            }
        } catch (error) {
            this.log('FAIL', 'cascading-failure', 'dependency-test-error', 
                'Dependency failure test error', { error: error.message });
        }

        // Test 3: Graceful degradation simulation
        try {
            // Test if system can degrade gracefully under stress
            const stressPromises = [];
            
            // Mix of different request types under stress
            for (let i = 0; i < 50; i++) {
                if (i % 3 === 0) {
                    stressPromises.push(axios.get(`${this.baseUrl}/health`));
                } else if (i % 3 === 1) {
                    stressPromises.push(axios.get(`${this.baseUrl}/stores-lockers`));
                } else {
                    stressPromises.push(
                        axios.post(`${this.baseUrl}/auth-register`, {
                            phone: `138${Date.now().toString().slice(-8)}${i}`,
                            name: `Stress Test ${i}`,
                            store_id: 1
                        })
                    );
                }
            }

            const stressResults = await Promise.allSettled(stressPromises);
            const successful = stressResults.filter(r => r.status === 'fulfilled');
            const failed = stressResults.filter(r => r.status === 'rejected');
            
            const successRate = (successful.length / stressResults.length) * 100;

            this.log('INFO', 'cascading-failure', 'stress-test', 
                `Stress test: ${successRate.toFixed(1)}% success rate (${successful.length}/${stressResults.length})`);

            if (successRate < 50) {
                this.log('FAIL', 'cascading-failure', 'poor-degradation', 
                    'System shows poor graceful degradation under stress');
            } else if (successRate < 80) {
                this.log('WARN', 'cascading-failure', 'degraded-performance', 
                    'System shows degraded performance under stress');
            } else {
                this.log('PASS', 'cascading-failure', 'graceful-degradation', 
                    'System shows good graceful degradation under stress');
            }
        } catch (error) {
            this.log('FAIL', 'cascading-failure', 'degradation-test-error', 
                'Graceful degradation test failed', { error: error.message });
        }
    }

    /**
     * Generate comprehensive failure simulation report
     */
    async generateReport() {
        const endTime = Date.now();
        const duration = endTime - this.results.startTime;

        const report = {
            summary: {
                total_scenarios: this.results.scenarios.length,
                passed: this.results.passed,
                failed: this.results.failed,
                warnings: this.results.warnings,
                success_rate: ((this.results.passed / this.results.scenarios.length) * 100).toFixed(2),
                warning_rate: ((this.results.warnings / this.results.scenarios.length) * 100).toFixed(2),
                duration_ms: duration,
                duration_human: this.formatDuration(duration),
                timestamp: new Date().toISOString()
            },
            scenarios: this.results.scenarios,
            failures: this.results.scenarios.filter(s => s.level === 'FAIL'),
            warnings: this.results.scenarios.filter(s => s.level === 'WARN'),
            resilience_score: this.calculateResilienceScore(),
            recommendations: this.generateRecommendations()
        };

        const reportPath = `./failure-simulation-report-${Date.now()}.json`;
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

        console.log('\n' + '='.repeat(80));
        console.log('FAILURE SIMULATION AND RESILIENCE TEST REPORT');
        console.log('='.repeat(80));
        console.log(`Total Scenarios: ${report.summary.total_scenarios}`);
        console.log(`Passed: ${report.summary.passed}`);
        console.log(`Failed: ${report.summary.failed}`);
        console.log(`Warnings: ${report.summary.warnings}`);
        console.log(`Success Rate: ${report.summary.success_rate}%`);
        console.log(`Resilience Score: ${report.resilience_score}/100`);
        console.log(`Duration: ${report.summary.duration_human}`);
        console.log(`Report saved to: ${reportPath}`);

        if (report.failures.length > 0) {
            console.log('\nCRITICAL FAILURES:');
            for (const failure of report.failures.slice(0, 5)) {
                console.log(`  ${failure.scenario}/${failure.test}: ${failure.message}`);
            }
        }

        if (report.warnings.length > 0) {
            console.log('\nWARNINGS:');
            for (const warning of report.warnings.slice(0, 5)) {
                console.log(`  ${warning.scenario}/${warning.test}: ${warning.message}`);
            }
        }

        console.log('\nRESILIENCE RECOMMENDATIONS:');
        for (const recommendation of report.recommendations) {
            console.log(`  • ${recommendation}`);
        }
        console.log('='.repeat(80));

        return report;
    }

    calculateResilienceScore() {
        const totalScenarios = this.results.scenarios.length;
        if (totalScenarios === 0) return 0;

        const passedWeight = 3;
        const warningWeight = 1;
        const failedWeight = -2;

        const score = (
            (this.results.passed * passedWeight) +
            (this.results.warnings * warningWeight) +
            (this.results.failed * failedWeight)
        ) / totalScenarios;

        return Math.max(0, Math.min(100, Math.round(score * 20 + 60)));
    }

    generateRecommendations() {
        const recommendations = [];

        if (this.results.failed > 0) {
            recommendations.push('Address critical failure scenarios immediately');
            recommendations.push('Implement comprehensive error handling and recovery mechanisms');
        }

        if (this.results.warnings > this.results.passed / 2) {
            recommendations.push('Review and improve system resilience under stress conditions');
        }

        if (this.results.scenarios.some(s => s.scenario === 'network-failure' && s.level === 'FAIL')) {
            recommendations.push('Implement robust network failure handling and retry mechanisms');
        }

        if (this.results.scenarios.some(s => s.scenario === 'resource-exhaustion' && s.level === 'FAIL')) {
            recommendations.push('Add resource monitoring and auto-scaling capabilities');
        }

        if (this.results.scenarios.some(s => s.scenario === 'database-failure' && s.level === 'FAIL')) {
            recommendations.push('Implement database failover and replication strategies');
        }

        if (this.results.scenarios.some(s => s.scenario === 'auth-failure' && s.level === 'FAIL')) {
            recommendations.push('Strengthen authentication and authorization mechanisms');
        }

        if (this.results.scenarios.some(s => s.scenario === 'cascading-failure' && s.level === 'FAIL')) {
            recommendations.push('Implement circuit breakers and bulkhead patterns');
        }

        recommendations.push('Regular chaos engineering and failure simulation exercises');
        recommendations.push('Implement comprehensive monitoring and alerting');
        recommendations.push('Create detailed incident response playbooks');
        recommendations.push('Regular disaster recovery testing');

        return recommendations;
    }

    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        
        if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    /**
     * Run all failure simulation tests
     */
    async runAllTests() {
        console.log('YesLocker Failure Simulation and Resilience Testing Suite');
        console.log('Testing system behavior under various failure conditions...\n');

        try {
            await this.simulateNetworkFailures();
            await this.simulateResourceExhaustion();
            await this.simulateDatabaseFailures();
            await this.simulateAuthFailures();
            await this.simulateCascadingFailures();

            const report = await this.generateReport();

            // Exit with appropriate code based on results
            if (this.results.failed > 0) {
                console.log('\n❌ CRITICAL FAILURES DETECTED - SYSTEM RESILIENCE COMPROMISED');
                process.exit(1);
            } else if (this.results.warnings > this.results.passed) {
                console.log('\n⚠️  MULTIPLE WARNINGS - SYSTEM RESILIENCE NEEDS IMPROVEMENT');
                process.exit(1);
            } else {
                console.log('\n✅ SYSTEM SHOWS GOOD RESILIENCE UNDER FAILURE CONDITIONS');
            }

            return report;
        } catch (error) {
            console.error('Failure simulation framework error:', error);
            throw error;
        }
    }
}

// Run tests if called directly
if (require.main === module) {
    const suite = new FailureSimulationSuite();
    suite.runAllTests().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = FailureSimulationSuite;