const axios = require('axios');

// Configuration
const BASE_URL = 'https://yeslocker-web-production-314a.up.railway.app';
const ADMIN_CREDENTIALS = {
  phone: '13800000002', // Manager admin from seed data
  password: 'admin123'  // Default development password
};

/**
 * Test JWT authentication flow for admin panel
 * This will help identify why 403 errors are occurring
 */
async function testJWTAuthentication() {
  console.log('🔍 Testing JWT Authentication Flow...\n');

  try {
    // Step 1: Test admin login to get JWT token
    console.log('1. Testing admin login...');
    const loginResponse = await axios.post(`${BASE_URL}/api/admin-login`, ADMIN_CREDENTIALS);
    
    if (loginResponse.data.success && loginResponse.data.data.token) {
      console.log('✅ Login successful!');
      console.log('   Admin Name:', loginResponse.data.data.admin.name);
      console.log('   Token exists:', !!loginResponse.data.data.token);
      console.log('   Token length:', loginResponse.data.data.token.length);
      console.log('   Token prefix:', loginResponse.data.data.token.substring(0, 20) + '...');
      
      const token = loginResponse.data.data.token;
      
      // Step 2: Test protected endpoint with JWT token
      console.log('\n2. Testing protected endpoint with JWT token...');
      
      try {
        const statsResponse = await axios.get(`${BASE_URL}/api/admin-statistics`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('✅ Protected endpoint access successful!');
        console.log('   Statistics data received:', !!statsResponse.data);
        
      } catch (protectedError) {
        console.log('❌ Protected endpoint failed:');
        console.log('   Status:', protectedError.response?.status);
        console.log('   Status Text:', protectedError.response?.statusText);
        console.log('   Error Data:', protectedError.response?.data);
        console.log('   Headers sent:', protectedError.config?.headers);
        
        // Additional debugging for 403 errors
        if (protectedError.response?.status === 403) {
          console.log('\n🔍 403 Debugging Information:');
          console.log('   Token being sent:', token.substring(0, 50) + '...');
          console.log('   Authorization header:', `Bearer ${token.substring(0, 20)}...`);
          
          // Test token structure
          try {
            const jwt = require('jsonwebtoken');
            const decoded = jwt.decode(token);
            console.log('   Token payload (decoded without verification):', decoded);
          } catch (decodeError) {
            console.log('   Token decode error:', decodeError.message);
          }
        }
      }
      
    } else {
      console.log('❌ Login failed - no token received');
      console.log('   Response:', loginResponse.data);
    }
    
  } catch (loginError) {
    console.log('❌ Login request failed:');
    console.log('   Status:', loginError.response?.status);
    console.log('   Status Text:', loginError.response?.statusText);
    console.log('   Error Data:', loginError.response?.data);
  }
  
  console.log('\n🏁 JWT Authentication Test Complete');
}

// Run the test
testJWTAuthentication().catch(console.error);