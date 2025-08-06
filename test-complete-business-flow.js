/**
 * YesLocker Complete Business Flow E2E Test
 * Tests the full user journey: Registration → Login → Application → Admin Approval → Operations
 * 
 * Flow:
 * 1. User Registration (new test user)
 * 2. User Login (get auth token)
 * 3. Locker Application (apply for a locker)
 * 4. Admin Login (login as admin)
 * 5. Admin Approval (approve the application)
 * 6. Locker Operations (store/retrieve cue)
 */

const SUPABASE_URL = 'https://hsfthqchyupkbmazcuis.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzZnRocWNoeXVwa2JtYXpjdWlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5NDcxMzQsImV4cCI6MjA2OTUyMzEzNH0.lgEh9aI69XXxSB_V1QpXLyNP-CCXFfxTHhQMfN3bxF0';

// Test data
const TEST_USER = {
    phone: '13900000999',
    name: 'Test User E2E'
    // Note: Registration uses phone as password by default
};

const TEST_ADMIN = {
    phone: '13800000001',
    userPassword: '$2b$10$dummy.hash.for.dev.only'
};

// Available stores from database
const TEST_STORE_ID = '00000000-0000-0000-0000-000000000001'; // 旗舰店

let testResults = {
    userRegistration: false,
    userLogin: false,
    lockerApplication: false,
    adminLogin: false,
    adminApproval: false,
    lockerOperations: false
};

let testData = {
    userToken: null,
    userId: null,
    applicationId: null,
    adminToken: null,
    lockerId: null,
    storeId: null
};

async function callEdgeFunction(functionName, payload = {}, authToken = null) {
    const url = `${SUPABASE_URL}/functions/v1/${functionName}`;
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    };
    
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    console.log(`🔄 Calling ${functionName}...`);
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            console.error(`❌ ${functionName} failed:`, data);
            return { success: false, error: data };
        }
        
        console.log(`✅ ${functionName} succeeded:`, data);
        return { success: true, data };
    } catch (error) {
        console.error(`❌ ${functionName} network error:`, error.message);
        return { success: false, error: error.message };
    }
}

async function testUserRegistration() {
    console.log('\n🎯 Testing User Registration...');
    
    const result = await callEdgeFunction('auth-register', {
        phone: TEST_USER.phone,
        name: TEST_USER.name,
        store_id: TEST_STORE_ID
    });
    
    if (result.success && result.data.user_id) {
        testResults.userRegistration = true;
        testData.userId = result.data.user_id;
        console.log('✅ User registration successful');
        return true;
    } else {
        console.log('❌ User registration failed');
        return false;
    }
}

async function testUserLogin() {
    console.log('\n🎯 Testing User Login...');
    
    const result = await callEdgeFunction('auth-login', {
        phone: TEST_USER.phone,
        password: TEST_USER.phone  // Uses phone as password (see registration function)
    });
    
    if (result.success && result.data.access_token) {
        testResults.userLogin = true;
        testData.userToken = result.data.access_token;
        testData.storeId = result.data.user.store_id;
        console.log('✅ User login successful');
        return true;
    } else {
        console.log('❌ User login failed');
        return false;
    }
}

async function testLockerApplication() {
    console.log('\n🎯 Testing Locker Application...');
    
    const result = await callEdgeFunction('lockers-apply', {
        user_id: testData.userId,
        store_id: testData.storeId || TEST_STORE_ID,
        requested_locker_number: null, // System will assign
        notes: 'E2E test application'
    }, testData.userToken);
    
    if (result.success && result.data.application) {
        testResults.lockerApplication = true;
        testData.applicationId = result.data.application.id;
        console.log('✅ Locker application successful');
        return true;
    } else {
        console.log('❌ Locker application failed');
        return false;
    }
}

async function testAdminLogin() {
    console.log('\n🎯 Testing Admin Login...');
    
    const result = await callEdgeFunction('admin-login', {
        phone: TEST_ADMIN.phone,
        userPassword: TEST_ADMIN.userPassword  // Uses 'userPassword' parameter name
    });
    
    if (result.success && result.data.access_token) {
        testResults.adminLogin = true;
        testData.adminToken = result.data.access_token;
        console.log('✅ Admin login successful');
        return true;
    } else {
        console.log('❌ Admin login failed');
        return false;
    }
}

