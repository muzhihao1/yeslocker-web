const axios = require('axios');

// Configuration
const BASE_URL = 'https://yeslocker-web-production-314a.up.railway.app';

/**
 * Test user application submission functionality
 */
async function testUserApplicationSubmission() {
  console.log('🔍 Testing user application submission endpoint...\n');

  try {
    // First let's get available stores and lockers to use valid IDs
    console.log('1. Getting available stores and lockers...');
    
    // Test data - using UUIDs from the schema
    const testData = {
      store_id: '20000000-0000-0000-0000-000000000001',
      locker_id: '30000000-0000-0000-0000-000000000001', 
      user_id: '50000000-0000-0000-0000-000000000001',
      reason: '测试申请提交功能 - Test application submission'
    };

    console.log('   Using test data:', testData);

    // Test Case 1: Valid application submission
    console.log('\n2. Testing valid application submission...');
    
    let startTime = Date.now();
    try {
      const response = await axios.post(`${BASE_URL}/lockers-apply`, testData, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      const duration = Date.now() - startTime;
      console.log(`   ✅ Success - ${duration}ms`);
      console.log('   Response:', {
        success: response.data.success,
        message: response.data.message,
        application_id: response.data.data?.application_id,
        status: response.data.data?.status
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`   ❌ Failed - ${duration}ms`);
      console.log(`   Status:`, error.response?.status);
      console.log(`   Error:`, error.response?.data?.message || error.message);
      console.log(`   Full Response:`, error.response?.data);
    }

    // Test Case 2: Missing required fields
    console.log('\n3. Testing with missing required fields...');
    
    const incompleteData = {
      user_id: testData.user_id,
      reason: '测试缺少字段'
      // Missing store_id and locker_id
    };
    
    try {
      const response = await axios.post(`${BASE_URL}/lockers-apply`, incompleteData, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });
      
      console.log('   ⚠️  Unexpected success:', response.data);
      
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('   ✅ Correctly rejected missing fields');
        console.log('   Message:', error.response.data.message);
      } else {
        console.log('   ❌ Unexpected error:', error.response?.status, error.response?.data?.message);
      }
    }

    // Test Case 3: Duplicate application (if first one succeeded)
    console.log('\n4. Testing duplicate application prevention...');
    
    try {
      const response = await axios.post(`${BASE_URL}/lockers-apply`, {
        ...testData,
        reason: '重复申请测试 - Duplicate application test'
      }, {
        headers: {
          'Content-Type': 'application/json'  
        },
        timeout: 5000
      });
      
      console.log('   ⚠️  Duplicate allowed unexpectedly:', response.data);
      
    } catch (error) {
      if (error.response?.status === 409) {
        console.log('   ✅ Correctly prevented duplicate application');
        console.log('   Message:', error.response.data.message);
      } else {
        console.log('   ❌ Unexpected error:', error.response?.status, error.response?.data?.message);
      }
    }

    // Test Case 4: Check if application appears in admin panel
    console.log('\n5. Checking if application appears in admin panel...');
    
    // Login as admin first
    const ADMIN_CREDENTIALS = {
      phone: '13800000002',
      password: 'admin123'
    };
    
    try {
      const loginResponse = await axios.post(`${BASE_URL}/api/admin-login`, ADMIN_CREDENTIALS);
      const token = loginResponse.data.data.token;
      
      // Get applications from admin panel
      const adminResponse = await axios.get(`${BASE_URL}/api/admin-approval`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });
      
      const applications = adminResponse.data.data;
      const recentApp = applications.find(app => 
        app.user_id === testData.user_id && 
        app.status === 'pending'
      );
      
      if (recentApp) {
        console.log('   ✅ Application found in admin panel');
        console.log('   Application:', {
          id: recentApp.id,
          user_name: recentApp.user?.name,
          store_name: recentApp.store?.name,
          status: recentApp.status,
          created_at: recentApp.created_at
        });
      } else {
        console.log('   ⚠️  Application not found in admin panel');
        console.log('   Total applications found:', applications.length);
      }
      
    } catch (error) {
      console.log('   ❌ Failed to check admin panel:', error.response?.status, error.response?.data?.message);
    }
    
  } catch (error) {
    console.log('❌ Test setup failed:', error.message);
    if (error.response) {
      console.log('   Response status:', error.response.status);
      console.log('   Response data:', error.response.data);
    }
  }
  
  console.log('\n🏁 User Application Test Complete');
}

// Run the test
testUserApplicationSubmission().catch(console.error);