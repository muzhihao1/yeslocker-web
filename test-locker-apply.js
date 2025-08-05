// Test locker application flow
const axios = require('axios');

const API_URL = 'http://localhost:3001';

async function testLockerApplication() {
  console.log('Testing locker application flow...\n');

  // Step 1: Register a test user first
  console.log('Step 1: Registering test user');
  const testPhone = '138' + String(Math.floor(Math.random() * 100000000)).padStart(8, '0');
  let testUserId;
  
  try {
    const registerResponse = await axios.post(`${API_URL}/auth-register`, {
      phone: testPhone,
      name: '申请测试用户',
      store_id: '1',
      avatar_url: ''
    });
    
    testUserId = registerResponse.data.data.user_id;
    console.log('✅ User registered:', testUserId);
  } catch (error) {
    console.log('❌ Registration failed:', error.response?.data?.message || error.message);
    return;
  }

  // Step 2: Get available stores
  console.log('\nStep 2: Getting available stores');
  try {
    const storesResponse = await axios.get(`${API_URL}/stores-lockers`);
    
    if (storesResponse.data.success) {
      console.log('✅ Stores loaded:');
      storesResponse.data.data.forEach(store => {
        console.log(`   - ${store.name} (ID: ${store.id})`);
      });
    }
  } catch (error) {
    console.log('❌ Failed to load stores:', error.response?.data?.message || error.message);
  }

  // Step 3: Get lockers for store 1
  console.log('\nStep 3: Getting lockers for store 1');
  let availableLockers = [];
  
  try {
    const lockersResponse = await axios.get(`${API_URL}/lockers/1`);
    
    if (lockersResponse.data.success) {
      availableLockers = lockersResponse.data.data.filter(l => l.status === 'available');
      console.log('✅ Lockers loaded:');
      console.log(`   Total: ${lockersResponse.data.data.length}`);
      console.log(`   Available: ${availableLockers.length}`);
      console.log(`   Occupied: ${lockersResponse.data.data.filter(l => l.status === 'occupied').length}`);
    }
  } catch (error) {
    console.log('❌ Failed to load lockers:', error.response?.data?.message || error.message);
    return;
  }

  // Step 4: Apply for a locker
  if (availableLockers.length > 0) {
    console.log('\nStep 4: Applying for locker');
    const selectedLocker = availableLockers[0];
    
    try {
      const applyResponse = await axios.post(`${API_URL}/lockers-apply`, {
        store_id: '1',
        locker_id: selectedLocker.id,
        user_id: testUserId,
        reason: '需要长期存放定制球杆'
      });
      
      if (applyResponse.data.success) {
        console.log('✅ Application submitted successfully');
        console.log('   Application ID:', applyResponse.data.data.application_id);
        console.log('   Status:', applyResponse.data.data.status);
        console.log('   Selected locker:', selectedLocker.number);
      }
    } catch (error) {
      console.log('❌ Application failed:', error.response?.data?.message || error.message);
    }
  } else {
    console.log('\n❌ No available lockers to apply for');
  }

  // Step 5: Test validation - missing fields
  console.log('\nStep 5: Testing validation');
  try {
    await axios.post(`${API_URL}/lockers-apply`, {
      store_id: '1',
      // Missing locker_id and user_id
    });
    console.log('❌ Should have failed but succeeded');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Correctly rejected incomplete application');
    } else {
      console.log('❌ Unexpected error:', error.response?.data?.message || error.message);
    }
  }

  // Step 6: Test applying for occupied locker (should succeed in test mode)
  console.log('\nStep 6: Applying for occupied locker');
  try {
    const applyResponse = await axios.post(`${API_URL}/lockers-apply`, {
      store_id: '1',
      locker_id: '2', // This is occupied
      user_id: testUserId,
      reason: 'Testing occupied locker'
    });
    
    console.log('✅ Application submitted (test mode allows occupied lockers)');
  } catch (error) {
    console.log('❌ Failed:', error.response?.data?.message || error.message);
  }
}

// Run tests
testLockerApplication()
  .then(() => console.log('\nLocker application tests completed'))
  .catch(err => console.error('Test failed:', err));