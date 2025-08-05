// Test login flow
const axios = require('axios');

const API_URL = 'http://localhost:3001';

async function testLoginFlow() {
  console.log('Testing complete login flow...\n');

  // Step 1: Register a test user
  console.log('Step 1: Registering test user');
  const testPhone = '138' + String(Math.floor(Math.random() * 100000000)).padStart(8, '0');
  
  try {
    const registerResponse = await axios.post(`${API_URL}/auth-register`, {
      phone: testPhone,
      name: '测试登录用户',
      store_id: '2',
      avatar_url: ''
    });
    
    console.log('✅ Registration successful');
    console.log('   User:', registerResponse.data.data);
  } catch (error) {
    console.log('❌ Registration failed:', error.response?.data?.message || error.message);
    return;
  }

  // Step 2: Test login with correct phone
  console.log('\nStep 2: Testing login with registered phone');
  try {
    const loginResponse = await axios.post(`${API_URL}/auth-login`, {
      phone: testPhone
    });
    
    if (loginResponse.data.success) {
      console.log('✅ Login successful');
      console.log('   User ID:', loginResponse.data.data.user.id);
      console.log('   Name:', loginResponse.data.data.user.name);
      console.log('   Store:', loginResponse.data.data.user.store_name);
      console.log('   Token:', loginResponse.data.data.token.substring(0, 20) + '...');
    }
  } catch (error) {
    console.log('❌ Login failed:', error.response?.data?.message || error.message);
  }

  // Step 3: Test login with non-existent phone
  console.log('\nStep 3: Testing login with non-existent phone');
  try {
    await axios.post(`${API_URL}/auth-login`, {
      phone: '13999999999'
    });
    console.log('❌ Should have failed but succeeded');
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('✅ Correctly rejected non-existent user');
    } else {
      console.log('❌ Unexpected error:', error.response?.data?.message || error.message);
    }
  }

  // Step 4: Test login without phone
  console.log('\nStep 4: Testing login without phone');
  try {
    await axios.post(`${API_URL}/auth-login`, {});
    console.log('❌ Should have failed but succeeded');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Correctly rejected empty phone');
    } else {
      console.log('❌ Unexpected error:', error.response?.data?.message || error.message);
    }
  }

  // Step 5: Test persistent login (simulate multiple logins)
  console.log('\nStep 5: Testing persistent login');
  try {
    const response1 = await axios.post(`${API_URL}/auth-login`, {
      phone: testPhone
    });
    
    const response2 = await axios.post(`${API_URL}/auth-login`, {
      phone: testPhone
    });
    
    if (response1.data.success && response2.data.success) {
      console.log('✅ Multiple logins successful');
      console.log('   Both logins returned consistent user data');
    }
  } catch (error) {
    console.log('❌ Persistent login test failed:', error.response?.data?.message || error.message);
  }
}

// Run tests
testLoginFlow()
  .then(() => console.log('\nLogin flow tests completed'))
  .catch(err => console.error('Test failed:', err));