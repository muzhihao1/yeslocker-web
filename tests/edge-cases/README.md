# YesLocker Edge Case and Failure Testing Framework

Comprehensive testing framework for validating production readiness through edge case testing, security boundary validation, database constraint verification, and failure scenario simulation.

## 🎯 Overview

This testing framework provides systematic validation of system behavior under edge cases, error conditions, and failure scenarios to ensure production robustness. It covers:

- **Input Validation Edge Cases** - Boundary values, malformed data, injection attempts
- **Database Constraint Testing** - Integrity checks, transaction boundaries, concurrency
- **Security Boundary Validation** - Authentication, authorization, injection vulnerabilities  
- **System Failure Simulation** - Network failures, resource exhaustion, cascading failures
- **Production Readiness Assessment** - Comprehensive scoring and deployment recommendations

## 📁 Framework Structure

```
tests/edge-cases/
├── comprehensive-edge-case-runner.js    # Master test orchestrator
├── edge-case-testing-framework.js       # General edge case testing
├── database-edge-cases.js               # Database-specific testing
├── security-boundary-tests.js           # Security vulnerability testing
├── failure-simulation-suite.js          # System resilience testing
└── README.md                            # This documentation
```

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ with npm/yarn
- YesLocker server running on `http://localhost:3001`
- Test admin account: `13800000001` / `admin123`
- Required npm packages: `axios`, `crypto`

### Run All Tests

```bash
# Install dependencies
npm install axios crypto

# Run comprehensive edge case testing
node tests/edge-cases/comprehensive-edge-case-runner.js
```

### Run Individual Test Suites

```bash
# General edge case testing
node tests/edge-cases/edge-case-testing-framework.js

# Database-specific edge cases
node tests/edge-cases/database-edge-cases.js

# Security boundary testing
node tests/edge-cases/security-boundary-tests.js

# Failure simulation testing
node tests/edge-cases/failure-simulation-suite.js
```

## 📊 Test Categories

### 1. Input Validation Edge Cases

**File:** `edge-case-testing-framework.js`

Tests system behavior with invalid, boundary, and malicious inputs:

- **Invalid Phone Numbers**: Empty, null, wrong format, injection attempts
- **Boundary Names**: Empty, oversized, special characters, XSS payloads
- **Store ID Edge Cases**: Null, negative, non-existent, SQL injection
- **Malformed JSON**: Incomplete, invalid syntax, oversized payloads
- **Unicode Handling**: Chinese characters, emojis, null bytes

```javascript
// Example: Test invalid phone number handling
const invalidPhones = [
    '', null, '123', '1234567890123456789', 'abc123',
    '138-0000-0001', "'; DROP TABLE users; --"
];

for (const phone of invalidPhones) {
    // Test registration with invalid phone
    const response = await axios.post('/auth-register', {
        phone: phone,
        name: 'Test User',
        store_id: 1
    });
    // Validate proper rejection
}
```

### 2. Database Constraint Testing

**File:** `database-edge-cases.js`

Validates database integrity, constraints, and transaction handling:

- **Unique Constraints**: Duplicate phone number prevention
- **Foreign Key Constraints**: Invalid store_id references
- **NULL Constraints**: Required field validation
- **Transaction Boundaries**: Concurrent modification handling
- **Data Type Boundaries**: Integer limits, string lengths
- **Unicode Support**: Multi-language character handling

```javascript
// Example: Test unique constraint violation
const testPhone = '13800000123';

// First registration (should succeed)
await axios.post('/auth-register', {
    phone: testPhone,
    name: 'First User',
    store_id: 1
});

// Duplicate registration (should fail)
const duplicateResponse = await axios.post('/auth-register', {
    phone: testPhone,
    name: 'Duplicate User', 
    store_id: 1
});

// Validate duplicate rejection
assert(!duplicateResponse.data.success);
```

### 3. Security Boundary Testing

**File:** `security-boundary-tests.js`

Comprehensive security vulnerability assessment:

#### SQL Injection Testing
- Classic injection: `' OR '1'='1`
- Union-based: `' UNION SELECT * FROM users--`
- Blind injection: Time and boolean-based attacks
- Second-order injection scenarios

#### XSS Vulnerability Testing
- Reflected XSS in error messages
- Stored XSS in user inputs
- DOM-based XSS attempts
- Filter bypass techniques

#### Authentication Bypass Testing
- SQL injection in login
- Brute force protection validation
- Token manipulation attempts
- Session hijacking simulation

#### Authorization Flaw Testing
- Privilege escalation attempts
- Insecure Direct Object Reference (IDOR)
- Missing authorization checks
- Token validation bypass

