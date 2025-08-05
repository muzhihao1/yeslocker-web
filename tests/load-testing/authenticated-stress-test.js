#!/usr/bin/env node

/**
 * Authenticated Stress Test - Tests with proper authentication
 * Handles admin token authentication for protected endpoints
 */

const http = require('http');
const { performance } = require('perf_hooks');

const CONFIG = {
  BASE_URL: 'http://localhost:3001',
  CONCURRENT_REQUESTS: 15,
  TOTAL_REQUESTS: 75,
  TIMEOUT: 10000
};

class AuthenticatedStressTest {
  constructor() {
    this.adminToken = null;
    this.results = [];
  }

  async makeRequest(method, path, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const startTime = performance.now();
      
      const options = {
        hostname: 'localhost',
        port: 3001,
        path: path,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'AuthenticatedStressTest/1.0',
          ...headers
        },
        timeout: CONFIG.TIMEOUT
      };

      const req = http.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          const endTime = performance.now();
          const responseTime = endTime - startTime;

          resolve({
            statusCode: res.statusCode,
            responseTime,
            data: responseData,
            success: res.statusCode >= 200 && res.statusCode < 400
          });
        });
      });

      req.on('error', (error) => {
        const endTime = performance.now();
        const responseTime = endTime - startTime;

        reject({
          error: error.message,
          responseTime,
          success: false
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject({
          error: 'Request timeout',
          responseTime: CONFIG.TIMEOUT,
          success: false
        });
      });

      if (data) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  async getAdminToken() {
    try {
      const response = await this.makeRequest('POST', '/admin-login', {
        phone: '13800000001',
        password: 'admin123'
      });

      if (response.success) {
        const data = JSON.parse(response.data);
        if (data.success && data.data.token) {
          this.adminToken = data.data.token;
          console.log('✅ Admin authentication successful');
          return true;
        }
      }
      
      console.error('❌ Admin authentication failed:', response);
      return false;
    } catch (error) {
      console.error('❌ Admin authentication error:', error);
      return false;
    }
  }

  async runTest(name, requestFunc, concurrent = CONFIG.CONCURRENT_REQUESTS) {
    console.log(`\n🔥 Running ${name}...`);
    
    const results = {
      name,
      total: 0,
      success: 0,
      failed: 0,
      responseTimes: [],
      errors: {}
    };

    const promises = [];
    const requestsPerBatch = Math.ceil(CONFIG.TOTAL_REQUESTS / concurrent);

    for (let batch = 0; batch < concurrent; batch++) {
      promises.push(this.runBatch(requestFunc, requestsPerBatch, results));
    }

    const startTime = performance.now();
    await Promise.allSettled(promises);
    const endTime = performance.now();

    const duration = (endTime - startTime) / 1000;
    
    // Calculate statistics
    const avgResponseTime = results.responseTimes.reduce((a, b) => a + b, 0) / results.responseTimes.length;
    const sortedTimes = results.responseTimes.sort((a, b) => a - b);
    const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
    const throughput = results.total / duration;

    console.log(`   ✅ Completed: ${results.success}/${results.total}`);
    console.log(`   ❌ Failed: ${results.failed}`);
    console.log(`   📊 Avg Response: ${avgResponseTime.toFixed(1)}ms`);
    console.log(`   📈 95th Percentile: ${p95.toFixed(1)}ms`);
    console.log(`   🚀 Throughput: ${throughput.toFixed(1)} req/s`);
    
    if (Object.keys(results.errors).length > 0) {
      console.log(`   🚨 Errors:`, results.errors);
    }

    return {
      ...results,
      duration,
      avgResponseTime,
      p95ResponseTime: p95,
      throughput,
      successRate: (results.success / results.total) * 100
    };
  }

  async runBatch(requestFunc, count, results) {
    for (let i = 0; i < count; i++) {
      try {
        const result = await requestFunc();
        
        results.total++;
        results.responseTimes.push(result.responseTime);
        
        if (result.success) {
          results.success++;
        } else {
          results.failed++;
          const errorKey = `HTTP_${result.statusCode || 'UNKNOWN'}`;
          results.errors[errorKey] = (results.errors[errorKey] || 0) + 1;
        }
      } catch (error) {
        results.total++;
        results.failed++;
        results.responseTimes.push(error.responseTime || CONFIG.TIMEOUT);
        
        const errorKey = error.error || 'UNKNOWN_ERROR';
        results.errors[errorKey] = (results.errors[errorKey] || 0) + 1;
      }

      // Small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 8));
    }
  }

  async runAllTests() {
    console.log('🚀 YesLocker Authenticated Stress Test Starting...');
    console.log(`📍 Target: ${CONFIG.BASE_URL}`);
    console.log(`⚙️  Config: ${CONFIG.CONCURRENT_REQUESTS} concurrent, ${CONFIG.TOTAL_REQUESTS} total requests\n`);

    // Step 1: Get admin token
    const authSuccess = await this.getAdminToken();
    if (!authSuccess) {
      console.error('❌ Cannot proceed without admin authentication');
      return [];
    }

    const testResults = [];

    // Test 1: Admin Login Performance
    testResults.push(await this.runTest('Admin Login Performance', async () => {
      return await this.makeRequest('POST', '/admin-login', {
        phone: '13800000001',
        password: 'admin123'
      });
    }));

    // Test 2: Admin Applications API (with auth)
    testResults.push(await this.runTest('Admin Applications API (Authenticated)', async () => {
      return await this.makeRequest('GET', '/api/admin-approval', null, {
        'Authorization': `Bearer ${this.adminToken}`
      });
    }));

    // Test 3: Admin Users API (with auth)
    testResults.push(await this.runTest('Admin Users API (Authenticated)', async () => {
      return await this.makeRequest('GET', '/api/admin-users', null, {
        'Authorization': `Bearer ${this.adminToken}`
      });
    }));

    // Test 4: User Registration with Proper Data
    testResults.push(await this.runTest('User Registration with Valid Data', async () => {
      return await this.makeRequest('POST', '/auth-register', {
        phone: '1380000' + Math.floor(Math.random() * 10000).toString().padStart(4, '0'),
        name: '测试用户' + Math.floor(Math.random() * 1000),
        store_id: ['1', '2', '3'][Math.floor(Math.random() * 3)]
      });
    }));

    // Test 5: Store Lockers API
    testResults.push(await this.runTest('Store Lockers API', async () => {
      return await this.makeRequest('GET', '/stores-lockers');
    }));

    // Test 6: Admin Approval Operations (with auth)
    testResults.push(await this.runTest('Admin Approval Operations', async () => {
      return await this.makeRequest('POST', '/api/admin-approval', {
        application_id: 'app_1',
        action: 'approve',
        assigned_locker_id: 'locker_002'
      }, {
        'Authorization': `Bearer ${this.adminToken}`
      });
    }));

    // Test 7: Mixed Authenticated Load Test
    testResults.push(await this.runTest('Mixed Authenticated Load Test', async () => {
      const endpoints = [
        { 
          method: 'GET', 
          path: '/api/admin-approval', 
          headers: { 'Authorization': `Bearer ${this.adminToken}` }
        },
        { 
          method: 'GET', 
          path: '/api/admin-users', 
          headers: { 'Authorization': `Bearer ${this.adminToken}` }
        },
        { 
          method: 'GET', 
          path: '/stores-lockers'
        },
        { 
          method: 'POST', 
          path: '/admin-login', 
          data: { phone: '13800000001', password: 'admin123' } 
        }
      ];
      
      const randomEndpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
      return await this.makeRequest(
        randomEndpoint.method, 
        randomEndpoint.path, 
        randomEndpoint.data || null,
        randomEndpoint.headers || {}
      );
    }));

    this.generateReport(testResults);
    return testResults;
  }

  generateReport(testResults) {
    console.log('\n' + '='.repeat(70));
    console.log('📊 AUTHENTICATED STRESS TEST SUMMARY');
    console.log('='.repeat(70));

    // Summary table
    console.log('\nTest Name'.padEnd(35) + 'Success%'.padEnd(10) + 'Avg(ms)'.padEnd(10) + 'P95(ms)'.padEnd(10) + 'RPS');
    console.log('-'.repeat(70));

    let overallIssues = [];
    let totalRequests = 0;
    let totalSuccessful = 0;
    let avgThroughput = 0;

    testResults.forEach(result => {
      console.log(
        result.name.substring(0, 34).padEnd(35) +
        result.successRate.toFixed(1).padEnd(10) +
        result.avgResponseTime.toFixed(0).padEnd(10) +
        result.p95ResponseTime.toFixed(0).padEnd(10) +
        result.throughput.toFixed(1)
      );

      totalRequests += result.total;
      totalSuccessful += result.success;
      avgThroughput += result.throughput;

      // Collect issues
      if (result.successRate < 90) {
        overallIssues.push(`${result.name}: Low success rate (${result.successRate.toFixed(1)}%)`);
      }
      if (result.avgResponseTime > 500) {
        overallIssues.push(`${result.name}: Slow response time (${result.avgResponseTime.toFixed(0)}ms)`);
      }
      if (result.throughput < 10) {
        overallIssues.push(`${result.name}: Low throughput (${result.throughput.toFixed(1)} req/s)`);
      }
    });

    // Overall statistics
    const overallSuccessRate = (totalSuccessful / totalRequests) * 100;
    avgThroughput = avgThroughput / testResults.length;

    console.log('\n📈 Overall Performance:');
    console.log(`   Total Requests: ${totalRequests}`);
    console.log(`   Overall Success Rate: ${overallSuccessRate.toFixed(1)}%`);
    console.log(`   Average Throughput: ${avgThroughput.toFixed(1)} req/s`);

    // Performance assessment
    console.log('\n🎯 Performance Assessment:');
    if (overallIssues.length === 0 && overallSuccessRate >= 95) {
      console.log('✅ EXCELLENT - System handles load well with proper authentication');
    } else if (overallIssues.length <= 2 && overallSuccessRate >= 85) {
      console.log('⚠️  GOOD - Minor performance issues detected');
    } else if (overallSuccessRate >= 70) {
      console.log('⚠️  NEEDS ATTENTION - Multiple performance issues detected');
    } else {
      console.log('❌ POOR PERFORMANCE - Critical issues detected');
    }

    if (overallIssues.length > 0) {
      console.log('\n🚨 Issues Found:');
      overallIssues.forEach(issue => console.log(`   • ${issue}`));
    }

    console.log('\n💡 Production Readiness:');
    if (overallSuccessRate >= 99 && avgThroughput >= 50) {
      console.log('✅ Ready for production deployment');
    } else if (overallSuccessRate >= 95 && avgThroughput >= 20) {
      console.log('⚠️  Ready with monitoring and scaling plan');
    } else {
      console.log('❌ Requires optimization before production');
    }

    console.log('\n📋 Recommendations:');
    console.log('   • Success rate > 99% required for production');
    console.log('   • Response times should be < 200ms for optimal UX');  
    console.log('   • Set up monitoring for authentication failures');
    console.log('   • Implement connection pooling for database');
    console.log('   • Consider Redis for session/token caching');

    console.log('\n' + '='.repeat(70));
  }
}

// Run the authenticated stress test
async function main() {
  const tester = new AuthenticatedStressTest();
  
  try {
    const results = await tester.runAllTests();
    
    // Exit with error code if performance is poor
    const hasIssues = results.some(r => r.successRate < 90 || r.avgResponseTime > 500);
    process.exit(hasIssues ? 1 : 0);
    
  } catch (error) {
    console.error('❌ Authenticated stress test failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = AuthenticatedStressTest;