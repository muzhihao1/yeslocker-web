/**
 * Utility script to clear admin tokens from localStorage
 * Run this script in the browser console if you're experiencing 403 errors
 */

function clearAdminTokens() {
  console.log('🧹 Clearing admin tokens from localStorage...');
  
  // Clear admin tokens
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_info');
  
  // Clear any cached API responses
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('admin_') || key.includes('api_cache'))) {
      keys.push(key);
    }
  }
  
  keys.forEach(key => localStorage.removeItem(key));
  
  console.log('✅ Admin tokens cleared');
  console.log('📍 Redirecting to login page...');
  
  // Redirect to login
  window.location.href = '/pages/login/index';
}

// Export for use in Node.js or browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { clearAdminTokens };
} else if (typeof window !== 'undefined') {
  window.clearAdminTokens = clearAdminTokens;
}

console.log('🔧 Admin token clearing utility loaded');
console.log('💡 Run clearAdminTokens() to clear tokens and redirect to login');