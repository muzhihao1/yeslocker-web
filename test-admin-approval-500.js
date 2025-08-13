const axios = require('axios');

// Configuration
const BASE_URL = 'https://yeslocker-web-production-314a.up.railway.app';
const ADMIN_CREDENTIALS = {
  phone: '13800000002', // Manager admin from seed data
  password: 'admin123'  // Default development password
};

/**
 * Test admin-approval endpoint to reproduce 500 error
 * This will help identify the specific cause of the failure
 */
async function testAdminApproval() {
  console.log('🔍 Testing admin-approval endpoint for 500 error...\n');

  try {
    // Step 1: Login to get valid token
    console.log('1. Admin Login...');
    const loginResponse = await axios.post(`${BASE_URL}/api/admin-login`, ADMIN_CREDENTIALS);
    
    if (!loginResponse.data.success) {
      throw new Error('Login failed: ' + JSON.stringify(loginResponse.data));
    }
    
    const token = loginResponse.data.data.token;
    const adminInfo = loginResponse.data.data.admin;
    
    console.log('✅ Login successful');
    console.log('   Admin:', adminInfo.name, `(${adminInfo.role})`);
    console.log('   Token length:', token.length);
    
    // Step 2: Test admin-approval endpoint with different parameters
    console.log('\n2. Testing admin-approval endpoint...');
    
    const testCases = [
      { name: 'Default parameters', params: {} },
      { name: 'With pagination', params: { page: 1, pageSize: 20 } },
      { name: 'With adminId', params: { page: 1, pageSize: 20, adminId: adminInfo.id } },
      { name: 'Filter by status', params: { page: 1, pageSize: 20, status: 'pending' } },
      { name: 'Exact failing request', params: { page: 1, pageSize: 20, adminId: '10000000-0000-0000-0000-000000000001' } }
    ];
    
    for (const testCase of testCases) {
      let startTime;
      try {
        console.log(`\n   Testing: ${testCase.name}`);
        console.log(`   Parameters:`, testCase.params);
        
        startTime = Date.now();
        const response = await axios.get(`${BASE_URL}/api/admin-approval`, {
          params: testCase.params,
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });
        
        const duration = Date.now() - startTime;
        console.log(`   ✅ Success - ${duration}ms`);
        console.log(`   Response data:`, {
          success: response.data.success,
          dataLength: response.data.data ? response.data.data.length : 0,
          dataType: typeof response.data.data
        });
        
        // Log first application if exists
        if (response.data.data && response.data.data.length > 0) {
          console.log(`   First application:`, {
            id: response.data.data[0].id,
            status: response.data.data[0].status,
            hasUser: !!response.data.data[0].user,
            hasStore: !!response.data.data[0].store
          });
        }
        
      } catch (error) {
        const duration = Date.now() - startTime;
        console.log(`   ❌ Failed - ${duration}ms`);
        console.log(`   Status:`, error.response?.status);
        console.log(`   Status Text:`, error.response?.statusText);
        console.log(`   Error Message:`, error.response?.data?.message);
        console.log(`   Error Details:`, error.response?.data?.error);
        
        // If it's a 500 error, log more details
        if (error.response?.status === 500) {
          console.log(`   \n🔍 500 Error Analysis:`);
          console.log(`   Request URL:`, error.config?.url);
          console.log(`   Request Params:`, error.config?.params);
          console.log(`   Full Error Response:`, error.response?.data);
          
          // Check if server provides any debug info
          if (error.response?.data?.debug) {
            console.log(`   Debug Info:`, error.response.data.debug);
          }
        }
      }
    }
    
  } catch (error) {
    console.log('❌ Test setup failed:', error.message);
    if (error.response) {
      console.log('   Response status:', error.response.status);
      console.log('   Response data:', error.response.data);
    }
  }
  
  console.log('\n🏁 Admin Approval Test Complete');
}

// Run the test
testAdminApproval().catch(console.error);