```javascript
// Example: SQL injection test
const sqlPayloads = [
    "' OR '1'='1",
    "'; DROP TABLE users; --",
    "' UNION SELECT * FROM users--"
];

for (const payload of sqlPayloads) {
    const response = await axios.post('/admin-login', {
        phone: payload,
        password: 'admin123'
    });
    
    // Should not succeed with injection
    assert(!response.data.success);
}
```

### 4. System Failure Simulation

**File:** `failure-simulation-suite.js`

Tests system resilience under various failure conditions:

#### Network Failure Simulation
- Connection timeouts
- Connection interruptions  
- DNS resolution failures
- Slow network conditions

#### Resource Exhaustion Testing
- Memory exhaustion (large payloads)
- Connection pool exhaustion
- CPU intensive operations
- Disk space limitations

#### Database Failure Scenarios
- Connection loss simulation
- Transaction deadlock testing
- Concurrent modification conflicts
- Query timeout handling

#### Cascading Failure Testing
- Circuit breaker behavior
- Graceful degradation
- Service dependency failures
- Bulk operation stress testing

```javascript
// Example: Resource exhaustion test
const connectionPromises = [];

// Test connection pool limits
for (let i = 0; i < 100; i++) {
    connectionPromises.push(
        axios.get('/health', { timeout: 10000 })
    );
}

const results = await Promise.all(connectionPromises);
const successRate = results.filter(r => r.status === 200).length / 100;

// Validate acceptable success rate under load
assert(successRate > 0.8, 'Connection pool handling inadequate');
```

## 📈 Production Readiness Scoring

The framework calculates a comprehensive production readiness score (0-100) based on:

### Scoring Factors

- **Test Success Rate** (40%): Percentage of tests passed
- **Critical Security Issues** (30%): Zero tolerance for critical vulnerabilities
- **System Resilience** (20%): Failure handling and recovery capability
- **Edge Case Handling** (10%): Boundary condition and input validation

### Readiness Levels

| Score | Level | Status | Recommendation |
|-------|-------|--------|----------------|
| 90-100 | EXCELLENT | READY | Approved for production |
| 80-89 | GOOD | READY | Minor improvements recommended |
| 70-79 | NEEDS_IMPROVEMENT | CONDITIONAL | Staging deployment first |
| 50-69 | SIGNIFICANT_ISSUES | NOT_READY | Major fixes required |
| 0-49 | MAJOR_OVERHAUL | NOT_READY | Comprehensive review needed |

### Critical Blockers

Automatic deployment blocking occurs for:

- **Critical Security Vulnerabilities**: SQL injection, XSS, auth bypass
- **System Instability**: >20% edge case failure rate
- **Data Integrity Issues**: Database constraint violations
- **Authentication Flaws**: Token manipulation, privilege escalation

## 📋 Report Generation

### Comprehensive Report Structure

```json
{
  "metadata": {
    "test_run_id": "edge-case-test-1704326400000",
    "timestamp": "2024-01-04T02:00:00.000Z",
    "duration_human": "15m 30s"
  },
  "executive_summary": {
    "production_readiness_score": 85,
    "readiness_status": "READY",
    "deployment_recommendation": "APPROVED FOR PRODUCTION DEPLOYMENT",
    "total_tests_executed": 247,
    "critical_issues": 0
  },
  "detailed_results": {
    "suite_results": { /* Individual suite results */ },
    "risk_assessment": [ /* Risk analysis */ ]
  },
  "next_steps": [ /* Recommended actions */ ]
}
```

### Generated Reports

1. **Detailed JSON Report**: Complete test results and analysis
2. **Executive Summary (Markdown)**: Management-friendly overview
3. **Individual Suite Reports**: Specific findings per test category

## 🔧 Configuration and Custom Tests

### Environment Configuration

```javascript
// Framework configuration
const config = {
    baseUrl: 'http://localhost:3001',
    testTimeout: 30000,
    maxRetries: 3,
    testCredentials: {
        adminPhone: '13800000001',
        adminPassword: 'admin123'
    }
};
```

### Adding Custom Tests

```javascript
// Example: Add custom edge case test
class CustomEdgeCaseTests extends EdgeCaseTestFramework {
    async testCustomScenario() {
        console.log('Testing custom scenario...');
        
        try {
            const response = await axios.post(`${this.baseUrl}/custom-endpoint`, {
                customData: 'test-value'
            });
            
            if (this.validateCustomResponse(response)) {
                this.log('PASS', 'custom-test', 'Custom scenario handled correctly');
            } else {
                this.log('FAIL', 'custom-test', 'Custom scenario failed validation');
            }
        } catch (error) {
            this.log('ERROR', 'custom-test', 'Custom scenario error', error.message);
        }
    }
}
```

