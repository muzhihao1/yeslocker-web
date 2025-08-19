/**
 * Server Entry Point - 服务器入口点
 * Main entry file for the YesLocker API server
 */

import { ModernServer } from './server.js';

// Create and start the server
async function startServer() {
  try {
    console.log('🎯 Starting YesLocker API Server...');
    console.log('📦 Loading modular architecture...');
    
    const server = new ModernServer();
    await server.start();
    
  } catch (error) {
    console.error('💥 Critical error starting server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();