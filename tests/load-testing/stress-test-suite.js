#!/usr/bin/env node

/**
 * YesLocker Comprehensive Load Testing Suite
 * 
 * This script performs stress testing on all critical API endpoints
 * to validate production capacity and identify performance bottlenecks.
 * 
 * Usage:
 * node stress-test-suite.js [--endpoint=localhost:3001] [--concurrent=50] [--duration=60]
 */

const https = require('https');
const http = require('http');
const { performance } = require('perf_hooks');

// Configuration
const CONFIG = {
  BASE_URL: process.env.TEST_BASE_URL || 'http://localhost:3001',
  CONCURRENT_USERS: parseInt(process.env.CONCURRENT_USERS) || 50,
  TEST_DURATION: parseInt(process.env.TEST_DURATION) || 60, // seconds
  RAMP_UP_TIME: parseInt(process.env.RAMP_UP_TIME) || 10, // seconds
  THINK_TIME: parseInt(process.env.THINK_TIME) || 1000, // ms between requests
};

// Test scenarios
const TEST_SCENARIOS = {
  // Light load - normal usage
  LIGHT: {
    concurrent: 10,
    rps: 5, // requests per second
    duration: 30
  },
  // Medium load - busy periods
  MEDIUM: {
    concurrent: 25,
    rps: 15,
    duration: 45
  },
  // Heavy load - peak usage
  HEAVY: {
    concurrent: 50,
    rps: 30,
    duration: 60
  },
  // Stress test - beyond normal capacity
  STRESS: {
    concurrent: 100,
    rps: 50,
    duration: 120
  },
  // Spike test - sudden load increase
  SPIKE: {
    concurrent: 200,
    rps: 100,
    duration: 30
  }
};

// Test data generators
const TestData = {
  generatePhone: () => {
    const prefixes = ['138', '139', '158', '159', '188', '189'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
    return prefix + suffix;
  },
  
  generateName: () => {
    const surnames = ['张', '李', '王', '刘', '陈', '杨', '赵', '黄', '周', '吴'];
    const names = ['伟', '芳', '娜', '敏', '静', '华', '军', '强', '磊', '洋'];
    return surnames[Math.floor(Math.random() * surnames.length)] + 
           names[Math.floor(Math.random() * names.length)];
  },
  
  generateOTP: () => Math.floor(100000 + Math.random() * 900000).toString(),
  
  getRandomStoreId: () => Math.floor(Math.random() * 3) + 1, // Store IDs 1-3
};

// Performance metrics collector
class MetricsCollector {
  constructor() {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      responseTimes: [],
      errorsByType: {},
      throughput: 0,
      concurrentUsers: 0,
      startTime: null,
      endTime: null
    };
  }
  
  recordRequest(responseTime, success, error = null) {
    this.metrics.totalRequests++;
    this.metrics.responseTimes.push(responseTime);
    
    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
      if (error) {
        this.metrics.errorsByType[error] = (this.metrics.errorsByType[error] || 0) + 1;
      }
    }
  }
  
  getStatistics() {
    const responseTimes = this.metrics.responseTimes.sort((a, b) => a - b);
    const duration = (this.metrics.endTime - this.metrics.startTime) / 1000;
    
    return {
      ...this.metrics,
      duration,
      avgResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      medianResponseTime: responseTimes[Math.floor(responseTimes.length / 2)],
      p90ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.9)],
      p95ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.95)],
      p99ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.99)],
      minResponseTime: Math.min(...responseTimes),
      maxResponseTime: Math.max(...responseTimes),
      throughput: this.metrics.totalRequests / duration,
      successRate: (this.metrics.successfulRequests / this.metrics.totalRequests) * 100,
      errorRate: (this.metrics.failedRequests / this.metrics.totalRequests) * 100
    };
  }
}

// HTTP client with built-in metrics
class LoadTestClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.metrics = new MetricsCollector();
  }
  
  async makeRequest(method, path, data = null, headers = {}) {
    const startTime = performance.now();
    
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl);
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'YesLocker-LoadTest/1.0',
          ...headers
        }
      };
      
      const requestModule = url.protocol === 'https:' ? https : http;
      
      const req = requestModule.request(url, options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          const endTime = performance.now();
          const responseTime = endTime - startTime;
          
          const success = res.statusCode >= 200 && res.statusCode < 400;
          const error = success ? null : `HTTP_${res.statusCode}`;
          
          this.metrics.recordRequest(responseTime, success, error);
          
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: responseData,
            responseTime,
            success
          });
        });
      });
      
      req.on('error', (error) => {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        this.metrics.recordRequest(responseTime, false, error.code);
        reject(error);
      });
      
      if (data) {
        req.write(JSON.stringify(data));
      }
      
      req.end();
    });
  }
  
  async get(path, headers = {}) {
    return this.makeRequest('GET', path, null, headers);
  }
  
  async post(path, data, headers = {}) {
    return this.makeRequest('POST', path, data, headers);
  }
}

