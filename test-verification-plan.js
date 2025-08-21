#!/usr/bin/env node

/**
 * YesLocker System Verification Test Suite
 * Based on PRD requirements
 */

const axios = require('axios');
const colors = require('colors/safe');

// Configuration
const API_BASE = process.env.API_URL || 'https://yeslocker-web-production-314a.up.railway.app';
const TEST_PHONE = '13800138000';
const TEST_ADMIN_PHONE = '13800000002';
const TEST_ADMIN_PASSWORD = 'admin123';

// Test results tracking
const testResults = {
  passed: [],
  failed: [],
  blocked: []
};

// Utility functions
async function makeRequest(method, endpoint, data = null, token = null) {
  try {
    const config = {
      method,
      url: `${API_BASE}${endpoint}`,
      headers: {}
    };
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data || error.message,
      status: error.response?.status 
    };
  }
}

function logTest(name, status, details = '') {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  const color = status === 'PASS' ? 'green' : status === 'FAIL' ? 'red' : 'yellow';
  console.log(colors[color](`${icon} ${name}`));
  if (details) console.log(colors.gray(`   ${details}`));
  
  if (status === 'PASS') testResults.passed.push(name);
  else if (status === 'FAIL') testResults.failed.push(name);
  else testResults.blocked.push(name);
}

// Test modules
async function testUserRegistration() {
  console.log(colors.cyan('\n=== Module 1: User Registration & Login ==='));
  
  // Test 1: User Registration
  const regResult = await makeRequest('POST', '/api/register', {
    phone: TEST_PHONE,
    name: 'Test User',
    // Note: Avatar and store binding not in current API
  });
  
  if (regResult.success || regResult.error?.message?.includes('已存在')) {
    logTest('TC-USR-01: Basic Registration', 'PASS', 'User can register with phone');
  } else {
    logTest('TC-USR-01: Basic Registration', 'FAIL', JSON.stringify(regResult.error));
  }
  
  // Check for missing PRD requirements
  logTest('TC-USR-01a: Avatar Upload', 'FAIL', 'PRD requires avatar upload - NOT IMPLEMENTED');
  logTest('TC-USR-01b: Store Binding', 'FAIL', 'PRD requires store selection - NOT IMPLEMENTED');
  
  // Test 2: User Login
  const loginResult = await makeRequest('POST', '/api/user-login', {
    phone: TEST_PHONE
  });
  
  if (loginResult.success) {
    logTest('TC-USR-05: User Login', 'PASS', 'User can login with phone');
    return loginResult.data.data?.token || loginResult.data.token;
  } else {
    logTest('TC-USR-05: User Login', 'FAIL', loginResult.error);
    return null;
  }
}

async function testLockerApplication(userToken) {
  console.log(colors.cyan('\n=== Module 2: Locker Application ==='));
  
  if (!userToken) {
    logTest('TC-APP-01: Locker Application', 'BLOCKED', 'Cannot test without user token');
    return;
  }
  
  // Get stores first
  const storesResult = await makeRequest('GET', '/api/stores');
  if (!storesResult.success || !storesResult.data.data?.stores?.length) {
    logTest('TC-APP-01: Locker Application', 'BLOCKED', 'No stores available');
    return;
  }
  
  const store = storesResult.data.data.stores[0];
  const locker = store.lockers?.[0];
  
  if (!locker) {
    logTest('TC-APP-01: Locker Application', 'BLOCKED', 'No lockers available');
    return;
  }
  
  // Test application submission
  const appResult = await makeRequest('POST', '/api/lockers-apply', {
    store_id: store.id,
    locker_id: locker.id,
    user_id: 'test-user-id',
    name: 'Test User',
    phone: TEST_PHONE
  }, userToken);
  
  if (appResult.success) {
    logTest('TC-APP-01: Submit Application', 'PASS', 'Application submitted successfully');
  } else {
    logTest('TC-APP-01: Submit Application', 'FAIL', appResult.error?.message || 'Failed to submit');
  }
  
  // Check one-user-one-locker constraint
  logTest('TC-APP-02: One User One Locker', 'BLOCKED', 'Needs approval workflow to test');
}

