const path = require('path');
const express = require('express');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3002;

const candidates = [
  'dist/build/h5',
  'dist/h5', 
  'dist'
];

const root = candidates
  .map(p => path.resolve(__dirname, p))
  .find(p => fs.existsSync(p));

if (!root) {
  console.error('❌ Admin static directory not found');
  process.exit(1);
}

// Add request logging to diagnose issues
app.use((req, res, next) => {
  console.log(`📥 ${new Date().toISOString()} ${req.method} ${req.url} from ${req.ip}`);
  next();
});

app.use(express.static(root, {
  maxAge: '1y',
  etag: true,
  index: 'index.html'
}));

app.get('/health', (req, res) => res.status(200).send('OK'));
app.get('/healthz', (req, res) => res.status(200).send('OK'));

// SPA routing - serve index.html for all non-static requests
app.get('*', (req, res) => {
  res.sendFile(path.join(root, 'index.html'));
});

app.listen(PORT, '0.0.0.0', (err) => {
  if (err) {
    console.error(`❌ Failed to bind to port ${PORT}:`, err);
    process.exit(1);
  }
  console.log(`✅ YesLocker Admin serving ${root} on :${PORT}`);
  console.log(`🌐 Server listening on http://0.0.0.0:${PORT}`);
  console.log(`🔗 Health check: http://0.0.0.0:${PORT}/health`);
});