// Individual test scenarios
class TestScenarios {
  constructor(client) {
    this.client = client;
    this.userData = new Map(); // Store user data between requests
  }
  
  // Scenario 1: User Registration Flow
  async userRegistrationFlow(userId) {
    const phone = TestData.generatePhone();
    const name = TestData.generateName();
    const storeId = TestData.getRandomStoreId();
    
    try {
      // Step 1: Request OTP for registration
      const otpResponse = await this.client.post('/auth-request-otp', {
        phone,
        type: 'register',
        name,
        store_id: storeId.toString()
      });
      
      if (!otpResponse.success) {
        console.warn(`OTP request failed for user ${userId}: ${otpResponse.statusCode}`);
        return false;
      }
      
      // Step 2: Verify OTP (using mock OTP in test environment)
      const verifyResponse = await this.client.post('/auth-verify-otp', {
        phone,
        otp: '123456' // Test OTP
      });
      
      if (verifyResponse.success) {
        this.userData.set(userId, { phone, name, token: JSON.parse(verifyResponse.data).data?.token });
      }
      
      return verifyResponse.success;
      
    } catch (error) {
      console.error(`Registration flow error for user ${userId}:`, error.message);
      return false;
    }
  }
  
  // Scenario 2: User Login Flow
  async userLoginFlow(userId) {
    const phone = TestData.generatePhone();
    
    try {
      // Step 1: Request OTP for login
      const otpResponse = await this.client.post('/auth-request-otp', {
        phone,
        type: 'login'
      });
      
      // Note: This will fail for non-existent users, which is expected
      if (otpResponse.statusCode === 404) {
        return true; // Expected behavior for non-existent users
      }
      
      if (!otpResponse.success) {
        return false;
      }
      
      // Step 2: Verify OTP
      const verifyResponse = await this.client.post('/auth-verify-otp', {
        phone,
        otp: '123456'
      });
      
      return verifyResponse.success;
      
    } catch (error) {
      console.error(`Login flow error for user ${userId}:`, error.message);
      return false;
    }
  }
  
  // Scenario 3: Admin Login Flow
  async adminLoginFlow(userId) {
    const adminCredentials = [
      { phone: '13800000001', password: 'admin123' },
      { phone: '13800000002', password: 'admin123' }
    ];
    
    const creds = adminCredentials[userId % adminCredentials.length];
    
    try {
      const response = await this.client.post('/admin-login', creds);
      return response.success;
    } catch (error) {
      console.error(`Admin login error for user ${userId}:`, error.message);
      return false;
    }
  }
  
  // Scenario 4: Application Management
  async applicationManagementFlow(userId) {
    try {
      // Get applications (requires admin token, will fail without auth)
      const response = await this.client.get('/api/admin-approval');
      
      // 401 is expected without proper authentication
      return response.statusCode === 401 || response.success;
    } catch (error) {
      console.error(`Application management error for user ${userId}:`, error.message);
      return false;
    }
  }
  
  // Scenario 5: User Management
  async userManagementFlow(userId) {
    try {
      const response = await this.client.get('/api/admin-users');
      
      // 401 is expected without proper authentication
      return response.statusCode === 401 || response.success;
    } catch (error) {
      console.error(`User management error for user ${userId}:`, error.message);
      return false;
    }
  }
}

// Main load test executor
class LoadTestExecutor {
  constructor(baseUrl) {
    this.client = new LoadTestClient(baseUrl);
    this.scenarios = new TestScenarios(this.client);
    this.activeUsers = 0;
    this.testResults = {};
  }
  
