const axios = require('axios');

// Configuration
const BASE_URL = 'https://yeslocker-web-production-314a.up.railway.app';
const ADMIN_CREDENTIALS = {
  phone: '13800000002',
  password: 'admin123'
};

/**
 * Test database structure to identify column issues
 */
async function testDatabaseStructure() {
  console.log('🔍 Testing Database Structure...\n');

  try {
    // Step 1: Login to get token
    console.log('1. Admin Login...');
    const loginResponse = await axios.post(`${BASE_URL}/api/admin-login`, ADMIN_CREDENTIALS);
    
    if (!loginResponse.data.success) {
      throw new Error('Login failed');
    }
    
    const token = loginResponse.data.data.token;
    console.log('✅ Login successful');

    // Step 2: Test database structure endpoint
    console.log('\n2. Testing database structure...');
    
    try {
      const dbTestResponse = await axios.get(`${BASE_URL}/api/db-test`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Database test endpoint worked');
      console.log('📊 Database Info:');
      console.log('   Tables existing:', dbTestResponse.data.tables.existing);
      console.log('   Tables missing:', dbTestResponse.data.tables.missing);
      console.log('   Table counts:', dbTestResponse.data.tables.counts);
      
    } catch (dbTestError) {
      console.log('❌ Database test failed:', dbTestError.response?.data?.message);
    }

    // Step 3: Check applications table structure specifically
    console.log('\n3. Checking applications table structure...');
    
    // Create a direct SQL test to check applications table columns
    const sqlTestQueries = [
      // Test basic applications table
      "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'applications' ORDER BY ordinal_position",
      
      // Test a simple SELECT from applications
      "SELECT COUNT(*) FROM applications",
      
      // Test the specific fields used in the query
      "SELECT a.id, a.status FROM applications a LIMIT 1",
      
      // Test if rejection_reason field exists
      "SELECT a.id, a.status, CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'applications' AND column_name = 'rejection_reason') THEN a.rejection_reason ELSE NULL END as remark FROM applications a LIMIT 1"
    ];

    for (let i = 0; i < sqlTestQueries.length; i++) {
      const query = sqlTestQueries[i];
      console.log(`\n   Query ${i + 1}: Testing applications table access...`);
      
      try {
        // We'll try to execute a custom endpoint to test SQL queries
        const testResponse = await axios.post(`${BASE_URL}/api/test-sql`, {
          query: query
        }, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`   ✅ Query ${i + 1} Success:`, testResponse.data);
        
      } catch (sqlError) {
        console.log(`   ❌ Query ${i + 1} Failed:`, sqlError.response?.status, sqlError.response?.data?.message);
      }
    }

    // Step 4: Test the actual admin-approval query components
    console.log('\n4. Testing admin-approval query components...');
    
    // Let's manually construct and test the exact query that's failing
    console.log('   Testing the exact SQL from admin-approval endpoint...');
    
    const exactQuery = `
      SELECT 
        a.id, a.status, a.rejection_reason as remark, a.created_at,
        u.id as user_id, u.name as user_name, u.phone as user_phone, u.avatar_url,
        s.id as store_id, s.name as store_name,
        l.id as locker_id, l.number as locker_number
      FROM applications a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN stores s ON a.store_id = s.id
      LEFT JOIN lockers l ON a.locker_id = l.id
      WHERE 1=1
      ORDER BY a.created_at DESC
      LIMIT 20 OFFSET 0
    `;
    
    try {
      const exactQueryResponse = await axios.post(`${BASE_URL}/api/test-sql`, {
        query: exactQuery
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('   ✅ Exact query SUCCESS:', exactQueryResponse.data);
      
    } catch (exactQueryError) {
      console.log('   ❌ Exact query FAILED:', exactQueryError.response?.data);
      
      // Let's try without the problematic field
      console.log('   🔧 Testing without rejection_reason field...');
      
      const simpleQuery = `
        SELECT 
          a.id, a.status, a.created_at,
          u.id as user_id, u.name as user_name, u.phone as user_phone,
          s.id as store_id, s.name as store_name
        FROM applications a
        LEFT JOIN users u ON a.user_id = u.id
        LEFT JOIN stores s ON a.store_id = s.id
        WHERE 1=1
        ORDER BY a.created_at DESC
        LIMIT 5
      `;
      
      try {
        const simpleQueryResponse = await axios.post(`${BASE_URL}/api/test-sql`, {
          query: simpleQuery
        }, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('   ✅ Simple query SUCCESS:', simpleQueryResponse.data);
        
      } catch (simpleQueryError) {
        console.log('   ❌ Simple query FAILED:', simpleQueryError.response?.data);
      }
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    if (error.response) {
      console.log('   Response data:', error.response.data);
    }
  }
  
  console.log('\n🏁 Database Structure Test Complete');
}

// Run the test
testDatabaseStructure().catch(console.error);