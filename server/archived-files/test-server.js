// Minimal test server for Railway debugging
const express = require('express');

const app = express();
const port = process.env.PORT || 3000;

console.log('🔍 Starting minimal test server...');
console.log('Port:', port);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('All env vars:', Object.keys(process.env).length);

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Minimal test server is running',
    timestamp: new Date().toISOString(),
    port: port,
    env: process.env.NODE_ENV
  });
});

app.get('/debug', (req, res) => {
  res.json({
    message: 'Debug endpoint',
    port: port,
    env: process.env.NODE_ENV,
    envVars: Object.keys(process.env).length
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Test server running on port ${port}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});