  async executeScenario(scenario, config) {
    console.log(`\n🚀 Starting ${scenario} load test...`);
    console.log(`Configuration: ${config.concurrent} concurrent users, ${config.duration}s duration`);
    
    this.client.metrics = new MetricsCollector();
    this.client.metrics.startTime = performance.now();
    
    const promises = [];
    const userTasks = this.getUserTasks(scenario);
    
    // Ramp up users gradually
    const rampUpInterval = (CONFIG.RAMP_UP_TIME * 1000) / config.concurrent;
    
    for (let i = 0; i < config.concurrent; i++) {
      const delay = i * rampUpInterval;
      
      promises.push(
        new Promise(resolve => {
          setTimeout(async () => {
            await this.runUserSession(i, userTasks, config.duration);
            resolve();
          }, delay);
        })
      );
    }
    
    // Wait for all users to complete
    await Promise.all(promises);
    
    this.client.metrics.endTime = performance.now();
    const stats = this.client.metrics.getStatistics();
    
    this.testResults[scenario] = stats;
    this.printScenarioResults(scenario, stats);
    
    return stats;
  }
  
  getUserTasks(scenario) {
    const taskMap = {
      LIGHT: [
        { task: 'userLoginFlow', weight: 0.6 },
        { task: 'adminLoginFlow', weight: 0.2 },
        { task: 'applicationManagementFlow', weight: 0.2 }
      ],
      MEDIUM: [
        { task: 'userRegistrationFlow', weight: 0.3 },
        { task: 'userLoginFlow', weight: 0.4 },
        { task: 'adminLoginFlow', weight: 0.1 },
        { task: 'applicationManagementFlow', weight: 0.2 }
      ],
      HEAVY: [
        { task: 'userRegistrationFlow', weight: 0.25 },
        { task: 'userLoginFlow', weight: 0.35 },
        { task: 'adminLoginFlow', weight: 0.1 },
        { task: 'applicationManagementFlow', weight: 0.15 },
        { task: 'userManagementFlow', weight: 0.15 }
      ],
      STRESS: [
        { task: 'userRegistrationFlow', weight: 0.2 },
        { task: 'userLoginFlow', weight: 0.3 },
        { task: 'adminLoginFlow', weight: 0.1 },
        { task: 'applicationManagementFlow', weight: 0.2 },
        { task: 'userManagementFlow', weight: 0.2 }
      ],
      SPIKE: [
        { task: 'userLoginFlow', weight: 0.8 },
        { task: 'adminLoginFlow', weight: 0.2 }
      ]
    };
    
    return taskMap[scenario] || taskMap.LIGHT;
  }
  
  async runUserSession(userId, tasks, duration) {
    const endTime = Date.now() + (duration * 1000);
    this.activeUsers++;
    
    while (Date.now() < endTime) {
      // Select random task based on weights
      const task = this.selectWeightedTask(tasks);
      
      try {
        await this.scenarios[task](userId);
      } catch (error) {
        console.error(`Task ${task} failed for user ${userId}:`, error.message);
      }
      
      // Think time between requests
      await this.sleep(CONFIG.THINK_TIME);
    }
    
    this.activeUsers--;
  }
  
