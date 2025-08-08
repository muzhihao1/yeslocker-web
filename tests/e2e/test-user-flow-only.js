/**
 * YesLocker User Flow Test
 * Tests: Registration → Login → Locker Application
 */

const SUPABASE_URL = 'https://hsfthqchyupkbmazcuis.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzZnRocWNoeXVwa2JtYXpjdWlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5NDcxMzQsImV4cCI6MjA2OTUyMzEzNH0.lgEh9aI69XXxSB_V1QpXLyNP-CCXFfxTHhQMfN3bxF0';

const TEST_USER = {
    phone: '13888888888', // Using different phone for clean test
    name: 'Complete Flow Test User'
};

const TEST_STORE_ID = '00000000-0000-0000-0000-000000000001'; // 旗舰店

async function callEdgeFunction(functionName, payload = {}, authToken = null, method = 'POST') {
    const url = `${SUPABASE_URL}/functions/v1/${functionName}`;
    const headers = {
        'Authorization': authToken ? `Bearer ${authToken}` : `Bearer ${SUPABASE_ANON_KEY}`
    };
    
    if (method === 'POST') {
        headers['Content-Type'] = 'application/json';
    }
    
    console.log(`🔄 Calling ${functionName} (${method})...`);
    
    try {
        const fetchOptions = {
            method,
            headers
        };
        
        if (method === 'POST' && Object.keys(payload).length > 0) {
            fetchOptions.body = JSON.stringify(payload);
        }
        
        const response = await fetch(url, fetchOptions);
        const data = await response.json();
        
        console.log(`📋 ${functionName} Response:`, {
            status: response.status,
            success: data.success || response.ok,
            message: data.message || data.error
        });
        
        if (!response.ok) {
            return { success: false, error: data, status: response.status };
        }
        
        return { success: true, data, status: response.status };
    } catch (error) {
        console.error(`❌ ${functionName} network error:`, error.message);
        return { success: false, error: error.message };
    }
}

async function testUserRegistration() {
    console.log('\n🎯 Step 1: User Registration');
    
    const result = await callEdgeFunction('auth-register', {
        phone: TEST_USER.phone,
        name: TEST_USER.name,
        store_id: TEST_STORE_ID
    });
    
    return result;
}

async function testUserLogin() {
    console.log('\n🎯 Step 2: User Login');
    
    const result = await callEdgeFunction('auth-login', {
        phone: TEST_USER.phone
    });
    
    return result;
}

async function testLockerApplication(userToken) {
    console.log('\n🎯 Step 3: Locker Application');
    
    const result = await callEdgeFunction('lockers-apply', {
        store_id: TEST_STORE_ID,
        requested_locker_number: 'A002'
    }, userToken);
    
    return result;
}

async function testStoresList() {
    console.log('\n🎯 Step 4: Get Available Stores');
    
    const result = await callEdgeFunction('stores-lockers', {}, null, 'GET');
    
    return result;
}

async function runUserFlowTest() {
    console.log('🚀 Starting YesLocker User Flow E2E Test');
    console.log(`📍 Supabase URL: ${SUPABASE_URL}`);
    console.log(`📱 Test User: ${TEST_USER.phone} (${TEST_USER.name})`);
    console.log('');
    
    const results = {
        registration: false,
        login: false,
        application: false,
        stores: false
    };
    
    let userToken = null;
    
    try {
        // Step 1: Registration
        const regResult = await testUserRegistration();
        results.registration = regResult.success || (regResult.status === 409); // 409 = already registered
        
        // Step 2: Login
        const loginResult = await testUserLogin();
        results.login = loginResult.success;
        
        if (loginResult.success) {
            userToken = loginResult.data.data.access_token;
            console.log(`✅ Got fresh access token: ${userToken.substring(0, 20)}...`);
            
            // Debug token expiry
            try {
                const decoded = JSON.parse(atob(userToken));
                const isExpired = decoded.exp < Math.floor(Date.now() / 1000);
                console.log(`🕒 Token expiry: ${new Date(decoded.exp * 1000).toISOString()} (${isExpired ? 'Expired' : 'Valid'})`);
            } catch (e) {
                console.log(`⚠️ Token decode issue: ${e.message}`);
            }
        }
        
        // Step 3: Locker Application (only if login successful)
        if (userToken) {
            const appResult = await testLockerApplication(userToken);
            results.application = appResult.success || (appResult.status === 409); // 409 = already has application
        }
        
        // Step 4: Get Stores (independent test)
        const storesResult = await testStoresList();
        results.stores = storesResult.success;
        
        // Generate Report
        console.log('\n📊 ===== USER FLOW E2E TEST RESULTS =====');
        console.log(`${results.registration ? '✅' : '❌'} 1. User Registration`);
        console.log(`${results.login ? '✅' : '❌'} 2. User Login`);
        console.log(`${results.application ? '✅' : '❌'} 3. Locker Application`);
        console.log(`${results.stores ? '✅' : '❌'} 4. Stores Information`);
        
        const successCount = Object.values(results).filter(r => r).length;
        const totalTests = Object.keys(results).length;
        const successRate = Math.round((successCount / totalTests) * 100);
        
        console.log(`\n📈 Success Rate: ${successCount}/${totalTests} (${successRate}%)`);
        
        if (successRate >= 75) {
            console.log('🎉 User flow is working well!');
            return true;
        } else {
            console.log('🚨 Some critical functions are failing');
            return false;
        }
        
    } catch (error) {
        console.error('💥 Test execution failed:', error);
        return false;
    }
}

// Export for potential external usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { runUserFlowTest };
}

// Run tests if executed directly
if (require.main === module) {
    runUserFlowTest().then(success => {
        process.exit(success ? 0 : 1);
    });
}