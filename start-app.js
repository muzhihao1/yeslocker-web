const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve static files from dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Handle SPA routes - send index.html for all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start server with error handling
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 YesLocker User App running at http://0.0.0.0:${port}`);
}).on('error', (err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});