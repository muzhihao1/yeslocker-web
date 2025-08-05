// Test registration functionality
const axios = require('axios');

const API_URL = 'http://localhost:3001';

async function testRegistration() {
  console.log('Testing user registration...\n');

  // Test case 1: Missing required fields
  console.log('Test 1: Missing required fields');
  try {
    const response = await axios.post(`${API_URL}/auth-register`, {
      phone: '13800138000'
      // Missing name and store_id
    });
    console.log('❌ Should have failed but succeeded');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Correctly rejected: ' + error.response.data.message);
    } else {
      console.log('❌ Unexpected error:', error.message);
    }
  }

  // Test case 2: Invalid phone number
  console.log('\nTest 2: Invalid phone number');
  try {
    const response = await axios.post(`${API_URL}/auth-register`, {
      phone: '12345',
      name: '测试用户',
      store_id: '1'
    });
    console.log('❌ Should have failed but succeeded');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Correctly rejected: ' + error.response.data.message);
    } else {
      console.log('❌ Unexpected error:', error.message);
    }
  }

  // Test case 3: Valid registration
  console.log('\nTest 3: Valid registration');
  try {
    const testPhone = '138' + String(Math.floor(Math.random() * 100000000)).padStart(8, '0');
    const response = await axios.post(`${API_URL}/auth-register`, {
      phone: testPhone,
      name: '张三',
      avatar_url: 'https://example.com/avatar.jpg',
      store_id: '1'
    });
    
    if (response.data.success) {
      console.log('✅ Registration successful');
      console.log('   User ID:', response.data.data.user_id);
      console.log('   Phone:', response.data.data.phone);
      console.log('   Name:', response.data.data.name);
      console.log('   Store:', response.data.data.store);
    } else {
      console.log('❌ Registration failed:', response.data);
    }
  } catch (error) {
    console.log('❌ Error:', error.response?.data?.message || error.message);
  }

  // Test case 4: Duplicate phone number (if using real DB)
  console.log('\nTest 4: Duplicate phone number');
  try {
    const response = await axios.post(`${API_URL}/auth-register`, {
      phone: '13800138001', // Try a fixed number
      name: '李四',
      store_id: '1'
    });
    
    // Try to register again with same phone
    const response2 = await axios.post(`${API_URL}/auth-register`, {
      phone: '13800138001',
      name: '王五',
      store_id: '2'
    });
    
    console.log('❌ Should have failed on duplicate but succeeded');
  } catch (error) {
    if (error.response?.status === 409) {
      console.log('✅ Correctly rejected duplicate: ' + error.response.data.message);
    } else {
      console.log('⚠️  Error (expected if DB not connected):', error.response?.data?.message || error.message);
    }
  }
}

// Run tests
testRegistration()
  .then(() => console.log('\nRegistration tests completed'))
  .catch(err => console.error('Test failed:', err));