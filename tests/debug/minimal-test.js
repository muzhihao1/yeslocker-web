const express = require('express');
const app = express();
const port = process.env.PORT || 8080;

console.log('🧪 Minimal test server starting...');
console.log('Port:', port);

app.get('/', (req, res) => {
  res.send('Minimal test server is working!');
});

app.get('/test', (req, res) => {
  res.json({ 
    message: 'Railway connection test successful',
    timestamp: new Date().toISOString(),
    port: port
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`🧪 Minimal test server running on port ${port}`);
}).on('error', (err) => {
  console.error('❌ Test server error:', err);
  process.exit(1);
});