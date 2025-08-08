const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// Startup validation - check if build files exist
const distPath = path.join(__dirname, 'dist');
const indexPath = path.join(distPath, 'index.html');

console.log('🔍 Validating build files...');
console.log('Dist directory path:', distPath);
console.log('Index file path:', indexPath);

if (!fs.existsSync(distPath)) {
  console.error('❌ ERROR: dist directory not found. Build may have failed.');
  console.error('Expected path:', distPath);
  process.exit(1);
}

if (!fs.existsSync(indexPath)) {
  console.error('❌ ERROR: index.html not found in dist directory. Build incomplete.');
  console.error('Expected path:', indexPath);
  process.exit(1);
}

console.log('✅ Build files validation passed');

// Health check endpoint for Railway
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    distExists: fs.existsSync(distPath),
    indexExists: fs.existsSync(indexPath)
  });
});

// Railway health check endpoint
app.get('/healthz', (req, res) => {
  res.status(200).send('OK');
});

// Simple ping endpoint for health monitoring
app.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

// Serve static files from dist directory
app.use(express.static(distPath));

// Handle SPA routes - send index.html for all routes
app.get('*', (req, res) => {
  res.sendFile(indexPath);
});

// Start server with error handling
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 YesLocker User App running at http://0.0.0.0:${port}`);
  console.log('📁 Serving files from:', distPath);
  console.log('🌍 Environment:', process.env.NODE_ENV || 'development');
  console.log('🔧 Railway deployment with full build pipeline - v2');
}).on('error', (err) => {
  console.error('❌ Failed to start server:', err);
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use`);
  }
  process.exit(1);
});