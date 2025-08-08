// Test my lockers functionality
const axios = require('axios');

const API_URL = 'http://localhost:3001';

async function testMyLockers() {
  console.log('Testing My Lockers functionality...\n');

  // Step 1: Register and login a test user
  console.log('Step 1: Creating test user');
  const testPhone = '138' + String(Math.floor(Math.random() * 100000000)).padStart(8, '0');
  let testUserId;
  
  try {
    const registerResponse = await axios.post(`${API_URL}/auth-register`, {
      phone: testPhone,
      name: '我的杆柜测试用户',
      store_id: '1',
      avatar_url: ''
    });
    
    testUserId = registerResponse.data.data.user_id;
    console.log('✅ User created:', testUserId);
  } catch (error) {
    console.log('❌ Registration failed:', error.response?.data?.message || error.message);
    return;
  }

  // Step 2: Get user's locker (should be null initially)
  console.log('\nStep 2: Checking user locker (should not have one initially)');
  try {
    const lockerResponse = await axios.get(`${API_URL}/users/${testUserId}/locker`);
    
    if (lockerResponse.data.success) {
      const locker = lockerResponse.data.data;
      if (locker) {
        console.log('✅ User has a locker:', {
          number: locker.number,
          status: locker.status,
          store: locker.store_name
        });
      } else {
        console.log('✅ User has no locker (as expected for new user)');
      }
    }
  } catch (error) {
    console.log('❌ Failed to get locker:', error.response?.data?.message || error.message);
  }

  // Step 3: Apply for a locker
  console.log('\nStep 3: Applying for a locker');
  try {
    const applyResponse = await axios.post(`${API_URL}/lockers-apply`, {
      store_id: '1',
      locker_id: '5',
      user_id: testUserId,
      reason: '长期使用，需要存放定制球杆'
    });
    
    if (applyResponse.data.success) {
      console.log('✅ Applied for locker successfully');
    }
  } catch (error) {
    console.log('❌ Application failed:', error.response?.data?.message || error.message);
  }

  // Step 4: Check locker status again (should show pending)
  console.log('\nStep 4: Checking locker status after application');
  try {
    const lockerResponse = await axios.get(`${API_URL}/users/${testUserId}/locker`);
    
    if (lockerResponse.data.success && lockerResponse.data.data) {
      const locker = lockerResponse.data.data;
      console.log('✅ Locker status:', {
        number: locker.number,
        status: locker.status,
        store: locker.store_name
      });
    }
  } catch (error) {
    console.log('❌ Failed to get locker:', error.response?.data?.message || error.message);
  }

  // Step 5: Get locker records (for approved users)
  console.log('\nStep 5: Getting locker records');
  try {
    const recordsResponse = await axios.get(`${API_URL}/users/${testUserId}/locker-records?limit=3`);
    
    if (recordsResponse.data.success) {
      const records = recordsResponse.data.data;
      console.log('✅ Locker records loaded:');
      if (records.length === 0) {
        console.log('   No records (expected for new/pending locker)');
      } else {
        records.forEach(record => {
          console.log(`   - ${record.action_type} at ${new Date(record.created_at).toLocaleDateString()}`);
        });
      }
    }
  } catch (error) {
    console.log('❌ Failed to get records:', error.response?.data?.message || error.message);
  }

  // Step 6: Test with a user ID that has approved locker (simulated)
  console.log('\nStep 6: Testing with simulated approved locker');
  const simulatedUserId = 'test_user_with_locker';
  
  try {
    const lockerResponse = await axios.get(`${API_URL}/users/${simulatedUserId}/locker`);
    
    if (lockerResponse.data.success && lockerResponse.data.data) {
      const locker = lockerResponse.data.data;
      console.log('✅ Approved locker found:', {
        number: locker.number,
        status: locker.status,
        lastUse: locker.last_use_time ? new Date(locker.last_use_time).toLocaleDateString() : 'N/A'
      });
      
      // Get records for approved locker
      const recordsResponse = await axios.get(`${API_URL}/users/${simulatedUserId}/locker-records`);
      if (recordsResponse.data.success) {
        console.log(`   Records count: ${recordsResponse.data.data.length}`);
      }
    }
  } catch (error) {
    console.log('❌ Error:', error.response?.data?.message || error.message);
  }
}

// Run tests
testMyLockers()
  .then(() => console.log('\nMy Lockers tests completed'))
  .catch(err => console.error('Test failed:', err));