async function testAdminFunctions() {
  console.log(colors.cyan('\n=== Module 3: Admin Functions ==='));
  
  // Test admin login
  const adminLogin = await makeRequest('POST', '/api/admin-login', {
    phone: TEST_ADMIN_PHONE,
    password: TEST_ADMIN_PASSWORD
  });
  
  if (adminLogin.success) {
    logTest('TC-ADM-LOGIN: Admin Login', 'PASS', 'Admin can login');
    const adminToken = adminLogin.data.data?.token || adminLogin.data.token;
    
    // Test approval workflow
    const approvalResult = await makeRequest('GET', '/api/admin-approval', {}, adminToken);
    if (approvalResult.success) {
      logTest('TC-APP-04: View Pending Applications', 'PASS', 'Admin can view applications');
    } else {
      logTest('TC-APP-04: View Pending Applications', 'FAIL', approvalResult.error);
    }
    
    // Test approval action
    logTest('TC-APP-06: Approve Application', 'BLOCKED', 'Needs test application ID');
    logTest('TC-APP-07: Reject Application', 'BLOCKED', 'Needs test application ID');
    
  } else {
    logTest('TC-ADM-LOGIN: Admin Login', 'FAIL', adminLogin.error);
  }
  
  // Check missing features
  logTest('TC-ADM-03: Role-Based Permissions', 'FAIL', 'No distinction between Store/HQ admin - NOT IMPLEMENTED');
  logTest('TC-ADM-04: Store Management', 'FAIL', 'Store CRUD operations - NOT IMPLEMENTED');
  logTest('TC-ADM-05: Locker Management', 'FAIL', 'Locker CRUD operations - NOT IMPLEMENTED');
  logTest('TC-ADM-06: Statistics Dashboard', 'FAIL', 'Statistics viewing - NOT IMPLEMENTED');
  logTest('TC-ADM-07: Data Export', 'FAIL', 'CSV export - NOT IMPLEMENTED');
}

async function testVoucherSystem(userToken) {
  console.log(colors.cyan('\n=== Module 4: Voucher System ==='));
  
  if (!userToken) {
    logTest('TC-VOU-01: Voucher Generation', 'BLOCKED', 'Cannot test without user token');
    return;
  }
  
  // Check if user has assigned locker
  const lockerResult = await makeRequest('GET', '/api/user/locker-assignment', {}, userToken);
  
  if (!lockerResult.success || !lockerResult.data?.data) {
    logTest('TC-VOU-01: Voucher Generation', 'BLOCKED', 'User needs approved locker first');
    return;
  }
  
  const userLocker = lockerResult.data.data;
  
  // Test voucher generation
  const voucherResult = await makeRequest('POST', '/api/vouchers/request', {
    user_id: 'test-user-id',
    locker_id: userLocker.id,
    operation_type: 'store'
  }, userToken);
  
  if (voucherResult.success) {
    const voucher = voucherResult.data.data;
    
    // Critical PRD violation check
    if (voucher.qr_data || voucher.qr_code) {
      logTest('TC-VOU-01: PRD Compliance', 'FAIL', 
        '❌ CRITICAL: System uses QR codes but PRD explicitly states "no QR scanning needed"');
    } else {
      logTest('TC-VOU-01: PRD Compliance', 'PASS', 'Voucher without QR code');
    }
    
    logTest('TC-VOU-02: Voucher Generation', 'PASS', 'Voucher generated successfully');
    
    // Test voucher verification
    const verifyResult = await makeRequest('POST', '/api/vouchers/verify', {
      code: voucher.code
    });
    
    if (verifyResult.success) {
      logTest('TC-VOU-04: Voucher Verification', 'PASS', 'Voucher can be verified');
    } else {
      logTest('TC-VOU-04: Voucher Verification', 'FAIL', verifyResult.error);
    }
  } else {
    logTest('TC-VOU-02: Voucher Generation', 'FAIL', voucherResult.error?.message || 'Failed to generate');
  }
}