## 🎛️ CI/CD Integration

### GitHub Actions Example

```yaml
name: Edge Case Testing

on: [push, pull_request]

jobs:
  edge-case-tests:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: npm install
      
    - name: Start test services
      run: |
        npm run start:test &
        sleep 30
        
    - name: Run edge case tests
      run: node tests/edge-cases/comprehensive-edge-case-runner.js
      
    - name: Upload test reports
      uses: actions/upload-artifact@v2
      if: always()
      with:
        name: edge-case-reports
        path: tests/edge-cases/*-report-*.json
```

### Jenkins Integration

```groovy
pipeline {
    agent any
    
    stages {
        stage('Edge Case Testing') {
            steps {
                script {
                    // Start services
                    sh 'npm run start:test &'
                    sleep 30
                    
                    // Run comprehensive tests
                    def testResult = sh(
                        script: 'node tests/edge-cases/comprehensive-edge-case-runner.js',
                        returnStatus: true
                    )
                    
                    // Archive reports
                    archiveArtifacts artifacts: 'tests/edge-cases/*-report-*.json'
                    
                    // Fail build if critical issues found
                    if (testResult != 0) {
                        error('Edge case testing failed - deployment blocked')
                    }
                }
            }
        }
    }
}
```

## 🚨 Emergency Response

### Critical Issue Response

When critical security issues are detected:

1. **Immediate Actions**:
   - Stop deployment pipeline
   - Notify security team
   - Create incident ticket

2. **Assessment**:
   - Review detailed vulnerability reports
   - Assess potential impact and exposure
   - Prioritize fixes by severity

3. **Remediation**:
   - Apply security patches
   - Re-run security boundary tests
   - Validate fixes with penetration testing

### High Failure Rate Response

When edge case failure rate >20%:

1. **Analysis**:
   - Review failed test cases
   - Identify common failure patterns
   - Check recent code changes

2. **Stabilization**:
   - Fix critical edge cases
   - Improve error handling
   - Add missing input validation

3. **Validation**:
   - Re-run failed test categories
   - Verify improved success rates
   - Monitor production metrics

## 📚 Best Practices

### Test Development

1. **Comprehensive Coverage**: Test both positive and negative cases
2. **Realistic Scenarios**: Base tests on actual user behavior patterns
3. **Incremental Testing**: Add new edge cases as issues are discovered
4. **Documentation**: Document expected behaviors and edge case handling

### Production Deployment

1. **Gradual Rollout**: Use canary deployments for conditional approvals
2. **Monitoring**: Implement comprehensive edge case monitoring
3. **Rollback Plans**: Prepare rapid rollback for production issues
4. **Regular Testing**: Schedule periodic edge case validation

### Maintenance

1. **Regular Updates**: Keep test scenarios current with new features
2. **Performance Review**: Monitor test execution times and optimize
3. **Security Updates**: Add new attack vectors as they emerge
4. **Team Training**: Ensure team understands edge case importance

## 🔍 Troubleshooting

### Common Issues

#### Test Environment Setup
```bash
# Ensure server is running
curl http://localhost:3001/health

# Check test credentials
node -e "
const axios = require('axios');
axios.post('http://localhost:3001/admin-login', {
  phone: '13800000001',
  password: 'admin123'
}).then(r => console.log('Auth:', r.data.success));
"
```

#### High Test Failure Rates
1. Check server logs for errors
2. Verify database connectivity
3. Ensure test data consistency
4. Review recent code changes

#### Performance Issues
1. Monitor test execution times
2. Check database query performance
3. Verify network connectivity
4. Review resource utilization

### Debug Mode

Enable detailed logging:

```bash
# Run with debug output
DEBUG=edge-case-testing node tests/edge-cases/comprehensive-edge-case-runner.js

# Save debug logs
node tests/edge-cases/comprehensive-edge-case-runner.js 2>&1 | tee debug.log
```

## 📞 Support and Contributing

### Getting Help

- Review test reports for specific failure details
- Check server logs for backend errors
- Consult security team for vulnerability questions
- Escalate critical issues to engineering leads

### Contributing New Tests

1. **Identify Edge Cases**: Document new scenarios to test
2. **Implement Tests**: Follow existing framework patterns
3. **Validate Results**: Ensure tests properly detect issues
4. **Document Changes**: Update this README with new test categories

### Reporting Issues

Include in bug reports:
- Test execution logs
- System configuration details
- Reproduction steps
- Expected vs actual behavior

---

**Framework Version:** 1.0.0  
**Last Updated:** 2024-01-04  
**Maintainer:** YesLocker Engineering Team