  selectWeightedTask(tasks) {
    const random = Math.random();
    let cumulative = 0;
    
    for (const taskConfig of tasks) {
      cumulative += taskConfig.weight;
      if (random <= cumulative) {
        return taskConfig.task;
      }
    }
    
    return tasks[0].task; // Fallback
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  printScenarioResults(scenario, stats) {
    console.log(`\n📊 ${scenario} Test Results:`);
    console.log(`   Duration: ${stats.duration.toFixed(2)}s`);
    console.log(`   Total Requests: ${stats.totalRequests}`);
    console.log(`   Successful: ${stats.successfulRequests} (${stats.successRate.toFixed(2)}%)`);
    console.log(`   Failed: ${stats.failedRequests} (${stats.errorRate.toFixed(2)}%)`);
    console.log(`   Throughput: ${stats.throughput.toFixed(2)} req/s`);
    console.log(`   Avg Response Time: ${stats.avgResponseTime.toFixed(2)}ms`);
    console.log(`   Median Response Time: ${stats.medianResponseTime.toFixed(2)}ms`);
    console.log(`   95th Percentile: ${stats.p95ResponseTime.toFixed(2)}ms`);
    console.log(`   99th Percentile: ${stats.p99ResponseTime.toFixed(2)}ms`);
    console.log(`   Max Response Time: ${stats.maxResponseTime.toFixed(2)}ms`);
    
    if (Object.keys(stats.errorsByType).length > 0) {
      console.log(`   Errors by type:`, stats.errorsByType);
    }
  }
  
  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('🏆 YESLOCKER LOAD TEST SUMMARY REPORT');
    console.log('='.repeat(80));
    
    const scenarios = Object.keys(this.testResults);
    
    // Performance comparison table
    console.log('\n📈 Performance Comparison:');
    console.log('Scenario'.padEnd(15) + 'RPS'.padEnd(10) + 'Avg RT(ms)'.padEnd(12) + 'Success %'.padEnd(12) + 'Max RT(ms)');
    console.log('-'.repeat(60));
    
    scenarios.forEach(scenario => {
      const stats = this.testResults[scenario];
      console.log(
        scenario.padEnd(15) +
        stats.throughput.toFixed(1).padEnd(10) +
        stats.avgResponseTime.toFixed(1).padEnd(12) +
        stats.successRate.toFixed(1).padEnd(12) +
        stats.maxResponseTime.toFixed(1)
      );
    });
    
    // Recommendations
    console.log('\n💡 Performance Analysis:');
    
    scenarios.forEach(scenario => {
      const stats = this.testResults[scenario];
      
      if (stats.errorRate > 5) {
        console.log(`⚠️  ${scenario}: High error rate (${stats.errorRate.toFixed(1)}%)`);
      }
      
      if (stats.p95ResponseTime > 2000) {
        console.log(`⚠️  ${scenario}: Slow response times (95th percentile: ${stats.p95ResponseTime.toFixed(0)}ms)`);
      }
      
      if (stats.throughput < 10) {
        console.log(`⚠️  ${scenario}: Low throughput (${stats.throughput.toFixed(1)} req/s)`);
      }
      
      if (stats.errorRate < 1 && stats.p95ResponseTime < 1000 && stats.throughput > 20) {
        console.log(`✅ ${scenario}: Excellent performance`);
      }
    });
    
    // Production readiness assessment
    const worstCase = scenarios.reduce((worst, scenario) => {
      const stats = this.testResults[scenario];
      if (!worst || stats.errorRate > this.testResults[worst].errorRate) {
        return scenario;
      }
      return worst;
    }, null);
    
    const worstStats = this.testResults[worstCase];
    
    console.log('\n🎯 Production Readiness Assessment:');
    if (worstStats.errorRate < 1 && worstStats.p95ResponseTime < 2000) {
      console.log('✅ READY FOR PRODUCTION - All scenarios performing well');
    } else if (worstStats.errorRate < 5 && worstStats.p95ResponseTime < 3000) {
      console.log('⚠️  NEEDS OPTIMIZATION - Performance issues detected');
    } else {
      console.log('❌ NOT READY FOR PRODUCTION - Critical performance issues');
    }
    
    console.log('\n📋 Recommendations:');
    console.log('- Monitor response times in production');
    console.log('- Implement auto-scaling based on CPU/memory usage');
    console.log('- Set up alerting for error rates > 1%');
    console.log('- Consider rate limiting for sustained high load');
    console.log('- Review database query performance');
    
    console.log('\n' + '='.repeat(80));
  }
}

// Main execution
async function main() {
  console.log('🚀 YesLocker Load Testing Suite Starting...');
  console.log(`Target: ${CONFIG.BASE_URL}`);
  
  const executor = new LoadTestExecutor(CONFIG.BASE_URL);
  
  try {
    // Run all test scenarios
    const scenarios = ['LIGHT', 'MEDIUM', 'HEAVY', 'STRESS'];
    
    for (const scenario of scenarios) {
      await executor.executeScenario(scenario, TEST_SCENARIOS[scenario]);
      
      // Brief pause between scenarios
      await executor.sleep(5000);
    }
    
    // Generate final report
    executor.generateReport();
    
  } catch (error) {
    console.error('Load testing failed:', error);
    process.exit(1);
  }
}

// Command line argument parsing
const args = process.argv.slice(2);
args.forEach(arg => {
  if (arg.startsWith('--endpoint=')) {
    CONFIG.BASE_URL = arg.split('=')[1];
  } else if (arg.startsWith('--concurrent=')) {
    CONFIG.CONCURRENT_USERS = parseInt(arg.split('=')[1]);
  } else if (arg.startsWith('--duration=')) {
    CONFIG.TEST_DURATION = parseInt(arg.split('=')[1]);
  }
});

// Run the load tests
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { LoadTestExecutor, TestScenarios, MetricsCollector };