async function testAdminApproval() {
    console.log('\n🎯 Testing Admin Approval...');
    
    const result = await callEdgeFunction('admin-approval', {
        application_id: testData.applicationId,
        action: 'approve',
        notes: 'E2E test approval'
    }, testData.adminToken);
    
    if (result.success && result.data.application) {
        testResults.adminApproval = true;
        testData.lockerId = result.data.locker?.id;
        console.log('✅ Admin approval successful');
        return true;
    } else {
        console.log('❌ Admin approval failed');
        return false;
    }
}

async function testLockerOperations() {
    console.log('\n🎯 Testing Locker Operations...');
    
    if (!testData.lockerId) {
        console.log('❌ No locker assigned, skipping operations test');
        return false;
    }
    
    // Test store operation
    const storeResult = await callEdgeFunction('locker-operations', {
        user_id: testData.userId,
        locker_id: testData.lockerId,
        action_type: 'store',
        notes: 'E2E test store operation'
    }, testData.userToken);
    
    if (!storeResult.success) {
        console.log('❌ Locker store operation failed');
        return false;
    }
    
    // Test retrieve operation
    const retrieveResult = await callEdgeFunction('locker-operations', {
        user_id: testData.userId,
        locker_id: testData.lockerId,
        action_type: 'retrieve',
        notes: 'E2E test retrieve operation'
    }, testData.userToken);
    
    if (retrieveResult.success) {
        testResults.lockerOperations = true;
        console.log('✅ Locker operations successful');
        return true;
    } else {
        console.log('❌ Locker retrieve operation failed');
        return false;
    }
}

async function generateReport() {
    console.log('\n📊 ===== YESLOCKER E2E TEST REPORT =====');
    console.log(`Test User: ${TEST_USER.phone} (${TEST_USER.name})`);
    console.log(`Test Admin: ${TEST_ADMIN.phone}`);
    console.log('');
    
    const results = [
        { step: '1. User Registration', result: testResults.userRegistration },
        { step: '2. User Login', result: testResults.userLogin },
        { step: '3. Locker Application', result: testResults.lockerApplication },
        { step: '4. Admin Login', result: testResults.adminLogin },
        { step: '5. Admin Approval', result: testResults.adminApproval },
        { step: '6. Locker Operations', result: testResults.lockerOperations }
    ];
    
    results.forEach(({ step, result }) => {
        console.log(`${result ? '✅' : '❌'} ${step}`);
    });
    
    const successCount = results.filter(r => r.result).length;
    const totalCount = results.length;
    const successRate = Math.round((successCount / totalCount) * 100);
    
    console.log('');
    console.log(`📈 Success Rate: ${successCount}/${totalCount} (${successRate}%)`);
    
    if (successRate === 100) {
        console.log('🎉 ALL TESTS PASSED! YesLocker system is fully functional!');
    } else if (successRate >= 80) {
        console.log('⚠️  Most tests passed, minor issues detected');
    } else {
        console.log('🚨 Significant issues detected, review failed steps');
    }
    
    console.log('');
    console.log('🔍 Test Data Generated:');
    console.log(`- User ID: ${testData.userId || 'N/A'}`);
    console.log(`- Application ID: ${testData.applicationId || 'N/A'}`);
    console.log(`- Locker ID: ${testData.lockerId || 'N/A'}`);
    console.log(`- Store ID: ${testData.storeId || 'N/A'}`);
    
    return { successRate, results };
}

async function runCompleteTest() {
    console.log('🚀 Starting YesLocker Complete Business Flow Test');
    console.log(`📍 Supabase URL: ${SUPABASE_URL}`);
    console.log('');
    
    try {
        // Run tests in sequence - each depends on the previous
        await testUserRegistration();
        await testUserLogin();
        await testLockerApplication();
        await testAdminLogin();
        await testAdminApproval();
        await testLockerOperations();
        
        const report = await generateReport();
        
        // Save report to file
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fs = require('fs');
        fs.writeFileSync(`yeslocker-e2e-test-report-${timestamp}.json`, JSON.stringify({
            timestamp: new Date().toISOString(),
            testResults,
            testData,
            report
        }, null, 2));
        
        console.log(`📄 Report saved to: yeslocker-e2e-test-report-${timestamp}.json`);
        
        return report.successRate === 100;
        
    } catch (error) {
        console.error('💥 Test execution failed:', error);
        return false;
    }
}

// Export for potential external usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { runCompleteTest, testResults, testData };
}

// Run tests if executed directly
if (require.main === module) {
    runCompleteTest().then(success => {
        process.exit(success ? 0 : 1);
    });
}