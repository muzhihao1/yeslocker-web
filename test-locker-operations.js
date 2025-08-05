// Test locker operations (store/retrieve)
const axios = require('axios');

const API_URL = 'http://localhost:3001';

async function testLockerOperations() {
  console.log('Testing Locker Operations...\n');

  // Step 1: Create a test user
  console.log('Step 1: Creating test user');
  const testPhone = '138' + String(Math.floor(Math.random() * 100000000)).padStart(8, '0');
  let testUserId;
  
  try {
    const registerResponse = await axios.post(`${API_URL}/auth-register`, {
      phone: testPhone,
      name: '存取测试用户',
      store_id: '1',
      avatar_url: ''
    });
    
    testUserId = registerResponse.data.data.user_id;
    console.log('✅ User created:', testUserId);
  } catch (error) {
    console.log('❌ Registration failed:', error.response?.data?.message || error.message);
    return;
  }

  // Step 2: Test store operation
  console.log('\nStep 2: Testing store operation');
  let recordId;
  
  try {
    const storeResponse = await axios.post(`${API_URL}/locker-operations`, {
      user_id: testUserId,
      locker_id: 'locker_123',
      action_type: 'store',
      locker_number: 'A03',
      store_name: '旗舰店'
    });
    
    if (storeResponse.data.success) {
      recordId = storeResponse.data.data.record_id;
      console.log('✅ Store operation successful');
      console.log('   Record ID:', recordId);
      console.log('   Timestamp:', storeResponse.data.data.timestamp);
    }
  } catch (error) {
    console.log('❌ Store operation failed:', error.response?.data?.message || error.message);
  }

  // Step 3: Test retrieve operation
  console.log('\nStep 3: Testing retrieve operation');
  try {
    const retrieveResponse = await axios.post(`${API_URL}/locker-operations`, {
      user_id: testUserId,
      locker_id: 'locker_123',
      action_type: 'retrieve',
      locker_number: 'A03',
      store_name: '旗舰店'
    });
    
    if (retrieveResponse.data.success) {
      console.log('✅ Retrieve operation successful');
      console.log('   Record ID:', retrieveResponse.data.data.record_id);
      console.log('   Timestamp:', retrieveResponse.data.data.timestamp);
    }
  } catch (error) {
    console.log('❌ Retrieve operation failed:', error.response?.data?.message || error.message);
  }

  // Step 4: Test validation - missing fields
  console.log('\nStep 4: Testing validation');
  try {
    await axios.post(`${API_URL}/locker-operations`, {
      user_id: testUserId
      // Missing locker_id and action_type
    });
    console.log('❌ Should have failed but succeeded');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Correctly rejected missing fields');
    } else {
      console.log('❌ Unexpected error:', error.response?.data?.message || error.message);
    }
  }

  // Step 5: Test invalid action type
  console.log('\nStep 5: Testing invalid action type');
  try {
    await axios.post(`${API_URL}/locker-operations`, {
      user_id: testUserId,
      locker_id: 'locker_123',
      action_type: 'invalid'
    });
    console.log('❌ Should have failed but succeeded');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Correctly rejected invalid action type');
    } else {
      console.log('❌ Unexpected error:', error.response?.data?.message || error.message);
    }
  }

  // Step 6: Check user records
  console.log('\nStep 6: Checking user records');
  try {
    const recordsResponse = await axios.get(`${API_URL}/users/${testUserId}/locker-records`);
    
    if (recordsResponse.data.success) {
      const records = recordsResponse.data.data;
      console.log('✅ User records loaded:');
      console.log('   Total records:', records.length);
      
      // Show recent operations
      records.slice(0, 3).forEach(record => {
        console.log(`   - ${record.action_type} at ${new Date(record.created_at).toLocaleTimeString()}`);
      });
    }
  } catch (error) {
    console.log('❌ Failed to get records:', error.response?.data?.message || error.message);
  }

  // Step 7: Test QR code generation
  console.log('\nStep 7: Testing QR code generation');
  try {
    const qrResponse = await axios.get(`${API_URL}/lockers/locker_123/qrcode`);
    
    if (qrResponse.data.success) {
      console.log('✅ QR code generated');
      const qrData = JSON.parse(qrResponse.data.data.qrContent);
      console.log('   Locker ID:', qrData.lockerId);
      console.log('   Locker Number:', qrData.lockerNumber);
      console.log('   Store:', qrData.storeName);
    }
  } catch (error) {
    console.log('❌ QR code generation failed:', error.response?.data?.message || error.message);
  }
}

// Run tests
testLockerOperations()
  .then(() => console.log('\nLocker operations tests completed'))
  .catch(err => console.error('Test failed:', err));