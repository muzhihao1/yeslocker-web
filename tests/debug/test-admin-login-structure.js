const axios = require('axios');

// Configuration
const BASE_URL = 'https://yeslocker-web-production-314a.up.railway.app';
const ADMIN_CREDENTIALS = {
  phone: '13800000002', // Manager admin from seed data
  password: 'admin123'  // Default development password
};

/**
 * Test the exact structure of admin login response
 * This will help identify any mismatch in the frontend token handling
 */
async function testAdminLoginStructure() {
  console.log('🔍 Testing Admin Login Response Structure...\n');

  try {
    const response = await axios.post(`${BASE_URL}/api/admin-login`, ADMIN_CREDENTIALS);
    
    console.log('✅ Login Response Received');
    console.log('📋 Full Response Structure:');
    console.log(JSON.stringify(response.data, null, 2));
    
    console.log('\n🔍 Expected Frontend Access Patterns:');
    console.log('- response.success:', response.data.success);
    console.log('- response.data.token:', !!response.data.data?.token);
    console.log('- response.data.admin:', !!response.data.data?.admin);
    
    if (response.data.data?.token) {
      console.log('- Token length:', response.data.data.token.length);
      console.log('- Token type:', typeof response.data.data.token);
      console.log('- Token starts with:', response.data.data.token.substring(0, 10));
    }
    
    if (response.data.data?.admin) {
      console.log('- Admin info:', {
        id: response.data.data.admin.id,
        name: response.data.data.admin.name,
        role: response.data.data.admin.role,
        phone: response.data.data.admin.phone
      });
    }
    
  } catch (error) {
    console.log('❌ Login request failed:');
    console.log('   Status:', error.response?.status);
    console.log('   Error Data:', error.response?.data);
  }
  
  console.log('\n🏁 Admin Login Structure Test Complete');
}

// Run the test
testAdminLoginStructure().catch(console.error);