#!/usr/bin/env node

/**
 * Railway startup script for YesLocker
 * Ensures the Express server starts correctly with all necessary checks
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Starting YesLocker on Railway...');

// Check if server file exists
const serverPath = path.join(__dirname, 'server', 'index-railway.js');
if (!fs.existsSync(serverPath)) {
  console.error('❌ Server file not found:', serverPath);
  process.exit(1);
}

// Check if built frontend exists
const distPath = path.join(__dirname, 'dist');
const adminDistPath = path.join(__dirname, 'admin', 'dist');

console.log('📁 Checking build files...');
console.log('- Main dist exists:', fs.existsSync(distPath));
console.log('- Admin dist exists:', fs.existsSync(adminDistPath));

if (!fs.existsSync(distPath)) {
  console.error('❌ Main application build not found. Run: npm run build:client');
  process.exit(1);
}

// Set production environment
process.env.NODE_ENV = 'production';

console.log('✅ All checks passed. Starting server...');

// Start the actual server
require('./server/index-railway.js');