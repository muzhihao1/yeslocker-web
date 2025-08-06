/**
 * YesLocker Registration Test
 * Tests basic user registration functionality
 */

const SUPABASE_URL = 'https://hsfthqchyupkbmazcuis.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzZnRocWNoeXVwa2JtYXpjdWlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5NDcxMzQsImV4cCI6MjA2OTUyMzEzNH0.lgEh9aI69XXxSB_V1QpXLyNP-CCXFfxTHhQMfN3bxF0';

// Test data
const TEST_USER = {
    phone: '13888888888',
    name: 'Test Registration User New'
};

const TEST_STORE_ID = '00000000-0000-0000-0000-000000000001'; // 旗舰店

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
    console.log(`📦 Payload:`, JSON.stringify(payload, null, 2));
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        
        console.log(`📋 Response Status: ${response.status}`);
        console.log(`📋 Response Data:`, JSON.stringify(data, null, 2));
        
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
    
    return result.success;
}

async function testUserLogin() {
    console.log('\n🎯 Testing User Login...');
    
    const result = await callEdgeFunction('auth-login', {
        phone: TEST_USER.phone,
        password: TEST_USER.phone  // Uses phone as password (see registration function)
    });
    
    return result.success;
}

async function runRegistrationTest() {
    console.log('🚀 Starting YesLocker Registration Test');
    console.log(`📍 Supabase URL: ${SUPABASE_URL}`);
    console.log(`📱 Test User: ${TEST_USER.phone} (${TEST_USER.name})`);
    console.log('');
    
    try {
        const regResult = await testUserRegistration();
        const loginResult = await testUserLogin();
        
        console.log('\n📊 ===== TEST RESULTS =====');
        console.log(`${regResult ? '✅' : '❌'} Registration: ${regResult ? 'SUCCESS' : 'FAILED'}`);
        console.log(`${loginResult ? '✅' : '❌'} Login: ${loginResult ? 'SUCCESS' : 'FAILED'}`);
        
        if (regResult && loginResult) {
            console.log('🎉 Basic functionality is working!');
            return true;
        } else {
            console.log('🚨 Some tests failed');
            return false;
        }
        
    } catch (error) {
        console.error('💥 Test execution failed:', error);
        return false;
    }
}

// Export for potential external usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { runRegistrationTest };
}

// Run tests if executed directly
if (require.main === module) {
    runRegistrationTest().then(success => {
        process.exit(success ? 0 : 1);
    });
}