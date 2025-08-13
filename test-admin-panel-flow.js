const axios = require('axios');

// Configuration
const BASE_URL = 'https://yeslocker-web-production-314a.up.railway.app';
const ADMIN_CREDENTIALS = {
  phone: '13800000002', // Manager admin from seed data
  password: 'admin123'  // Default development password
};

/**
 * Test the complete admin panel authentication flow
 * This simulates exactly what the admin panel does
 */
async function testCompleteAdminFlow() {
  console.log('🔍 Testing Complete Admin Panel Flow...\n');

  try {
    // Step 1: Admin Login (exact same call as admin panel)
    console.log('1. Admin Login...');
    const loginResponse = await axios.post(`${BASE_URL}/api/admin-login`, ADMIN_CREDENTIALS);
    
    if (!loginResponse.data.success) {
      throw new Error('Login failed: ' + JSON.stringify(loginResponse.data));
    }
    
    console.log('✅ Login successful');
    
    // Step 2: Extract and simulate localStorage storage (exactly as admin store does)
    const token = loginResponse.data.data.token;
    const adminInfo = {
      id: loginResponse.data.data.admin.id,
      phone: loginResponse.data.data.admin.phone,
      name: loginResponse.data.data.admin.name,
      role: loginResponse.data.data.admin.role,
      store: loginResponse.data.data.admin.store_id ? {
        id: loginResponse.data.data.admin.store_id,
        name: loginResponse.data.data.admin.store_name || '',
        address: '' 
      } : undefined
    };
    
    console.log('📱 Token and admin info stored (simulated localStorage)');
    console.log('   Token exists:', !!token);
    console.log('   Admin info:', adminInfo);
    
    // Step 3: Create axios client with same configuration as admin panel
    console.log('\n3. Testing API calls with stored token...');
    
    const apiClient = axios.create({
      baseURL: `${BASE_URL}/api`,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    // Step 4: Test the failing endpoints
    const endpoints = [
      { name: 'Admin Statistics', url: '/admin-statistics' },
      { name: 'Stores and Lockers', url: '/stores-lockers' }
    ];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`   Testing ${endpoint.name}...`);
        
        const response = await apiClient.get(endpoint.url);
        console.log(`   ✅ ${endpoint.name} - Success`);
        console.log(`      Response type:`, typeof response.data);
        console.log(`      Has data:`, !!response.data);
        
      } catch (error) {
        console.log(`   ❌ ${endpoint.name} - Failed`);
        console.log(`      Status:`, error.response?.status);
        console.log(`      Status Text:`, error.response?.statusText);
        console.log(`      Error Message:`, error.response?.data?.message);
        console.log(`      Auth Header Sent:`, error.config?.headers?.Authorization?.substring(0, 20) + '...');
        
        // If 403, analyze the token
        if (error.response?.status === 403) {
          console.log(`      Token analysis:`);
          console.log(`        Token length:`, token.length);
          console.log(`        Token starts:`, token.substring(0, 20));
          console.log(`        Token format:`, token.startsWith('eyJ') ? 'Valid JWT format' : 'Invalid format');
          
          // Check token expiry
          try {
            const jwt = require('jsonwebtoken');
            const decoded = jwt.decode(token);
            const now = Math.floor(Date.now() / 1000);
            console.log(`        Token exp:`, decoded.exp);
            console.log(`        Current time:`, now);
            console.log(`        Token expired:`, decoded.exp < now);
            console.log(`        Time until expiry:`, Math.floor((decoded.exp - now) / 60), 'minutes');
          } catch (decodeError) {
            console.log(`        Token decode error:`, decodeError.message);
          }
        }
      }
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    if (error.response) {
      console.log('   Response status:', error.response.status);
      console.log('   Response data:', error.response.data);
    }
  }
  
  console.log('\n🏁 Complete Admin Panel Flow Test Complete');
}

// Run the test
testCompleteAdminFlow().catch(console.error);