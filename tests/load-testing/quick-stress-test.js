#!/usr/bin/env node

/**
 * Quick Stress Test - Validates basic API performance
 * Run this to quickly check if the system can handle basic load
 */

const http = require('http');
const { performance } = require('perf_hooks');

const CONFIG = {
  BASE_URL: 'http://localhost:3001',
  CONCURRENT_REQUESTS: 20,
  TOTAL_REQUESTS: 100,
  TIMEOUT: 10000
};

class QuickStressTest {
  constructor() {
    this.results = {
      total: 0,
      success: 0,
      failed: 0,
      responseTimes: [],
      errors: {}
    };
  }

  async makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
      const startTime = performance.now();
      
      const options = {
        hostname: 'localhost',
        port: 3001,
        path: path,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'QuickStressTest/1.0'
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
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  async runAllTests() {
    console.log('🚀 YesLocker Quick Stress Test Starting...');
    console.log(`📍 Target: ${CONFIG.BASE_URL}`);
    console.log(`⚙️  Config: ${CONFIG.CONCURRENT_REQUESTS} concurrent, ${CONFIG.TOTAL_REQUESTS} total requests\n`);

    const testResults = [];

    // Test 1: Admin Login
    testResults.push(await this.runTest('Admin Login Stress Test', async () => {
      return await this.makeRequest('POST', '/admin-login', {
        phone: '13800000001',
        password: 'admin123'
      });
    }));

    // Test 2: Admin Applications List
    testResults.push(await this.runTest('Admin Applications API', async () => {
      return await this.makeRequest('GET', '/api/admin-approval');
    }));

    // Test 3: Admin Users List  
    testResults.push(await this.runTest('Admin Users API', async () => {
      return await this.makeRequest('GET', '/api/admin-users');
    }));

    // Test 4: User Registration (will fail but tests endpoint)
    testResults.push(await this.runTest('User Registration Load', async () => {
      return await this.makeRequest('POST', '/auth-register', {
        phone: '1380000' + Math.floor(Math.random() * 10000).toString().padStart(4, '0'),
        name: '测试用户',
        store_id: '1'
      });
    }));

    // Test 5: Mixed load test
    testResults.push(await this.runTest('Mixed API Load Test', async () => {
      const endpoints = [
        { method: 'GET', path: '/api/admin-approval' },
        { method: 'GET', path: '/api/admin-users' },
        { method: 'POST', path: '/admin-login', data: { phone: '13800000001', password: 'admin123' } }
      ];
      
      const randomEndpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
      return await this.makeRequest(randomEndpoint.method, randomEndpoint.path, randomEndpoint.data);
    }));

    this.generateReport(testResults);
    return testResults;
  }

  generateReport(testResults) {
    console.log('\n' + '='.repeat(60));
    console.log('📊 QUICK STRESS TEST SUMMARY');
    console.log('='.repeat(60));

    // Summary table
    console.log('\nTest Name'.padEnd(25) + 'Success%'.padEnd(10) + 'Avg(ms)'.padEnd(10) + 'P95(ms)'.padEnd(10) + 'RPS');
    console.log('-'.repeat(60));

    let overallIssues = [];

    testResults.forEach(result => {
      console.log(
        result.name.padEnd(25) +
        result.successRate.toFixed(1).padEnd(10) +
        result.avgResponseTime.toFixed(0).padEnd(10) +
        result.p95ResponseTime.toFixed(0).padEnd(10) +
        result.throughput.toFixed(1)
      );

      // Collect issues
      if (result.successRate < 95) {
        overallIssues.push(`${result.name}: Low success rate (${result.successRate.toFixed(1)}%)`);
      }
      if (result.avgResponseTime > 1000) {
        overallIssues.push(`${result.name}: Slow response time (${result.avgResponseTime.toFixed(0)}ms)`);
      }
      if (result.throughput < 5) {
        overallIssues.push(`${result.name}: Low throughput (${result.throughput.toFixed(1)} req/s)`);
      }
    });

    // Overall assessment
    console.log('\n🎯 Performance Assessment:');
    if (overallIssues.length === 0) {
      console.log('✅ EXCELLENT - All tests passed performance criteria');
    } else if (overallIssues.length <= 2) {
      console.log('⚠️  NEEDS ATTENTION - Some performance issues detected');
    } else {
      console.log('❌ POOR PERFORMANCE - Multiple issues detected');
    }

    if (overallIssues.length > 0) {
      console.log('\n🚨 Issues Found:');
      overallIssues.forEach(issue => console.log(`   • ${issue}`));
    }

    console.log('\n💡 Recommendations:');
    console.log('   • Response times should be < 500ms for good UX');
    console.log('   • Success rate should be > 99% in production');
    console.log('   • Throughput should support expected user load');
    console.log('   • Monitor performance during real user traffic');

    console.log('\n' + '='.repeat(60));
  }
}

// Run the quick stress test
async function main() {
  const tester = new QuickStressTest();
  
  try {
    const results = await tester.runAllTests();
    
    // Exit with error code if performance is poor
    const hasIssues = results.some(r => r.successRate < 95 || r.avgResponseTime > 1000);
    process.exit(hasIssues ? 1 : 0);
    
  } catch (error) {
    console.error('❌ Stress test failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = QuickStressTest;