const axios = require('axios');

// Configuration
const BASE_URL = 'https://yeslocker-web-production-314a.up.railway.app';
const ADMIN_CREDENTIALS = {
  phone: '13800000002',
  password: 'admin123'
};

/**
 * Test with real database data
 */
async function testWithRealData() {
  console.log('🔍 Testing with real database data...\n');

  try {
    // Login to get admin token
    console.log('1. Admin Login...');
    const loginResponse = await axios.post(`${BASE_URL}/api/admin-login`, ADMIN_CREDENTIALS);
    const token = loginResponse.data.data.token;
    console.log('✅ Login successful');

    // Get stores and lockers data
    console.log('\n2. Getting stores and lockers data...');
    
    try {
      const storesResponse = await axios.get(`${BASE_URL}/api/stores-lockers`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      console.log('✅ Stores data retrieved successfully');
      const storesData = storesResponse.data.data;
      console.log('Stores available:', storesData.length);
      
      if (storesData.length > 0) {
        const store = storesData[0];
        console.log('Sample store:', {
          id: store.id,
          name: store.name,
          lockers_count: store.lockers ? store.lockers.length : 0
        });
        
        if (store.lockers && store.lockers.length > 0) {
          const locker = store.lockers[0];
          console.log('Sample locker:', {
            id: locker.id,
            number: locker.number,
            status: locker.status
          });
        }
      }
      
    } catch (error) {
      console.log('❌ Failed to get stores:', error.response?.status, error.response?.data?.message);
    }

    // Get users data
    console.log('\n3. Getting users data...');
    
    try {
      const usersResponse = await axios.get(`${BASE_URL}/api/admin-users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      console.log('✅ Users data retrieved successfully');
      const usersData = usersResponse.data.data;
      
      if (Array.isArray(usersData)) {
        console.log('Users available:', usersData.length);
        if (usersData.length > 0) {
          const user = usersData[0];
          console.log('Sample user:', {
            id: user.id,
            name: user.name,
            phone: user.phone
          });
        }
      } else {
        console.log('Users data structure:', typeof usersData);
      }
      
    } catch (error) {
      console.log('❌ Failed to get users:', error.response?.status, error.response?.data?.message);
    }

    // Try user registration first to create a valid user
    console.log('\n4. Creating a new test user...');
    
    const testUserData = {
      phone: '13900000888',
      password: 'test123',
      name: '申请测试用户',
      store_id: '20000000-0000-0000-0000-000000000001' // Default store ID
    };
    
    try {
      const registerResponse = await axios.post(`${BASE_URL}/auth-register`, testUserData, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      if (registerResponse.data.success) {
        const newUser = registerResponse.data.data.user;
        console.log('✅ Test user created successfully:', {
          id: newUser.id,
          name: newUser.name,
          phone: newUser.phone
        });
        
        // Now test application submission with this new user
        console.log('\n5. Testing application submission with new user...');
        
        const applicationData = {
          store_id: testUserData.store_id,
          locker_id: '30000000-0000-0000-0000-000000000001', // Default locker ID
          user_id: newUser.id,
          reason: '测试新用户申请提交功能'
        };
        
        const startTime = Date.now();
        
        try {
          const appResponse = await axios.post(`${BASE_URL}/lockers-apply`, applicationData, {
            headers: {
              'Content-Type': 'application/json'
            },
            timeout: 15000
          });
          
          const duration = Date.now() - startTime;
          console.log(`✅ APPLICATION SUBMISSION SUCCESSFUL! - ${duration}ms`);
          console.log('Response:', {
            success: appResponse.data.success,
            message: appResponse.data.message,
            application_id: appResponse.data.data?.application_id,
            status: appResponse.data.data?.status
          });
          
          // Verify the application appears in admin panel
          console.log('\n6. Verifying application appears in admin panel...');
          
          const adminAppsResponse = await axios.get(`${BASE_URL}/api/admin-approval`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            timeout: 10000
          });
          
          const applications = adminAppsResponse.data.data;
          const newApplication = applications.find(app => app.user?.phone === testUserData.phone);
          
          if (newApplication) {
            console.log('✅ Application found in admin panel!');
            console.log('Application details:', {
              id: newApplication.id,
              user_name: newApplication.user?.name,
              store_name: newApplication.store?.name,
              status: newApplication.status,
              created_at: newApplication.created_at
            });
          } else {
            console.log('⚠️ Application not found in admin panel');
            console.log('Total applications:', applications.length);
          }
          
        } catch (error) {
          const duration = Date.now() - startTime;
          console.log(`❌ APPLICATION SUBMISSION FAILED! - ${duration}ms`);
          console.log('Status:', error.response?.status);
          console.log('Error:', error.response?.data?.message || error.message);
          console.log('Full Error:', error.response?.data);
          
          // Let's also check server logs if possible
          if (error.response?.status === 500) {
            console.log('\n🔍 DEBUGGING 500 ERROR:');
            console.log('Request data:', applicationData);
            console.log('This suggests a database error - likely invalid foreign key references');
          }
        }
        
      } else {
        console.log('❌ User registration failed:', registerResponse.data.message);
      }
      
    } catch (error) {
      console.log('❌ User registration failed:', error.response?.status, error.response?.data?.message);
      
      if (error.response?.status === 409) {
        console.log('   User already exists - trying with existing user');
        
        // Try with a different phone number
        testUserData.phone = '13900000777';
        testUserData.name = '申请测试用户777';
        
        try {
          const retryResponse = await axios.post(`${BASE_URL}/auth-register`, testUserData, {
            headers: {
              'Content-Type': 'application/json'
            },
            timeout: 10000
          });
          
          if (retryResponse.data.success) {
            console.log('✅ Retry user created successfully');
            // Continue with application test...
          }
          
        } catch (retryError) {
          console.log('❌ Retry also failed:', retryError.response?.data?.message);
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
  
  console.log('\n🏁 Real Data Test Complete');
}

// Run the test
testWithRealData().catch(console.error);