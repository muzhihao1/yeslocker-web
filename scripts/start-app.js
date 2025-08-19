const express = require('express');
const path = require('path');
const history = require('connect-history-api-fallback');

const app = express();
// ⚠ 根据实际输出目录；uni-app H5 确认为 dist/build/h5
const root = path.join(__dirname, 'dist', 'build', 'h5');

// Health check endpoint (before history middleware)
app.get('/_health', (_, res) => res.status(200).send('OK'));

// History API fallback for SPA routing
app.use(history());

// Static file serving
app.use(express.static(root));

const port = process.env.PORT || 3000; // Railway 会注入 PORT
app.listen(port, () => {
  console.log('[server] listening on', port);
  console.log('[server] static root =', root);
});