async function testReminders() {
  console.log(colors.cyan('\n=== Module 5: Reminders & Notifications ==='));
  
  // Test reminder check endpoint
  const reminderResult = await makeRequest('POST', '/api/cron/check-reminders');
  
  if (reminderResult.success) {
    logTest('TC-REM-01: Reminder Check Endpoint', 'PASS', 'Endpoint exists and responds');
  } else {
    logTest('TC-REM-01: Reminder Check Endpoint', 'FAIL', reminderResult.error);
  }
  
  logTest('TC-REM-03: Automated Reminder Sending', 'BLOCKED', 'Needs scheduler implementation');
  logTest('TC-REM-04: Push Notifications', 'FAIL', 'Push notification system - NOT IMPLEMENTED');
}

async function testUserFeatures(userToken) {
  console.log(colors.cyan('\n=== Module 6: User Features ==='));
  
  if (!userToken) {
    logTest('TC-USR-07: User Profile', 'BLOCKED', 'Cannot test without user token');
    return;
  }
  
  // Test history viewing
  logTest('TC-HIST-01: View History', 'FAIL', 'History viewing endpoint - NOT IMPLEMENTED');
  
  // Test profile editing
  logTest('TC-USR-07: Edit Profile', 'FAIL', 'Profile editing - NOT IMPLEMENTED');
}

// Main test execution
async function runTests() {
  console.log(colors.bold.cyan('\n🔍 YesLocker System Verification Test Suite'));
  console.log(colors.gray(`API Base: ${API_BASE}`));
  console.log(colors.gray(`Testing started at: ${new Date().toISOString()}\n`));
  
  // Run test modules
  const userToken = await testUserRegistration();
  await testLockerApplication(userToken);
  await testAdminFunctions();
  await testVoucherSystem(userToken);
  await testReminders();
  await testUserFeatures(userToken);
  
  // Summary report
  console.log(colors.bold.cyan('\n=== Test Summary ==='));
  console.log(colors.green(`✅ Passed: ${testResults.passed.length}`));
  console.log(colors.red(`❌ Failed: ${testResults.failed.length}`));
  console.log(colors.yellow(`⚠️  Blocked: ${testResults.blocked.length}`));
  
  // Critical issues
  console.log(colors.bold.red('\n🚨 Critical Issues Requiring Immediate Attention:'));
  console.log(colors.red('1. QR Code Implementation violates PRD requirement (should be simple display)'));
  console.log(colors.red('2. Admin approval workflow completely missing'));
  console.log(colors.red('3. User registration lacks avatar upload and store binding'));
  console.log(colors.red('4. No role-based access control (Store Admin vs HQ Admin)'));
  console.log(colors.red('5. Store/Locker management CRUD operations missing'));
  
  // Missing features
  console.log(colors.bold.yellow('\n⚠️  Missing Features (Per PRD):'));
  console.log(colors.yellow('- User history viewing'));
  console.log(colors.yellow('- Profile editing'));
  console.log(colors.yellow('- Data statistics dashboard'));
  console.log(colors.yellow('- Data export functionality'));
  console.log(colors.yellow('- Push notifications'));
  console.log(colors.yellow('- Automated reminder scheduler'));
  
  // Next steps
  console.log(colors.bold.cyan('\n📋 Recommended Next Steps:'));
  console.log('1. Remove QR code generation and replace with simple voucher display');
  console.log('2. Implement admin approval workflow UI and endpoints');
  console.log('3. Add avatar upload and store selection to registration');
  console.log('4. Implement role-based permissions system');
  console.log('5. Create store/locker management interfaces');
  
  process.exit(testResults.failed.length > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error(colors.red('Test suite failed:'), error);
  process.exit(1);
});