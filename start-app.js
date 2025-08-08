const path = require('path');
const express = require('express');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

/**
 * uni-app H5 的默认输出通常在 dist/build/h5
 * 某些配置也可能直接是 dist/ 或 dist/h5/
 * 这里按优先级探测一个存在的目录
 */
const candidates = [
  'dist/build/h5',
  'dist/h5',
  'dist'
];
const root = candidates
  .map(p => path.resolve(__dirname, p))
  .find(p => fs.existsSync(p));

if (!root) {
  console.error('❌ Static directory not found');
  process.exit(1);
}

// Minimal static server
app.use(express.static(root, {
  maxAge: '1y',
  etag: true,
  index: 'index.html'
}));

// Health checks (minimal response)
app.get('/health', (req, res) => res.status(200).send('OK'));
app.get('/healthz', (req, res) => res.status(200).send('OK'));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(root, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ YesLocker H5 serving ${root} on :${PORT}`);
});