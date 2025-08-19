const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

console.log('🔧 Debug server starting...');
console.log('Port:', port);
console.log('Environment:', process.env.NODE_ENV);
console.log('Platform:', process.platform);
console.log('Node version:', process.version);

app.get('/', (req, res) => {
  res.json({
    message: 'Debug server is working',
    timestamp: new Date().toISOString(),
    port: port,
    env: process.env.NODE_ENV,
    platform: process.platform,
    nodeVersion: process.version
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'DEBUG_OK' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`🔧 Debug server running on port ${port}`);
}).on('error', (err) => {
  console.error('Debug server error:', err);
  process.exit(1);
});