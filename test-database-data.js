const axios = require('axios');

// Configuration
const BASE_URL = 'https://yeslocker-web-production-314a.up.railway.app';
const ADMIN_CREDENTIALS = {
  phone: '13800000002',
  password: 'admin123'
};

/**
 * Test database data to verify our test UUIDs exist
 */
async function testDatabaseData() {
  console.log('🔍 Testing database data availability...\n');

  try {
    // Login to get admin token
    console.log('1. Admin Login...');
    const loginResponse = await axios.post(`${BASE_URL}/api/admin-login`, ADMIN_CREDENTIALS);
    const token = loginResponse.data.data.token;
    console.log('✅ Login successful');

    // Test endpoints to check actual data
    const testEndpoints = [
      {
        name: 'Stores',
        url: '/api/admin-stores',
        description: 'Check available stores'
      },
      {
        name: 'Users', 
        url: '/api/admin-users',
        description: 'Check available users'
      },
      {
        name: 'Lockers',
        url: '/api/admin-lockers', 
        description: 'Check available lockers'
      }
    ];

    for (const endpoint of testEndpoints) {
      console.log(`\n2. Testing ${endpoint.name} (${endpoint.description})...`);
      
      try {
        const response = await axios.get(`${BASE_URL}${endpoint.url}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });
        
        const data = response.data.data;
        console.log(`   ✅ ${endpoint.name} endpoint works`);
        
        if (Array.isArray(data)) {
          console.log(`   Found ${data.length} items`);
          if (data.length > 0) {
            console.log(`   Sample item:`, {
              id: data[0].id,
              name: data[0].name || 'N/A',
              phone: data[0].phone || 'N/A'
            });
          }
        } else {
          console.log(`   Data structure:`, typeof data);
        }
        
      } catch (error) {
        console.log(`   ❌ ${endpoint.name} failed:`, error.response?.status, error.response?.data?.message);
      }
    }

    // Try a different approach: check existing applications to see what data structure they use
    console.log(`\n3. Analyzing existing applications for valid data structure...`);
    
    try {
      const appsResponse = await axios.get(`${BASE_URL}/api/admin-approval`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'  
        },
        timeout: 10000
      });
      
      const applications = appsResponse.data.data;
      console.log(`   Found ${applications.length} existing applications`);
      
      if (applications.length > 0) {
        const sample = applications[0];
        console.log(`   Sample application data structure:`, {
          id: sample.id,
          user_id: sample.user_id,
          store_id: sample.store_id,  
          assigned_locker_id: sample.assigned_locker_id,
          status: sample.status,
          user_name: sample.user?.name,
          store_name: sample.store?.name,
          locker_number: sample.locker?.number
        });
        
        // Use real IDs from existing data for testing
        if (sample.user_id && sample.store_id) {
          console.log(`\n4. Testing with real data from existing applications...`);
          
          const realTestData = {
            store_id: sample.store_id,
            locker_id: sample.assigned_locker_id || '30000000-0000-0000-0000-000000000001',
            user_id: sample.user_id, 
            reason: '使用真实数据测试申请提交 - Test with real data'
          };
          
          console.log(`   Using real test data:`, realTestData);
          
          try {
            const submitResponse = await axios.post(`${BASE_URL}/lockers-apply`, realTestData, {
              headers: {
                'Content-Type': 'application/json'
              },
              timeout: 10000
            });
            
            console.log(`   ✅ Application submission with real data succeeded!`);
            console.log(`   Response:`, submitResponse.data);
            
          } catch (error) {
            console.log(`   ❌ Application submission with real data failed:`, error.response?.status);
            console.log(`   Error details:`, error.response?.data);
            
            // Check the server logs or error details
            if (error.response?.data?.error) {
              console.log(`   Server error:`, error.response.data.error);
            }
          }
        }
      }
      
    } catch (error) {
      console.log(`   ❌ Failed to get applications:`, error.response?.status, error.response?.data?.message);
    }

    // Test with a completely new user approach
    console.log(`\n5. Testing user registration and then application...`);
    
    try {
      // Create a test user first
      const newUserData = {
        phone: '13900000999',
        password: 'test123', 
        name: '测试用户999',
        store_id: applications.length > 0 ? applications[0].store_id : '20000000-0000-0000-0000-000000000001'
      };
      
      console.log(`   Creating test user:`, { phone: newUserData.phone, name: newUserData.name });
      
      const registerResponse = await axios.post(`${BASE_URL}/auth-register`, newUserData, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      if (registerResponse.data.success) {
        const newUserId = registerResponse.data.data.user.id;
        console.log(`   ✅ User created successfully with ID: ${newUserId}`);
        
        // Now try to submit application with this new user
        const newAppData = {
          store_id: newUserData.store_id,
          locker_id: '30000000-0000-0000-0000-000000000001',
          user_id: newUserId,
          reason: '新注册用户测试申请 - New user test application'
        };
        
        console.log(`   Submitting application for new user...`);
        
        const newAppResponse = await axios.post(`${BASE_URL}/lockers-apply`, newAppData, {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000  
        });
        
        console.log(`   ✅ NEW USER APPLICATION SUCCEEDED!`);
        console.log(`   Response:`, newAppResponse.data);
        
      }
      
    } catch (error) {
      console.log(`   ❌ New user test failed:`, error.response?.status);
      console.log(`   Error:`, error.response?.data?.message);
    }
    
  } catch (error) {
    console.log('❌ Test setup failed:', error.message);
    if (error.response) {
      console.log('   Response status:', error.response.status);
      console.log('   Response data:', error.response.data);
    }
  }
  
  console.log('\n🏁 Database Data Test Complete');
}

// Run the test
testDatabaseData().catch(console.error);