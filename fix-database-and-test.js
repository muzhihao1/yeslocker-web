const axios = require('axios');

// Configuration
const BASE_URL = 'https://yeslocker-web-production-314a.up.railway.app';
const ADMIN_CREDENTIALS = {
  phone: '13800000002',
  password: 'admin123'
};

/**
 * Fix database and test user application submission
 */
async function fixDatabaseAndTest() {
  console.log('🔧 Fixing database and testing application submission...\n');

  try {
    // Step 1: Initialize database with seed data
    console.log('1. Initializing database with seed data...');
    
    try {
      const initResponse = await axios.post(`${BASE_URL}/api/init-db`, {}, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000 // Longer timeout for database operations
      });
      
      console.log('✅ Database initialization successful');
      console.log('Response:', initResponse.data);
      
    } catch (error) {
      console.log('⚠️ Database initialization failed:', error.response?.status, error.response?.data?.message);
      // Continue anyway - maybe it's already initialized
    }

    // Step 2: Login as admin to verify data
    console.log('\n2. Admin login to verify data...');
    const loginResponse = await axios.post(`${BASE_URL}/api/admin-login`, ADMIN_CREDENTIALS);
    const token = loginResponse.data.data.token;
    console.log('✅ Admin login successful');

    // Step 3: Check if applications now show proper data
    console.log('\n3. Checking admin panel after database init...');
    
    const adminAppsResponse = await axios.get(`${BASE_URL}/api/admin-approval`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    const applications = adminAppsResponse.data.data;
    console.log(`Found ${applications.length} applications in admin panel`);
    
    if (applications.length > 0) {
      const sample = applications[0];
      console.log('Sample application after init:', {
        id: sample.id,
        user_id: sample.user_id,
        store_id: sample.store_id,
        assigned_locker_id: sample.assigned_locker_id,
        user_name: sample.user?.name,
        store_name: sample.store?.name,
        locker_number: sample.locker?.number,
        status: sample.status
      });
      
      // Check if foreign keys are now populated
      const hasValidForeignKeys = sample.user?.name && sample.store?.name;
      if (hasValidForeignKeys) {
        console.log('✅ Foreign key relationships are now working!');
      } else {
        console.log('⚠️ Foreign key relationships still have issues');
      }
    }

    // Step 4: Test user application submission with real seed data
    console.log('\n4. Testing user application submission with seed data...');
    
    // Use the seed data UUIDs from the init script
    const testApplicationData = {
      store_id: '00000000-0000-0000-0000-000000000001', // 旗舰店
      locker_id: '30000000-0000-0000-0000-000000000002', // A-002 (available)
      user_id: '20000000-0000-0000-0000-000000000001',   // 张三
      reason: '使用种子数据测试申请提交功能 - Testing with seed data'
    };
    
    console.log('Using seed data:', testApplicationData);
    
    const startTime = Date.now();
    
    try {
      const appResponse = await axios.post(`${BASE_URL}/lockers-apply`, testApplicationData, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });
      
      const duration = Date.now() - startTime;
      console.log(`✅ APPLICATION SUBMISSION SUCCESS! - ${duration}ms`);
      console.log('Response:', {
        success: appResponse.data.success,
        message: appResponse.data.message,
        application_id: appResponse.data.data?.application_id,
        status: appResponse.data.data?.status
      });
      
      // Step 5: Verify the new application appears in admin panel
      console.log('\n5. Verifying new application in admin panel...');
      
      const updatedAppsResponse = await axios.get(`${BASE_URL}/api/admin-approval`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      const updatedApplications = updatedAppsResponse.data.data;
      const newApplication = updatedApplications.find(app => 
        app.user?.name === '张三' && app.status === 'pending'
      );
      
      if (newApplication) {
        console.log('✅ New application found in admin panel!');
        console.log('Application details:', {
          id: newApplication.id,
          user_name: newApplication.user?.name,
          store_name: newApplication.store?.name,
          locker_number: newApplication.locker?.number,
          status: newApplication.status,
          created_at: newApplication.created_at
        });
        
        console.log('\n🎉 USER APPLICATION SUBMISSION IS NOW WORKING!');
        
      } else {
        console.log('⚠️ New application not found in admin panel');
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`❌ APPLICATION SUBMISSION STILL FAILED! - ${duration}ms`);
      console.log('Status:', error.response?.status);
      console.log('Error:', error.response?.data?.message || error.message);
      console.log('Full Error:', error.response?.data);
    }

    // Step 6: Test user registration with fresh data
    console.log('\n6. Testing user registration after database fix...');
    
    const newUserData = {
      phone: '13900000001',
      password: 'test123',
      name: '数据库修复后测试用户',
      store_id: '00000000-0000-0000-0000-000000000001'
    };
    
    try {
      const registerResponse = await axios.post(`${BASE_URL}/auth-register`, newUserData, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      if (registerResponse.data.success) {
        console.log('✅ User registration is now working!');
        console.log('New user:', registerResponse.data.data.user);
        
        // Test application with the new user
        const newUserAppData = {
          store_id: '00000000-0000-0000-0000-000000000001',
          locker_id: '30000000-0000-0000-0000-000000000003', // A-003
          user_id: registerResponse.data.data.user.id,
          reason: '新注册用户测试申请'
        };
        
        const newUserAppResponse = await axios.post(`${BASE_URL}/lockers-apply`, newUserAppData, {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });
        
        console.log('✅ New user application also successful!');
        console.log('Response:', newUserAppResponse.data);
        
      }
      
    } catch (error) {
      console.log('❌ User registration still failed:', error.response?.status, error.response?.data?.message);
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    if (error.response) {
      console.log('   Response status:', error.response.status);
      console.log('   Response data:', error.response.data);
    }
  }
  
  console.log('\n🏁 Database Fix and Test Complete');
}

// Run the test
fixDatabaseAndTest().catch(console.error);